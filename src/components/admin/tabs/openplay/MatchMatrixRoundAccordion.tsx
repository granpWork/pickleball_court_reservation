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
} from 'lucide-react';
import type { OpenPlayMatch } from '../../adminTypes';

interface MatchMatrixRoundAccordionProps {
  roundNum: number;
  roundTitle: string;
  matchesInRound: OpenPlayMatch[];
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
  children: React.ReactNode;
}

export const MatchMatrixRoundAccordion: React.FC<MatchMatrixRoundAccordionProps> = ({
  roundNum,
  roundTitle,
  matchesInRound,
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
  children,
}) => {
  return (
    <div className="border border-slate-800/80 bg-slate-950/40 rounded-3xl shadow-xl overflow-hidden transition-all space-y-0">
      {/* Accordion Header Bar */}
      <div
        onClick={() => onToggleCollapse(roundNum)}
        className="flex items-center justify-between p-4 sm:p-5 bg-slate-900/80 hover:bg-slate-900/95 transition-all cursor-pointer select-none flex-wrap gap-3 border-b border-slate-800/80"
      >
        <div className="flex items-center gap-3">
          {/* Chevron Expand/Collapse Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(roundNum);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
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
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={tempRoundTitle}
                onChange={(e) => onTempTitleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveTitle(roundNum);
                  if (e.key === 'Escape') onCancelEditTitle();
                }}
                className="bg-slate-950 border border-brand-lime/80 rounded-xl px-3 py-1 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-brand-lime shadow-inner"
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
            <div className="flex items-center gap-2.5 group">
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
                ({matchesInRound.length} {matchesInRound.length === 1 ? 'match' : 'matches'})
              </span>
            </div>
          )}
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onOpenResultsModal(roundNum)}
            className="py-1.5 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500 hover:text-dark-bg font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title={`Generate Match Results CSV for ${roundTitle}`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Generate Results</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenJsonModal(roundNum)}
            className="py-1.5 px-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-dark-bg font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title={`Upload JSON match data to ${roundTitle}`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload JSON</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenManualMatchModal(roundNum)}
            className="py-1.5 px-3.5 rounded-xl bg-brand-lime/15 border border-brand-lime/40 text-brand-lime hover:bg-brand-lime hover:text-dark-bg font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Match</span>
          </button>
        </div>
      </div>

      {/* Accordion Body Content */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5 space-y-4 animate-fade-in border-t border-slate-800/60">
          {matchesInRound.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
              <p className="text-xs text-slate-400">No matches created for {roundTitle} yet.</p>
              <button
                type="button"
                onClick={() => onOpenManualMatchModal(roundNum)}
                className="mt-2 text-xs font-bold text-brand-lime hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Create first match for {roundTitle}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">{children}</div>
          )}
        </div>
      )}
    </div>
  );
};

