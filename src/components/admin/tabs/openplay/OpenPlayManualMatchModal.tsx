import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check, Lock } from 'lucide-react';
import type { OpenPlayMatch, OpenPlayMatchRosterItem } from '../../adminTypes';
import { DuprRatingBadge } from '../../../../utils/duprColorUtils';

interface OpenPlayManualMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingMatch: OpenPlayMatch | null;
  assignedCourts: string[];
  targetRound?: number;
  rosterPool: OpenPlayMatchRosterItem[];
  existingMatchesInRoundCount: number;
  lockedPartners?: Record<string, string>;
  onSaveManualMatch: (matchData: {
    matchName: string;
    round: number;
    courtName: string;
    gameType: 'doubles' | 'singles';
    targetPoints: number;
    selectedRedPlayerIds: string[];
    selectedBluePlayerIds: string[];
    editingMatch: OpenPlayMatch | null;
  }) => void;
}

export const OpenPlayManualMatchModal: React.FC<OpenPlayManualMatchModalProps> = ({
  isOpen,
  onClose,
  editingMatch,
  assignedCourts,
  targetRound = 1,
  rosterPool,
  existingMatchesInRoundCount,
  lockedPartners = {},
  onSaveManualMatch,
}) => {
  const [manualMatchName, setManualMatchName] = useState<string>('');
  const [manualRound, setManualRound] = useState<number>(1);
  const [manualCourt, setManualCourt] = useState<string>(assignedCourts[0] || 'Court 1');
  const [manualGameType, setManualGameType] = useState<'doubles' | 'singles'>('doubles');
  const [manualTargetPoints, setManualTargetPoints] = useState<number>(11);
  const [selectedRedPlayers, setSelectedRedPlayers] = useState<string[]>([]);
  const [selectedBluePlayers, setSelectedBluePlayers] = useState<string[]>([]);
  const [playerSearchQuery, setPlayerSearchQuery] = useState<string>('');
  const [attendanceFilter, setAttendanceFilter] = useState<'present' | 'all'>('present');

  const presentCount = useMemo(
    () => rosterPool.filter((p) => p.status !== 'absent' && (p.isPresent || p.attendanceStatus === 'present')).length,
    [rosterPool]
  );
  const totalEligibleCount = useMemo(
    () => rosterPool.filter((p) => p.status !== 'absent').length,
    [rosterPool]
  );

  useEffect(() => {
    if (editingMatch) {
      setManualMatchName(editingMatch.matchName || `Game ${editingMatch.round}`);
      setManualRound(editingMatch.round);
      setManualCourt(editingMatch.courtName);
      setManualGameType(editingMatch.gameType);
      setManualTargetPoints(editingMatch.targetPoints);
      setSelectedRedPlayers(editingMatch.teamRed.players.map((p) => p.id));
      setSelectedBluePlayers(editingMatch.teamBlue.players.map((p) => p.id));
    } else {
      setManualMatchName(`Game ${existingMatchesInRoundCount + 1}`);
      setManualRound(targetRound);
      setManualCourt(assignedCourts[0] || 'Court 1');
      setManualGameType('doubles');
      setManualTargetPoints(11);
      setSelectedRedPlayers([]);
      setSelectedBluePlayers([]);
    }
    setPlayerSearchQuery('');
    setAttendanceFilter('present');
  }, [editingMatch, targetRound, assignedCourts, existingMatchesInRoundCount, isOpen]);

  // Filtered Roster Players for Manual Match Creator / Editor Modal
  const filteredRosterPlayers = useMemo(() => {
    const q = playerSearchQuery.trim().toLowerCase();
    return rosterPool.filter((p) => {
      if (p.status === 'absent') return false;
      if (attendanceFilter === 'present' && !p.isPresent && p.attendanceStatus !== 'present') return false;
      if (!q) return true;

      const nameMatch = p.name.toLowerCase().includes(q);
      const duprIdMatch = (p.adminDuprId || p.duprId || '').toLowerCase().includes(q);
      const ratingMatch = String(p.adminDuprRating || p.duprRating || '').toLowerCase().includes(q);

      return nameMatch || duprIdMatch || ratingMatch;
    });
  }, [rosterPool, playerSearchQuery, attendanceFilter]);

  // Helper to resolve player information from roster pool or fallback to editingMatch
  const resolvePlayer = (id: string) => {
    const fromPool = rosterPool.find((p) => p.id === id);
    if (fromPool) {
      const pId = lockedPartners[fromPool.id];
      const partner = pId ? rosterPool.find((rp) => rp.id === pId) : undefined;
      return {
        id: fromPool.id,
        name: fromPool.name,
        photoUrl: fromPool.photoUrl,
        duprId: fromPool.adminDuprId || fromPool.duprId,
        duprRating: fromPool.adminDuprRating || fromPool.duprRating,
        skillLevel: fromPool.skillLevel,
        isPresent: fromPool.isPresent || fromPool.attendanceStatus === 'present',
        lockedPartnerName: partner?.name,
      };
    }
    const matchPlayer =
      editingMatch?.teamRed.players.find((p) => p.id === id) ||
      editingMatch?.teamBlue.players.find((p) => p.id === id);
    if (matchPlayer) {
      return {
        id: matchPlayer.id,
        name: matchPlayer.name,
        photoUrl: matchPlayer.photoUrl,
        duprId: matchPlayer.duprId,
        duprRating: matchPlayer.duprRating,
        skillLevel: matchPlayer.skillLevel,
        isPresent: true,
      };
    }
    return { id, name: 'Player' };
  };

  const handleRemoveRedPlayer = (idToRemove: string) => {
    setSelectedRedPlayers((prev) => prev.filter((id) => id !== idToRemove));
  };

  const handleRemoveBluePlayer = (idToRemove: string) => {
    setSelectedBluePlayers((prev) => prev.filter((id) => id !== idToRemove));
  };

  const handleToggleRedPlayer = (p: OpenPlayMatchRosterItem) => {
    const isRed = selectedRedPlayers.includes(p.id);
    if (isRed) {
      handleRemoveRedPlayer(p.id);
      return;
    }

    if (selectedBluePlayers.includes(p.id)) {
      alert(`${p.name} is already selected on Team Blue!`);
      return;
    }

    const partnerId = lockedPartners[p.id];
    const partner = partnerId ? rosterPool.find((rp) => rp.id === partnerId) : undefined;
    const limit = manualGameType === 'doubles' ? 2 : 1;

    // Auto-fill both locked partners ONLY when Team Red has 0 players assigned
    if (
      manualGameType === 'doubles' &&
      selectedRedPlayers.length === 0 &&
      partnerId &&
      rosterPool.some((rp) => rp.id === partnerId && rp.status !== 'absent')
    ) {
      if (selectedBluePlayers.includes(partnerId)) {
        alert(`${p.name}'s locked partner (${partner?.name || partnerId}) is already selected on Team Blue!`);
        return;
      }
      setSelectedRedPlayers([p.id, partnerId]);
      return;
    }

    if (selectedRedPlayers.length >= limit) {
      alert(`Team Red already has ${limit} player(s). Click [X] on a player in the Team Red Lineup above to replace them.`);
      return;
    }

    setSelectedRedPlayers((prev) => [...prev, p.id]);
  };

  const handleToggleBluePlayer = (p: OpenPlayMatchRosterItem) => {
    const isBlue = selectedBluePlayers.includes(p.id);
    if (isBlue) {
      handleRemoveBluePlayer(p.id);
      return;
    }

    if (selectedRedPlayers.includes(p.id)) {
      alert(`${p.name} is already selected on Team Red!`);
      return;
    }

    const partnerId = lockedPartners[p.id];
    const partner = partnerId ? rosterPool.find((rp) => rp.id === partnerId) : undefined;
    const limit = manualGameType === 'doubles' ? 2 : 1;

    // Auto-fill both locked partners ONLY when Team Blue has 0 players assigned
    if (
      manualGameType === 'doubles' &&
      selectedBluePlayers.length === 0 &&
      partnerId &&
      rosterPool.some((rp) => rp.id === partnerId && rp.status !== 'absent')
    ) {
      if (selectedRedPlayers.includes(partnerId)) {
        alert(`${p.name}'s locked partner (${partner?.name || partnerId}) is already selected on Team Red!`);
        return;
      }
      setSelectedBluePlayers([p.id, partnerId]);
      return;
    }

    if (selectedBluePlayers.length >= limit) {
      alert(`Team Blue already has ${limit} player(s). Click [X] on a player in the Team Blue Lineup above to replace them.`);
      return;
    }

    setSelectedBluePlayers((prev) => [...prev, p.id]);
  };

  if (!isOpen) return null;

  const handleSubmit = () => {
    const reqPlayers = manualGameType === 'doubles' ? 2 : 1;
    if (selectedRedPlayers.length !== reqPlayers || selectedBluePlayers.length !== reqPlayers) {
      alert(
        `For ${manualGameType}, please select exactly ${reqPlayers} player(s) for Team Red and ${reqPlayers} player(s) for Team Blue.`
      );
      return;
    }

    onSaveManualMatch({
      matchName: manualMatchName.trim() || `Game ${manualRound}`,
      round: manualRound,
      courtName: manualCourt,
      gameType: manualGameType,
      targetPoints: manualTargetPoints,
      selectedRedPlayerIds: selectedRedPlayers,
      selectedBluePlayerIds: selectedBluePlayers,
      editingMatch,
    });
  };

  const modalNode = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="glass-panel border border-slate-800 rounded-2xl sm:rounded-3xl max-w-3xl md:max-w-4xl w-full shadow-2xl text-left bg-slate-900 max-h-[88vh] sm:max-h-[85vh] flex flex-col overflow-hidden m-auto my-auto relative">
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-950/90 shrink-0">
          <h3 className="text-base sm:text-lg font-black text-white">
            {editingMatch ? 'Edit Match' : 'Create Manual Match'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
          <div>
            <label className="block text-slate-400 font-bold mb-1">Game Name / Match Title</label>
            <input
              type="text"
              placeholder="e.g. Game 1, Match A, Court 1 Scramble"
              value={manualMatchName}
              onChange={(e) => setManualMatchName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-brand-lime"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-bold mb-1">Round #</label>
              <input
                type="number"
                min={1}
                value={manualRound}
                onChange={(e) => setManualRound(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-brand-lime font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Assigned Court</label>
              <select
                value={manualCourt}
                onChange={(e) => setManualCourt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-brand-lime font-bold focus:outline-none focus:border-brand-lime cursor-pointer"
              >
                {assignedCourts.map((c, i) => (
                  <option key={i} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Format</label>
              <select
                value={manualGameType}
                onChange={(e) => {
                  setManualGameType(e.target.value as 'doubles' | 'singles');
                  setSelectedRedPlayers([]);
                  setSelectedBluePlayers([]);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-brand-lime cursor-pointer"
              >
                <option value="doubles">Doubles (2v2)</option>
                <option value="singles">Singles (1v1)</option>
              </select>
            </div>
          </div>

          {/* Player Search Bar & Attendance Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-slate-400 font-bold text-xs">Search & Select Players</label>
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setAttendanceFilter('present')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    attendanceFilter === 'present'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span>Present Only</span>
                  <span className={`px-1 py-0.2 rounded text-[9px] font-mono ${
                    attendanceFilter === 'present' ? 'bg-emerald-600 text-white font-black' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {presentCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    attendanceFilter === 'all'
                      ? 'bg-slate-200 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>All Roster</span>
                  <span className={`px-1 py-0.2 rounded text-[9px] font-mono ${
                    attendanceFilter === 'all' ? 'bg-slate-300 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {totalEligibleCount}
                  </span>
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search player name, DUPR rating (e.g. 3.8), or DUPR ID..."
                value={playerSearchQuery}
                onChange={(e) => setPlayerSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-white font-semibold text-xs focus:outline-none focus:border-brand-lime"
              />
              {playerSearchQuery && (
                <button
                  type="button"
                  onClick={() => setPlayerSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-lg cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Player Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Team Red Selection */}
            <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-800/40 space-y-3">
              <div className="font-extrabold text-red-400 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 shadow-sm" />
                  <span>Team Red Lineup</span>
                </span>
                <span className="font-mono bg-red-950/80 border border-red-800/60 px-2 py-0.5 rounded text-[11px] text-red-300">
                  {selectedRedPlayers.length} / {manualGameType === 'doubles' ? 2 : 1}
                </span>
              </div>

              {/* Pinned Team Red Slots */}
              <div className="space-y-1.5">
                {Array.from({ length: manualGameType === 'doubles' ? 2 : 1 }).map((_, slotIdx) => {
                  const playerId = selectedRedPlayers[slotIdx];
                  if (!playerId) {
                    return (
                      <div
                        key={`empty-red-slot-${slotIdx}`}
                        className="p-2.5 rounded-xl border border-dashed border-red-800/60 bg-red-950/10 text-red-300/60 text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500/40" />
                        <span>Slot {slotIdx + 1} Open — Select replacement player below</span>
                      </div>
                    );
                  }

                  const p = resolvePlayer(playerId);
                  return (
                    <div
                      key={playerId}
                      className="p-2 sm:p-2.5 rounded-xl bg-red-900/30 border border-red-600/50 flex items-center justify-between gap-2.5 shadow-sm transition-all animate-fade-in"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-red-500/50 overflow-hidden shrink-0 shadow-sm">
                          <img
                            src={p.photoUrl || `https://robohash.org/${encodeURIComponent(p.name)}?set=set4`}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate flex items-center gap-1.5 flex-wrap">
                            <span className="truncate font-extrabold text-white text-xs">{p.name}</span>
                            {p.lockedPartnerName && (
                              <span className="text-[9px] px-1 rounded bg-purple-950/70 text-purple-300 border border-purple-800/40 font-bold flex items-center gap-0.5 shrink-0">
                                <Lock className="w-2.5 h-2.5 text-purple-400" />
                                <span>Pair: {p.lockedPartnerName}</span>
                              </span>
                            )}
                          </div>
                          {(p.duprId || p.duprRating) && (
                            <div className="text-[10px] font-mono text-red-200/90 truncate flex items-center gap-1.5 flex-wrap mt-0.5">
                              {p.duprId && <span>ID: {p.duprId}</span>}
                              {p.duprRating && (
                                <span className="bg-red-950/80 px-1 rounded border border-red-800/40 font-bold text-red-300">
                                  ★ {p.duprRating}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRedPlayer(playerId)}
                        className="p-1.5 rounded-lg bg-red-950/80 hover:bg-red-800 border border-red-700/60 text-red-200 hover:text-white transition-all cursor-pointer shrink-0"
                        title={`Remove ${p.name} from Team Red`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Subheader for candidate roster list */}
              <div className="pt-2 border-t border-red-900/40 flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span>Available Roster</span>
                <span className="text-[10px] font-normal text-slate-500">
                  {selectedRedPlayers.length < (manualGameType === 'doubles' ? 2 : 1)
                    ? 'Click to assign to open slot'
                    : 'Team full (click [X] above to replace)'}
                </span>
              </div>

              {/* Candidate Roster List */}
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {filteredRosterPlayers.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs italic">
                    No players matching "{playerSearchQuery}"
                  </div>
                ) : (
                  filteredRosterPlayers.map((p) => {
                    const isRed = selectedRedPlayers.includes(p.id);
                    const isBlue = selectedBluePlayers.includes(p.id);
                    const effectiveDupr = p.adminDuprId || p.duprId;
                    const effectiveRating = p.adminDuprRating || p.duprRating;
                    const partnerId = lockedPartners[p.id];
                    const partner = partnerId ? rosterPool.find((rp) => rp.id === partnerId) : undefined;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={isBlue}
                        onClick={() => handleToggleRedPlayer(p)}
                        className={`w-full text-left px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2.5 text-xs font-semibold transition-all cursor-pointer ${
                          isRed
                            ? 'bg-red-600 text-white border-red-500 shadow-md'
                            : isBlue
                            ? 'opacity-30 cursor-not-allowed bg-slate-900 border-slate-800'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0 shadow-sm">
                            <img
                              src={p.photoUrl || `https://robohash.org/${encodeURIComponent(p.name)}?set=set4`}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate flex items-center gap-1.5 flex-wrap">
                              <span className="truncate font-extrabold">{p.name}</span>
                              {partner && (
                                <span className="text-[9px] px-1 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40 font-bold flex items-center gap-0.5 shrink-0">
                                  <Lock className="w-2.5 h-2.5 text-purple-400" />
                                  <span>Locked: {partner.name}</span>
                                </span>
                              )}
                              {p.isPresent || p.attendanceStatus === 'present' ? (
                                <span className="text-[9px] px-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-bold uppercase shrink-0">
                                  Present
                                </span>
                              ) : (
                                <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 border border-slate-700/60 font-bold uppercase shrink-0">
                                  Unchecked
                                </span>
                              )}
                              {p.type === 'guest' && (
                                <span className="text-[9px] px-1 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 font-bold uppercase shrink-0">
                                  Guest
                                </span>
                              )}
                            </div>
                            {(effectiveDupr || effectiveRating) && (
                              <div className="text-[10px] font-mono opacity-90 mt-0.5 truncate flex items-center gap-1.5 flex-wrap">
                                {effectiveDupr && <span>ID: {effectiveDupr}</span>}
                                {effectiveRating && (
                                  <DuprRatingBadge
                                    rating={effectiveRating}
                                    skillLevel={p.skillLevel}
                                    player={p}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {isRed ? (
                          <div className="flex items-center gap-1 text-[11px] font-bold bg-red-700 px-2 py-0.5 rounded-lg text-white shrink-0">
                            <Check className="w-3.5 h-3.5" />
                            <span>Selected</span>
                          </div>
                        ) : isBlue ? (
                          <span className="text-[10px] text-slate-500 font-bold shrink-0">On Team Blue</span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Team Blue Selection */}
            <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-800/40 space-y-3">
              <div className="font-extrabold text-blue-400 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm" />
                  <span>Team Blue Lineup</span>
                </span>
                <span className="font-mono bg-blue-950/80 border border-blue-800/60 px-2 py-0.5 rounded text-[11px] text-blue-300">
                  {selectedBluePlayers.length} / {manualGameType === 'doubles' ? 2 : 1}
                </span>
              </div>

              {/* Pinned Team Blue Slots */}
              <div className="space-y-1.5">
                {Array.from({ length: manualGameType === 'doubles' ? 2 : 1 }).map((_, slotIdx) => {
                  const playerId = selectedBluePlayers[slotIdx];
                  if (!playerId) {
                    return (
                      <div
                        key={`empty-blue-slot-${slotIdx}`}
                        className="p-2.5 rounded-xl border border-dashed border-blue-800/60 bg-blue-950/10 text-blue-300/60 text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
                        <span>Slot {slotIdx + 1} Open — Select replacement player below</span>
                      </div>
                    );
                  }

                  const p = resolvePlayer(playerId);
                  return (
                    <div
                      key={playerId}
                      className="p-2 sm:p-2.5 rounded-xl bg-blue-900/30 border border-blue-600/50 flex items-center justify-between gap-2.5 shadow-sm transition-all animate-fade-in"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-blue-500/50 overflow-hidden shrink-0 shadow-sm">
                          <img
                            src={p.photoUrl || `https://robohash.org/${encodeURIComponent(p.name)}?set=set4`}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate flex items-center gap-1.5 flex-wrap">
                            <span className="truncate font-extrabold text-white text-xs">{p.name}</span>
                            {p.lockedPartnerName && (
                              <span className="text-[9px] px-1 rounded bg-purple-950/70 text-purple-300 border border-purple-800/40 font-bold flex items-center gap-0.5 shrink-0">
                                <Lock className="w-2.5 h-2.5 text-purple-400" />
                                <span>Pair: {p.lockedPartnerName}</span>
                              </span>
                            )}
                          </div>
                          {(p.duprId || p.duprRating) && (
                            <div className="text-[10px] font-mono text-blue-200/90 truncate flex items-center gap-1.5 flex-wrap mt-0.5">
                              {p.duprId && <span>ID: {p.duprId}</span>}
                              {p.duprRating && (
                                <span className="bg-blue-950/80 px-1 rounded border border-blue-800/40 font-bold text-blue-300">
                                  ★ {p.duprRating}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBluePlayer(playerId)}
                        className="p-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-800 border border-blue-700/60 text-blue-200 hover:text-white transition-all cursor-pointer shrink-0"
                        title={`Remove ${p.name} from Team Blue`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Subheader for candidate roster list */}
              <div className="pt-2 border-t border-blue-900/40 flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span>Available Roster</span>
                <span className="text-[10px] font-normal text-slate-500">
                  {selectedBluePlayers.length < (manualGameType === 'doubles' ? 2 : 1)
                    ? 'Click to assign to open slot'
                    : 'Team full (click [X] above to replace)'}
                </span>
              </div>

              {/* Candidate Roster List */}
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {filteredRosterPlayers.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs italic">
                    No players matching "{playerSearchQuery}"
                  </div>
                ) : (
                  filteredRosterPlayers.map((p) => {
                    const isRed = selectedRedPlayers.includes(p.id);
                    const isBlue = selectedBluePlayers.includes(p.id);
                    const effectiveDupr = p.adminDuprId || p.duprId;
                    const effectiveRating = p.adminDuprRating || p.duprRating;
                    const partnerId = lockedPartners[p.id];
                    const partner = partnerId ? rosterPool.find((rp) => rp.id === partnerId) : undefined;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={isRed}
                        onClick={() => handleToggleBluePlayer(p)}
                        className={`w-full text-left px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2.5 text-xs font-semibold transition-all cursor-pointer ${
                          isBlue
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                            : isRed
                            ? 'opacity-30 cursor-not-allowed bg-slate-900 border-slate-800'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0 shadow-sm">
                            <img
                              src={p.photoUrl || `https://robohash.org/${encodeURIComponent(p.name)}?set=set4`}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate flex items-center gap-1.5 flex-wrap">
                              <span className="truncate font-extrabold">{p.name}</span>
                              {partner && (
                                <span className="text-[9px] px-1 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40 font-bold flex items-center gap-0.5 shrink-0">
                                  <Lock className="w-2.5 h-2.5 text-purple-400" />
                                  <span>Locked: {partner.name}</span>
                                </span>
                              )}
                              {p.isPresent || p.attendanceStatus === 'present' ? (
                                <span className="text-[9px] px-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-bold uppercase shrink-0">
                                  Present
                                </span>
                              ) : (
                                <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 border border-slate-700/60 font-bold uppercase shrink-0">
                                  Unchecked
                                </span>
                              )}
                              {p.type === 'guest' && (
                                <span className="text-[9px] px-1 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 font-bold uppercase shrink-0">
                                  Guest
                                </span>
                              )}
                            </div>
                            {(effectiveDupr || effectiveRating) && (
                              <div className="text-[10px] font-mono opacity-90 mt-0.5 truncate flex items-center gap-1.5 flex-wrap">
                                {effectiveDupr && <span>ID: {effectiveDupr}</span>}
                                {effectiveRating && (
                                  <DuprRatingBadge
                                    rating={effectiveRating}
                                    skillLevel={p.skillLevel}
                                    player={p}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {isBlue ? (
                          <div className="flex items-center gap-1 text-[11px] font-bold bg-blue-700 px-2 py-0.5 rounded-lg text-white shrink-0">
                            <Check className="w-3.5 h-3.5" />
                            <span>Selected</span>
                          </div>
                        ) : isRed ? (
                          <span className="text-[10px] text-slate-500 font-bold shrink-0">On Team Red</span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
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
            onClick={handleSubmit}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-lime hover:bg-[#a6e224] text-dark-bg font-black text-xs cursor-pointer shadow-lg hover:scale-[1.02] transition-all text-center"
          >
            {editingMatch ? 'Update Match' : 'Create Match Now'}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};

