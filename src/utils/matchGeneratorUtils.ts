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

/**
 * Calculates theoretical maximum number of rounds before any partner repeat is mathematically guaranteed.
 * For doubles with N players: Each player can have at most (N - 1) unique partners.
 */
export const calculateMaxUniqueDoublesRounds = (activePlayerCount: number, courtCount: number): number => {
  if (activePlayerCount < 4 || courtCount < 1) return 0;
  // If everyone plays each round (e.g. 8 players on 2 courts, 12 on 3, 16 on 4):
  // Maximum unique rounds = N - 1 (when N is a multiple of 4).
  const maxSimultaneousPlayers = Math.min(courtCount * 4, Math.floor(activePlayerCount / 4) * 4);
  if (maxSimultaneousPlayers <= 0) return 0;

  // Total possible unique pairs = N * (N - 1) / 2
  const totalUniquePairsPossible = (activePlayerCount * (activePlayerCount - 1)) / 2;
  const pairsPerRound = maxSimultaneousPlayers / 2;

  // Upper bound on rounds with zero repeats
  const theoreticalLimit = Math.floor(totalUniquePairsPossible / pairsPerRound);

  // Each player can partner at most (N - 1) times
  return Math.max(1, Math.min(activePlayerCount - 1, theoreticalLimit));
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
});

/**
 * Consistent symmetric key for tracking partnerships or opponent pairs between two player IDs.
 */
const getPairKey = (id1: string, id2: string): string => {
  return id1 < id2 ? `${id1}___${id2}` : `${id2}___${id1}`;
};

