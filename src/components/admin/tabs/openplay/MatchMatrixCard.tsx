import React from 'react';
import {
  Trophy,
  Building2,
  CheckCircle2,
  RotateCcw,
  Edit2,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import type { OpenPlayMatch } from '../../adminTypes';

interface MatchMatrixCardProps {
  match: OpenPlayMatch;
  assignedCourts: string[];
  roundTitle: string;
  onInlineCourtChange: (matchId: string, newCourt: string) => void;
  onStartMatch: (matchId: string) => void;
  onCompleteMatch: (matchId: string) => void;
  onReopenMatch: (matchId: string) => void;
  onScoreDelta: (matchId: string, team: 'red' | 'blue', delta: number) => void;
  onDirectScoreChange: (matchId: string, team: 'red' | 'blue', val: string) => void;
  onDownloadSingleCsv: (match: OpenPlayMatch) => void;
  onEditMatch: (match: OpenPlayMatch) => void;
  onDeleteMatch: (match: OpenPlayMatch) => void;
}

export const MatchMatrixCard: React.FC<MatchMatrixCardProps> = ({
  match: m,
  assignedCourts,
  roundTitle,
  onInlineCourtChange,
  onStartMatch,
  onCompleteMatch,
  onReopenMatch,
  onScoreDelta,
  onDirectScoreChange,
  onDownloadSingleCsv,
  onEditMatch,
  onDeleteMatch,
}) => {
  return (
    <div
      className={`@container min-w-0 overflow-hidden rounded-3xl border p-4 sm:p-5 transition-all shadow-lg flex flex-col justify-between gap-3.5 ${
        m.status === 'completed'
          ? 'bg-slate-900/40 border-slate-800/90'
          : m.status === 'in_progress'
          ? 'bg-blue-950/20 border-blue-500/40 ring-1 ring-blue-500/30'
          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Card Header: Match Name, Round, Court Selector & Status */}
      <div className="flex items-start justify-between gap-2 text-xs pb-3 border-b border-slate-800/80 min-w-0">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-sm text-white flex items-center gap-1.5 shrink-0">
              🎮 {m.matchName || `Game ${m.round}`}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-purple-950/60 border border-purple-800/60 text-purple-300 font-extrabold text-[10px] shrink-0">
              {roundTitle}
            </span>
            {m.wasReopened && (
              <span
                className="px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-300 font-extrabold text-[10px] flex items-center gap-1 shadow-sm shrink-0"
                title="This match was reopened for score adjustment."
              >
                <RotateCcw className="w-3 h-3 text-amber-400" /> Reopened
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {m.gameType} ({m.targetPoints} pts)
          </div>
        </div>

        {/* Inline Court Assignment Selector */}
        <div className="flex items-center gap-1.5 shrink-0 bg-slate-950/90 border border-slate-800 rounded-xl px-2.5 py-1">
          <Building2 className="w-3.5 h-3.5 text-brand-lime shrink-0" />
          <select
            value={m.courtName}
            onChange={(e) => onInlineCourtChange(m.id, e.target.value)}
            className="bg-transparent text-[11px] font-bold text-brand-lime cursor-pointer focus:outline-none"
          >
            {assignedCourts.map((c, i) => (
              <option key={i} value={c} className="bg-slate-950 text-white">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Card Body: Stacks vertically inside multi-column cards, switches to side-by-side only when card container >= 576px (@xl) */}
      <div className="grid grid-cols-1 @xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2.5 min-w-0">
        {/* Team Red */}
        <div
          className={`min-w-0 flex flex-col justify-between p-3 rounded-2xl border transition-all ${
            m.winner === 'red'
              ? 'bg-red-950/25 border-red-500/50 shadow-md shadow-red-500/10'
              : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700/80'
          }`}
        >
          {/* Header Row: Team Label + Winner Badge + Score Stepper */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60 gap-2 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/60 shrink-0" />
              <span className="text-xs font-black uppercase text-red-400 tracking-wider truncate">
                Team Red
              </span>
              {m.winner === 'red' && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[10px] flex items-center gap-0.5 shrink-0">
                  <Trophy className="w-3 h-3 text-amber-400" /> Win
                </span>
              )}
            </div>

            {/* Team Red Score Controls */}
            <div className="flex items-center gap-1 shrink-0 bg-slate-900 border border-slate-700/80 p-1 rounded-xl shadow-inner">
              <button
                type="button"
                disabled={m.status === 'completed'}
                onClick={() => onScoreDelta(m.id, 'red', -1)}
                className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center transition-all ${
                  m.status === 'completed'
                    ? 'bg-slate-900/40 text-slate-600 cursor-not-allowed border border-slate-800/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer'
                }`}
                title="Decrease Team Red Score"
              >
                -
              </button>
              <input
                type="number"
                min={0}
                max={99}
                inputMode="numeric"
                disabled={m.status === 'completed'}
                value={m.teamRed.score}
                onChange={(e) => onDirectScoreChange(m.id, 'red', e.target.value)}
                className={`w-9 text-center font-mono font-black text-base bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  m.status === 'completed' ? 'text-slate-400 opacity-60' : 'text-red-400'
                }`}
              />
              <button
                type="button"
                disabled={m.status === 'completed'}
                onClick={() => onScoreDelta(m.id, 'red', 1)}
                className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center transition-all ${
                  m.status === 'completed'
                    ? 'bg-slate-900/40 text-slate-600 cursor-not-allowed border border-slate-800/40'
                    : 'bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-sm'
                }`}
                title="Increase Team Red Score"
              >
                +
              </button>
            </div>
          </div>

          {/* Team Red Players List */}
          <div className="space-y-2 min-w-0">
            {m.teamRed.players.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-900/40 transition-colors min-w-0"
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0 shadow-sm ring-1 ring-slate-700/60">
                  <img
                    src={p.photoUrl || `https://robohash.org/${encodeURIComponent(p.name)}?set=set4`}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=ef4444&color=ffffff&bold=true`;
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 min-w-0">
                    <span className="truncate">{p.name}</span>
                    {p.type === 'guest' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40 font-bold uppercase shrink-0">
                        Guest
                      </span>
                    )}
                    {p.isDummy && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold shrink-0">
                        🧪 Test
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono mt-0.5 flex-wrap">
                    {(p.adminDuprId || p.duprId) && (
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold ${
                          p.adminDuprId
                            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                            : 'bg-cyan-950/60 border border-cyan-800/60 text-cyan-300'
                        }`}
                      >
                        ID: {p.adminDuprId || p.duprId}
                      </span>
                    )}
                    {(p.adminDuprRating || p.duprRating) && (
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold ${
                          p.adminDuprRating
                            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                            : 'bg-amber-950/60 border border-amber-800/60 text-amber-300'
                        }`}
                      >
                        Rate: {p.adminDuprRating || p.duprRating}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* VS Divider Badge & Final Score Display */}
        <div className="flex @xl:flex-col items-center justify-center gap-2 py-0.5 shrink-0">
          <div className="h-px flex-1 @xl:w-px @xl:h-6 bg-slate-800/80" />
          <span className="px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest shadow-inner">
            VS
          </span>
          {m.status === 'completed' && (
            <span className="px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-brand-lime font-mono font-black text-[10px] shadow-sm whitespace-nowrap">
              {m.teamRed.score} - {m.teamBlue.score}
            </span>
          )}
          <div className="h-px flex-1 @xl:w-px @xl:h-6 bg-slate-800/80" />
        </div>

        {/* Team Blue */}
        <div
          className={`min-w-0 flex flex-col justify-between p-3 rounded-2xl border transition-all ${
            m.winner === 'blue'
              ? 'bg-blue-950/25 border-blue-500/50 shadow-md shadow-blue-500/10'
              : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700/80'
          }`}
        >
          {/* Header Row: Team Label + Winner Badge + Score Stepper */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60 gap-2 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/60 shrink-0" />
              <span className="text-xs font-black uppercase text-blue-400 tracking-wider truncate">
                Team Blue
              </span>
              {m.winner === 'blue' && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[10px] flex items-center gap-0.5 shrink-0">
                  <Trophy className="w-3 h-3 text-amber-400" /> Win
                </span>
              )}
            </div>

            {/* Team Blue Score Controls */}
            <div className="flex items-center gap-1 shrink-0 bg-slate-900 border border-slate-700/80 p-1 rounded-xl shadow-inner">
              <button
                type="button"
                disabled={m.status === 'completed'}
                onClick={() => onScoreDelta(m.id, 'blue', -1)}
                className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center transition-all ${
                  m.status === 'completed'
                    ? 'bg-slate-900/40 text-slate-600 cursor-not-allowed border border-slate-800/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer'
                }`}
                title="Decrease Team Blue Score"
              >
                -
              </button>
              <input
                type="number"
                min={0}
                max={99}
                inputMode="numeric"
                disabled={m.status === 'completed'}
                value={m.teamBlue.score}
                onChange={(e) => onDirectScoreChange(m.id, 'blue', e.target.value)}
                className={`w-9 text-center font-mono font-black text-base bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  m.status === 'completed' ? 'text-slate-400 opacity-60' : 'text-blue-400'
                }`}
              />
              <button
                type="button"
                disabled={m.status === 'completed'}
                onClick={() => onScoreDelta(m.id, 'blue', 1)}
                className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center transition-all ${
                  m.status === 'completed'
                    ? 'bg-slate-900/40 text-slate-600 cursor-not-allowed border border-slate-800/40'
                    : 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-sm'
                }`}
                title="Increase Team Blue Score"
              >
                +
              </button>
            </div>
          </div>

          {/* Team Blue Players List */}
          <div className="space-y-2 min-w-0">
            {m.teamBlue.players.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-900/40 transition-colors min-w-0"
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0 shadow-sm ring-1 ring-slate-700/60">
                  <img
                    src={p.photoUrl || `https://robohash.org/${encodeURIComponent(p.name)}?set=set4`}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=3b82f6&color=ffffff&bold=true`;
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 min-w-0">
                    <span className="truncate">{p.name}</span>
                    {p.type === 'guest' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40 font-bold uppercase shrink-0">
                        Guest
                      </span>
                    )}
                    {p.isDummy && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold shrink-0">
                        🧪 Test
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono mt-0.5 flex-wrap">
                    {(p.adminDuprId || p.duprId) && (
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold ${
                          p.adminDuprId
                            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                            : 'bg-cyan-950/60 border border-cyan-800/60 text-cyan-300'
                        }`}
                      >
                        ID: {p.adminDuprId || p.duprId}
                      </span>
                    )}
                    {(p.adminDuprRating || p.duprRating) && (
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold ${
                          p.adminDuprRating
                            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                            : 'bg-amber-950/60 border border-amber-800/60 text-amber-300'
                        }`}
                      >
                        Rate: {p.adminDuprRating || p.duprRating}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="pt-3 border-t border-slate-800/80 text-xs space-y-2.5 min-w-0">
        {/* Top Footer Row: Status Badge + Secondary Utility Buttons (CSV, Edit, Delete) */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex items-center">
            {m.status === 'completed' ? (
              <span className="text-brand-lime font-black text-[11px] flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/40 truncate shadow-inner">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-lime shrink-0" />
                <span className="truncate">
                  Completed ({m.teamRed.score}-{m.teamBlue.score})
                </span>
              </span>
            ) : m.status === 'in_progress' ? (
              <span className="text-blue-300 font-black text-[11px] flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-950/60 border border-blue-500/40 shadow-sm animate-pulse truncate">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping inline-block shrink-0" />
                <span className="truncate">LIVE ({m.teamRed.score} - {m.teamBlue.score})</span>
              </span>
            ) : (
              <span className="text-slate-400 font-bold text-[11px] px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800">
                ⏳ Scheduled
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={m.status !== 'completed'}
              onClick={() => onDownloadSingleCsv(m)}
              className={`px-2.5 py-1.5 rounded-xl font-extrabold transition-all flex items-center gap-1 shadow-sm ${
                m.status === 'completed'
                  ? 'bg-emerald-950/40 border border-emerald-500/40 hover:bg-emerald-500 hover:text-dark-bg text-emerald-300 cursor-pointer'
                  : 'opacity-40 cursor-not-allowed bg-slate-900 border border-slate-800 text-slate-600 shadow-none'
              }`}
              title={
                m.status === 'completed'
                  ? `Generate CSV Match Result for ${m.matchName || `Game ${m.round}`}`
                  : 'CSV export is disabled until the match is marked as Completed'
              }
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-mono">CSV</span>
            </button>

            <button
              type="button"
              onClick={() => onEditMatch(m)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              title="Edit match details"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              disabled={m.status === 'completed'}
              onClick={() => onDeleteMatch(m)}
              className={`p-1.5 rounded-xl transition-all ${
                m.status === 'completed'
                  ? 'opacity-30 cursor-not-allowed bg-slate-900 border border-slate-800/40 text-slate-600 shadow-none'
                  : 'bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-300 cursor-pointer'
              }`}
              title={
                m.status === 'completed'
                  ? 'Completed matches cannot be deleted. Reopen the match first to delete.'
                  : 'Delete match'
              }
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Footer Row: Primary Match Progression Buttons */}
        <div className="flex items-center gap-2 min-w-0">
          {m.status === 'scheduled' && (
            <button
              type="button"
              onClick={() => onStartMatch(m.id)}
              className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Mark match as active/ongoing on court"
            >
              ▶ Start Match
            </button>
          )}

          {m.status !== 'completed' ? (
            <button
              type="button"
              onClick={() => onCompleteMatch(m.id)}
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" /> Complete
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onReopenMatch(m.id)}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-700"
              title="Reopen match to edit score or resume play"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Reopen Match
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

