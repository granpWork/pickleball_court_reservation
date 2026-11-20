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
  X,
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
  type GoogleAiIntegrationSettings,
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
import {
  loadVenueGoogleAiConfig,
  getCachedVenueGoogleAiConfig,
  generateMatchesWithGeminiAi,
} from '../../../services/aiMatchGeneratorService';
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

const getStoredAttendanceTimes = (): Record<string, string> => {
  try {
    const saved = localStorage.getItem('picklepoint_openplay_attendance_times');
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
};

const saveStoredAttendanceTimes = (map: Record<string, string>) => {
  try {
    localStorage.setItem('picklepoint_openplay_attendance_times', JSON.stringify(map));
  } catch (e) {
    console.warn('Failed to save attendance timestamps to localStorage:', e);
  }
};

interface AdminOpenPlayMatchManagementProps {
  event: OpenPlayEvent;
  registrations: OpenPlayRegistrationItem[];
  initialView?: 'matrix' | 'leaderboard';
  backLabel?: string;
  onBack: () => void;
}

export const AdminOpenPlayMatchManagement: React.FC<AdminOpenPlayMatchManagementProps> = ({
  event,
  registrations,
  initialView = 'matrix',
  backLabel = 'Back to Session Details',
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
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'live' | 'scheduled' | 'completed' | 'active'>('all');
  const [selectedCourtFilter, setSelectedCourtFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [partnerQuery, setPartnerQuery] = useState<string>('');
  const [activeSearchDropdown, setActiveSearchDropdown] = useState<'player' | 'partner' | null>(null);

  // Modals visibility & states
  const [isAutoGenModalOpen, setIsAutoGenModalOpen] = useState<boolean>(false);
  const [paddleRackQueue, setPaddleRackQueue] = useState<OpenPlayMatchRosterItem[]>([]);

  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [editingMatch, setEditingMatch] = useState<OpenPlayMatch | null>(null);
  const [targetManualRound, setTargetManualRound] = useState<number>(1);

  // Created rounds state & creation timestamps per round
  const [createdRounds, setCreatedRounds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(`picklepoint_created_rounds_${event.id}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [deletedRounds, setDeletedRounds] = useState<number[]>([]);
  const [roundCreatedAt, setRoundCreatedAt] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem(`picklepoint_round_created_at_${event.id}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return (event as any).roundCreatedAt || {};
  });

  const persistRoundCreatedAt = (updatedMap: Record<number, string>) => {
    setRoundCreatedAt(updatedMap);
    try {
      localStorage.setItem(`picklepoint_round_created_at_${event.id}`, JSON.stringify(updatedMap));
    } catch (e) {
      console.warn('Failed to save roundCreatedAt to localStorage:', e);
    }
    if (isFirebaseConfigured && db && event.id) {
      try {
        setDoc(doc(db, 'openplay_events', event.id), { roundCreatedAt: updatedMap }, { merge: true }).catch((err) =>
          console.warn('Failed to save roundCreatedAt to Firestore:', err)
        );
      } catch (e) {
        console.warn('Failed to save roundCreatedAt to Firestore:', e);
      }
    }
  };

  const stampRoundsCreatedAt = (roundNumbers: number[], overwrite: boolean = true) => {
    if (!roundNumbers || roundNumbers.length === 0) return;
    const nowIso = new Date().toISOString();
    setRoundCreatedAt((prev) => {
      const next = { ...prev };
      let changed = false;
      roundNumbers.forEach((r) => {
        if (overwrite || !next[r]) {
          next[r] = nowIso;
          changed = true;
        }
      });
      if (!changed) return prev;
      try {
        localStorage.setItem(`picklepoint_round_created_at_${event.id}`, JSON.stringify(next));
      } catch (e) {}
      if (isFirebaseConfigured && db && event.id) {
        try {
          setDoc(doc(db, 'openplay_events', event.id), { roundCreatedAt: next }, { merge: true }).catch(() => {});
        } catch (e) {}
      }
      return next;
    });
  };

  const getRoundCreatedAt = (roundNum: number, matchesInRound: OpenPlayMatch[]): string | undefined => {
    if (roundCreatedAt[roundNum]) return roundCreatedAt[roundNum];
    let earliest: string | undefined;
    let earliestTs = Infinity;
    for (const m of matchesInRound) {
      if (!m.createdAt) continue;
      const ts = new Date(m.createdAt).getTime();
      if (!Number.isNaN(ts) && ts < earliestTs) {
        earliestTs = ts;
        earliest = m.createdAt;
      }
    }
    return earliest;
  };

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
    // Round 1 is always available as the base starting round unless explicitly deleted
    if (!deletedRounds.includes(1)) {
      setRounds.add(1);
    }
    return Array.from(setRounds).sort((a, b) => a - b);
  }, [matches, createdRounds, deletedRounds]);

  const nextStartingRound = useMemo(() => {
    const activeRoundNumbers = Array.from(new Set(matches.map((m) => Number(m.round)))).filter(
      (r) => !deletedRounds.includes(r)
    );
    return activeRoundNumbers.length > 0 ? Math.max(...activeRoundNumbers) + 1 : 1;
  }, [matches, deletedRounds]);

  const handleAddNewRound = () => {
    const currentRounds = allActiveRounds;
    const maxRound = currentRounds.length ? Math.max(...currentRounds) : 0;
    const nextRound = maxRound + 1;
    setDeletedRounds((prev) => prev.filter((r) => r !== nextRound));
    setCreatedRounds((prev) => {
      const combined = Array.from(new Set([...prev, ...currentRounds, nextRound])).sort((a, b) => a - b);
      try {
        localStorage.setItem(`picklepoint_created_rounds_${event.id}`, JSON.stringify(combined));
      } catch (e) {}
      return combined;
    });
    stampRoundsCreatedAt([nextRound], true);
    showToast(`⚡ Round ${nextRound} created! Click "Auto-Generate Round ${nextRound}" or "Add Match" to schedule matches.`);
  };

  // Venue Google AI Studio Integration State
  const [aiConfig, setAiConfig] = useState<GoogleAiIntegrationSettings | null>(() =>
    getCachedVenueGoogleAiConfig(event.companyId)
  );
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    loadVenueGoogleAiConfig(event.companyId).then((cfg) => {
      if (isMounted && cfg) {
        setAiConfig(cfg);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [event.companyId]);

  // AI Auto-generate matches for a specific empty round looking at previous match results, DUPR & gameplay type
  const handleAiGenerateSingleRound = async (targetRoundNum: number) => {
    let onlyCheckedIn = true;
    try {
      const saved = localStorage.getItem('picklepoint_openplay_only_checkedin');
      if (saved !== null) {
        onlyCheckedIn = saved === 'true';
      }
    } catch (e) {}

    const activeFromPool = rosterPool.filter((p) => p.status === 'active');
    const presentPlayers = activeFromPool.filter((p) => p.isPresent || p.attendanceStatus === 'present');
    const candidatePlayers = onlyCheckedIn ? presentPlayers : activeFromPool;

    const gameType: 'doubles' | 'singles' = 'doubles';
    const playersPerMatch = gameType === 'doubles' ? 4 : 2;

    if (candidatePlayers.length < playersPerMatch) {
      if (onlyCheckedIn) {
        showToast(`⚠️ Only ${candidatePlayers.length} checked-in player(s). Need at least ${playersPerMatch} for Round ${targetRoundNum}.`);
      } else {
        showToast(`⚠️ Need at least ${playersPerMatch} active players to generate Round ${targetRoundNum}.`);
      }
      return;
    }

    const courtsToUse = assignedCourts.length > 0 ? assignedCourts : ['Court 1'];
    const priorMatches = matches.filter((m) => m.round < targetRoundNum);

    let allowOverflow = false;
    try {
      const savedOverflow = localStorage.getItem('picklepoint_openplay_allow_overflow');
      if (savedOverflow !== null) {
        allowOverflow = savedOverflow === 'true';
      }
    } catch (e) {}

    const isDupr = Boolean(event.isDupr);
    const gameplayMode =
      event.rotationRule === 'winners_stay' || event.rotationRule === 'split_winners'
        ? 'winners_stay'
        : 'unique_partner';

    setIsAiGenerating(true);
    try {
      const aiResponse = await generateMatchesWithGeminiAi({
        eventId: event.id,
        companyId: event.companyId,
        rosterPool: candidatePlayers,
        assignedCourts: courtsToUse,
        totalRounds: 1,
        startingRound: targetRoundNum,
        targetPoints: 11,
        gameType,
        algorithm: gameplayMode,
        isSmartMatch: isDupr || true,
        allowOverflowMatch: allowOverflow,
        existingMatches: priorMatches,
      });

      if (aiResponse.matches.length === 0) {
        showToast(`⚠️ Could not generate matches for Round ${targetRoundNum}.`);
        return;
      }

      const cleanMatches = matches.filter((m) => m.round !== targetRoundNum);
      const combined = [...cleanMatches, ...aiResponse.matches];
      persistMatches(combined);
      stampRoundsCreatedAt([targetRoundNum], true);

      showToast(
        aiResponse.usedFallback
          ? `⚡ ${aiResponse.aiSummary}`
          : `✨ Gemini AI generated Round ${targetRoundNum} (${aiResponse.matches.length} games): ${aiResponse.aiSummary}`
      );
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Auto-generate matches for a specific empty round (e.g. Round 2 created via "+ Add New Round")
  // looking at all previous rounds to ensure zero duplicate games & unique partners
  const handleAutoGenerateSingleRound = (targetRoundNum: number) => {
    let onlyCheckedIn = true;
    try {
      const saved = localStorage.getItem('picklepoint_openplay_only_checkedin');
      if (saved !== null) {
        onlyCheckedIn = saved === 'true';
      }
    } catch (e) {}

    const activeFromPool = rosterPool.filter((p) => p.status === 'active');
    const presentPlayers = activeFromPool.filter((p) => p.isPresent || p.attendanceStatus === 'present');

    // Strict attendance mode: if setting is active, use only checked-in players; otherwise include all active players
    const candidatePlayers = onlyCheckedIn ? presentPlayers : activeFromPool;

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

    let allowOverflow = false;
    try {
      const savedOverflow = localStorage.getItem('picklepoint_openplay_allow_overflow');
      if (savedOverflow !== null) {
        allowOverflow = savedOverflow === 'true';
      }
    } catch (e) {}

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
        allowOverflowMatch: allowOverflow,
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
        allowOverflowMatch: allowOverflow,
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
    stampRoundsCreatedAt([targetRoundNum], true);

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

    const roundsArray = Array.from(selectedRoundsToDelete).map((r) => Number(r));
    setIsDeletingRounds(true);

    try {
      const roundSet = new Set(roundsArray);

      // 1. Separate matches to delete vs matches to keep
      const matchesToDelete = matches.filter((m) => roundSet.has(Number(m.round)));
      const survivingMatches = matches.filter((m) => !roundSet.has(Number(m.round)));

      // Surviving rounds that currently exist either in matches or createdRounds
      const survivingMatchRounds = Array.from(new Set(survivingMatches.map((m) => Number(m.round))));
      const survivingCreatedRounds = createdRounds.filter((r) => !roundSet.has(Number(r)));
      const survivingDistinctRounds = Array.from(
        new Set([...survivingMatchRounds, ...survivingCreatedRounds])
      ).sort((a, b) => a - b);

      // Check if ALL rounds are being deleted
      const isDeletingAllRounds = survivingDistinctRounds.length === 0;

      if (isDeletingAllRounds) {
        // Complete Clean Slate: strictly reset everything back to initial empty state
        setMatches([]);
        setCreatedRounds([]);
        setDeletedRounds([]);
        setRoundTitles({});
        setRoundCreatedAt({});
        setCollapsedRounds(new Set());

        try {
          localStorage.removeItem(`picklepoint_openplay_matches_${event.id}`);
          localStorage.removeItem(`picklepoint_round_titles_${event.id}`);
          localStorage.removeItem(`picklepoint_round_created_at_${event.id}`);
          localStorage.removeItem(`picklepoint_created_rounds_${event.id}`);
        } catch (e) {
          console.warn('Failed to clear matches/titles in localStorage:', e);
        }
        if (isFirebaseConfigured && db && event.id) {
          try {
            setDoc(doc(db, 'openplay_events', event.id), { roundCreatedAt: {} }, { merge: true }).catch(() => {});
          } catch (e) {}
        }

        // Delete from Firestore
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
        showToast(`🗑️ ${countStr} deleted. Round numbering reset to Round 1.`);
        setIsDeleteRoundsModalOpen(false);
        setSelectedRoundsToDelete(new Set());
        return;
      }

      // Partial Deletion: Seamlessly re-sequence surviving rounds into contiguous [1..N]
      // Build re-mapping dictionary: oldRound -> newRound (1, 2, 3...)
      const roundMap = new Map<number, number>();
      survivingDistinctRounds.forEach((oldRound, idx) => {
        roundMap.set(oldRound, idx + 1);
      });

      // Remap matches and update game names within each resequenced round
      const remappedMatches: OpenPlayMatch[] = [];
      const matchesByNewRound = new Map<number, OpenPlayMatch[]>();

      for (const m of survivingMatches) {
        const oldR = Number(m.round);
        const newR = roundMap.get(oldR) ?? oldR;
        if (!matchesByNewRound.has(newR)) {
          matchesByNewRound.set(newR, []);
        }
        matchesByNewRound.get(newR)!.push({ ...m, round: newR });
      }

      // Re-sequence matches inside each round so game numbering stays tidy
      Array.from(matchesByNewRound.keys())
        .sort((a, b) => a - b)
        .forEach((newRoundNum) => {
          const listInRound = matchesByNewRound.get(newRoundNum)!;
          listInRound.forEach((m, gIdx) => {
            remappedMatches.push({
              ...m,
              round: newRoundNum,
              matchName: `Game ${gIdx + 1}`,
              updatedAt: new Date().toISOString(),
            });
          });
        });

      // Remap createdRounds
      const remappedCreatedRounds = survivingCreatedRounds
        .map((oldR) => roundMap.get(oldR) ?? oldR)
        .sort((a, b) => a - b);

      // Remap custom round titles
      const updatedTitles: Record<number, string> = {};
      try {
        const savedTitles = localStorage.getItem(`picklepoint_round_titles_${event.id}`);
        const parsedTitles: Record<number, string> = savedTitles ? JSON.parse(savedTitles) : roundTitles;
        for (const [oldRStr, title] of Object.entries(parsedTitles)) {
          const oldR = Number(oldRStr);
          const newR = roundMap.get(oldR);
          if (newR !== undefined) {
            updatedTitles[newR] = title === `Round ${oldR}` ? `Round ${newR}` : title;
          }
        }
      } catch (e) {}

      // Remap round creation timestamps
      const updatedRoundCreatedAt: Record<number, string> = {};
      for (const [oldRStr, ts] of Object.entries(roundCreatedAt)) {
        const oldR = Number(oldRStr);
        const newR = roundMap.get(oldR);
        if (newR !== undefined && ts) {
          updatedRoundCreatedAt[newR] = ts;
        }
      }

      // Clean collapsed rounds state with re-mapped round numbers
      const nextCollapsed = new Set<number>();
      for (const oldR of collapsedRounds) {
        const newR = roundMap.get(oldR);
        if (newR !== undefined) nextCollapsed.add(newR);
      }

      // Update state
      setMatches(remappedMatches);
      setCreatedRounds(remappedCreatedRounds);
      setDeletedRounds([]); // Clear deleted rounds since all surviving rounds are now contiguous 1..N
      setRoundTitles(updatedTitles);
      persistRoundCreatedAt(updatedRoundCreatedAt);
      setCollapsedRounds(nextCollapsed);

      // Persist to localStorage
      try {
        localStorage.setItem(`picklepoint_openplay_matches_${event.id}`, JSON.stringify(remappedMatches));
        localStorage.setItem(`picklepoint_round_titles_${event.id}`, JSON.stringify(updatedTitles));
        localStorage.setItem(`picklepoint_created_rounds_${event.id}`, JSON.stringify(remappedCreatedRounds));
      } catch (e) {
        console.warn('Failed to update localStorage after resequencing:', e);
      }

      // Delete removed matches from Firestore
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

      // Update re-mapped matches in Firestore
      if (isFirebaseConfigured && db && remappedMatches.length > 0) {
        try {
          const updatePromises = remappedMatches.map((m) => {
            const cleaned = cleanDocData(m);
            return setDoc(doc(db!, 'openplay_matches', m.id), cleaned);
          });
          await Promise.all(updatePromises);
        } catch (err) {
          console.error('Error updating remapped matches in Firestore:', err);
        }
      }

      const countStr =
        roundsArray.length === 1
          ? `Round ${roundsArray[0]}`
          : `${roundsArray.length} rounds`;
      showToast(`🗑️ ${countStr} deleted. Surviving rounds re-sequenced cleanly.`);
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
  const [activeView, setActiveView] = useState<'matrix' | 'leaderboard'>(initialView);

  useEffect(() => {
    if (initialView) {
      setActiveView(initialView);
    }
  }, [initialView]);
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
      stampRoundsCreatedAt(importedRounds, false);

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

  // Compute Per-Player Match Statistics from ALL players in rosterPool AND matches
  const playerStatsList = useMemo<PlayerMatchStats[]>(() => {
    // Collect all unique players by name & ID so standings populate even if rosterPool is empty on device
    const playersMap = new Map<string, { id: string; name: string; type?: 'primary' | 'guest' }>();

    // 1. Add all players from rosterPool
    rosterPool.forEach((p) => {
      const key = (p.name || '').trim().toLowerCase() || p.id;
      if (key) {
        playersMap.set(key, { id: p.id, name: p.name || 'Player', type: p.type });
      }
    });

    // 2. Also add any players appearing in matches
    matches.forEach((m) => {
      const allMatchPlayers = [...(m.teamRed?.players || []), ...(m.teamBlue?.players || [])];
      allMatchPlayers.forEach((p) => {
        if (!p) return;
        const key = (p.name || '').trim().toLowerCase() || p.id;
        if (key && !playersMap.has(key)) {
          playersMap.set(key, { id: p.id || key, name: p.name || 'Player', type: p.type });
        }
      });
    });

    return Array.from(playersMap.values()).map((player) => {
      let totalMatches = 0;
      let completedMatches = 0;
      let wins = 0;
      let losses = 0;
      let ties = 0;
      let pointsScored = 0;
      let pointsConceded = 0;
      const courtsBreakdown: Record<string, number> = {};

      const pKey = (player.name || '').trim().toLowerCase();

      matches.forEach((m) => {
        const redPlayers = Array.isArray(m.teamRed?.players) ? m.teamRed.players : [];
        const bluePlayers = Array.isArray(m.teamBlue?.players) ? m.teamBlue.players : [];

        const isRed = redPlayers.some(
          (p) => (p?.id && p.id === player.id) || (p?.name && p.name.trim().toLowerCase() === pKey)
        );
        const isBlue = bluePlayers.some(
          (p) => (p?.id && p.id === player.id) || (p?.name && p.name.trim().toLowerCase() === pKey)
        );

        if (isRed || isBlue) {
          totalMatches++;
          courtsBreakdown[m.courtName] = (courtsBreakdown[m.courtName] || 0) + 1;

          if (isRed) {
            pointsScored += Number(m.teamRed?.score || 0);
            pointsConceded += Number(m.teamBlue?.score || 0);
          } else {
            pointsScored += Number(m.teamBlue?.score || 0);
            pointsConceded += Number(m.teamRed?.score || 0);
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
        playerType: (player.type === 'guest' ? 'guest' : 'primary') as 'primary' | 'guest',
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

    let attendanceMap: Record<string, any> = {};
    try {
      const savedAtt = localStorage.getItem('picklepoint_openplay_attendance');
      if (savedAtt) attendanceMap = JSON.parse(savedAtt);
    } catch (e) {}
    const attendanceTimeMap = getStoredAttendanceTimes();

    const getAttendanceStatus = (id: string): 'present' | 'absent' | 'unmarked' => {
      const val = attendanceMap[id];
      if (val === true || val === 'present') return 'present';
      if (val === 'absent') return 'absent';
      return 'unmarked';
    };

    const getCheckInTimestamp = (id: string, fallbackId?: string): string | undefined => {
      return attendanceTimeMap[id] || (fallbackId ? attendanceTimeMap[fallbackId] : undefined);
    };

    // If this is a Match Matrix event or has an embedded cloud rosterPool, load directly from authoritative roster pool
    if (event.isMatchMatrix || (event.rosterPool && event.rosterPool.length > 0)) {
      try {
        let savedRoster: OpenPlayMatchRosterItem[] | null = null;
        const savedRosterStr = localStorage.getItem(`picklepoint_openplay_roster_${event.id}`);
        if (savedRosterStr) {
          savedRoster = JSON.parse(savedRosterStr) as OpenPlayMatchRosterItem[];
        } else if (Array.isArray(event.rosterPool) && event.rosterPool.length > 0) {
          savedRoster = event.rosterPool;
          try {
            localStorage.setItem(`picklepoint_openplay_roster_${event.id}`, JSON.stringify(event.rosterPool));
          } catch (e) {}
        }
        if (Array.isArray(savedRoster) && savedRoster.length > 0) {
          // Deduplicate duplicate items that have matching base ID (e.g. id vs id-primary)
          const seenIds = new Set<string>();
          const uniqueRoster: OpenPlayMatchRosterItem[] = [];
          for (const p of savedRoster) {
            const baseId = (p.id || '').replace(/-primary$/, '');
            if (!seenIds.has(baseId)) {
              seenIds.add(baseId);
              const isPresentFlag = Boolean(p.isPresent || p.attendanceStatus === 'present');
              uniqueRoster.push({
                ...p,
                checkedInAt: isPresentFlag
                  ? p.checkedInAt || getCheckInTimestamp(p.id, baseId) || undefined
                  : undefined,
              });
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
      } catch (e) {
        console.warn('Failed to load matrix roster from localStorage / cloud:', e);
      }
    }

    const eventRegs = combinedRegs.filter(
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

      const pId = `${reg.id}-primary`;
      const pAtt = getAttendanceStatus(pId);

      if (!isAddGuestOnly) {
        initialPool.push({
          id: pId,
          registrationId: reg.id,
          name: primaryName,
          email: primaryEmail,
          phone: primaryPhone,
          photoUrl: primaryPhoto,
          type: 'primary',
          status: pAtt === 'absent' ? 'absent' : 'active',
          attendanceStatus: pAtt,
          isPresent: pAtt === 'present',
          checkedInAt: pAtt === 'present' ? getCheckInTimestamp(pId, reg.id) : undefined,
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
          registrationId: reg.id,
          name: gName,
          email: gEmail,
          phone: primaryPhone,
          photoUrl: (reg.guests?.[gIdx] as any)?.photoUrl || primaryPhoto,
          type: 'guest',
          status: gAtt === 'absent' ? 'absent' : 'active',
          attendanceStatus: gAtt,
          isPresent: gAtt === 'present',
          checkedInAt: gAtt === 'present' ? getCheckInTimestamp(gId) : undefined,
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
              checkedInAt: att === 'present' ? sp.checkedInAt || getCheckInTimestamp(sp.id) : undefined,
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
                found.checkedInAt =
                  sp.attendanceStatus === 'present'
                    ? sp.checkedInAt || found.checkedInAt || getCheckInTimestamp(found.id, sp.id)
                    : undefined;
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

  // Save roster pool status changes to localStorage & Firestore
  const saveRosterPool = (updated: OpenPlayMatchRosterItem[]) => {
    setRosterPool(updated);
    try {
      localStorage.setItem(`picklepoint_openplay_roster_${event.id}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save roster pool to localStorage:', e);
    }

    if (isFirebaseConfigured && db) {
      try {
        const cleanedRoster = JSON.parse(
          JSON.stringify(updated, (_, v) => (v === undefined ? null : v))
        );
        setDoc(doc(db, 'openplay_events', event.id), { rosterPool: cleanedRoster }, { merge: true }).catch((err) =>
          console.warn('Failed to sync rosterPool to Firestore:', err)
        );
      } catch (err) {
        console.warn('Failed to sync rosterPool to Firestore:', err);
      }
    }
  };

  // Synchronize authoritative event document (rosterPool, roundTitles, roundCreatedAt) from Firestore
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !event.id) return;
    let isMounted = true;

    try {
      const unsubEvent = onSnapshot(
        doc(db, 'openplay_events', event.id),
        (snap) => {
          if (!isMounted || !snap.exists()) return;
          const data = snap.data();
          if (Array.isArray(data.rosterPool) && data.rosterPool.length > 0) {
            setRosterPool((prev) => {
              if (prev.length === 0 || data.rosterPool.length !== prev.length) {
                setPaddleRackQueue(data.rosterPool.filter((p: any) => p.status === 'active'));
                try {
                  localStorage.setItem(`picklepoint_openplay_roster_${event.id}`, JSON.stringify(data.rosterPool));
                } catch (e) {}
                return data.rosterPool;
              }
              return prev;
            });
          }
          if (data.roundTitles && typeof data.roundTitles === 'object') {
            setRoundTitles((prev) => ({ ...data.roundTitles, ...prev }));
          }
          if (data.roundCreatedAt && typeof data.roundCreatedAt === 'object') {
            setRoundCreatedAt((prev) => ({ ...data.roundCreatedAt, ...prev }));
          }
        },
        (err) => {
          console.warn('Firestore onSnapshot error for event doc:', err);
        }
      );

      return () => {
        isMounted = false;
        unsubEvent();
      };
    } catch (e) {
      console.warn('Failed to listen to event document:', e);
    }
  }, [event.id]);

  // Real-time Matches Listener from Firestore & LocalStorage fallback
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // Initial LocalStorage fallback cache - instantly hydrate UI without waiting for network
    try {
      const localData = localStorage.getItem(`picklepoint_openplay_matches_${event.id}`);
      if (localData) {
        const parsed = JSON.parse(localData) as OpenPlayMatch[];
        if (Array.isArray(parsed)) {
          setMatches(parsed);
          setIsLoading(false);
        }
      }
    } catch (e) {
      console.warn('Failed to read matches from localStorage:', e);
    }

    // Safety fallback: if Firestore onSnapshot is delayed by mobile connection, dismiss spinner after 2.5s
    const safetyTimer = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 2500);

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
          clearTimeout(safetyTimer);
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
      clearTimeout(safetyTimer);
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
    setCreatedRounds([]);
    setDeletedRounds([]);
    setRoundTitles({});
    setRoundCreatedAt({});
    setCollapsedRounds(new Set());

    try {
      localStorage.removeItem(`picklepoint_openplay_matches_${event.id}`);
      localStorage.removeItem(`picklepoint_round_titles_${event.id}`);
      localStorage.removeItem(`picklepoint_round_created_at_${event.id}`);
    } catch (e) {}

    if (isFirebaseConfigured && db) {
      try {
        setDoc(doc(db, 'openplay_events', event.id), { roundCreatedAt: {} }, { merge: true }).catch(() => {});
        const snap = await getDocs(query(collection(db, 'openplay_matches'), where('eventId', '==', event.id)));
        for (const d of snap.docs) {
          await deleteDoc(doc(db, 'openplay_matches', d.id));
        }
      } catch (e) {}
    }
    showToast('All matches cleared. Round counter reset to Round 1.');
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

  // Auto Generation Algorithm (Google AI Studio vs Smart DUPR vs Unique Partner vs Paddle Stacking vs Random Matrix)
  const handleGenerateMatches = async (
    algorithm: AutoGenAlgorithmType,
    rounds: number,
    gameType: 'doubles' | 'singles',
    targetPoints: number,
    isSmartMatch: boolean = false,
    selectedCourts?: string[],
    onlyPresent: boolean = true,
    allowOverflowMatch?: boolean,
    useAiEngine: boolean = false,
    aiDirectorNotes?: string
  ) => {
    let effectiveOnlyPresent = onlyPresent;
    try {
      const saved = localStorage.getItem('picklepoint_openplay_only_checkedin');
      if (saved !== null) {
        effectiveOnlyPresent = saved === 'true';
      }
    } catch (e) {}

    let effectiveAllowOverflow = allowOverflowMatch;
    if (effectiveAllowOverflow === undefined) {
      try {
        const saved = localStorage.getItem('picklepoint_openplay_allow_overflow');
        if (saved !== null) {
          effectiveAllowOverflow = saved === 'true';
        }
      } catch (e) {}
    }
    const activeFromRoster = rosterPool.filter((p) => p.status === 'active');
    const baseQueue =
      algorithm === 'paddle_stacking' && paddleRackQueue.length >= activeFromRoster.length
        ? paddleRackQueue
        : rosterPool;
    let candidatePool = baseQueue.filter((p) => p.status === 'active');
    if (effectiveOnlyPresent) {
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
    const activeRoundNumbers = Array.from(new Set(matches.map((m) => Number(m.round)))).filter(
      (r) => !deletedRounds.includes(r)
    );
    const startingRound = activeRoundNumbers.length > 0 ? Math.max(...activeRoundNumbers) + 1 : 1;

    // GOOGLE AI STUDIO (GEMINI) MATCHMAKER ENGINE
    if (useAiEngine) {
      setIsAiGenerating(true);
      try {
        const aiResult = await generateMatchesWithGeminiAi({
          eventId: event.id,
          companyId: event.companyId,
          rosterPool: activePlayers,
          assignedCourts: courtsToUse,
          totalRounds: rounds,
          startingRound,
          targetPoints,
          gameType,
          algorithm,
          isSmartMatch: isSmartMatch || Boolean(event.isDupr),
          allowOverflowMatch: effectiveAllowOverflow,
          existingMatches: matches,
          aiDirectorNotes,
        });

        if (aiResult.matches.length === 0) {
          alert('Could not generate AI matches. Please ensure you have enough active players and assigned courts.');
          return;
        }

        const combined = [...matches, ...aiResult.matches];
        persistMatches(combined);
        stampRoundsCreatedAt(Array.from(new Set(aiResult.matches.map((m) => m.round))), true);
        setIsAutoGenModalOpen(false);
        showToast(aiResult.aiSummary);
      } finally {
        setIsAiGenerating(false);
      }
      return;
    }

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
        allowOverflowMatch: effectiveAllowOverflow,
      });

      if (result.matches.length === 0) {
        alert('Could not generate DUPR Smart Matches. Please ensure you have at least 4 active players for doubles and assigned courts.');
        return;
      }

      const combined = [...matches, ...result.matches];
      persistMatches(combined);
      stampRoundsCreatedAt(Array.from(new Set(result.matches.map((m) => m.round))), true);
      setIsAutoGenModalOpen(false);
      showToast(
        `🏆 DUPR Smart Match generated ${result.matches.length} matches with ${result.partnerUniquenessPercent}% Unique Partners and 1&4 vs 2&3 rating parity across ${courtCount} court(s)${
          onlyPresent ? ` (${activePlayers.length} present players only)` : ''
        }!`
      );
      return;
    }

    // ALGORITHM 1: UNIQUE PARTNER ROTATION (or local Winners Stay fallback)
    if (algorithm === 'unique_partner' || algorithm === 'winners_stay') {
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
        allowOverflowMatch: effectiveAllowOverflow,
      });

      if (result.matches.length === 0) {
        alert('Could not generate matches. Please ensure you have at least 4 active players for doubles and assigned courts.');
        return;
      }

      const combined = [...matches, ...result.matches];
      persistMatches(combined);
      stampRoundsCreatedAt(Array.from(new Set(result.matches.map((m) => m.round))), true);
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

    // Number of games per round respecting allowOverflowMatch
    const fullBatchGamesCount = Math.floor(activePlayers.length / playersPerMatch);
    const gamesPerRound = effectiveAllowOverflow
      ? Math.max(1, Math.ceil(activePlayers.length / playersPerMatch))
      : Math.max(1, fullBatchGamesCount);

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
    stampRoundsCreatedAt(Array.from(new Set(newMatches.map((m) => m.round))), true);
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
      stampRoundsCreatedAt([matchData.round], false);
      showToast('New match created.');
    }

    setIsManualModalOpen(false);
    setEditingMatch(null);
  };

  const updateLocalBookingRecord = (regId: string, updates: Record<string, any>) => {
    ['picklepoint_bookings', 'picklepoint_openplay_registrations'].forEach((key) => {
      ['localStorage', 'sessionStorage'].forEach((storageType) => {
        try {
          const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
          const str = storage.getItem(key);
          if (!str) return;
          const parsed = JSON.parse(str);
          if (!Array.isArray(parsed)) return;
          const updated = parsed.map((item: any) => {
            if (item.id === regId || item.bookingReference === regId || item.bookingId === regId) {
              return { ...item, ...updates };
            }
            return item;
          });
          storage.setItem(key, JSON.stringify(updated));
        } catch (e) {}
      });
    });
  };

  // Add custom player to roster pool (also registers in Firestore openplay_registrations)
  const handleAddCustomPlayer = () => {
    if (!newPlayerName.trim()) return;
    const maxCap = event.maxParticipants || 16;
    if (rosterPool.length >= maxCap) {
      showToast(`⚠️ Cannot add player: Maximum session capacity of ${maxCap} players reached.`);
      return;
    }
    const newId = `custom-player-${Date.now()}`;
    const cleanDuprId = newPlayerDuprId.trim() || undefined;
    const nowIso = new Date().toISOString();
    const newItem: OpenPlayMatchRosterItem = {
      id: newId,
      name: newPlayerName.trim(),
      type: 'guest',
      status: 'active',
      attendanceStatus: 'present',
      isPresent: true,
      checkedInAt: nowIso,
      skillLevel: newPlayerSkill,
      adminDuprId: cleanDuprId,
      duprId: cleanDuprId,
    };
    try {
      const saved = localStorage.getItem('picklepoint_openplay_attendance');
      const attMap = saved ? JSON.parse(saved) : {};
      attMap[newId] = 'present';
      localStorage.setItem('picklepoint_openplay_attendance', JSON.stringify(attMap));

      const attTimeMap = getStoredAttendanceTimes();
      attTimeMap[newId] = nowIso;
      saveStoredAttendanceTimes(attTimeMap);
    } catch (e) {}
    const updated = [...rosterPool, newItem];
    saveRosterPool(updated);

    // Save to openplay_registrations in Firestore & local storage
    if (isFirebaseConfigured && db) {
      const customPayload = {
        id: newId,
        eventId: event.id,
        eventTitle: event.title,
        playerName: newPlayerName.trim(),
        playerEmail: '',
        playerPhone: '',
        playerCount: 1,
        guestCount: 0,
        status: 'approved',
        paymentStatus: 'paid',
        paymentMethod: 'cash',
        createdAt: new Date().toISOString(),
        adminDuprId: cleanDuprId,
        duprId: cleanDuprId,
        isManual: true,
      };
      setDoc(doc(db, 'openplay_registrations', newId), customPayload).catch((err) =>
        console.warn('Failed to save custom player to openplay_registrations:', err)
      );
      ['picklepoint_openplay_registrations'].forEach((key) => {
        ['localStorage', 'sessionStorage'].forEach((st) => {
          try {
            const storage = st === 'localStorage' ? localStorage : sessionStorage;
            const str = storage.getItem(key);
            const list = str ? JSON.parse(str) : [];
            list.push(customPayload);
            storage.setItem(key, JSON.stringify(list));
          } catch (e) {}
        });
      });
    }

    setNewPlayerName('');
    setNewPlayerDuprId('');
    showToast(`Added ${newItem.name} to player pool (marked Present).`);
  };

  // Toggle player attendance check-in status (present <-> unmarked)
  const handleToggleAttendance = (id: string, forceStatus?: 'present' | 'absent' | 'unmarked') => {
    let nextStatus: 'present' | 'absent' | 'unmarked' = 'present';
    const nowIso = new Date().toISOString();
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
          checkedInAt: nextStatus === 'present' ? nowIso : undefined,
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

      const attTimeMap = getStoredAttendanceTimes();
      if (nextStatus === 'present') {
        attTimeMap[id] = nowIso;
      } else {
        delete attTimeMap[id];
      }
      saveStoredAttendanceTimes(attTimeMap);
    } catch (e) {}

    saveRosterPool(updated);
    const formattedTime = new Date(nowIso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    showToast(
      nextStatus === 'present'
        ? `✓ Checked in player as Present at ${formattedTime}.`
        : `Marked player as Not Arrived (Unmarked).`
    );
  };

  // Manual quick edit of a player's check-in arrival time
  const handleUpdateCheckInTime = (id: string, timeHHMM: string) => {
    if (!timeHHMM || !/^\d{2}:\d{2}$/.test(timeHHMM)) return;
    const [hhStr, mmStr] = timeHHMM.split(':');
    const hh = parseInt(hhStr, 10);
    const mm = parseInt(mmStr, 10);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return;

    const targetPlayer = rosterPool.find((p) => p.id === id);
    const baseDate = targetPlayer?.checkedInAt ? new Date(targetPlayer.checkedInAt) : new Date();
    const updatedDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
    updatedDate.setHours(hh, mm, 0, 0);
    const nextIso = updatedDate.toISOString();

    const updated: OpenPlayMatchRosterItem[] = rosterPool.map((p) =>
      p.id === id
        ? {
            ...p,
            attendanceStatus: 'present',
            isPresent: true,
            status: p.status === 'absent' ? 'active' : p.status,
            checkedInAt: nextIso,
          }
        : p
    );

    try {
      const saved = localStorage.getItem('picklepoint_openplay_attendance');
      const attMap = saved ? JSON.parse(saved) : {};
      attMap[id] = 'present';
      localStorage.setItem('picklepoint_openplay_attendance', JSON.stringify(attMap));

      const attTimeMap = getStoredAttendanceTimes();
      attTimeMap[id] = nextIso;
      saveStoredAttendanceTimes(attTimeMap);
    } catch (e) {}

    saveRosterPool(updated);
    const formattedTime = updatedDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    showToast(`🕒 Updated check-in time for ${targetPlayer?.name || 'player'} to ${formattedTime}.`);
  };

  // Bulk check-in all active players as Present
  const handleMarkAllActivePresent = () => {
    try {
      const saved = localStorage.getItem('picklepoint_openplay_attendance');
      const attMap = saved ? JSON.parse(saved) : {};
      const attTimeMap = getStoredAttendanceTimes();
      const nowIso = new Date().toISOString();
      const updated: OpenPlayMatchRosterItem[] = rosterPool.map((p) => {
        if (p.status !== 'absent') {
          const ts = (p.isPresent || p.attendanceStatus === 'present') && (p.checkedInAt || attTimeMap[p.id])
            ? (p.checkedInAt || attTimeMap[p.id])
            : nowIso;
          attMap[p.id] = 'present';
          attTimeMap[p.id] = ts;
          return { ...p, attendanceStatus: 'present' as const, isPresent: true, checkedInAt: ts };
        }
        return p;
      });
      localStorage.setItem('picklepoint_openplay_attendance', JSON.stringify(attMap));
      saveStoredAttendanceTimes(attTimeMap);
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

  // Delete player from roster pool (and cancel registration in Firestore / local storage)
  const handleDeletePlayer = async (id: string) => {
    const playerToDelete = rosterPool.find((p) => p.id === id);
    const updated = rosterPool.filter((p) => p.id !== id);
    saveRosterPool(updated);

    const regId = (playerToDelete as any)?.registrationId || id.replace(/-primary$/, '').replace(/-guest-\d+$/, '');
    const isGuest = playerToDelete?.type === 'guest' || id.includes('-guest-');
    const rawReg = registrations.find((r) => r.id === regId);

    if (isGuest && rawReg) {
      const gIndex = ((playerToDelete as any)?.guestIndex || 1) - 1;
      let existingGuests = Array.isArray(rawReg.guests) ? [...rawReg.guests] : [];
      if (existingGuests.length === 0 && Array.isArray(rawReg.guestNames)) {
        existingGuests = rawReg.guestNames.map((name: string, i: number) => ({
          name,
          email: rawReg.guestEmails?.[i] || '',
        }));
      }
      if (gIndex >= 0 && gIndex < existingGuests.length) {
        existingGuests.splice(gIndex, 1);
      } else {
        existingGuests = existingGuests.filter((g) => (g?.name || '').trim().toLowerCase() !== (playerToDelete?.name || '').trim().toLowerCase());
      }
      const newPlayerCount = Math.max(1, (rawReg.playerCount || 1) - 1);
      const newGuestCount = Math.max(0, (rawReg.guestCount || (existingGuests.length + 1)) - 1);
      const updatePayload = {
        guests: existingGuests,
        guestNames: existingGuests.map((g: any) => g.name).filter(Boolean),
        guestEmails: existingGuests.map((g: any) => g.email).filter(Boolean),
        playerCount: newPlayerCount,
        guestCount: newGuestCount,
      };
      if (isFirebaseConfigured && db && regId) {
        try {
          await setDoc(doc(db, 'openplay_registrations', regId), updatePayload, { merge: true });
        } catch (e) {}
        try {
          await setDoc(doc(db, 'bookings', regId), updatePayload, { merge: true });
        } catch (e) {}
      }
      updateLocalBookingRecord(regId, updatePayload);
    } else {
      if (isFirebaseConfigured && db && regId) {
        try {
          await setDoc(doc(db, 'openplay_registrations', regId), { status: 'cancelled' }, { merge: true });
        } catch (e) {
          console.warn('Error cancelling openplay_registrations doc from match roster:', e);
        }
        try {
          await setDoc(doc(db, 'bookings', regId), { status: 'cancelled' }, { merge: true });
        } catch (e) {
          console.warn('Error cancelling bookings doc from match roster:', e);
        }
      }
      updateLocalBookingRecord(regId, { status: 'cancelled' });
    }

    showToast(`Deleted ${playerToDelete?.name || 'player'} from roster pool.`);
  };

  // Move player to waitlist
  const handleMovePlayerToWaitlist = async (id: string) => {
    const targetPlayer = rosterPool.find((p) => p.id === id);
    if (!targetPlayer) return;
    if (!window.confirm(`Move ${targetPlayer.name} to the waiting list? This will remove them from the active match roster.`)) return;

    const updated = rosterPool.filter((p) => p.id !== id);
    saveRosterPool(updated);

    const regId = (targetPlayer as any)?.registrationId || id.replace(/-primary$/, '').replace(/-guest-\d+$/, '');
    const isGuest = targetPlayer?.type === 'guest' || id.includes('-guest-');
    const rawReg = registrations.find((r) => r.id === regId);

    if (isGuest && rawReg) {
      const gIndex = ((targetPlayer as any)?.guestIndex || 1) - 1;
      let existingGuests = Array.isArray(rawReg.guests) ? [...rawReg.guests] : [];
      if (existingGuests.length === 0 && Array.isArray(rawReg.guestNames)) {
        existingGuests = rawReg.guestNames.map((name: string, i: number) => ({
          name,
          email: rawReg.guestEmails?.[i] || '',
        }));
      }
      if (gIndex >= 0 && gIndex < existingGuests.length) {
        existingGuests.splice(gIndex, 1);
      } else {
        existingGuests = existingGuests.filter((g) => (g?.name || '').trim().toLowerCase() !== (targetPlayer.name || '').trim().toLowerCase());
      }
      const newPlayerCount = Math.max(1, (rawReg.playerCount || 1) - 1);
      const newGuestCount = Math.max(0, (rawReg.guestCount || (existingGuests.length + 1)) - 1);
      const updatePayload = {
        guests: existingGuests,
        guestNames: existingGuests.map((g: any) => g.name).filter(Boolean),
        guestEmails: existingGuests.map((g: any) => g.email).filter(Boolean),
        playerCount: newPlayerCount,
        guestCount: newGuestCount,
      };

      const newWaitlistRegId = `waitlist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newWaitlistReg = {
        id: newWaitlistRegId,
        eventId: event.id,
        eventTitle: event.title,
        playerName: targetPlayer.name,
        playerEmail: targetPlayer.email || '',
        playerPhone: targetPlayer.phone || '',
        playerCount: 1,
        guestCount: 0,
        status: 'waitlisted',
        paymentStatus: 'waitlisted',
        createdAt: new Date().toISOString(),
        duprId: targetPlayer.duprId || '',
        adminDuprId: targetPlayer.adminDuprId || '',
        duprRating: targetPlayer.duprRating || '',
        adminDuprRating: targetPlayer.adminDuprRating || '',
      };

      if (isFirebaseConfigured && db && regId) {
        try {
          await setDoc(doc(db, 'openplay_registrations', regId), updatePayload, { merge: true });
        } catch (e) {}
        try {
          await setDoc(doc(db, 'bookings', regId), updatePayload, { merge: true });
        } catch (e) {}
        try {
          await setDoc(doc(db, 'openplay_registrations', newWaitlistRegId), newWaitlistReg);
        } catch (e) {}
      }
      updateLocalBookingRecord(regId, updatePayload);
      // Sync newWaitlistReg
      ['picklepoint_openplay_registrations'].forEach((key) => {
        ['localStorage', 'sessionStorage'].forEach((st) => {
          try {
            const storage = st === 'localStorage' ? localStorage : sessionStorage;
            const str = storage.getItem(key);
            const list = str ? JSON.parse(str) : [];
            list.push(newWaitlistReg);
            storage.setItem(key, JSON.stringify(list));
          } catch (e) {}
        });
      });
    } else {
      if (isFirebaseConfigured && db && regId) {
        try {
          await setDoc(doc(db, 'openplay_registrations', regId), {
            status: 'waitlisted',
            paymentStatus: 'waitlisted',
          }, { merge: true });
        } catch (e) {
          console.warn('Error moving openplay_registrations doc to waitlist:', e);
        }
        try {
          await setDoc(doc(db, 'bookings', regId), {
            status: 'waitlisted',
            paymentStatus: 'waitlisted',
          }, { merge: true });
        } catch (e) {
          console.warn('Error moving bookings doc to waitlist:', e);
        }
      }
      updateLocalBookingRecord(regId, { status: 'waitlisted', paymentStatus: 'waitlisted' });
    }

    showToast(`⏳ Moved ${targetPlayer.name} to waiting list.`);
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

  // Unique player names from roster + generated matches for search autocomplete
  const availablePlayerNames = useMemo(() => {
    const names = new Set<string>();
    rosterPool.forEach((p) => {
      if (p.name?.trim()) names.add(p.name.trim());
    });
    matches.forEach((m) => {
      m.teamRed.players.forEach((p) => {
        if (p.name?.trim()) names.add(p.name.trim());
      });
      m.teamBlue.players.forEach((p) => {
        if (p.name?.trim()) names.add(p.name.trim());
      });
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [rosterPool, matches]);

  const playerSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const partnerLower = partnerQuery.trim().toLowerCase();
    return availablePlayerNames
      .filter((name) => {
        const lower = name.toLowerCase();
        if (partnerLower && lower === partnerLower) return false;
        return !q || lower.includes(q);
      })
      .slice(0, 8);
  }, [availablePlayerNames, searchQuery, partnerQuery]);

  const partnerSuggestions = useMemo(() => {
    const q = partnerQuery.trim().toLowerCase();
    const playerLower = searchQuery.trim().toLowerCase();
    return availablePlayerNames
      .filter((name) => {
        const lower = name.toLowerCase();
        if (playerLower && lower === playerLower) return false;
        return !q || lower.includes(q);
      })
      .slice(0, 8);
  }, [availablePlayerNames, partnerQuery, searchQuery]);

  const hasSameTeamPair = (players: { name: string }[], q1: string, q2: string): boolean => {
    for (let i = 0; i < players.length; i++) {
      if (!players[i].name.toLowerCase().includes(q1)) continue;
      for (let j = 0; j < players.length; j++) {
        if (i !== j && players[j].name.toLowerCase().includes(q2)) {
          return true;
        }
      }
    }
    return false;
  };

  const isSearchFiltering = Boolean(searchQuery.trim() || partnerQuery.trim());

  // Filtered Matches
  const filteredMatches = matches.filter((m) => {
    if (selectedStatusFilter === 'live' && m.status !== 'in_progress') return false;
    if (selectedStatusFilter === 'scheduled' && m.status !== 'scheduled') return false;
    if (selectedStatusFilter === 'completed' && m.status !== 'completed') return false;
    if (selectedStatusFilter === 'active' && m.status === 'completed') return false;
    if (selectedCourtFilter !== 'all' && m.courtName !== selectedCourtFilter) return false;

    const q1 = searchQuery.trim().toLowerCase();
    const q2 = partnerQuery.trim().toLowerCase();

    if (q1 && q2) {
      return hasSameTeamPair(m.teamRed.players, q1, q2) || hasSameTeamPair(m.teamBlue.players, q1, q2);
    }

    if (q1) {
      const matchCourt = m.courtName.toLowerCase();
      const redNames = m.teamRed.players.map((p) => p.name.toLowerCase()).join(' ');
      const blueNames = m.teamBlue.players.map((p) => p.name.toLowerCase()).join(' ');
      return matchCourt.includes(q1) || redNames.includes(q1) || blueNames.includes(q1);
    }

    if (q2) {
      const redNames = m.teamRed.players.map((p) => p.name.toLowerCase()).join(' ');
      const blueNames = m.teamBlue.players.map((p) => p.name.toLowerCase()).join(' ');
      return redNames.includes(q2) || blueNames.includes(q2);
    }

    return true;
  });

  const activeCount = rosterPool.filter((p) => p.status === 'active').length;
  const restingCount = rosterPool.filter((p) => p.status === 'resting').length;
  const absentCount = rosterPool.filter((p) => p.status === 'absent').length;
  const completedCount = matches.filter((m) => m.status === 'completed').length;
  const liveMatches = matches.filter((m) => m.status === 'in_progress');
  const liveCount = liveMatches.length;
  const scheduledCount = matches.filter((m) => m.status === 'scheduled').length;

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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onBack) onBack();
          }}
          className="inline-flex items-center justify-center sm:justify-start gap-2 text-slate-300 hover:text-white transition-all text-xs font-black uppercase tracking-wider cursor-pointer bg-slate-900 border border-slate-700 hover:border-brand-lime px-4 py-2.5 rounded-2xl shadow-md hover:scale-[1.01] w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4 text-brand-lime shrink-0" /> <span className="truncate">{backLabel}</span>
        </button>

        {/* View Switcher Segmented Tabs - Front & Center on Mobile & Desktop */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 p-1 rounded-2xl shadow-inner w-full sm:w-auto justify-center sm:justify-end">
          <button
            type="button"
            onClick={() => setActiveView('matrix')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeView === 'matrix'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📋 Match Matrix</span>
            <span className="font-mono text-[10px] bg-slate-950/60 px-1.5 py-0.5 rounded-full text-slate-300">
              {matches.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('leaderboard')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeView === 'leaderboard'
                ? 'bg-amber-400 text-dark-bg shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Leaderboard</span>
            <span className="font-mono text-[10px] bg-slate-950/60 px-1.5 py-0.5 rounded-full text-amber-400">
              {sortedLeaderboardList.length}
            </span>
          </button>
        </div>
      </div>

      {/* Hero Header & Assigned Courts Info - Shown in Match Matrix View */}
      {activeView === 'matrix' && (
      <div className="glass-panel border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 shadow-2xl space-y-4 bg-slate-900/60">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs text-brand-lime font-mono uppercase tracking-wider font-bold">
              {event.category || 'Open Play'} • Match Management
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight mt-0.5 break-words">
              {event.title}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
              📅 {event.eventDate} ({event.startTime} - {event.endTime}) • {event.location || 'Venue Location'}
            </p>
          </div>

          {/* Assigned Courts Badges */}
          <div className="w-full md:w-auto bg-slate-950/80 border border-slate-800 rounded-2xl p-3 sm:p-3.5 text-left md:text-right shrink-0 space-y-1">
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

          <div
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'live' ? 'all' : 'live')}
            className={`rounded-2xl p-3 text-left transition-all cursor-pointer ${
              selectedStatusFilter === 'live'
                ? 'bg-blue-600 border-2 border-blue-400 shadow-xl shadow-blue-500/30 ring-2 ring-blue-400/50'
                : liveCount > 0
                ? 'bg-blue-950/40 border-2 border-blue-500/80 shadow-lg shadow-blue-500/20 hover:border-blue-400 ring-1 ring-blue-500/30'
                : 'bg-slate-950/50 border border-slate-800/80'
            }`}
            title="Click to toggle Live matches filter"
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] uppercase font-bold tracking-wider block ${selectedStatusFilter === 'live' ? 'text-white' : 'text-slate-400'}`}>
                Live Matches
              </span>
              {liveCount > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-90" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
                </span>
              )}
            </div>
            <span className={`text-xl font-black font-mono ${selectedStatusFilter === 'live' ? 'text-white' : liveCount > 0 ? 'text-blue-300' : 'text-slate-400'}`}>
              {liveCount}
            </span>
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
      )}

      {/* Main Action Bar - Shown in Match Matrix View */}
      {activeView === 'matrix' && (
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 sm:gap-3 bg-slate-900/80 border border-slate-800 p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-lg">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 w-full xl:w-auto">
          {activeView === 'matrix' && (
            <>
              <button
                type="button"
                onClick={handleAddNewRound}
                className="py-2.5 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-md transition-all hover:scale-[1.02] text-center"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
                <span className="leading-tight">Add New Round</span>
              </button>

              <button
                type="button"
                onClick={() => openDeleteRoundsModal()}
                className="py-2.5 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500 hover:text-white text-rose-300 font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-sm transition-all hover:scale-[1.02] text-center"
                title="Select and delete multiple rounds"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 shrink-0" />
                <span className="leading-tight">Delete Rounds</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAutoGenModalOpen(true)}
                className="py-2.5 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] text-center"
              >
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-lime animate-pulse shrink-0" />
                <span className="leading-tight">Auto-Generate Round Robin</span>
              </button>

              <button
                type="button"
                onClick={() => openNewManualMatchModal()}
                className="py-2.5 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl bg-brand-lime hover:bg-[#a6e224] text-dark-bg font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-md transition-all hover:scale-[1.02] text-center"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-dark-bg shrink-0" />
                <span className="leading-tight">Create Manual Match</span>
              </button>

              <button
                type="button"
                onClick={() => openJsonUploadModal()}
                className="py-2.5 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500 hover:text-dark-bg text-amber-300 font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-sm transition-all hover:scale-[1.02] text-center"
                title="Import matches into Round N from JSON data or file upload"
              >
                <UploadCloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
                <span className="leading-tight">Upload Matches JSON</span>
              </button>

              <button
                type="button"
                onClick={() => openGenerateResultsModal('all')}
                className="py-2.5 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500 hover:text-dark-bg text-emerald-300 font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-sm transition-all hover:scale-[1.02] text-center"
                title="Export match results CSV formatted for DUPR & Match Result uploads (All Rounds)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                <span className="leading-tight">Export All Results CSV</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setActiveView('leaderboard')}
            className="py-2.5 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-all shadow-lg hover:scale-[1.02] bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-dark-bg text-center"
            title="Switch to Individual Player Leaderboard"
          >
            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-dark-bg shrink-0" />
            <span className="leading-tight">🏆 Leaderboard Standings</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRosterModalOpen(true)}
            className="py-2.5 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl bg-slate-800 border border-slate-700 hover:border-purple-500/60 text-slate-200 font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-all text-center flex-wrap"
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 shrink-0" />
            <span className="leading-tight">Roster ({activeCount}A / {restingCount}B)</span>
            {absentCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 font-extrabold text-[10px] flex items-center gap-1 shadow-sm">
                ⚠️ {absentCount} Absent
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="py-2.5 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl bg-brand-emerald/15 border border-brand-emerald/40 text-brand-emerald hover:bg-brand-emerald hover:text-dark-bg font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-all shadow-sm text-center"
            title="View per-player match counts, win records, and export CSV report"
          >
            <BarChart2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-emerald shrink-0" />
            <span className="leading-tight">Player Stats Report</span>
          </button>

          {isNonProductionEnvironment() && (
            <button
              type="button"
              disabled={isSeedingQuickDummy}
              onClick={() => handleQuickSeedDummyPlayers(12)}
              className="py-2.5 px-2.5 sm:px-3.5 rounded-xl sm:rounded-2xl bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500 hover:text-dark-bg text-amber-300 font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all hover:scale-[1.02] text-center"
              title="[Localhost / Staging Only] Quickly seed 12 mock players into this session for match matrix testing"
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              <span className="leading-tight">{isSeedingQuickDummy ? 'Seeding...' : '🧪 Seed 12 Dummy'}</span>
            </button>
          )}
        </div>

        {matches.length > 0 && (
          <button
            type="button"
            onClick={clearAllMatches}
            className="w-full xl:w-auto justify-center py-2 px-3 rounded-xl sm:rounded-2xl bg-red-950/30 border border-red-800/40 text-red-300 hover:bg-red-900/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" /> Clear Matches
          </button>
        )}
      </div>
      )}

      {/* Filters & Search Row - Only shown in Match Matrix View */}
      {activeView === 'matrix' && (
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 text-xs bg-slate-900/50 border border-slate-800/80 p-3 sm:p-3.5 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 min-w-0">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
            <span className="text-slate-400 font-bold text-[11px] uppercase shrink-0 mr-1">Status:</span>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                selectedStatusFilter === 'all'
                  ? 'bg-brand-lime text-dark-bg'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All ({matches.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('live')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                selectedStatusFilter === 'live'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : liveCount > 0
                  ? 'bg-blue-950/60 border border-blue-500/60 text-blue-300 hover:bg-blue-900/60'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {liveCount > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-90" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
                </span>
              )}
              <span>Live ({liveCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('scheduled')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                selectedStatusFilter === 'scheduled'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Scheduled ({scheduledCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                selectedStatusFilter === 'completed'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          {/* Court Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 min-w-0 border-t sm:border-t-0 sm:border-l border-slate-800/80 pt-2 sm:pt-0 sm:pl-3">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 xl:flex items-center gap-2 w-full xl:w-auto shrink-0">
          <div className="flex items-center justify-center sm:justify-start gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={handleExpandAllRounds}
              className="flex-1 sm:flex-initial px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer text-center"
              title="Expand all round accordions"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={handleCollapseAllRounds}
              className="flex-1 sm:flex-initial px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer text-center"
              title="Collapse all round accordions"
            >
              Collapse All
            </button>
          </div>

          {/* Player / Court Search with Autocomplete */}
          <div className="relative w-full xl:w-48 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search player or court..."
              value={searchQuery}
              onFocus={() => setActiveSearchDropdown('player')}
              onBlur={() => setTimeout(() => setActiveSearchDropdown((prev) => (prev === 'player' ? null : prev)), 150)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveSearchDropdown('player');
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                title="Clear player search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {activeSearchDropdown === 'player' && playerSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl max-h-52 overflow-y-auto py-1">
                {playerSuggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSearchQuery(name);
                      setActiveSearchDropdown(null);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-brand-lime/15 hover:text-brand-lime transition-colors cursor-pointer truncate"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Partner Search with Autocomplete */}
          <div className="relative w-full xl:w-48 shrink-0">
            <Users className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Partner (optional)..."
              value={partnerQuery}
              onFocus={() => setActiveSearchDropdown('partner')}
              onBlur={() => setTimeout(() => setActiveSearchDropdown((prev) => (prev === 'partner' ? null : prev)), 150)}
              onChange={(e) => {
                setPartnerQuery(e.target.value);
                setActiveSearchDropdown('partner');
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-lime"
            />
            {partnerQuery && (
              <button
                type="button"
                onClick={() => setPartnerQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                title="Clear partner search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {activeSearchDropdown === 'partner' && partnerSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl max-h-52 overflow-y-auto py-1">
                {partnerSuggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setPartnerQuery(name);
                      setActiveSearchDropdown(null);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-brand-lime/15 hover:text-brand-lime transition-colors cursor-pointer truncate"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

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
                No matches have been generated yet for this session. Click 'Add New Round', 'Auto-Generate Round Robin' or 'Create Manual Match' to get started.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setIsAutoGenModalOpen(true)}
                className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg hover:scale-[1.02] transition-all"
              >
                <Zap className="w-4 h-4 text-brand-lime" /> Auto-Generate Match Matrix
              </button>
              <button
                type="button"
                onClick={() => openJsonUploadModal()}
                className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-dark-bg font-black text-xs inline-flex items-center gap-2 cursor-pointer shadow-md hover:scale-[1.02] transition-all"
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
            {/* ONGOING / LIVE MATCHES SPOTLIGHT */}
            {liveMatches.length > 0 && selectedStatusFilter !== 'completed' && selectedStatusFilter !== 'scheduled' && (
              <div className="rounded-3xl border-2 border-blue-500/80 bg-gradient-to-b from-blue-950/60 via-slate-900 to-slate-950 p-4 sm:p-6 shadow-2xl shadow-blue-500/20 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-blue-500/30 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-90" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                      <span>Currently Live on Court</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/50 text-blue-300 font-mono text-xs font-bold">
                        {liveMatches.length} {liveMatches.length === 1 ? 'Game' : 'Games'} In Progress
                      </span>
                    </h3>
                  </div>
                  <span className="text-xs text-blue-300 font-semibold flex items-center gap-1.5">
                    ⚡ Live Real-Time Referee Scoring
                  </span>
                </div>

                <div className={`grid gap-4 items-stretch ${
                  liveMatches.length === 1
                    ? 'grid-cols-1 max-w-3xl'
                    : liveMatches.length === 2
                    ? 'grid-cols-1 lg:grid-cols-2'
                    : 'grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3'
                }`}>
                  {liveMatches.map((m) => (
                    <MatchMatrixCard
                      key={`spotlight-${m.id}`}
                      match={m}
                      assignedCourts={assignedCourts}
                      roundTitle={getRoundTitle(m.round)}
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
              </div>
            )}

            {isSearchFiltering ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Search className="w-4 h-4 text-brand-lime shrink-0" />
                    <span className="font-bold text-white">
                      Showing {filteredMatches.length} matching {filteredMatches.length === 1 ? 'game' : 'games'}
                    </span>
                    {searchQuery.trim() && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-semibold">
                        Player/Court: <span className="text-brand-lime">{searchQuery.trim()}</span>
                      </span>
                    )}
                    {partnerQuery.trim() && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-semibold">
                        Partner: <span className="text-brand-lime">{partnerQuery.trim()}</span>
                      </span>
                    )}
                    {searchQuery.trim() && partnerQuery.trim() && (
                      <span className="text-[11px] text-slate-400">(same team)</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setPartnerQuery('');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear Search
                  </button>
                </div>

                {filteredMatches.length === 0 ? (
                  <div className="glass-panel p-10 text-center rounded-3xl border border-slate-800 space-y-3">
                    <Users className="w-10 h-10 text-slate-600 mx-auto" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">No Matching Games Found</h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        {searchQuery.trim() && partnerQuery.trim()
                          ? `No games found where "${searchQuery.trim()}" and "${partnerQuery.trim()}" are partners on the same team.`
                          : 'No games match your current search and filter criteria.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setPartnerQuery('');
                        setSelectedStatusFilter('all');
                        setSelectedCourtFilter('all');
                      }}
                      className="px-4 py-2 rounded-xl bg-brand-lime/15 border border-brand-lime/40 text-brand-lime text-xs font-bold hover:bg-brand-lime/25 transition-colors cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  <div className={`grid gap-4 sm:gap-5 items-stretch ${
                    filteredMatches.length === 1
                      ? 'grid-cols-1 max-w-4xl'
                      : filteredMatches.length === 2
                      ? 'grid-cols-1 lg:grid-cols-2'
                      : 'grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3'
                  }`}>
                    {[...filteredMatches]
                      .sort((a, b) => a.round - b.round)
                      .map((m) => (
                        <MatchMatrixCard
                          key={m.id}
                          match={m}
                          assignedCourts={assignedCourts}
                          roundTitle={getRoundTitle(m.round)}
                          onInlineCourtChange={handleInlineCourtChange}
                          onStartMatch={handleStartMatch}
                          onCompleteMatch={handleCompleteMatch}
                          onReopenMatch={handleReopenMatch}
                          onScoreDelta={updateMatchScore}
                          onDirectScoreChange={handleDirectScoreChange}
                          onDownloadSingleCsv={handleDownloadSingleMatchCsv}
                          onEditMatch={openEditModal}
                          onDeleteMatch={(match) => setDeletingMatch(match)}
                          isDraggable={false}
                        />
                      ))}
                  </div>
                )}
              </div>
            ) : (
              allActiveRounds.map((roundNum) => {
                const matchesInRound = filteredMatches.filter((m) => m.round === roundNum);

                // Hide round block when search/filter active and no match fits
                if (matchesInRound.length === 0 && (selectedStatusFilter !== 'all' || selectedCourtFilter !== 'all' || isSearchFiltering)) {
                  return null;
                }

                // Compute players resting in this round
                const roundPlayerIds = new Set<string>();
                matchesInRound.forEach((m) => {
                  m.teamRed.players.forEach((p) => roundPlayerIds.add(p.id));
                  m.teamBlue.players.forEach((p) => roundPlayerIds.add(p.id));
                });

                let isStrictAttendance = true;
                try {
                  const saved = localStorage.getItem('picklepoint_openplay_only_checkedin');
                  if (saved !== null) {
                    isStrictAttendance = saved === 'true';
                  }
                } catch (e) {}

                const activeCandidates = rosterPool.filter((p) => p.status === 'active');
                const eligibleForRoster = isStrictAttendance
                  ? activeCandidates.filter((p) => p.isPresent || p.attendanceStatus === 'present')
                  : activeCandidates;

                const restingPlayersInRound = matchesInRound.length > 0
                  ? eligibleForRoster.filter((p) => !roundPlayerIds.has(p.id))
                  : [];

                return (
                  <MatchMatrixRoundAccordion
                    key={roundNum}
                    roundNum={roundNum}
                    roundTitle={getRoundTitle(roundNum)}
                    roundCreatedAt={getRoundCreatedAt(roundNum, matchesInRound)}
                    matchesInRound={matchesInRound}
                    restingPlayers={restingPlayersInRound}
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
                    onAiGenerateRound={handleAiGenerateSingleRound}
                    isAiConfigured={Boolean(aiConfig?.enabled && aiConfig?.apiKey)}
                    isAiGenerating={isAiGenerating}
                    onDeleteRound={(r) => openDeleteRoundsModal(r)}
                  >
                    <div className={`grid gap-4 sm:gap-5 items-stretch ${
                      matchesInRound.length === 1
                        ? 'grid-cols-1 max-w-4xl'
                        : matchesInRound.length === 2
                        ? 'grid-cols-1 lg:grid-cols-2'
                        : 'grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3'
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
              })
            )}
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
        startingRound={nextStartingRound}
        isAiConfigured={Boolean(aiConfig?.enabled && aiConfig?.apiKey)}
        aiModelName={aiConfig?.defaultModel || 'gemini-2.0-flash'}
        isAiGenerating={isAiGenerating}
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
        onUpdateCheckInTime={handleUpdateCheckInTime}
        onMarkAllActivePresent={handleMarkAllActivePresent}
        onDeletePlayer={handleDeletePlayer}
        onMoveToWaitlist={handleMovePlayerToWaitlist}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel border border-slate-800 rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-left bg-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-2xl bg-red-950/60 border border-red-800/60 shrink-0">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-black text-white">Delete Match Confirmation</h3>
                <p className="text-[11px] text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="text-slate-300 font-medium leading-relaxed">
                Are you sure you want to delete <strong>Match (Round {deletingMatch.round} • {deletingMatch.courtName})</strong>?
              </div>
              <div className="text-[11px] text-slate-500 font-mono break-words">
                Teams: {deletingMatch.teamRed.players.map((p) => p.name).join(' & ')} vs {deletingMatch.teamBlue.players.map((p) => p.name).join(' & ')}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMatch(null)}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-slate-800 sm:bg-transparent text-slate-400 hover:text-white text-xs font-bold cursor-pointer text-center"
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
                className="w-full sm:w-auto px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs cursor-pointer shadow-lg hover:scale-[1.02] transition-all text-center"
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
