import React, { useState } from 'react';
import {
  Flag,
  X,
  CheckCircle2,
  Clock,
  Trophy,
  AlertCircle,
} from 'lucide-react';
import type { OpenPlayMatch, OpenPlayMatchRosterItem, PlayerMatchStats } from '../../adminTypes';

export interface OpenPlayConcludeModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventName: string;
  matches: OpenPlayMatch[];
  rosterPool: OpenPlayMatchRosterItem[];
  playerStatsList?: PlayerMatchStats[];
  onConfirmConclude: (options: { markUnfinishedCompleted: boolean }) => void;
  isConcluding?: boolean;
}

export const OpenPlayConcludeModal: React.FC<OpenPlayConcludeModalProps> = ({
  isOpen,
  onClose,
  eventName,
  matches,
  playerStatsList = [],
  onConfirmConclude,
  isConcluding = false,
}) => {
  const [unfinishedOption, setUnfinishedOption] = useState<'mark_completed' | 'keep_as_is'>('mark_completed');

  if (!isOpen) return null;

  const totalMatches = matches.length;
  const completedMatches = matches.filter((m) => m.status === 'completed').length;
  const inProgressMatches = matches.filter((m) => m.status === 'in_progress').length;
  const scheduledMatches = matches.filter((m) => m.status === 'scheduled').length;
  const unfinishedCount = inProgressMatches + scheduledMatches;

  // Top 3 players on leaderboard for preview
  const topPlayers = [...(playerStatsList || [])]
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
      return b.winRate - a.winRate;
    })
    .slice(0, 3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmConclude({
      markUnfinishedCompleted: unfinishedOption === 'mark_completed',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in text-left">
      <div className="glass-panel border border-slate-800 rounded-2xl sm:rounded-3xl max-w-xl w-full shadow-2xl bg-slate-900 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800 bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Flag className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-white truncate">Conclude Open Play Session</h3>
              <p className="text-xs text-slate-400 font-medium truncate">{eventName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isConcluding}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Notice Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-medium leading-relaxed flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-amber-100 block font-bold">What happens when you conclude?</strong>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                The session will be marked as <strong>Completed / Concluded</strong>. The Match Matrix will switch to
                read-only mode, score editing and match generation will be closed, and public registration will end. You can reopen the session at any time.
              </p>
            </div>
          </div>

          {/* Session Overview Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center">
              <div className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Total Games</div>
              <div className="text-xl font-black text-white mt-0.5 font-mono">{totalMatches}</div>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-center">
              <div className="text-[10px] text-emerald-400 uppercase font-black tracking-wider flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Completed
              </div>
              <div className="text-xl font-black text-emerald-300 mt-0.5 font-mono">{completedMatches}</div>
            </div>
            <div className="p-3 rounded-2xl bg-blue-950/30 border border-blue-500/30 text-center">
              <div className="text-[10px] text-blue-400 uppercase font-black tracking-wider flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-blue-400" /> In Progress
              </div>
              <div className="text-xl font-black text-blue-300 mt-0.5 font-mono">{inProgressMatches}</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Scheduled</div>
              <div className="text-xl font-black text-slate-300 mt-0.5 font-mono">{scheduledMatches}</div>
            </div>
          </div>

          {/* Unfinished Matches Treatment (only if unfinished matches exist) */}
          {unfinishedCount > 0 && (
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Unfinished Games ({unfinishedCount}) Treatment</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Choose how to handle the {unfinishedCount} match(es) that are currently scheduled or in progress:
              </p>

              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all bg-slate-900 border-slate-800 hover:border-slate-700">
                  <input
                    type="radio"
                    name="unfinishedOption"
                    value="mark_completed"
                    checked={unfinishedOption === 'mark_completed'}
                    onChange={() => setUnfinishedOption('mark_completed')}
                    className="mt-0.5 text-brand-lime focus:ring-brand-lime"
                  />
                  <div className="min-w-0 flex-1 text-xs">
                    <span className="font-bold text-white block">Mark remaining matches as Completed</span>
                    <span className="text-[11px] text-slate-400 leading-normal block mt-0.5">
                      Sets their status to completed with current scores preserved so final DUPR CSV and stats count them.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all bg-slate-900 border-slate-800 hover:border-slate-700">
                  <input
                    type="radio"
                    name="unfinishedOption"
                    value="keep_as_is"
                    checked={unfinishedOption === 'keep_as_is'}
                    onChange={() => setUnfinishedOption('keep_as_is')}
                    className="mt-0.5 text-brand-lime focus:ring-brand-lime"
                  />
                  <div className="min-w-0 flex-1 text-xs">
                    <span className="font-bold text-white block">Keep unfinished match statuses as-is</span>
                    <span className="text-[11px] text-slate-400 leading-normal block mt-0.5">
                      Preserves scheduled and in-progress labels on unplayed games.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Top Leaderboard Preview */}
          {topPlayers.length > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-950/60 to-slate-900 border border-amber-500/30 space-y-2.5">
              <div className="text-xs font-black text-amber-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Final Leaderboard Podium Preview</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-bold">Top Standings</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {topPlayers.map((player, idx) => (
                  <div
                    key={player.playerId}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 ${
                      idx === 0
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
                        : idx === 1
                        ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                        : 'bg-amber-950/20 border-amber-800/40 text-amber-300/90'
                    }`}
                  >
                    <span className="text-base font-black shrink-0">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-xs truncate text-white">{player.playerName}</div>
                      <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                        <span className="font-bold text-brand-lime">{player.wins}W</span>
                        <span>{player.completedMatches}G</span>
                        <span className="text-slate-500">
                          {player.pointDiff >= 0 ? `+${player.pointDiff}` : player.pointDiff}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isConcluding}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer text-center disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isConcluding}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs transition-all shadow-lg hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isConcluding ? (
                <span>Concluding Session...</span>
              ) : (
                <>
                  <Flag className="w-4 h-4 fill-slate-950" />
                  <span>Confirm & Conclude Session</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
