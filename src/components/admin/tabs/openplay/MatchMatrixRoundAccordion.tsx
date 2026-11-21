import React from 'react';
import {
  Trophy,
  ChevronRight,
  ChevronDown,
  Edit2,
  Check,
  X,
  FileSpreadsheet,
  UploadCloud,
  Plus,
  Trash2,
  Zap,
  Sparkles,
  RefreshCw,
  Clock,
  Lock,
} from 'lucide-react';
import type { OpenPlayMatch, OpenPlayMatchRosterItem } from '../../adminTypes';

const formatTimestamp12h = (isoStr?: string): string | null => {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

interface MatchMatrixRoundAccordionProps {
  roundNum: number;
  roundTitle: string;
  roundCreatedAt?: string;
  matchesInRound: OpenPlayMatch[];
  restingPlayers?: OpenPlayMatchRosterItem[];
  isCollapsed: boolean;
  isEditingTitle: boolean;
  tempRoundTitle: string;
  onToggleCollapse: (roundNum: number) => void;
  onStartEditTitle: (roundNum: number) => void;
  onSaveTitle: (roundNum: number) => void;
  onCancelEditTitle: () => void;
  onTempTitleChange: (val: string) => void;
  onOpenResultsModal: (roundNum: number) => void;
  onOpenJsonModal: (roundNum: number) => void;
  onOpenManualMatchModal: (roundNum: number) => void;
  onAutoGenerateRound?: (roundNum: number) => void;
  onAiGenerateRound?: (roundNum: number) => void;
  isAiConfigured?: boolean;
  isAiGenerating?: boolean;
  onDeleteRound?: (roundNum: number) => void;
  lockedPartners?: Record<string, string>;
  children: React.ReactNode;
}

export const MatchMatrixRoundAccordion: React.FC<MatchMatrixRoundAccordionProps> = ({
  roundNum,
  roundTitle,
  roundCreatedAt,
  matchesInRound,
  restingPlayers,
  isCollapsed,
  isEditingTitle,
  tempRoundTitle,
  onToggleCollapse,
  onStartEditTitle,
  onSaveTitle,
  onCancelEditTitle,
  onTempTitleChange,
  onOpenResultsModal,
  onOpenJsonModal,
  onOpenManualMatchModal,
  onAutoGenerateRound,
  onAiGenerateRound,
  isAiConfigured = false,
  isAiGenerating = false,
  onDeleteRound,
  lockedPartners,
  children,
}) => {
  // Count unique players participating in this round, completed games, and live ongoing games
  const { uniquePlayerCount, completedCount, liveCount } = React.useMemo(() => {
    const playerIds = new Set<string>();
    let completed = 0;
    let live = 0;
    for (const m of matchesInRound) {
      if (m.status === 'completed') completed++;
      if (m.status === 'in_progress') live++;
      for (const p of m.teamRed.players) playerIds.add(p.id);
      for (const p of m.teamBlue.players) playerIds.add(p.id);
    }
    return { uniquePlayerCount: playerIds.size, completedCount: completed, liveCount: live };
  }, [matchesInRound]);

  const formattedRoundCreatedAt = React.useMemo(() => formatTimestamp12h(roundCreatedAt), [roundCreatedAt]);

  // Sort resting players by check-in arrival time (earliest arrival first, unchecked-in last)
  const { sortedRestingPlayers, lateArrivalCount } = React.useMemo(() => {
    if (!restingPlayers || restingPlayers.length === 0) {
      return { sortedRestingPlayers: [] as OpenPlayMatchRosterItem[], lateArrivalCount: 0 };
    }
    const roundCreatedTs = roundCreatedAt ? new Date(roundCreatedAt).getTime() : NaN;
    let lateCount = 0;

    const copy = [...restingPlayers].sort((a, b) => {
      const aPresent = Boolean(a.isPresent || a.attendanceStatus === 'present');
      const bPresent = Boolean(b.isPresent || b.attendanceStatus === 'present');
      const aTs = aPresent && a.checkedInAt ? new Date(a.checkedInAt).getTime() : NaN;
      const bTs = bPresent && b.checkedInAt ? new Date(b.checkedInAt).getTime() : NaN;
      const aHasTime = !Number.isNaN(aTs);
      const bHasTime = !Number.isNaN(bTs);

      if (aHasTime && bHasTime && aTs !== bTs) return aTs - bTs;
      if (aHasTime !== bHasTime) return aHasTime ? -1 : 1;
      if (aPresent !== bPresent) return aPresent ? -1 : 1;
      return (a.name || '').localeCompare(b.name || '');
    });

    if (!Number.isNaN(roundCreatedTs)) {
      for (const rp of copy) {
        const isPresent = Boolean(rp.isPresent || rp.attendanceStatus === 'present');
        if (isPresent && rp.checkedInAt) {
          const checkedTs = new Date(rp.checkedInAt).getTime();
          if (!Number.isNaN(checkedTs) && checkedTs > roundCreatedTs) {
            lateCount++;
          }
        }
      }
    }

    return { sortedRestingPlayers: copy, lateArrivalCount: lateCount };
  }, [restingPlayers, roundCreatedAt]);

  return (
    <div
      className={`rounded-3xl shadow-xl overflow-hidden transition-all space-y-0 ${
        liveCount > 0
          ? 'border-2 border-blue-500/80 bg-blue-950/15 ring-2 ring-blue-500/30 shadow-blue-500/10'
          : 'border border-slate-800/80 bg-slate-950/40'
      }`}
    >
      {/* Accordion Header Bar */}
      <div
        onClick={() => onToggleCollapse(roundNum)}
        className={`flex flex-col lg:flex-row lg:items-center justify-between p-3.5 sm:p-5 bg-slate-900/80 hover:bg-slate-900/95 transition-all cursor-pointer select-none gap-3 ${
          isCollapsed ? '' : 'border-b border-slate-800/80'
        }`}
      >
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Chevron Expand/Collapse Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(roundNum);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer shrink-0 mt-0.5 sm:mt-0"
            title={isCollapsed ? 'Expand Round' : 'Collapse Round'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-brand-lime" />
            )}
          </button>

          {/* Round Title / Inline Renaming Input */}
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto min-w-0" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={tempRoundTitle}
                onChange={(e) => onTempTitleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveTitle(roundNum);
                  if (e.key === 'Escape') onCancelEditTitle();
                }}
                className="min-w-0 flex-1 sm:w-56 bg-slate-950 border border-brand-lime/80 rounded-xl px-3 py-1 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-brand-lime shadow-inner"
                placeholder={`Round ${roundNum}`}
                autoFocus
              />
              <button
                type="button"
                onClick={() => onSaveTitle(roundNum)}
                className="p-1.5 bg-brand-lime hover:bg-[#a6e224] text-dark-bg font-bold rounded-xl cursor-pointer shadow-sm"
                title="Save Round Title"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onCancelEditTitle}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl cursor-pointer"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 flex-wrap group">
              <span className="px-3.5 py-1 rounded-xl bg-purple-950/80 border border-purple-600/50 text-purple-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Trophy className="w-3.5 h-3.5 text-purple-400" /> {roundTitle}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEditTitle(roundNum);
                }}
                className="opacity-70 group-hover:opacity-100 p-1 text-slate-400 hover:text-brand-lime transition-all cursor-pointer rounded-lg hover:bg-slate-800"
                title="Rename Round Title"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <span className="text-xs text-slate-400 font-semibold">
                ({matchesInRound.length} {matchesInRound.length === 1 ? 'game' : 'games'}
                {uniquePlayerCount > 0 ? ` • ${uniquePlayerCount} players` : ''}
                {restingPlayers && restingPlayers.length > 0 ? ` • ${restingPlayers.length} resting` : ''})
              </span>

              {formattedRoundCreatedAt && (
                <span
                  className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] sm:text-[11px] font-bold flex items-center gap-1"
                  title={`Time when ${roundTitle} was created`}
                >
                  <Clock className="w-3 h-3 text-cyan-400" />
                  <span>{roundTitle} Created {formattedRoundCreatedAt}</span>
                </span>
              )}

              {matchesInRound.length > 0 && (
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    completedCount === matchesInRound.length
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700'
                  }`}
                >
                  {completedCount}/{matchesInRound.length} completed
                </span>
              )}

              {liveCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/60 text-blue-300 font-black text-[10px] sm:text-[11px] flex items-center gap-1.5 shadow-sm animate-pulse">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-90" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
                  </span>
                  <span>{liveCount} LIVE ON COURT</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Header Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-2 flex-wrap w-full lg:w-auto" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onOpenResultsModal(roundNum)}
            className="py-2 sm:py-1.5 px-2.5 sm:px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500 hover:text-dark-bg font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title={`Generate Match Results CSV for ${roundTitle}`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Generate Results</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenJsonModal(roundNum)}
            className="py-2 sm:py-1.5 px-2.5 sm:px-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-dark-bg font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title={`Upload JSON match data to ${roundTitle}`}
          >
            <UploadCloud className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Upload JSON</span>
          </button>

          {matchesInRound.length === 0 && isAiConfigured && onAiGenerateRound && (
            <button
              type="button"
              disabled={isAiGenerating}
              onClick={() => onAiGenerateRound(roundNum)}
              className="py-2 sm:py-1.5 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-500 to-brand-lime hover:from-purple-400 hover:to-brand-lime text-dark-bg font-black text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title={`Use Google Gemini AI to generate ${roundTitle} based on previous match results, DUPR ratings, and gameplay rules`}
            >
              {isAiGenerating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-dark-bg shrink-0" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-dark-bg shrink-0" />
              )}
              <span className="truncate">{isAiGenerating ? 'AI Generating...' : '✨ AI Auto-Gen'}</span>
            </button>
          )}

          {matchesInRound.length === 0 && onAutoGenerateRound && (
            <button
              type="button"
              disabled={isAiGenerating}
              onClick={() => onAutoGenerateRound(roundNum)}
              className="py-2 sm:py-1.5 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title={`Auto-generate matches for ${roundTitle} avoiding previous round duplicates`}
            >
              <Zap className="w-3.5 h-3.5 text-brand-lime shrink-0" />
              <span className="truncate">Auto-Gen Round</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenManualMatchModal(roundNum)}
            className="py-2 sm:py-1.5 px-2.5 sm:px-3.5 rounded-xl bg-brand-lime/15 border border-brand-lime/40 text-brand-lime hover:bg-brand-lime hover:text-dark-bg font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Add Match</span>
          </button>

          {onDeleteRound && (
            <button
              type="button"
              onClick={() => onDeleteRound(roundNum)}
              className="py-2 sm:py-1.5 px-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title={`Delete ${roundTitle}`}
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Delete Round</span>
            </button>
          )}
        </div>
      </div>

      {/* Accordion Body Content */}
      {!isCollapsed && (
        <div className="p-3.5 sm:p-5 animate-fade-in">
          {matchesInRound.length === 0 ? (
            <div className="p-5 sm:p-8 text-center border border-dashed border-slate-800 rounded-2xl sm:rounded-3xl bg-slate-900/20 space-y-3">
              <p className="text-xs sm:text-sm font-semibold text-slate-400">No matches created for {roundTitle} yet.</p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-2.5 flex-wrap">
                {isAiConfigured && onAiGenerateRound && (
                  <button
                    type="button"
                    disabled={isAiGenerating}
                    onClick={() => onAiGenerateRound(roundNum)}
                    className="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-500 to-brand-lime hover:from-purple-400 hover:to-brand-lime text-dark-bg font-black text-xs inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-md hover:scale-[1.02] disabled:opacity-50"
                    title={`Use Google Gemini AI to generate ${roundTitle} based on previous match results, DUPR ratings, and gameplay rules`}
                  >
                    {isAiGenerating ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-dark-bg shrink-0" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-dark-bg shrink-0" />
                    )}
                    <span>
                      {isAiGenerating
                        ? `🤖 Gemini AI Generating ${roundTitle}...`
                        : `✨ AI Auto-Generate ${roundTitle} (Prev Match + DUPR)`}
                    </span>
                  </button>
                )}
                {onAutoGenerateRound && (
                  <button
                    type="button"
                    disabled={isAiGenerating}
                    onClick={() => onAutoGenerateRound(roundNum)}
                    className="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-md hover:scale-[1.02] disabled:opacity-50"
                    title={`Auto-generate matches for ${roundTitle} avoiding previous round duplicates`}
                  >
                    <Zap className="w-3.5 h-3.5 text-brand-lime shrink-0" /> Auto-Generate {roundTitle} (No Duplicates)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenManualMatchModal(roundNum)}
                  className="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 rounded-xl bg-brand-lime/15 border border-brand-lime/40 text-brand-lime hover:bg-brand-lime hover:text-dark-bg font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" /> Create Match in {roundTitle}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenJsonModal(roundNum)}
                  className="w-full sm:w-auto justify-center px-3.5 py-2.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Upload JSON
                </button>
              </div>
            </div>
          ) : (
            <>
              {sortedRestingPlayers.length > 0 && (
                <div className="mb-4 p-3 sm:p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex flex-col gap-3 animate-fade-in shadow-inner">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 text-base">
                        🪑
                      </div>
                      <div>
                        <div className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-2 flex-wrap">
                          <span>Resting This Round ({sortedRestingPlayers.length})</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/40 uppercase">
                            ⚡ Priority Next Up
                          </span>
                          {formattedRoundCreatedAt && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 font-mono font-bold border border-cyan-500/30 flex items-center gap-1 normal-case">
                              <Clock className="w-3 h-3 text-cyan-400" />
                              <span>{roundTitle} Created {formattedRoundCreatedAt}</span>
                            </span>
                          )}
                          {lateArrivalCount > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-black border border-rose-500/40 uppercase">
                              ⏰ {lateArrivalCount} Arrived After {roundTitle}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-amber-200/80 mt-0.5">
                          {sortedRestingPlayers.length === 1
                            ? 'Ordered by arrival time. This player is sitting out this round and is guaranteed first priority in the next round.'
                            : 'Ordered by arrival time (earliest check-in first). These players are sitting out this round and prioritized for the next round.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {sortedRestingPlayers.map((rp) => {
                      const rating = rp.adminDuprRating || rp.duprRating;
                      const isCheckedIn = Boolean(rp.isPresent || rp.attendanceStatus === 'present');
                      const checkInTimeLabel = isCheckedIn ? formatTimestamp12h(rp.checkedInAt) : null;
                      const roundTs = roundCreatedAt ? new Date(roundCreatedAt).getTime() : NaN;
                      const playerTs = isCheckedIn && rp.checkedInAt ? new Date(rp.checkedInAt).getTime() : NaN;
                      const arrivedAfterRound = Boolean(
                        !Number.isNaN(roundTs) && !Number.isNaN(playerTs) && playerTs > roundTs
                      );

                      return (
                        <div
                          key={rp.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold text-white shadow-sm flex-wrap max-w-full min-w-0 ${
                            arrivedAfterRound
                              ? 'bg-rose-950/40 border-rose-500/50'
                              : 'bg-slate-900 border-amber-500/40'
                          }`}
                        >
                          <span className={`truncate max-w-[180px] sm:max-w-none ${arrivedAfterRound ? 'text-rose-200 font-black' : 'text-amber-400 font-black'}`}>
                            {rp.name}
                          </span>

                          {lockedPartners && lockedPartners[rp.id] && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono font-bold"
                              title="Locked Doubles Partner (resting as a pair)"
                            >
                              <Lock className="w-2.5 h-2.5 text-purple-400" />
                              <span>Locked</span>
                            </span>
                          )}

                          {rating && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                              {rating}
                            </span>
                          )}

                          {isCheckedIn ? (
                            checkInTimeLabel ? (
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-mono font-bold border ${
                                  arrivedAfterRound
                                    ? 'bg-rose-500/20 text-rose-200 border-rose-500/40'
                                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                                }`}
                                title={
                                  arrivedAfterRound
                                    ? `Checked in at ${checkInTimeLabel}, after ${roundTitle} was created (${formattedRoundCreatedAt})`
                                    : `Checked in at ${checkInTimeLabel}`
                                }
                              >
                                <Clock className="w-2.5 h-2.5 shrink-0" />
                                <span>
                                  {arrivedAfterRound ? `Arrived ${checkInTimeLabel}` : `Checked in ${checkInTimeLabel}`}
                                </span>
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 font-bold">
                                ✓ Checked In
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 border border-slate-700 font-semibold">
                              Not Checked In
                            </span>
                          )}

                          {arrivedAfterRound && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/40 font-black uppercase tracking-wider">
                              Late Arrival • After R{roundNum}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {children}
            </>
          )}
        </div>
      )}
    </div>
  );
};

