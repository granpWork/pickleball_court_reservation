import React, { useState, useMemo, useEffect } from 'react';
import {
  Zap,
  X,
  CheckCircle2,
  Award,
  Clock,
  Timer,
  HelpCircle,
  Sparkles,
  Trophy,
  Building2,
  Plus,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import type { OpenPlayMatch, OpenPlayMatchRosterItem } from '../../adminTypes';
import {
  calculateMaxUniqueDoublesRounds,
  calculateSessionRoundPacing,
  getPlayerEffectiveRating,
  isPlayerNR,
} from '../../../../utils/matchGeneratorUtils';
import { getDuprColorConfig } from '../../../../utils/duprColorUtils';

export type AutoGenAlgorithmType = 'unique_partner' | 'paddle_stacking' | 'random_rotational';

interface OpenPlayAutoGenModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignedCourts: string[];
  rosterPool: OpenPlayMatchRosterItem[];
  paddleRackQueue: OpenPlayMatchRosterItem[];
  initialSessionDurationMinutes: number;
  isDuprEvent?: boolean;
  existingMatches?: OpenPlayMatch[];
  onGenerateMatches: (
    algorithm: AutoGenAlgorithmType,
    rounds: number,
    gameType: 'doubles' | 'singles',
    targetPoints: number,
    isSmartMatch?: boolean,
    selectedCourts?: string[],
    onlyPresent?: boolean
  ) => void;
}

