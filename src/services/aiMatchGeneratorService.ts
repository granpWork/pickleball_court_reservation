import { doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import type {
  GoogleAiIntegrationSettings,
  OpenPlayMatch,
  OpenPlayMatchRosterItem,
} from '../components/admin/adminTypes';
import {
  generateSmartDuprMatches,
  generateUniquePartnerMatches,
  getPlayerEffectiveRating,
  isPlayerNR,
  mapRosterToMatchPlayer,
} from '../utils/matchGeneratorUtils';

export type AiGameplayAlgorithm =
  | 'unique_partner'
  | 'winners_stay'
  | 'paddle_stacking'
  | 'random_rotational';

export interface AiMatchGenerationParams {
  eventId: string;
  companyId?: string;
  rosterPool: OpenPlayMatchRosterItem[];
  assignedCourts: string[];
  totalRounds: number;
  startingRound: number;
  targetPoints: number;
  gameType: 'doubles' | 'singles';
  algorithm: AiGameplayAlgorithm;
  isSmartMatch: boolean;
  allowOverflowMatch?: boolean;
  existingMatches: OpenPlayMatch[];
  aiDirectorNotes?: string;
}

export interface AiMatchGenerationResponse {
  matches: OpenPlayMatch[];
  aiSummary: string;
  usedFallback: boolean;
  modelUsed: string;
}

interface GeminiGeneratedMatchItem {
  courtName?: string;
  teamRedIds: string[];
  teamBlueIds: string[];
  matchNote?: string;
}

interface GeminiGeneratedRoundItem {
  roundNumber: number;
  matches: GeminiGeneratedMatchItem[];
}

interface GeminiSchedulePayload {
  summary?: string;
  rounds: GeminiGeneratedRoundItem[];
}

/**
 * Synchronously reads cached Google AI configuration from localStorage.
 */
export function getCachedVenueGoogleAiConfig(
  companyId?: string
): GoogleAiIntegrationSettings | null {
  try {
    const effId = companyId && companyId.trim() ? companyId.trim() : 'default';
    const scopedKey =
      effId !== 'default'
        ? `picklepoint_google_ai_config_${effId}`
        : 'picklepoint_google_ai_config';
    const raw =
      localStorage.getItem(scopedKey) ||
      localStorage.getItem('picklepoint_google_ai_config');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GoogleAiIntegrationSettings>;
    return {
      enabled: parsed.enabled !== undefined ? parsed.enabled : true,
      apiKey: (parsed.apiKey || '').trim(),
      defaultModel: parsed.defaultModel || 'gemini-2.0-flash',
      status: parsed.status || (parsed.apiKey ? 'connected' : 'unconfigured'),
      companyId: parsed.companyId,
      lastTestedAt: parsed.lastTestedAt,
      updatedAt: parsed.updatedAt,
      updatedByEmail: parsed.updatedByEmail,
    };
  } catch {
    return null;
  }
}

/**
 * Loads the venue's Google AI Studio configuration from Firestore (with localStorage fallback & sync).
 */
export async function loadVenueGoogleAiConfig(
  companyId?: string
): Promise<GoogleAiIntegrationSettings | null> {
  const effId = companyId && companyId.trim() ? companyId.trim() : 'default';
  const firestoreDocId =
    effId !== 'default' ? `google_ai_${effId}` : 'google_ai';
  const localStorageKey =
    effId !== 'default'
      ? `picklepoint_google_ai_config_${effId}`
      : 'picklepoint_google_ai_config';

  try {
    if (isFirebaseConfigured && db) {
      let docSnap = await getDoc(doc(db, 'settings', firestoreDocId));
      if (!docSnap.exists() && firestoreDocId !== 'google_ai') {
        docSnap = await getDoc(doc(db, 'settings', 'google_ai'));
      }
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<GoogleAiIntegrationSettings>;
        const config: GoogleAiIntegrationSettings = {
          enabled: data.enabled !== undefined ? data.enabled : true,
          apiKey: (data.apiKey || '').trim(),
          defaultModel: data.defaultModel || 'gemini-2.0-flash',
          status: data.status || (data.apiKey ? 'connected' : 'unconfigured'),
          companyId: data.companyId || effId,
          lastTestedAt: data.lastTestedAt,
          updatedAt: data.updatedAt,
          updatedByEmail: data.updatedByEmail,
        };
        try {
          localStorage.setItem(localStorageKey, JSON.stringify(config));
          localStorage.setItem(
            'picklepoint_google_ai_config',
            JSON.stringify(config)
          );
        } catch {
          // Ignore storage quota errors
        }
        return config;
      }
    }
  } catch (err: unknown) {
    console.warn('Firestore AI config lookup fell back to local cache:', err);
  }

  return getCachedVenueGoogleAiConfig(companyId);
}

