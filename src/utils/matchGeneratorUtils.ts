import type {
  OpenPlayMatch,
  OpenPlayMatchPlayer,
  OpenPlayMatchRosterItem,
} from '../components/admin/adminTypes';

export interface UniquePartnerOptions {
  eventId: string;
  rosterPool: OpenPlayMatchRosterItem[];
  assignedCourts: string[];
  totalRounds: number;
  targetPoints?: number;
  gameType?: 'doubles' | 'singles';
  existingMatches?: OpenPlayMatch[];
  startingRound?: number;
  isSmartMatch?: boolean;
}

export interface MatchGenerationResult {
  matches: OpenPlayMatch[];
  partnerUniquenessPercent: number;
  totalPairings: number;
  uniquePairingsCount: number;
  repeatedPairingsCount: number;
  maxTheoreticalUniqueRounds: number;
  playerMatchCounts: Record<string, number>;
  playerRestCounts: Record<string, number>;
}

export interface SessionRoundPacing {
  gamesPerRound: number;
  timeWavesPerRound: number;
  minutesPerRound: number;
  recommendedRounds: number;
  totalSessionGames: number;
  avgGamesPerPlayer: number;
  maxUniqueRounds: number;
}

/**
 * Calculates theoretical maximum number of full rotation rounds before a partner repeat is mathematically guaranteed.
 * In each round, every player plays 1 game (partnering with 1 teammate).
 * With N players, each player has (N - 1) possible unique partners.
 */
export const calculateMaxUniqueDoublesRounds = (activePlayerCount: number, _courtCount: number = 1): number => {
  if (activePlayerCount < 4) return 0;

  const gamesPerRound = Math.ceil(activePlayerCount / 4);
  const pairsPerRound = gamesPerRound * 2;
  if (pairsPerRound <= 0) return 0;

  // Total possible unique pairs = N * (N - 1) / 2
  const totalUniquePairsPossible = (activePlayerCount * (activePlayerCount - 1)) / 2;

  // Upper bound on full rounds with zero repeats
  const theoreticalLimit = Math.floor(totalUniquePairsPossible / pairsPerRound);

  // Each player can partner at most (N - 1) times
  return Math.max(1, Math.min(activePlayerCount - 1, theoreticalLimit));
};

/**
 * Dynamically calculates games per round, parallel court time waves, round duration,
 * and recommended rounds based on active players (N) and available Open Play courts (C).
 */
export const calculateSessionRoundPacing = (
  activePlayerCount: number,
  courtCount: number,
  sessionDurationMinutes: number,
  estGameDurationMinutes: number,
  playersPerMatch: number = 4
): SessionRoundPacing => {
  const safePlayers = Math.max(playersPerMatch, activePlayerCount);
  const safeCourts = Math.max(1, courtCount);
  const safeGameMins = Math.max(5, estGameDurationMinutes);
  const safeSessionMins = Math.max(safeGameMins, sessionDurationMinutes);

  // 1. Games required in 1 Round so every active player plays once
  const gamesPerRound = Math.max(1, Math.ceil(safePlayers / playersPerMatch));

  // 2. Time Waves needed in 1 Round given C available courts running simultaneously
  const timeWavesPerRound = Math.max(1, Math.ceil(gamesPerRound / safeCourts));

  // 3. Duration of 1 full Round in minutes
  const minutesPerRound = timeWavesPerRound * safeGameMins;

  // 4. Recommended number of full Rounds that fit in the session duration
  const recommendedRounds = Math.max(1, Math.floor(safeSessionMins / minutesPerRound));

  // 5. Total games across all recommended rounds
  const totalSessionGames = recommendedRounds * gamesPerRound;

  // 6. Average games each player will play across the session
  const avgGamesPerPlayer = Number(
    ((totalSessionGames * playersPerMatch) / safePlayers).toFixed(1)
  );

  const maxUniqueRounds = calculateMaxUniqueDoublesRounds(safePlayers, safeCourts);

  return {
    gamesPerRound,
    timeWavesPerRound,
    minutesPerRound,
    recommendedRounds,
    totalSessionGames,
    avgGamesPerPlayer,
    maxUniqueRounds,
  };
};

/**
 * Maps an OpenPlayMatchRosterItem to the OpenPlayMatchPlayer structure used inside match teams.
 */
