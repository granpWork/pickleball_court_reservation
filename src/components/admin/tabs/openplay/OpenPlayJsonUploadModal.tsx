import React from 'react';
import { UploadCloud, X, Copy, Zap } from 'lucide-react';

export interface OpenPlayJsonUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  jsonTargetRound: number;
  setJsonTargetRound: (round: number) => void;
  allActiveRounds: number[];
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCopySampleJson: () => void;
  isCopySuccess: boolean;
  jsonInputText: string;
  setJsonInputText: (text: string) => void;
  jsonError: string | null;
  setJsonError: (err: string | null) => void;
  onProcessImportJson: () => void;
}

export const OpenPlayJsonUploadModal: React.FC<OpenPlayJsonUploadModalProps> = ({
  isOpen,
  onClose,
  jsonTargetRound,
  setJsonTargetRound,
  allActiveRounds,
  onFileUpload,
  onCopySampleJson,
  isCopySuccess,
  jsonInputText,
  setJsonInputText,
  jsonError,
  setJsonError,
  onProcessImportJson,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel border border-slate-800 rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl text-left bg-slate-900 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl sm:rounded-2xl bg-amber-950/60 border border-amber-800/60 text-amber-300 shrink-0">
              <UploadCloud className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-white truncate">Upload Matches via JSON Data</h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate sm:whitespace-normal">Import games directly into Round N from JSON file or text snippet</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
        {/* Target Round Selection & Import Mode Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 font-bold mb-1">Target Import Round</label>
            <select
              value={jsonTargetRound}
              onChange={(e) => setJsonTargetRound(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-brand-lime font-black focus:outline-none focus:border-brand-lime"
            >
              {Array.from({ length: Math.max(15, allActiveRounds.length + 2) }, (_, i) => i + 1).map((r) => (
                <option key={r} value={r}>
                  Import into Round {r} {allActiveRounds.includes(r) ? '(Active)' : '(New)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">Upload JSON File (.json)</label>
            <input
              type="file"
              accept=".json,application/json"
              onChange={onFileUpload}
              className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-amber-300 hover:file:bg-slate-700 cursor-pointer"
            />
          </div>
        </div>

        {/* JSON Textarea Input */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="text-slate-400 font-bold">Paste JSON Content</label>
            <button
              type="button"
              onClick={onCopySampleJson}
              className="text-[11px] font-bold text-brand-lime hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3 h-3 text-brand-lime" />
              <span>{isCopySuccess ? '✓ Sample Copied!' : '📋 Copy Sample JSON Template'}</span>
            </button>
          </div>
          <textarea
            rows={10}
            placeholder={`Paste match JSON here... e.g.\n[\n  {\n    "matchName": "Game 1",\n    "teamRed": [{ "name": "Tristan jude Osea", "dupr": "Q9MOO53", "rate": "" }],\n    "teamBlue": [{ "name": "Sergej Pons", "dupr": "VG6RP7", "rate": "3" }]\n  }\n]`}
            value={jsonInputText}
            onChange={(e) => {
              setJsonInputText(e.target.value);
              setJsonError(null);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-mono text-xs focus:outline-none focus:border-amber-400 leading-relaxed"
          />
        </div>

        {/* Validation Error Message */}
        {jsonError && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs font-semibold leading-relaxed flex items-start gap-2">
            <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>{jsonError}</div>
          </div>
        )}

        {/* Helper Info Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="font-bold text-amber-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Automated Importer Features:
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-slate-300">
            <li>
              Auto-assigns active session courts (<code className="text-brand-lime font-mono">Court 1</code>, <code className="text-brand-lime font-mono">Court 2</code>) sequentially.
            </li>
            <li>Matches player names with active roster and updates missing DUPR IDs & Ratings automatically.</li>
            <li>Auto-registers missing players as <strong>Guest Players</strong> so no match fails to load.</li>
          </ul>
        </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-800 bg-slate-950/90 shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-slate-800 sm:bg-transparent text-slate-400 hover:text-white text-xs font-bold cursor-pointer text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onProcessImportJson}
            className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-dark-bg font-extrabold text-xs cursor-pointer shadow-lg hover:scale-[1.02] transition-all flex items-center gap-1.5"
          >
            <UploadCloud className="w-4 h-4 text-dark-bg" />
            <span>Import Matches to Round {jsonTargetRound}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

