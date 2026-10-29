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
  allowOverflowMatch?: boolean;
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
  playersPerMatch: number = 4,
  allowOverflowMatch: boolean = false
): SessionRoundPacing => {
  const safePlayers = Math.max(playersPerMatch, activePlayerCount);
  const safeCourts = Math.max(1, courtCount);
  const safeGameMins = Math.max(5, estGameDurationMinutes);
  const safeSessionMins = Math.max(safeGameMins, sessionDurationMinutes);

  // 1. Games required in 1 Round so active players rotate:
  // When allowOverflowMatch is true: ceil (extra overflow game with repeat fillers)
  // When allowOverflowMatch is false: floor (leftovers sit out this round and play next round)
  const gamesPerRound = allowOverflowMatch
    ? Math.max(1, Math.ceil(safePlayers / playersPerMatch))
    : Math.max(1, Math.floor(safePlayers / playersPerMatch));

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
    allowOverflowMatch = false,
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
  const totalRests = new Map<string, number>();
  const courtVisits = new Map<string, Map<string, number>>();

  // Track immediately preceding round recency
  const maxExistingRound = existingMatches.length > 0 ? Math.max(...existingMatches.map((m) => m.round)) : 0;
  const existingRounds = Array.from(new Set(existingMatches.map((m) => m.round))).sort((a, b) => a - b);
  const playerRoundsPlayed = new Map<string, Set<number>>();
  const lastRoundFoursomes = new Set<string>();
  const lastRoundPartners = new Set<string>();
  const lastRoundOpponents = new Set<string>();
  const lastRoundRepeaters = new Set<string>();

  // Initialize tracking maps for active players
  activePlayers.forEach((p) => {
    matchesPlayed.set(p.id, 0);
    consecutiveRests.set(p.id, 0);
    totalRests.set(p.id, 0);
    courtVisits.set(p.id, new Map());
    playerRoundsPlayed.set(p.id, new Set());
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

    // Counts & round participation
    allMatchPlayers.forEach((p) => {
      matchesPlayed.set(p.id, (matchesPlayed.get(p.id) || 0) + 1);
      playerRoundsPlayed.get(p.id)?.add(m.round);
      const cv = courtVisits.get(p.id);
      if (cv) {
        cv.set(m.courtName, (cv.get(m.courtName) || 0) + 1);
      }
    });
  });

  // Calculate prior consecutive rests and lifetime rests from existing matches
  if (existingRounds.length > 0) {
    activePlayers.forEach((p) => {
      const roundsPlayed = playerRoundsPlayed.get(p.id) || new Set();
      const restsCount = existingRounds.filter((r) => !roundsPlayed.has(r)).length;
      totalRests.set(p.id, restsCount);

      let streak = 0;
      for (let rIdx = existingRounds.length - 1; rIdx >= 0; rIdx--) {
        const r = existingRounds[rIdx];
        if (!roundsPlayed.has(r)) {
          streak++;
        } else {
          break;
        }
      }
      consecutiveRests.set(p.id, streak);
    });
  }

  const generatedMatches: OpenPlayMatch[] = [];
  let totalPairingsFormed = 0;
  let uniquePairingsFormed = 0;
  let repeatedPairingsFormed = 0;
  let globalCourtCounter = existingMatches.length;

  // Number of games per round
  const fullBatchGamesCount = Math.floor(activePlayers.length / playersPerMatch);
  const hasLeftoverPlayers = activePlayers.length % playersPerMatch !== 0;

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

  /**
   * Given 4 player IDs for a single doubles court, evaluates all 3 possible team splits:
   * - Split A (1&4 vs 2&3): [P1, P4] vs [P2, P3] (Peak DUPR Parity)
   * - Split B (1&3 vs 2&4): [P1, P3] vs [P2, P4] (Balanced Alternate)
   * - Split C (1&2 vs 3&4): [P1, P2] vs [P3, P4] (Tier Split)
   * Returns the optimal [red1, red2, blue1, blue2] ordering that enforces 1&4 vs 2&3 parity
   * while avoiding repeat partnerships and exact match repeats.
   */
  const arrangeFoursomeTeams = (fourIds: string[]): string[] => {
    if (fourIds.length !== 4) return fourIds;

    // Sort descending by effective DUPR rating: P1 >= P2 >= P3 >= P4
    const sorted = [...fourIds].sort((a, b) => {
      const pA = playerMap.get(a);
      const pB = playerMap.get(b);
      const rA = pA ? getPlayerEffectiveRating(pA, allPlayersNR) : 3.0;
      const rB = pB ? getPlayerEffectiveRating(pB, allPlayersNR) : 3.0;
      return rB - rA;
    });

    const [p1, p2, p3, p4] = sorted;
    const candidates: string[][] = [
      [p1, p4, p2, p3], // 0: 1&4 vs 2&3 (Peak Parity)
      [p1, p3, p2, p4], // 1: 1&3 vs 2&4 (Balanced Alternate)
      [p1, p2, p3, p4], // 2: 1&2 vs 3&4 (Top vs Bottom)
    ];

    let bestSplit = candidates[0];
    let bestSplitCost = Infinity;

    candidates.forEach((split, idx) => {
      const [r1, r2, b1, b2] = split;
      let splitCost = 0;

      // 1. Exact Matchup Repeat (150,000)
      const mKey = getMatchupKey([r1, r2], [b1, b2]);
      splitCost += (exactMatchCounts.get(mKey) || 0) * 150000;

      // 2. Partner Repeats (12,000 + 8,000 if back-to-back)
      const kRed = getPairKey(r1, r2);
      const kBlue = getPairKey(b1, b2);
      splitCost += (partnerCounts.get(kRed) || 0) * 12000;
      splitCost += (partnerCounts.get(kBlue) || 0) * 12000;
      if (lastRoundPartners.has(kRed)) splitCost += 8000;
      if (lastRoundPartners.has(kBlue)) splitCost += 8000;

      // 3. Opponent Repeats
      const opps = [
        getPairKey(r1, b1),
        getPairKey(r1, b2),
        getPairKey(r2, b1),
        getPairKey(r2, b2),
      ];
      opps.forEach((ok) => {
        splitCost += (opponentCounts.get(ok) || 0) * 200;
        if (lastRoundOpponents.has(ok)) splitCost += 1000;
      });

      // 4. DUPR Smart Match Parity & NR Anchor Calibration
      if (isSmartMatch) {
        const objR1 = playerMap.get(r1);
        const objR2 = playerMap.get(r2);
        const objB1 = playerMap.get(b1);
        const objB2 = playerMap.get(b2);

        if (objR1 && objR2 && objB1 && objB2) {
          const rateR1 = getPlayerEffectiveRating(objR1, allPlayersNR);
          const rateR2 = getPlayerEffectiveRating(objR2, allPlayersNR);
          const rateB1 = getPlayerEffectiveRating(objB1, allPlayersNR);
          const rateB2 = getPlayerEffectiveRating(objB2, allPlayersNR);

          const teamDelta = Math.abs((rateR1 + rateR2) - (rateB1 + rateB2));

          // Strong preference for 1&4 vs 2&3 parity (delta <= 0.15)
          splitCost += teamDelta * 35000;

          // Heavy barrier penalty if team rating delta exceeds 0.20 so we never allow blowouts
          if (teamDelta > 0.20) {
            splitCost += (teamDelta - 0.20) * 120000;
          }
          if (teamDelta > 0.35) {
            splitCost += 250000;
          }

          // Slight tie-breaker preference for canonical 1&4 vs 2&3
          if (idx === 0) splitCost -= 50;
          if (idx === 2 && teamDelta > 0.10) splitCost += 50000;

          // Official DUPR Rule #2: Anchor Pairing (1 Rated + 1 NR vs 1 Rated + 1 NR)
          if (!allPlayersNR) {
            const nrFlags = [objR1, objR2, objB1, objB2].map(isPlayerNR);
            const totalNR = nrFlags.filter(Boolean).length;
            if (totalNR === 2) {
              const redNR = (nrFlags[0] ? 1 : 0) + (nrFlags[1] ? 1 : 0);
              if (redNR !== 1) {
                // Penalize putting both NR players on the same team instead of anchoring each with a rated partner
                splitCost += 18000;
              }
            }
          }
        }
      }

      if (splitCost < bestSplitCost) {
        bestSplitCost = splitCost;
        bestSplit = split;
      }
    });

    return bestSplit;
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

        // 1. Exact Match Repeat (heaviest penalty: 150,000)
        const matchupKey = getMatchupKey([red1, red2], [blue1, blue2]);
        const exactRepeats = exactMatchCounts.get(matchupKey) || 0;
        if (exactRepeats > 0) {
          cost += exactRepeats * 150000;
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

        // 3. Heavy penalty for partner repeats (12,000 per repeat)
        const redPartnerKey = getPairKey(red1, red2);
        const redPartnerTimes = partnerCounts.get(redPartnerKey) || 0;
        if (redPartnerTimes > 0) {
          cost += redPartnerTimes * 12000;
        }
        if (lastRoundPartners.has(redPartnerKey)) {
          cost += 8000;
        }

        const bluePartnerKey = getPairKey(blue1, blue2);
        const bluePartnerTimes = partnerCounts.get(bluePartnerKey) || 0;
        if (bluePartnerTimes > 0) {
          cost += bluePartnerTimes * 12000;
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

            // High-priority parity penalty: enforces 1&4 vs 2&3 balance (delta <= 0.15)
            cost += teamDelta * 35000;
            if (teamDelta > 0.20) {
              cost += (teamDelta - 0.20) * 120000;
            }
            if (teamDelta > 0.35) {
              cost += 250000;
            }

            // Court tier clustering penalty: keep players of similar rating on the same court
            const courtSpread = Math.max(rR1, rR2, rB1, rB2) - Math.min(rR1, rR2, rB1, rB2);
            cost += courtSpread * 3500;
            if (courtSpread > 1.0) {
              cost += (courtSpread - 1.0) * 20000;
            }

            // DUPR Rule #2: Never isolate 4 NR players on a court if rated anchors exist
            if (!allPlayersNR) {
              const nrFlags = [pR1, pR2, pB1, pB2].map(isPlayerNR);
              const nrCountOnCourt = nrFlags.filter(Boolean).length;
              if (nrCountOnCourt === 4) {
                cost += 45000;
              } else if (nrCountOnCourt === 2) {
                const redNR = (nrFlags[0] ? 1 : 0) + (nrFlags[1] ? 1 : 0);
                if (redNR !== 1) {
                  cost += 18000;
                }
              }
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
            const delta = Math.abs(r1 - r2);
            cost += delta * 25000;
          }
        }
      }
    }
    return cost;
  };

  // Normalizes each 4-player court slice in `order` using `arrangeFoursomeTeams`
  const normalizeOrderFoursomes = (order: string[], numGames: number): string[] => {
    if (!isDoubles) return order;
    const normalized = [...order];
    for (let gIdx = 0; gIdx < numGames; gIdx++) {
      const base = gIdx * 4;
      const slice = normalized.slice(base, base + 4);
      if (slice.length === 4) {
        const bestTeams = arrangeFoursomeTeams(slice);
        normalized[base] = bestTeams[0];
        normalized[base + 1] = bestTeams[1];
        normalized[base + 2] = bestTeams[2];
        normalized[base + 3] = bestTeams[3];
      }
    }
    return normalized;
  };

  // Optimizes ordering of player IDs across `numGames` using rating-seeded + randomized hill-climbing
  const optimizePlayerArrangement = (playerIds: string[], numGames: number, baseCourtIdx: number): string[] => {
    // Seed 0: Rating-sorted tier clusters with 1&4 vs 2&3 parity
    const ratingSortedIds = [...playerIds].sort((a, b) => {
      const pA = playerMap.get(a);
      const pB = playerMap.get(b);
      const rA = pA ? getPlayerEffectiveRating(pA, allPlayersNR) : 3.0;
      const rB = pB ? getPlayerEffectiveRating(pB, allPlayersNR) : 3.0;
      return rB - rA;
    });

    let bestArrangement = normalizeOrderFoursomes(
      isSmartMatch ? ratingSortedIds : [...playerIds],
      numGames
    );
    let bestCost = computeBatchCost(bestArrangement, numGames, baseCourtIdx);
    if (bestCost <= 0) return bestArrangement;

    const RESTARTS = 80;
    const MAX_SWAPS = 100;

    for (let restart = 0; restart < RESTARTS; restart++) {
      const currentOrder =
        restart === 0
          ? [...ratingSortedIds]
          : [...playerIds].sort(() => Math.random() - 0.5);

      const normalizedInit = normalizeOrderFoursomes(currentOrder, numGames);
      for (let k = 0; k < normalizedInit.length; k++) currentOrder[k] = normalizedInit[k];

      let currentCost = computeBatchCost(currentOrder, numGames, baseCourtIdx);
      if (currentCost <= 0) {
        return currentOrder;
      }

      for (let swap = 0; swap < MAX_SWAPS; swap++) {
        const i = Math.floor(Math.random() * currentOrder.length);
        const j = Math.floor(Math.random() * currentOrder.length);
        if (i === j) continue;

        // If swapping within the same doubles court, arrangeFoursomeTeams already found the optimal split
        if (isDoubles && Math.floor(i / 4) === Math.floor(j / 4)) continue;

        const backup = [...currentOrder];
        const temp = currentOrder[i];
        currentOrder[i] = currentOrder[j];
        currentOrder[j] = temp;

        // Re-balance the two affected courts into optimal 1&4 vs 2&3 teams
        if (isDoubles) {
          const courtI = Math.floor(i / 4);
          const courtJ = Math.floor(j / 4);
          for (const cIdx of [courtI, courtJ]) {
            const base = cIdx * 4;
            const arranged = arrangeFoursomeTeams(currentOrder.slice(base, base + 4));
            currentOrder[base] = arranged[0];
            currentOrder[base + 1] = arranged[1];
            currentOrder[base + 2] = arranged[2];
            currentOrder[base + 3] = arranged[3];
          }
        }

        const newCost = computeBatchCost(currentOrder, numGames, baseCourtIdx);
        if (newCost < currentCost) {
          currentCost = newCost;
          if (currentCost <= 0) break;
        } else {
          for (let k = 0; k < backup.length; k++) currentOrder[k] = backup[k];
        }
      }

      if (currentCost < bestCost) {
        bestCost = currentCost;
        bestArrangement = [...currentOrder];
        if (bestCost <= 0) break;
      }
    }

    return normalizeOrderFoursomes(bestArrangement, numGames);
  };

  // Helper to generate combinations of size `k` from array `arr`
  const getCombinations = <T>(arr: T[], k: number): T[][] => {
    if (k <= 0) return [[]];
    if (arr.length < k) return [arr];
    const results: T[][] = [];
    const helper = (start: number, combo: T[]) => {
      if (combo.length === k) {
        results.push([...combo]);
        return;
      }
      for (let i = start; i <= arr.length - (k - combo.length); i++) {
        combo.push(arr[i]);
        helper(i + 1, combo);
        combo.pop();
      }
    };
    helper(0, []);
    return results;
  };

  for (let roundOffset = 0; roundOffset < totalRounds; roundOffset++) {
    const currentRoundNum = startingRound + roundOffset;

    // Reset last round tracking for newly simulated round
    lastRoundFoursomes.clear();
    lastRoundPartners.clear();
    lastRoundOpponents.clear();

    // Fair full-cycle rotation offset across all active players (coprime step-1 shift)
    const shiftOffset = (maxExistingRound + roundOffset) % activePlayers.length;
    const shiftedBase = [
      ...activePlayers.slice(shiftOffset),
      ...activePlayers.slice(0, shiftOffset),
    ];

    const indexInShifted = new Map<string, number>(shiftedBase.map((p, idx) => [p.id, idx]));

    // Case A: Exact multiple of playersPerMatch (e.g. 8, 12, 16 players)
    if (!hasLeftoverPlayers) {
      const optimizedPrimaryIds = optimizePlayerArrangement(
        shiftedBase.map((p) => p.id),
        fullBatchGamesCount,
        globalCourtCounter
      );

      for (let gIdx = 0; gIdx < fullBatchGamesCount; gIdx++) {
        const base = gIdx * playersPerMatch;
        const courtName =
          assignedCourts[globalCourtCounter % courtCount] || ('Court ' + ((globalCourtCounter % courtCount) + 1));
        globalCourtCounter++;

        commitMatchToRound(
          currentRoundNum,
          courtName,
          optimizedPrimaryIds.slice(base, base + playersPerMatch)
        );
      }
      activePlayers.forEach((p) => consecutiveRests.set(p.id, 0));
      continue;
    }

    // Case B1: Uneven Roster with Sit Out & Priority Next Round (allowOverflowMatch === false, Default)
    // Strict Quota: Leftover player(s) rest this round with guaranteed 100% priority next round.
    // Strictly enforces max 1-game difference across all players at all times.
    if (!allowOverflowMatch) {
      const primarySlots = fullBatchGamesCount * playersPerMatch;
      const sitOutCount = activePlayers.length - primarySlots;

      // 1. Filter out players who sat out in the immediately preceding round (100% immune from sitting out!)
      let eligibleSitOutCandidates = shiftedBase.filter(
        (p) => (consecutiveRests.get(p.id) || 0) === 0
      );

      // Defensive fallback if almost everyone sat out previously
      if (eligibleSitOutCandidates.length < sitOutCount) {
        eligibleSitOutCandidates = [...shiftedBase].sort(
          (a, b) => (consecutiveRests.get(a.id) || 0) - (consecutiveRests.get(b.id) || 0)
        );
      }

      // 2. Strict Tier Partitioning: players with the MOST games played MUST sit out first.
      // No player with fewer games is ever allowed to sit out while players with more games exist!
      const maxPlayed = Math.max(...eligibleSitOutCandidates.map((p) => matchesPlayed.get(p.id) || 0));
      const candidatesAtMax = eligibleSitOutCandidates.filter((p) => (matchesPlayed.get(p.id) || 0) === maxPlayed);
      const minRestsAtMax = Math.min(...candidatesAtMax.map((p) => totalRests.get(p.id) || 0));
      const topTier = candidatesAtMax
        .filter((p) => (totalRests.get(p.id) || 0) === minRestsAtMax)
        .sort((a, b) => (indexInShifted.get(a.id) || 0) - (indexInShifted.get(b.id) || 0));

      let sitOutCombos: string[][] = [];

      if (topTier.length >= sitOutCount) {
        // 100% of sit-out players come strictly from the top tier
        const topSubset = topTier.slice(0, Math.min(topTier.length, sitOutCount + 5));
        sitOutCombos = getCombinations(topSubset.map((p) => p.id), sitOutCount);
      } else {
        // All top-tier players are mandatory sit-outs; remaining spots filled from next tier
        const mandatorySitOutIds = topTier.map((p) => p.id);
        const remainingNeeded = sitOutCount - mandatorySitOutIds.length;
        const remainingCandidates = eligibleSitOutCandidates.filter((p) => !mandatorySitOutIds.includes(p.id));
        const nextMaxPlayed = Math.max(...remainingCandidates.map((p) => matchesPlayed.get(p.id) || 0));
        const nextTier = remainingCandidates
          .filter((p) => (matchesPlayed.get(p.id) || 0) === nextMaxPlayed)
          .sort((a, b) => (indexInShifted.get(a.id) || 0) - (indexInShifted.get(b.id) || 0));
        const nextSubset = nextTier.slice(0, Math.min(nextTier.length, remainingNeeded + 4));
        const nextCombos = getCombinations(nextSubset.map((p) => p.id), remainingNeeded);
        sitOutCombos = nextCombos.map((combo) => [...mandatorySitOutIds, ...combo]);
      }

      let bestPlayingIds: string[] = [];
      let bestBatchCost = Infinity;

      for (const sitIds of sitOutCombos) {
        const sitSet = new Set(sitIds);
        const candidatePlayingIds = shiftedBase.filter((p) => !sitSet.has(p.id)).map((p) => p.id);

        if (candidatePlayingIds.length !== primarySlots) continue;

        const seededOrder = normalizeOrderFoursomes(
          isSmartMatch
            ? [...candidatePlayingIds].sort((a, b) => {
                const pA = playerMap.get(a);
                const pB = playerMap.get(b);
                const rA = pA ? getPlayerEffectiveRating(pA, allPlayersNR) : 3.0;
                const rB = pB ? getPlayerEffectiveRating(pB, allPlayersNR) : 3.0;
                return rB - rA;
              })
            : [...candidatePlayingIds],
          fullBatchGamesCount
        );

        const cost = computeBatchCost(seededOrder, fullBatchGamesCount, globalCourtCounter);
        if (cost < bestBatchCost) {
          bestBatchCost = cost;
          bestPlayingIds = candidatePlayingIds;
        }
      }

      // Optimize and commit the games
      const finalPlayingIds =
        bestPlayingIds.length === primarySlots
          ? bestPlayingIds
          : shiftedBase.slice(0, primarySlots).map((p) => p.id);

      const optimizedPrimaryIds = optimizePlayerArrangement(
        finalPlayingIds,
        fullBatchGamesCount,
        globalCourtCounter
      );

      for (let gIdx = 0; gIdx < fullBatchGamesCount; gIdx++) {
        const base = gIdx * playersPerMatch;
        const courtName =
          assignedCourts[globalCourtCounter % courtCount] || ('Court ' + ((globalCourtCounter % courtCount) + 1));
        globalCourtCounter++;

        commitMatchToRound(
          currentRoundNum,
          courtName,
          optimizedPrimaryIds.slice(base, base + playersPerMatch)
        );
      }

      // Update rests and streak for this round
      const playingSet = new Set(optimizedPrimaryIds);
      activePlayers.forEach((p) => {
        if (playingSet.has(p.id)) {
          consecutiveRests.set(p.id, 0);
        } else {
          consecutiveRests.set(p.id, (consecutiveRests.get(p.id) || 0) + 1);
          totalRests.set(p.id, (totalRests.get(p.id) || 0) + 1);
        }
      });

      continue;
    }

    // Case B2: Uneven Roster with Sequential Wave Overflow Game (allowOverflowMatch === true)
    // Generates an extra match with repeat fillers so every player plays in this round.
    const primarySlots = fullBatchGamesCount * playersPerMatch;
    const leftoverCount = activePlayers.length - primarySlots;
    const neededFillCount = playersPerMatch - leftoverCount;

    // Sort players by fewest matchesPlayed ascending to identify who deserves the extra game in this round
    const sortedByMatches = [...shiftedBase].sort((a, b) => {
      const aM = matchesPlayed.get(a.id) || 0;
      const bM = matchesPlayed.get(b.id) || 0;
      if (aM !== bM) return aM - bM;
      return (indexInShifted.get(a.id) || 0) - (indexInShifted.get(b.id) || 0);
    });

    // Strict Tier Lock for Repeaters: players with fewest matches played MUST repeat first!
    const minPlayed = Math.min(...shiftedBase.map((p) => matchesPlayed.get(p.id) || 0));
    const lowestTier = shiftedBase
      .filter((p) => (matchesPlayed.get(p.id) || 0) === minPlayed)
      .sort((a, b) => (lastRoundRepeaters.has(a.id) ? 1 : 0) - (lastRoundRepeaters.has(b.id) ? 1 : 0));

    let repeaterCombos: string[][] = [];

    if (lowestTier.length >= neededFillCount) {
      const subset = lowestTier.slice(0, Math.min(lowestTier.length, neededFillCount + 5));
      repeaterCombos = getCombinations(subset.map((p) => p.id), neededFillCount);
    } else {
      const mandatoryRepeatIds = lowestTier.map((p) => p.id);
      const remainingNeeded = neededFillCount - mandatoryRepeatIds.length;
      const remainingPool = shiftedBase.filter((p) => !mandatoryRepeatIds.includes(p.id));
      const nextMinPlayed = Math.min(...remainingPool.map((p) => matchesPlayed.get(p.id) || 0));
      const nextTier = remainingPool
        .filter((p) => (matchesPlayed.get(p.id) || 0) === nextMinPlayed)
        .sort((a, b) => (lastRoundRepeaters.has(a.id) ? 1 : 0) - (lastRoundRepeaters.has(b.id) ? 1 : 0));
      const nextSubset = nextTier.slice(0, Math.min(nextTier.length, remainingNeeded + 4));
      const nextCombos = getCombinations(nextSubset.map((p) => p.id), remainingNeeded);
      repeaterCombos = nextCombos.map((c) => [...mandatoryRepeatIds, ...c]);
    }

    let bestWave1PrimaryIds: string[] = [];
    let bestWave2OverflowIds: string[] = [];
    let bestRoundTotalCost = Infinity;

    for (const repeatIds of repeaterCombos) {
      const repeatSet = new Set(repeatIds);
      // Players who play only 1 game in this round
      const singleGamePlayers = sortedByMatches.filter((p) => !repeatSet.has(p.id));

      // Among singleGamePlayers, `leftoverCount` players will play their 1 game in Wave 2 (Overflow Game)
      // Pick candidate single-game players closest in rating to the repeatIds so Wave 2 is skill-balanced
      const avgRepeatRating =
        repeatIds.reduce((sum, id) => {
          const pObj = playerMap.get(id);
          return sum + (pObj ? getPlayerEffectiveRating(pObj, allPlayersNR) : 3.0);
        }, 0) / repeatIds.length;

      const sortedSingleCandidates = [...singleGamePlayers].sort((a, b) => {
        if (isSmartMatch) {
          const rA = getPlayerEffectiveRating(a, allPlayersNR);
          const rB = getPlayerEffectiveRating(b, allPlayersNR);
          return Math.abs(rA - avgRepeatRating) - Math.abs(rB - avgRepeatRating);
        }
        return (indexInShifted.get(b.id) || 0) - (indexInShifted.get(a.id) || 0);
      });

      const leftoverCandidateSubset = sortedSingleCandidates.slice(
        0,
        Math.min(sortedSingleCandidates.length, Math.max(leftoverCount + 3, 5))
      );

      const leftoverCombos = getCombinations(
        leftoverCandidateSubset.map((p) => p.id),
        leftoverCount
      );

      for (const leftIds of leftoverCombos) {
        const overflowFoursome = [...leftIds, ...repeatIds];
        if (overflowFoursome.length !== playersPerMatch) continue;

        const arrangedOverflow = isDoubles
          ? arrangeFoursomeTeams(overflowFoursome)
          : overflowFoursome;

        const overflowCost = computeBatchCost(
          arrangedOverflow,
          1,
          globalCourtCounter + fullBatchGamesCount
        );

        // Quick estimate of Wave 1 (all players except `leftIds`)
        const leftSet = new Set(leftIds);
        const wave1PlayerIds = activePlayers
          .filter((p) => !leftSet.has(p.id))
          .map((p) => p.id);

        const wave1Seeded = normalizeOrderFoursomes(
          [...wave1PlayerIds].sort((a, b) => {
            const pA = playerMap.get(a);
            const pB = playerMap.get(b);
            const rA = pA ? getPlayerEffectiveRating(pA, allPlayersNR) : 3.0;
            const rB = pB ? getPlayerEffectiveRating(pB, allPlayersNR) : 3.0;
            return rB - rA;
          }),
          fullBatchGamesCount
        );

        const wave1QuickCost = computeBatchCost(
          wave1Seeded,
          fullBatchGamesCount,
          globalCourtCounter
        );

        const totalEstCost = overflowCost + wave1QuickCost;
        if (totalEstCost < bestRoundTotalCost) {
          bestRoundTotalCost = totalEstCost;
          bestWave1PrimaryIds = wave1PlayerIds;
          bestWave2OverflowIds = arrangedOverflow;
        }
      }
    }

    // Commit Wave 1 (Primary full games)
    if (fullBatchGamesCount > 0 && bestWave1PrimaryIds.length === primarySlots) {
      const optimizedPrimaryIds = optimizePlayerArrangement(
        bestWave1PrimaryIds,
        fullBatchGamesCount,
        globalCourtCounter
      );

      for (let gIdx = 0; gIdx < fullBatchGamesCount; gIdx++) {
        const base = gIdx * playersPerMatch;
        const courtName =
          assignedCourts[globalCourtCounter % courtCount] ||
          `Court ${(globalCourtCounter % courtCount) + 1}`;
        globalCourtCounter++;

        commitMatchToRound(
          currentRoundNum,
          courtName,
          optimizedPrimaryIds.slice(base, base + playersPerMatch)
        );
      }
    }

    // Commit Wave 2 (Overflow game, e.g. Game 3 for 9 or 10 players)
    if (bestWave2OverflowIds.length === playersPerMatch) {
      const finalOverflowIds = isDoubles
        ? arrangeFoursomeTeams(bestWave2OverflowIds)
        : bestWave2OverflowIds;
      const courtName =
        assignedCourts[globalCourtCounter % courtCount] ||
        `Court ${(globalCourtCounter % courtCount) + 1}`;
      globalCourtCounter++;

      commitMatchToRound(currentRoundNum, courtName, finalOverflowIds);
    }
    lastRoundRepeaters.clear();
    bestWave2OverflowIds.forEach((id) => lastRoundRepeaters.add(id));
    activePlayers.forEach((p) => {
      consecutiveRests.set(p.id, 0);
    });
  }

  const partnerUniquenessPercent =
    totalPairingsFormed > 0
      ? Math.round((uniquePairingsFormed / totalPairingsFormed) * 100)
      : 100;

  const playerMatchCounts: Record<string, number> = {};
  const playerRestCounts: Record<string, number> = {};

  activePlayers.forEach((p) => {
    playerMatchCounts[p.id] = matchesPlayed.get(p.id) || 0;
    playerRestCounts[p.id] = totalRests.get(p.id) || 0;
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