/**
 * Executes local fallback match generation if Gemini API is unavailable or returns invalid data.
 */
function runLocalFallbackGenerator(
  params: AiMatchGenerationParams,
  fallbackReason: string
): AiMatchGenerationResponse {
  const {
    eventId,
    rosterPool,
    assignedCourts,
    totalRounds,
    startingRound,
    targetPoints,
    gameType,
    isSmartMatch,
    allowOverflowMatch,
    existingMatches,
  } = params;

  const result = isSmartMatch
    ? generateSmartDuprMatches({
        eventId,
        rosterPool,
        assignedCourts,
        totalRounds,
        targetPoints,
        gameType,
        existingMatches,
        startingRound,
        allowOverflowMatch,
      })
    : generateUniquePartnerMatches({
        eventId,
        rosterPool,
        assignedCourts,
        totalRounds,
        targetPoints,
        gameType,
        existingMatches,
        startingRound,
        isSmartMatch,
        allowOverflowMatch,
      });

  return {
    matches: result.matches,
    aiSummary: fallbackReason,
    usedFallback: true,
    modelUsed: 'local_smart_engine',
  };
}

/**
 * Generates Open Play Match Matrix rounds using Google Gemini AI, analyzing:
 * 1. Previous Match History (winners, losers, scores, partners, opponents, sit-outs)
 * 2. Player DUPR Ratings & NR anchor rules
 * 3. Selected Gameplay Type (Unique Partner, Winners Stay/Split Ladder, Paddle Stacking, Random Social)
 * 4. Optional AI Director Notes
 */