export const OpenPlayAutoGenModal: React.FC<OpenPlayAutoGenModalProps> = ({
  isOpen,
  onClose,
  assignedCourts,
  rosterPool,
  paddleRackQueue,
  initialSessionDurationMinutes,
  isDuprEvent = false,
  existingMatches = [],
  onGenerateMatches,
}) => {
  const [autoGenAlgorithm, setAutoGenAlgorithm] = useState<AutoGenAlgorithmType>('unique_partner');
  const [autoGenGameType, setAutoGenGameType] = useState<'doubles' | 'singles'>('doubles');
  const [autoGenTargetPoints, setAutoGenTargetPoints] = useState<number>(11);
  const [isSmartMatch, setIsSmartMatch] = useState<boolean>(() => Boolean(isDuprEvent));

  // Dynamic Court Selection state
  const [availableCourts, setAvailableCourts] = useState<string[]>(() => {
    return assignedCourts && assignedCourts.length > 0 ? assignedCourts : ['Court 1'];
  });
  const [selectedCourts, setSelectedCourts] = useState<string[]>(() => {
    return assignedCourts && assignedCourts.length > 0 ? assignedCourts : ['Court 1'];
  });
  const [newCourtName, setNewCourtName] = useState('');
  const [isAddingCourt, setIsAddingCourt] = useState(false);

  // Sync available & selected courts when assignedCourts or modal opens
  useEffect(() => {
    if (assignedCourts && assignedCourts.length > 0) {
      setAvailableCourts((prev) => Array.from(new Set([...assignedCourts, ...prev])));
      setSelectedCourts((prev) => {
        const valid = prev.filter((c) => assignedCourts.includes(c));
        return valid.length > 0 ? valid : assignedCourts;
      });
    }
  }, [assignedCourts, isOpen]);
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState<number>(
    initialSessionDurationMinutes > 0 ? initialSessionDurationMinutes : 240
  );
  // Default game pacing (minutes per match, e.g. 15 mins for standard 11-pt game with rotation)
  const [estGameDurationMinutes, setEstGameDurationMinutes] = useState<number>(15);
  const [autoGenRounds, setAutoGenRounds] = useState<number>(5);

  // Sync isSmartMatch if isDuprEvent changes
  useEffect(() => {
    if (isOpen && isDuprEvent !== undefined) {
      setIsSmartMatch(Boolean(isDuprEvent));
    }
  }, [isOpen, isDuprEvent]);

  // Attendance metrics: checked-in vs total active
  const { checkedInCount, totalActiveCount } = useMemo(() => {
    const activeFromPool = rosterPool.filter((p) => p.status === 'active');
    const checkedIn = activeFromPool.filter((p) => p.isPresent || p.attendanceStatus === 'present').length;
    return {
      checkedInCount: checkedIn,
      totalActiveCount: activeFromPool.length,
    };
  }, [rosterPool]);

  // Setting switch state: Include only checked-in players
  const [onlyCheckedInPlayers, setOnlyCheckedInPlayers] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('picklepoint_openplay_only_checkedin');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch (e) {}
    const activeFromPool = rosterPool.filter((p) => p.status === 'active');
    const checkedIn = activeFromPool.filter((p) => p.isPresent || p.attendanceStatus === 'present').length;
    return checkedIn >= 4;
  });

  // Keep localStorage updated when toggle changes
  const handleToggleCheckedInSwitch = (val: boolean) => {
    setOnlyCheckedInPlayers(val);
    try {
      localStorage.setItem('picklepoint_openplay_only_checkedin', String(val));
    } catch (e) {}
  };

  // Sync when modal opens
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('picklepoint_openplay_only_checkedin');
        if (saved !== null) {
          setOnlyCheckedInPlayers(saved === 'true');
          return;
        }
      } catch (e) {}
      const activeFromPool = rosterPool.filter((p) => p.status === 'active');
      const checkedIn = activeFromPool.filter((p) => p.isPresent || p.attendanceStatus === 'present').length;
      if (checkedIn >= 4) {
        setOnlyCheckedInPlayers(true);
      } else if (checkedIn === 0) {
        setOnlyCheckedInPlayers(false);
      }
    }
  }, [isOpen, rosterPool]);

  // Candidate players pool filtered strictly by setting switch
  const candidatePlayers = useMemo(() => {
    const base = paddleRackQueue.length > 0 ? paddleRackQueue : rosterPool;
    const activeFromPool = base.filter((p) => p.status === 'active');
    if (onlyCheckedInPlayers) {
      return activeFromPool.filter((p) => p.isPresent || p.attendanceStatus === 'present');
    }
    return activeFromPool;
  }, [rosterPool, paddleRackQueue, onlyCheckedInPlayers]);

  // Active Players count evaluated for match scheduling
  const activeCount = candidatePlayers.length;

  // Live DUPR Stats for candidate players
  const duprStats = useMemo(() => {
    const players = candidatePlayers;

    if (players.length === 0) {
      return { avgRating: '3.00', ratedCount: 0, nrCount: 0, allNR: true, tiers: [] };
    }

    const allNR = players.every(isPlayerNR);
    let rated = 0;
    let sum = 0;
    const playerRatings = players.map((p) => {
      const isNR = isPlayerNR(p);
      if (!isNR) rated++;
      const eff = getPlayerEffectiveRating(p, allNR);
      sum += eff;
      return { player: p, rating: eff, isNR };
    });

    playerRatings.sort((a, b) => b.rating - a.rating);
    const avgRating = (sum / players.length).toFixed(2);
    const nrCount = players.length - rated;

    // Build court tier previews for Round 1
    const courtTierBreakdown: { court: string; avg: string; range: string; composition: string }[] = [];
    const pPerMatch = autoGenGameType === 'doubles' ? 4 : 2;
    const totalCourts = Math.max(1, selectedCourts.length);
    const games = Math.ceil(players.length / pPerMatch);

    for (let i = 0; i < games; i++) {
      const slice = playerRatings.slice(i * pPerMatch, (i + 1) * pPerMatch);
      if (slice.length > 0) {
        const cAvg = (slice.reduce((acc, curr) => acc + curr.rating, 0) / slice.length).toFixed(2);
        const minR = slice[slice.length - 1].rating.toFixed(2);
        const maxR = slice[0].rating.toFixed(2);
        const cName =
          totalCourts === 1
            ? `${selectedCourts[0]} (Game ${i + 1})`
            : selectedCourts[i % totalCourts] || `Court ${(i % totalCourts) + 1}`;

        const ratedOnCourt = slice.filter((s) => !s.isNR).length;
        const nrOnCourt = slice.filter((s) => s.isNR).length;
        const composition =
          allNR
            ? 'All NR'
            : ratedOnCourt > 0 && nrOnCourt > 0
            ? `${ratedOnCourt} Rated • ${nrOnCourt} NR`
            : ratedOnCourt > 0
            ? `${ratedOnCourt} Rated`
            : `${nrOnCourt} NR`;

        courtTierBreakdown.push({
          court: cName,
          avg: cAvg,
          range: minR === maxR ? minR : `${minR} - ${maxR}`,
          composition,
        });
      }
    }

    return {
      avgRating,
      ratedCount: rated,
      nrCount,
      allNR,
      tiers: courtTierBreakdown,
    };
  }, [rosterPool, paddleRackQueue, autoGenGameType, selectedCourts]);

  const courtCount = Math.max(1, selectedCourts.length);
  const playersPerMatch = autoGenGameType === 'doubles' ? 4 : 2;

  // Dynamic Pacing Calculation:
  // 1 Round = all active players play once (gamesPerRound = ceil(N / P))
  // Time waves per round = ceil(gamesPerRound / availableCourts)
  const pacing = useMemo(() => {
    return calculateSessionRoundPacing(
      activeCount,
      courtCount,
      sessionDurationMinutes,
      estGameDurationMinutes,
      playersPerMatch
    );
  }, [activeCount, courtCount, sessionDurationMinutes, estGameDurationMinutes, playersPerMatch]);

  // Max simultaneous courts usable by active players during a time wave
  const maxCourtsInUse = useMemo(() => {
    return Math.max(1, Math.min(courtCount, pacing.gamesPerRound));
  }, [courtCount, pacing.gamesPerRound]);

  // Theoretical max unique partner rounds (each round gives 1 game per player)
  const maxUniqueRounds = useMemo(() => {
    return calculateMaxUniqueDoublesRounds(activeCount, courtCount);
  }, [activeCount, courtCount]);

  // Sync autoGenRounds whenever pacing.recommendedRounds changes
  useEffect(() => {
    setAutoGenRounds(pacing.recommendedRounds);
  }, [pacing.recommendedRounds]);

  // Derived metrics based on current autoGenRounds
  const scheduleBreakdown = useMemo(() => {
    const gamesPerRound = pacing.gamesPerRound;
    const totalMatches = autoGenRounds * gamesPerRound;
    // In a full-rotation round, every active player plays at least 1 game per round
    const avgGamesPerPlayer =
      activeCount > 0 ? (totalMatches * playersPerMatch) / activeCount : autoGenRounds;
    // Actual minutes allocated per round
    const actualMinutesPerRound = pacing.minutesPerRound;
    // Unique partners possible
    const maxUniquePartners = Math.max(1, activeCount - 1);

    return {
      gamesPerRound,
      timeWavesPerRound: pacing.timeWavesPerRound,
      totalMatches,
      avgGamesPerPlayer: Number(avgGamesPerPlayer.toFixed(1)),
      actualMinutesPerRound,
      maxUniquePartners,
    };
  }, [autoGenRounds, pacing, activeCount, playersPerMatch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel border border-slate-800 rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl space-y-6 text-left bg-slate-900 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                Auto-Generate Match Matrix
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime font-bold">
                  Smart Pacing Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Paced match generator with guaranteed unique partnerships & fair bench rotation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/60 transition-all cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Controls & Settings (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-5 text-xs">
            {/* Matchmaking Algorithm Selector */}
            <div>
              <label className="block text-slate-300 font-bold mb-1.5 flex items-center justify-between">
                <span>Matchmaking Algorithm</span>
                <span className="text-[10px] text-brand-lime font-mono font-semibold">Recommended</span>
              </label>
              <select
                value={autoGenAlgorithm}
                onChange={(e) => setAutoGenAlgorithm(e.target.value as AutoGenAlgorithmType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-brand-lime font-extrabold focus:outline-none focus:border-brand-lime cursor-pointer text-xs"
              >
                <option value="unique_partner">
                  ✨ Unique Partner Every Game (Rotating Doubles Round Robin)
                </option>
                <option value="paddle_stacking">
                  🏓 Paddle Stacking (Continuous Rack Queue - 1&4 vs 2&3 Split)
                </option>
                <option value="random_rotational">
                  🎲 Random Rotational Matrix
                </option>
              </select>
            </div>

            {/* Setting Switch Card: Include Checked-In Players Only */}
            <div
              className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                onlyCheckedInPlayers
                  ? 'bg-gradient-to-r from-emerald-950/30 via-slate-950 to-emerald-950/20 border-emerald-500/40 shadow-inner ring-1 ring-emerald-500/20'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      onlyCheckedInPlayers
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-white text-xs uppercase tracking-wide">
                        Attendance: Include Checked-In Players Only
                      </span>
                      {onlyCheckedInPlayers ? (
                        <span className="text-[10px] px-2 py-0.2 rounded-md bg-emerald-400/20 text-emerald-300 font-black border border-emerald-400/40 uppercase">
                          ACTIVE ({checkedInCount} Checked-In)
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.2 rounded-md bg-slate-800 text-slate-400 font-bold border border-slate-700">
                          OFF (All {totalActiveCount} Roster Players)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {onlyCheckedInPlayers
                        ? 'Strict attendance mode: Only schedule players marked as Present. Non-checked-in players are excluded.'
                        : 'Full roster mode: Schedule all active players in roster, even if not yet checked in.'}
                    </p>
                  </div>
                </div>

                {/* Custom Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={onlyCheckedInPlayers}
                  onClick={() => handleToggleCheckedInSwitch(!onlyCheckedInPlayers)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    onlyCheckedInPlayers ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                  title="Toggle Include Checked-In Players Only"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                      onlyCheckedInPlayers ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {onlyCheckedInPlayers && checkedInCount < (autoGenGameType === 'doubles' ? 4 : 2) && (
                <div className="pt-2 border-t border-emerald-500/20 flex items-center gap-2 text-[11px] text-amber-300 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    Only <strong>{checkedInCount}</strong> player(s) checked in. Need at least <strong>{autoGenGameType === 'doubles' ? 4 : 2}</strong> for {autoGenGameType}. Check in players in Roster Pool or turn this switch OFF.
                  </span>
                </div>
              )}
            </div>

            {/* DUPR Director: Smart Match Toggle Card */}
            <div
              className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                isSmartMatch
                  ? 'bg-gradient-to-r from-amber-950/30 via-slate-950 to-amber-950/20 border-amber-500/40 shadow-inner ring-1 ring-amber-500/20'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      isSmartMatch
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}
                  >
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-white text-xs uppercase tracking-wide">
                        DUPR Director: Smart Match
                      </span>
                      {isSmartMatch ? (
                        <span className="text-[10px] px-2 py-0.2 rounded-md bg-amber-400/20 text-amber-300 font-black border border-amber-400/40 uppercase">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.2 rounded-md bg-slate-800 text-slate-400 font-bold border border-slate-700">
                          OFF
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Match players based on available DUPR ratings with{' '}
                      <strong className="text-amber-300">1&4 vs 2&3</strong> team parity.
                    </p>
                  </div>
                </div>

                {/* Custom Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isSmartMatch}
                  onClick={() => setIsSmartMatch((prev) => !prev)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isSmartMatch ? 'bg-amber-400' : 'bg-slate-800'
                  }`}
                  title="Toggle DUPR Smart Match"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                      isSmartMatch ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {isSmartMatch && (
                <div className="pt-2 border-t border-amber-500/20 space-y-1.5 animate-fade-in">
                  <div className="flex items-center justify-between gap-2 text-[10px] text-amber-300/90 font-medium flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      {autoGenAlgorithm === 'unique_partner'
                        ? '100% Unique Partners + DUPR Rating Parity'
                        : 'Adjacent DUPR rating clustering on courts'}
                    </span>
                    <span className="font-mono bg-amber-950/50 px-2 py-0.5 rounded border border-amber-500/30 text-amber-200 font-bold">
                      Target Team Delta: &lt; 0.15 pts
                    </span>
                  </div>
                  {autoGenAlgorithm === 'unique_partner' && (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-200/90 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        <strong>Zero Duplicate Guarantee:</strong> Evaluates partner diversity across all rounds while matching 1&4 vs 2&3 rating balance.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Session Duration & Game Pacing Controls */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-brand-lime" />
                  <span className="font-extrabold text-white text-xs uppercase tracking-wide">
                    Session Duration & Game Pacing
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {sessionDurationMinutes} mins total ({Number((sessionDurationMinutes / 60).toFixed(1))} hrs)
                </span>
              </div>

              {/* Total Session Duration presets */}
              <div>
                <label className="block text-slate-400 font-bold mb-1.5">
                  1. Total Session Duration
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[120, 180, 240, 300].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setSessionDurationMinutes(mins)}
                      className={`py-2 px-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer text-xs ${
                        sessionDurationMinutes === mins
                          ? 'bg-brand-lime text-slate-950 border-brand-lime font-black shadow-md shadow-brand-lime/20'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {mins / 60} Hours
                      <span className="block text-[10px] opacity-75 font-normal">({mins}m)</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Average Minutes per Game presets (11 to 15 mins) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-400 font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-brand-lime" />
                    <span>2. Average Game Duration (incl. transition)</span>
                  </label>
                  <span className="font-mono text-brand-lime font-black text-xs">
                    {estGameDurationMinutes} mins / game
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {[11, 12, 13, 15, 20].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setEstGameDurationMinutes(mins)}
                      className={`py-1.5 px-1.5 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                        estGameDurationMinutes === mins
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 font-black ring-1 ring-emerald-400'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs">{mins}m</span>
                      <span className="block text-[9px] text-slate-500 font-normal">
                        {mins === 11 ? 'Fast' : mins === 15 ? 'Standard' : mins === 20 ? 'Relaxed' : 'Brisk'}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Pickleball games to 11 points typically take <strong>11–15 minutes</strong> including score call & court swap.
                </p>
              </div>

              {/* Rounds to Generate Selector */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-bold flex items-center gap-1.5">
                    <span>3. Full Player Rotation Rounds</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-lime/10 text-brand-lime font-mono">
                      Auto: {pacing.recommendedRounds} ({scheduleBreakdown.gamesPerRound} games/rnd)
                    </span>
                  </label>
                  <span className="text-xs font-mono font-black text-brand-lime">
                    {autoGenRounds} {autoGenRounds === 1 ? 'Round' : 'Rounds'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={Math.min(30, Math.max(20, pacing.recommendedRounds + 10))}
                    value={autoGenRounds}
                    onChange={(e) => setAutoGenRounds(parseInt(e.target.value, 10))}
                    className="w-full accent-brand-lime cursor-pointer"
                  />
                  <select
                    value={autoGenRounds}
                    onChange={(e) => setAutoGenRounds(parseInt(e.target.value, 10))}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-white font-mono font-bold focus:outline-none focus:border-brand-lime cursor-pointer text-xs shrink-0"
                  >
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((r) => (
                      <option key={r} value={r}>
                        {r} {r === 1 ? 'Round' : 'Rounds'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Assigned Courts & Game Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Game Mode</label>
                <select
                  value={autoGenGameType}
                  onChange={(e) => setAutoGenGameType(e.target.value as 'doubles' | 'singles')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-brand-lime cursor-pointer"
                >
                  <option value="doubles">Doubles (4 players/court)</option>
                  <option value="singles">Singles (2 players/court)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Target Points</label>
                <select
                  value={autoGenTargetPoints}
                  onChange={(e) => setAutoGenTargetPoints(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-brand-lime cursor-pointer"
                >
                  <option value={11}>11 Points (Standard Side-out)</option>
                  <option value={15}>15 Points (Rally Scoring)</option>
                  <option value={21}>21 Points</option>
                </select>
              </div>
            </div>

            {/* Dynamic Active Courts Selector */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <label className="text-slate-300 font-bold text-xs flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-brand-lime" />
                    <span>Select Courts for Match Matrix ({selectedCourts.length} Active)</span>
                  </label>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Choose 1 court or multiple courts. Match scheduling & waves adjust automatically.
                  </p>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (availableCourts.length > 0) {
                        setSelectedCourts([availableCourts[0]]);
                      }
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      selectedCourts.length === 1
                        ? 'bg-brand-lime text-slate-950 border-brand-lime font-black shadow-xs'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    1 Court Only
                  </button>
                  {availableCourts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCourts([...availableCourts])}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        selectedCourts.length === availableCourts.length
                          ? 'bg-brand-lime text-slate-950 border-brand-lime font-black shadow-xs'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      All Courts ({availableCourts.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Clickable Court Chips */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {availableCourts.map((court) => {
                  const isSelected = selectedCourts.includes(court);
                  return (
                    <button
                      key={court}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          // Prevent deselecting the only remaining court
                          if (selectedCourts.length > 1) {
                            setSelectedCourts(selectedCourts.filter((c) => c !== court));
                          }
                        } else {
                          setSelectedCourts([...selectedCourts, court]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-brand-lime/15 border-brand-lime text-brand-lime shadow-xs ring-1 ring-brand-lime/30'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${isSelected ? 'text-brand-lime' : 'opacity-20'}`}
                      />
                      <span>{court}</span>
                    </button>
                  );
                })}

                {/* Inline Add Custom Court */}
                {!isAddingCourt ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingCourt(true)}
                    className="px-2.5 py-1.5 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-brand-lime hover:border-brand-lime text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Court</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 animate-fade-in">
                    <input
                      type="text"
                      placeholder="e.g. Court 2"
                      value={newCourtName}
                      onChange={(e) => setNewCourtName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const trimmed = newCourtName.trim();
                          if (trimmed && !availableCourts.includes(trimmed)) {
                            setAvailableCourts([...availableCourts, trimmed]);
                            setSelectedCourts([...selectedCourts, trimmed]);
                            setNewCourtName('');
                            setIsAddingCourt(false);
                          }
                        } else if (e.key === 'Escape') {
                          setIsAddingCourt(false);
                        }
                      }}
                      autoFocus
                      className="bg-slate-900 border border-brand-lime text-white rounded-xl px-2.5 py-1 text-xs focus:outline-none w-28 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = newCourtName.trim();
                        if (trimmed && !availableCourts.includes(trimmed)) {
                          setAvailableCourts([...availableCourts, trimmed]);
                          setSelectedCourts([...selectedCourts, trimmed]);
                          setNewCourtName('');
                        }
                        setIsAddingCourt(false);
                      }}
                      className="px-2 py-1 rounded-lg bg-brand-lime text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCourtName('');
                        setIsAddingCourt(false);
                      }}
                      className="text-slate-400 hover:text-white p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {selectedCourts.length === 1 && (
                <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/30 text-purple-300 text-[11px] flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>
                    <strong>1 Court Active:</strong> All matches in each round will queue sequentially on <strong>{selectedCourts[0]}</strong> with {pacing.timeWavesPerRound} court time {pacing.timeWavesPerRound === 1 ? 'wave' : 'waves'}.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Real-Time Calculation & Pacing Breakdown (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-4 text-xs">
            {/* Live Calculation Summary Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-lime" />
                  Live Schedule Breakdown
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                    onlyCheckedInPlayers
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {activeCount} {onlyCheckedInPlayers ? 'Checked-In' : 'Active'} Players
                </span>
              </div>

              {/* 4 Core Computed KPI Boxes */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Total Rounds</span>
                  <span className="text-xl font-black text-brand-lime font-mono">
                    {autoGenRounds}
                  </span>
                  <span className="text-[9px] text-slate-500 block">
                    {scheduleBreakdown.actualMinutesPerRound}m per round
                  </span>
                </div>

                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Games / Round</span>
                  <span className="text-xl font-black text-amber-300 font-mono">
                    {scheduleBreakdown.gamesPerRound}
                  </span>
                  <span className="text-[9px] text-slate-500 block">
                    All {activeCount} players play 1x
                  </span>
                </div>

                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Total Games</span>
                  <span className="text-xl font-black text-white font-mono">
                    {scheduleBreakdown.totalMatches}
                  </span>
                  <span className="text-[9px] text-slate-500 block">
                    {autoGenRounds} rnds × {scheduleBreakdown.gamesPerRound} games
                  </span>
                </div>

                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 ring-1 ring-brand-lime/30">
                  <span className="text-[10px] text-brand-lime block font-bold uppercase">Games / Player</span>
                  <span className="text-xl font-black text-brand-lime font-mono">
                    ~{scheduleBreakdown.avgGamesPerPlayer}
                  </span>
                  <span className="text-[9px] text-slate-400 block">
                    1 game every round
                  </span>
                </div>
              </div>

              {/* Dynamic Court & Wave Formula Details */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Available Courts:</span>
                  <span className="font-bold text-white font-mono">
                    {courtCount} {courtCount === 1 ? 'Court' : 'Courts'} ({maxCourtsInUse} simultaneous)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Games per Round:</span>
                  <span className="font-bold text-brand-lime font-mono">
                    ⌈{activeCount} ÷ {playersPerMatch}⌉ = {scheduleBreakdown.gamesPerRound} games / round
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Court Time Waves:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    ⌈{scheduleBreakdown.gamesPerRound} ÷ {courtCount} {courtCount === 1 ? 'court' : 'courts'}⌉ = {scheduleBreakdown.timeWavesPerRound} {scheduleBreakdown.timeWavesPerRound === 1 ? 'wave' : 'waves'} ({scheduleBreakdown.actualMinutesPerRound}m/rnd)
                  </span>
                </div>
              </div>

              {/* DUPR Rating & Court Tier Breakdown Preview */}
              {isSmartMatch && (
                <div className="p-3.5 rounded-2xl bg-amber-950/25 border border-amber-500/35 space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      DUPR Court Tier Preview (Round 1)
                    </span>
                    {(() => {
                      const avgConfig = getDuprColorConfig(duprStats.avgRating);
                      return (
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${avgConfig.badgeClass}`}
                        >
                          Avg {duprStats.avgRating}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800 text-center">
                      <span className="text-[9px] text-slate-400 block font-semibold uppercase">Official DUPR</span>
                      <span className="text-sm font-black text-amber-300 font-mono">
                        {duprStats.ratedCount} {duprStats.ratedCount === 1 ? 'Player' : 'Players'}
                      </span>
                    </div>
                    <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800 text-center">
                      <span className="text-[9px] text-slate-400 block font-semibold uppercase">Unrated (NR)</span>
                      <span className="text-sm font-black text-amber-400 font-mono">
                        {duprStats.nrCount} {duprStats.nrCount === 1 ? 'Player' : 'Players'}
                      </span>
                    </div>
                  </div>

                  {duprStats.nrCount > 0 && (
                    <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[10px] text-amber-200/90 leading-relaxed flex items-start gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      {duprStats.ratedCount > 0 ? (
                        <span>
                          <strong>DUPR Anchor Calibration:</strong> {duprStats.nrCount} unrated (NR) {duprStats.nrCount === 1 ? 'player is' : 'players are'} matched alongside established rated anchor players of similar skill level.
                        </span>
                      ) : (
                        <span>
                          <strong>All Players Unrated (NR):</strong> With zero established rated anchors, all players initialize at DUPR standard baseline <strong>3.50</strong>.
                        </span>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {duprStats.tiers.map((t, idx) => {
                      const tierConfig = getDuprColorConfig(t.avg);
                      return (
                        <div
                          key={idx}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] flex items-center justify-between text-slate-300"
                        >
                          <div className="flex items-center gap-1.5 truncate min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tierConfig.dotClass}`}></span>
                            <span className="font-bold text-white truncate">{t.court}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800 font-mono shrink-0">
                              {t.composition}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[10px] shrink-0">
                            <span className="text-slate-400">Range: {t.range}</span>
                            <span className={`px-1.5 py-0.2 rounded font-bold border ${tierConfig.badgeClass}`}>
                              Avg {t.avg}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Unique Partner Guarantee Status */}
              {autoGenAlgorithm === 'unique_partner' && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-brand-lime flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" />
                      Partner Uniqueness
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                      {scheduleBreakdown.maxUniquePartners} Partners Possible
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    With <strong>{activeCount} players</strong>, each player can partner with up to{' '}
                    <strong>{scheduleBreakdown.maxUniquePartners} unique individuals</strong>.
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-300 pt-0.5 border-t border-emerald-500/20">
                    <span className="text-slate-400">100% Unique Round Limit:</span>
                    <span className="font-bold text-white font-mono">{maxUniqueRounds} rounds</span>
                  </div>

                  {scheduleBreakdown.avgGamesPerPlayer <= scheduleBreakdown.maxUniquePartners ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>100% Unique Partner Guarantee:</strong> Each player gets ~{scheduleBreakdown.avgGamesPerPlayer} games and will never repeat a partner during this session!
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-300 leading-relaxed flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>
                        At ~{scheduleBreakdown.avgGamesPerPlayer} games/player, each player will partner with everyone once ({scheduleBreakdown.maxUniquePartners} unique), then repeat partners minimally.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Prior Rounds Inspection & Duplicate Avoidance Badge */}
              {existingMatches && existingMatches.length > 0 ? (
                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 space-y-1.5 animate-fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      Prior Rounds Inspection Active
                    </span>
                    <span className="text-[10px] font-mono text-purple-200 bg-purple-500/20 px-2 py-0.5 rounded-full font-bold">
                      {existingMatches.length} Prior {existingMatches.length === 1 ? 'Game' : 'Games'}
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-200/90 leading-relaxed">
                    Analyzing <strong>{existingMatches.length} games</strong> across{' '}
                    <strong>{new Set(existingMatches.map((m) => m.round)).size} rounds</strong> to strictly prevent duplicate games, eliminate repeat foursomes, and guarantee unique player pairings.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-lime" />
                    Duplicate Protection Active
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Each generated round checks all prior rounds in this session to ensure no players play the exact same game twice.
                  </p>
                </div>
              )}

              {/* Algorithm summary callout */}
              <div className="text-[10px] text-slate-500 flex items-start gap-1.5 pt-1">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Tip:</strong> The generator distributes rest rounds evenly across players using fair bye rotation so no player sits out twice consecutively.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="font-mono text-brand-lime font-bold">
              {autoGenRounds} {autoGenRounds === 1 ? 'Round' : 'Rounds'}
            </span>
            <span>•</span>
            <span>{scheduleBreakdown.totalMatches} Matches</span>
            <span>•</span>
            <span>~{scheduleBreakdown.avgGamesPerPlayer} Games/Player</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={activeCount < (autoGenGameType === 'doubles' ? 4 : 2)}
              onClick={() =>
                onGenerateMatches(
                  autoGenAlgorithm,
                  autoGenRounds,
                  autoGenGameType,
                  autoGenTargetPoints,
                  isSmartMatch,
                  selectedCourts,
                  onlyCheckedInPlayers
                )
              }
              className={`px-5 py-2.5 rounded-xl font-black text-xs shadow-lg transition-all flex items-center gap-2 ${
                activeCount < (autoGenGameType === 'doubles' ? 4 : 2)
                  ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500 border border-slate-700'
                  : isSmartMatch
                  ? 'bg-gradient-to-r from-amber-400 via-lime-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-dark-bg cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-dark-bg cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isSmartMatch ? <Trophy className="w-4 h-4 text-dark-bg" /> : <Zap className="w-4 h-4 text-dark-bg" />}
              <span>{isSmartMatch ? `Smart DUPR Generate (${autoGenRounds} Rounds)` : `Generate ${autoGenRounds} Rounds Now`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
