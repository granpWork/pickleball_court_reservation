import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Trophy,
  Users,
  Building2,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  CheckCircle2,
  Search,
  Check,
  X,
  Zap,
  BarChart2,
  Download,
  Copy,
  RotateCcw,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../firebase';
import { type OpenPlayEvent } from '../../OpenPlayDetails';
import { type OpenPlayRegistrationItem } from './AdminOpenPlayTab';
import {
  type OpenPlayMatch,
  type OpenPlayMatchPlayer,
  type OpenPlayMatchRosterItem,
  type PlayerMatchStats,
} from '../adminTypes';

const parseTimeToMinutes = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const trimmed = timeStr.trim();
  let h = 0;
  let m = 0;
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    h = parseInt(parts[0], 10) || 0;
    m = parseInt(parts[1]?.substring(0, 2) || '0', 10) || 0;
    if (trimmed.toLowerCase().includes('pm') && h < 12) h += 12;
    if (trimmed.toLowerCase().includes('am') && h === 12) h = 0;
  }
  return h * 60 + m;
};

const calculateSessionDurationMinutes = (startTime?: string, endTime?: string): number => {
  if (!startTime || !endTime) return 240; // Default 4 hours (240 mins)
  const startMins = parseTimeToMinutes(startTime);
  let endMins = parseTimeToMinutes(endTime);
  if (endMins <= startMins) endMins += 24 * 60;
  const diff = endMins - startMins;
  return diff > 0 ? diff : 240;
};

interface AdminOpenPlayMatchManagementProps {
  event: OpenPlayEvent;
  registrations: OpenPlayRegistrationItem[];
  onBack: () => void;
  onNavigateToScoreboard?: (match: OpenPlayMatch) => void;
}