/**
 * Generates matches with the primary constraint that EVERY player receives a UNIQUE partner
 * every game (or strictly minimized repeats if rounds exceed theoretical max).
 * Also optimizes:
 *  1. Equal play time / fair bench rotation when active players > 4 * courts.
 *  2. Opponent diversity (minimizes facing the same opponents repeatedly).
 *  3. Even court distribution across assigned session courts.
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
  } = options;

  const activePlayers = rosterPool.filter((p) => p.status === 'active');
  const courtCount = assignedCourts.length || 1;
  const isDoubles = gameType === 'doubles';
  const playersPerMatch = isDoubles ? 4 : 2;

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
  const matchesPlayed = new Map<string, number>();
  const consecutiveRests = new Map<string, number>();
  const courtVisits = new Map<string, Map<string, number>>();

  // Initialize tracking maps for active players
  activePlayers.forEach((p) => {
    matchesPlayed.set(p.id, 0);
    consecutiveRests.set(p.id, 0);
    courtVisits.set(p.id, new Map());
  });

  // Hydrate tracking matrices from existing matches (if any prior rounds already played)
  existingMatches.forEach((m) => {
    const red = m.teamRed.players;
    const blue = m.teamBlue.players;

    if (isDoubles) {
      if (red.length === 2) {
        const k = getPairKey(red[0].id, red[1].id);
        partnerCounts.set(k, (partnerCounts.get(k) || 0) + 1);
      }
      if (blue.length === 2) {
        const k = getPairKey(blue[0].id, blue[1].id);
        partnerCounts.set(k, (partnerCounts.get(k) || 0) + 1);
      }
    }

    // Opponents
    red.forEach((r) => {
      blue.forEach((b) => {
        const ok = getPairKey(r.id, b.id);
        opponentCounts.set(ok, (opponentCounts.get(ok) || 0) + 1);
      });
    });

    // Counts
    [...red, ...blue].forEach((p) => {
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

  // Max simultaneous matches per round
  const maxCourtsThisSession = Math.min(courtCount, Math.floor(activePlayers.length / playersPerMatch));
  const activeSlotsPerRound = maxCourtsThisSession * playersPerMatch;

  // Map to player object lookup
  const playerMap = new Map<string, OpenPlayMatchRosterItem>(activePlayers.map((p) => [p.id, p]));

  for (let roundOffset = 0; roundOffset < totalRounds; roundOffset++) {
    const currentRoundNum = startingRound + roundOffset;

    // STEP 1: Select players to play in current round
    // If some players must rest (e.g. 10 players on 2 courts -> 8 play, 2 rest):
    // Prioritize players with fewer matches played, and those who rested consecutively.
    const sortedPool = [...activePlayers].sort((a, b) => {
      const aMatches = matchesPlayed.get(a.id) || 0;
      const bMatches = matchesPlayed.get(b.id) || 0;
      if (aMatches !== bMatches) return aMatches - bMatches;

      const aRests = consecutiveRests.get(a.id) || 0;
      const bRests = consecutiveRests.get(b.id) || 0;
      if (aRests !== bRests) return bRests - aRests; // More rests -> prioritized to play

      return Math.random() - 0.5; // Random tie-breaker
    });

    const playingPlayers = sortedPool.slice(0, activeSlotsPerRound);
    const restingPlayers = sortedPool.slice(activeSlotsPerRound);

    // Update rest counters
    restingPlayers.forEach((p) => {
      consecutiveRests.set(p.id, (consecutiveRests.get(p.id) || 0) + 1);
    });
    playingPlayers.forEach((p) => {
      consecutiveRests.set(p.id, 0);
    });

    // STEP 2: Optimal Pairing Search for the selected playing players
    // We seek an arrangement of playingPlayers into courts and 2v2 teams minimizing partner repeats.
    let bestArrangement: string[] = playingPlayers.map((p) => p.id);
    let bestCost = Infinity;

    // Evaluates penalty cost of a candidate player ordering:
    // Every 4 consecutive IDs form a court: [P0, P1] (Team Red) vs [P2, P3] (Team Blue)
    const computeCost = (order: string[]): number => {
      let cost = 0;
      for (let cIdx = 0; cIdx < maxCourtsThisSession; cIdx++) {
        const base = cIdx * playersPerMatch;
        const courtName = assignedCourts[cIdx] || `Court ${cIdx + 1}`;

        if (isDoubles) {
          const red1 = order[base];
          const red2 = order[base + 1];
          const blue1 = order[base + 2];
          const blue2 = order[base + 3];

          // Heavy penalty for partner repeats (10,000 per repeat)
          const redPartnerKey = getPairKey(red1, red2);
          const redPartnerTimes = partnerCounts.get(redPartnerKey) || 0;
          if (redPartnerTimes > 0) {
            cost += redPartnerTimes * 10000;
          }

          const bluePartnerKey = getPairKey(blue1, blue2);
          const bluePartnerTimes = partnerCounts.get(bluePartnerKey) || 0;
          if (bluePartnerTimes > 0) {
            cost += bluePartnerTimes * 10000;
          }

          // Moderate penalty for opponent repeats (50 per repeat)
          const opps = [
            getPairKey(red1, blue1),
            getPairKey(red1, blue2),
            getPairKey(red2, blue1),
            getPairKey(red2, blue2),
          ];
          opps.forEach((ok) => {
            cost += (opponentCounts.get(ok) || 0) * 50;
          });

          // Small penalty for repeatedly playing on same court (5 per visit)
          [red1, red2, blue1, blue2].forEach((pId) => {
            const cv = courtVisits.get(pId);
            cost += (cv?.get(courtName) || 0) * 5;
          });
        } else {
          // Singles: minimize opponent repeats
          const p1 = order[base];
          const p2 = order[base + 1];
          const oppKey = getPairKey(p1, p2);
          cost += (opponentCounts.get(oppKey) || 0) * 100;
        }
      }
      return cost;
    };

    // Randomized Local Search with multiple restarts
    const RESTARTS = 40;
    const MAX_SWAPS = 60;

    for (let restart = 0; restart < RESTARTS; restart++) {
      let currentOrder = [...playingPlayers.map((p) => p.id)].sort(() => Math.random() - 0.5);
      let currentCost = computeCost(currentOrder);

      if (currentCost === 0) {
        bestArrangement = currentOrder;
        bestCost = 0;
        break; // Zero partner repeats and zero repeated opponents!
      }

      // Local hill-climbing swaps
      for (let swap = 0; swap < MAX_SWAPS; swap++) {
        const i = Math.floor(Math.random() * currentOrder.length);
        const j = Math.floor(Math.random() * currentOrder.length);
        if (i === j) continue;

        // Try swap
        const temp = currentOrder[i];
        currentOrder[i] = currentOrder[j];
        currentOrder[j] = temp;

        const newCost = computeCost(currentOrder);
        if (newCost < currentCost) {
          currentCost = newCost;
          if (currentCost === 0) break;
        } else {
          // Revert swap
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

    // STEP 3: Construct matches for this round from the best arrangement
    for (let cIdx = 0; cIdx < maxCourtsThisSession; cIdx++) {
      const base = cIdx * playersPerMatch;
      const courtName = assignedCourts[cIdx] || `Court ${cIdx + 1}`;

      let teamRedPlayers: OpenPlayMatchPlayer[] = [];
      let teamBluePlayers: OpenPlayMatchPlayer[] = [];

      if (isDoubles) {
        const pRed1 = playerMap.get(bestArrangement[base])!;
        const pRed2 = playerMap.get(bestArrangement[base + 1])!;
        const pBlue1 = playerMap.get(bestArrangement[base + 2])!;
        const pBlue2 = playerMap.get(bestArrangement[base + 3])!;

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

        // Record opponent interactions
        [pRed1, pRed2].forEach((r) => {
          [pBlue1, pBlue2].forEach((b) => {
            const ok = getPairKey(r.id, b.id);
            opponentCounts.set(ok, (opponentCounts.get(ok) || 0) + 1);
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
        const pRed = playerMap.get(bestArrangement[base])!;
        const pBlue = playerMap.get(bestArrangement[base + 1])!;

        teamRedPlayers = [mapRosterToMatchPlayer(pRed)];
        teamBluePlayers = [mapRosterToMatchPlayer(pBlue)];

        const ok = getPairKey(pRed.id, pBlue.id);
        opponentCounts.set(ok, (opponentCounts.get(ok) || 0) + 1);

        [pRed, pBlue].forEach((p) => {
          matchesPlayed.set(p.id, (matchesPlayed.get(p.id) || 0) + 1);
          const cv = courtVisits.get(p.id);
          if (cv) cv.set(courtName, (cv.get(courtName) || 0) + 1);
        });
      }

      const matchId = `op-uniq-${eventId}-r${currentRoundNum}-c${cIdx + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      generatedMatches.push({
        id: matchId,
        eventId,
        round: currentRoundNum,
        matchName: `Game ${generatedMatches.length + 1}`,
        courtName,
        gameType,
        targetPoints,
        status: 'scheduled',
        teamRed: { players: teamRedPlayers, score: 0 },
        teamBlue: { players: teamBluePlayers, score: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
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
    // Rests = totalRounds - matchesPlayed in this generated batch
    playerRestCounts[p.id] = Math.max(0, totalRounds - (matchesPlayed.get(p.id) || 0));
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