export const mapRosterToMatchPlayer = (p: OpenPlayMatchRosterItem): OpenPlayMatchPlayer => ({
  id: p.id,
  name: p.name,
  photoUrl: p.photoUrl,
  skillLevel: p.skillLevel,
  type: p.type,
  duprId: p.adminDuprId || p.duprId || undefined,
  duprRating: p.adminDuprRating || p.duprRating || undefined,
  adminDuprId: p.adminDuprId,
  adminDuprRating: p.adminDuprRating,
  isDummy: p.isDummy,
});

/**
 * Consistent symmetric key for tracking partnerships or opponent pairs between two player IDs.
 */
export const getPairKey = (id1: string, id2: string): string => {
  return id1 < id2 ? `${id1}___${id2}` : `${id2}___${id1}`;
};

/**
 * Consistent canonical key for tracking the exact 4 players on a court regardless of ordering.
 */
export const getFoursomeKey = (ids: string[]): string => {
  return [...ids].sort().join('___');
};

/**
 * Consistent canonical key for tracking an exact doubles matchup: (Red1, Red2) vs (Blue1, Blue2).
 */
export const getMatchupKey = (team1Ids: string[], team2Ids: string[]): string => {
  const k1 = [...team1Ids].sort().join('__');
  const k2 = [...team2Ids].sort().join('__');
  return k1 < k2 ? `${k1}__VS__${k2}` : `${k2}__VS__${k1}`;
};

/**
 * Generates multi-game rounds where EVERY Round represents a full rotation of the active roster
 * (e.g. 12 players = 3 games in Round 1), distributed across the Open Play event's available courts,
 * while guaranteeing or strictly maximizing unique partners every game and avoiding duplicate games.
 */