export const AdminOpenPlayMatchManagement: React.FC<AdminOpenPlayMatchManagementProps> = ({
  event,
  registrations,
  onBack,
}) => {
  // Assigned courts fallback
  const assignedCourts = useMemo(() => {
    if (event.courtNames && event.courtNames.length > 0) {
      return event.courtNames;
    }
    return ['Court 1'];
  }, [event.courtNames]);

  // Match list state
  const [matches, setMatches] = useState<OpenPlayMatch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Roster Pool State
  const [rosterPool, setRosterPool] = useState<OpenPlayMatchRosterItem[]>([]);

  // Filter States
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'completed' | 'active'>('all');
  const [selectedCourtFilter, setSelectedCourtFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isAutoGenModalOpen, setIsAutoGenModalOpen] = useState<boolean>(false);
  const [autoGenAlgorithm, setAutoGenAlgorithm] = useState<'individual_scramble' | 'random_rotational'>('individual_scramble');
  const [autoGenRounds, setAutoGenRounds] = useState<number>(24);
  const [autoGenGameType, setAutoGenGameType] = useState<'doubles' | 'singles'>('doubles');
  const [autoGenTargetPoints, setAutoGenTargetPoints] = useState<number>(11);

  // Paddle Rack Queue State
  const [paddleRackQueue, setPaddleRackQueue] = useState<OpenPlayMatchRosterItem[]>([]);

  // Auto-Gen Math Formula Inputs & Calculation
  const [targetGamesPerPlayer, setTargetGamesPerPlayer] = useState<number>(8);
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState<number>(() =>
    calculateSessionDurationMinutes(event.startTime, event.endTime)
  );

  // Dynamic Formula Math Calculation:
  // 1. Total Matches = (P players * G games) / K players per match
  // 2. Total Rounds = ceil(Total Matches / C courts)
  // 3. Est Time per Match = D minutes / Total Rounds
  const formulaMath = useMemo(() => {
    const activeFromPool = rosterPool.filter((p) => p.status === 'active');
    const activeCount = paddleRackQueue.length > 0
      ? paddleRackQueue.filter((p) => p.status === 'active').length
      : activeFromPool.length || 12;

    const playersPerMatch = autoGenGameType === 'doubles' ? 4 : 2;
    const courtCount = assignedCourts.length || 1;

    // Total matches required = (P * G) / K
    const totalMatches = Math.ceil((activeCount * targetGamesPerPlayer) / playersPerMatch);

    // Total rounds needed = ceil(Total Matches / Courts)
    const calculatedRounds = Math.max(1, Math.ceil(totalMatches / courtCount));

    // Est. minutes per match = Duration / Total Rounds
    const duration = sessionDurationMinutes > 0 ? sessionDurationMinutes : 240;
    const timePerMatch = Math.round(duration / calculatedRounds);

    const isFastPaced = timePerMatch <= 10;

    return {
      activeCount,
      playersPerMatch,
      courtCount,
      totalMatches,
      calculatedRounds,
      timePerMatch,
      isFastPaced,
    };
  }, [rosterPool, paddleRackQueue, autoGenGameType, assignedCourts, targetGamesPerPlayer, sessionDurationMinutes]);

  // Synchronize autoGenRounds with formulaMath.calculatedRounds
  useEffect(() => {
    setAutoGenRounds(formulaMath.calculatedRounds);
  }, [formulaMath.calculatedRounds]);

  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [editingMatch, setEditingMatch] = useState<OpenPlayMatch | null>(null);
  const [manualRound, setManualRound] = useState<number>(1);
  const [manualCourt, setManualCourt] = useState<string>(assignedCourts[0] || 'Court 1');
  const [manualGameType, setManualGameType] = useState<'doubles' | 'singles'>('doubles');
  const [manualTargetPoints, setManualTargetPoints] = useState<number>(11);
  const [selectedRedPlayers, setSelectedRedPlayers] = useState<string[]>([]);
  const [selectedBluePlayers, setSelectedBluePlayers] = useState<string[]>([]);

  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false);
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [newPlayerSkill, setNewPlayerSkill] = useState<string>('Intermediate');
  const [newPlayerDuprId, setNewPlayerDuprId] = useState<string>('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportSortField, setReportSortField] = useState<'matches' | 'winRate' | 'pointDiff' | 'name'>('matches');

  // Delete Confirmation Modal State
  const [deletingMatch, setDeletingMatch] = useState<OpenPlayMatch | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Compute Per-Player Match Statistics
  const playerStatsList = useMemo<PlayerMatchStats[]>(() => {
    return rosterPool.map((player) => {
      let totalMatches = 0;
      let completedMatches = 0;
      let wins = 0;
      let losses = 0;
      let ties = 0;
      let pointsScored = 0;
      let pointsConceded = 0;
      const courtsBreakdown: Record<string, number> = {};

      matches.forEach((m) => {
        const isRed = m.teamRed.players.some((p) => p.id === player.id);
        const isBlue = m.teamBlue.players.some((p) => p.id === player.id);

        if (isRed || isBlue) {
          totalMatches++;
          courtsBreakdown[m.courtName] = (courtsBreakdown[m.courtName] || 0) + 1;

          if (isRed) {
            pointsScored += m.teamRed.score;
            pointsConceded += m.teamBlue.score;
          } else {
            pointsScored += m.teamBlue.score;
            pointsConceded += m.teamRed.score;
          }

          if (m.status === 'completed') {
            completedMatches++;
            if (m.winner === 'tie') {
              ties++;
            } else if ((isRed && m.winner === 'red') || (isBlue && m.winner === 'blue')) {
              wins++;
            } else if ((isRed && m.winner === 'blue') || (isBlue && m.winner === 'red')) {
              losses++;
            }
          }
        }
      });

      const winRate = completedMatches > 0 ? Math.round((wins / completedMatches) * 100) : 0;
      const pointDiff = pointsScored - pointsConceded;

      return {
        playerId: player.id,
        playerName: player.name,
        playerType: player.type,
        totalMatches,
        completedMatches,
        wins,
        losses,
        ties,
        winRate,
        pointsScored,
        pointsConceded,
        pointDiff,
        courtsBreakdown,
      };
    });
  }, [rosterPool, matches]);

  // Export CSV Report Helper
  const handleExportReportCSV = () => {
    const headers = [
      'Player Name',
      'Type',
      'Total Matches Assigned',
      'Completed Games',
      'Wins',
      'Losses',
      'Ties',
      'Win Rate (%)',
      'Points Scored',
      'Points Conceded',
      'Point Diff',
      'Courts Breakdown',
    ];

    const rows = playerStatsList.map((s) => [
      `"${s.playerName.replace(/"/g, '""')}"`,
      s.playerType,
      s.totalMatches,
      s.completedMatches,
      s.wins,
      s.losses,
      s.ties,
      `${s.winRate}%`,
      s.pointsScored,
      s.pointsConceded,
      s.pointDiff >= 0 ? `+${s.pointDiff}` : `${s.pointDiff}`,
      `"${Object.entries(s.courtsBreakdown).map(([c, count]) => `${c}: ${count}x`).join('; ')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = (event.title || 'openplay').toLowerCase().replace(/[^a-z0-9]/g, '_');
    link.setAttribute('href', url);
    link.setAttribute('download', `openplay_player_report_${safeTitle}_${event.eventDate || 'stats'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📊 CSV Player Report downloaded!');
  };

  // Copy Summary Text
  const handleCopyReportText = () => {
    let summary = `🏆 OPEN PLAY PLAYER MATCH REPORT - ${event.title} (${event.eventDate})\n`;
    summary += `Total Active Roster: ${rosterPool.length} | Total Matches: ${matches.length}\n`;
    summary += `--------------------------------------------------------\n`;
    playerStatsList.forEach((s) => {
      summary += `${s.playerName}: ${s.totalMatches} Matches | ${s.wins}W - ${s.losses}L (${s.winRate}%) | Diff: ${s.pointDiff >= 0 ? '+' : ''}${s.pointDiff}\n`;
    });

    try {
      navigator.clipboard.writeText(summary);
      showToast('📋 Player report summary copied to clipboard!');
    } catch (e) {
      showToast('Failed to copy to clipboard.');
    }
  };

  // Build default roster pool from active registrations
  useEffect(() => {
    const eventRegs = registrations.filter(
      (r) => r.eventId === event.id && r.status !== 'cancelled' && r.status !== 'waitlisted'
    );

    const initialPool: OpenPlayMatchRosterItem[] = [];

    eventRegs.forEach((reg) => {
      const primaryName = reg.playerName || reg.userName || 'Player';
      const primaryEmail = reg.playerEmail || reg.userEmail || '';
      const primaryPhone = reg.playerPhone || reg.userPhone || '';
      const primaryPhoto = (reg as any).photoUrl || (reg as any).userPhoto;

      const isAddGuestOnly = reg.isAddGuestOnly === true || (reg as any).isAddGuestOnly === true;

      const duprId = reg.duprId || (reg as any).user?.duprId || '';
      const adminDuprId = reg.adminDuprId || '';
      const duprRating = reg.duprRating || (reg as any).user?.duprRating || '';
      const adminDuprRating = reg.adminDuprRating || '';

      if (!isAddGuestOnly) {
        initialPool.push({
          id: `${reg.id}-primary`,
          name: primaryName,
          email: primaryEmail,
          phone: primaryPhone,
          photoUrl: primaryPhoto,
          type: 'primary',
          status: 'active',
          skillLevel: event.skillLevel || 'Intermediate',
          duprId,
          adminDuprId,
          duprRating,
          adminDuprRating,
        });
      }

      const spots = reg.playerCount || 1;
      const numGuests = isAddGuestOnly
        ? Math.max(reg.guests?.length || 0, reg.guestNames?.length || 0, spots || 1)
        : Math.max(reg.guests?.length || 0, reg.guestNames?.length || 0, spots > 1 ? spots - 1 : 0);
      const hostName = reg.primaryPlayerName || primaryName;

      for (let gIdx = 0; gIdx < numGuests; gIdx++) {
        const gName = reg.guests?.[gIdx]?.name || reg.guestNames?.[gIdx] || `Guest #${gIdx + 1} (${hostName})`;
        const gEmail = reg.guests?.[gIdx]?.email || reg.guestEmails?.[gIdx] || '';
        initialPool.push({
          id: `${reg.id}-guest-${gIdx}`,
          name: gName,
          email: gEmail,
          phone: primaryPhone,
          photoUrl: (reg.guests?.[gIdx] as any)?.photoUrl || primaryPhoto,
          type: 'guest',
          status: 'active',
          skillLevel: event.skillLevel || 'Intermediate',
          duprId: (reg.guests?.[gIdx] as any)?.duprId || '',
          adminDuprId: (reg.guests?.[gIdx] as any)?.adminDuprId || '',
          duprRating: (reg.guests?.[gIdx] as any)?.duprRating || '',
          adminDuprRating: (reg.guests?.[gIdx] as any)?.adminDuprRating || '',
        });
      }
    });

    // Check if custom roster stored in localStorage
    try {
      const savedRosterStr = localStorage.getItem(`picklepoint_openplay_roster_${event.id}`);
      if (savedRosterStr) {
        const savedRoster = JSON.parse(savedRosterStr) as OpenPlayMatchRosterItem[];
        // Merge extra custom players added manually
        const existingIds = new Set(initialPool.map((p) => p.id));
        savedRoster.forEach((sp) => {
          if (!existingIds.has(sp.id)) {
            initialPool.push(sp);
          } else {
            // Restore status
            const found = initialPool.find((p) => p.id === sp.id);
            if (found) found.status = sp.status;
          }
        });
      }
    } catch (e) {
      console.warn('Failed to load roster from localStorage:', e);
    }

    setRosterPool(initialPool);
    setPaddleRackQueue(initialPool.filter((p) => p.status === 'active'));
  }, [event.id, registrations, event.skillLevel]);

  // Keep Paddle Rack Queue synced with active players in roster pool
  useEffect(() => {
    setPaddleRackQueue((prev) => {
      const activeFromPool = rosterPool.filter((p) => p.status === 'active');
      if (prev.length === 0) return activeFromPool;
      // Filter out players no longer active
      const activeIds = new Set(activeFromPool.map((p) => p.id));
      const filteredPrev = prev.filter((p) => activeIds.has(p.id));
      // Append any new active players not yet in queue
      const existingIds = new Set(filteredPrev.map((p) => p.id));
      const newlyAdded = activeFromPool.filter((p) => !existingIds.has(p.id));
      return [...filteredPrev, ...newlyAdded];
    });
  }, [rosterPool]);



  // Save roster pool status changes to localStorage
  const saveRosterPool = (updated: OpenPlayMatchRosterItem[]) => {
    setRosterPool(updated);
    try {
      localStorage.setItem(`picklepoint_openplay_roster_${event.id}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save roster pool:', e);
    }
  };

  // Fetch Matches from Firestore / LocalStorage
  useEffect(() => {
    let isMounted = true;
    const fetchMatches = async () => {
      setIsLoading(true);
      const matchMap = new Map<string, OpenPlayMatch>();

      // LocalStorage first
      try {
        const localData = localStorage.getItem(`picklepoint_openplay_matches_${event.id}`);
        if (localData) {
          const parsed = JSON.parse(localData) as OpenPlayMatch[];
          parsed.forEach((m) => matchMap.set(m.id, m));
        }
      } catch (e) {
        console.warn('Failed to read matches from localStorage:', e);
      }

      // Firestore check
      if (isFirebaseConfigured && db) {
        try {
          const q = query(collection(db, 'openplay_matches'), where('eventId', '==', event.id));
          const snap = await getDocs(q);
          snap.forEach((docSnap) => {
            const data = docSnap.data() as OpenPlayMatch;
            matchMap.set(docSnap.id, { ...data, id: docSnap.id });
          });
        } catch (err) {
          console.warn('Failed to fetch openplay matches from Firestore:', err);
        }
      }

      if (isMounted) {
        const matchArray = Array.from(matchMap.values()).sort((a, b) => {
          if (a.round !== b.round) return a.round - b.round;
          return a.courtName.localeCompare(b.courtName);
        });
        setMatches(matchArray);
        setIsLoading(false);
      }
    };

    fetchMatches();
    return () => {
      isMounted = false;
    };
  }, [event.id]);

  // Save matches helper
  const persistMatches = async (updatedMatches: OpenPlayMatch[]) => {
    setMatches(updatedMatches);
    try {
      localStorage.setItem(`picklepoint_openplay_matches_${event.id}`, JSON.stringify(updatedMatches));
    } catch (e) {
      console.warn('Failed to save matches to localStorage:', e);
    }

    if (isFirebaseConfigured && db) {
      try {
        for (const m of updatedMatches) {
          await setDoc(doc(db, 'openplay_matches', m.id), m);
        }
      } catch (err) {
        console.warn('Failed to save openplay matches to Firestore:', err);
      }
    }
  };

  const persistSingleMatch = async (match: OpenPlayMatch) => {
    setMatches((prev) => {
      const idx = prev.findIndex((m) => m.id === match.id);
      let updated: OpenPlayMatch[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = match;
      } else {
        updated = [...prev, match];
      }
      updated.sort((a, b) => {
        if (a.round !== b.round) return a.round - b.round;
        return a.courtName.localeCompare(b.courtName);
      });
      try {
        localStorage.setItem(`picklepoint_openplay_matches_${event.id}`, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save match to localStorage:', e);
      }
      return updated;
    });

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'openplay_matches', match.id), match);
      } catch (err) {
        console.warn('Failed to save single match to Firestore:', err);
      }
    }
  };

  const deleteMatch = async (matchId: string) => {
    const updated = matches.filter((m) => m.id !== matchId);
    setMatches(updated);
    try {
      localStorage.setItem(`picklepoint_openplay_matches_${event.id}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to delete match from localStorage:', e);
    }

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'openplay_matches', matchId));
      } catch (err) {
        console.warn('Failed to delete match from Firestore:', err);
      }
    }
    showToast('Match removed.');
  };

  const clearAllMatches = async () => {
    if (!window.confirm('Are you sure you want to clear all matches for this Open Play event?')) return;
    setMatches([]);
    try {
      localStorage.removeItem(`picklepoint_openplay_matches_${event.id}`);
    } catch (e) {}

    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(query(collection(db, 'openplay_matches'), where('eventId', '==', event.id)));
        for (const d of snap.docs) {
          await deleteDoc(doc(db, 'openplay_matches', d.id));
        }
      } catch (e) {}
    }
    showToast('All matches cleared.');
  };

  // Inline Court Reassignment
  const handleInlineCourtChange = (matchId: string, newCourt: string) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;
    const updated: OpenPlayMatch = {
      ...match,
      courtName: newCourt,
      updatedAt: new Date().toISOString(),
    };
    persistSingleMatch(updated);
    showToast(`Match court updated to ${newCourt}`);
  };

  // Score Updater
  const updateMatchScore = (matchId: string, team: 'red' | 'blue', delta: number) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    const newRedScore = team === 'red' ? Math.max(0, match.teamRed.score + delta) : match.teamRed.score;
    const newBlueScore = team === 'blue' ? Math.max(0, match.teamBlue.score + delta) : match.teamBlue.score;

    let winner: 'red' | 'blue' | 'tie' | undefined = match.winner;
    let status: 'scheduled' | 'in_progress' | 'completed' = match.status;

    if (status !== 'completed' && (newRedScore > 0 || newBlueScore > 0)) {
      status = 'in_progress';
    }

    if (status === 'completed') {
      if (newRedScore > newBlueScore) winner = 'red';
      else if (newBlueScore > newRedScore) winner = 'blue';
      else winner = 'tie';
    }

    const updated: OpenPlayMatch = {
      ...match,
      status,
      winner,
      teamRed: { ...match.teamRed, score: newRedScore },
      teamBlue: { ...match.teamBlue, score: newBlueScore },
      updatedAt: new Date().toISOString(),
    };

    persistSingleMatch(updated);
  };

  // Complete Match Action
  const handleCompleteMatch = (matchId: string) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    const redScore = match.teamRed.score;
    const blueScore = match.teamBlue.score;

    let winner: 'red' | 'blue' | 'tie' = 'tie';
    if (redScore > blueScore) winner = 'red';
    else if (blueScore > redScore) winner = 'blue';

    const winnerName =
      winner === 'red'
        ? match.teamRed.players.map((p) => p.name).join(' & ') || 'Team Red'
        : winner === 'blue'
        ? match.teamBlue.players.map((p) => p.name).join(' & ') || 'Team Blue'
        : 'Tied Game';

    const updated: OpenPlayMatch = {
      ...match,
      status: 'completed',
      winner,
      updatedAt: new Date().toISOString(),
    };

    persistSingleMatch(updated);
    showToast(
      winner === 'tie'
        ? `🤝 Match marked as Completed! (Tie ${redScore}-${blueScore})`
        : `🏆 Match Completed! Winner: ${winnerName} (${redScore}-${blueScore})`
    );
  };

  // Reopen Match Action
  const handleReopenMatch = (matchId: string) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    const updated: OpenPlayMatch = {
      ...match,
      status: 'in_progress',
      winner: undefined,
      wasReopened: true,
      updatedAt: new Date().toISOString(),
    };

    persistSingleMatch(updated);
    showToast('Match reopened for editing.');
  };

  // Auto Generation Algorithm (Individual Round Robin Scramble vs Random Matrix)
  const handleGenerateMatches = () => {
    const activeFromPool = rosterPool.filter((p) => p.status === 'active');
    const activePlayers = paddleRackQueue.length > 0
      ? paddleRackQueue.filter((p) => p.status === 'active')
      : activeFromPool;

    const playersPerMatch = autoGenGameType === 'doubles' ? 4 : 2;

    if (activePlayers.length < playersPerMatch) {
      alert(`You need at least ${playersPerMatch} active players in the roster pool to generate ${autoGenGameType} matches.`);
      return;
    }

    const newMatches: OpenPlayMatch[] = [];
    const courtCount = assignedCourts.length;

    if (autoGenAlgorithm === 'individual_scramble') {
      // CONTINUOUS PADDLE RACK QUEUE & 1&4 vs 2&3 PAIRING SPLIT RULE
      let queue = [...activePlayers];

      for (let r = 1; r <= autoGenRounds; r++) {
        for (let cIdx = 0; cIdx < courtCount; cIdx++) {
          if (queue.length < playersPerMatch) break;
          const courtName = assignedCourts[cIdx] || `Court ${cIdx + 1}`;

          if (autoGenGameType === 'doubles') {
            // Pull top 4 from front of queue: [P1, P2, P3, P4]
            const p1 = queue.shift()!;
            const p2 = queue.shift()!;
            const p3 = queue.shift()!;
            const p4 = queue.shift()!;

            // 1 & 4 vs 2 & 3 Pairing Split Rule:
            // Team Red = [P1, P4] (1st & 4th in queue)
            // Team Blue = [P2, P3] (2nd & 3rd in queue)
            const teamRedPlayers: OpenPlayMatchPlayer[] = [
              { id: p1.id, name: p1.name, photoUrl: p1.photoUrl, skillLevel: p1.skillLevel },
              { id: p4.id, name: p4.name, photoUrl: p4.photoUrl, skillLevel: p4.skillLevel },
            ];
            const teamBluePlayers: OpenPlayMatchPlayer[] = [
              { id: p2.id, name: p2.name, photoUrl: p2.photoUrl, skillLevel: p2.skillLevel },
              { id: p3.id, name: p3.name, photoUrl: p3.photoUrl, skillLevel: p3.skillLevel },
            ];

            // Return all 4 players to the back of the queue in rotated order
            queue.push(p1, p4, p2, p3);

            const matchId = `op-scramble-${event.id}-r${r}-c${cIdx + 1}-${Date.now()}`;
            newMatches.push({
              id: matchId,
              eventId: event.id,
              round: r,
              courtName,
              gameType: 'doubles',
              targetPoints: autoGenTargetPoints,
              status: 'scheduled',
              teamRed: { players: teamRedPlayers, score: 0 },
              teamBlue: { players: teamBluePlayers, score: 0 },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          } else {
            // Singles (1v1): Pull top 2
            const p1 = queue.shift()!;
            const p2 = queue.shift()!;

            const teamRedPlayers: OpenPlayMatchPlayer[] = [
              { id: p1.id, name: p1.name, photoUrl: p1.photoUrl, skillLevel: p1.skillLevel },
            ];
            const teamBluePlayers: OpenPlayMatchPlayer[] = [
              { id: p2.id, name: p2.name, photoUrl: p2.photoUrl, skillLevel: p2.skillLevel },
            ];

            queue.push(p1, p2);

            const matchId = `op-scramble-${event.id}-r${r}-c${cIdx + 1}-${Date.now()}`;
            newMatches.push({
              id: matchId,
              eventId: event.id,
              round: r,
              courtName,
              gameType: 'singles',
              targetPoints: autoGenTargetPoints,
              status: 'scheduled',
              teamRed: { players: teamRedPlayers, score: 0 },
              teamBlue: { players: teamBluePlayers, score: 0 },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      setPaddleRackQueue(queue);
    } else {
      // Random Rotational Matrix
      let availablePool = [...activePlayers];
      for (let r = 1; r <= autoGenRounds; r++) {
        const shuffled = [...availablePool].sort(() => Math.random() - 0.5);
        const matchesInRound = Math.floor(shuffled.length / playersPerMatch);

        for (let m = 0; m < matchesInRound; m++) {
          const courtName = assignedCourts[m % courtCount] || `Court ${(m % courtCount) + 1}`;
          const matchPlayers = shuffled.slice(m * playersPerMatch, (m + 1) * playersPerMatch);

          let teamRedPlayers: OpenPlayMatchPlayer[] = [];
          let teamBluePlayers: OpenPlayMatchPlayer[] = [];

          if (autoGenGameType === 'doubles') {
            teamRedPlayers = matchPlayers.slice(0, 2).map((p) => ({ id: p.id, name: p.name, photoUrl: p.photoUrl, skillLevel: p.skillLevel }));
            teamBluePlayers = matchPlayers.slice(2, 4).map((p) => ({ id: p.id, name: p.name, photoUrl: p.photoUrl, skillLevel: p.skillLevel }));
          } else {
            teamRedPlayers = [matchPlayers[0]].map((p) => ({ id: p.id, name: p.name, photoUrl: p.photoUrl, skillLevel: p.skillLevel }));
            teamBluePlayers = [matchPlayers[1]].map((p) => ({ id: p.id, name: p.name, photoUrl: p.photoUrl, skillLevel: p.skillLevel }));
          }

          const matchId = `op-match-${event.id}-r${r}-m${m + 1}-${Date.now()}`;
          newMatches.push({
            id: matchId,
            eventId: event.id,
            round: r,
            courtName,
            gameType: autoGenGameType,
            targetPoints: autoGenTargetPoints,
            status: 'scheduled',
            teamRed: { players: teamRedPlayers, score: 0 },
            teamBlue: { players: teamBluePlayers, score: 0 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    const combined = [...matches, ...newMatches];
    persistMatches(combined);
    setIsAutoGenModalOpen(false);
    showToast(
      autoGenAlgorithm === 'individual_scramble'
        ? `⚡ Individual Scramble: Generated ${newMatches.length} matches (1&4 vs 2&3 split) across ${courtCount} assigned court(s)!`
        : `⚡ Generated ${newMatches.length} matches across ${courtCount} assigned court(s)!`
    );
  };

  // Manual Match Save
  const handleSaveManualMatch = () => {
    const reqPlayers = manualGameType === 'doubles' ? 2 : 1;
    if (selectedRedPlayers.length !== reqPlayers || selectedBluePlayers.length !== reqPlayers) {
      alert(`For ${manualGameType}, please select exactly ${reqPlayers} player(s) for Team Red and ${reqPlayers} player(s) for Team Blue.`);
      return;
    }

    const mapPlayers = (ids: string[]): OpenPlayMatchPlayer[] => {
      return ids.map((id) => {
        const item = rosterPool.find((p) => p.id === id);
        return {
          id,
          name: item ? item.name : 'Player',
          photoUrl: item?.photoUrl,
          skillLevel: item?.skillLevel,
        };
      });
    };

    const redList = mapPlayers(selectedRedPlayers);
    const blueList = mapPlayers(selectedBluePlayers);

    if (editingMatch) {
      const updated: OpenPlayMatch = {
        ...editingMatch,
        round: manualRound,
        courtName: manualCourt,
        gameType: manualGameType,
        targetPoints: manualTargetPoints,
        teamRed: { ...editingMatch.teamRed, players: redList },
        teamBlue: { ...editingMatch.teamBlue, players: blueList },
        updatedAt: new Date().toISOString(),
      };
      persistSingleMatch(updated);
      showToast('Match updated.');
    } else {
      const matchId = `op-match-manual-${Date.now()}`;
      const newMatch: OpenPlayMatch = {
        id: matchId,
        eventId: event.id,
        round: manualRound,
        courtName: manualCourt,
        gameType: manualGameType,
        targetPoints: manualTargetPoints,
        status: 'scheduled',
        teamRed: { players: redList, score: 0 },
        teamBlue: { players: blueList, score: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      persistSingleMatch(newMatch);
      showToast('New match created.');
    }

    setIsManualModalOpen(false);
    setEditingMatch(null);
    setSelectedRedPlayers([]);
    setSelectedBluePlayers([]);
  };

  // Open Edit Modal
  const openEditModal = (match: OpenPlayMatch) => {
    setEditingMatch(match);
    setManualRound(match.round);
    setManualCourt(match.courtName);
    setManualGameType(match.gameType);
    setManualTargetPoints(match.targetPoints);
    setSelectedRedPlayers(match.teamRed.players.map((p) => p.id));
    setSelectedBluePlayers(match.teamBlue.players.map((p) => p.id));
    setIsManualModalOpen(true);
  };

  // Add custom player to roster pool
  const handleAddCustomPlayer = () => {
    if (!newPlayerName.trim()) return;
    const newId = `custom-player-${Date.now()}`;
    const newItem: OpenPlayMatchRosterItem = {
      id: newId,
      name: newPlayerName.trim(),
      type: 'guest',
      status: 'active',
      skillLevel: newPlayerSkill,
      adminDuprId: newPlayerDuprId.trim() || undefined,
    };
    const updated = [...rosterPool, newItem];
    saveRosterPool(updated);
    setNewPlayerName('');
    setNewPlayerDuprId('');
    showToast(`Added ${newItem.name} to player pool.`);
  };

  // Toggle player roster status
  const togglePlayerStatus = (id: string) => {
    const updated = rosterPool.map((p) => {
      if (p.id === id) {
        const nextStatus: 'active' | 'resting' | 'absent' =
          p.status === 'active' ? 'resting' : p.status === 'resting' ? 'absent' : 'active';
        return { ...p, status: nextStatus };
      }
      return p;
    });
    saveRosterPool(updated);
  };



  // Filtered Matches
  const filteredMatches = matches.filter((m) => {
    if (selectedStatusFilter === 'completed' && m.status !== 'completed') return false;
    if (selectedStatusFilter === 'active' && m.status === 'completed') return false;
    if (selectedCourtFilter !== 'all' && m.courtName !== selectedCourtFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCourt = m.courtName.toLowerCase();
      const redNames = m.teamRed.players.map((p) => p.name.toLowerCase()).join(' ');
      const blueNames = m.teamBlue.players.map((p) => p.name.toLowerCase()).join(' ');
      return matchCourt.includes(q) || redNames.includes(q) || blueNames.includes(q);
    }
    return true;
  });

  // Calculate distinct rounds
  const availableRounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);
  const activeCount = rosterPool.filter((p) => p.status === 'active').length;
  const restingCount = rosterPool.filter((p) => p.status === 'resting').length;
  const completedCount = matches.filter((m) => m.status === 'completed').length;
  const liveCount = matches.filter((m) => m.status === 'in_progress').length;

  return (
    <div className="animate-fade-in space-y-6 text-left pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-brand-lime/15 border border-brand-lime/40 text-brand-lime text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-lime" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Navigation & Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-all text-xs font-black uppercase tracking-wider cursor-pointer bg-slate-900 border border-slate-700 hover:border-brand-lime px-4 py-2.5 rounded-2xl shadow-md hover:scale-[1.01]"
        >
          <ArrowLeft className="w-4 h-4 text-brand-lime" /> Back to Session Details
        </button>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <Trophy className="w-3.5 h-3.5 text-purple-400" /> Open Play Match Matrix
          </span>
        </div>
      </div>

      {/* Hero Header & Assigned Courts Info */}
      <div className="glass-panel border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl space-y-4 bg-slate-900/60">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-brand-lime font-mono uppercase tracking-wider font-bold">
              {event.category || 'Open Play'} • Match Management
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-0.5">
              {event.title}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              📅 {event.eventDate} ({event.startTime} - {event.endTime}) • {event.location || 'Venue Location'}
            </p>
          </div>

          {/* Assigned Courts Badges */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 text-left md:text-right shrink-0 space-y-1">
            <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider block">
              Assigned Courts ({assignedCourts.length})
            </span>
            <div className="flex items-center gap-1.5 flex-wrap md:justify-end">
              {assignedCourts.map((court, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-xs font-extrabold flex items-center gap-1"
                >
                  <Building2 className="w-3 h-3 text-brand-lime" />
                  {court}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-3 text-left">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Total Matches</span>
            <span className="text-xl font-black text-white font-mono">{matches.length}</span>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-3 text-left">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Live Matches</span>
            <span className="text-xl font-black text-blue-400 font-mono">{liveCount}</span>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-3 text-left">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Completed</span>
            <span className="text-xl font-black text-brand-lime font-mono">{completedCount}</span>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-3 text-left">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Roster Pool</span>
            <span className="text-xl font-black text-purple-300 font-mono">
              {activeCount} <span className="text-xs text-slate-500 font-semibold">Active</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-3xl shadow-lg">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAutoGenModalOpen(true)}
            className="py-2.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02]"
          >
            <Zap className="w-4 h-4 text-brand-lime animate-pulse" />
            <span>Auto-Generate Round Robin</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingMatch(null);
              setManualRound(availableRounds.length ? Math.max(...availableRounds) : 1);
              setManualCourt(assignedCourts[0] || 'Court 1');
              setManualGameType('doubles');
              setManualTargetPoints(11);
              setSelectedRedPlayers([]);
              setSelectedBluePlayers([]);
              setIsManualModalOpen(true);
            }}
            className="py-2.5 px-4 rounded-2xl bg-brand-lime hover:bg-[#a6e224] text-dark-bg font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 text-dark-bg" />
            <span>+ Create Manual Match</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRosterModalOpen(true)}
            className="py-2.5 px-4 rounded-2xl bg-slate-800 border border-slate-700 hover:border-purple-500/60 text-slate-200 font-extrabold text-xs flex items-center gap-2 cursor-pointer transition-all"
          >
            <Users className="w-4 h-4 text-purple-400" />
            <span>Roster Pool ({activeCount} Active / {restingCount} Bench)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="py-2.5 px-4 rounded-2xl bg-brand-emerald/15 border border-brand-emerald/40 text-brand-emerald hover:bg-brand-emerald hover:text-dark-bg font-extrabold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-sm"
            title="View per-player match counts, win records, and export CSV report"
          >
            <BarChart2 className="w-4 h-4 text-brand-emerald" />
            <span>Player Stats Report</span>
          </button>
        </div>

        {matches.length > 0 && (
          <button
            type="button"
            onClick={clearAllMatches}
            className="py-2 px-3 rounded-2xl bg-red-950/30 border border-red-800/40 text-red-300 hover:bg-red-900/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" /> Clear Matches
          </button>
        )}
      </div>

      {/* Filters & Search Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 overflow-x-auto w-full sm:w-auto">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
            <span className="text-slate-400 font-bold text-[11px] uppercase shrink-0 mr-1">Status:</span>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                selectedStatusFilter === 'all'
                  ? 'bg-brand-lime text-dark-bg'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All ({matches.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('active')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                selectedStatusFilter === 'active'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Active ({matches.length - completedCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                selectedStatusFilter === 'completed'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          {/* Court Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto shrink-0 border-l border-slate-800/80 pl-3">
            <span className="text-slate-400 font-bold text-[11px] uppercase shrink-0 mr-1">Courts:</span>
            <button
              type="button"
              onClick={() => setSelectedCourtFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                selectedCourtFilter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All Courts
            </button>
            {assignedCourts.map((court, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedCourtFilter(court)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                  selectedCourtFilter === court
                    ? 'bg-brand-emerald text-dark-bg'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {court}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-48 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search player or court..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime"
          />
        </div>
      </div>

      {/* Matches Grid (2 Columns Max) */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-lime mx-auto" />
          <p className="text-xs font-semibold">Loading open play matches...</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl border border-slate-800 space-y-4">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Matches Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {matches.length === 0
                ? "No matches have been generated yet for this session. Click 'Auto-Generate Round Robin' or '+ Create Manual Match' to get started."
                : 'No matches match your current round or court filter.'}
            </p>
          </div>
          {matches.length === 0 && (
            <button
              type="button"
              onClick={() => setIsAutoGenModalOpen(true)}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg hover:scale-[1.02] transition-all"
            >
              <Zap className="w-4 h-4 text-brand-lime" /> Auto-Generate Match Matrix
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredMatches.map((m) => (
            <div
              key={m.id}
              className={`rounded-3xl border p-4 sm:p-5 transition-all shadow-lg flex flex-col justify-between space-y-4 ${
                m.status === 'completed'
                  ? 'bg-slate-900/40 border-slate-800/90'
                  : m.status === 'in_progress'
                  ? 'bg-blue-950/20 border-blue-500/40 ring-1 ring-blue-500/30'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Card Header: Round, Court Selector & Status */}
              <div className="flex items-center justify-between gap-2 text-xs pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-lg bg-purple-950/60 border border-purple-800/60 text-purple-300 font-extrabold text-[11px]">
                    Round {m.round}
                  </span>
                  {m.wasReopened && (
                    <span className="px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-300 font-extrabold text-[10px] flex items-center gap-1 shadow-sm" title="This match was previously completed and reopened for score adjustment.">
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
                    onChange={(e) => handleInlineCourtChange(m.id, e.target.value)}
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

              {/* Card Body: Side-by-Side Teams (Team Red Left | VS Center | Team Blue Right) */}
              <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-3 py-1">
                {/* Team Red (Left Side) */}
                <div className="md:col-span-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="text-[10px] font-black uppercase text-red-400 tracking-wider flex items-center gap-1">
                      <span>Team Red</span>
                      {m.winner === 'red' && <Trophy className="w-3.5 h-3.5 text-amber-400 inline" />}
                    </div>
                    <div className="space-y-1.5">
                      {m.teamRed.players.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0 shadow-sm">
                            <img
                              src={p.photoUrl || `https://robohash.org/${encodeURIComponent(p.name)}?set=set4`}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="font-normal text-sm truncate text-slate-100">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Team Red Score Controls */}
                  <div className="flex items-center gap-1.5 shrink-0 bg-slate-950 border border-slate-800 p-1.5 rounded-xl self-start sm:self-center">
                    <button
                      type="button"
                      disabled={m.status === 'completed'}
                      onClick={() => updateMatchScore(m.id, 'red', -1)}
                      className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center transition-all ${
                        m.status === 'completed'
                          ? 'bg-slate-900/40 text-slate-600 cursor-not-allowed border border-slate-800/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer'
                      }`}
                    >
                      -
                    </button>
                    <span className={`w-9 text-center font-mono font-black text-xl ${
                      m.status === 'completed' ? 'text-slate-400' : 'text-red-400'
                    }`}>
                      {m.teamRed.score}
                    </span>
                    <button
                      type="button"
                      disabled={m.status === 'completed'}
                      onClick={() => updateMatchScore(m.id, 'red', 1)}
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

                {/* VS Divider Badge */}
                <div className="md:col-span-1 flex flex-col items-center justify-center py-1 shrink-0">
                  <span className="px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono font-black text-slate-400 uppercase tracking-widest shadow-inner">
                    VS
                  </span>
                </div>

                {/* Team Blue (Right Side) */}
                <div className="md:col-span-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1">
                      <span>Team Blue</span>
                      {m.winner === 'blue' && <Trophy className="w-3.5 h-3.5 text-amber-400 inline" />}
                    </div>
                    <div className="space-y-1.5">
                      {m.teamBlue.players.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0 shadow-sm">
                            <img
                              src={p.photoUrl || `https://robohash.org/${encodeURIComponent(p.name)}?set=set4`}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="font-normal text-sm truncate text-slate-100">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Team Blue Score Controls */}
                  <div className="flex items-center gap-1.5 shrink-0 bg-slate-950 border border-slate-800 p-1.5 rounded-xl self-start sm:self-center">
                    <button
                      type="button"
                      disabled={m.status === 'completed'}
                      onClick={() => updateMatchScore(m.id, 'blue', -1)}
                      className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center transition-all ${
                        m.status === 'completed'
                          ? 'bg-slate-900/40 text-slate-600 cursor-not-allowed border border-slate-800/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer'
                      }`}
                    >
                      -
                    </button>
                    <span className={`w-9 text-center font-mono font-black text-xl ${
                      m.status === 'completed' ? 'text-slate-400' : 'text-blue-400'
                    }`}>
                      {m.teamBlue.score}
                    </span>
                    <button
                      type="button"
                      disabled={m.status === 'completed'}
                      onClick={() => updateMatchScore(m.id, 'blue', 1)}
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

              {/* Card Footer Actions (Status on left, Complete + Edit + Delete on right) */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80 text-xs">
                <div className="min-w-0">
                  {m.status === 'completed' ? (
                    <span className="text-brand-lime font-black text-[11px] flex items-center gap-1 truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-lime shrink-0" />
                      Completed ({m.winner === 'red' ? 'Team Red Win' : m.winner === 'blue' ? 'Team Blue Win' : 'Tie Game'})
                    </span>
                  ) : m.teamRed.score > m.teamBlue.score ? (
                    <span className="text-red-400 font-bold text-[10px] uppercase tracking-wider truncate block">
                      🔴 Red Leading ({m.teamRed.score}-{m.teamBlue.score})
                    </span>
                  ) : m.teamBlue.score > m.teamRed.score ? (
                    <span className="text-blue-400 font-bold text-[10px] uppercase tracking-wider truncate block">
                      🔵 Blue Leading ({m.teamBlue.score}-{m.teamRed.score})
                    </span>
                  ) : m.teamRed.score > 0 ? (
                    <span className="text-purple-300 font-bold text-[10px] uppercase tracking-wider truncate block">
                      🤝 Game Tied ({m.teamRed.score}-{m.teamBlue.score})
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[10px] italic">Scheduled</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {m.status !== 'completed' ? (
                    <button
                      type="button"
                      onClick={() => handleCompleteMatch(m.id)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-[11px] flex items-center gap-1 shadow-sm transition-all cursor-pointer hover:scale-[1.02]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" /> Complete
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleReopenMatch(m.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer border border-slate-700"
                      title="Reopen match to edit score"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-400" /> Reopen
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openEditModal(m)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                    title="Edit match details"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingMatch(m)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-300 transition-all cursor-pointer"
                    title="Delete match"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: AUTO-GENERATE MATCH MATRIX */}
      {isAutoGenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 text-left bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-brand-lime animate-pulse" />
                <h3 className="text-lg font-black text-white">Auto-Generate Round Robin</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAutoGenModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Matchmaking Format Algorithm</label>
                <select
                  value={autoGenAlgorithm}
                  onChange={(e) => setAutoGenAlgorithm(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-brand-lime font-extrabold focus:outline-none focus:border-brand-lime"
                >
                  <option value="individual_scramble">⚡ Individual Round Robin Scramble (Continuous Queue & 1&4 vs 2&3 Split)</option>
                  <option value="random_rotational">🎲 Random Rotational Matrix</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Assigned Session Courts ({assignedCourts.length})</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {assignedCourts.map((c, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-brand-lime font-bold">
                      {c}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Generated matches will automatically rotate across these courts.</p>
              </div>

              {/* DYNAMIC MATCH CALCULATOR & SESSION ESTIMATOR */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-brand-lime" />
                    <span className="font-extrabold text-white text-xs uppercase tracking-wide">Match & Session Calculator</span>
                  </div>
                  <span className="text-[10px] font-mono bg-brand-lime/10 text-brand-lime px-2 py-0.5 rounded-full border border-brand-lime/30 font-bold">
                    Formula Active
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Target Games / Player</label>
                    <select
                      value={targetGamesPerPlayer}
                      onChange={(e) => setTargetGamesPerPlayer(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-brand-lime font-black focus:outline-none focus:border-brand-lime"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16].map((g) => (
                        <option key={g} value={g}>
                          {g} {g === 1 ? 'game' : 'games'} / player
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Session Duration</label>
                    <select
                      value={sessionDurationMinutes}
                      onChange={(e) => setSessionDurationMinutes(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-cyan-300 font-black focus:outline-none focus:border-brand-lime"
                    >
                      <option value={120}>120 mins (2 hrs)</option>
                      <option value={180}>180 mins (3 hrs)</option>
                      <option value={240}>240 mins (4 hrs)</option>
                      <option value={300}>300 mins (5 hrs)</option>
                      <option value={360}>360 mins (6 hrs)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Game Mode</label>
                    <select
                      value={autoGenGameType}
                      onChange={(e) => setAutoGenGameType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-brand-lime"
                    >
                      <option value="doubles">Doubles (4 players)</option>
                      <option value="singles">Singles (2 players)</option>
                    </select>
                  </div>
                </div>

                {/* FORMULA DISPLAY STATS */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Matches</div>
                    <div className="text-base font-black text-brand-lime font-mono mt-0.5">
                      {formulaMath.totalMatches} <span className="text-[10px] font-sans font-normal text-slate-400">matches</span>
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5 font-mono">
                      ({formulaMath.activeCount}P × {targetGamesPerPlayer}G)/{formulaMath.playersPerMatch}
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Rounds</div>
                    <div className="text-base font-black text-purple-300 font-mono mt-0.5">
                      {formulaMath.calculatedRounds} <span className="text-[10px] font-sans font-normal text-slate-400">rounds</span>
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5 font-mono">
                      {formulaMath.totalMatches}M ÷ {formulaMath.courtCount} {formulaMath.courtCount === 1 ? 'court' : 'courts'}
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Time / Game</div>
                    <div className="text-base font-black text-cyan-300 font-mono mt-0.5">
                      {formulaMath.timePerMatch} <span className="text-[10px] font-sans font-normal text-slate-400">mins</span>
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5 font-mono">
                      {sessionDurationMinutes}m ÷ {formulaMath.calculatedRounds}R
                    </div>
                  </div>
                </div>

                {/* SCORING FORMAT RECOMMENDATION NOTICE (TAGALOG / ENGLISH) */}
                <div className={`p-3 rounded-xl border text-[11px] leading-relaxed space-y-1 ${
                  formulaMath.isFastPaced
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                }`}>
                  <div className="font-extrabold flex items-center gap-1.5">
                    {formulaMath.isFastPaced ? (
                      <>
                        <Zap className="w-3.5 h-3.5 text-amber-400" /> Recommended: Rally Scoring to 15 or Timed Games (8-10 mins)
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Recommended: Standard Side-Out Scoring (11 or 15 points)
                      </>
                    )}
                  </div>
                  <p className="text-[10.5px]">
                    {formulaMath.isFastPaced ? (
                      <>
                        May <strong>{sessionDurationMinutes} minutes</strong> kayo sa court para sa <strong>{formulaMath.activeCount} players</strong> ({targetGamesPerPlayer} games bawat isa).
                        Kaya mabilis ang takbo, kadalasan gumagamit ng <strong>rally scoring hanggang 15</strong> (win by 1 o sudden death sa 14-14) o kaya <strong>timed games (8-10 minutes)</strong>. Hindi uubra ang standard side-out scoring to 11 kasi aabutin 'yun ng siyam-siyam at kukulangin ang time!
                      </>
                    ) : (
                      <>
                        May sapat na oras (<strong>{formulaMath.timePerMatch} mins bawat game</strong>) para makapaglaro ang bawat player ng {targetGamesPerPlayer} games. Uubra ang <strong>standard side-out scoring to 11 o 15 points</strong>.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Rounds to Generate</label>
                  <select
                    value={autoGenRounds}
                    onChange={(e) => setAutoGenRounds(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-brand-lime font-mono"
                  >
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((r) => (
                      <option key={r} value={r}>
                        {r} {r === 1 ? 'Round' : 'Rounds'} {r === formulaMath.calculatedRounds ? '(Formula Calculated)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Target Points per Match</label>
                  <select
                    value={autoGenTargetPoints}
                    onChange={(e) => setAutoGenTargetPoints(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-brand-lime"
                  >
                    <option value={11}>11 Points (Standard Side-Out)</option>
                    <option value={15}>15 Points (Rally Scoring / Win by 1)</option>
                    <option value={21}>21 Points</option>
                  </select>
                </div>
              </div>

              {autoGenAlgorithm === 'individual_scramble' ? (
                <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-800/60 text-purple-200 space-y-1.5 text-xs">
                  <div className="font-extrabold text-brand-lime flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-brand-lime" /> Individual Scramble: 1&4 vs 2&3 Split Rule
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Pulls top 4 players from paddle rack queue <code className="text-purple-300 font-mono font-bold">[P1, P2, P3, P4]</code>:
                    <br />
                    • <strong>Team Red:</strong> P1 (1st) & P4 (4th in queue)
                    <br />
                    • <strong>Team Blue:</strong> P2 (2nd) & P3 (3rd in queue)
                    <br />
                    Prevents adjacent queue neighbors from repeatedly partnering together across rotations.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-800/50 space-y-1">
                  <div className="font-bold text-purple-300 text-xs flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-purple-400" /> Active Roster: {formulaMath.activeCount} Players
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Matches will be created by pairing active players into {autoGenGameType} teams across {assignedCourts.length} assigned court(s).
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAutoGenModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateMatches}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs cursor-pointer shadow-lg hover:scale-[1.02] transition-all"
              >
                Generate Matches Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MANUAL MATCH CREATOR / EDITOR */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-left bg-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white">
                {editingMatch ? 'Edit Match' : 'Create Manual Match'}
              </h3>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Round #</label>
                  <input
                    type="number"
                    min={1}
                    value={manualRound}
                    onChange={(e) => setManualRound(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-brand-lime"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Assigned Court</label>
                  <select
                    value={manualCourt}
                    onChange={(e) => setManualCourt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-brand-lime font-bold focus:outline-none focus:border-brand-lime"
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
                      setManualGameType(e.target.value as any);
                      setSelectedRedPlayers([]);
                      setSelectedBluePlayers([]);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-brand-lime"
                  >
                    <option value="doubles">Doubles (2v2)</option>
                    <option value="singles">Singles (1v1)</option>
                  </select>
                </div>
              </div>

              {/* Player Selection Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Team Red Selection */}
                <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-800/40 space-y-2">
                  <div className="font-extrabold text-red-400 text-xs">
                    Team Red Players ({selectedRedPlayers.length} / {manualGameType === 'doubles' ? 2 : 1})
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                    {rosterPool.map((p) => {
                      const isRed = selectedRedPlayers.includes(p.id);
                      const isBlue = selectedBluePlayers.includes(p.id);
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
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl border flex items-center justify-between text-xs font-semibold transition-all ${
                            isRed
                              ? 'bg-red-600 text-white border-red-500'
                              : isBlue
                              ? 'opacity-30 cursor-not-allowed bg-slate-900 border-slate-800'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <span className="truncate">{p.name}</span>
                          {isRed && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Team Blue Selection */}
                <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-800/40 space-y-2">
                  <div className="font-extrabold text-blue-400 text-xs">
                    Team Blue Players ({selectedBluePlayers.length} / {manualGameType === 'doubles' ? 2 : 1})
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                    {rosterPool.map((p) => {
                      const isRed = selectedRedPlayers.includes(p.id);
                      const isBlue = selectedBluePlayers.includes(p.id);
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
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl border flex items-center justify-between text-xs font-semibold transition-all ${
                            isBlue
                              ? 'bg-blue-600 text-white border-blue-500'
                              : isRed
                              ? 'opacity-30 cursor-not-allowed bg-slate-900 border-slate-800'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <span className="truncate">{p.name}</span>
                          {isBlue && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveManualMatch}
                className="px-5 py-2.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs cursor-pointer shadow-md hover:bg-[#a6e224] transition-all"
              >
                {editingMatch ? 'Update Match' : 'Create Match'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ROSTER POOL MANAGEMENT */}
      {isRosterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-left bg-slate-900 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-black text-white">Match Roster Pool Management</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRosterModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Add Custom Player */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 block">+ Add Custom / Walk-in Player</span>
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
                  onClick={handleAddCustomPlayer}
                  className="px-3 py-1.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224] shrink-0"
                >
                  Add
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
                        <div className="font-bold text-white truncate">{p.name}</div>
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
                      onClick={() => togglePlayerStatus(p.id)}
                      className={`px-3 py-1 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                        p.status === 'active'
                          ? 'bg-brand-lime/10 border border-brand-lime/30 text-brand-lime'
                          : p.status === 'resting'
                          ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                          : 'bg-red-500/10 border border-red-500/30 text-red-400'
                      }`}
                    >
                      {p.status === 'active' ? 'Active' : p.status === 'resting' ? 'Resting / Bench' : 'Absent'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsRosterModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PLAYER MATCH ACTIVITY & STATISTICS REPORT */}
      {isReportModalOpen && (() => {
        const sortedStats = [...playerStatsList].sort((a, b) => {
          if (reportSortField === 'matches') return b.totalMatches - a.totalMatches;
          if (reportSortField === 'winRate') return b.winRate - a.winRate;
          if (reportSortField === 'pointDiff') return b.pointDiff - a.pointDiff;
          return a.playerName.localeCompare(b.playerName);
        });

        const totalSessionMatches = matches.length;
        const totalCompletedGames = matches.filter((m) => m.status === 'completed').length;
        const avgMatchesPerPlayer = rosterPool.length > 0 ? (playerStatsList.reduce((sum, s) => sum + s.totalMatches, 0) / rosterPool.length).toFixed(1) : '0';
        const topScorer = [...playerStatsList].sort((a, b) => b.wins - a.wins)[0];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="glass-panel border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-5 text-left bg-slate-900 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <BarChart2 className="w-6 h-6 text-brand-emerald" />
                  <div>
                    <h3 className="text-lg font-black text-white">Player Match Activity & Statistics Report</h3>
                    <p className="text-xs text-slate-400">
                      Session: <strong className="text-slate-200">{event.title}</strong> ({event.eventDate})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Roster Players</span>
                  <span className="text-xl font-black text-white font-mono">{rosterPool.length}</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Session Games</span>
                  <span className="text-xl font-black text-purple-300 font-mono">{totalSessionMatches} ({totalCompletedGames} done)</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Avg Games / Player</span>
                  <span className="text-xl font-black text-brand-lime font-mono">{avgMatchesPerPlayer}</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Win Leader</span>
                  <span className="text-sm font-black text-amber-400 truncate block mt-1">
                    {topScorer ? `${topScorer.playerName} (${topScorer.wins}W)` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Toolbar Actions & Sort controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">Sort By:</span>
                  <select
                    value={reportSortField}
                    onChange={(e) => setReportSortField(e.target.value as any)}
                    className="bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-1 font-bold focus:outline-none focus:border-brand-emerald"
                  >
                    <option value="matches">Total Matches</option>
                    <option value="winRate">Win Rate (%)</option>
                    <option value="pointDiff">Point Differential</option>
                    <option value="name">Player Name</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyReportText}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-brand-lime" /> Copy Text Summary
                  </button>

                  <button
                    type="button"
                    onClick={handleExportReportCSV}
                    className="px-3.5 py-1.5 rounded-xl bg-brand-emerald text-dark-bg font-extrabold text-xs flex items-center gap-1.5 hover:bg-[#20f5b4] transition-all cursor-pointer shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" /> Download CSV Report
                  </button>
                </div>
              </div>

              {/* Player Report Table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-80 overflow-y-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-950 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Player</th>
                      <th className="p-3 text-center">Assigned Games</th>
                      <th className="p-3 text-center">Completed</th>
                      <th className="p-3 text-center">W - L - T</th>
                      <th className="p-3 text-center">Win Rate</th>
                      <th className="p-3 text-center">Points (+/-)</th>
                      <th className="p-3">Courts Played On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
                    {sortedStats.map((stat, idx) => (
                      <tr key={stat.playerId} className="hover:bg-slate-800/40 transition-all">
                        <td className="p-3">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span className="w-5 text-slate-500 font-mono text-[10px]">#{idx + 1}</span>
                            <span>{stat.playerName}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                              {stat.playerType}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-purple-300">
                          {stat.totalMatches}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-300">
                          {stat.completedMatches}
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          <span className="text-brand-lime">{stat.wins}W</span> - <span className="text-red-400">{stat.losses}L</span> {stat.ties > 0 && <span className="text-slate-400">({stat.ties}T)</span>}
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          <span className={stat.winRate >= 50 ? 'text-brand-lime' : 'text-slate-400'}>
                            {stat.winRate}%
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className={stat.pointDiff > 0 ? 'text-brand-lime font-bold' : stat.pointDiff < 0 ? 'text-red-400' : 'text-slate-400'}>
                            {stat.pointDiff >= 0 ? `+${stat.pointDiff}` : stat.pointDiff}
                          </span>
                          <span className="text-[10px] text-slate-500 block">({stat.pointsScored} / {stat.pointsConceded})</span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 flex-wrap text-[10px]">
                            {Object.entries(stat.courtsBreakdown).map(([court, count], cIdx) => (
                              <span key={cIdx} className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono">
                                {court}: <strong>{count}x</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 cursor-pointer"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* MODAL 5: DELETE MATCH CONFIRMATION ALERT */}
      {deletingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-left bg-slate-900">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-2xl bg-red-950/60 border border-red-800/60">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Delete Match Confirmation</h3>
                <p className="text-[11px] text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="text-slate-300 font-medium leading-relaxed">
                Are you sure you want to delete <strong>Match (Round {deletingMatch.round} • {deletingMatch.courtName})</strong>?
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Teams: {deletingMatch.teamRed.players.map((p) => p.name).join(' & ')} vs {deletingMatch.teamBlue.players.map((p) => p.name).join(' & ')}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMatch(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deletingMatch) {
                    deleteMatch(deletingMatch.id);
                    setDeletingMatch(null);
                  }
                }}
                className="px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs cursor-pointer shadow-lg hover:scale-[1.02] transition-all"
              >
                Delete Match Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOpenPlayMatchManagement;
