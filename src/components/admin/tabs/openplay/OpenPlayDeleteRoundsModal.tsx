import React from 'react';
import {
  Trash2,
  AlertTriangle,
  CheckSquare,
  Square,
  X,
  Trophy,
  RotateCcw,
} from 'lucide-react';
import type { OpenPlayMatch } from '../../adminTypes';

export interface OpenPlayDeleteRoundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rounds: number[];
  getRoundTitle: (roundNum: number) => string;
  matches: OpenPlayMatch[];
  selectedRounds: Set<number>;
  onToggleRound: (roundNum: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
}

export const OpenPlayDeleteRoundsModal: React.FC<OpenPlayDeleteRoundsModalProps> = ({
  isOpen,
  onClose,
  rounds,
  getRoundTitle,
  matches,
  selectedRounds,
  onToggleRound,
  onSelectAll,
  onDeselectAll,
  onConfirmDelete,
  isDeleting,
}) => {
  if (!isOpen) return null;

  const isAllSelected = rounds.length > 0 && selectedRounds.size === rounds.length;

  // Calculate statistics for selected rounds
  const { totalSelectedMatches, completedSelectedMatches } = React.useMemo(() => {
    let total = 0;
    let completed = 0;
    for (const m of matches) {
      if (selectedRounds.has(m.round)) {
        total++;
        if (m.status === 'completed') completed++;
      }
    }
    return {
      totalSelectedMatches: total,
      completedSelectedMatches: completed,
    };
  }, [matches, selectedRounds]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in text-left">
      <div className="glass-panel border border-slate-800 rounded-2xl sm:rounded-3xl max-w-xl w-full shadow-2xl bg-slate-900 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-950/90 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-white truncate">Delete Multiple Rounds</h3>
              <p className="text-[11px] text-slate-400 font-medium line-clamp-2 sm:line-clamp-none">
                Select one or more rounds to delete them and all associated matches.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
        {/* Quick Selection Bar */}
        <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs flex-wrap">
          <button
            type="button"
            onClick={isAllSelected ? onDeselectAll : onSelectAll}
            className="flex items-center gap-2 font-bold text-slate-300 hover:text-white transition-colors cursor-pointer select-none"
          >
            {isAllSelected ? (
              <CheckSquare className="w-4 h-4 text-rose-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-500" />
            )}
            <span>{isAllSelected ? 'Deselect All' : `Select All (${rounds.length} rounds)`}</span>
          </button>

          <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
            {selectedRounds.size} of {rounds.length} selected
          </span>
        </div>

        {/* Round Items */}
        <div className="space-y-2.5">
          {rounds.map((roundNum) => {
            const isSelected = selectedRounds.has(roundNum);
            const matchesInThisRound = matches.filter((m) => m.round === roundNum);
            const completedInThisRound = matchesInThisRound.filter((m) => m.status === 'completed').length;
            const roundTitle = getRoundTitle(roundNum);

            return (
              <div
                key={roundNum}
                onClick={() => onToggleRound(roundNum)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                  isSelected
                    ? 'bg-rose-500/10 border-rose-500/60 shadow-md shadow-rose-500/5 ring-1 ring-rose-500/20'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-rose-500 border-rose-500 text-white'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-white flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-purple-400" />
                        {roundTitle}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {matchesInThisRound.length === 0
                        ? 'Empty round (0 games)'
                        : `${matchesInThisRound.length} ${matchesInThisRound.length === 1 ? 'game' : 'games'}`}
                      {completedInThisRound > 0 && ` • ${completedInThisRound} completed`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {matchesInThisRound.length > 0 ? (
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        completedInThisRound === matchesInThisRound.length
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {completedInThisRound}/{matchesInThisRound.length} Done
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800">
                      Empty
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Warning Alert if rounds selected */}
        {selectedRounds.size > 0 && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1 flex-shrink-0 animate-fade-in">
            <div className="font-bold flex items-center gap-1.5 text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Permanent Deletion Warning</span>
            </div>
            <p className="text-[11px] text-rose-300/90 leading-relaxed pl-5.5">
              Deleting <strong>{selectedRounds.size} round(s)</strong> will permanently delete{' '}
              <strong>{totalSelectedMatches} scheduled match(es)</strong> from this session and the database.
              {completedSelectedMatches > 0 && (
                <span className="block text-amber-300 mt-1">
                  ⚠️ Note: Includes {completedSelectedMatches} completed match scores and umpire records.
                </span>
              )}
            </p>
          </div>
        )}
        </div>

        {/* Sticky Actions Footer */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-800 bg-slate-950/90 flex-shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-slate-800 sm:bg-transparent text-slate-400 hover:text-white text-xs font-bold cursor-pointer transition-colors text-center"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={selectedRounds.size === 0 || isDeleting}
            onClick={onConfirmDelete}
            className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-40 text-white font-black text-xs cursor-pointer shadow-lg shadow-rose-600/20 flex items-center gap-2 transition-all"
          >
            {isDeleting ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Deleting Rounds...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>
                  Delete {selectedRounds.size} {selectedRounds.size === 1 ? 'Round' : 'Rounds'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

