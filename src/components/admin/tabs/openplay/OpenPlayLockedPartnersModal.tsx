import React, { useState, useMemo } from 'react';
import {
  Lock,
  Unlock,
  Users,
  X,
  Plus,
  Trash2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { OpenPlayMatchRosterItem } from '../../adminTypes';

export interface OpenPlayLockedPartnersModalProps {
  isOpen: boolean;
  onClose: () => void;
  rosterPool: OpenPlayMatchRosterItem[];
  lockedPartners: Record<string, string>;
  onSetLockedPartner: (player1Id: string, player2Id: string) => void;
  onRemoveLockedPartner: (playerId: string) => void;
  onClearAllLockedPartners?: () => void;
  preSelectedPlayerId?: string | null;
}

export const OpenPlayLockedPartnersModal: React.FC<OpenPlayLockedPartnersModalProps> = ({
  isOpen,
  onClose,
  rosterPool,
  lockedPartners,
  onSetLockedPartner,
  onRemoveLockedPartner,
  onClearAllLockedPartners,
  preSelectedPlayerId,
}) => {
  const [selectedPlayer1Id, setSelectedPlayer1Id] = useState<string>('');
  const [selectedPlayer2Id, setSelectedPlayer2Id] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Map of active players by id
  const playerMap = useMemo(() => {
    const map = new Map<string, OpenPlayMatchRosterItem>();
    rosterPool.forEach((p) => map.set(p.id, p));
    return map;
  }, [rosterPool]);

  // Compute all unique locked pairs: Array of [Player1, Player2]
  const lockedPairs = useMemo(() => {
    const seen = new Set<string>();
    const pairs: [OpenPlayMatchRosterItem, OpenPlayMatchRosterItem][] = [];

    Object.entries(lockedPartners).forEach(([p1Id, p2Id]) => {
      const pairKey = [p1Id, p2Id].sort().join(':::');
      if (!seen.has(pairKey) && p1Id !== p2Id) {
        seen.add(pairKey);
        const p1 = playerMap.get(p1Id);
        const p2 = playerMap.get(p2Id);
        if (p1 && p2) {
          pairs.push([p1, p2]);
        }
      }
    });

    return pairs;
  }, [lockedPartners, playerMap]);

  // Set of player IDs that currently have a locked partner
  const partneredPlayerIds = useMemo(() => {
    const set = new Set<string>();
    Object.entries(lockedPartners).forEach(([p1, p2]) => {
      if (p1 && p2 && p1 !== p2) {
        set.add(p1);
        set.add(p2);
      }
    });
    return set;
  }, [lockedPartners]);

  // Eligible players who are active (not absent) and don't yet have a partner
  const eligibleUnpartnered = useMemo(() => {
    return rosterPool.filter(
      (p) => p.status !== 'absent' && !partneredPlayerIds.has(p.id)
    );
  }, [rosterPool, partneredPlayerIds]);

  // Sync pre-selected player when opened
  React.useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      if (preSelectedPlayerId && !partneredPlayerIds.has(preSelectedPlayerId)) {
        setSelectedPlayer1Id(preSelectedPlayerId);
      } else {
        setSelectedPlayer1Id('');
      }
      setSelectedPlayer2Id('');
    }
  }, [isOpen, preSelectedPlayerId, partneredPlayerIds]);

  if (!isOpen) return null;

  const handleCreatePair = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedPlayer1Id || !selectedPlayer2Id) {
      setErrorMessage('Please select both players to lock together as partners.');
      return;
    }
    if (selectedPlayer1Id === selectedPlayer2Id) {
      setErrorMessage('A player cannot be locked as a partner with themselves.');
      return;
    }

    onSetLockedPartner(selectedPlayer1Id, selectedPlayer2Id);
    setSelectedPlayer1Id('');
    setSelectedPlayer2Id('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl text-left bg-slate-900 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Locked-In Doubles Partners</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                  {lockedPairs.length} {lockedPairs.length === 1 ? 'Pair' : 'Pairs'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Lock player pairs upon request. The matchmaking engine will strictly schedule them as teammates on the same court in every round.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Pair New Partners Form */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-brand-lime" />
                <span>Pair New Doubles Partners</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                {eligibleUnpartnered.length} available players
              </span>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreatePair} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Player 1 Dropdown */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Select Player 1
                  </label>
                  <select
                    value={selectedPlayer1Id}
                    onChange={(e) => {
                      setSelectedPlayer1Id(e.target.value);
                      setErrorMessage('');
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-medium focus:outline-none focus:border-brand-lime"
                  >
                    <option value="">-- Choose First Player --</option>
                    {eligibleUnpartnered.map((p) => {
                      const rating = p.adminDuprRating || p.duprRating;
                      return (
                        <option
                          key={p.id}
                          value={p.id}
                          disabled={p.id === selectedPlayer2Id}
                        >
                          {p.name} {rating ? `(DUPR ${rating})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Player 2 Dropdown */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Select Player 2 (Partner)
                  </label>
                  <select
                    value={selectedPlayer2Id}
                    onChange={(e) => {
                      setSelectedPlayer2Id(e.target.value);
                      setErrorMessage('');
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-medium focus:outline-none focus:border-brand-lime"
                  >
                    <option value="">-- Choose Second Player --</option>
                    {eligibleUnpartnered.map((p) => {
                      const rating = p.adminDuprRating || p.duprRating;
                      return (
                        <option
                          key={p.id}
                          value={p.id}
                          disabled={p.id === selectedPlayer1Id}
                        >
                          {p.name} {rating ? `(DUPR ${rating})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={!selectedPlayer1Id || !selectedPlayer2Id || selectedPlayer1Id === selectedPlayer2Id}
                  className="px-4 py-2 rounded-xl bg-brand-lime hover:bg-[#a6e224] text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Partner Pair</span>
                </button>
              </div>
            </form>
          </div>

          {/* Active Locked Pairs List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Active Locked Pairs ({lockedPairs.length})</span>
              </h4>
              {lockedPairs.length > 0 && onClearAllLockedPartners && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to unlock all partner pairs? Normal unique rotation will apply.')) {
                      onClearAllLockedPartners();
                    }
                  }}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Unlock All</span>
                </button>
              )}
            </div>

            {lockedPairs.length === 0 ? (
              <div className="py-8 px-4 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 text-slate-400 space-y-1.5">
                <Unlock className="w-6 h-6 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-300">No locked partner pairs configured.</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  All players will rotate freely with unique partners across every round. Use the selector above to lock pairs upon request.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {lockedPairs.map(([p1, p2], idx) => {
                  const r1 = p1.adminDuprRating || p1.duprRating;
                  const r2 = p2.adminDuprRating || p2.duprRating;
                  const numR1 = parseFloat(r1 || '3.0');
                  const numR2 = parseFloat(r2 || '3.0');
                  const avgRating = ((numR1 + numR2) / 2).toFixed(2);

                  return (
                    <div
                      key={`pair-${idx}`}
                      className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 hover:border-emerald-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                    >
                      {/* Pair Details */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                          <Lock className="w-4 h-4" />
                        </div>

                        {/* Player 1 Card */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                            <img
                              src={p1.photoUrl || `https://robohash.org/${encodeURIComponent(p1.name)}?set=set4`}
                              alt={p1.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-extrabold text-white truncate">{p1.name}</div>
                            {r1 && (
                              <div className="text-[10px] text-emerald-400 font-mono font-bold">
                                DUPR {r1}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Link Symbol */}
                        <div className="px-1.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-black shrink-0">
                          &amp;
                        </div>

                        {/* Player 2 Card */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                            <img
                              src={p2.photoUrl || `https://robohash.org/${encodeURIComponent(p2.name)}?set=set4`}
                              alt={p2.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-extrabold text-white truncate">{p2.name}</div>
                            {r2 && (
                              <div className="text-[10px] text-emerald-400 font-mono font-bold">
                                DUPR {r2}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Team Rating & Unlock Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Avg Team DUPR</div>
                          <div className="text-xs font-mono font-black text-brand-lime">{avgRating}</div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveLockedPartner(p1.id)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-800 hover:border-rose-500/50 bg-slate-900 text-slate-300 hover:text-rose-400 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                          title={`Unlock partnership between ${p1.name} and ${p2.name}`}
                        >
                          <Unlock className="w-3.5 h-3.5 text-rose-400" />
                          <span>Unlock</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-lime" />
            <span>Changes take effect immediately on next round generation.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