export const generateUniquePartnerMatches = (options: UniquePartnerOptions): MatchGenerationResult => {
  const {
    eventId,
    rosterPool,
    assignedCourts,
    totalRounds,
    targetPoints = 11,
    gameType = 'doubles',
    existingMatches = [],
    startingRound = 1,
    isSmartMatch = false,
  } = options;

  const activePlayers = rosterPool.filter((p) => p.status === 'active');
  const courtCount = Math.max(1, assignedCourts.length);
  const isDoubles = gameType === 'doubles';
  const playersPerMatch = isDoubles ? 4 : 2;

  // Check if ALL active players are NR (unrated)
  const allPlayersNR = activePlayers.every(isPlayerNR);

  if (activePlayers.length < playersPerMatch) {
    return {
      matches: [],
      partnerUniquenessPercent: 100,
      totalPairings: 0,
      uniquePairingsCount: 0,
      repeatedPairingsCount: 0,
      maxTheoreticalUniqueRounds: 0,
      playerMatchCounts: {},
      playerRestCounts: {},
    };
  }

  // Tracking matrices
  const partnerCounts = new Map<string, number>();
  const opponentCounts = new Map<string, number>();
  const foursomeCounts = new Map<string, number>();
  const exactMatchCounts = new Map<string, number>();
  const matchesPlayed = new Map<string, number>();
  const consecutiveRests = new Map<string, number>();
  const courtVisits = new Map<string, Map<string, number>>();

  // Track immediately preceding round recency
  const maxExistingRound = existingMatches.length > 0 ? Math.max(...existingMatches.map((m) => m.round)) : 0;
  const lastRoundFoursomes = new Set<string>();
  const lastRoundPartners = new Set<string>();
  const lastRoundOpponents = new Set<string>();

  // Initialize tracking maps for active players
  activePlayers.forEach((p) => {
    matchesPlayed.set(p.id, 0);
    consecutiveRests.set(p.id, 0);
    courtVisits.set(p.id, new Map());
  });

  // Hydrate tracking matrices from existing matches (all prior rounds already played/scheduled)
  existingMatches.forEach((m) => {
    const red = m.teamRed.players;
    const blue = m.teamBlue.players;
    const allMatchPlayers = [...red, ...blue];

    if (isDoubles) {
      if (red.length === 2 && blue.length === 2) {
        const fKey = getFoursomeKey([red[0].id, red[1].id, blue[0].id, blue[1].id]);
        foursomeCounts.set(fKey, (foursomeCounts.get(fKey) || 0) + 1);

        const mKey = getMatchupKey([red[0].id, red[1].id], [blue[0].id, blue[1].id]);
        exactMatchCounts.set(mKey, (exactMatchCounts.get(mKey) || 0) + 1);

        const kRed = getPairKey(red[0].id, red[1].id);
        const kBlue = getPairKey(blue[0].id, blue[1].id);
        partnerCounts.set(kRed, (partnerCounts.get(kRed) || 0) + 1);
        partnerCounts.set(kBlue, (partnerCounts.get(kBlue) || 0) + 1);

        if (m.round === maxExistingRound) {
          lastRoundFoursomes.add(fKey);
          lastRoundPartners.add(kRed);
          lastRoundPartners.add(kBlue);
        }
      }
    } else {
      if (red.length >= 1 && blue.length >= 1) {
        const mKey = getMatchupKey([red[0].id], [blue[0].id]);
        exactMatchCounts.set(mKey, (exactMatchCounts.get(mKey) || 0) + 1);
      }
    }

    // Opponents
    red.forEach((r) => {
      blue.forEach((b) => {
        const ok = getPairKey(r.id, b.id);
        opponentCounts.set(ok, (opponentCounts.get(ok) || 0) + 1);
        if (m.round === maxExistingRound) {
          lastRoundOpponents.add(ok);
        }
      });
    });

    // Counts
    allMatchPlayers.forEach((p) => {
      matchesPlayed.set(p.id, (matchesPlayed.get(p.id) || 0) + 1);
      const cv = courtVisits.get(p.id);
      if (cv) {
        cv.set(m.courtName, (cv.get(m.courtName) || 0) + 1);
      }
    });
  });

  const generatedMatches: OpenPlayMatch[] = [];
  let totalPairingsFormed = 0;
  let uniquePairingsFormed = 0;
  let repeatedPairingsFormed = 0;
  let globalCourtCounter = existingMatches.length;

  // Number of games per round to rotate all active players once
  const gamesPerRound = Math.max(1, Math.ceil(activePlayers.length / playersPerMatch));
  const fullBatchGamesCount = Math.floor(activePlayers.length / playersPerMatch);
  const hasPartialOverflowGame = gamesPerRound > fullBatchGamesCount;

  // Map to player object lookup
  const playerMap = new Map<string, OpenPlayMatchRosterItem>(activePlayers.map((p) => [p.id, p]));

  // Helper to record a formed match and update tracking matrices
  const commitMatchToRound = (
    roundNum: number,
    courtName: string,
    matchPlayerIds: string[]
  ) => {
    let teamRedPlayers: OpenPlayMatchPlayer[] = [];
    let teamBluePlayers: OpenPlayMatchPlayer[] = [];

    if (isDoubles) {
      const pRed1 = playerMap.get(matchPlayerIds[0])!;
      const pRed2 = playerMap.get(matchPlayerIds[1])!;
      const pBlue1 = playerMap.get(matchPlayerIds[2])!;
      const pBlue2 = playerMap.get(matchPlayerIds[3])!;

      teamRedPlayers = [mapRosterToMatchPlayer(pRed1), mapRosterToMatchPlayer(pRed2)];
      teamBluePlayers = [mapRosterToMatchPlayer(pBlue1), mapRosterToMatchPlayer(pBlue2)];

      // Record partnerships formed
      const redPairKey = getPairKey(pRed1.id, pRed2.id);
      const redPrior = partnerCounts.get(redPairKey) || 0;
      partnerCounts.set(redPairKey, redPrior + 1);
      totalPairingsFormed++;
      if (redPrior === 0) uniquePairingsFormed++;
      else repeatedPairingsFormed++;

      const bluePairKey = getPairKey(pBlue1.id, pBlue2.id);
      const bluePrior = partnerCounts.get(bluePairKey) || 0;
      partnerCounts.set(bluePairKey, bluePrior + 1);
      totalPairingsFormed++;
      if (bluePrior === 0) uniquePairingsFormed++;
      else repeatedPairingsFormed++;

      // Record foursome and matchup formed
      const foursomeKey = getFoursomeKey(matchPlayerIds);
      foursomeCounts.set(foursomeKey, (foursomeCounts.get(foursomeKey) || 0) + 1);

      const matchupKey = getMatchupKey([pRed1.id, pRed2.id], [pBlue1.id, pBlue2.id]);
      exactMatchCounts.set(matchupKey, (exactMatchCounts.get(matchupKey) || 0) + 1);

      lastRoundFoursomes.add(foursomeKey);
      lastRoundPartners.add(redPairKey);
      lastRoundPartners.add(bluePairKey);

      // Record opponent interactions
      [pRed1, pRed2].forEach((r) => {
        [pBlue1, pBlue2].forEach((b) => {
          const ok = getPairKey(r.id, b.id);
          opponentCounts.set(ok, (opponentCounts.get(ok) || 0) + 1);
          lastRoundOpponents.add(ok);
        });
      });

      // Record court visit & matches played
      [pRed1, pRed2, pBlue1, pBlue2].forEach((p) => {
        matchesPlayed.set(p.id, (matchesPlayed.get(p.id) || 0) + 1);
        const cv = courtVisits.get(p.id);
        if (cv) cv.set(courtName, (cv.get(courtName) || 0) + 1);
      });
    } else {
      // Singles
      const pRed = playerMap.get(matchPlayerIds[0])!;
      const pBlue = playerMap.get(matchPlayerIds[1])!;

      teamRedPlayers = [mapRosterToMatchPlayer(pRed)];
      teamBluePlayers = [mapRosterToMatchPlayer(pBlue)];

      const ok = getPairKey(pRed.id, pBlue.id);
      opponentCounts.set(ok, (opponentCounts.get(ok) || 0) + 1);
      lastRoundOpponents.add(ok);

      const matchupKey = getMatchupKey([pRed.id], [pBlue.id]);
      exactMatchCounts.set(matchupKey, (exactMatchCounts.get(matchupKey) || 0) + 1);

      [pRed, pBlue].forEach((p) => {
        matchesPlayed.set(p.id, (matchesPlayed.get(p.id) || 0) + 1);
        const cv = courtVisits.get(p.id);
        if (cv) cv.set(courtName, (cv.get(courtName) || 0) + 1);
      });
    }

    const gameNumber = existingMatches.length + generatedMatches.length + 1;
    const matchId = `op-uniq-${eventId}-r${roundNum}-g${gameNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    generatedMatches.push({
      id: matchId,
      eventId,
      round: roundNum,
      matchName: `Game ${gameNumber}`,
      courtName,
      gameType,
      targetPoints,
      status: 'scheduled',
      teamRed: { players: teamRedPlayers, score: 0 },
      teamBlue: { players: teamBluePlayers, score: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  // Evaluates penalty cost of an arrangement of players across `numGames` games
  const computeBatchCost = (order: string[], numGames: number, baseCourtIdx: number): number => {
    let cost = 0;
    for (let gIdx = 0; gIdx < numGames; gIdx++) {
      const base = gIdx * playersPerMatch;
      const courtName = assignedCourts[(baseCourtIdx + gIdx) % courtCount] || `Court ${((baseCourtIdx + gIdx) % courtCount) + 1}`;

      if (isDoubles) {
        const red1 = order[base];
        const red2 = order[base + 1];
        const blue1 = order[base + 2];
        const blue2 = order[base + 3];

        // 1. Exact Match Repeat (heaviest penalty: 100,000)
        const matchupKey = getMatchupKey([red1, red2], [blue1, blue2]);
        const exactRepeats = exactMatchCounts.get(matchupKey) || 0;
        if (exactRepeats > 0) {
          cost += exactRepeats * 100000;
        }

        // 2. Exact 4-Player Court Foursome Repeat (penalty: 25,000 if activePlayers >= 8)
        if (activePlayers.length >= 8) {
          const foursomeKey = getFoursomeKey([red1, red2, blue1, blue2]);
          const foursomeRepeats = foursomeCounts.get(foursomeKey) || 0;
          if (foursomeRepeats > 0) {
            cost += foursomeRepeats * 25000;
          }
          if (lastRoundFoursomes.has(foursomeKey)) {
            cost += 15000;
          }
        }

        // 3. Heavy penalty for partner repeats (10,000 per repeat)
        const redPartnerKey = getPairKey(red1, red2);
        const redPartnerTimes = partnerCounts.get(redPartnerKey) || 0;
        if (redPartnerTimes > 0) {
          cost += redPartnerTimes * 10000;
        }
        if (lastRoundPartners.has(redPartnerKey)) {
          cost += 8000;
        }

        const bluePartnerKey = getPairKey(blue1, blue2);
        const bluePartnerTimes = partnerCounts.get(bluePartnerKey) || 0;
        if (bluePartnerTimes > 0) {
          cost += bluePartnerTimes * 10000;
        }
        if (lastRoundPartners.has(bluePartnerKey)) {
          cost += 8000;
        }

        // 4. Opponent repeats (200 per repeat + 1,000 if back-to-back from prev round)
        const opps = [
          getPairKey(red1, blue1),
          getPairKey(red1, blue2),
          getPairKey(red2, blue1),
          getPairKey(red2, blue2),
        ];
        opps.forEach((ok) => {
          cost += (opponentCounts.get(ok) || 0) * 200;
          if (lastRoundOpponents.has(ok)) {
            cost += 1000;
          }
        });

        // 5. Small penalty for repeatedly playing on same court (5 per visit)
        [red1, red2, blue1, blue2].forEach((pId) => {
          const cv = courtVisits.get(pId);
          cost += (cv?.get(courtName) || 0) * 5;
        });

        // 6. DUPR Smart Match Parity & Court Tier Clustering
        if (isSmartMatch) {
          const pR1 = playerMap.get(red1);
          const pR2 = playerMap.get(red2);
          const pB1 = playerMap.get(blue1);
          const pB2 = playerMap.get(blue2);

          if (pR1 && pR2 && pB1 && pB2) {
            const rR1 = getPlayerEffectiveRating(pR1, allPlayersNR);
            const rR2 = getPlayerEffectiveRating(pR2, allPlayersNR);
            const rB1 = getPlayerEffectiveRating(pB1, allPlayersNR);
            const rB2 = getPlayerEffectiveRating(pB2, allPlayersNR);

            const teamRedSum = rR1 + rR2;
            const teamBlueSum = rB1 + rB2;
            const teamDelta = Math.abs(teamRedSum - teamBlueSum);

            // Parity penalty: scaled to prioritize balance without overriding partner uniqueness
            cost += teamDelta * 2000;

            // Court tier clustering penalty: prevent excessive disparity on a single court
            const courtSpread = Math.max(rR1, rR2, rB1, rB2) - Math.min(rR1, rR2, rB1, rB2);
            if (courtSpread > 1.2) {
              cost += (courtSpread - 1.2) * 800;
            }
          }
        }
      } else {
        const p1 = order[base];
        const p2 = order[base + 1];
        const oppKey = getPairKey(p1, p2);
        cost += (opponentCounts.get(oppKey) || 0) * 200;
        if (lastRoundOpponents.has(oppKey)) {
          cost += 1000;
        }

        if (isSmartMatch) {
          const pR = playerMap.get(p1);
          const pB = playerMap.get(p2);
          if (pR && pB) {
            const r1 = getPlayerEffectiveRating(pR, allPlayersNR);
            const r2 = getPlayerEffectiveRating(pB, allPlayersNR);
            cost += Math.abs(r1 - r2) * 2000;
          }
        }
      }
    }
    return cost;
  };

  // Optimizes ordering of player IDs across `numGames` using randomized hill-climbing with multi-restart
  const optimizePlayerArrangement = (playerIds: string[], numGames: number, baseCourtIdx: number): string[] => {
    let bestArrangement = [...playerIds];
    let bestCost = computeBatchCost(bestArrangement, numGames, baseCourtIdx);
    if (bestCost === 0) return bestArrangement;

    const RESTARTS = 75;
    const MAX_SWAPS = 120;

    for (let restart = 0; restart < RESTARTS; restart++) {
      const currentOrder = [...playerIds].sort(() => Math.random() - 0.5);
      let currentCost = computeBatchCost(currentOrder, numGames, baseCourtIdx);

      if (currentCost === 0) {
        return currentOrder;
      }

      for (let swap = 0; swap < MAX_SWAPS; swap++) {
        const i = Math.floor(Math.random() * currentOrder.length);
        const j = Math.floor(Math.random() * currentOrder.length);
        if (i === j) continue;

        const temp = currentOrder[i];
        currentOrder[i] = currentOrder[j];
        currentOrder[j] = temp;

        const newCost = computeBatchCost(currentOrder, numGames, baseCourtIdx);
        if (newCost < currentCost) {
          currentCost = newCost;
          if (currentCost === 0) break;
        } else {
          currentOrder[j] = currentOrder[i];
          currentOrder[i] = temp;
        }
      }

      if (currentCost < bestCost) {
        bestCost = currentCost;
        bestArrangement = [...currentOrder];
        if (bestCost === 0) break;
      }
    }

    return bestArrangement;
  };

  for (let roundOffset = 0; roundOffset < totalRounds; roundOffset++) {
    const currentRoundNum = startingRound + roundOffset;

    // Reset last round tracking for newly simulated round
    lastRoundFoursomes.clear();
    lastRoundPartners.clear();
    lastRoundOpponents.clear();

    // Sort active players by fewest matches played, with random rotation
    const sortedPool = [...activePlayers].sort((a, b) => {
      const aMatches = matchesPlayed.get(a.id) || 0;
      const bMatches = matchesPlayed.get(b.id) || 0;
      if (aMatches !== bMatches) return aMatches - bMatches;

      const aRests = consecutiveRests.get(a.id) || 0;
      const bRests = consecutiveRests.get(b.id) || 0;
      if (aRests !== bRests) return bRests - aRests;

      return Math.random() - 0.5;
    });

    // Rotate player order slightly across rounds so different players land on different courts before hill-climbing
    const roundShift = ((maxExistingRound + roundOffset) * 3) % sortedPool.length;
    const rotatedPool = [...sortedPool.slice(roundShift), ...sortedPool.slice(0, roundShift)];

    // 1. Primary batch of full games covering `fullBatchGamesCount * playersPerMatch` distinct players
    const primarySlots = fullBatchGamesCount * playersPerMatch;
    const primaryPlayers = rotatedPool.slice(0, primarySlots);
    const leftoverPlayers = rotatedPool.slice(primarySlots);

    if (fullBatchGamesCount > 0) {
      const optimizedPrimaryIds = optimizePlayerArrangement(
        primaryPlayers.map((p) => p.id),
        fullBatchGamesCount,
        globalCourtCounter
      );

      for (let gIdx = 0; gIdx < fullBatchGamesCount; gIdx++) {
        const base = gIdx * playersPerMatch;
        const courtName = assignedCourts[globalCourtCounter % courtCount] || `Court ${(globalCourtCounter % courtCount) + 1}`;
        globalCourtCounter++;

        commitMatchToRound(
          currentRoundNum,
          courtName,
          optimizedPrimaryIds.slice(base, base + playersPerMatch)
        );
      }
    }

    // 2. If activePlayers is not an exact multiple of playersPerMatch (e.g. 10 players -> 2 leftover),
    // form 1 additional game in this round so the leftover players also get to play in this round!
    if (hasPartialOverflowGame && leftoverPlayers.length > 0) {
      const neededFillCount = playersPerMatch - leftoverPlayers.length;
      // Pick fill players from those with the fewest matches played who aren't in leftoverPlayers
      const leftoverIds = new Set(leftoverPlayers.map((p) => p.id));
      const fillCandidates = [...activePlayers]
        .filter((p) => !leftoverIds.has(p.id))
        .sort((a, b) => {
          const aMatches = matchesPlayed.get(a.id) || 0;
          const bMatches = matchesPlayed.get(b.id) || 0;
          if (aMatches !== bMatches) return aMatches - bMatches;
          return Math.random() - 0.5;
        })
        .slice(0, neededFillCount);

      const overflowGamePlayerIds = [
        ...leftoverPlayers.map((p) => p.id),
        ...fillCandidates.map((p) => p.id),
      ];

      if (overflowGamePlayerIds.length === playersPerMatch) {
        const optimizedOverflowIds = optimizePlayerArrangement(
          overflowGamePlayerIds,
          1,
          globalCourtCounter
        );
        const courtName = assignedCourts[globalCourtCounter % courtCount] || `Court ${(globalCourtCounter % courtCount) + 1}`;
        globalCourtCounter++;

        commitMatchToRound(currentRoundNum, courtName, optimizedOverflowIds);
      }
    }
  }

  const partnerUniquenessPercent =
    totalPairingsFormed > 0
      ? Math.round((uniquePairingsFormed / totalPairingsFormed) * 100)
      : 100;

  const playerMatchCounts: Record<string, number> = {};
  const playerRestCounts: Record<string, number> = {};

  activePlayers.forEach((p) => {
    playerMatchCounts[p.id] = matchesPlayed.get(p.id) || 0;
    playerRestCounts[p.id] = 0; // Every player plays in every round!
  });

  return {
    matches: generatedMatches,
    partnerUniquenessPercent,
    totalPairings: totalPairingsFormed,
    uniquePairingsCount: uniquePairingsFormed,
    repeatedPairingsCount: repeatedPairingsFormed,
    maxTheoreticalUniqueRounds: calculateMaxUniqueDoublesRounds(activePlayers.length, courtCount),
    playerMatchCounts,
    playerRestCounts,
  };
};

/**
 * Detects if a player is unrated (NR / No Rate / unrated).
 * Players with "NR", "nr", "No Rate", or empty/invalid ratings are unrated.
 */
export const isPlayerNR = (player: OpenPlayMatchRosterItem): boolean => {
  const raw = String(player.adminDuprRating || player.duprRating || '').trim().toLowerCase();
  if (!raw) return true;
  if (
    raw === 'nr' ||
    raw === 'no rate' ||
    raw === 'unrated' ||
    raw === 'none' ||
    raw === 'n/a' ||
    raw === 'null' ||
    raw === 'undefined'
  ) {
    return true;
  }
  if (raw.startsWith('nr') || raw.includes('no rate') || raw.includes('unrated')) return true;

  // If numeric parse fails or out of range, considered NR
  const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
  if (isNaN(num) || num < 1.0 || num > 8.0) return true;

  return false;
};

/**
 * Resolves a reliable numeric DUPR rating for matchmaking following official DUPR Director guidelines:
 * 1. If player has an established official numeric rating (1.0 - 8.0), return it.
 * 2. If all players in the session are NR (no calibration reference), default to standard DUPR baseline: 3.50.
 * 3. If player is NR (unrated), calculate Director eyeball estimate:
 *    - If an eyeball estimate is explicitly written in rating (e.g. "NR (2.4)" or "2.4"), use it.
 *    - Tennis / Advanced (4.0+) -> 3.80
 *    - Intermediate (3.0 - 3.5) -> 3.25
 *    - Beginner (2.0 - 2.5) -> 2.40
 *    - Default / Open to All -> 3.00
 */
export const getPlayerEffectiveRating = (
  player: OpenPlayMatchRosterItem,
  allPlayersNR: boolean = false
): number => {
  // DUPR Rule #3: When everyone is an NR with no reference data, algorithm defaults to 3.50
  if (allPlayersNR) {
    return 3.5;
  }

  const raw = String(player.adminDuprRating || player.duprRating || '').trim();
  const isNR = isPlayerNR(player);

  if (!isNR) {
    const parsed = parseFloat(raw.replace(/[^0-9.]/g, ''));
    if (!isNaN(parsed) && parsed >= 1.0 && parsed <= 8.0) {
      return Number(parsed.toFixed(2));
    }
  }

  // If NR, check if an eyeball numeric rating was provided (e.g. "NR ~2.5" or "2.4")
  const extractedNum = parseFloat(raw.replace(/[^0-9.]/g, ''));
  if (!isNaN(extractedNum) && extractedNum >= 1.0 && extractedNum <= 8.0) {
    return Number(extractedNum.toFixed(2));
  }

  // Director Eyeball estimation based on skill level:
  const skill = (player.skillLevel || '').toLowerCase();
  if (
    skill.includes('tennis') ||
    skill.includes('advanced') ||
    skill.includes('4.0') ||
    skill.includes('4.5') ||
    skill.includes('5.0')
  ) {
    return 3.8; // High-level tennis player / advanced transition
  }
  if (skill.includes('intermediate') || skill.includes('3.0') || skill.includes('3.5')) {
    return 3.25; // Intermediate player
  }
  if (
    skill.includes('beginner') ||
    skill.includes('2.0') ||
    skill.includes('2.5') ||
    skill.includes('novice')
  ) {
    return 2.4; // Beginner eyeball range (around 2.3-2.5)
  }

  return 3.0; // General baseline
};

export interface SmartDuprMatchOptions extends UniquePartnerOptions {
  startingRound?: number;
}

/**
 * Smart Match: DUPR Director Rating-Based Matchmaking Engine with NR Anchor Calibration.
 *
 * Implements official DUPR Director Placement Principles:
 * 1. Unrated (NR) players are paired with and against established rated "anchors" of similar estimated skill.
 * 2. Unrated players are NEVER isolated 4-on-a-court without rated anchors if rated players exist in the session.
 * 3. When everyone is an NR (zero rated players), defaults all players to the DUPR standard baseline of 3.50.
 * 4. Doubles teams use balanced 1&4 vs 2&3 parity (e.g. Rated 1 + NR 2 vs Rated 2 + NR 1).
 * 5. Rotates pairings across rounds while keeping players within their competitive skill tier.
 */
export const generateSmartDuprMatches = (options: SmartDuprMatchOptions): MatchGenerationResult => {
  return generateUniquePartnerMatches({
    ...options,
    isSmartMatch: true,
  });
};