export async function generateMatchesWithGeminiAi(
  params: AiMatchGenerationParams
): Promise<AiMatchGenerationResponse> {
  const {
    eventId,
    companyId,
    rosterPool,
    assignedCourts,
    totalRounds,
    startingRound,
    targetPoints,
    gameType,
    algorithm,
    isSmartMatch,
    allowOverflowMatch = false,
    existingMatches,
    aiDirectorNotes,
  } = params;

  const activePlayers = rosterPool.filter((p) => p.status === 'active');
  const playersPerMatch = gameType === 'doubles' ? 4 : 2;
  const playersPerTeam = gameType === 'doubles' ? 2 : 1;

  if (activePlayers.length < playersPerMatch) {
    return {
      matches: [],
      aiSummary: `Need at least ${playersPerMatch} active players to generate ${gameType} matches.`,
      usedFallback: false,
      modelUsed: 'none',
    };
  }

  // Load venue AI configuration
  const aiConfig = await loadVenueGoogleAiConfig(companyId);
  if (!aiConfig || !aiConfig.enabled || !aiConfig.apiKey.trim()) {
    return runLocalFallbackGenerator(
      params,
      'AI Integration is not configured or disabled; used Smart System Generator.'
    );
  }

  const apiKey = aiConfig.apiKey.trim();
  const modelName = aiConfig.defaultModel || 'gemini-2.0-flash';
  const courtsToUse =
    assignedCourts.length > 0 ? assignedCourts : ['Court 1'];
  const gamesPerRound = allowOverflowMatch
    ? Math.max(1, Math.ceil(activePlayers.length / playersPerMatch))
    : Math.max(1, Math.floor(activePlayers.length / playersPerMatch));

  // Analyze historical stats from existingMatches (rounds prior to startingRound)
  const priorMatches = existingMatches.filter((m) => m.round < startingRound);
  const lastRoundNum =
    priorMatches.length > 0
      ? Math.max(...priorMatches.map((m) => m.round))
      : 0;
  const lastRoundMatches = priorMatches.filter((m) => m.round === lastRoundNum);

  const playedInLastRoundIds = new Set<string>();
  for (const m of lastRoundMatches) {
    for (const p of m.teamRed.players) playedInLastRoundIds.add(p.id);
    for (const p of m.teamBlue.players) playedInLastRoundIds.add(p.id);
  }

  // Build per-player historical profile
  const allNR = activePlayers.every(isPlayerNR);
  const playerMap = new Map<string, OpenPlayMatchRosterItem>();
  for (const p of activePlayers) {
    playerMap.set(p.id, p);
  }

  const playerProfiles = activePlayers.map((p) => {
    let gamesPlayed = 0;
    let wins = 0;
    let losses = 0;
    let pointDiff = 0;
    let lastRoundOutcome: 'won' | 'lost' | 'tied' | 'played_unfinished' | 'sat_out' | 'none' =
      lastRoundNum > 0 ? 'sat_out' : 'none';
    const pastPartnerNames: string[] = [];
    const pastOpponentNames: string[] = [];

    for (const m of priorMatches) {
      const inRed = m.teamRed.players.some((rp) => rp.id === p.id);
      const inBlue = m.teamBlue.players.some((bp) => bp.id === p.id);
      if (!inRed && !inBlue) continue;

      gamesPlayed++;
      const myTeam = inRed ? m.teamRed : m.teamBlue;
      const oppTeam = inRed ? m.teamBlue : m.teamRed;

      for (const teammate of myTeam.players) {
        if (teammate.id !== p.id) {
          pastPartnerNames.push(`${teammate.name} (R${m.round})`);
        }
      }
      for (const opp of oppTeam.players) {
        pastOpponentNames.push(`${opp.name} (R${m.round})`);
      }

      if (m.status === 'completed' || m.teamRed.score > 0 || m.teamBlue.score > 0) {
        const diff = myTeam.score - oppTeam.score;
        pointDiff += diff;
        const won =
          (inRed && m.winner === 'red') ||
          (inBlue && m.winner === 'blue') ||
          diff > 0;
        const lost =
          (inRed && m.winner === 'blue') ||
          (inBlue && m.winner === 'red') ||
          diff < 0;
        if (won) wins++;
        else if (lost) losses++;

        if (m.round === lastRoundNum) {
          lastRoundOutcome = won ? 'won' : lost ? 'lost' : 'tied';
        }
      } else if (m.round === lastRoundNum) {
        lastRoundOutcome = 'played_unfinished';
      }
    }

    const isNR = isPlayerNR(p);
    const effRating = Number(getPlayerEffectiveRating(p, allNR).toFixed(2));
    const satOutLastRound =
      lastRoundNum > 0 && !playedInLastRoundIds.has(p.id);

    return {
      id: p.id,
      name: p.name,
      duprRating: isNR ? 'NR (Unrated - Anchor at ~3.00)' : effRating,
      numericRating: effRating,
      skillLevel: p.skillLevel || 'Open',
      gamesPlayed,
      record: `${wins}W-${losses}L`,
      pointDiff,
      satOutPreviousRound: satOutLastRound,
      lastRoundOutcome,
      pastPartners: pastPartnerNames,
      pastOpponents: pastOpponentNames,
    };
  });

  // Summarize previous matches for Gemini context
  const previousMatchesContext = priorMatches.slice(-24).map((m) => ({
    round: m.round,
    court: m.courtName,
    status: m.status,
    teamRed: {
      players: m.teamRed.players.map((p) => ({ id: p.id, name: p.name, dupr: p.duprRating || 'NR' })),
      score: m.teamRed.score,
    },
    teamBlue: {
      players: m.teamBlue.players.map((p) => ({ id: p.id, name: p.name, dupr: p.duprRating || 'NR' })),
      score: m.teamBlue.score,
    },
    winner:
      m.winner ||
      (m.teamRed.score > m.teamBlue.score
        ? 'red'
        : m.teamBlue.score > m.teamRed.score
        ? 'blue'
        : 'unfinished'),
  }));

  // Gameplay-specific instructions
  const gameplayInstructions: Record<AiGameplayAlgorithm, string> = {
    unique_partner:
      'UNIQUE PARTNER ROUND ROBIN: Every player must pair with a NEW partner they have NOT partnered with in previous rounds (check pastPartners). Avoid repeating identical 4-player groups.',
    winners_stay:
      'WINNERS STAY / SPLIT LADDER (KING OF THE COURT): Look closely at the previous round results (lastRoundOutcome & scores). Group players who WON in the previous round onto top courts (Court 1, etc.) and SPLIT their previous partnership so winners play against each other with a new partner. Group players who LOST or SAT OUT onto the remaining courts.',
    paddle_stacking:
      'PADDLE STACKING / CONTINUOUS RACK QUEUE: Rotate players fairly so everyone gets equal games played, prioritizing players who sat out last round, and split each court 1&4 vs 2&3 by skill/DUPR.',
    random_rotational:
      'SOCIAL ROTATIONAL MIX: Create fun, varied matchups mixing different players across rounds while avoiding back-to-back repeat partnerships.',
  };

  const duprInstructions = isSmartMatch
    ? 'STRICT DUPR SMART MATCH PARITY ACTIVE: Group players of similar DUPR tiers onto courts and pair #1 + #4 (Team Red) vs #2 + #3 (Team Blue) so the two teams have nearly identical average DUPR ratings (target team average delta < 0.15). Pair NR (unrated) players with steady rated anchors.'
    : 'STANDARD BALANCED PAIRING: Keep teams reasonably balanced while prioritizing the selected gameplay rotation.';

  const overflowInstructions = allowOverflowMatch
    ? `OVERFLOW MATCH ENABLED: Schedule exactly ${gamesPerRound} games per round so EVERY active player plays in every round. If the player count (${activePlayers.length}) is not divisible by ${playersPerMatch}, fill the remaining spot(s) in the last game of the round with players who have the lowest gamesPlayed or closest DUPR rating.`
    : `SIT-OUT & PRIORITY NEXT ROUND: Schedule ${gamesPerRound} games per round (${gamesPerRound * playersPerMatch} player slots). Any player with satOutPreviousRound === true MUST be scheduled to play in Round ${startingRound} (0 back-to-back sit-outs). Equalize total gamesPlayed across all players.`;

  const roundNumbersToGenerate = Array.from(
    { length: totalRounds },
    (_, idx) => startingRound + idx
  );

  const systemPrompt = `You are the official PicklePoint AI Matchmaking Director powered by Google Gemini.
Your task is to generate ${totalRounds} round(s) of ${gameType.toUpperCase()} pickleball matches (Rounds: ${roundNumbersToGenerate.join(', ')}) for an Open Play session.

### 1. CORE RULES & CONSTRAINTS
- Game Type: ${gameType.toUpperCase()} (${playersPerTeam} player(s) on Team Red vs ${playersPerTeam} player(s) on Team Blue = ${playersPerMatch} players per match).
- Available Courts: ${JSON.stringify(courtsToUse)} (assign courts in order for each game in a round).
- Games Per Round: Exactly ${gamesPerRound} match(es) per round.
- ${overflowInstructions}
- In a single round, a player CANNOT appear in two different matches (unless Overflow Match is enabled and a filler player is needed for the final match).
- Use ONLY the exact player "id" strings provided in the Active Roster Pool below.

### 2. GAMEPLAY TYPE (${algorithm.toUpperCase()})
- ${gameplayInstructions[algorithm]}

### 3. DUPR RATING & PARITY RULES
- ${duprInstructions}

${
  aiDirectorNotes && aiDirectorNotes.trim()
    ? `### 4. SPECIAL ADMIN / DIRECTOR NOTES (HIGH PRIORITY)\n- "${aiDirectorNotes.trim()}"\n`
    : ''
}
### ACTIVE ROSTER POOL (${playerProfiles.length} Players)
${JSON.stringify(playerProfiles, null, 2)}

