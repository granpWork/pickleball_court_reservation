import React from 'react';
import { FileSpreadsheet, X, Zap, Copy, CheckCircle2, Download } from 'lucide-react';
import { type OpenPlayMatch } from '../../adminTypes';

export interface OpenPlayResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  resultsTargetRound: number | 'all';
  setResultsTargetRound: (val: number | 'all') => void;
  matches: OpenPlayMatch[];
  allActiveRounds: number[];
  getRoundTitle: (r: number) => string;
  resultsEventName: string;
  setResultsEventName: (val: string) => void;
  resultsEventDate: string;
  setResultsEventDate: (val: string) => void;
  resultsLocation: string;
  setResultsLocation: (val: string) => void;
  resultsScoreType: 'SIDEOUT' | 'RALLY';
  setResultsScoreType: (val: 'SIDEOUT' | 'RALLY') => void;
  resultsIncludeOnlyCompleted: boolean;
  setResultsIncludeOnlyCompleted: (val: boolean) => void;
  generateMatchResultsCsv: (
    targetRound: number | 'all',
    eventName: string,
    eventDate: string,
    location: string,
    scoreType: 'SIDEOUT' | 'RALLY',
    onlyCompleted: boolean
  ) => string;
  onCopyCsvToClipboard: () => void;
  isResultsCopySuccess: boolean;
  onDownloadCsv: () => void;
}

export const OpenPlayResultsModal: React.FC<OpenPlayResultsModalProps> = ({
  isOpen,
  onClose,
  resultsTargetRound,
  setResultsTargetRound,
  matches,
  allActiveRounds,
  getRoundTitle,
  resultsEventName,
  setResultsEventName,
  resultsEventDate,
  setResultsEventDate,
  resultsLocation,
  setResultsLocation,
  resultsScoreType,
  setResultsScoreType,
  resultsIncludeOnlyCompleted,
  setResultsIncludeOnlyCompleted,
  generateMatchResultsCsv,
  onCopyCsvToClipboard,
  isResultsCopySuccess,
  onDownloadCsv,
}) => {
  if (!isOpen) return null;

  const targetList =
    resultsTargetRound === 'all'
      ? matches
      : matches.filter((m) => m.round === resultsTargetRound);
  const uncompletedCount = targetList.filter((m) => m.status !== 'completed').length;

  const rawCsvContent = generateMatchResultsCsv(
    resultsTargetRound,
    resultsEventName,
    resultsEventDate,
    resultsLocation,
    resultsScoreType,
    resultsIncludeOnlyCompleted
  );

  const rowCount = Math.max(0, rawCsvContent.split('\n').length - 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 text-left bg-slate-900 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-lg font-black text-white">Generate Match Results CSV</h3>
              <p className="text-xs text-slate-400">Export match scores & player DUPR IDs formatted for result uploads</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Form Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 font-bold mb-1">Export Target</label>
            <select
              value={resultsTargetRound}
              onChange={(e) => {
                const val = e.target.value;
                setResultsTargetRound(val === 'all' ? 'all' : parseInt(val, 10));
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-300 font-black focus:outline-none focus:border-emerald-400"
            >
              <option value="all">🌐 All Rounds ({matches.length} matches)</option>
              {allActiveRounds.map((r) => {
                const cnt = matches.filter((m) => m.round === r).length;
                return (
                  <option key={r} value={r}>
                    {getRoundTitle(r)} ({cnt} {cnt === 1 ? 'match' : 'matches'})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">Event Name</label>
            <input
              type="text"
              value={resultsEventName}
              onChange={(e) => setResultsEventName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-400"
              placeholder="e.g. Tuesday Night League"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">Match Date</label>
            <input
              type="date"
              value={resultsEventDate}
              onChange={(e) => setResultsEventDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">Location / Venue</label>
            <input
              type="text"
              value={resultsLocation}
              onChange={(e) => setResultsLocation(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-400"
              placeholder="e.g. Pickleball Court Location"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">Score Type</label>
            <select
              value={resultsScoreType}
              onChange={(e) => setResultsScoreType(e.target.value as 'SIDEOUT' | 'RALLY')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-400"
            >
              <option value="SIDEOUT">SIDEOUT (Standard)</option>
              <option value="RALLY">RALLY (Rally Scoring)</option>
            </select>
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer select-none text-emerald-300 font-bold">
              <input
                type="checkbox"
                checked={resultsIncludeOnlyCompleted}
                onChange={(e) => setResultsIncludeOnlyCompleted(e.target.checked)}
                className="w-4 h-4 rounded border-slate-800 text-emerald-500 focus:ring-emerald-400 bg-slate-950 cursor-pointer"
              />
              <span>Only Completed Matches (Recommended)</span>
            </label>
          </div>
        </div>

        {/* Excluded Matches Info Banner */}
        {uncompletedCount > 0 && resultsIncludeOnlyCompleted && (
          <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs font-semibold leading-relaxed flex items-center justify-between gap-2 shadow-inner">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Notice: <strong>{uncompletedCount}</strong> in-progress / scheduled{' '}
                {uncompletedCount === 1 ? 'match' : 'matches'} in this selection{' '}
                {uncompletedCount === 1 ? 'was' : 'were'} automatically excluded because only completed games are
                generated.
              </span>
            </div>
          </div>
        )}

        {/* CSV Raw Content Preview */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <label className="text-slate-400 font-bold flex items-center gap-1.5">
              <span>Generated CSV Output</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-800/80 text-emerald-300 font-mono text-[10px]">
                {rowCount} rows
              </span>
            </label>
            <button
              type="button"
              onClick={onCopyCsvToClipboard}
              className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{isResultsCopySuccess ? '✓ Copied!' : '📋 Copy Raw CSV'}</span>
            </button>
          </div>

          <textarea
            rows={7}
            readOnly
            value={rawCsvContent}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-emerald-300 font-mono text-[11px] focus:outline-none focus:border-emerald-400 leading-relaxed select-all"
          />
        </div>

        {/* Column Schema Verification Badge */}
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/90 text-[11px] text-slate-400 space-y-1">
          <div className="font-bold text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Required Column Template Verified:
          </div>
          <p className="text-slate-400 text-[10px] font-mono overflow-x-auto whitespace-nowrap">
            matchType, event, date, playerA1, playerA1DuprId, playerA1ExternalId, playerA2, playerA2DuprId, playerA2ExternalId, playerB1, playerB1DuprId, playerB1ExternalId, playerB2, playerB2DuprId, playerB2ExternalId, teamAGame1, teamBGame1, teamAGame2, teamBGame2, teamAGame3, teamBGame3, teamAGame4, teamBGame4, teamAGame5, teamBGame5, location, scoreType
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onCopyCsvToClipboard}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <Copy className="w-4 h-4 text-emerald-400" />
            <span>Copy to Clipboard</span>
          </button>
          <button
            type="button"
            onClick={onDownloadCsv}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-dark-bg font-extrabold text-xs cursor-pointer shadow-lg hover:scale-[1.02] transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-dark-bg" />
            <span>Download CSV File</span>
          </button>
        </div>
      </div>
    </div>
  );
};

