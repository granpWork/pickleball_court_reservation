import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Trophy,
  Users,
  Building2,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Search,
  Zap,
  BarChart2,
  UploadCloud,
  FileSpreadsheet,
  Sparkles,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
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

import { MatchMatrixCard } from './openplay/MatchMatrixCard';
import { MatchMatrixRoundAccordion } from './openplay/MatchMatrixRoundAccordion';
import { OpenPlayLeaderboardView } from './openplay/OpenPlayLeaderboardView';
import { OpenPlayAutoGenModal, type AutoGenAlgorithmType } from './openplay/OpenPlayAutoGenModal';
import { OpenPlayManualMatchModal } from './openplay/OpenPlayManualMatchModal';
import { OpenPlayRosterModal } from './openplay/OpenPlayRosterModal';
import { OpenPlayReportModal } from './openplay/OpenPlayReportModal';
import { OpenPlayJsonUploadModal } from './openplay/OpenPlayJsonUploadModal';
import { OpenPlayResultsModal } from './openplay/OpenPlayResultsModal';
import { OpenPlayDeleteRoundsModal } from './openplay/OpenPlayDeleteRoundsModal';
import { generateUniquePartnerMatches, generateSmartDuprMatches } from '../../../utils/matchGeneratorUtils';
import { isNonProductionEnvironment } from '../../../utils/envUtils';
import { seedDummyOpenPlayRegistrations } from '../../../utils/dummyRosterUtils';

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
  const [isSeedingQuickDummy, setIsSeedingQuickDummy] = useState<boolean>(false);

  // Quick seed mock players for testing (strictly non-production)
  const handleQuickSeedDummyPlayers = async (count: number = 12) => {
    if (!isNonProductionEnvironment()) {
      showToast('❌ Mock roster seeding is restricted to development/staging.');
      return;
    }
    setIsSeedingQuickDummy(true);
    try {
      const seeded = await seedDummyOpenPlayRegistrations(event, count, registrations);
      // Update local storage cache if available
      try {
        const existing = localStorage.getItem(`picklepoint_openplay_dummy_registrations_${event.id}`);
        const currentList = existing ? JSON.parse(existing) : [];
        const idSet = new Set(currentList.map((r: any) => r.id));
        seeded.forEach((dr) => {
          if (!idSet.has(dr.id)) currentList.push(dr);
        });
        localStorage.setItem(`picklepoint_openplay_dummy_registrations_${event.id}`, JSON.stringify(currentList));
      } catch (e) {}

      // Immediately integrate into roster pool
      const newItems: OpenPlayMatchRosterItem[] = seeded.map((reg) => ({
        id: `${reg.id}-primary`,
        name: reg.playerName,
        email: reg.playerEmail,
        phone: reg.playerPhone,
        type: 'primary',
        status: 'active',
        skillLevel: reg.skillLevel || 'Intermediate',
        duprId: reg.duprId || '',
        duprRating: reg.duprRating || '',
        isDummy: true,
      }));

      const existingPoolIds = new Set(rosterPool.map((p) => p.id));
      const filteredNew = newItems.filter((p) => !existingPoolIds.has(p.id));
      const updatedPool = [...rosterPool, ...filteredNew];
      setRosterPool(updatedPool);
      setPaddleRackQueue(updatedPool.filter((p) => p.status === 'active'));

      showToast(`🧪 Seeded ${seeded.length} mock players into Roster Pool! Ready to auto-generate matches.`);
    } catch (err: any) {
      console.error('Error seeding dummy players:', err);
      showToast(`Failed to seed mock players: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSeedingQuickDummy(false);
    }
  };

  // Filter States
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'completed' | 'active'>('all');
  const [selectedCourtFilter, setSelectedCourtFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals visibility & states
  const [isAutoGenModalOpen, setIsAutoGenModalOpen] = useState<boolean>(false);
  const [paddleRackQueue, setPaddleRackQueue] = useState<OpenPlayMatchRosterItem[]>([]);

  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [editingMatch, setEditingMatch] = useState<OpenPlayMatch | null>(null);
  const [targetManualRound, setTargetManualRound] = useState<number>(1);

  // Created rounds state
  const [createdRounds, setCreatedRounds] = useState<number[]>([]);
  const [deletedRounds, setDeletedRounds] = useState<number[]>([]);

  // Delete Multiple Rounds Modal State
  const [isDeleteRoundsModalOpen, setIsDeleteRoundsModalOpen] = useState<boolean>(false);
  const [selectedRoundsToDelete, setSelectedRoundsToDelete] = useState<Set<number>>(new Set());
  const [isDeletingRounds, setIsDeletingRounds] = useState<boolean>(false);

  // Compute all active/available rounds
  const allActiveRounds = useMemo(() => {
    const roundsFromMatches = matches.map((m) => m.round);
    const setRounds = new Set([...roundsFromMatches, ...createdRounds]);
    for (const d of deletedRounds) {
      setRounds.delete(d);
    }
    // If no rounds exist and no matches, default to [1]
    if (setRounds.size === 0 && matches.length === 0) {
      setRounds.add(1);
    }
    return Array.from(setRounds).sort((a, b) => a - b);
  }, [matches, createdRounds, deletedRounds]);

  const handleAddNewRound = () => {
    const maxRound = allActiveRounds.length ? Math.max(...allActiveRounds) : 0;
    const nextRound = maxRound + 1;
    setDeletedRounds((prev) => prev.filter((r) => r !== nextRound));
    setCreatedRounds((prev) => [...prev.filter((r) => r !== nextRound), nextRound]);
    showToast(`⚡ Round ${nextRound} created! Click "Auto-Generate Round ${nextRound}" or "+ Add Match" to schedule matches.`);
  };

  // Auto-generate matches for a specific empty round (e.g. Round 2 created via "+ Add New Round")
  // looking at all previous rounds to ensure zero duplicate games & unique partners
  const handleAutoGenerateSingleRound = (targetRoundNum: number) => {
    let onlyCheckedIn = false;
    try {
      const saved = localStorage.getItem('picklepoint_openplay_only_checkedin');
      if (saved !== null) {
        onlyCheckedIn = saved === 'true';
      }
    } catch (e) {}

    const activeFromPool = rosterPool.filter((p) => p.status === 'active');
    const presentPlayers = activeFromPool.filter((p) => p.isPresent || p.attendanceStatus === 'present');

    // Strict attendance mode: if setting is active, use only checked-in players
    const candidatePlayers = onlyCheckedIn ? presentPlayers : presentPlayers.length >= 4 ? presentPlayers : activeFromPool;

    const gameType: 'doubles' | 'singles' = 'doubles';
    const playersPerMatch = gameType === 'doubles' ? 4 : 2;

    if (candidatePlayers.length < playersPerMatch) {
      if (onlyCheckedIn) {
        showToast(`⚠️ Only ${candidatePlayers.length} checked-in player(s). Need at least ${playersPerMatch} for Round ${targetRoundNum}. Please check in more players in Roster Pool.`);
      } else {
        showToast(`⚠️ Need at least ${playersPerMatch} active players to generate Round ${targetRoundNum}.`);
      }
      return;
    }

    const courtsToUse = assignedCourts.length > 0 ? assignedCourts : ['Court 1'];
    // Filter existing matches to only include rounds strictly before targetRoundNum
    const priorMatches = matches.filter((m) => m.round < targetRoundNum);

    const isDupr = Boolean(event.isDupr);

    let resultMatches: OpenPlayMatch[] = [];

    if (isDupr) {
      const result = generateSmartDuprMatches({
        eventId: event.id,
        rosterPool: candidatePlayers,
        assignedCourts: courtsToUse,
        totalRounds: 1,
        targetPoints: 11,
        gameType,
        existingMatches: priorMatches,
        startingRound: targetRoundNum,
      });
      resultMatches = result.matches;
    } else {
      const result = generateUniquePartnerMatches({
        eventId: event.id,
        rosterPool: candidatePlayers,
        assignedCourts: courtsToUse,
        totalRounds: 1,
        targetPoints: 11,
        gameType,
        existingMatches: priorMatches,
        startingRound: targetRoundNum,
      });
      resultMatches = result.matches;
    }

    if (resultMatches.length === 0) {
      showToast(`⚠️ Could not generate matches for Round ${targetRoundNum}.`);
      return;
    }

    // Filter out any prior matches in this same round (if any), then append
    const cleanMatches = matches.filter((m) => m.round !== targetRoundNum);
    const combined = [...cleanMatches, ...resultMatches];
    persistMatches(combined);

    showToast(
      `⚡ Generated ${resultMatches.length} games for Round ${targetRoundNum} with 0 duplicate games against prior rounds!`
    );
  };

  const openDeleteRoundsModal = (preselectedRound?: number) => {
    if (preselectedRound !== undefined) {
      setSelectedRoundsToDelete(new Set([preselectedRound]));
    } else {
      setSelectedRoundsToDelete(new Set());
    }
    setIsDeleteRoundsModalOpen(true);
  };

  const handleToggleRoundToDelete = (roundNum: number) => {
    setSelectedRoundsToDelete((prev) => {
      const next = new Set(prev);
      if (next.has(roundNum)) {
        next.delete(roundNum);
      } else {
        next.add(roundNum);
      }
      return next;
    });
  };

  const handleSelectAllRoundsToDelete = () => {
    setSelectedRoundsToDelete(new Set(allActiveRounds));
  };

  const handleDeselectAllRoundsToDelete = () => {
    setSelectedRoundsToDelete(new Set());
  };

  const handleConfirmDeleteRounds = async () => {
    if (selectedRoundsToDelete.size === 0) return;

    const roundsArray = Array.from(selectedRoundsToDelete);
    setIsDeletingRounds(true);

    try {
      const roundSet = new Set(roundsArray);

      // 1. Filter out matches in the selected rounds
      const matchesToDelete = matches.filter((m) => roundSet.has(m.round));
      const remainingMatches = matches.filter((m) => !roundSet.has(m.round));

      // 2. Update state and localStorage
      setMatches(remainingMatches);
      try {
        localStorage.setItem(`picklepoint_openplay_matches_${event.id}`, JSON.stringify(remainingMatches));
      } catch (e) {
        console.warn('Failed to update matches in localStorage:', e);
      }

      // 3. Update deletedRounds and createdRounds
      setDeletedRounds((prev) => Array.from(new Set([...prev, ...roundsArray])));
      setCreatedRounds((prev) => prev.filter((r) => !roundSet.has(r)));

      // 4. Clean up round titles in localStorage
      try {
        const savedTitles = localStorage.getItem(`picklepoint_round_titles_${event.id}`);
        if (savedTitles) {
          const parsedTitles: Record<number, string> = JSON.parse(savedTitles);
          for (const r of roundsArray) {
            delete parsedTitles[r];
          }
          localStorage.setItem(`picklepoint_round_titles_${event.id}`, JSON.stringify(parsedTitles));
        }
      } catch (e) {}

      // 5. Clean up collapsed rounds
      setCollapsedRounds((prev) => {
        const next = new Set(prev);
        for (const r of roundsArray) next.delete(r);
        return next;
      });

      // 6. Delete from Firestore
      if (isFirebaseConfigured && db && matchesToDelete.length > 0) {
        try {
          await Promise.all(
            matchesToDelete.map((m) =>
              deleteDoc(doc(db!, 'openplay_matches', m.id)).catch((err) =>
                console.warn(`Failed to delete match ${m.id} from Firestore:`, err)
              )
            )
          );
        } catch (err) {
          console.error('Error deleting matches from Firestore:', err);
        }
      }

      const countStr =
        roundsArray.length === 1
          ? `Round ${roundsArray[0]}`
          : `${roundsArray.length} rounds`;
      showToast(`🗑️ ${countStr} (${matchesToDelete.length} matches) deleted successfully.`);
      setIsDeleteRoundsModalOpen(false);
      setSelectedRoundsToDelete(new Set());
    } catch (err: any) {
      console.error('Failed to delete rounds:', err);
      showToast('❌ Failed to delete rounds. Please try again.');
    } finally {
      setIsDeletingRounds(false);
    }
  };

  const openNewManualMatchModal = (targetRound?: number) => {
    setEditingMatch(null);
    const roundToUse = targetRound || (allActiveRounds.length ? Math.max(...allActiveRounds) : 1);
    setTargetManualRound(roundToUse);
    setIsManualModalOpen(true);
  };

  const openEditModal = (match: OpenPlayMatch) => {
    setEditingMatch(match);
    setTargetManualRound(match.round);
    setIsManualModalOpen(true);
  };

  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false);
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [newPlayerSkill, setNewPlayerSkill] = useState<string>('Intermediate');
  const [newPlayerDuprId, setNewPlayerDuprId] = useState<string>('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportSortField, setReportSortField] = useState<'matches' | 'winRate' | 'pointDiff' | 'name'>('matches');

  // Delete Confirmation Modal State
  const [deletingMatch, setDeletingMatch] = useState<OpenPlayMatch | null>(null);

  // JSON Upload Modal State
  const [isJsonModalOpen, setIsJsonModalOpen] = useState<boolean>(false);
  const [jsonTargetRound, setJsonTargetRound] = useState<number>(1);
  const [jsonInputText, setJsonInputText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isCopySuccess, setIsCopySuccess] = useState<boolean>(false);

  // Generate Match Results Modal State
  const [isResultsModalOpen, setIsResultsModalOpen] = useState<boolean>(false);
  const [resultsTargetRound, setResultsTargetRound] = useState<number | 'all'>(1);
  const [resultsEventName, setResultsEventName] = useState<string>('');
  const [resultsEventDate, setResultsEventDate] = useState<string>('');
  const [resultsLocation, setResultsLocation] = useState<string>('');
  const [resultsScoreType, setResultsScoreType] = useState<'SIDEOUT' | 'RALLY'>('SIDEOUT');
  const [resultsIncludeOnlyCompleted, setResultsIncludeOnlyCompleted] = useState<boolean>(true);
  const [isResultsCopySuccess, setIsResultsCopySuccess] = useState<boolean>(false);

  // Leaderboard View State
  const [activeView, setActiveView] = useState<'matrix' | 'leaderboard'>('matrix');
  const [leaderboardSortField, setLeaderboardSortField] = useState<'wins' | 'winRate' | 'pointDiff' | 'pointsScored' | 'matches'>('wins');
  const [leaderboardSearch, setLeaderboardSearch] = useState<string>('');
  const [expandedLeaderboardPlayerId, setExpandedLeaderboardPlayerId] = useState<string | null>(null);

  const openGenerateResultsModal = (targetRound?: number | 'all') => {
    const roundToUse = targetRound !== undefined ? targetRound : (allActiveRounds[0] || 1);
    setResultsTargetRound(roundToUse);
    setResultsEventName(event.title || (event as any).name || 'Pickleball Open Play');
    setResultsEventDate(event.eventDate || (event as any).date || new Date().toISOString().split('T')[0]);
    setResultsLocation(event.location || (event as any).address || (event as any).courtLocation || '');
    setResultsScoreType('SIDEOUT');
    setResultsIncludeOnlyCompleted(true);
    setIsResultsCopySuccess(false);
    setIsResultsModalOpen(true);
  };

  const escapeCsvField = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const generateMatchResultsCsv = (
    targetRound: number | 'all',
    eventNameStr: string,
    eventDateStr: string,
    locationStr: string,
    scoreTypeStr: string,
    onlyCompleted: boolean,
    targetMatchId?: string
  ): string => {
    const headers = [
      'matchType',
      'event',
      'date',
      'playerA1',
      'playerA1DuprId',
      'playerA1ExternalId',
      'playerA2',
      'playerA2DuprId',
      'playerA2ExternalId',
      'playerB1',
      'playerB1DuprId',
      'playerB1ExternalId',
      'playerB2',
      'playerB2DuprId',
      'playerB2ExternalId',
      'teamAGame1',
      'teamBGame1',
      'teamAGame2',
      'teamBGame2',
      'teamAGame3',
      'teamBGame3',
      'teamAGame4',
      'teamBGame4',
      'teamAGame5',
      'teamBGame5',
      'location',
      'scoreType'
    ];

    let targetMatches = targetMatchId
      ? matches.filter((m) => m.id === targetMatchId)
      : targetRound === 'all'
      ? matches
      : matches.filter((m) => m.round === targetRound);

    if (onlyCompleted) {
      targetMatches = targetMatches.filter((m) => m.status === 'completed');
    }

    const rows = targetMatches.map((m) => {
      const isSingles = m.gameType === 'singles';
      const matchType = isSingles ? 'S' : 'D';

      const pA1 = m.teamRed?.players?.[0];
      const pA2 = m.teamRed?.players?.[1];
      const pB1 = m.teamBlue?.players?.[0];
      const pB2 = m.teamBlue?.players?.[1];

      const findRoster = (p?: OpenPlayMatchPlayer) => {
        if (!p) return null;
        return rosterPool.find(
          (r) => (p.id && r.id === p.id) || (p.name && r.name.trim().toLowerCase() === p.name.trim().toLowerCase())
        );
      };

      const rA1 = findRoster(pA1);
      const rA2 = findRoster(pA2);
      const rB1 = findRoster(pB1);
      const rB2 = findRoster(pB2);

      const playerA1Name = pA1?.name || rA1?.name || '';
      const playerA1Dupr = pA1?.duprId || rA1?.duprId || rA1?.adminDuprId || '';
      const playerA1ExtId = '';

      const playerA2Name = !isSingles ? (pA2?.name || rA2?.name || '') : '';
      const playerA2Dupr = !isSingles ? (pA2?.duprId || rA2?.duprId || rA2?.adminDuprId || '') : '';
      const playerA2ExtId = '';

      const playerB1Name = pB1?.name || rB1?.name || '';
      const playerB1Dupr = pB1?.duprId || rB1?.duprId || rB1?.adminDuprId || '';
      const playerB1ExtId = '';

      const playerB2Name = !isSingles ? (pB2?.name || rB2?.name || '') : '';
      const playerB2Dupr = !isSingles ? (pB2?.duprId || rB2?.duprId || rB2?.adminDuprId || '') : '';
      const playerB2ExtId = '';

      const scoreA1 = m.teamRed?.score !== undefined && m.teamRed?.score !== null ? m.teamRed.score : '';
      const scoreB1 = m.teamBlue?.score !== undefined && m.teamBlue?.score !== null ? m.teamBlue.score : '';

      return [
        matchType,
        eventNameStr,
        eventDateStr,
        playerA1Name,
        playerA1Dupr,
        playerA1ExtId,
        playerA2Name,
        playerA2Dupr,
        playerA2ExtId,
        playerB1Name,
        playerB1Dupr,
        playerB1ExtId,
        playerB2Name,
        playerB2Dupr,
        playerB2ExtId,
        scoreA1,
        scoreB1,
        '', // teamAGame2
        '', // teamBGame2
        '', // teamAGame3
        '', // teamBGame3
        '', // teamAGame4
        '', // teamBGame4
        '', // teamAGame5
        '', // teamBGame5
        locationStr,
        scoreTypeStr
      ].map(escapeCsvField).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  };

  const handleDownloadCsv = () => {
    const csvContent = generateMatchResultsCsv(
      resultsTargetRound,
      resultsEventName,
      resultsEventDate,
      resultsLocation,
      resultsScoreType,
      resultsIncludeOnlyCompleted
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const roundSuffix = resultsTargetRound === 'all' ? 'All_Rounds' : `Round_${resultsTargetRound}`;
    const sanitizedEvent = (resultsEventName || 'Event').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.setAttribute('download', `${sanitizedEvent}_${roundSuffix}_Match_Results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📥 Downloaded Match Results CSV!');
  };

  const handleCopyCsvToClipboard = () => {
    const csvContent = generateMatchResultsCsv(
      resultsTargetRound,
      resultsEventName,
      resultsEventDate,
      resultsLocation,
      resultsScoreType,
      resultsIncludeOnlyCompleted
    );
    navigator.clipboard.writeText(csvContent);
    setIsResultsCopySuccess(true);
    showToast('📋 Copied CSV match results to clipboard!');
    setTimeout(() => setIsResultsCopySuccess(false), 2500);
  };

  const handleDownloadSingleMatchCsv = (m: OpenPlayMatch) => {
    if (m.status !== 'completed') {
      showToast('⚠️ Match CSV export is only available for completed matches.');
      return;
    }

    const sanitizePart = (str: string) => str.trim().replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');

    const rawGameName = (m.matchName || `game${m.round}`).trim();
    const gamePrefix = rawGameName.toLowerCase().replace(/[^a-z0-9]/g, '') || `game${m.round}`;

    const redNames = m.teamRed.players.map((p) => sanitizePart(p.name)).filter(Boolean).join('_') || 'Team_Red';
    const blueNames = m.teamBlue.players.map((p) => sanitizePart(p.name)).filter(Boolean).join('_') || 'Team_Blue';
    const eventDateStr = event.eventDate || (event as any).date || new Date().toISOString().split('T')[0];
    const sanitizedDate = sanitizePart(eventDateStr);

    const fileName = `${gamePrefix}_${redNames}_vs_${blueNames}_${sanitizedDate}.csv`;

    const csvContent = generateMatchResultsCsv(
      m.round,
      event.title || (event as any).name || 'Pickleball Open Play',
      eventDateStr,
      event.location || (event as any).address || (event as any).courtLocation || '',
      'SIDEOUT',
      false,
      m.id
    );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`📥 Downloaded ${fileName}!`);
  };

  // Accordion collapsed state & custom round titles state
  const [collapsedRounds, setCollapsedRounds] = useState<Set<number>>(new Set());
  const [roundTitles, setRoundTitles] = useState<Record<number, string>>(() => {
    return (event as any).roundTitles || {};
  });
  const [editingRoundNum, setEditingRoundNum] = useState<number | null>(null);
  const [tempRoundTitle, setTempRoundTitle] = useState<string>('');

  const getRoundTitle = (roundNum: number): string => {
    return roundTitles[roundNum] || `Round ${roundNum}`;
  };

  const toggleRoundCollapse = (roundNum: number) => {
    setCollapsedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(roundNum)) {
        next.delete(roundNum);
      } else {
        next.add(roundNum);
      }
      return next;
    });
  };

  const handleExpandAllRounds = () => setCollapsedRounds(new Set());
  const handleCollapseAllRounds = () => setCollapsedRounds(new Set(allActiveRounds));

  const startEditingRoundTitle = (roundNum: number) => {
    setEditingRoundNum(roundNum);
    setTempRoundTitle(getRoundTitle(roundNum));
  };

  const handleSaveRoundTitle = async (roundNum: number) => {
    const trimmed = tempRoundTitle.trim();
    const finalTitle = trimmed || `Round ${roundNum}`;
    const updatedTitles = { ...roundTitles, [roundNum]: finalTitle };
    setRoundTitles(updatedTitles);
    setEditingRoundNum(null);

    if (isFirebaseConfigured && db && event.id) {
      try {
        await setDoc(doc(db!, 'openplay_events', event.id), { roundTitles: updatedTitles }, { merge: true });
        showToast(`⚡ Saved round title "${finalTitle}"`);
      } catch (e) {
        console.warn('Failed to save round title to Firestore:', e);
      }
    }
  };

  const sampleJsonTemplate = `[
  {
    "matchName": "Game 1",
    "teamRed": [
      { "name": "Bryan", "dupr": "LPX7ZZ", "rate": "3.8" },
      { "name": "Alizza Mae Joven", "dupr": "0PG924", "rate": "2.5" }
    ],
    "teamBlue": [
      { "name": "John Michael Matubis", "dupr": "ORXXE7", "rate": "3.5" },
      { "name": "Tristan jude Osea", "dupr": "Q9MOO5", "rate": "2.920" }
    ]
  },
  {
    "matchName": "Game 2",
    "teamRed": [
      { "name": "Derick Jon", "dupr": "RGDK2E", "rate": "3.8" },
      { "name": "Geran Peredo", "dupr": "P4MLGG", "rate": "2.6" }
    ],
    "teamBlue": [
      { "name": "che matubis", "dupr": "VG2Y96", "rate": "3.5" },
      { "name": "Sergej Pons", "dupr": "VG6RP7", "rate": "3" }
    ]
  },
  {
    "matchName": "Game 3",
    "teamRed": [
      { "name": "geronimo antonio vera peredo", "dupr": "NNRR5N", "rate": "3.8" },
      { "name": "Ann Peredo", "dupr": "2RZLQ7", "rate": "3.35" }
    ],
    "teamBlue": [
      { "name": "Arcadio  Fernandez", "dupr": "Y04XYG", "rate": "3.5" },
      { "name": "Trisha Mae Orias", "dupr": "VG604P", "rate": "3.5" }
    ]
  }
]`;

  const openJsonUploadModal = (targetRound?: number) => {
    const roundToUse = targetRound || (allActiveRounds.length ? Math.max(...allActiveRounds) : 1);
    setJsonTargetRound(roundToUse);
    setJsonInputText('');
    setJsonError(null);
    setIsJsonModalOpen(true);
  };

  const handleCopySampleJson = () => {
    navigator.clipboard.writeText(sampleJsonTemplate);
    setIsCopySuccess(true);
    setTimeout(() => setIsCopySuccess(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setJsonInputText(content);
        setJsonError(null);
      }
    };
    reader.readAsText(file);
  };

  const handleProcessImportJson = async () => {
    if (!jsonInputText.trim()) {
      setJsonError('Please paste JSON content or select a .json file.');
      return;
    }

    try {
      const parsed = JSON.parse(jsonInputText);
      let rawItems: any[] = [];

      if (Array.isArray(parsed)) {
        rawItems = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.matches)) {
          rawItems = parsed.matches;
        } else if (Array.isArray(parsed.roster)) {
          setJsonError('The pasted JSON is a roster file rather than a match schedule. Please provide match objects with teamRed and teamBlue arrays.');
          return;
        } else if (Array.isArray(parsed.rounds)) {
          parsed.rounds.forEach((rObj: any) => {
            if (Array.isArray(rObj.matches)) {
              rObj.matches.forEach((mObj: any) => {
                rawItems.push({ ...mObj, round: rObj.round || rObj.roundNum || jsonTargetRound });
              });
            }
          });
        }
      }

      if (rawItems.length === 0) {
        setJsonError('No match items found in JSON. Expected format: array of match objects [ { teamRed: [...], teamBlue: [...] } ].');
        return;
      }

      let currentPool = [...rosterPool];
      let poolUpdated = false;
      const createdMatches: OpenPlayMatch[] = [];

      const findOrRegisterPlayer = (pNode: any): OpenPlayMatchPlayer => {
        let nameStr = '';
        let nodeDupr = '';
        let nodeRate = '';

        if (typeof pNode === 'string') {
          nameStr = pNode.trim();
        } else if (pNode && typeof pNode === 'object') {
          nameStr = (pNode.name || pNode.playerName || pNode.player || '').trim();
          nodeDupr = (pNode.dupr || pNode.duprId || '').trim();
          nodeRate = (pNode.rate || pNode.duprRating || '').toString().trim();
        }

        if (!nameStr) {
          nameStr = 'Unknown Player';
        }

        const normalizedName = nameStr.toLowerCase();
        let rosterMatch = currentPool.find((rp) => rp.name.trim().toLowerCase() === normalizedName);

        if (rosterMatch) {
          let shouldUpdateRoster = false;
          let updatedAdminDuprId = rosterMatch.adminDuprId;
          let updatedAdminDuprRating = rosterMatch.adminDuprRating;

          if (nodeDupr && !rosterMatch.adminDuprId && !rosterMatch.duprId) {
            updatedAdminDuprId = nodeDupr;
            shouldUpdateRoster = true;
          }
          if (nodeRate && !rosterMatch.adminDuprRating && !rosterMatch.duprRating) {
            updatedAdminDuprRating = nodeRate;
            shouldUpdateRoster = true;
          }

          if (shouldUpdateRoster) {
            currentPool = currentPool.map((rp) =>
              rp.id === rosterMatch!.id
                ? { ...rp, adminDuprId: updatedAdminDuprId, adminDuprRating: updatedAdminDuprRating }
                : rp
            );
            poolUpdated = true;
          }

          return {
            id: rosterMatch.id,
            name: rosterMatch.name,
            photoUrl: rosterMatch.photoUrl,
            skillLevel: rosterMatch.skillLevel,
            type: rosterMatch.type,
            duprId: updatedAdminDuprId || rosterMatch.duprId || nodeDupr,
            duprRating: updatedAdminDuprRating || rosterMatch.duprRating || nodeRate,
          };
        } else {
          const newId = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const newGuest: OpenPlayMatchRosterItem = {
            id: newId,
            name: nameStr,
            type: 'guest',
            status: 'active',
            adminDuprId: nodeDupr || undefined,
            adminDuprRating: nodeRate || undefined,
          };

          currentPool.push(newGuest);
          poolUpdated = true;

          return {
            id: newId,
            name: nameStr,
            photoUrl: `https://robohash.org/${encodeURIComponent(nameStr)}?set=set4`,
            type: 'guest',
            duprId: nodeDupr || undefined,
            duprRating: nodeRate || undefined,
          };
        }
      };

      rawItems.forEach((mItem: any, idx: number) => {
        const targetRoundNum = parseInt(mItem.round || jsonTargetRound, 10) || jsonTargetRound;
        const courtName =
          mItem.courtName ||
          mItem.court ||
          assignedCourts[idx % assignedCourts.length] ||
          'Court 1';

        const existingMatchesInRoundCount = matches.filter((m) => m.round === targetRoundNum).length;
        const matchName =
          mItem.matchName ||
          mItem.title ||
          mItem.game ||
          `Game ${existingMatchesInRoundCount + idx + 1}`;

        const rawRed = Array.isArray(mItem.teamRed) ? mItem.teamRed : Array.isArray(mItem.red) ? mItem.red : [];
        const rawBlue = Array.isArray(mItem.teamBlue) ? mItem.teamBlue : Array.isArray(mItem.blue) ? mItem.blue : [];

        const teamRedPlayers = rawRed.map(findOrRegisterPlayer);
        const teamBluePlayers = rawBlue.map(findOrRegisterPlayer);

        const newMatch: OpenPlayMatch = {
          id: `opm-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          eventId: event.id,
          round: targetRoundNum,
          matchName,
          courtName,
          gameType: teamRedPlayers.length === 1 && teamBluePlayers.length === 1 ? 'singles' : 'doubles',
          targetPoints: mItem.targetPoints || 11,
          status: 'scheduled',
          teamRed: {
            players: teamRedPlayers,
            score: 0,
          },
          teamBlue: {
            players: teamBluePlayers,
            score: 0,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        createdMatches.push(newMatch);
      });

      if (createdMatches.length === 0) {
        setJsonError('No valid match objects could be parsed.');
        return;
      }

      if (poolUpdated) {
        setRosterPool(currentPool);
        if (isFirebaseConfigured && db && event.id) {
          try {
            await setDoc(doc(db, 'openplay_events', event.id), { rosterPool: cleanDocData(currentPool) }, { merge: true });
          } catch (e) {
            console.warn('Failed to update event rosterPool in Firestore:', e);
          }
        }
      }

      await persistMatches([...matches, ...createdMatches]);

      const importedRounds = Array.from(new Set(createdMatches.map((m) => m.round)));
      setCreatedRounds((prev) => Array.from(new Set([...prev, ...importedRounds])));

      setIsJsonModalOpen(false);
      showToast(`⚡ Successfully imported ${createdMatches.length} ${createdMatches.length === 1 ? 'match' : 'matches'} via JSON!`);
    } catch (err: any) {
      setJsonError(`Invalid JSON syntax: ${err.message || 'Please check your JSON formatting.'}`);
    }
  };

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

  // Sorted Individual Leaderboard List for Leaderboard View
  const sortedLeaderboardList = useMemo(() => {
    let list = [...playerStatsList];

    if (leaderboardSearch.trim()) {
      const q = leaderboardSearch.toLowerCase();
      list = list.filter((p) => p.playerName.toLowerCase().includes(q));
    }

    return list.sort((a, b) => {
      if (leaderboardSortField === 'wins') {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
        return b.pointsScored - a.pointsScored;
      }
      if (leaderboardSortField === 'winRate') {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.pointDiff - a.pointDiff;
      }
      if (leaderboardSortField === 'pointDiff') {
        if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.pointsScored - a.pointsScored;
      }
      if (leaderboardSortField === 'pointsScored') {
        if (b.pointsScored !== a.pointsScored) return b.pointsScored - a.pointsScored;
        return b.wins - a.wins;
      }
      if (leaderboardSortField === 'matches') {
        if (b.completedMatches !== a.completedMatches) return b.completedMatches - a.completedMatches;
        return b.wins - a.wins;
      }
      return b.wins - a.wins;
    });
  }, [playerStatsList, leaderboardSortField, leaderboardSearch]);

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
    let combinedRegs = [...registrations];
    try {
      const dummyStr = localStorage.getItem(`picklepoint_openplay_dummy_registrations_${event.id}`);
      if (dummyStr) {
        const dummyList = JSON.parse(dummyStr);
        const existingIds = new Set(combinedRegs.map((r) => r.id));
        dummyList.forEach((dr: any) => {
          if (!existingIds.has(dr.id)) {
            combinedRegs.push(dr);
          }
        });
      }
    } catch (e) {}

    // If this is a Match Matrix event, load directly from its authoritative roster pool
    if (event.isMatchMatrix) {
      try {
        const savedRosterStr = localStorage.getItem(`picklepoint_openplay_roster_${event.id}`);
        if (savedRosterStr) {
          const savedRoster = JSON.parse(savedRosterStr) as OpenPlayMatchRosterItem[];
          if (Array.isArray(savedRoster) && savedRoster.length > 0) {
            // Deduplicate duplicate items that have matching base ID (e.g. id vs id-primary)
            const seenIds = new Set<string>();
            const uniqueRoster: OpenPlayMatchRosterItem[] = [];
            for (const p of savedRoster) {
              const baseId = (p.id || '').replace(/-primary$/, '');
              if (!seenIds.has(baseId)) {
                seenIds.add(baseId);
                uniqueRoster.push(p);
              }
            }
            // Auto-heal duplicate cache in localStorage
            if (uniqueRoster.length !== savedRoster.length) {
              localStorage.setItem(`picklepoint_openplay_roster_${event.id}`, JSON.stringify(uniqueRoster));
            }
            setRosterPool(uniqueRoster);
            setPaddleRackQueue(uniqueRoster.filter((p) => p.status === 'active'));
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to load matrix roster from localStorage:', e);
      }
    }

    const eventRegs = combinedRegs.filter(
      (r) => r.eventId === event.id && r.status !== 'cancelled' && r.status !== 'waitlisted'
    );

    let attendanceMap: Record<string, any> = {};
    try {
      const savedAtt = localStorage.getItem('picklepoint_openplay_attendance');
      if (savedAtt) attendanceMap = JSON.parse(savedAtt);
    } catch (e) {}

    const getAttendanceStatus = (id: string): 'present' | 'absent' | 'unmarked' => {
      const val = attendanceMap[id];
      if (val === true || val === 'present') return 'present';
      if (val === 'absent') return 'absent';
      return 'unmarked';
    };

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

      const pId = `${reg.id}-primary`;
      const pAtt = getAttendanceStatus(pId);

      if (!isAddGuestOnly) {
        initialPool.push({
          id: pId,
          name: primaryName,
          email: primaryEmail,
          phone: primaryPhone,
          photoUrl: primaryPhoto,
          type: 'primary',
          status: pAtt === 'absent' ? 'absent' : 'active',
          attendanceStatus: pAtt,
          isPresent: pAtt === 'present',
          skillLevel: event.skillLevel || 'Intermediate',
          duprId,
          adminDuprId,
          duprRating,
          adminDuprRating,
          isDummy: reg.isDummy === true,
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
        const gId = `${reg.id}-guest-${gIdx}`;
        const gAtt = getAttendanceStatus(gId);
        initialPool.push({
          id: gId,
          name: gName,
          email: gEmail,
          phone: primaryPhone,
          photoUrl: (reg.guests?.[gIdx] as any)?.photoUrl || primaryPhoto,
          type: 'guest',
          status: gAtt === 'absent' ? 'absent' : 'active',
          attendanceStatus: gAtt,
          isPresent: gAtt === 'present',
          skillLevel: event.skillLevel || 'Intermediate',
          duprId: (reg.guests?.[gIdx] as any)?.duprId || '',
          adminDuprId: (reg.guests?.[gIdx] as any)?.adminDuprId || '',
          duprRating: (reg.guests?.[gIdx] as any)?.duprRating || '',
          adminDuprRating: (reg.guests?.[gIdx] as any)?.adminDuprRating || '',
          isDummy: reg.isDummy === true,
        });
      }
    });

    // Check if custom roster stored in localStorage
    try {
      const savedRosterStr = localStorage.getItem(`picklepoint_openplay_roster_${event.id}`);
      if (savedRosterStr) {
        const savedRoster = JSON.parse(savedRosterStr) as OpenPlayMatchRosterItem[];
        // Merge extra custom players added manually without duplicating
        const existingIds = new Set(initialPool.map((p) => p.id));
        const existingNames = new Set(initialPool.map((p) => p.name.toLowerCase().trim()));
        savedRoster.forEach((sp) => {
          const isDuplicate =
            existingIds.has(sp.id) ||
            existingIds.has(`${sp.id}-primary`) ||
            existingNames.has(sp.name.toLowerCase().trim());
          if (!isDuplicate) {
            const att = sp.attendanceStatus || getAttendanceStatus(sp.id);
            initialPool.push({
              ...sp,
              attendanceStatus: att,
              isPresent: att === 'present',
            });
            existingIds.add(sp.id);
            existingNames.add(sp.name.toLowerCase().trim());
          } else {
            // Restore status and attendance
            const found = initialPool.find(
              (p) =>
                p.id === sp.id ||
                p.id === `${sp.id}-primary` ||
                p.name.toLowerCase().trim() === sp.name.toLowerCase().trim()
            );
            if (found) {
              if (sp.status) found.status = sp.status;
              if (sp.attendanceStatus) {
                found.attendanceStatus = sp.attendanceStatus;
                found.isPresent = sp.attendanceStatus === 'present';
              }
            }
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

  // Real-time Matches Listener from Firestore & LocalStorage fallback
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // Initial LocalStorage fallback cache
    try {
      const localData = localStorage.getItem(`picklepoint_openplay_matches_${event.id}`);
      if (localData) {
        const parsed = JSON.parse(localData) as OpenPlayMatch[];
        setMatches(parsed);
      }
    } catch (e) {
      console.warn('Failed to read matches from localStorage:', e);
    }

    // Real-time Firestore Listener
    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, 'openplay_matches'), where('eventId', '==', event.id));
        const unsubscribe = onSnapshot(
          q,
          (snap) => {
            if (!isMounted) return;
            const matchMap = new Map<string, OpenPlayMatch>();
            snap.forEach((docSnap) => {
              const data = docSnap.data() as OpenPlayMatch;
              matchMap.set(docSnap.id, { ...data, id: docSnap.id });
            });
            const matchArray = Array.from(matchMap.values()).sort((a, b) => {
              if (a.round !== b.round) return a.round - b.round;
              return a.courtName.localeCompare(b.courtName);
            });
            setMatches(matchArray);
            try {
              localStorage.setItem(`picklepoint_openplay_matches_${event.id}`, JSON.stringify(matchArray));
            } catch (e) {}
            setIsLoading(false);
          },
          (err) => {
            console.warn('Firestore onSnapshot error for openplay_matches:', err);
            setIsLoading(false);
          }
        );

        return () => {
          isMounted = false;
          unsubscribe();
        };
      } catch (err) {
        console.warn('Failed to subscribe to openplay matches:', err);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [event.id]);

  // Helper to remove JavaScript undefined fields before writing to Firestore
  const cleanDocData = (data: any): any => {
    return JSON.parse(
      JSON.stringify(data, (_key, value) => (value === undefined ? null : value))
    );
  };

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
        const promises = updatedMatches.map((m) => {
          const cleaned = cleanDocData(m);
          return setDoc(doc(db!, 'openplay_matches', m.id), cleaned);
        });
        await Promise.all(promises);
      } catch (err) {
        console.error('Failed to save openplay matches to Firestore:', err);
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
        const cleaned = cleanDocData(match);
        await setDoc(doc(db!, 'openplay_matches', match.id), cleaned);
      } catch (err) {
        console.error('Failed to save single match to Firestore:', err);
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

  // Start / Set Match Ongoing
  const handleStartMatch = (matchId: string) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    const updated: OpenPlayMatch = {
      ...match,
      status: 'in_progress',
      winner: undefined,
      updatedAt: new Date().toISOString(),
    };

    persistSingleMatch(updated);
    showToast('🔵 Match marked as LIVE ONGOING!');
  };

  // Direct Score Input Handler (Keyboard input)
  const handleDirectScoreChange = (matchId: string, team: 'red' | 'blue', valStr: string) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    const parsedVal = Math.max(0, parseInt(valStr, 10) || 0);
    const newRedScore = team === 'red' ? parsedVal : match.teamRed.score;
    const newBlueScore = team === 'blue' ? parsedVal : match.teamBlue.score;

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

  // Score Updater (Delta buttons +1 / -1)
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

  // Auto Generation Algorithm (Smart DUPR vs Unique Partner vs Paddle Stacking vs Random Matrix)
  const handleGenerateMatches = (
    algorithm: AutoGenAlgorithmType,
    rounds: number,
    gameType: 'doubles' | 'singles',
    targetPoints: number,
    isSmartMatch: boolean = false,
    selectedCourts?: string[],
    onlyPresent: boolean = false
  ) => {
    const baseQueue = paddleRackQueue.length > 0 ? paddleRackQueue : rosterPool;
    let candidatePool = baseQueue.filter((p) => p.status === 'active');
    if (onlyPresent) {
      candidatePool = candidatePool.filter((p) => p.isPresent || p.attendanceStatus === 'present');
    }

    const activePlayers = candidatePool;

    const playersPerMatch = gameType === 'doubles' ? 4 : 2;

    if (activePlayers.length < playersPerMatch) {
      alert(
        onlyPresent
          ? `You have only ${activePlayers.length} present (checked-in) player(s). You need at least ${playersPerMatch} present players to generate ${gameType} matches. Please check in more players or turn off the "Only Include Present Players" switch.`
          : `You need at least ${playersPerMatch} active players in the roster pool to generate ${gameType} matches.`
      );
      return;
    }

    const courtsToUse = selectedCourts && selectedCourts.length > 0 ? selectedCourts : assignedCourts;
    const courtCount = courtsToUse.length;
    const startingRound = matches.length > 0 ? Math.max(...matches.map((m) => m.round)) + 1 : 1;

    // SMART MATCH DUPR DIRECTOR ENGINE
    if (isSmartMatch) {
      const result = generateSmartDuprMatches({
        eventId: event.id,
        rosterPool: activePlayers,
        assignedCourts: courtsToUse,
        totalRounds: rounds,
        targetPoints,
        gameType,
        existingMatches: matches,
        startingRound,
      });

      if (result.matches.length === 0) {
        alert('Could not generate DUPR Smart Matches. Please ensure you have at least 4 active players for doubles and assigned courts.');
        return;
      }

      const combined = [...matches, ...result.matches];
      persistMatches(combined);
      setIsAutoGenModalOpen(false);
      showToast(
        `🏆 DUPR Smart Match generated ${result.matches.length} matches with ${result.partnerUniquenessPercent}% Unique Partners and 1&4 vs 2&3 rating parity across ${courtCount} court(s)${
          onlyPresent ? ` (${activePlayers.length} present players only)` : ''
        }!`
      );
      return;
    }

    // ALGORITHM 1: UNIQUE PARTNER ROTATION (Guaranteed Unique Partner Each Game)
    if (algorithm === 'unique_partner') {
      const result = generateUniquePartnerMatches({
        eventId: event.id,
        rosterPool: activePlayers,
        assignedCourts: courtsToUse,
        totalRounds: rounds,
        targetPoints,
        gameType,
        existingMatches: matches,
        startingRound,
        isSmartMatch,
      });

      if (result.matches.length === 0) {
        alert('Could not generate matches. Please ensure you have at least 4 active players for doubles and assigned courts.');
        return;
      }

      const combined = [...matches, ...result.matches];
      persistMatches(combined);
      setIsAutoGenModalOpen(false);
      showToast(
        isSmartMatch
          ? `🏆 DUPR Rated Unique Partner: Generated ${result.matches.length} matches with ${result.partnerUniquenessPercent}% Unique Partners and rating balance across ${courtCount} court(s)!`
          : `✨ Generated ${result.matches.length} matches with ${result.partnerUniquenessPercent}% Unique Partners across ${courtCount} court(s)!`
      );
      return;
    }

    const newMatches: OpenPlayMatch[] = [];

    const mapRosterToMatchPlayer = (p: OpenPlayMatchRosterItem): OpenPlayMatchPlayer => ({
      id: p.id,
      name: p.name,
      photoUrl: p.photoUrl,
      skillLevel: p.skillLevel,
      type: p.type,
      duprId: p.adminDuprId || p.duprId || undefined,
      duprRating: p.adminDuprRating || p.duprRating || undefined,
    });

    // Number of games required in 1 Round so every active player plays at least once
    const gamesPerRound = Math.max(1, Math.ceil(activePlayers.length / playersPerMatch));

    // ALGORITHM 2: PADDLE STACKING (Continuous Queue & 1&4 vs 2&3 Split)
    if (algorithm === 'paddle_stacking') {
      let queue = [...activePlayers];
      let globalCourtCounter = 0;

      for (let r = startingRound; r < startingRound + rounds; r++) {
        for (let gIdx = 0; gIdx < gamesPerRound; gIdx++) {
          if (queue.length < playersPerMatch) break;
          const courtName =
            courtsToUse[globalCourtCounter % courtCount] ||
            `Court ${(globalCourtCounter % courtCount) + 1}`;
          globalCourtCounter++;

          if (gameType === 'doubles') {
            // Pull top 4 from front of queue: [P1, P2, P3, P4]
            const p1 = queue.shift()!;
            const p2 = queue.shift()!;
            const p3 = queue.shift()!;
            const p4 = queue.shift()!;

            // 1 & 4 vs 2 & 3 Pairing Split Rule:
            // Team Red = [P1, P4] (1st & 4th in queue)
            // Team Blue = [P2, P3] (2nd & 3rd in queue)
            const teamRedPlayers: OpenPlayMatchPlayer[] = [
              mapRosterToMatchPlayer(p1),
              mapRosterToMatchPlayer(p4),
            ];
            const teamBluePlayers: OpenPlayMatchPlayer[] = [
              mapRosterToMatchPlayer(p2),
              mapRosterToMatchPlayer(p3),
            ];

            // Return all 4 players to the back of the queue in rotated order
            queue.push(p1, p4, p2, p3);

            const matchId = `op-stack-${event.id}-r${r}-g${gIdx + 1}-${Date.now()}`;
            newMatches.push({
              id: matchId,
              eventId: event.id,
              round: r,
              matchName: `Game ${matches.length + newMatches.length + 1}`,
              courtName,
              gameType: 'doubles',
              targetPoints,
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
              mapRosterToMatchPlayer(p1),
            ];
            const teamBluePlayers: OpenPlayMatchPlayer[] = [
              mapRosterToMatchPlayer(p2),
            ];

            queue.push(p1, p2);

            const matchId = `op-stack-${event.id}-r${r}-g${gIdx + 1}-${Date.now()}`;
            newMatches.push({
              id: matchId,
              eventId: event.id,
              round: r,
              matchName: `Game ${matches.length + newMatches.length + 1}`,
              courtName,
              gameType: 'singles',
              targetPoints,
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
      // ALGORITHM 3: Random Rotational Matrix (Full Rotation per Round)
      const availablePool = [...activePlayers];
      let globalCourtCounter = 0;

      for (let r = startingRound; r < startingRound + rounds; r++) {
        const shuffled = [...availablePool].sort(() => Math.random() - 0.5);

        for (let m = 0; m < gamesPerRound; m++) {
          const courtName =
            courtsToUse[globalCourtCounter % courtCount] ||
            `Court ${(globalCourtCounter % courtCount) + 1}`;
          globalCourtCounter++;

          const matchPlayers: OpenPlayMatchRosterItem[] = [];
          for (let pIdx = 0; pIdx < playersPerMatch; pIdx++) {
            matchPlayers.push(shuffled[(m * playersPerMatch + pIdx) % shuffled.length]);
          }

          let teamRedPlayers: OpenPlayMatchPlayer[] = [];
          let teamBluePlayers: OpenPlayMatchPlayer[] = [];

          if (gameType === 'doubles') {
            teamRedPlayers = matchPlayers.slice(0, 2).map(mapRosterToMatchPlayer);
            teamBluePlayers = matchPlayers.slice(2, 4).map(mapRosterToMatchPlayer);
          } else {
            teamRedPlayers = [matchPlayers[0]].map(mapRosterToMatchPlayer);
            teamBluePlayers = [matchPlayers[1]].map(mapRosterToMatchPlayer);
          }

          const matchId = `op-match-${event.id}-r${r}-m${m + 1}-${Date.now()}`;
          newMatches.push({
            id: matchId,
            eventId: event.id,
            round: r,
            matchName: `Game ${matches.length + newMatches.length + 1}`,
            courtName,
            gameType,
            targetPoints,
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
      algorithm === 'paddle_stacking'
        ? `🏓 Paddle Stacking: Generated ${rounds} rounds (${newMatches.length} games total, ${gamesPerRound} games/round) across ${courtCount} court(s)!`
        : `🎲 Generated ${rounds} rounds (${newMatches.length} games total, ${gamesPerRound} games/round) across ${courtCount} court(s)!`
    );
  };

  // Manual Match Save
  const handleSaveManualMatch = (matchData: {
    matchName: string;
    round: number;
    courtName: string;
    gameType: 'doubles' | 'singles';
    targetPoints: number;
    selectedRedPlayerIds: string[];
    selectedBluePlayerIds: string[];
    editingMatch: OpenPlayMatch | null;
  }) => {
    const mapPlayers = (ids: string[]): OpenPlayMatchPlayer[] => {
      return ids.map((id) => {
        const item = rosterPool.find((p) => p.id === id);
        return {
          id,
          name: item ? item.name : 'Player',
          photoUrl: item?.photoUrl,
          skillLevel: item?.skillLevel,
          type: item?.type,
          duprId: item?.adminDuprId || item?.duprId || undefined,
          duprRating: item?.adminDuprRating || item?.duprRating || undefined,
        };
      });
    };

    const redList = mapPlayers(matchData.selectedRedPlayerIds);
    const blueList = mapPlayers(matchData.selectedBluePlayerIds);

    if (matchData.editingMatch) {
      const updated: OpenPlayMatch = {
        ...matchData.editingMatch,
        round: matchData.round,
        matchName: matchData.matchName.trim() || `Game ${matchData.round}`,
        courtName: matchData.courtName,
        gameType: matchData.gameType,
        targetPoints: matchData.targetPoints,
        teamRed: { ...matchData.editingMatch.teamRed, players: redList },
        teamBlue: { ...matchData.editingMatch.teamBlue, players: blueList },
        updatedAt: new Date().toISOString(),
      };
      persistSingleMatch(updated);
      showToast('Match updated.');
    } else {
      const matchId = `op-match-manual-${Date.now()}`;
      const newMatch: OpenPlayMatch = {
        id: matchId,
        eventId: event.id,
        round: matchData.round,
        matchName: matchData.matchName.trim() || `Game ${matches.filter((m) => m.round === matchData.round).length + 1}`,
        courtName: matchData.courtName,
        gameType: matchData.gameType,
        targetPoints: matchData.targetPoints,
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
  };

  // Add custom player to roster pool
  const handleAddCustomPlayer = () => {
    if (!newPlayerName.trim()) return;
    const maxCap = event.maxParticipants || 16;
    if (rosterPool.length >= maxCap) {
      showToast(`⚠️ Cannot add player: Maximum session capacity of ${maxCap} players reached.`);
      return;
    }
    const newId = `custom-player-${Date.now()}`;
    const newItem: OpenPlayMatchRosterItem = {
      id: newId,
      name: newPlayerName.trim(),
      type: 'guest',
      status: 'active',
      attendanceStatus: 'present',
      isPresent: true,
      skillLevel: newPlayerSkill,
      adminDuprId: newPlayerDuprId.trim() || undefined,
    };
    try {
      const saved = localStorage.getItem('picklepoint_openplay_attendance');
      const attMap = saved ? JSON.parse(saved) : {};
      attMap[newId] = 'present';
      localStorage.setItem('picklepoint_openplay_attendance', JSON.stringify(attMap));
    } catch (e) {}
    const updated = [...rosterPool, newItem];
    saveRosterPool(updated);
    setNewPlayerName('');
    setNewPlayerDuprId('');
    showToast(`Added ${newItem.name} to player pool (marked Present).`);
  };

  // Toggle player attendance check-in status (present <-> unmarked)
  const handleToggleAttendance = (id: string, forceStatus?: 'present' | 'absent' | 'unmarked') => {
    let nextStatus: 'present' | 'absent' | 'unmarked' = 'present';
    const updated: OpenPlayMatchRosterItem[] = rosterPool.map((p) => {
      if (p.id === id) {
        if (forceStatus) {
          nextStatus = forceStatus;
        } else {
          nextStatus = p.isPresent || p.attendanceStatus === 'present' ? 'unmarked' : 'present';
        }
        const resolvedStatus: 'active' | 'resting' | 'absent' =
          nextStatus === 'absent' ? 'absent' : p.status === 'absent' ? 'active' : p.status;
        return {
          ...p,
          attendanceStatus: nextStatus,
          isPresent: nextStatus === 'present',
          status: resolvedStatus,
        };
      }
      return p;
    });

    try {
      const saved = localStorage.getItem('picklepoint_openplay_attendance');
      const attMap = saved ? JSON.parse(saved) : {};
      attMap[id] = nextStatus;
      localStorage.setItem('picklepoint_openplay_attendance', JSON.stringify(attMap));
    } catch (e) {}

    saveRosterPool(updated);
    showToast(
      nextStatus === 'present'
        ? `✓ Checked in player as Present.`
        : `Marked player as Not Arrived (Unmarked).`
    );
  };

  // Bulk check-in all active players as Present
  const handleMarkAllActivePresent = () => {
    try {
      const saved = localStorage.getItem('picklepoint_openplay_attendance');
      const attMap = saved ? JSON.parse(saved) : {};
      const updated: OpenPlayMatchRosterItem[] = rosterPool.map((p) => {
        if (p.status !== 'absent') {
          attMap[p.id] = 'present';
          return { ...p, attendanceStatus: 'present' as const, isPresent: true };
        }
        return p;
      });
      localStorage.setItem('picklepoint_openplay_attendance', JSON.stringify(attMap));
      saveRosterPool(updated);
      showToast('✓ All active players checked in as Present.');
    } catch (e) {}
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

  // Delete player from roster pool
  const handleDeletePlayer = (id: string) => {
    const playerToDelete = rosterPool.find((p) => p.id === id);
    const updated = rosterPool.filter((p) => p.id !== id);
    saveRosterPool(updated);
    showToast(`Deleted ${playerToDelete?.name || 'player'} from roster pool.`);
  };

  // Update player information (DUPR ID, Rating, Skill Level, Name)
  const handleUpdatePlayer = (updatedItem: OpenPlayMatchRosterItem) => {
    const oldPlayer = rosterPool.find((p) => p.id === updatedItem.id);
    const updatedPool = rosterPool.map((p) => (p.id === updatedItem.id ? updatedItem : p));
    saveRosterPool(updatedPool);

    // Sync updated info into existing matches if player name or id matches
    if (oldPlayer) {
      const oldName = oldPlayer.name.trim().toLowerCase();
      const newName = updatedItem.name.trim();
      const newDupr = updatedItem.adminDuprId || updatedItem.duprId || '';
      const newRating = updatedItem.adminDuprRating || updatedItem.duprRating || '';
      const newSkill = updatedItem.skillLevel || '';

      let anyMatchChanged = false;
      const updatedMatches = matches.map((m) => {
        let matchChanged = false;
        const updateP = (p: OpenPlayMatchPlayer): OpenPlayMatchPlayer => {
          const matchById = p.id && p.id === updatedItem.id;
          const matchByName = p.name && p.name.trim().toLowerCase() === oldName;
          if (matchById || matchByName) {
            matchChanged = true;
            return {
              ...p,
              name: newName,
              duprId: newDupr || undefined,
              duprRating: newRating || undefined,
              skillLevel: newSkill || undefined,
            };
          }
          return p;
        };

        const newRedPlayers = m.teamRed.players.map(updateP);
        const newBluePlayers = m.teamBlue.players.map(updateP);

        if (matchChanged) {
          anyMatchChanged = true;
          return {
            ...m,
            teamRed: { ...m.teamRed, players: newRedPlayers },
            teamBlue: { ...m.teamBlue, players: newBluePlayers },
          };
        }
        return m;
      });

      if (anyMatchChanged) {
        persistMatches(updatedMatches);
      }
    }

    showToast(`Updated player info for ${updatedItem.name}.`);
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

  const activeCount = rosterPool.filter((p) => p.status === 'active').length;
  const restingCount = rosterPool.filter((p) => p.status === 'resting').length;
  const absentCount = rosterPool.filter((p) => p.status === 'absent').length;
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
          onClick={(e) => {
            e.stopPropagation();
            if (onBack) onBack();
          }}
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
            onClick={handleAddNewRound}
            className="py-2.5 px-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>+ Add New Round</span>
          </button>

          <button
            type="button"
            onClick={() => openDeleteRoundsModal()}
            className="py-2.5 px-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500 hover:text-white text-rose-300 font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
            title="Select and delete multiple rounds"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Delete Rounds</span>
          </button>

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
            onClick={() => openNewManualMatchModal()}
            className="py-2.5 px-4 rounded-2xl bg-brand-lime hover:bg-[#a6e224] text-dark-bg font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 text-dark-bg" />
            <span>+ Create Manual Match</span>
          </button>

          <button
            type="button"
            onClick={() => openJsonUploadModal()}
            className="py-2.5 px-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500 hover:text-dark-bg text-amber-300 font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
            title="Import matches into Round N from JSON data or file upload"
          >
            <UploadCloud className="w-4 h-4 text-amber-400" />
            <span>📥 Upload Matches JSON</span>
          </button>

          <button
            type="button"
            onClick={() => openGenerateResultsModal('all')}
            className="py-2.5 px-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500 hover:text-dark-bg text-emerald-300 font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
            title="Export match results CSV formatted for DUPR & Match Result uploads (All Rounds)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>📊 Export All Results CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView(activeView === 'leaderboard' ? 'matrix' : 'leaderboard')}
            className={`py-2.5 px-4 rounded-2xl font-black text-xs flex items-center gap-2 cursor-pointer transition-all shadow-lg hover:scale-[1.02] ${
              activeView === 'leaderboard'
                ? 'bg-amber-400 text-dark-bg hover:bg-amber-300 ring-2 ring-amber-300'
                : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-dark-bg'
            }`}
            title="Switch between Match Matrix and Individual Player Leaderboard"
          >
            <Trophy className="w-4 h-4 text-dark-bg" />
            <span>{activeView === 'leaderboard' ? '📋 Match Matrix' : '🏆 Leaderboard Standings'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRosterModalOpen(true)}
            className="py-2.5 px-4 rounded-2xl bg-slate-800 border border-slate-700 hover:border-purple-500/60 text-slate-200 font-extrabold text-xs flex items-center gap-2 cursor-pointer transition-all"
          >
            <Users className="w-4 h-4 text-purple-400" />
            <span>Roster Pool ({activeCount} Active / {restingCount} Bench)</span>
            {absentCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 font-extrabold text-[10px] flex items-center gap-1 shadow-sm">
                ⚠️ {absentCount} Absent
              </span>
            )}
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

          {isNonProductionEnvironment() && (
            <button
              type="button"
              disabled={isSeedingQuickDummy}
              onClick={() => handleQuickSeedDummyPlayers(12)}
              className="py-2.5 px-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500 hover:text-dark-bg text-amber-300 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
              title="[Localhost / Staging Only] Quickly seed 12 mock players into this session for match matrix testing"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{isSeedingQuickDummy ? 'Seeding...' : '🧪 Seed 12 Dummy'}</span>
            </button>
          )}
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

        {/* Search & Accordion Mass Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={handleExpandAllRounds}
              className="px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              title="Expand all round accordions"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={handleCollapseAllRounds}
              className="px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              title="Collapse all round accordions"
            >
              Collapse All
            </button>
          </div>

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
      </div>

      {/* Dynamic View Switcher: Leaderboard Standings View vs Match Matrix View */}
      {activeView === 'leaderboard' ? (
        <OpenPlayLeaderboardView
          sortedLeaderboardList={sortedLeaderboardList}
          matches={matches}
          eventTitle={event.title}
          eventDate={event.eventDate}
          leaderboardSortField={leaderboardSortField}
          leaderboardSearch={leaderboardSearch}
          expandedLeaderboardPlayerId={expandedLeaderboardPlayerId}
          getRoundTitle={getRoundTitle}
          onSortChange={setLeaderboardSortField}
          onSearchChange={setLeaderboardSearch}
          onToggleExpandPlayer={(playerId) =>
            setExpandedLeaderboardPlayerId(expandedLeaderboardPlayerId === playerId ? null : playerId)
          }
          onBackToMatrix={() => setActiveView('matrix')}
          onCopyReportText={handleCopyReportText}
          onExportReportCSV={handleExportReportCSV}
        />
      ) : (
        /* Round-Grouped Matches Matrix */
        isLoading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-lime mx-auto" />
            <p className="text-xs font-semibold">Loading open play matches...</p>
          </div>
        ) : allActiveRounds.length === 0 && matches.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-3xl border border-slate-800 space-y-4">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No Matches Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No matches have been generated yet for this session. Click '+ Add New Round', 'Auto-Generate Round Robin' or '+ Create Manual Match' to get started.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setIsAutoGenModalOpen(true)}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg hover:scale-[1.02] transition-all"
              >
                <Zap className="w-4 h-4 text-brand-lime" /> Auto-Generate Match Matrix
              </button>
              <button
                type="button"
                onClick={() => openJsonUploadModal()}
                className="px-5 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-dark-bg font-black text-xs inline-flex items-center gap-2 cursor-pointer shadow-md hover:scale-[1.02] transition-all"
              >
                <UploadCloud className="w-4 h-4 text-amber-400" /> Upload Matches JSON
              </button>
            </div>

            {isNonProductionEnvironment() && rosterPool.length < 4 && (
              <div className="max-w-md mx-auto p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2 mt-2">
                <div className="flex items-center justify-center gap-1.5 text-amber-300 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Sandbox Testing: Need players to test matches?</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Quickly seed 12 mock players into this event to generate match matrices and test umpire scoring.
                </p>
                <button
                  type="button"
                  disabled={isSeedingQuickDummy}
                  onClick={() => handleQuickSeedDummyPlayers(12)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs inline-flex items-center gap-2 cursor-pointer shadow-md transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  <span>{isSeedingQuickDummy ? 'Seeding 12 Players...' : '🧪 Seed 12 Test Players'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {allActiveRounds.map((roundNum) => {
              const matchesInRound = filteredMatches.filter((m) => m.round === roundNum);

              // Hide round block when search/filter active and no match fits
              if (matchesInRound.length === 0 && (selectedStatusFilter !== 'all' || selectedCourtFilter !== 'all' || searchQuery.trim())) {
                return null;
              }

              return (
                <MatchMatrixRoundAccordion
                  key={roundNum}
                  roundNum={roundNum}
                  roundTitle={getRoundTitle(roundNum)}
                  matchesInRound={matchesInRound}
                  isCollapsed={collapsedRounds.has(roundNum)}
                  isEditingTitle={editingRoundNum === roundNum}
                  tempRoundTitle={tempRoundTitle}
                  onToggleCollapse={toggleRoundCollapse}
                  onStartEditTitle={startEditingRoundTitle}
                  onSaveTitle={handleSaveRoundTitle}
                  onCancelEditTitle={() => setEditingRoundNum(null)}
                  onTempTitleChange={setTempRoundTitle}
                  onOpenResultsModal={openGenerateResultsModal}
                  onOpenJsonModal={openJsonUploadModal}
                  onOpenManualMatchModal={openNewManualMatchModal}
                  onAutoGenerateRound={handleAutoGenerateSingleRound}
                  onDeleteRound={(r) => openDeleteRoundsModal(r)}
                >
                  <div className={`grid gap-4 sm:gap-5 items-stretch ${
                    matchesInRound.length === 1
                      ? 'grid-cols-1 max-w-4xl'
                      : matchesInRound.length === 2
                      ? 'grid-cols-1 md:grid-cols-2'
                      : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                  }`}>
                    {matchesInRound.map((m) => (
                      <MatchMatrixCard
                        key={m.id}
                        match={m}
                        assignedCourts={assignedCourts}
                        roundTitle={getRoundTitle(roundNum)}
                        onInlineCourtChange={handleInlineCourtChange}
                        onStartMatch={handleStartMatch}
                        onCompleteMatch={handleCompleteMatch}
                        onReopenMatch={handleReopenMatch}
                        onScoreDelta={updateMatchScore}
                        onDirectScoreChange={handleDirectScoreChange}
                        onDownloadSingleCsv={handleDownloadSingleMatchCsv}
                        onEditMatch={openEditModal}
                        onDeleteMatch={(match) => setDeletingMatch(match)}
                      />
                    ))}
                  </div>
                </MatchMatrixRoundAccordion>
              );
            })}
          </div>
        )
      )}

      {/* MODAL 1: AUTO-GENERATE MATCH MATRIX */}
      <OpenPlayAutoGenModal
        isOpen={isAutoGenModalOpen}
        onClose={() => setIsAutoGenModalOpen(false)}
        assignedCourts={assignedCourts}
        rosterPool={rosterPool}
        paddleRackQueue={paddleRackQueue}
        initialSessionDurationMinutes={calculateSessionDurationMinutes(event.startTime, event.endTime)}
        isDuprEvent={Boolean(event.isDupr)}
        existingMatches={matches}
        onGenerateMatches={handleGenerateMatches}
      />

      {/* MODAL 2: MANUAL MATCH CREATOR / EDITOR */}
      <OpenPlayManualMatchModal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setEditingMatch(null);
        }}
        editingMatch={editingMatch}
        assignedCourts={assignedCourts}
        targetRound={targetManualRound}
        rosterPool={rosterPool}
        existingMatchesInRoundCount={matches.filter((m) => m.round === targetManualRound).length}
        onSaveManualMatch={handleSaveManualMatch}
      />

      {/* MODAL 3: ROSTER POOL MANAGEMENT */}
      <OpenPlayRosterModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        maxParticipants={event.maxParticipants || 16}
        absentCount={absentCount}
        newPlayerName={newPlayerName}
        setNewPlayerName={setNewPlayerName}
        newPlayerDuprId={newPlayerDuprId}
        setNewPlayerDuprId={setNewPlayerDuprId}
        newPlayerSkill={newPlayerSkill}
        setNewPlayerSkill={setNewPlayerSkill}
        onAddCustomPlayer={handleAddCustomPlayer}
        rosterPool={rosterPool}
        onTogglePlayerStatus={togglePlayerStatus}
        onToggleAttendanceStatus={handleToggleAttendance}
        onMarkAllActivePresent={handleMarkAllActivePresent}
        onDeletePlayer={handleDeletePlayer}
        onUpdatePlayer={handleUpdatePlayer}
      />

      {/* MODAL 4: PLAYER MATCH ACTIVITY & STATISTICS REPORT */}
      <OpenPlayReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        event={event}
        matches={matches}
        rosterPool={rosterPool}
        playerStatsList={playerStatsList}
        reportSortField={reportSortField}
        setReportSortField={setReportSortField}
        onCopyReportText={handleCopyReportText}
        onExportReportCSV={handleExportReportCSV}
      />

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

      {/* MODAL 6: UPLOAD MATCHES VIA JSON */}
      <OpenPlayJsonUploadModal
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        jsonTargetRound={jsonTargetRound}
        setJsonTargetRound={setJsonTargetRound}
        allActiveRounds={allActiveRounds}
        onFileUpload={handleFileUpload}
        onCopySampleJson={handleCopySampleJson}
        isCopySuccess={isCopySuccess}
        jsonInputText={jsonInputText}
        setJsonInputText={setJsonInputText}
        jsonError={jsonError}
        setJsonError={setJsonError}
        onProcessImportJson={handleProcessImportJson}
      />

      {/* MODAL 7: GENERATE MATCH RESULTS CSV */}
      <OpenPlayResultsModal
        isOpen={isResultsModalOpen}
        onClose={() => setIsResultsModalOpen(false)}
        resultsTargetRound={resultsTargetRound}
        setResultsTargetRound={setResultsTargetRound}
        matches={matches}
        allActiveRounds={allActiveRounds}
        getRoundTitle={getRoundTitle}
        resultsEventName={resultsEventName}
        setResultsEventName={setResultsEventName}
        resultsEventDate={resultsEventDate}
        setResultsEventDate={setResultsEventDate}
        resultsLocation={resultsLocation}
        setResultsLocation={setResultsLocation}
        resultsScoreType={resultsScoreType}
        setResultsScoreType={setResultsScoreType}
        resultsIncludeOnlyCompleted={resultsIncludeOnlyCompleted}
        setResultsIncludeOnlyCompleted={setResultsIncludeOnlyCompleted}
        generateMatchResultsCsv={generateMatchResultsCsv}
        onCopyCsvToClipboard={handleCopyCsvToClipboard}
        isResultsCopySuccess={isResultsCopySuccess}
        onDownloadCsv={handleDownloadCsv}
      />

      {/* MODAL 8: DELETE MULTIPLE ROUNDS */}
      <OpenPlayDeleteRoundsModal
        isOpen={isDeleteRoundsModalOpen}
        onClose={() => {
          if (!isDeletingRounds) setIsDeleteRoundsModalOpen(false);
        }}
        rounds={allActiveRounds}
        getRoundTitle={getRoundTitle}
        matches={matches}
        selectedRounds={selectedRoundsToDelete}
        onToggleRound={handleToggleRoundToDelete}
        onSelectAll={handleSelectAllRoundsToDelete}
        onDeselectAll={handleDeselectAllRoundsToDelete}
        onConfirmDelete={handleConfirmDeleteRounds}
        isDeleting={isDeletingRounds}
      />
    </div>
  );
};

export default AdminOpenPlayMatchManagement;
