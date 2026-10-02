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
  type ScoreboardMatch,
  type PlayerMatchStats,
} from '../adminTypes';

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
  onNavigateToScoreboard,
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
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<string>('all');
  const [selectedCourtFilter, setSelectedCourtFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isAutoGenModalOpen, setIsAutoGenModalOpen] = useState<boolean>(false);
  const [autoGenRounds, setAutoGenRounds] = useState<number>(3);
  const [autoGenGameType, setAutoGenGameType] = useState<'doubles' | 'singles'>('doubles');
  const [autoGenTargetPoints, setAutoGenTargetPoints] = useState<number>(11);

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

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Player Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportSortField, setReportSortField] = useState<'matches' | 'winRate' | 'pointDiff' | 'name'>('matches');

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
  }, [event.id, registrations, event.skillLevel]);

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

    if (newRedScore > 0 || newBlueScore > 0) {
      status = 'in_progress';
    }

    if (newRedScore >= match.targetPoints || newBlueScore >= match.targetPoints) {
      status = 'completed';
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

  // Auto Generation Algorithm (Multi-Court Round Robin)
  const handleGenerateMatches = () => {
    const activePlayers = rosterPool.filter((p) => p.status === 'active');
    const playersPerMatch = autoGenGameType === 'doubles' ? 4 : 2;

    if (activePlayers.length < playersPerMatch) {
      alert(`You need at least ${playersPerMatch} active players in the roster pool to generate ${autoGenGameType} matches.`);
      return;
    }

    const newMatches: OpenPlayMatch[] = [];
    const courtCount = assignedCourts.length;
    let availablePool = [...activePlayers];

    // Simple rotational pairing algorithm
    for (let r = 1; r <= autoGenRounds; r++) {
      // Shuffle pool for varied pairings per round
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
        const matchRecord: OpenPlayMatch = {
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
        };

        newMatches.push(matchRecord);
      }
    }

    const combined = [...matches, ...newMatches];
    persistMatches(combined);
    setIsAutoGenModalOpen(false);
    showToast(`⚡ Generated ${newMatches.length} matches across ${courtCount} assigned court(s)!`);
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
    };
    const updated = [...rosterPool, newItem];
    saveRosterPool(updated);
    setNewPlayerName('');
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

  // Launch Scoreboard Sync
  const handleLaunchScoreboard = (match: OpenPlayMatch) => {
    const scoreboardId = `sb-${match.id}`;
    const sbMatch: ScoreboardMatch = {
      id: scoreboardId,
      openPlayId: event.id,
      openPlayTitle: event.title,
      matchTitle: `${event.title} - Round ${match.round} (${match.courtName})`,
      gameType: match.gameType,
      targetPoints: match.targetPoints,
      winByTwo: true,
      teamRed: {
        name: match.teamRed.players.map((p) => p.name).join(' & ') || 'Team Red',
        score: match.teamRed.score,
        players: match.teamRed.players.map((p) => ({ id: p.id, name: p.name, photoUrl: p.photoUrl })),
      },
      teamBlue: {
        name: match.teamBlue.players.map((p) => p.name).join(' & ') || 'Team Blue',
        score: match.teamBlue.score,
        players: match.teamBlue.players.map((p) => ({ id: p.id, name: p.name, photoUrl: p.photoUrl })),
      },
      servingTeam: 'red',
      serverNumber: 1,
      firstServeOfGameDone: true,
      status: match.status === 'completed' ? 'completed' : 'live',
      history: [],
      createdAt: match.createdAt,
      updatedAt: new Date().toISOString(),
    };

    // Store in localStorage scoreboards
    try {
      const existingStr = localStorage.getItem('picklepoint_scoreboards');
      let existingList: ScoreboardMatch[] = existingStr ? JSON.parse(existingStr) : [];
      if (!Array.isArray(existingList)) existingList = [];
      const idx = existingList.findIndex((m) => m.id === scoreboardId);
      if (idx >= 0) existingList[idx] = sbMatch;
      else existingList.push(sbMatch);
      localStorage.setItem('picklepoint_scoreboards', JSON.stringify(existingList));
    } catch (e) {}

    // Store in Firestore scoreboards
    if (isFirebaseConfigured && db) {
      setDoc(doc(db, 'scoreboards', scoreboardId), sbMatch).catch(console.warn);
    }

    if (onNavigateToScoreboard) {
      onNavigateToScoreboard(match);
    } else {
      showToast('🏆 Match synced to Scoreboard! Select Scoreboard tab in Admin to view.');
    }
  };

  // Filtered Matches
  const filteredMatches = matches.filter((m) => {
    if (selectedRoundFilter !== 'all' && m.round.toString() !== selectedRoundFilter) return false;
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
        {/* Round Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-slate-400 font-bold text-[11px] uppercase shrink-0 mr-1">Rounds:</span>
          <button
            type="button"
            onClick={() => setSelectedRoundFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              selectedRoundFilter === 'all'
                ? 'bg-brand-lime text-dark-bg'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All ({matches.length})
          </button>
          {availableRounds.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRoundFilter(r.toString())}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                selectedRoundFilter === r.toString()
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Round {r}
            </button>
          ))}
        </div>

        {/* Court Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
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

      {/* Matches Grid */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMatches.map((m) => (
            <div
              key={m.id}
              className={`rounded-3xl border p-4 transition-all shadow-lg flex flex-col justify-between space-y-4 ${
                m.status === 'completed'
                  ? 'bg-slate-900/40 border-slate-800/90'
                  : m.status === 'in_progress'
                  ? 'bg-blue-950/20 border-blue-500/40 ring-1 ring-blue-500/30'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Card Header: Round, Court Selector & Status */}
              <div className="flex items-center justify-between gap-2 text-xs pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-purple-950/60 border border-purple-800/60 text-purple-300 font-extrabold text-[11px]">
                    Round {m.round}
                  </span>
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

              {/* Team Red vs Team Blue Display */}
              <div className="space-y-3 py-1">
                {/* Team Red */}
                <div
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                    m.winner === 'red'
                      ? 'bg-red-950/30 border-red-500/50 text-red-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-black uppercase text-red-400 tracking-wider mb-1 flex items-center gap-1">
                      <span>Team Red</span>
                      {m.winner === 'red' && <Trophy className="w-3 h-3 text-amber-400 inline" />}
                    </div>
                    <div className="space-y-1">
                      {m.teamRed.players.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                            <img
                              src={p.photoUrl || `https://robohash.org/${encodeURIComponent(p.name)}?set=set4`}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="font-bold text-xs truncate text-white">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Team Red Score Controls */}
                  <div className="flex items-center gap-1.5 shrink-0 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => updateMatchScore(m.id, 'red', -1)}
                      className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-mono font-black text-lg text-red-400">
                      {m.teamRed.score}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateMatchScore(m.id, 'red', 1)}
                      className="w-6 h-6 rounded-lg bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="text-center font-mono text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
                  VS
                </div>

                {/* Team Blue */}
                <div
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                    m.winner === 'blue'
                      ? 'bg-blue-950/30 border-blue-500/50 text-blue-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-black uppercase text-blue-400 tracking-wider mb-1 flex items-center gap-1">
                      <span>Team Blue</span>
                      {m.winner === 'blue' && <Trophy className="w-3 h-3 text-amber-400 inline" />}
                    </div>
                    <div className="space-y-1">
                      {m.teamBlue.players.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                            <img
                              src={p.photoUrl || `https://robohash.org/${encodeURIComponent(p.name)}?set=set4`}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="font-bold text-xs truncate text-white">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Team Blue Score Controls */}
                  <div className="flex items-center gap-1.5 shrink-0 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => updateMatchScore(m.id, 'blue', -1)}
                      className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-mono font-black text-lg text-blue-400">
                      {m.teamBlue.score}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateMatchScore(m.id, 'blue', 1)}
                      className="w-6 h-6 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80 text-xs">
                <button
                  type="button"
                  onClick={() => handleLaunchScoreboard(m)}
                  className="px-3 py-1.5 rounded-xl bg-brand-lime/15 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-dark-bg font-extrabold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Launch live digital scoreboard for this match"
                >
                  <Trophy className="w-3.5 h-3.5" /> Scoreboard
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(m)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                    title="Edit match"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMatch(m.id)}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Number of Rounds</label>
                  <select
                    value={autoGenRounds}
                    onChange={(e) => setAutoGenRounds(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-brand-lime"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
                      <option key={r} value={r}>
                        {r} {r === 1 ? 'Round' : 'Rounds'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Game Format</label>
                  <select
                    value={autoGenGameType}
                    onChange={(e) => setAutoGenGameType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-brand-lime"
                  >
                    <option value="doubles">Doubles (2v2)</option>
                    <option value="singles">Singles (1v1)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Target Points per Match</label>
                <select
                  value={autoGenTargetPoints}
                  onChange={(e) => setAutoGenTargetPoints(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-brand-lime"
                >
                  <option value={11}>11 Points (Standard)</option>
                  <option value={15}>15 Points</option>
                  <option value={21}>21 Points</option>
                </select>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-800/50 space-y-1">
                <div className="font-bold text-purple-300 text-xs flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-400" /> Active Roster: {activeCount} Players
                </div>
                <p className="text-[11px] text-slate-400">
                  Matches will be created by pairing active players into {autoGenGameType} teams across {assignedCourts.length} assigned court(s).
                </p>
              </div>
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
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Player Name..."
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime"
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
                  className="px-3 py-1.5 rounded-xl bg-brand-lime text-dark-bg font-extrabold text-xs hover:bg-[#a6e224]"
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
                        <div className="text-[10px] text-slate-400 capitalize">{p.type} • {p.skillLevel || 'Player'}</div>
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
    </div>
  );
};

export default AdminOpenPlayMatchManagement;
