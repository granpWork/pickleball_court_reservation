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
      className={`rounded-3xl border p-4 sm:p-5 transition-all shadow-lg flex flex-col justify-between space-y-4 ${
        m.status === 'completed'
          ? 'bg-slate-900/40 border-slate-800/90'
          : m.status === 'in_progress'
          ? 'bg-blue-950/20 border-blue-500/40 ring-1 ring-blue-500/30'
          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Card Header: Match Name, Round, Court Selector & Status */}
      <div className="flex items-center justify-between gap-2 text-xs pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black text-sm text-white flex items-center gap-1.5">
            🎮 {m.matchName || `Game ${m.round}`}
          </span>
          <span className="px-2.5 py-0.5 rounded-lg bg-purple-950/60 border border-purple-800/60 text-purple-300 font-extrabold text-[11px]">
            {roundTitle}
          </span>
          {m.wasReopened && (
            <span
              className="px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-300 font-extrabold text-[10px] flex items-center gap-1 shadow-sm"
              title="This match was reopened for score adjustment."
            >
              <RotateCcw className="w-3 h-3 text-amber-400" /> Reopened
            </span>
          )}
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {m.gameType} ({m.targetPoints} pts)
          </span>
        </div>

        {/* Inline Court Assignment Selector */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Building2 className="w-3.5 h-3.5 text-brand-lime" />
          <select
            value={m.courtName}
            onChange={(e) => onInlineCourtChange(m.id, e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 text-[11px] font-bold text-brand-lime cursor-pointer focus:outline-none focus:border-brand-lime"
          >
            {assignedCourts.map((c, i) => (
              <option key={i} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Card Body: Side-by-Side Teams with DUPR & Rate Pills */}
      <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-3 py-1">
        {/* Team Red (Left Side) */}
        <div className="md:col-span-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="text-[10px] font-black uppercase text-red-400 tracking-wider flex items-center gap-1">
              <span>Team Red</span>
              {m.winner === 'red' && <Trophy className="w-3.5 h-3.5 text-amber-400 inline" />}
            </div>
            <div className="space-y-2">
              {m.teamRed.players.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0 shadow-sm">
                    <img
                      src={p.photoUrl || `https://robohash.org/${encodeURIComponent(p.name)}?set=set4`}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate text-slate-100 flex items-center gap-1.5">
                      <span>{p.name}</span>
                      {p.type === 'guest' && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 font-bold uppercase">
                          Guest
                        </span>
                      )}
                    </div>
                    {(p.duprId || p.duprRating) && (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono mt-0.5 flex-wrap">
                        {p.duprId && (
                          <span className="bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.2 rounded text-cyan-300 font-bold">
                            ID: {p.duprId}
                          </span>
                        )}
                        {p.duprRating && (
                          <span className="bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.2 rounded text-amber-300 font-bold">
                            Rate: {p.duprRating}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team Red Score Controls */}
          <div className="flex items-center gap-1.5 shrink-0 bg-slate-950 border border-slate-800 p-1.5 rounded-xl self-start sm:self-center">
            <button
              type="button"
              disabled={m.status === 'completed'}
              onClick={() => onScoreDelta(m.id, 'red', -1)}
              className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center transition-all ${
                m.status === 'completed'
                  ? 'bg-slate-900/40 text-slate-600 cursor-not-allowed border border-slate-800/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer'
              }`}
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
              className={`w-12 text-center font-mono font-black text-xl bg-slate-900 border border-slate-700/80 rounded-lg py-0.5 focus:outline-none focus:border-brand-lime [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                m.status === 'completed' ? 'text-slate-400 opacity-60' : 'text-red-400'
              }`}
            />
            <button
              type="button"
              disabled={m.status === 'completed'}
              onClick={() => onScoreDelta(m.id, 'red', 1)}
              className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center transition-all ${
                m.status === 'completed'
                  ? 'bg-slate-900/40 text-slate-600 cursor-not-allowed border border-slate-800/40'
                  : 'bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-sm'
              }`}
            >
              +
            </button>
          </div>
        </div>

        {/* VS Divider Badge & Final Score Display */}
        <div className="md:col-span-1 flex flex-col items-center justify-center py-1 shrink-0 space-y-1">
          <span className="px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono font-black text-slate-400 uppercase tracking-widest shadow-inner">
            VS
          </span>
          {m.status === 'completed' && (
            <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/50 text-brand-lime font-mono font-black text-[10px] shadow-sm">
              Final: {m.teamRed.score} - {m.teamBlue.score}
            </span>
          )}
        </div>

        {/* Team Blue (Right Side) */}
        <div className="md:col-span-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1">
              <span>Team Blue</span>
              {m.winner === 'blue' && <Trophy className="w-3.5 h-3.5 text-amber-400 inline" />}
            </div>
            <div className="space-y-2">
              {m.teamBlue.players.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0 shadow-sm">
                    <img
                      src={p.photoUrl || `https://robohash.org/${encodeURIComponent(p.name)}?set=set4`}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate text-slate-100 flex items-center gap-1.5">
                      <span>{p.name}</span>
                      {p.type === 'guest' && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 font-bold uppercase">
                          Guest
                        </span>
                      )}
                    </div>
                    {(p.duprId || p.duprRating) && (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono mt-0.5 flex-wrap">
                        {p.duprId && (
                          <span className="bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.2 rounded text-cyan-300 font-bold">
                            ID: {p.duprId}
                          </span>
                        )}
                        {p.duprRating && (
                          <span className="bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.2 rounded text-amber-300 font-bold">
                            Rate: {p.duprRating}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team Blue Score Controls */}
          <div className="flex items-center gap-1.5 shrink-0 bg-slate-950 border border-slate-800 p-1.5 rounded-xl self-start sm:self-center">
            <button
              type="button"
              disabled={m.status === 'completed'}
              onClick={() => onScoreDelta(m.id, 'blue', -1)}
              className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center transition-all ${
                m.status === 'completed'
                  ? 'bg-slate-900/40 text-slate-600 cursor-not-allowed border border-slate-800/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer'
              }`}
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
              className={`w-12 text-center font-mono font-black text-xl bg-slate-900 border border-slate-700/80 rounded-lg py-0.5 focus:outline-none focus:border-brand-lime [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                m.status === 'completed' ? 'text-slate-400 opacity-60' : 'text-blue-400'
              }`}
            />
            <button
              type="button"
              disabled={m.status === 'completed'}
              onClick={() => onScoreDelta(m.id, 'blue', 1)}
              className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center transition-all ${
                m.status === 'completed'
                  ? 'bg-slate-900/40 text-slate-600 cursor-not-allowed border border-slate-800/40'
                  : 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-sm'
              }`}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80 text-xs flex-wrap">
        <div className="min-w-0 flex items-center gap-2">
          {m.status === 'completed' ? (
            <span className="text-brand-lime font-black text-[11px] flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/40 truncate shadow-inner">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-lime shrink-0" />
              <span>
                Completed • Final Score:{' '}
                <strong className="font-mono text-white text-xs font-black">
                  {m.teamRed.score} - {m.teamBlue.score}
                </strong>{' '}
                ({m.winner === 'red' ? 'Team Red Win' : m.winner === 'blue' ? 'Team Blue Win' : 'Tie Game'})
              </span>
            </span>
          ) : m.status === 'in_progress' ? (
            <span className="text-blue-300 font-black text-[11px] flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-950/60 border border-blue-500/40 shadow-sm animate-pulse">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping inline-block" />
              LIVE ONGOING ({m.teamRed.score} - {m.teamBlue.score})
            </span>
          ) : (
            <span className="text-slate-400 font-bold text-[11px] px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800">
              ⏳ Scheduled
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {m.status === 'scheduled' && (
            <button
              type="button"
              onClick={() => onStartMatch(m.id)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] flex items-center gap-1 shadow-sm transition-all cursor-pointer hover:scale-[1.02]"
              title="Mark match as active/ongoing on court"
            >
              ▶ Start Match
            </button>
          )}

          {m.status !== 'completed' ? (
            <button
              type="button"
              onClick={() => onCompleteMatch(m.id)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-[11px] flex items-center gap-1 shadow-sm transition-all cursor-pointer hover:scale-[1.02]"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-white" /> Complete
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onReopenMatch(m.id)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer border border-slate-700"
              title="Reopen match to edit score or resume play"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" /> Reopen Match
            </button>
          )}

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
    </div>
  );
};

