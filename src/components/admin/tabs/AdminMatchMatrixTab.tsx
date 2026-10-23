import React, { useState, useMemo, useEffect } from 'react';
import {
  Grid3X3,
  Users,
  Plus,
  Calendar,
  Clock,
  Trophy,
  Trash2,
  ArrowLeft,
  Sparkles,
  Search,
  Play,
  RotateCcw,
  CheckCircle2,
  X,
  Layers,
  Zap,
  User,
  Star,
} from 'lucide-react';
import { type Court, type UserPermissions, type OpenPlayMatchRosterItem } from '../adminTypes';
import { type OpenPlayEvent } from '../../OpenPlayDetails';
import { AdminOpenPlayMatchManagement } from './AdminOpenPlayMatchManagement';
import { db, isFirebaseConfigured } from '../../../firebase';
import { doc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';

export interface AdminMatchMatrixTabProps {
  courts?: Court[];
  openPlayEvents?: OpenPlayEvent[];
  openPlayRegistrations?: any[];
  onRefreshEvents?: () => void;
  userPermissions?: UserPermissions;
  currentAdminEmail?: string;
  currentAdminName?: string;
  myCompany?: any;
  onNavigateToScoreboard?: (match: any) => void;
}

export const AdminMatchMatrixTab: React.FC<AdminMatchMatrixTabProps> = ({
  courts = [],
  openPlayEvents = [],
  openPlayRegistrations = [],
  onRefreshEvents,
  currentAdminEmail = 'admin@picklepoint.com',
  myCompany,
  onNavigateToScoreboard,
}) => {
  // Active Running Matrix
  const [activeMatrix, setActiveMatrix] = useState<OpenPlayEvent | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'completed'>('all');

  // Create Matrix Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [matrixTitle, setMatrixTitle] = useState('');
  const [matrixDate, setMatrixDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [matrixStartTime, setMatrixStartTime] = useState('06:00 PM');
  const [matrixEndTime, setMatrixEndTime] = useState('09:00 PM');
  const [maxPlayers, setMaxPlayers] = useState<number>(16);
  const [rotationRule, setRotationRule] = useState<'winners_stay' | 'all_4_rotate' | 'split_winners'>('winners_stay');
  const [isDupr, setIsDupr] = useState<boolean>(false);

  // Roster Builder States
  const [rosterTab, setRosterTab] = useState<'pull' | 'manual'>('pull');
  const [selectedSourceEventId, setSelectedSourceEventId] = useState<string>('');
  const [pulledCandidates, setPulledCandidates] = useState<OpenPlayMatchRosterItem[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());

  // Manual Player Inputs
  const [manualPlayerName, setManualPlayerName] = useState('');
  const [manualPlayerDupr, setManualPlayerDupr] = useState('');
  const [manualPlayerRating, setManualPlayerRating] = useState('');
  const [manualPlayerSkill, setManualPlayerSkill] = useState<string>('Intermediate (3.0-3.5)');

  // Pending Roster for the new matrix
  const [pendingRoster, setPendingRoster] = useState<OpenPlayMatchRosterItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Local fallback matrix events
  const [localMatrices, setLocalMatrices] = useState<OpenPlayEvent[]>(() => {
    try {
      const saved = localStorage.getItem('picklepoint_match_matrices');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Filter existing events that are match matrices
  const allMatrices = useMemo(() => {
    const fromEvents = openPlayEvents.filter((ev) => ev.isMatchMatrix === true);
    const existingIds = new Set(fromEvents.map((e) => e.id));
    const uniqueLocal = localMatrices.filter((m) => !existingIds.has(m.id));
    return [...fromEvents, ...uniqueLocal].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [openPlayEvents, localMatrices]);

  const filteredMatrices = useMemo(() => {
    return allMatrices.filter((m) => {
      const matchesSearch =
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.courtNames || []).some((cn) => cn.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allMatrices, searchQuery, statusFilter]);

  // Handle source Open Play event selection for Roster Pullout
  useEffect(() => {
    if (!selectedSourceEventId) {
      setPulledCandidates([]);
      setSelectedCandidateIds(new Set());
      return;
    }

    // 1. Gather registrations from props or localStorage
    const eventRegs = openPlayRegistrations.filter((r) => r.eventId === selectedSourceEventId);
    let allCandidates: OpenPlayMatchRosterItem[] = [];

    if (eventRegs.length > 0) {
      eventRegs.forEach((r) => {
        if (r.status === 'cancelled') return;
        const mainPlayer: OpenPlayMatchRosterItem = {
          id: r.id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: r.playerName || (r.user?.name) || 'Player',
          duprId: r.duprId || r.adminDuprId || (r.user?.duprId) || '',
          adminDuprId: r.adminDuprId || '',
          duprRating: r.duprRating || r.adminDuprRating || (r.user?.duprRating) || '',
          type: 'primary',
          status: 'active',
        };
        allCandidates.push(mainPlayer);

        if (Array.isArray(r.guests)) {
          r.guests.forEach((g: any, gIdx: number) => {
            allCandidates.push({
              id: `${r.id}_guest_${gIdx}`,
              name: g.name || `Guest of ${mainPlayer.name}`,
              duprId: g.duprId || '',
              duprRating: g.duprRating || '',
              type: 'guest',
              status: 'active',
            });
          });
        }
      });
    }

    // 2. Also check if local roster pool exists for this event
    try {
      const savedRosterStr = localStorage.getItem(`picklepoint_openplay_roster_${selectedSourceEventId}`);
      if (savedRosterStr) {
        const saved = JSON.parse(savedRosterStr) as OpenPlayMatchRosterItem[];
        const seenNames = new Set(allCandidates.map((c) => c.name.toLowerCase().trim()));
        saved.forEach((sp) => {
          if (!seenNames.has(sp.name.toLowerCase().trim())) {
            allCandidates.push(sp);
            seenNames.add(sp.name.toLowerCase().trim());
          }
        });
      }
    } catch (e) {
      console.warn('Error reading local roster:', e);
    }

    setPulledCandidates(allCandidates);
    setSelectedCandidateIds(new Set(allCandidates.map((c) => c.id)));
  }, [selectedSourceEventId, openPlayRegistrations]);

  // Open Create Modal & reset states
  const handleOpenCreateModal = () => {
    setMatrixTitle('');
    setMatrixDate(new Date().toISOString().split('T')[0]);
    setMatrixStartTime('06:00 PM');
    setMatrixEndTime('09:00 PM');
    setMaxPlayers(16);
    setRotationRule('winners_stay');
    setIsDupr(false);
    setSelectedSourceEventId('');
    setPulledCandidates([]);
    setSelectedCandidateIds(new Set());
    setPendingRoster([]);
    setErrorMessage(null);
    setIsCreateModalOpen(true);
  };

  // Add manual player to pending roster
  const handleAddManualPlayer = () => {
    if (!manualPlayerName.trim()) return;
    const newPlayer: OpenPlayMatchRosterItem = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: manualPlayerName.trim(),
      duprId: manualPlayerDupr.trim().toUpperCase(),
      duprRating: manualPlayerRating.trim(),
      skillLevel: manualPlayerSkill,
      type: 'primary',
      status: 'active',
    };
    setPendingRoster((prev) => [...prev, newPlayer]);
    setManualPlayerName('');
    setManualPlayerDupr('');
    setManualPlayerRating('');
  };

  // Import pulled candidates into pending roster
  const handleImportPulledRoster = () => {
    const toImport = pulledCandidates.filter((c) => selectedCandidateIds.has(c.id));
    const existingNames = new Set(pendingRoster.map((p) => p.name.toLowerCase().trim()));
    const unique = toImport.filter((p) => !existingNames.has(p.name.toLowerCase().trim()));

    setPendingRoster((prev) => [...prev, ...unique]);
  };

  // Quick Seed Mock Players for development / staging testing
  const handleQuickSeed = () => {
    const mockNames = [
      'Marcus Rivera', 'Althea Cruz', 'Joshua Reyes', 'Bianca Santos',
      'Rafael Mendoza', 'Kyla Dizon', 'Gabriel Tan', 'Chloe Ramos',
      'Ethan Garcia', 'Jasmine Lopez', 'Christian Bautista', 'Nicole Lim'
    ];
    const seeded: OpenPlayMatchRosterItem[] = mockNames.map((name, idx) => ({
      id: `mock_${Date.now()}_${idx}`,
      name,
      duprId: `PKL${Math.floor(1000 + Math.random() * 9000)}`,
      duprRating: (3.0 + Math.random() * 1.5).toFixed(2),
      type: 'primary',
      status: 'active',
    }));
    setPendingRoster(seeded);
  };

  // Remove player from pending roster
  const handleRemoveFromRoster = (id: string) => {
    setPendingRoster((prev) => prev.filter((p) => p.id !== id));
  };

  // Submit and create new Match Matrix
  const handleCreateMatrix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matrixTitle.trim()) {
      setErrorMessage('Please enter a Match Matrix title.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const matrixId = `matrix_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const courtNames = courts.length > 0 ? courts.map((c) => c.name) : ['Court 1'];
    const courtIds = courts.map((c) => c.id);

    const newMatrixEvent: OpenPlayEvent = {
      id: matrixId,
      title: matrixTitle.trim(),
      eventDate: matrixDate,
      startTime: matrixStartTime,
      endTime: matrixEndTime,
      location: courts[0]?.location || myCompany?.address || 'PicklePoint Arena',
      category: 'Open to All',
      skillLevel: isDupr ? 'DUPR Rated Match Matrix' : 'All Skill Levels',
      description: `Match Matrix Board created on ${matrixDate}.`,
      maxParticipants: maxPlayers,
      registrationFee: 0,
      createdByUid: 'admin',
      createdByEmail: currentAdminEmail,
      createdAt: new Date().toISOString(),
      status: 'active',
      rotationRule: rotationRule || 'winners_stay',
      courtIds: courtIds,
      courtNames: courtNames,
      isDupr: isDupr,
      isMatchMatrix: true,
    };

    try {
      // 1. Save event to Firestore
      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'openplay_events', matrixId), newMatrixEvent);
        } catch (cloudErr) {
          console.warn('Firestore write warning:', cloudErr);
        }
      }

      // 2. Save roster pool to localStorage for OpenPlayMatchManagement
      if (pendingRoster.length > 0) {
        localStorage.setItem(`picklepoint_openplay_roster_${matrixId}`, JSON.stringify(pendingRoster));
      }

      // 3. Save to localMatrices
      const updatedMatrices = [newMatrixEvent, ...localMatrices];
      setLocalMatrices(updatedMatrices);
      localStorage.setItem('picklepoint_match_matrices', JSON.stringify(updatedMatrices));

      if (onRefreshEvents) onRefreshEvents();

      setIsCreateModalOpen(false);
      // Immediately launch the created matrix!
      setActiveMatrix(newMatrixEvent);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create match matrix.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Match Matrix
  const handleDeleteMatrix = async (matrixId: string) => {
    if (!window.confirm('Are you sure you want to delete this Match Matrix? All matches and scores will be removed.')) {
      return;
    }

    try {
      if (isFirebaseConfigured && db) {
        await deleteDoc(doc(db, 'openplay_events', matrixId)).catch(() => {});
        // Also cleanup matches for this matrix
        try {
          const snap = await getDocs(query(collection(db, 'openplay_matches'), where('eventId', '==', matrixId)));
          snap.forEach((d) => deleteDoc(d.ref));
        } catch {}
      }

      localStorage.removeItem(`picklepoint_openplay_roster_${matrixId}`);
      localStorage.removeItem(`picklepoint_openplay_matches_${matrixId}`);

      const updated = localMatrices.filter((m) => m.id !== matrixId);
      setLocalMatrices(updated);
      localStorage.setItem('picklepoint_match_matrices', JSON.stringify(updated));

      if (activeMatrix?.id === matrixId) setActiveMatrix(null);
      if (onRefreshEvents) onRefreshEvents();
    } catch (err) {
      console.error('Failed to delete match matrix:', err);
    }
  };

  // Convert pending roster to OpenPlayRegistration items for match management
  const registrationsForActiveMatrix = useMemo(() => {
    if (!activeMatrix) return [];
    try {
      const saved = localStorage.getItem(`picklepoint_openplay_roster_${activeMatrix.id}`);
      if (saved) {
        const roster = JSON.parse(saved) as OpenPlayMatchRosterItem[];
        return roster.map((r) => ({
          id: r.id,
          eventId: activeMatrix.id,
          playerName: r.name,
          playerEmail: '',
          duprId: r.duprId || r.adminDuprId || '',
          adminDuprId: r.adminDuprId || '',
          duprRating: r.duprRating || '',
          status: r.status === 'active' ? 'approved' : 'resting',
          paymentStatus: 'paid',
        }));
      }
    } catch (e) {}
    return [];
  }, [activeMatrix]);

  // If a matrix is active, render the comprehensive match engine!
  if (activeMatrix) {
    return (
      <div className="space-y-4 animate-fade-in text-left">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveMatrix(null)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-brand-lime" />
            <span>Back to Match Matrices</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <Grid3X3 className="w-3.5 h-3.5 text-brand-lime" /> Live Match Matrix
            </span>
          </div>
        </div>

        {/* Live Match Engine */}
        <AdminOpenPlayMatchManagement
          event={activeMatrix}
          registrations={registrationsForActiveMatrix as any}
          onBack={() => setActiveMatrix(null)}
          onNavigateToScoreboard={onNavigateToScoreboard}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
              <Grid3X3 className="w-6 h-6 text-brand-lime" />
            </div>
            <span>Match Matrix Orchestrator</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Configure multi-court tournament boards, pull rosters from past Open Play sessions, and run automated rotations with live scoring.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-brand-lime hover:bg-lime-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-brand-lime/20 cursor-pointer hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Create Match Matrix</span>
        </button>
      </div>

      {/* QUICK STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-brand-lime" /> Total Matrices
          </div>
          <div className="text-2xl font-black text-white mt-1">{allMatrices.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Play className="w-3.5 h-3.5 text-purple-400" /> Active Boards
          </div>
          <div className="text-2xl font-black text-purple-300 mt-1">
            {allMatrices.filter((m) => m.status === 'active').length}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" /> Venue Courts
          </div>
          <div className="text-2xl font-black text-amber-300 mt-1">{courts.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-cyan-400" /> Open Play Sessions
          </div>
          <div className="text-2xl font-black text-cyan-300 mt-1">{openPlayEvents.length}</div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or court..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {(['all', 'active', 'draft', 'completed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* MATRIX CARDS GRID */}
      {filteredMatrices.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
            <Grid3X3 className="w-7 h-7 text-brand-lime" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-white">No Match Matrices Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Create your first Match Matrix to organize players, run automated tournament pairings, or pull rosters from Open Play sessions.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold cursor-pointer transition-all shadow-lg shadow-purple-600/30"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Match Matrix Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filteredMatrices.map((matrix) => {
            return (
              <div
                key={matrix.id}
                className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-xl flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-extrabold uppercase tracking-wide">
                      {matrix.rotationRule === 'winners_stay' ? 'Winners Stay' : matrix.rotationRule === 'all_4_rotate' ? 'Round Robin' : 'Random Doubles'}
                    </span>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                      matrix.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : matrix.status === 'completed'
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {matrix.status}
                    </span>
                  </div>

                  {/* Title & Info */}
                  <div>
                    <h3 className="font-black text-white text-base group-hover:text-brand-lime transition-colors">
                      {matrix.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" /> {matrix.eventDate}
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-purple-400" /> {matrix.startTime}
                      </span>
                    </div>
                  </div>

                  {/* Assigned Courts */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Assigned Courts ({matrix.courtNames?.length || 1})
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(matrix.courtNames && matrix.courtNames.length > 0 ? matrix.courtNames : ['Court 1']).map((cn, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-bold text-slate-300"
                        >
                          {cn}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Player Capacity Badge */}
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                    <span className="flex items-center gap-1 font-medium">
                      <Users className="w-3.5 h-3.5 text-brand-lime" /> Max Capacity
                    </span>
                    <strong className="text-white font-bold">{matrix.maxParticipants} Players</strong>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleDeleteMatrix(matrix.id)}
                    title="Delete Matrix"
                    className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveMatrix(matrix)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-purple-600/25 transition-all cursor-pointer hover:scale-[1.02]"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Open Matrix</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: CREATE MATCH MATRIX */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in text-left overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl my-8 max-h-[90vh] flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Grid3X3 className="w-5 h-5 text-brand-lime" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Create New Match Matrix</h3>
                  <p className="text-slate-400 text-xs font-medium">
                    Configure tournament courts, player limits, and pull rosters from Open Play sessions.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateMatrix} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                  {errorMessage}
                </div>
              )}

              {/* SECTION 1: BASIC MATRIX CONFIGURATION */}
              <div className="p-4.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <div className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5 pb-2 border-b border-slate-800/80">
                  <Sparkles className="w-4 h-4 text-brand-lime" /> 1. Matrix Configuration
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 sm:col-span-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Match Matrix Title <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={matrixTitle}
                      onChange={(e) => setMatrixTitle(e.target.value)}
                      placeholder="e.g. Friday Night Doubles Matrix"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Event Date <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={matrixDate}
                      onChange={(e) => setMatrixDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 font-medium"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Max Players Capacity <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      min={4}
                      max={64}
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 16)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      DUPR Rated Session?
                    </label>
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setIsDupr(false)}
                        className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          !isDupr
                            ? 'bg-slate-800 text-white border-slate-700'
                            : 'bg-slate-950 text-slate-500 border-slate-850 hover:text-slate-300'
                        }`}
                      >
                        Non-DUPR
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDupr(true)}
                        className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isDupr
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-950 text-slate-500 border-slate-850 hover:text-slate-300'
                        }`}
                      >
                        DUPR Rated
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: ROSTER POOL BUILDER */}
              <div className="p-4.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 flex-wrap gap-2">
                  <div className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-brand-lime" /> 2. Roster Pool Management
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white px-2.5 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/40">
                      {pendingRoster.length} / {maxPlayers} Players
                    </span>
                    <button
                      type="button"
                      onClick={handleQuickSeed}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-brand-lime font-bold flex items-center gap-1 transition-colors"
                    >
                      <Zap className="w-3 h-3 text-brand-lime" /> Quick Seed 12
                    </button>
                  </div>
                </div>

                {/* Roster Source Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <button
                    type="button"
                    onClick={() => setRosterTab('pull')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      rosterTab === 'pull'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    Pull from Open Play Event
                  </button>
                  <button
                    type="button"
                    onClick={() => setRosterTab('manual')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      rosterTab === 'manual'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    Insert Players Manually
                  </button>
                </div>

                {/* TAB 1: PULL FROM OPEN PLAY */}
                {rosterTab === 'pull' && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Select Existing or Completed Open Play Event
                      </label>
                      <select
                        value={selectedSourceEventId}
                        onChange={(e) => setSelectedSourceEventId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 cursor-pointer font-medium"
                      >
                        <option value="">-- Choose an Open Play Session --</option>
                        {openPlayEvents.map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            {ev.title} ({ev.eventDate}) [{ev.status.toUpperCase()}]
                          </option>
                        ))}
                      </select>
                    </div>

                    {pulledCandidates.length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="font-bold text-white">Found {pulledCandidates.length} Attendees</span>
                          <button
                            type="button"
                            onClick={handleImportPulledRoster}
                            className="px-3 py-1.5 rounded-lg bg-brand-lime text-slate-950 font-black text-xs uppercase tracking-wider hover:bg-lime-400 transition-colors cursor-pointer"
                          >
                            + Import to Matrix ({pulledCandidates.length})
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                          {pulledCandidates.map((c) => (
                            <div
                              key={c.id}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between"
                            >
                              <span className="truncate">{c.name}</span>
                              {c.duprId && <span className="text-[9px] text-brand-lime font-bold">{c.duprId}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: INSERT MANUALLY */}
                {rosterTab === 'manual' && (
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3.5 animate-fade-in shadow-inner">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-purple-400" /> Add Walk-in or Custom Player
                      </span>
                      <span className="text-[10px] text-slate-500">Press Enter in any field to add quickly</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Name Field */}
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <User className="w-3 h-3 text-brand-lime" /> Full Name <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Juan dela Cruz"
                          value={manualPlayerName}
                          onChange={(e) => setManualPlayerName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddManualPlayer();
                            }
                          }}
                          className="w-full bg-slate-950 border border-slate-700/80 focus:border-brand-lime text-white rounded-xl px-3.5 py-2 text-xs placeholder-slate-500 focus:outline-none transition-all font-medium"
                        />
                      </div>

                      {/* DUPR ID Field */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-amber-400" /> DUPR ID (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. RGDK2E"
                          value={manualPlayerDupr}
                          onChange={(e) => setManualPlayerDupr(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddManualPlayer();
                            }
                          }}
                          className="w-full bg-slate-950 border border-slate-700/80 focus:border-amber-400 text-amber-300 font-mono rounded-xl px-3.5 py-2 text-xs placeholder-slate-500 focus:outline-none uppercase transition-all"
                        />
                      </div>

                      {/* Rating Field */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400" /> Rating (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 3.5"
                          value={manualPlayerRating}
                          onChange={(e) => setManualPlayerRating(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddManualPlayer();
                            }
                          }}
                          className="w-full bg-slate-950 border border-slate-700/80 focus:border-purple-400 text-white rounded-xl px-3.5 py-2 text-xs placeholder-slate-500 focus:outline-none transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-bold">Quick Skill:</span>
                        {['Beginner (2.0-2.5)', 'Intermediate (3.0-3.5)', 'Advanced (4.0+)'].map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => {
                              setManualPlayerSkill(lvl);
                              const defaultRate = lvl.includes('2.0') ? '2.5' : lvl.includes('3.0') ? '3.5' : '4.2';
                              if (!manualPlayerRating) setManualPlayerRating(defaultRate);
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                              manualPlayerSkill === lvl
                                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                            }`}
                          >
                            {lvl.split(' ')[0]}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleAddManualPlayer}
                        disabled={!manualPlayerName.trim()}
                        className="px-4 py-2 rounded-xl bg-brand-lime hover:bg-lime-400 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Add Player</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* CURRENT PENDING ROSTER TABLE */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-brand-lime" /> Active Matrix Roster ({pendingRoster.length} of {maxPlayers} Players)
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        These players will be automatically paired into matches upon matrix launch.
                      </p>
                    </div>

                    {pendingRoster.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPendingRoster([])}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-bold hover:underline cursor-pointer"
                      >
                        Clear All ({pendingRoster.length})
                      </button>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-950 rounded-full h-1.5 border border-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        pendingRoster.length >= maxPlayers ? 'bg-emerald-400' : 'bg-brand-lime'
                      }`}
                      style={{ width: `${Math.min(100, (pendingRoster.length / (maxPlayers || 16)) * 100)}%` }}
                    />
                  </div>

                  {pendingRoster.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center text-xs text-slate-500 space-y-1">
                      <Users className="w-6 h-6 text-slate-600 mx-auto" />
                      <div className="font-bold text-slate-400">No players in roster pool yet</div>
                      <div className="text-[11px] text-slate-500">
                        Pull attendees from an Open Play session above, or insert walk-in players manually.
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                      {pendingRoster.map((player, idx) => {
                        const initials = player.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() || 'P';

                        return (
                          <div
                            key={player.id || idx}
                            className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs flex items-center justify-between gap-2.5 group shadow-xs transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-black text-xs flex items-center justify-center shrink-0">
                                {initials}
                              </div>
                              <div className="truncate min-w-0">
                                <div className="font-bold text-white truncate text-xs flex items-center gap-1.5">
                                  <span className="truncate">{player.name}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                                  {player.duprId ? (
                                    <span className="font-mono text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                      {player.duprId}
                                    </span>
                                  ) : null}
                                  {player.duprRating ? (
                                    <span className="font-mono text-[9px] px-1 py-0.2 rounded font-bold bg-brand-lime/10 text-brand-lime border border-brand-lime/30">
                                      ⭐ {player.duprRating}
                                    </span>
                                  ) : null}
                                  <span className="text-[9px] text-slate-500 capitalize">
                                    {player.skillLevel?.split(' ')[0] || player.type}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveFromRoster(player.id)}
                              title="Remove player from matrix"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !matrixTitle.trim()}
                  className="px-5 py-2.5 rounded-xl bg-brand-lime hover:bg-lime-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-brand-lime/20 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Create & Launch Matrix</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMatchMatrixTab;
