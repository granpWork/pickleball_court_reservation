import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Plus,
  RotateCcw,
  ArrowUpDown,
  Zap,
  Play,
  Flame,
  Volume2,
  VolumeX,
  Sparkles,
  X,
  Shield,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { db, isFirebaseConfigured } from '../../../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import type { ScoreboardMatch, ScoreboardPlayer } from '../adminTypes';

interface AdminScoreboardTabProps {
  user?: any;
  openPlayEvents?: any[];
  myCompany?: any;
  isSuperAdmin?: boolean;
}

export const AdminScoreboardTab: React.FC<AdminScoreboardTabProps> = ({
  user,
  openPlayEvents = [],
  myCompany,
}) => {
  const [matches, setMatches] = useState<ScoreboardMatch[]>([]);
  const [activeMatch, setActiveMatch] = useState<ScoreboardMatch | null>(null);

  // Creation Wizard Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOpenPlayId, setSelectedOpenPlayId] = useState('');
  const [matchTitleInput, setMatchTitleInput] = useState('');
  const [gameTypeInput, setGameTypeInput] = useState<'doubles' | 'singles'>('doubles');
  const [targetPointsInput, setTargetPointsInput] = useState<number>(11);
  const [winByTwoInput] = useState<boolean>(true);

  // Teams & Roster State in Wizard
  const [availableRoster, setAvailableRoster] = useState<ScoreboardPlayer[]>([]);
  const [teamRedPlayers, setTeamRedPlayers] = useState<ScoreboardPlayer[]>([]);
  const [teamBluePlayers, setTeamBluePlayers] = useState<ScoreboardPlayer[]>([]);
  const [teamRedName, setTeamRedName] = useState('Red Team');
  const [teamBlueName, setTeamBlueName] = useState('Blue Team');
  const [initialServingTeam, setInitialServingTeam] = useState<'red' | 'blue'>('red');

  // Confirmation Modals & Voice Announcer State
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [whistleEnabled, setWhistleEnabled] = useState<boolean>(true);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');

  // Pre-load high quality natural human voices asynchronously
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadAndRankVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      const englishVoices = voices.filter((v) => v.lang.startsWith('en'));
      setAvailableVoices(englishVoices.length > 0 ? englishVoices : voices);

      // Prioritize natural neural human voices
      const preferred =
        englishVoices.find((v) =>
          v.name.includes('Natural') ||
          v.name.includes('Online') ||
          v.name.includes('Neural') ||
          v.name.includes('Google US English') ||
          v.name.includes('Google UK English Male') ||
          v.name.includes('Samantha (Enhanced)') ||
          v.name.includes('Alex')
        ) ||
        englishVoices.find((v) =>
          v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('Daniel') ||
          v.name.includes('Karen') ||
          v.name.includes('Rishi') ||
          v.name.includes('Zira') ||
          v.name.includes('David')
        ) ||
        englishVoices[0];

      if (preferred && !selectedVoiceURI) {
        setSelectedVoiceURI(preferred.voiceURI);
      }
    };

    loadAndRankVoices();
    window.speechSynthesis.onvoiceschanged = loadAndRankVoices;
  }, [selectedVoiceURI]);

  // Web Audio API Dual-Frequency Synthesized Referee Whistle
  const playRefereeWhistle = () => {
    if (!whistleEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(2800, now);
      osc2.frequency.setValueAtTime(2950, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.015);
      gain.gain.setValueAtTime(0.12, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.22);
      osc2.stop(now + 0.22);
    } catch (e) {}
  };

  // Web Speech API Voice Engine with natural human phrasing & cadence
  const speakCallout = (text: string, withWhistle: boolean = false) => {
    if (!voiceEnabled) return;

    if (withWhistle) {
      playRefereeWhistle();
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();

        // Convert hyphenated 3-number callouts like "2 - 5 - 2" to spaced pauses "2... 5... 2" for natural human cadence
        const formattedSpeech = text.replace(/(\d+)\s*-\s*(\d+)\s*-\s*(\d+)/g, '$1... $2... $3');
        const utterance = new SpeechSynthesisUtterance(formattedSpeech);
        utterance.rate = 0.96; // Natural human referee speed
        utterance.pitch = 1.0; // Natural voice pitch
        utterance.volume = 1.0;

        if (selectedVoiceURI) {
          const matchedVoice = availableVoices.find((v) => v.voiceURI === selectedVoiceURI);
          if (matchedVoice) utterance.voice = matchedVoice;
        } else {
          const voices = window.speechSynthesis.getVoices();
          const fallback = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')));
          if (fallback) utterance.voice = fallback;
        }

        // Delay speech slightly if whistle was played for realistic stadium timing
        if (withWhistle) {
          setTimeout(() => window.speechSynthesis.speak(utterance), 220);
        } else {
          window.speechSynthesis.speak(utterance);
        }
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    }
  };

  // Read Scoreboards (Firestore & LocalStorage)
  const fetchScoreboards = async () => {
    const matchMap = new Map<string, ScoreboardMatch>();

    // 1. Read LocalStorage
    try {
      const localStr = localStorage.getItem('picklepoint_scoreboards');
      if (localStr) {
        const parsed = JSON.parse(localStr);
        if (Array.isArray(parsed)) {
          parsed.forEach((m: any) => matchMap.set(m.id, m));
        }
      }
    } catch (e) {
      console.warn('Error reading local scoreboards:', e);
    }

    // 2. Read Cloud Firestore
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'scoreboards'));
        snap.forEach((docSnap) => {
          const data = docSnap.data() as ScoreboardMatch;
          matchMap.set(docSnap.id, { ...data, id: docSnap.id });
        });
      } catch (e) {
        console.warn('Error fetching Firestore scoreboards:', e);
      }
    }

    const matchArray = Array.from(matchMap.values());
    matchArray.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    setMatches(matchArray);

    if (activeMatch) {
      const updatedActive = matchMap.get(activeMatch.id);
      if (updatedActive) setActiveMatch(updatedActive);
    }
  };

  useEffect(() => {
    fetchScoreboards();

    let unsub: (() => void) | undefined;
    if (isFirebaseConfigured && db) {
      try {
        unsub = onSnapshot(
          collection(db, 'scoreboards'),
          () => {
            fetchScoreboards();
          },
          (err) => {
            // Silently swallow or log permission error if rules are not yet deployed
            console.warn('Firestore scoreboards subscription notice:', err.message);
          }
        );
      } catch (e) {}
    }

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // When selected open play event changes in Wizard, populate available roster
  useEffect(() => {
    if (!selectedOpenPlayId) {
      setAvailableRoster([]);
      return;
    }

    const opEvent = openPlayEvents.find((e) => e.id === selectedOpenPlayId);
    if (opEvent) {
      setMatchTitleInput(opEvent.title ? `${opEvent.title} - Scoreboard` : 'Open Play Match');
      const rosterList: ScoreboardPlayer[] = [];

      // Extract participants/registrations
      if (Array.isArray(opEvent.registrations)) {
        opEvent.registrations.forEach((r: any, idx: number) => {
          rosterList.push({
            id: r.id || r.userId || `p-${idx}`,
            name: r.userName || r.name || r.userEmail || `Player ${idx + 1}`,
            email: r.userEmail || r.email || '',
            phone: r.phone || '',
          });
        });
      } else if (Array.isArray(opEvent.participants)) {
        opEvent.participants.forEach((p: any, idx: number) => {
          rosterList.push({
            id: p.id || `p-${idx}`,
            name: p.name || p.userName || `Player ${idx + 1}`,
            email: p.email || '',
          });
        });
      }

      setAvailableRoster(rosterList);
      // Auto assign if roster available
      if (rosterList.length >= 2) {
        if (gameTypeInput === 'doubles' && rosterList.length >= 4) {
          setTeamRedPlayers([rosterList[0], rosterList[1]]);
          setTeamBluePlayers([rosterList[2], rosterList[3]]);
        } else {
          setTeamRedPlayers([rosterList[0]]);
          setTeamBluePlayers([rosterList[1]]);
        }
      }
    }
  }, [selectedOpenPlayId, gameTypeInput, openPlayEvents]);

  // Toast notification helper
  const notifyAction = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 2500);
  };

  // Helper: Persist match state to Firestore and LocalStorage
  const persistMatchState = async (updated: ScoreboardMatch) => {
    setActiveMatch(updated);
    setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));

    try {
      const localStr = localStorage.getItem('picklepoint_scoreboards');
      let localMatches = localStr ? JSON.parse(localStr) : [];
      if (!Array.isArray(localMatches)) localMatches = [];
      const idx = localMatches.findIndex((m: any) => m.id === updated.id);
      if (idx >= 0) {
        localMatches[idx] = updated;
      } else {
        localMatches.push(updated);
      }
      localStorage.setItem('picklepoint_scoreboards', JSON.stringify(localMatches));
    } catch (e) {}

    if (isFirebaseConfigured && db) {
      try {
        const cleanMatchRecord = JSON.parse(JSON.stringify(updated));
        await setDoc(doc(db, 'scoreboards', updated.id), cleanMatchRecord);
      } catch (e) {
        console.warn('Firestore setDoc failed for scoreboard:', e);
      }
    }
  };

  // Save/Start Match Creation
  const handleStartNewMatch = async () => {
    const newMatchId = 'match-' + Date.now();
    const opEvent = openPlayEvents.find((e) => e.id === selectedOpenPlayId);

    const newMatch: ScoreboardMatch = {
      id: newMatchId,
      companyId: myCompany?.id || user?.companyId || '',
      openPlayId: selectedOpenPlayId || undefined,
      openPlayTitle: opEvent?.title || undefined,
      matchTitle: matchTitleInput.trim() || 'Live Pickleball Match',
      gameType: gameTypeInput,
      targetPoints: targetPointsInput,
      winByTwo: winByTwoInput,
      swappedSides: false,
      teamRed: {
        name: teamRedName.trim() || 'Red Team',
        score: 0,
        players: teamRedPlayers,
      },
      teamBlue: {
        name: teamBlueName.trim() || 'Blue Team',
        score: 0,
        players: teamBluePlayers,
      },
      servingTeam: initialServingTeam,
      serverNumber: 2, // Standard Pickleball starting serve rule: First service sequence starts on Server 2 (0-0-2)
      firstServeOfGameDone: false,
      status: 'live',
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await persistMatchState(newMatch);
    setShowCreateModal(false);
    notifyAction('🚀 New Pickleball Scoreboard Match Started!');
  };

  // Check Win Condition: Target score reached AND leading by at least 2 (if winByTwo is true)
  const checkWinner = (redScore: number, blueScore: number, match: ScoreboardMatch): 'red' | 'blue' | undefined => {
    const target = match.targetPoints || 11;
    const winByTwo = match.winByTwo !== false;

    if (redScore >= target) {
      if (!winByTwo || redScore - blueScore >= 2) {
        return 'red';
      }
    }
    if (blueScore >= target) {
      if (!winByTwo || blueScore - redScore >= 2) {
        return 'blue';
      }
    }
    return undefined;
  };

  // Scoring Logic: Point Won by Serving Team
  const handleScorePoint = async () => {
    if (!activeMatch || activeMatch.status === 'completed') return;

    // Snapshot current state for history stack
    const currentSnapshot = {
      teamRedScore: activeMatch.teamRed.score,
      teamBlueScore: activeMatch.teamBlue.score,
      servingTeam: activeMatch.servingTeam,
      serverNumber: activeMatch.serverNumber,
      swappedSides: activeMatch.swappedSides,
      firstServeOfGameDone: activeMatch.firstServeOfGameDone,
      status: activeMatch.status,
      winner: activeMatch.winner,
    };

    const isRedServing = activeMatch.servingTeam === 'red';
    let newRedScore = activeMatch.teamRed.score;
    let newBlueScore = activeMatch.teamBlue.score;

    if (isRedServing) {
      newRedScore += 1;
    } else {
      newBlueScore += 1;
    }

    const winner = checkWinner(newRedScore, newBlueScore, activeMatch);

    const updatedMatch: ScoreboardMatch = {
      ...activeMatch,
      teamRed: { ...activeMatch.teamRed, score: newRedScore },
      teamBlue: { ...activeMatch.teamBlue, score: newBlueScore },
      status: winner ? 'completed' : 'live',
      winner: winner || activeMatch.winner,
      updatedAt: new Date().toISOString(),
      history: [...activeMatch.history, currentSnapshot],
    };

    await persistMatchState(updatedMatch);
    if (winner) {
      const winnerName = winner === 'red' ? updatedMatch.teamRed.name : updatedMatch.teamBlue.name;
      notifyAction(`🏆 GAME OVER! ${winnerName} Wins!`);
      speakCallout(`Game Over! ${winnerName} wins, ${newRedScore} to ${newBlueScore}!`, true);
    } else {
      notifyAction(`+1 Point for ${isRedServing ? activeMatch.teamRed.name : activeMatch.teamBlue.name}!`);
      const servingScore = isRedServing ? newRedScore : newBlueScore;
      const receivingScore = isRedServing ? newBlueScore : newRedScore;
      const serverNum = activeMatch.serverNumber;
      if (activeMatch.gameType === 'singles') {
        speakCallout(`Point! ${servingScore}, ${receivingScore}`, true);
      } else {
        speakCallout(`${servingScore}, ${receivingScore}, ${serverNum}`, true);
      }
    }
  };

  // Rally Lost / Fault Logic
  const handleFault = async () => {
    if (!activeMatch || activeMatch.status === 'completed') return;

    const currentSnapshot = {
      teamRedScore: activeMatch.teamRed.score,
      teamBlueScore: activeMatch.teamBlue.score,
      servingTeam: activeMatch.servingTeam,
      serverNumber: activeMatch.serverNumber,
      swappedSides: activeMatch.swappedSides,
      firstServeOfGameDone: activeMatch.firstServeOfGameDone,
      status: activeMatch.status,
      winner: activeMatch.winner,
    };

    let nextServingTeam = activeMatch.servingTeam;
    let nextServerNum = activeMatch.serverNumber;
    let firstServeDone = activeMatch.firstServeOfGameDone;
    let faultSpeechText = '';

    // First serve of the game exception: Starting team only gets Server 2 (0-0-2) before sideout
    if (!firstServeDone) {
      // First fault immediately triggers Sideout to opposing team, Server 1
      firstServeDone = true;
      nextServingTeam = activeMatch.servingTeam === 'red' ? 'blue' : 'red';
      nextServerNum = 1;
      notifyAction(`SIDEOUT! Serve turns over to ${nextServingTeam === 'red' ? activeMatch.teamRed.name : activeMatch.teamBlue.name}`);
      const nextServingScore = nextServingTeam === 'red' ? activeMatch.teamRed.score : activeMatch.teamBlue.score;
      const nextReceivingScore = nextServingTeam === 'red' ? activeMatch.teamBlue.score : activeMatch.teamRed.score;
      faultSpeechText = activeMatch.gameType === 'singles'
        ? `Sideout! ${nextServingScore}, ${nextReceivingScore}`
        : `Sideout! ${nextServingScore}, ${nextReceivingScore}, 1`;
    } else if (activeMatch.gameType === 'singles') {
      // Singles: Every fault is a Sideout
      nextServingTeam = activeMatch.servingTeam === 'red' ? 'blue' : 'red';
      nextServerNum = 1;
      notifyAction(`SIDEOUT! Serve turns over to ${nextServingTeam === 'red' ? activeMatch.teamRed.name : activeMatch.teamBlue.name}`);
      const nextServingScore = nextServingTeam === 'red' ? activeMatch.teamRed.score : activeMatch.teamBlue.score;
      const nextReceivingScore = nextServingTeam === 'red' ? activeMatch.teamBlue.score : activeMatch.teamRed.score;
      faultSpeechText = `Sideout! ${nextServingScore}, ${nextReceivingScore}`;
    } else {
      // Doubles: Server 1 fault -> Server 2. Server 2 fault -> Sideout!
      if (activeMatch.serverNumber === 1) {
        nextServerNum = 2;
        notifyAction(`Fault! Second Server serving now (Server 2).`);
        const currentServingScore = activeMatch.servingTeam === 'red' ? activeMatch.teamRed.score : activeMatch.teamBlue.score;
        const currentReceivingScore = activeMatch.servingTeam === 'red' ? activeMatch.teamBlue.score : activeMatch.teamRed.score;
        faultSpeechText = `Server 2! ${currentServingScore}, ${currentReceivingScore}, 2`;
      } else {
        // Server 2 fault -> Sideout
        nextServingTeam = activeMatch.servingTeam === 'red' ? 'blue' : 'red';
        nextServerNum = 1;
        notifyAction(`SIDEOUT! Serve turns over to ${nextServingTeam === 'red' ? activeMatch.teamRed.name : activeMatch.teamBlue.name}`);
        const nextServingScore = nextServingTeam === 'red' ? activeMatch.teamRed.score : activeMatch.teamBlue.score;
        const nextReceivingScore = nextServingTeam === 'red' ? activeMatch.teamBlue.score : activeMatch.teamRed.score;
        faultSpeechText = `Sideout! ${nextServingScore}, ${nextReceivingScore}, 1`;
      }
    }

    const updatedMatch: ScoreboardMatch = {
      ...activeMatch,
      servingTeam: nextServingTeam,
      serverNumber: nextServerNum,
      firstServeOfGameDone: firstServeDone,
      updatedAt: new Date().toISOString(),
      history: [...activeMatch.history, currentSnapshot],
    };

    await persistMatchState(updatedMatch);
    if (faultSpeechText) speakCallout(faultSpeechText, true);
  };

  // Direct Manual Score Override (+ / -)
  const handleManualScoreAdjust = async (team: 'red' | 'blue', delta: number) => {
    if (!activeMatch) return;

    const currentSnapshot = {
      teamRedScore: activeMatch.teamRed.score,
      teamBlueScore: activeMatch.teamBlue.score,
      servingTeam: activeMatch.servingTeam,
      serverNumber: activeMatch.serverNumber,
      swappedSides: activeMatch.swappedSides,
      firstServeOfGameDone: activeMatch.firstServeOfGameDone,
      status: activeMatch.status,
      winner: activeMatch.winner,
    };

    let newRedScore = activeMatch.teamRed.score;
    let newBlueScore = activeMatch.teamBlue.score;

    if (team === 'red') {
      newRedScore = Math.max(0, newRedScore + delta);
    } else {
      newBlueScore = Math.max(0, newBlueScore + delta);
    }

    const winner = checkWinner(newRedScore, newBlueScore, activeMatch);

    const updatedMatch: ScoreboardMatch = {
      ...activeMatch,
      teamRed: { ...activeMatch.teamRed, score: newRedScore },
      teamBlue: { ...activeMatch.teamBlue, score: newBlueScore },
      status: winner ? 'completed' : 'live',
      winner: winner || undefined,
      updatedAt: new Date().toISOString(),
      history: [...activeMatch.history, currentSnapshot],
    };

    await persistMatchState(updatedMatch);
    notifyAction(`Adjusted ${team === 'red' ? activeMatch.teamRed.name : activeMatch.teamBlue.name} score to ${team === 'red' ? newRedScore : newBlueScore}`);
  };

  // Change Court / Swap Sides Action
  const handleToggleSwapSides = async () => {
    if (!activeMatch) return;

    const currentSnapshot = {
      teamRedScore: activeMatch.teamRed.score,
      teamBlueScore: activeMatch.teamBlue.score,
      servingTeam: activeMatch.servingTeam,
      serverNumber: activeMatch.serverNumber,
      swappedSides: activeMatch.swappedSides,
      firstServeOfGameDone: activeMatch.firstServeOfGameDone,
      status: activeMatch.status,
      winner: activeMatch.winner,
    };

    const updatedMatch: ScoreboardMatch = {
      ...activeMatch,
      swappedSides: !activeMatch.swappedSides,
      updatedAt: new Date().toISOString(),
      history: [...activeMatch.history, currentSnapshot],
    };

    await persistMatchState(updatedMatch);
    notifyAction(`🔄 Court Sides Swapped! ${updatedMatch.swappedSides ? 'Red Team is now on Right' : 'Standard Placement'}`);
    speakCallout("Switch sides!");
  };

  // Toggle Serving Team Manually
  const handleToggleServingTeam = async () => {
    if (!activeMatch) return;

    const currentSnapshot = {
      teamRedScore: activeMatch.teamRed.score,
      teamBlueScore: activeMatch.teamBlue.score,
      servingTeam: activeMatch.servingTeam,
      serverNumber: activeMatch.serverNumber,
      swappedSides: activeMatch.swappedSides,
      firstServeOfGameDone: activeMatch.firstServeOfGameDone,
      status: activeMatch.status,
      winner: activeMatch.winner,
    };

    const nextTeam = activeMatch.servingTeam === 'red' ? 'blue' : 'red';
    const updatedMatch: ScoreboardMatch = {
      ...activeMatch,
      servingTeam: nextTeam,
      updatedAt: new Date().toISOString(),
      history: [...activeMatch.history, currentSnapshot],
    };

    await persistMatchState(updatedMatch);
    notifyAction(`Switched Serving Team to ${nextTeam === 'red' ? activeMatch.teamRed.name : activeMatch.teamBlue.name}`);
  };

  // Toggle Server Number (Server 1 <-> Server 2)
  const handleToggleServerNumber = async () => {
    if (!activeMatch) return;

    const currentSnapshot = {
      teamRedScore: activeMatch.teamRed.score,
      teamBlueScore: activeMatch.teamBlue.score,
      servingTeam: activeMatch.servingTeam,
      serverNumber: activeMatch.serverNumber,
      swappedSides: activeMatch.swappedSides,
      firstServeOfGameDone: activeMatch.firstServeOfGameDone,
      status: activeMatch.status,
      winner: activeMatch.winner,
    };

    const nextNum = activeMatch.serverNumber === 1 ? 2 : 1;
    const updatedMatch: ScoreboardMatch = {
      ...activeMatch,
      serverNumber: nextNum,
      updatedAt: new Date().toISOString(),
      history: [...activeMatch.history, currentSnapshot],
    };

    await persistMatchState(updatedMatch);
    notifyAction(`Toggled to Server ${nextNum}`);
  };

  // Reset Match Action (Resets scores to 0-0-2, keeps teams)
  const handleExecuteResetMatch = async () => {
    if (!activeMatch) return;

    const currentSnapshot = {
      teamRedScore: activeMatch.teamRed.score,
      teamBlueScore: activeMatch.teamBlue.score,
      servingTeam: activeMatch.servingTeam,
      serverNumber: activeMatch.serverNumber,
      swappedSides: activeMatch.swappedSides,
      firstServeOfGameDone: activeMatch.firstServeOfGameDone,
      status: activeMatch.status,
      winner: activeMatch.winner,
    };

    const updatedMatch: ScoreboardMatch = {
      ...activeMatch,
      teamRed: { ...activeMatch.teamRed, score: 0 },
      teamBlue: { ...activeMatch.teamBlue, score: 0 },
      servingTeam: 'red',
      serverNumber: 2,
      firstServeOfGameDone: false,
      status: 'live',
      winner: undefined,
      updatedAt: new Date().toISOString(),
      history: [...activeMatch.history, currentSnapshot],
    };

    await persistMatchState(updatedMatch);
    setShowResetConfirmModal(false);
    notifyAction('🔄 Match Reset to 0-0-2! Ready for Rematch.');
    speakCallout("Match reset! Zero, Zero, Two");
  };

  // Undo Last Action
  const handleUndo = async () => {
    if (!activeMatch || activeMatch.history.length === 0) return;

    const historyCopy = [...activeMatch.history];
    const lastState = historyCopy.pop();

    if (!lastState) return;

    const updatedMatch: ScoreboardMatch = {
      ...activeMatch,
      teamRed: { ...activeMatch.teamRed, score: lastState.teamRedScore },
      teamBlue: { ...activeMatch.teamBlue, score: lastState.teamBlueScore },
      servingTeam: lastState.servingTeam,
      serverNumber: lastState.serverNumber,
      swappedSides: lastState.swappedSides ?? activeMatch.swappedSides,
      firstServeOfGameDone: lastState.firstServeOfGameDone,
      status: lastState.status,
      winner: lastState.winner,
      history: historyCopy,
      updatedAt: new Date().toISOString(),
    };

    await persistMatchState(updatedMatch);
    notifyAction('↩️ Undid last rally point/fault!');
  };

  // Delete Scoreboard Match
  const handleDeleteMatch = async (matchId: string) => {
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
    if (activeMatch?.id === matchId) setActiveMatch(null);

    try {
      const localStr = localStorage.getItem('picklepoint_scoreboards');
      if (localStr) {
        const parsed = JSON.parse(localStr);
        if (Array.isArray(parsed)) {
          const updated = parsed.filter((m: any) => m.id !== matchId);
          localStorage.setItem('picklepoint_scoreboards', JSON.stringify(updated));
        }
      }
    } catch (e) {}

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'scoreboards', matchId));
      } catch (e) {}
    }
    notifyAction('Scoreboard match record removed.');
  };

  // Calculate 3-Number Callout String (ServingScore - ReceivingScore - ServerNum)
  const getCalloutString = (match: ScoreboardMatch) => {
    const isRedServing = match.servingTeam === 'red';
    const servingScore = isRedServing ? match.teamRed.score : match.teamBlue.score;
    const receivingScore = isRedServing ? match.teamBlue.score : match.teamRed.score;
    const serverNum = match.serverNumber;
    return `${servingScore} - ${receivingScore} - ${serverNum}`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Notification Banner */}
      {actionNotice && (
        <div className="fixed top-20 right-4 z-50 bg-gradient-to-r from-brand-lime via-emerald-400 to-emerald-500 text-dark-bg px-5 py-3 rounded-2xl shadow-2xl font-extrabold text-xs flex items-center gap-2.5 animate-fade-in border border-white/20">
          <Sparkles className="w-4 h-4 text-dark-bg shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-slate-800">
        <div>
          <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>Interactive Pickleball Scoreboard</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage live court scoring, pull Open Play player rosters, assign Red & Blue teams, and track official 3-number callouts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeMatch && (
            <button
              onClick={() => setActiveMatch(null)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700"
            >
              <SlidersHorizontal className="w-4 h-4 text-brand-lime" />
              <span>Back to Roster</span>
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-dark-bg font-extrabold text-xs hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Scoreboard</span>
          </button>
        </div>
      </div>

      {/* ACTIVE LIVE MATCH CONSOLE */}
      {activeMatch ? (
        <div className="space-y-6">
          {/* Top Game Bar & Title */}
          <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-slate-800 bg-slate-950/80 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Flame className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>{activeMatch.matchTitle}</span>
                    <span className="text-[10px] uppercase px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 font-mono text-slate-400">
                      {activeMatch.gameType} • Target: {activeMatch.targetPoints} Pts {activeMatch.winByTwo ? '(Win by 2)' : ''}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {activeMatch.openPlayTitle ? `Event: ${activeMatch.openPlayTitle}` : 'Custom Match'}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2.5">
                {activeMatch.status === 'completed' ? (
                  <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Match Completed! Winner: {activeMatch.winner === 'red' ? activeMatch.teamRed.name : activeMatch.teamBlue.name}</span>
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>LIVE MATCH IN PROGRESS</span>
                  </span>
                )}
              </div>
            </div>

            {/* OFFICIAL PICKLEBALL CALLOUT BANNER & VOICE ANNOUNCER CONTROLS */}
            <div className="my-5 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-inner">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const nextState = !voiceEnabled;
                    setVoiceEnabled(nextState);
                    if (nextState && activeMatch) {
                      speakCallout(`Voice announcer enabled. ${getCalloutString(activeMatch)}`);
                    }
                  }}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-2 select-none ${
                    voiceEnabled
                      ? 'bg-brand-lime/15 border-brand-lime text-brand-lime shadow-md shadow-brand-lime/10 hover:bg-brand-lime/25'
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                  title={voiceEnabled ? 'Mute Voice Referee Callouts' : 'Enable Voice Referee Callouts'}
                >
                  {voiceEnabled ? <Volume2 className="w-5 h-5 animate-pulse" /> : <VolumeX className="w-5 h-5" />}
                  <span className="text-xs font-extrabold">{voiceEnabled ? 'Voice ON' : 'Voice MUTED'}</span>
                </button>

                {/* Whistle Sound Effect Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const nextW = !whistleEnabled;
                    setWhistleEnabled(nextW);
                    if (nextW) playRefereeWhistle();
                  }}
                  className={`px-3 py-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-extrabold select-none ${
                    whistleEnabled
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 shadow-md shadow-amber-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                  title={whistleEnabled ? 'Whistle Sound ON' : 'Whistle Sound MUTED'}
                >
                  <span>🎷 Whistle {whistleEnabled ? 'ON' : 'OFF'}</span>
                </button>

                {/* Natural Human Voice Selection Dropdown */}
                {availableVoices.length > 0 && voiceEnabled && (
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Voice:</span>
                    <select
                      value={selectedVoiceURI}
                      onChange={(e) => {
                        setSelectedVoiceURI(e.target.value);
                        const matched = availableVoices.find((v) => v.voiceURI === e.target.value);
                        if (matched && activeMatch) {
                          window.speechSynthesis.cancel();
                          const utt = new SpeechSynthesisUtterance(`Voice set to ${matched.name}. ${getCalloutString(activeMatch)}`);
                          utt.voice = matched;
                          utt.rate = 0.96;
                          window.speechSynthesis.speak(utt);
                        }
                      }}
                      className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer max-w-[180px] truncate"
                    >
                      {availableVoices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI} className="bg-slate-900 text-white">
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                <button
                  type="button"
                  onClick={() => speakCallout(getCalloutString(activeMatch), whistleEnabled)}
                  className="px-5 py-2 rounded-2xl bg-black/80 hover:bg-black border border-brand-lime/40 text-brand-lime font-mono font-extrabold text-2xl tracking-wider shadow-lg shadow-brand-lime/10 cursor-pointer active:scale-95 transition-transform flex items-center gap-2"
                  title="Click to shout out current score!"
                >
                  <span>{getCalloutString(activeMatch)}</span>
                  <span className="text-xs opacity-75">🔊</span>
                </button>
                <div className="text-left">
                  <span className="text-xs font-extrabold text-white block">
                    {activeMatch.servingTeam === 'red' ? activeMatch.teamRed.name : activeMatch.teamBlue.name} Serving
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Server #{activeMatch.serverNumber} ({activeMatch.servingTeam.toUpperCase()})
                  </span>
                </div>
              </div>
            </div>

            {/* DUAL SCORE PANELS (RED TEAM vs BLUE TEAM) */}
            {(() => {
              // Handle Swap Sides visual ordering
              const isSwapped = activeMatch.swappedSides;
              const leftTeamKey = isSwapped ? 'blue' : 'red';
              const rightTeamKey = isSwapped ? 'red' : 'blue';

              const leftTeam = leftTeamKey === 'red' ? activeMatch.teamRed : activeMatch.teamBlue;
              const rightTeam = rightTeamKey === 'red' ? activeMatch.teamRed : activeMatch.teamBlue;

              const isLeftServing = activeMatch.servingTeam === leftTeamKey;
              const isRightServing = activeMatch.servingTeam === rightTeamKey;

              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-4">
                  {/* LEFT TEAM PANEL */}
                  <div
                    className={`p-6 sm:p-8 rounded-3xl border transition-all relative overflow-hidden flex flex-col items-center justify-between text-center ${
                      leftTeamKey === 'red'
                        ? isLeftServing
                          ? 'bg-gradient-to-b from-rose-950/60 to-slate-900 border-rose-500 shadow-2xl shadow-rose-500/20'
                          : 'bg-slate-900/60 border-rose-900/50'
                        : isLeftServing
                        ? 'bg-gradient-to-b from-cyan-950/60 to-slate-900 border-cyan-400 shadow-2xl shadow-cyan-500/20'
                        : 'bg-slate-900/60 border-cyan-900/50'
                    }`}
                  >
                    {/* Serving Badge Indicator */}
                    {isLeftServing && (
                      <div
                        className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1.5 shadow-md ${
                          leftTeamKey === 'red' ? 'bg-rose-500 text-white' : 'bg-cyan-400 text-slate-950'
                        }`}
                      >
                        <Zap className="w-3 h-3 fill-current" />
                        <span>SERVING (Server {activeMatch.serverNumber})</span>
                      </div>
                    )}

                    {/* Team Header */}
                    <div className="mt-4 space-y-1">
                      <span className={`text-xs font-mono uppercase tracking-widest block font-bold ${leftTeamKey === 'red' ? 'text-rose-400' : 'text-cyan-400'}`}>
                        {leftTeamKey.toUpperCase()} TEAM
                      </span>
                      <h3 className="text-xl sm:text-2xl font-extrabold text-white truncate max-w-xs">{leftTeam.name}</h3>
                      {leftTeam.players.length > 0 && (
                        <p className="text-xs text-slate-400 font-medium">
                          {leftTeam.players.map((p) => p.name).join(' & ')}
                        </p>
                      )}
                    </div>

                    {/* Big Score Display */}
                    <div className="my-6">
                      <span className={`text-7xl sm:text-9xl font-black font-mono tracking-tight drop-shadow-lg ${leftTeamKey === 'red' ? 'text-rose-400' : 'text-cyan-400'}`}>
                        {leftTeam.score}
                      </span>
                    </div>

                    {/* Manual Score Adjust Buttons */}
                    <div className="flex items-center gap-3 w-full max-w-xs">
                      <button
                        type="button"
                        onClick={() => handleManualScoreAdjust(leftTeamKey, -1)}
                        className="flex-1 py-3 rounded-2xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 font-extrabold text-lg transition-all cursor-pointer shadow-md active:scale-95 min-h-[48px]"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleManualScoreAdjust(leftTeamKey, +1)}
                        className={`flex-1 py-3 rounded-2xl font-extrabold text-lg transition-all cursor-pointer shadow-md active:scale-95 min-h-[48px] ${
                          leftTeamKey === 'red'
                            ? 'bg-rose-600 hover:bg-rose-500 text-white'
                            : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                        }`}
                      >
                        +1
                      </button>
                    </div>
                  </div>

                  {/* RIGHT TEAM PANEL */}
                  <div
                    className={`p-6 sm:p-8 rounded-3xl border transition-all relative overflow-hidden flex flex-col items-center justify-between text-center ${
                      rightTeamKey === 'red'
                        ? isRightServing
                          ? 'bg-gradient-to-b from-rose-950/60 to-slate-900 border-rose-500 shadow-2xl shadow-rose-500/20'
                          : 'bg-slate-900/60 border-rose-900/50'
                        : isRightServing
                        ? 'bg-gradient-to-b from-cyan-950/60 to-slate-900 border-cyan-400 shadow-2xl shadow-cyan-500/20'
                        : 'bg-slate-900/60 border-cyan-900/50'
                    }`}
                  >
                    {/* Serving Badge Indicator */}
                    {isRightServing && (
                      <div
                        className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1.5 shadow-md ${
                          rightTeamKey === 'red' ? 'bg-rose-500 text-white' : 'bg-cyan-400 text-slate-950'
                        }`}
                      >
                        <Zap className="w-3 h-3 fill-current" />
                        <span>SERVING (Server {activeMatch.serverNumber})</span>
                      </div>
                    )}

                    {/* Team Header */}
                    <div className="mt-4 space-y-1">
                      <span className={`text-xs font-mono uppercase tracking-widest block font-bold ${rightTeamKey === 'red' ? 'text-rose-400' : 'text-cyan-400'}`}>
                        {rightTeamKey.toUpperCase()} TEAM
                      </span>
                      <h3 className="text-xl sm:text-2xl font-extrabold text-white truncate max-w-xs">{rightTeam.name}</h3>
                      {rightTeam.players.length > 0 && (
                        <p className="text-xs text-slate-400 font-medium">
                          {rightTeam.players.map((p) => p.name).join(' & ')}
                        </p>
                      )}
                    </div>

                    {/* Big Score Display */}
                    <div className="my-6">
                      <span className={`text-7xl sm:text-9xl font-black font-mono tracking-tight drop-shadow-lg ${rightTeamKey === 'red' ? 'text-rose-400' : 'text-cyan-400'}`}>
                        {rightTeam.score}
                      </span>
                    </div>

                    {/* Manual Score Adjust Buttons */}
                    <div className="flex items-center gap-3 w-full max-w-xs">
                      <button
                        type="button"
                        onClick={() => handleManualScoreAdjust(rightTeamKey, -1)}
                        className="flex-1 py-3 rounded-2xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 font-extrabold text-lg transition-all cursor-pointer shadow-md active:scale-95 min-h-[48px]"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleManualScoreAdjust(rightTeamKey, +1)}
                        className={`flex-1 py-3 rounded-2xl font-extrabold text-lg transition-all cursor-pointer shadow-md active:scale-95 min-h-[48px] ${
                          rightTeamKey === 'red'
                            ? 'bg-rose-600 hover:bg-rose-500 text-white'
                            : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                        }`}
                      >
                        +1
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* PRIMARY REFEREE TOUCH CONTROLS (LARGE FINGER-FRIENDLY BUTTONS FOR MOBILE & TABLETS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {/* Point Won Button (Serving Team) */}
              <button
                type="button"
                onClick={handleScorePoint}
                disabled={activeMatch.status === 'completed'}
                className="py-5 px-6 rounded-3xl bg-gradient-to-r from-brand-lime via-emerald-400 to-emerald-500 text-dark-bg font-black text-lg sm:text-xl shadow-xl shadow-brand-lime/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-3 border border-lime-300/30 min-h-[64px]"
              >
                <Zap className="w-6 h-6 fill-current" />
                <span>+ POINT ({activeMatch.servingTeam === 'red' ? activeMatch.teamRed.name : activeMatch.teamBlue.name})</span>
              </button>

              {/* Fault / Sideout Button */}
              <button
                type="button"
                onClick={handleFault}
                disabled={activeMatch.status === 'completed'}
                className="py-5 px-6 rounded-3xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-amber-400 font-black text-lg sm:text-xl shadow-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-3 min-h-[64px]"
              >
                <RotateCcw className="w-6 h-6" />
                <span>FAULT / SIDEOUT</span>
              </button>
            </div>

            {/* SECONDARY MATCH CONTROL BAR */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-800/80">
              {/* Change Court / Swap Sides */}
              <button
                type="button"
                onClick={handleToggleSwapSides}
                className="py-3 px-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-cyan-400 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm min-h-[44px]"
                title="Swap visual team sides on screen"
              >
                <ArrowUpDown className="w-4 h-4 rotate-90" />
                <span>Change Court</span>
              </button>

              {/* Toggle Serve */}
              <button
                type="button"
                onClick={handleToggleServingTeam}
                className="py-3 px-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm min-h-[44px]"
              >
                <RefreshCw className="w-4 h-4 text-brand-lime" />
                <span>Toggle Serve</span>
              </button>

              {/* Toggle Server Num */}
              <button
                type="button"
                onClick={handleToggleServerNumber}
                className="py-3 px-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm min-h-[44px]"
              >
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Server {activeMatch.serverNumber === 1 ? '#2' : '#1'}</span>
              </button>

              {/* Undo Last Action */}
              <button
                type="button"
                onClick={handleUndo}
                disabled={activeMatch.history.length === 0}
                className={`py-3 px-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm min-h-[44px] ${
                  activeMatch.history.length === 0
                    ? 'bg-slate-900/40 border-slate-800/40 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-600 text-slate-200 cursor-pointer'
                }`}
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
                <span>Undo</span>
              </button>

              {/* Reset Match */}
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(true)}
                className="col-span-2 sm:col-span-1 py-3 px-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs hover:bg-rose-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm min-h-[44px]"
              >
                <RefreshCw className="w-4 h-4 text-rose-400" />
                <span>Reset Match</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* LIST OF ACTIVE & RECENT SCOREBOARDS */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Saved Scoreboards & Active Matches ({matches.length})</span>
            </h4>
          </div>

          {matches.length === 0 ? (
            <div className="glass-panel p-10 rounded-3xl border border-slate-800 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                <Trophy className="w-7 h-7" />
              </div>
              <h5 className="text-white font-bold text-base">No Scoreboards Created Yet</h5>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Create a digital scoreboard, select an Open Play event to pull player rosters, assign Red & Blue teams, and start scoring in real-time!
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 text-dark-bg font-extrabold text-xs hover:bg-amber-300 transition-all cursor-pointer shadow-lg shadow-amber-400/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Scoreboard</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map((m) => (
                <div
                  key={m.id}
                  className="glass-panel p-5 rounded-3xl border border-slate-800/90 hover:border-amber-500/40 transition-all space-y-4 shadow-xl flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="font-extrabold text-white text-base truncate max-w-xs">{m.matchTitle}</h4>
                        <p className="text-xs text-slate-400 font-mono">
                          {m.openPlayTitle ? `Open Play: ${m.openPlayTitle}` : 'Custom Match'}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider ${
                          m.status === 'completed'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>

                    {/* Scores Callout */}
                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono text-rose-400 uppercase font-bold block">{m.teamRed.name}</span>
                        <span className="text-3xl font-black font-mono text-rose-400">{m.teamRed.score}</span>
                      </div>
                      <div className="space-y-0.5 border-l border-slate-800">
                        <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold block">{m.teamBlue.name}</span>
                        <span className="text-3xl font-black font-mono text-cyan-400">{m.teamBlue.score}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setActiveMatch(m)}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-lime via-emerald-400 to-emerald-500 text-dark-bg font-extrabold text-xs hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{m.status === 'completed' ? 'View Final Results' : 'Open Live Console'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMatch(m.id)}
                      className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                      title="Delete Scoreboard"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE SCOREBOARD WIZARD MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>Create New Pickleball Scoreboard</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Step 1: Open Play Event Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  1. Select Open Play Event <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <select
                  value={selectedOpenPlayId}
                  onChange={(e) => setSelectedOpenPlayId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime"
                >
                  <option value="">-- Custom Match / No Open Play Event --</option>
                  {openPlayEvents.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.title} ({new Date(op.eventDate || op.date || 0).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Match Title */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Match Title / Court Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Court 1 - Open Play Round 1"
                  value={matchTitleInput}
                  onChange={(e) => setMatchTitleInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime"
                />
              </div>

              {/* Game Type & Target Score */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Game Format
                  </label>
                  <select
                    value={gameTypeInput}
                    onChange={(e) => setGameTypeInput(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime"
                  >
                    <option value="doubles">Doubles (2v2)</option>
                    <option value="singles">Singles (1v1)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Target Score
                  </label>
                  <select
                    value={targetPointsInput}
                    onChange={(e) => setTargetPointsInput(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-dark-border text-white rounded-xl text-xs focus:outline-none focus:border-brand-lime"
                  >
                    <option value={11}>11 Points (Standard)</option>
                    <option value={15}>15 Points</option>
                    <option value={21}>21 Points</option>
                  </select>
                </div>
              </div>

              {/* Step 2 & 3: Team Names & Player Roster Assignment */}
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    2. Team Names & Roster Assignment
                  </span>
                  {availableRoster.length > 0 && (
                    <span className="text-[10px] text-brand-lime font-mono">
                      Pulled {availableRoster.length} players from Open Play
                    </span>
                  )}
                </div>

                {/* RED TEAM INPUT */}
                <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                  <label className="block text-xs font-extrabold text-rose-400 uppercase tracking-wider">
                    RED TEAM NAME
                  </label>
                  <input
                    type="text"
                    value={teamRedName}
                    onChange={(e) => setTeamRedName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs font-bold"
                  />
                  {availableRoster.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] text-slate-400 block mb-1">Select Red Team Players:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {availableRoster.map((p) => {
                          const isSelected = teamRedPlayers.some((rp) => rp.id === p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setTeamRedPlayers(teamRedPlayers.filter((rp) => rp.id !== p.id));
                                } else {
                                  setTeamRedPlayers([...teamRedPlayers, p]);
                                  setTeamBluePlayers(teamBluePlayers.filter((bp) => bp.id !== p.id));
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                isSelected
                                  ? 'bg-rose-500 text-white border-rose-400'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              {p.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* BLUE TEAM INPUT */}
                <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                  <label className="block text-xs font-extrabold text-cyan-400 uppercase tracking-wider">
                    BLUE TEAM NAME
                  </label>
                  <input
                    type="text"
                    value={teamBlueName}
                    onChange={(e) => setTeamBlueName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs font-bold"
                  />
                  {availableRoster.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] text-slate-400 block mb-1">Select Blue Team Players:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {availableRoster.map((p) => {
                          const isSelected = teamBluePlayers.some((bp) => bp.id === p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setTeamBluePlayers(teamBluePlayers.filter((bp) => bp.id !== p.id));
                                } else {
                                  setTeamBluePlayers([...teamBluePlayers, p]);
                                  setTeamRedPlayers(teamRedPlayers.filter((rp) => rp.id !== p.id));
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                isSelected
                                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              {p.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Initial Serve Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Initial Serving Team
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setInitialServingTeam('red')}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-extrabold transition-all ${
                      initialServingTeam === 'red'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    🔴 Red Team Serves First
                  </button>
                  <button
                    type="button"
                    onClick={() => setInitialServingTeam('blue')}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-extrabold transition-all ${
                      initialServingTeam === 'blue'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    🔵 Blue Team Serves First
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-400 border border-slate-800 hover:bg-slate-900 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartNewMatch}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-dark-bg font-black text-xs hover:brightness-110 transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Game Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESET CONFIRMATION MODAL */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-white">Reset Scoreboard Match?</h4>
              <p className="text-xs text-slate-400 mt-1">
                This will reset the scores to <strong className="text-white">0 - 0 - 2</strong> and restart the game while keeping player teams intact.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:bg-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteResetMatch}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
