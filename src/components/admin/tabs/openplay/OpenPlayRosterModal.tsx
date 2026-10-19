import React from 'react';
import { Users, X, Zap } from 'lucide-react';
import { type OpenPlayMatchRosterItem } from '../../adminTypes';

export interface OpenPlayRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  absentCount: number;
  newPlayerName: string;
  setNewPlayerName: (val: string) => void;
  newPlayerDuprId: string;
  setNewPlayerDuprId: (val: string) => void;
  newPlayerSkill: string;
  setNewPlayerSkill: (val: string) => void;
  onAddCustomPlayer: () => void;
  rosterPool: OpenPlayMatchRosterItem[];
  onTogglePlayerStatus: (id: string) => void;
}

export const OpenPlayRosterModal: React.FC<OpenPlayRosterModalProps> = ({
  isOpen,
  onClose,
  absentCount,
  newPlayerName,
  setNewPlayerName,
  newPlayerDuprId,
  setNewPlayerDuprId,
  newPlayerSkill,
  setNewPlayerSkill,
  onAddCustomPlayer,
  rosterPool,
  onTogglePlayerStatus,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-left bg-slate-900 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-black text-white">Match Roster Pool Management</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Absent Player Alert Banner */}
        {absentCount > 0 && (
          <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs font-semibold leading-relaxed flex items-center justify-between gap-2 shadow-inner">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                ⚠️ <strong>{absentCount}</strong> player(s) marked Absent / Canceled. Use the form below to add replacement / walk-in players into the active roster pool.
              </span>
            </div>
          </div>
        )}

        {/* Quick Add Custom / Replacement Player */}
        <div className={`p-3.5 rounded-2xl border transition-all space-y-2 ${absentCount > 0 ? 'bg-amber-950/20 border-amber-500/70 ring-1 ring-amber-500/40' : 'bg-slate-950 border-slate-800'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span>+ Add Custom / Replacement Player</span>
              {absentCount > 0 && <span className="text-[10px] text-amber-400 font-extrabold animate-pulse">(Replacement Form Active)</span>}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <input
              type="text"
              placeholder="Player Name..."
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              className="flex-1 min-w-[120px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime"
            />
            <input
              type="text"
              placeholder="DUPR e.g. RGDK2E"
              value={newPlayerDuprId}
              onChange={(e) => setNewPlayerDuprId(e.target.value)}
              className="w-36 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400 uppercase"
            />
            <select
              value={newPlayerSkill}
              onChange={(e) => setNewPlayerSkill(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
            <button
              type="button"
              onClick={onAddCustomPlayer}
              className="px-3.5 py-1.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224] shrink-0 cursor-pointer shadow-md"
            >
              Add Player
            </button>
          </div>
        </div>

        {/* Roster Pool List */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
            Current Pool ({rosterPool.length} Total)
          </span>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {rosterPool.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                    <img
                      src={p.photoUrl || `https://robohash.org/${encodeURIComponent(p.name)}?set=set4`}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="truncate min-w-0">
                    <div className="font-bold text-white truncate flex items-center gap-1.5">
                      <span className="truncate">{p.name}</span>
                      {p.isDummy && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                          🧪 Test
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize flex items-center gap-1.5 flex-wrap">
                      <span>{p.type} • {p.skillLevel || 'Player'}</span>
                      {(p.adminDuprId || p.duprId) && (
                        <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded font-bold ${p.adminDuprId ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-brand-lime/10 text-brand-lime border border-brand-lime/30'}`}>
                          ⚡ DUPR: {p.adminDuprId || p.duprId} {p.adminDuprId ? '(Temp)' : ''}
                        </span>
                      )}
                      {(p.adminDuprRating || p.duprRating) && (
                        <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded font-bold ${p.adminDuprRating ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-brand-lime/10 text-brand-lime border border-brand-lime/30'}`}>
                          ⭐ RATE: {p.adminDuprRating || p.duprRating} {p.adminDuprRating ? '(Temp)' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onTogglePlayerStatus(p.id)}
                  className={`px-3 py-1 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                    p.status === 'active'
                      ? 'bg-brand-lime/10 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-dark-bg'
                      : p.status === 'resting'
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500 hover:text-dark-bg'
                      : 'bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white'
                  }`}
                  title="Click to toggle status: Active -> Resting -> Absent"
                >
                  {p.status === 'active' ? '🟢 Active / Present' : p.status === 'resting' ? '🟡 Bench / Resting' : '🔴 Absent / Canceled'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

