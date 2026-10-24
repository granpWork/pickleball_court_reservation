import React, { useState, useMemo } from 'react';
import {
  Users,
  X,
  Zap,
  Plus,
  Search,
  User,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Edit2,
  Star,
  Check,
} from 'lucide-react';
import { type OpenPlayMatchRosterItem } from '../../adminTypes';
import { isPlayerNR, getPlayerEffectiveRating } from '../../../../utils/matchGeneratorUtils';

export interface OpenPlayRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  maxParticipants?: number;
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
  onDeletePlayer?: (id: string) => void;
  onUpdatePlayer?: (updated: OpenPlayMatchRosterItem) => void;
}

export const OpenPlayRosterModal: React.FC<OpenPlayRosterModalProps> = ({
  isOpen,
  onClose,
  maxParticipants,
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
  onDeletePlayer,
  onUpdatePlayer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'resting' | 'absent'>('all');
  const [playerToDelete, setPlayerToDelete] = useState<OpenPlayMatchRosterItem | null>(null);

  // Edit player states
  const [editingPlayer, setEditingPlayer] = useState<OpenPlayMatchRosterItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDuprId, setEditDuprId] = useState('');
  const [editDuprRating, setEditDuprRating] = useState('');
  const [editSkillLevel, setEditSkillLevel] = useState('Intermediate');
  const [editStatus, setEditStatus] = useState<'active' | 'resting' | 'absent'>('active');

  const handleOpenEdit = (p: OpenPlayMatchRosterItem) => {
    setEditingPlayer(p);
    setEditName(p.name);
    setEditDuprId(p.adminDuprId || p.duprId || '');
    setEditDuprRating(p.adminDuprRating || p.duprRating || '');
    setEditSkillLevel(p.skillLevel || 'Intermediate');
    setEditStatus(p.status || 'active');
  };

  const handleSaveEdit = () => {
    if (!editingPlayer || !editName.trim()) return;
    const cleanDuprId = editDuprId.trim().toUpperCase() || undefined;
    const cleanDuprRating = editDuprRating.trim() || undefined;
    const updatedItem: OpenPlayMatchRosterItem = {
      ...editingPlayer,
      name: editName.trim(),
      adminDuprId: cleanDuprId,
      duprId: cleanDuprId,
      adminDuprRating: cleanDuprRating,
      duprRating: cleanDuprRating,
      skillLevel: editSkillLevel,
      status: editStatus,
    };
    onUpdatePlayer?.(updatedItem);
    setEditingPlayer(null);
  };

  const isMaxCapacityReached = Boolean(maxParticipants && rosterPool.length >= maxParticipants);

  // Compute counts
  const { activeCount, restingCount } = useMemo(() => {
    let active = 0;
    let resting = 0;
    for (const p of rosterPool) {
      if (p.status === 'active') active++;
      else if (p.status === 'resting') resting++;
    }
    return { activeCount: active, restingCount: resting };
  }, [rosterPool]);

  // Filter roster items
  const filteredRoster = useMemo(() => {
    return rosterPool.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.duprId || '').toLowerCase().includes(q) ||
        (p.adminDuprId || '').toLowerCase().includes(q);

      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [rosterPool, searchQuery, filterStatus]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in text-left">
      <div className="glass-panel border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 bg-slate-900 my-8 max-h-[90vh] flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">Match Roster Pool Management</h3>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-lg border font-bold ${
                    isMaxCapacityReached
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  }`}
                >
                  {rosterPool.length} {maxParticipants ? `/ ${maxParticipants}` : ''} {rosterPool.length === 1 ? 'Player' : 'Players'}
                  {isMaxCapacityReached && ' • MAX CAPACITY'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Manage player pool, bench resting players, mark absentees, and add walk-in replacements.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Absent Alert Banner if players are absent */}
        {absentCount > 0 && (
          <div className="p-3.5 rounded-2xl bg-red-950/30 border border-red-800/60 text-red-200 text-xs font-medium leading-relaxed flex items-center justify-between gap-3 shadow-inner flex-shrink-0 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                <strong>{absentCount}</strong> player(s) marked Absent / Canceled. Add walk-in replacement players below to keep court matches balanced.
              </span>
            </div>
          </div>
        )}

        {/* Quick Add Custom / Walk-in Player Form */}
        <div
          className={`p-4 rounded-2xl border transition-all space-y-3 flex-shrink-0 ${
            isMaxCapacityReached
              ? 'bg-slate-950/40 border-slate-800/80 opacity-80'
              : absentCount > 0
              ? 'bg-amber-950/20 border-amber-500/50 ring-1 ring-amber-500/20'
              : 'bg-slate-950/70 border-slate-800'
          }`}
        >
          {isMaxCapacityReached && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                Maximum session capacity of <strong>{maxParticipants} players</strong> reached. Adding new players is disabled.
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-brand-lime" />
              <span>Add Custom / Walk-in Replacement Player</span>
              {!isMaxCapacityReached && absentCount > 0 && (
                <span className="text-[10px] text-amber-400 font-black animate-pulse">
                  (Replacement Form Active)
                </span>
              )}
            </span>
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              {isMaxCapacityReached
                ? 'Session roster is full'
                : 'Press Enter in any field to add quickly'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Player Name */}
            <div className="sm:col-span-5">
              <input
                type="text"
                placeholder={isMaxCapacityReached ? 'Capacity full - adding disabled' : 'Full Name (e.g. Juan dela Cruz)'}
                value={newPlayerName}
                disabled={isMaxCapacityReached}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!isMaxCapacityReached) onAddCustomPlayer();
                  }
                }}
                className="w-full bg-slate-900 border border-slate-700/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime font-medium transition-all"
              />
            </div>

            {/* DUPR ID */}
            <div className="sm:col-span-3">
              <input
                type="text"
                placeholder="DUPR (e.g. RGDK2E)"
                value={newPlayerDuprId}
                disabled={isMaxCapacityReached}
                onChange={(e) => setNewPlayerDuprId(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!isMaxCapacityReached) onAddCustomPlayer();
                  }
                }}
                className="w-full bg-slate-900 border border-slate-700/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-3 py-2 text-xs text-amber-300 font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400 uppercase transition-all"
              />
            </div>

            {/* Skill Level Dropdown */}
            <div className="sm:col-span-2">
              <select
                value={newPlayerSkill}
                disabled={isMaxCapacityReached}
                onChange={(e) => setNewPlayerSkill(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-400 cursor-pointer font-medium transition-all"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={onAddCustomPlayer}
                disabled={isMaxCapacityReached || !newPlayerName.trim()}
                className="w-full h-full py-2 px-3 rounded-xl bg-brand-lime hover:bg-lime-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>{isMaxCapacityReached ? 'Full' : 'Add'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({rosterPool.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterStatus === 'active'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('resting')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterStatus === 'resting'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Bench ({restingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('absent')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterStatus === 'absent'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              Absent ({absentCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or DUPR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8.5 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>

        {/* Scrollable Roster Pool Cards */}
        <div className="space-y-2 overflow-y-auto max-h-[46vh] pr-1 flex-1">
          {filteredRoster.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 text-xs text-slate-500">
              No players match the current search or status filter.
            </div>
          ) : (
            filteredRoster.map((p) => {
              const isAbsent = p.status === 'absent';
              const isResting = p.status === 'resting';
              const isActive = p.status === 'active';

              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs ${
                    isAbsent
                      ? 'bg-rose-950/20 border-rose-900/40 opacity-75'
                      : isResting
                      ? 'bg-amber-950/15 border-amber-900/40'
                      : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                      <img
                        src={p.photoUrl || `https://robohash.org/${encodeURIComponent(p.name)}?set=set4`}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="truncate min-w-0 space-y-0.5">
                      <div className="font-extrabold text-white truncate flex items-center gap-2">
                        <span className="truncate">{p.name}</span>
                        {p.isDummy && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                            🧪 Test
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-semibold capitalize shrink-0">
                          ({p.type || 'primary'})
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.2 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300">
                          {p.skillLevel || 'Intermediate'}
                        </span>

                        {(p.adminDuprId || p.duprId) && (
                          <span
                            className={`font-mono text-[10px] px-2 py-0.2 rounded-md font-bold flex items-center gap-1 ${
                              p.adminDuprId
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-brand-lime/10 text-brand-lime border border-brand-lime/30'
                            }`}
                          >
                            <Trophy className="w-2.5 h-2.5" />
                            {p.adminDuprId || p.duprId}
                          </span>
                        )}

                        {isPlayerNR(p) ? (
                          <span
                            className="font-mono text-[10px] px-2 py-0.2 rounded-md font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1"
                            title={`Unrated (No Rate) - Matches anchored with rated opponents based on estimated ~${getPlayerEffectiveRating(p).toFixed(2)} rating`}
                          >
                            <span>NR</span>
                            <span className="text-amber-400/80 font-normal">• Est. ~{getPlayerEffectiveRating(p).toFixed(1)}</span>
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] px-2 py-0.2 rounded-md font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            ★ {p.adminDuprRating || p.duprRating}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Toggle & Delete Buttons */}
                  <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => onTogglePlayerStatus(p.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isActive
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950'
                          : isResting
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-slate-950'
                          : 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500 hover:text-white'
                      }`}
                      title="Click to cycle status: Active -> Resting -> Absent"
                    >
                      {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      {isResting && <Clock className="w-3.5 h-3.5 text-amber-400" />}
                      {isAbsent && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                      <span className="hidden sm:inline">
                        {isActive
                          ? 'Active / Present'
                          : isResting
                          ? 'Bench / Resting'
                          : 'Absent / Canceled'}
                      </span>
                      <span className="sm:hidden">
                        {isActive ? 'Active' : isResting ? 'Bench' : 'Absent'}
                      </span>
                    </button>

                    {onUpdatePlayer && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all cursor-pointer shrink-0"
                        title={`Edit ${p.name}'s info & DUPR`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onDeletePlayer && (
                      <button
                        type="button"
                        onClick={() => setPlayerToDelete(p)}
                        className="p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer shrink-0"
                        title={`Delete ${p.name} from roster`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 flex-shrink-0">
          <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {activeCount} Active
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              {restingCount} Bench
            </span>
            <span className="flex items-center gap-1 text-rose-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              {absentCount} Absent
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

        {/* Delete Confirmation Alert Modal */}
        {playerToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in text-left">
            <div className="glass-panel border border-rose-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 bg-slate-900 animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white">Delete Player from Roster?</h4>
                  <p className="text-xs text-slate-400">This action cannot be undone.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-900/40 text-xs text-rose-200/90 leading-relaxed space-y-1">
                <p>
                  Are you sure you want to remove <strong className="text-white font-bold">{playerToDelete.name}</strong>
                  {playerToDelete.duprId ? ` (DUPR: ${playerToDelete.duprId})` : ''} from the session roster pool?
                </p>
                <p className="text-[11px] text-slate-400">
                  This will remove the player from future round pairings and open up a participant slot.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPlayerToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (playerToDelete && onDeletePlayer) {
                      onDeletePlayer(playerToDelete.id);
                      setPlayerToDelete(null);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-rose-900/30 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Yes, Delete Player</span>
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Edit Player Details Modal Alert */}
        {editingPlayer && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in text-left">
            <div className="glass-panel border border-purple-500/30 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 bg-slate-900 animate-scale-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">Edit Player Information</h4>
                    <p className="text-xs text-slate-400">Update DUPR ID, Rating, Skill level, and Name</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 pt-1">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-brand-lime" /> Player Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 focus:border-brand-lime text-white rounded-xl px-3.5 py-2 text-xs placeholder-slate-500 focus:outline-none transition-all font-semibold"
                    placeholder="Full Name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* DUPR ID */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" /> DUPR ID
                    </label>
                    <input
                      type="text"
                      value={editDuprId}
                      onChange={(e) => setEditDuprId(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-slate-700/80 focus:border-amber-400 text-amber-300 font-mono rounded-xl px-3.5 py-2 text-xs placeholder-slate-500 focus:outline-none uppercase transition-all"
                      placeholder="e.g. RGDK2E"
                    />
                    <p className="text-[10px] text-slate-500">Official DUPR alphanumeric ID</p>
                  </div>

                  {/* DUPR Rating */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-yellow-400" /> DUPR Rating
                      </span>
                      {editDuprRating.toUpperCase() === 'NR' && (
                        <span className="text-[10px] text-amber-400 font-mono font-bold">Unrated (NR)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={editDuprRating}
                      onChange={(e) => setEditDuprRating(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 focus:border-purple-400 text-purple-300 font-mono rounded-xl px-3.5 py-2 text-xs placeholder-slate-500 focus:outline-none transition-all"
                      placeholder="e.g. 3.75 or NR"
                    />
                    <div className="flex items-center gap-1 pt-0.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setEditDuprRating('NR')}
                        className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
                          editDuprRating.toUpperCase() === 'NR'
                            ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                            : 'bg-slate-800 text-amber-300 hover:text-white'
                        }`}
                        title="Mark as unrated / no official DUPR rating"
                      >
                        NR (Unrated)
                      </button>
                      {['2.5', '3.0', '3.5', '4.0', '4.5'].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setEditDuprRating(r)}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
                            editDuprRating === r
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    {editDuprRating.toUpperCase() === 'NR' && (
                      <p className="text-[10px] text-amber-300/80 pt-0.5 leading-tight">
                        🧠 <strong>Anchor Rule:</strong> Player will be paired with rated anchors based on their skill level ({editSkillLevel}) to calibrate their initial rating.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Skill Level */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Skill Level
                    </label>
                    <select
                      value={editSkillLevel}
                      onChange={(e) => setEditSkillLevel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 focus:border-purple-400 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none transition-all font-medium cursor-pointer"
                    >
                      <option value="Beginner (2.0-2.5)">Beginner (2.0-2.5)</option>
                      <option value="Intermediate (3.0-3.5)">Intermediate (3.0-3.5)</option>
                      <option value="Advanced (4.0+)">Advanced (4.0+)</option>
                      <option value="Open to All">Open to All</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Roster Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700/80 focus:border-purple-400 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none transition-all font-medium cursor-pointer"
                    >
                      <option value="active">Active / Present</option>
                      <option value="resting">Bench / Resting</option>
                      <option value="absent">Absent / Canceled</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={!editName.trim()}
                  className="px-4 py-2 rounded-xl bg-brand-lime hover:bg-lime-400 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
