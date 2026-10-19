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
} from 'lucide-react';
import type { OpenPlayMatchRosterItem } from '../../adminTypes';
import {
  calculateMaxUniqueDoublesRounds,
  calculateSessionRoundPacing,
} from '../../../../utils/matchGeneratorUtils';

export type AutoGenAlgorithmType = 'unique_partner' | 'paddle_stacking' | 'random_rotational';

interface OpenPlayAutoGenModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignedCourts: string[];
  rosterPool: OpenPlayMatchRosterItem[];
  paddleRackQueue: OpenPlayMatchRosterItem[];
  initialSessionDurationMinutes: number;
  onGenerateMatches: (
    algorithm: AutoGenAlgorithmType,
    rounds: number,
    gameType: 'doubles' | 'singles',
    targetPoints: number
  ) => void;
}

export const OpenPlayAutoGenModal: React.FC<OpenPlayAutoGenModalProps> = ({
  isOpen,
  onClose,
  assignedCourts,
  rosterPool,
  paddleRackQueue,
  initialSessionDurationMinutes,
  onGenerateMatches,
}) => {
  const [autoGenAlgorithm, setAutoGenAlgorithm] = useState<AutoGenAlgorithmType>('unique_partner');
  const [autoGenGameType, setAutoGenGameType] = useState<'doubles' | 'singles'>('doubles');
  const [autoGenTargetPoints, setAutoGenTargetPoints] = useState<number>(11);
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState<number>(
    initialSessionDurationMinutes > 0 ? initialSessionDurationMinutes : 240
  );
  // Default game pacing (minutes per match, e.g. 15 mins for standard 11-pt game with rotation)
  const [estGameDurationMinutes, setEstGameDurationMinutes] = useState<number>(15);
  const [autoGenRounds, setAutoGenRounds] = useState<number>(5);

  // Active Players count
  const activeCount = useMemo(() => {
    const activeFromPool = rosterPool.filter((p) => p.status === 'active');
    return paddleRackQueue.length > 0
      ? paddleRackQueue.filter((p) => p.status === 'active').length
      : activeFromPool.length || 12;
  }, [rosterPool, paddleRackQueue]);

  const courtCount = Math.max(1, assignedCourts.length);
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

            {/* Assigned Courts Display */}
            <div>
              <label className="block text-slate-400 font-bold mb-1">
                Assigned Open Play Courts ({assignedCourts.length})
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {assignedCourts.map((c, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime font-bold text-xs"
                  >
                    {c}
                  </span>
                ))}
              </div>
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
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                  {activeCount} Active Players
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
              onClick={() =>
                onGenerateMatches(autoGenAlgorithm, autoGenRounds, autoGenGameType, autoGenTargetPoints)
              }
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-dark-bg font-black text-xs cursor-pointer shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-dark-bg" />
              <span>Generate {autoGenRounds} Rounds Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