### PREVIOUS MATCHES HISTORY (${previousMatchesContext.length} Prior Games)
${JSON.stringify(previousMatchesContext, null, 2)}

### REQUIRED JSON RESPONSE FORMAT
Respond ONLY with valid JSON matching this structure:
{
  "summary": "Brief 1-sentence explanation of how you paired players based on previous match results, DUPR ratings, and gameplay rules.",
  "rounds": [
    {
      "roundNumber": ${startingRound},
      "matches": [
        {
          "courtName": "${courtsToUse[0]}",
          "teamRedIds": ["player_id_1"${gameType === 'doubles' ? ', "player_id_2"' : ''}],
          "teamBlueIds": ["player_id_3"${gameType === 'doubles' ? ', "player_id_4"' : ''}],
          "matchNote": "Optional short note e.g. Winners Court / DUPR 3.55 vs 3.52"
        }
      ]
    }
  ]
}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 22000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        modelName
      )}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: systemPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.35,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errText = `HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson?.error?.message) errText = errJson.error.message;
      } catch {
        // Ignore parse error
      }
      throw new Error(errText);
    }

    const data = await response.json();
    const rawText: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!rawText) {
      throw new Error('Empty response from Gemini model.');
    }

    // Strip markdown code fences if present
    const cleanedJson = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleanedJson) as GeminiSchedulePayload;
    if (!parsed || !Array.isArray(parsed.rounds) || parsed.rounds.length === 0) {
      throw new Error('Gemini response did not contain valid rounds array.');
    }

    const nowIso = new Date().toISOString();
    const generatedMatches: OpenPlayMatch[] = [];

    for (let rIdx = 0; rIdx < totalRounds; rIdx++) {
      const targetRoundNum = startingRound + rIdx;
      const aiRound =
        parsed.rounds.find((r) => r.roundNumber === targetRoundNum) ||
        parsed.rounds[rIdx];

      if (!aiRound || !Array.isArray(aiRound.matches)) continue;

      const usedInRound = new Set<string>();
      let matchIdxInRound = 0;

      for (const mItem of aiRound.matches) {
        const redIds = Array.isArray(mItem.teamRedIds)
          ? mItem.teamRedIds.filter((id) => playerMap.has(id))
          : [];
        const blueIds = Array.isArray(mItem.teamBlueIds)
          ? mItem.teamBlueIds.filter((id) => playerMap.has(id))
          : [];

        if (redIds.length !== playersPerTeam || blueIds.length !== playersPerTeam) {
          continue;
        }

        const combinedIds = [...redIds, ...blueIds];
        // Ensure all 4 players in the same match are distinct
        if (new Set(combinedIds).size !== playersPerMatch) {
          continue;
        }

        // Prevent duplicate player in the same round unless it's an overflow match
        const hasOverlap = combinedIds.some((id) => usedInRound.has(id));
        if (hasOverlap && !allowOverflowMatch) {
          continue;
        }

        for (const id of combinedIds) {
          usedInRound.add(id);
        }

        const assignedCourt =
          mItem.courtName && courtsToUse.includes(mItem.courtName)
            ? mItem.courtName
            : courtsToUse[matchIdxInRound % courtsToUse.length];

        const redPlayers = redIds.map((id) =>
          mapRosterToMatchPlayer(playerMap.get(id)!)
        );
        const bluePlayers = blueIds.map((id) =>
          mapRosterToMatchPlayer(playerMap.get(id)!)
        );

        generatedMatches.push({
          id: `match_ai_${Date.now()}_r${targetRoundNum}_m${matchIdxInRound + 1}_${Math.random()
            .toString(36)
            .substring(2, 6)}`,
          eventId,
          round: targetRoundNum,
          matchName: `Game ${matchIdxInRound + 1}`,
          courtName: assignedCourt,
          gameType,
          targetPoints,
          status: 'scheduled',
          teamRed: {
            players: redPlayers,
            score: 0,
          },
          teamBlue: {
            players: bluePlayers,
            score: 0,
          },
          createdAt: nowIso,
          updatedAt: nowIso,
        });

        matchIdxInRound++;
      }

      // If AI left enough unused active players in this round to form another full match, fill them automatically
      const unusedPlayers = activePlayers.filter((p) => !usedInRound.has(p.id));
      if (unusedPlayers.length >= playersPerMatch && matchIdxInRound < gamesPerRound) {
        const extraResult = isSmartMatch
          ? generateSmartDuprMatches({
              eventId,
              rosterPool: unusedPlayers,
              assignedCourts: courtsToUse.slice(matchIdxInRound).length > 0
                ? courtsToUse.slice(matchIdxInRound)
                : courtsToUse,
              totalRounds: 1,
              targetPoints,
              gameType,
              existingMatches: [...priorMatches, ...generatedMatches],
              startingRound: targetRoundNum,
              allowOverflowMatch: false,
            })
          : generateUniquePartnerMatches({
              eventId,
              rosterPool: unusedPlayers,
              assignedCourts: courtsToUse.slice(matchIdxInRound).length > 0
                ? courtsToUse.slice(matchIdxInRound)
                : courtsToUse,
              totalRounds: 1,
              targetPoints,
              gameType,
              existingMatches: [...priorMatches, ...generatedMatches],
              startingRound: targetRoundNum,
              isSmartMatch,
              allowOverflowMatch: false,
            });

        for (const extraMatch of extraResult.matches) {
          generatedMatches.push({
            ...extraMatch,
            matchName: `Game ${matchIdxInRound + 1}`,
            courtName: courtsToUse[matchIdxInRound % courtsToUse.length],
          });
          matchIdxInRound++;
        }
      }
    }

    if (generatedMatches.length === 0) {
      throw new Error('No valid matches could be constructed from AI response.');
    }

    return {
      matches: generatedMatches,
      aiSummary:
        parsed.summary ||
        `Gemini AI (${modelName}) generated ${generatedMatches.length} game(s) based on previous match history, DUPR ratings, and ${algorithm.replace('_', ' ')} rules.`,
      usedFallback: false,
      modelUsed: modelName,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'AI request failed';
    console.warn('Gemini AI Match Generation failed, using Smart Fallback:', errMsg);
    return runLocalFallbackGenerator(
      params,
      `AI unavailable (${errMsg}) — automatically generated matches using Smart System Engine.`
    );
  }
}

