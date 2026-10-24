import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, Check } from 'lucide-react';
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
  }, [editingMatch, targetRound, assignedCourts, existingMatchesInRoundCount, isOpen]);

  // Filtered Roster Players for Manual Match Creator / Editor Modal
  const filteredRosterPlayers = useMemo(() => {
    const q = playerSearchQuery.trim().toLowerCase();
    return rosterPool.filter((p) => {
      if (p.status === 'absent') return false;
      if (!q) return true;

      const nameMatch = p.name.toLowerCase().includes(q);
      const duprIdMatch = (p.adminDuprId || p.duprId || '').toLowerCase().includes(q);
      const ratingMatch = String(p.adminDuprRating || p.duprRating || '').toLowerCase().includes(q);

      return nameMatch || duprIdMatch || ratingMatch;
    });
  }, [rosterPool, playerSearchQuery]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel border border-slate-800 rounded-3xl max-w-3xl md:max-w-4xl w-full p-6 shadow-2xl space-y-5 text-left bg-slate-900 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-black text-white">
            {editingMatch ? 'Edit Match' : 'Create Manual Match'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
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

          <div className="grid grid-cols-3 gap-3">
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

          {/* Player Search Bar */}
          <div>
            <label className="block text-slate-400 font-bold mb-1">Search Roster Player</label>
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
            <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-800/40 space-y-2">
              <div className="font-extrabold text-red-400 text-xs flex items-center justify-between">
                <span>Team Red Players</span>
                <span className="font-mono bg-red-950 border border-red-800/60 px-2 py-0.5 rounded text-[11px]">
                  {selectedRedPlayers.length} / {manualGameType === 'doubles' ? 2 : 1}
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
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

                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={isBlue}
                        onClick={() => {
                          if (isRed) {
                            setSelectedRedPlayers(selectedRedPlayers.filter((id) => id !== p.id));
                          } else {
                            const limit = manualGameType === 'doubles' ? 2 : 1;
                            if (selectedRedPlayers.length >= limit) return;
                            setSelectedRedPlayers([...selectedRedPlayers, p.id]);
                          }
                        }}
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
                            <div className="truncate flex items-center gap-1.5">
                              <span className="truncate font-extrabold">{p.name}</span>
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
                        {isRed && <Check className="w-4 h-4 text-white shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Team Blue Selection */}
            <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-800/40 space-y-2">
              <div className="font-extrabold text-blue-400 text-xs flex items-center justify-between">
                <span>Team Blue Players</span>
                <span className="font-mono bg-blue-950 border border-blue-800/60 px-2 py-0.5 rounded text-[11px]">
                  {selectedBluePlayers.length} / {manualGameType === 'doubles' ? 2 : 1}
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
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

                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={isRed}
                        onClick={() => {
                          if (isBlue) {
                            setSelectedBluePlayers(selectedBluePlayers.filter((id) => id !== p.id));
                          } else {
                            const limit = manualGameType === 'doubles' ? 2 : 1;
                            if (selectedBluePlayers.length >= limit) return;
                            setSelectedBluePlayers([...selectedBluePlayers, p.id]);
                          }
                        }}
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
                            <div className="truncate flex items-center gap-1.5">
                              <span className="truncate font-extrabold">{p.name}</span>
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
                        {isBlue && <Check className="w-4 h-4 text-white shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl bg-brand-lime hover:bg-[#a6e224] text-dark-bg font-black text-xs cursor-pointer shadow-lg hover:scale-[1.02] transition-all"
          >
            {editingMatch ? 'Update Match' : 'Create Match Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

