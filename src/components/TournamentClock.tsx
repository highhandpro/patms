import React, { useState, useEffect, useRef } from 'react';
import { Maximize, Minimize, Play, Pause, RotateCcw, ShieldAlert, Award, Shuffle } from 'lucide-react';
import type { Tournament, Member, BlindLevel, TournamentEntry } from '../types';
import { useApp } from '../context/AppContext';

interface TournamentClockProps {
  tournament: Tournament;
  members: Member[];
  onAddLateEntry: () => void;
  eliminatePlayer: (tournamentId: string, memberId: string) => void;
  updateTournament: (id: string, updated: Partial<Tournament>) => void;
}


const DEFAULT_BLINDS: BlindLevel[] = [
  { type: 'round', roundNumber: 1, duration: 18, smallBlind: 100, bigBlind: 200 },
  { type: 'round', roundNumber: 2, duration: 18, smallBlind: 200, bigBlind: 400 },
  { type: 'round', roundNumber: 3, duration: 18, smallBlind: 300, bigBlind: 600 },
  { type: 'round', roundNumber: 4, duration: 18, smallBlind: 400, bigBlind: 800 },
  { type: 'break', duration: 15, chipUp: false }, // Break 1
  { type: 'round', roundNumber: 5, duration: 18, smallBlind: 500, bigBlind: 1000 },
  { type: 'round', roundNumber: 6, duration: 18, smallBlind: 600, bigBlind: 1200 },
  { type: 'round', roundNumber: 7, duration: 18, smallBlind: 700, bigBlind: 1400 },
  { type: 'round', roundNumber: 8, duration: 18, smallBlind: 800, bigBlind: 1600 },
  { type: 'round', roundNumber: 9, duration: 18, smallBlind: 900, bigBlind: 1800 },
  { type: 'break', duration: 10, chipUp: true }, // Break 2
  { type: 'round', roundNumber: 10, duration: 18, smallBlind: 1000, bigBlind: 2000 },
  { type: 'round', roundNumber: 11, duration: 18, smallBlind: 1500, bigBlind: 3000 },
  { type: 'round', roundNumber: 12, duration: 18, smallBlind: 2000, bigBlind: 4000 },
  { type: 'round', roundNumber: 13, duration: 18, smallBlind: 2500, bigBlind: 5000 },
  { type: 'round', roundNumber: 14, duration: 18, smallBlind: 3000, bigBlind: 6000 },
  { type: 'break', duration: 10, chipUp: true }, // Break 3
  { type: 'round', roundNumber: 15, duration: 18, smallBlind: 4000, bigBlind: 8000 },
  { type: 'round', roundNumber: 16, duration: 18, smallBlind: 5000, bigBlind: 10000 },
  { type: 'round', roundNumber: 17, duration: 18, smallBlind: 10000, bigBlind: 20000 },
  { type: 'round', roundNumber: 18, duration: 18, smallBlind: 15000, bigBlind: 30000 },
  { type: 'round', roundNumber: 19, duration: 18, smallBlind: 20000, bigBlind: 40000 },
  { type: 'round', roundNumber: 20, duration: 18, smallBlind: 25000, bigBlind: 50000 },
];

export const TournamentClock: React.FC<TournamentClockProps> = (props) => {
  const { tournament, members, eliminatePlayer, updateTournament } = props;
  const { state } = useApp();
  const rawBlinds = state.settings.blinds && state.settings.blinds.length > 0 ? state.settings.blinds : DEFAULT_BLINDS;

  // Dynamically map levels to use tournament's roundLength for rounds
  const levels: BlindLevel[] = rawBlinds.map(level => {
    if (level.type === 'round') {
      return { ...level, duration: tournament.roundLength ?? level.duration };
    }
    return level;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [realTime, setRealTime] = useState(new Date());

  const storageKey = `toc_clock_${tournament.id}`;
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(levels[0].duration * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Administration Modals
  const [isBustOutOpen, setIsBustOutOpen] = useState(false);
  const [isAddonOpen, setIsAddonOpen] = useState(false);
  const [isChopOpen, setIsChopOpen] = useState(false);
  const [isRightClickModalOpen, setIsRightClickModalOpen] = useState(false);
  const [isEditingCustomTime, setIsEditingCustomTime] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState('');

  // Add-on input state (direct TD count entry)
  const [addonsCountInput, setAddonsCountInput] = useState<number>(tournament.totalAddons || 0);

  // Chop Calculator States
  const [chopStacks, setChopStacks] = useState<Record<string, number>>({});
  const [chopResults, setChopResults] = useState<{ memberId: string; name: string; stack: number; chipChop: number; icmChop: number }[]>([]);
  const [icmWarning, setIcmWarning] = useState<string | null>(null);

  // Final Table Announcement States
  const [isFinalTableOpen, setIsFinalTableOpen] = useState(false);
  const [finalTablePlayers, setFinalTablePlayers] = useState<TournamentEntry[]>([]);

  // Sound played tracking flags (to prevent skipping during tab throttling/lag)
  const [played1MinSound, setPlayed1MinSound] = useState(false);
  const [played10sSound, setPlayed10sSound] = useState(false);
  const [audioSuspended, setAudioSuspended] = useState(false);

  // Bust-out overlay and sound trigger references
  const isFirstRender = useRef(true);
  const eliminatedIdsRef = useRef<string[]>([]);
  const playedFinalTableSoundRef = useRef(false);
  const prevFinalTableTriggeredRef = useRef(!!tournament.finalTableTriggered);
  const [bustOutOverlay, setBustOutOverlay] = useState<{ playerName: string; position: number } | null>(null);

  // Audio suspension check on mount & click listener for auto-unblock
  useEffect(() => {
    const checkAudioContext = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const testCtx = new AudioContextClass();
          if (testCtx.state === 'suspended') {
            setAudioSuspended(true);
          }
          testCtx.close();
        }
      } catch (e) {
        console.warn('Failed to test audio status', e);
      }
    };
    checkAudioContext();
  }, []);

  const resumeAudio = async () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const testCtx = new AudioContextClass();
        await testCtx.resume();
        testCtx.close();
      }
      setAudioSuspended(false);
    } catch (e) {
      console.warn('Failed to resume audio context', e);
    }
  };

  // 1. Live Firestore Sync catch-up logic
  const fStoreClock = tournament.clockState;

  useEffect(() => {
    if (fStoreClock) {
      setCurrentLevelIndex(fStoreClock.currentLevelIndex);
      setIsRunning(fStoreClock.isRunning);

      // Sync remaining time with a 2-second tolerance threshold
      let dbRemaining = fStoreClock.timeRemainingSeconds;
      if (fStoreClock.isRunning) {
        const elapsed = Math.floor((new Date().getTime() - new Date(fStoreClock.lastUpdated).getTime()) / 1000);
        dbRemaining = Math.max(0, fStoreClock.timeRemainingSeconds - elapsed);
      }

      if (Math.abs(timeRemaining - dbRemaining) > 2) {
        setTimeRemaining(dbRemaining);
      }
    } else {
      // Initialize Firestore clockState if blank
      updateTournament(tournament.id, {
        clockState: {
          currentLevelIndex: 0,
          timeRemainingSeconds: levels[0].duration * 60,
          isRunning: false,
          lastUpdated: new Date().toISOString()
        }
      });
    }
  }, [fStoreClock]);

  // Synchronize dynamic input changes when totalAddons changes
  useEffect(() => {
    setAddonsCountInput(tournament.totalAddons || 0);
  }, [tournament.totalAddons]);

  // Highlight active players panel briefly when clicking the bottom Bust Out button
  useEffect(() => {
    if (isBustOutOpen) {
      const timer = setTimeout(() => setIsBustOutOpen(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isBustOutOpen]);

  // Save local state to localStorage as a local cache backup
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ currentLevelIndex, timeRemaining, isRunning }));
  }, [currentLevelIndex, timeRemaining, isRunning, storageKey]);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => setRealTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-fullscreen on mount
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (containerRef.current && !document.fullscreenElement) {
          await containerRef.current.requestFullscreen();
        }
      } catch (err) {
        console.warn('Auto-fullscreen request was blocked by browser policy:', err);
      }
    };
    enterFullscreen();
  }, []);

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Web Audio Synthesized Buzzer sound
  const playBuzzer = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(150, audioCtx.currentTime);

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(220, audioCtx.currentTime);

      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.8);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start();
      osc2.start();

      osc1.stop(audioCtx.currentTime + 1.8);
      osc2.stop(audioCtx.currentTime + 1.8);
    } catch (e) {
      console.warn('Audio buzzer failed to play:', e);
    }
  };

  const playCustomSound = (soundType: '1min' | '10s' | 'levelChange' | 'startStop' | 'bustOut' | 'finalTable') => {
    let filePath = '';
    switch (soundType) {
      case '1min':
        filePath = '/sounds/1_minute_bingo_bango_bongo.wav';
        break;
      case '10s':
        filePath = '/sounds/10_second_warning.mp3';
        break;
      case 'levelChange':
        filePath = '/sounds/level_change.wav';
        break;
      case 'startStop':
        filePath = '/sounds/clock_sound.wav';
        break;
      case 'bustOut':
        filePath = '/sounds/bust_out.mp3';
        break;
      case 'finalTable':
        filePath = '/sounds/final_table.mp3';
        break;
    }

    if (filePath) {
      const audio = new Audio(filePath);
      audio.play().catch(err => {
        console.warn(`Failed to play custom sound ${soundType}:`, err);
        if (soundType === 'levelChange') {
          playBuzzer();
        }
      });
    }
  };

  // Synced state handlers
  const handleTogglePlay = () => {
    playCustomSound('startStop');
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);
    updateTournament(tournament.id, {
      clockState: {
        currentLevelIndex,
        timeRemainingSeconds: timeRemaining,
        isRunning: nextRunning,
        lastUpdated: new Date().toISOString()
      }
    });
  };

  const handleSaveCustomTime = () => {
    const parts = customTimeInput.split(':');
    if (parts.length === 2) {
      const mins = Number(parts[0]);
      const secs = Number(parts[1]);
      if (!isNaN(mins) && !isNaN(secs) && mins >= 0 && secs >= 0 && secs < 60) {
        const total = mins * 60 + secs;
        setTimeRemaining(total);
        updateTournament(tournament.id, {
          clockState: {
            currentLevelIndex,
            timeRemainingSeconds: total,
            isRunning,
            lastUpdated: new Date().toISOString()
          }
        });
        setIsEditingCustomTime(false);
        setIsRightClickModalOpen(false);
        return;
      }
    }
    alert('Please enter a valid time in MM:SS format (e.g. 18:00)');
  };

  const handleResetTime = () => {
    const durationSecs = levels[currentLevelIndex].duration * 60;
    setTimeRemaining(durationSecs);
    updateTournament(tournament.id, {
      clockState: {
        currentLevelIndex,
        timeRemainingSeconds: durationSecs,
        isRunning,
        lastUpdated: new Date().toISOString()
      }
    });
  };

  const handlePrevLevel = () => {
    if (currentLevelIndex > 0) {
      const prevIndex = currentLevelIndex - 1;
      setCurrentLevelIndex(prevIndex);
      const prevTime = levels[prevIndex].duration * 60;
      setTimeRemaining(prevTime);
      updateTournament(tournament.id, {
        clockState: {
          currentLevelIndex: prevIndex,
          timeRemainingSeconds: prevTime,
          isRunning,
          lastUpdated: new Date().toISOString()
        }
      });
    }
  };

  const handleNextLevel = () => {
    if (currentLevelIndex < levels.length - 1) {
      const nextIndex = currentLevelIndex + 1;
      setCurrentLevelIndex(nextIndex);
      const nextTime = levels[nextIndex].duration * 60;
      setTimeRemaining(nextTime);
      updateTournament(tournament.id, {
        clockState: {
          currentLevelIndex: nextIndex,
          timeRemainingSeconds: nextTime,
          isRunning,
          lastUpdated: new Date().toISOString()
        }
      });
    }
  };

  // Main countdown timer interval
  useEffect(() => {
    let interval: any = null;

    if (isRunning) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            playCustomSound('levelChange');
            if (currentLevelIndex < levels.length - 1) {
              const nextIndex = currentLevelIndex + 1;
              setCurrentLevelIndex(nextIndex);
              const nextTime = levels[nextIndex].duration * 60;
              // Admin writes level transition to Firestore
              updateTournament(tournament.id, {
                clockState: {
                  currentLevelIndex: nextIndex,
                  timeRemainingSeconds: nextTime,
                  isRunning: true,
                  lastUpdated: new Date().toISOString()
                }
              });
              return nextTime;
            } else {
              setIsRunning(false);
              updateTournament(tournament.id, {
                clockState: {
                  currentLevelIndex,
                  timeRemainingSeconds: 0,
                  isRunning: false,
                  lastUpdated: new Date().toISOString()
                }
              });
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, currentLevelIndex]);

  // Robust sound triggers effect (handles browser lag, skips, and tab background throttling)
  useEffect(() => {
    if (!isRunning) return;

    if (timeRemaining <= 60 && timeRemaining > 55 && !played1MinSound) {
      playCustomSound('1min');
      setPlayed1MinSound(true);
    } else if (timeRemaining <= 10 && timeRemaining > 5 && !played10sSound) {
      playCustomSound('10s');
      setPlayed10sSound(true);
    }
  }, [timeRemaining, isRunning, played1MinSound, played10sSound]);

  // Reset tracking flags if timer goes above the thresholds
  useEffect(() => {
    if (timeRemaining > 60) {
      setPlayed1MinSound(false);
    }
    if (timeRemaining > 10) {
      setPlayed10sSound(false);
    }
  }, [timeRemaining]);

  // Spacebar play/pause listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, currentLevelIndex, timeRemaining]);

  const currentLevel = levels[currentLevelIndex];
  const nextLevel = currentLevelIndex < levels.length - 1 ? levels[currentLevelIndex + 1] : null;

  // Format countdown string
  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate Next Break countdown
  const getNextBreakInSeconds = () => {
    let secondsSum = timeRemaining;
    for (let i = currentLevelIndex + 1; i < levels.length; i++) {
      if (levels[i].type === 'break') {
        break;
      }
      secondsSum += levels[i].duration * 60;
    }
    return secondsSum;
  };

  const formatHoursMinsSecs = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Stats Calculations
  const checkedInPlayers = tournament.entries.filter(e => e.hasBuyIn);
  const activePlayers = checkedInPlayers.filter(e => !e.eliminatedAt);
  const sortedActivePlayers = [...activePlayers].sort((a, b) => {
    const memA = members.find(m => m.id === a.memberId);
    const memB = members.find(m => m.id === b.memberId);
    const nameA = memA ? `${memA.firstName} ${memA.lastName}`.trim() : '';
    const nameB = memB ? `${memB.firstName} ${memB.lastName}`.trim() : '';
    return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
  });

  // Automatically pause the clock when the tournament ends (1 or 0 active players left)
  useEffect(() => {
    if (isRunning && activePlayers.length <= 1) {
      setIsRunning(false);
      updateTournament(tournament.id, {
        clockState: {
          currentLevelIndex,
          timeRemainingSeconds: timeRemaining,
          isRunning: false,
          lastUpdated: new Date().toISOString()
        }
      });
    }
  }, [activePlayers.length, isRunning, currentLevelIndex, timeRemaining, tournament.id, updateTournament]);

  // Synchronize eliminated players to trigger sound and fullscreen bust-out overlay
  useEffect(() => {
    const currentEliminatedIds = tournament.entries
      .filter(e => e.hasBuyIn && e.eliminatedAt)
      .map(e => e.memberId);

    if (isFirstRender.current) {
      eliminatedIdsRef.current = currentEliminatedIds;
      isFirstRender.current = false;
      return;
    }

    const newlyEliminatedId = currentEliminatedIds.find(id => !eliminatedIdsRef.current.includes(id));
    if (newlyEliminatedId) {
      const mem = members.find(m => m.id === newlyEliminatedId);
      const name = mem ? `${mem.firstName} ${mem.lastName}` : 'Unknown Player';

      // Play bust out sound
      playCustomSound('bustOut');

      // Calculate place (activePlayers + 1)
      const place = activePlayers.length + 1;

      // Show fullscreen overlay
      setBustOutOverlay({ playerName: name, position: place });
    }

    eliminatedIdsRef.current = currentEliminatedIds;
  }, [tournament.entries, members, activePlayers.length]);

  // Clear bust-out overlay after 2 seconds
  useEffect(() => {
    if (bustOutOverlay) {
      const timer = setTimeout(() => {
        setBustOutOverlay(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [bustOutOverlay]);

  // Synchronize isFinalTableOpen with database finalTableTriggered state for spectators/TV screens
  useEffect(() => {
    // Only open the modal if finalTableTriggered transitions from false to true
    if (tournament.finalTableTriggered && !prevFinalTableTriggeredRef.current) {
      const ftSeats = tournament.seating?.["final table"] || [];
      const ftPlayers = ftSeats
        .map(memberId => tournament.entries.find(e => e.memberId === memberId && e.hasBuyIn))
        .filter((e): e is TournamentEntry => !!e);

      setFinalTablePlayers(ftPlayers);
      setIsFinalTableOpen(true);
    } else if (!tournament.finalTableTriggered && prevFinalTableTriggeredRef.current) {
      setIsFinalTableOpen(false);
    }
    
    prevFinalTableTriggeredRef.current = !!tournament.finalTableTriggered;
  }, [tournament.finalTableTriggered, tournament.seating, tournament.entries]);

  // Play final table sound warning when modal opens
  useEffect(() => {
    if (isFinalTableOpen) {
      if (!playedFinalTableSoundRef.current) {
        playCustomSound('finalTable');
        playedFinalTableSoundRef.current = true;
      }
    } else {
      playedFinalTableSoundRef.current = false;
    }
  }, [isFinalTableOpen]);

  // Trigger Final Table Modal and pause clock when active player count becomes <= 10
  useEffect(() => {
    if (activePlayers.length <= 10 && activePlayers.length > 1 && !tournament.finalTableTriggered) {
      // Shuffle active players randomly using Fisher-Yates algorithm
      const shuffled = [...activePlayers];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // Seat them in a single table named "final table" (max 10 seats)
      const finalTableSeats = Array(10).fill("");
      shuffled.forEach((p, idx) => {
        finalTableSeats[idx] = p.memberId;
      });
      const newSeating = {
        "final table": finalTableSeats
      };

      setFinalTablePlayers(shuffled);
      setIsFinalTableOpen(true);

      // Stop the clock
      setIsRunning(false);
      updateTournament(tournament.id, {
        seating: newSeating,
        finalTableTriggered: true,
        clockState: {
          currentLevelIndex,
          timeRemainingSeconds: timeRemaining,
          isRunning: false,
          lastUpdated: new Date().toISOString()
        }
      });
      playCustomSound('startStop');
    }
  }, [activePlayers.length, tournament.finalTableTriggered, currentLevelIndex, timeRemaining, tournament.id, updateTournament]);

  // Reset finalTableTriggered flag if player count goes back above 10 (e.g. late entries/rebuys)
  useEffect(() => {
    if (activePlayers.length > 10 && tournament.finalTableTriggered) {
      updateTournament(tournament.id, {
        finalTableTriggered: false
      });
    }
  }, [activePlayers.length, tournament.finalTableTriggered, tournament.id, updateTournament]);

  const handleManualFinalTableShuffle = () => {
    // Shuffle active players randomly using Fisher-Yates algorithm
    const shuffled = [...activePlayers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const finalTableSeats = Array(10).fill("");
    shuffled.forEach((p, idx) => {
      finalTableSeats[idx] = p.memberId;
    });
    const newSeating = {
      "final table": finalTableSeats
    };

    setFinalTablePlayers(shuffled);
    setIsFinalTableOpen(true);

    // Stop the clock when manual final table shuffle is triggered
    setIsRunning(false);
    updateTournament(tournament.id, {
      seating: newSeating,
      finalTableTriggered: true,
      clockState: {
        currentLevelIndex,
        timeRemainingSeconds: timeRemaining,
        isRunning: false,
        lastUpdated: new Date().toISOString()
      }
    });
    playCustomSound('startStop');
  };

  const totalAddonsCount = tournament.totalAddons || tournament.entries.filter(e => e.hasAddon).length;
  const startingChipsPerPlayer = tournament.startingChips || 8500;
  const addonChipsPerPlayer = tournament.addonChips || 3500;

  const totalChips = (checkedInPlayers.length * startingChipsPerPlayer) + (totalAddonsCount * addonChipsPerPlayer);
  const avgStack = activePlayers.length > 0 ? Math.round(totalChips / activePlayers.length) : 0;

  const formatChipsCompact = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Dynamic Payout List - Always displays payouts falling back to 50/30/20 standard if unconfigured
  const buyInCount = checkedInPlayers.length;
  const netBuyInContribution = (tournament.buyInAmount || 40) - (tournament.dealerAppreciationAmount || 0) - (tournament.foodAmount || 0);
  const netAddonContribution = tournament.addonAmount || 0;
  const calculatedPrizePool = Math.max(0, (buyInCount * netBuyInContribution) + (totalAddonsCount * netAddonContribution));
  const prizePool = tournament.overridePrizePool !== undefined && tournament.overridePrizePool > 0
    ? tournament.overridePrizePool
    : calculatedPrizePool;
  const pctSource = tournament.payoutPercentages && tournament.payoutPercentages.reduce((a, b) => a + b, 0) > 0
    ? tournament.payoutPercentages
    : [50, 30, 20, 0, 0, 0, 0, 0, 0, 0];
  const payoutsList = pctSource
    .map((pct, idx) => ({ place: idx + 1, pct, amount: (pct / 100) * prizePool }))
    .filter(p => p.pct > 0);

  const getPlayerAtPlace = (place: number) => {
    // 1. Check if a player has this finishPosition assigned
    const entryAtPlace = tournament.entries.find(e => e.finishPosition === place);
    if (entryAtPlace) {
      const mem = members.find(m => m.id === entryAtPlace.memberId);
      return mem ? `${mem.firstName} ${mem.lastName}` : 'Unknown';
    }
    // 2. Special case: if there is exactly 1 player left alive, they are the 1st place winner!
    if (place === 1 && activePlayers.length === 1) {
      const winner = activePlayers[0];
      const mem = members.find(m => m.id === winner.memberId);
      return mem ? `${mem.firstName} ${mem.lastName}` : 'Unknown';
    }
    return null;
  };

  const toggleFullscreenMode = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  // ICM Calculations
  const calculateICM = (stacks: number[], payouts: number[]): number[] => {
    const numPlayers = stacks.length;
    const results = new Array(numPlayers).fill(0);
    const totalChips = stacks.reduce((a, b) => a + b, 0);
    if (totalChips === 0) return results;

    const computeProbability = (remainingStacks: number[], remainingPayouts: number[], indexMap: number[], currentPathProbability: number) => {
      const sumStacks = remainingStacks.reduce((a, b) => a + b, 0);
      if (sumStacks === 0 || remainingPayouts.length === 0) return;

      const currentPayout = remainingPayouts[0];

      for (let i = 0; i < remainingStacks.length; i++) {
        if (remainingStacks[i] === 0) continue;

        const pFirst = remainingStacks[i] / sumStacks;
        const nextProb = currentPathProbability * pFirst;
        const playerIndex = indexMap[i];

        results[playerIndex] += nextProb * currentPayout;

        if (remainingPayouts.length > 1 && remainingStacks.length > 1) {
          const nextStacks = [...remainingStacks];
          nextStacks.splice(i, 1);
          const nextIndexMap = [...indexMap];
          nextIndexMap.splice(i, 1);
          computeProbability(nextStacks, remainingPayouts.slice(1), nextIndexMap, nextProb);
        }
      }
    };

    const initialIndices = Array.from({ length: numPlayers }, (_, i) => i);
    computeProbability(stacks, payouts, initialIndices, 1);
    return results;
  };

  // Handle Chop Calculation
  const handleCalculateChop = () => {
    const activeMembers = activePlayers.map(p => {
      const mem = members.find(m => m.id === p.memberId);
      return {
        id: p.memberId,
        name: mem ? `${mem.firstName} ${mem.lastName}` : 'Unknown'
      };
    });

    const stacks = activeMembers.map(am => chopStacks[am.id] || 0);
    const totalChopChips = stacks.reduce((a, b) => a + b, 0);
    if (totalChopChips === 0) return;

    const sortedPayouts = payoutsList.map(p => p.amount).sort((a, b) => b - a);
    const chipChops = stacks.map(stack => (stack / totalChopChips) * prizePool);
    
    // Calculate permutations: P(n, k) = n! / (n-k)!
    const n = stacks.length;
    const k = Math.min(n, sortedPayouts.length);
    let permutations = 1;
    for (let i = 0; i < k; i++) {
      permutations *= (n - i);
    }

    let icmChops: number[] = [];
    if (permutations > 150000) {
      setIcmWarning(`ICM calculation disabled (requires ${permutations.toLocaleString()} operations). Showing Chip Chop only.`);
      icmChops = new Array(n).fill(0);
    } else {
      setIcmWarning(null);
      icmChops = calculateICM(stacks, sortedPayouts);
    }

    const results = activeMembers.map((am, i) => ({
      memberId: am.id,
      name: am.name,
      stack: stacks[i],
      chipChop: chipChops[i],
      icmChop: icmChops[i]
    }));

    setChopResults(results);
  };

  // Reset Chop inputs
  useEffect(() => {
    if (isChopOpen) {
      const initialStacks: Record<string, number> = {};
      activePlayers.forEach(p => {
        initialStacks[p.memberId] = avgStack;
      });
      setChopStacks(initialStacks);
      setChopResults([]);
      setIcmWarning(null);
    }
  }, [isChopOpen]);

  // Submit Total Add-ons entered by TD
  const handleSaveAddonsCount = (e: React.FormEvent) => {
    e.preventDefault();
    updateTournament(tournament.id, { totalAddons: addonsCountInput });
    setIsAddonOpen(false);
  };

  return (
    <div 
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#0b2545',
        color: '#ffffff',
        fontFamily: '"Outfit", -apple-system, sans-serif',
        padding: isFullscreen ? '24px 40px 12px 40px' : '24px',
        borderRadius: isFullscreen ? '0' : '16px',
        border: isFullscreen ? 'none' : '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        minHeight: isFullscreen ? '100vh' : '650px',
        transition: 'all 0.3s ease'
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setIsRightClickModalOpen(true);
        setIsEditingCustomTime(false);
      }}
    >
      {/* Autoplay blocker notification banner */}
      {audioSuspended && (
        <div 
          onClick={resumeAudio}
          style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--color-gold)',
            color: '#07090e',
            padding: '12px 24px',
            borderRadius: '30px',
            fontWeight: 800,
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(251, 191, 36, 0.4)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          <span>🔊</span> Click to enable sound alerts!
        </div>
      )}

      {/* Main Clock Grid - 2 Column Layout optimized for large TV displays */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isFullscreen ? '360px minmax(0, 1fr)' : '320px minmax(0, 1fr)', 
        gap: '24px', 
        flex: 1, 
        margin: '6px 0' 
      }}>
        
        {/* Left Column: Stats Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isFullscreen ? '10px' : '6px' }}>
          {/* Card 1: Level */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#071830', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: isFullscreen ? '14px 12px' : '8px 10px', textAlign: 'center', flex: 1 }}>
            <span style={{ fontSize: isFullscreen ? '1.05rem' : '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LEVEL</span>
            <span style={{ fontSize: isFullscreen ? '3.5rem' : '2.6rem', fontWeight: 900, color: '#ffffff', marginTop: '2px', fontFamily: '"Outfit", sans-serif' }}>
              {currentLevel.type === 'round' ? currentLevel.roundNumber : 'BREAK'}
            </span>
          </div>

          {/* Card 2: Current Time */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#071830', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: isFullscreen ? '14px 12px' : '8px 10px', textAlign: 'center', flex: 1 }}>
            <span style={{ fontSize: isFullscreen ? '1.05rem' : '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CURRENT TIME</span>
            <span style={{ fontSize: isFullscreen ? '3rem' : '2.1rem', fontWeight: 900, color: '#ffffff', marginTop: '2px', fontFamily: '"Outfit", sans-serif' }}>
              {realTime.toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).toLowerCase()}
            </span>
          </div>

          {/* Card 3: Next Break */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#071830', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: isFullscreen ? '14px 12px' : '8px 10px', textAlign: 'center', flex: 1 }}>
            <span style={{ fontSize: isFullscreen ? '1.05rem' : '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>NEXT BREAK IN</span>
            <span style={{ fontSize: isFullscreen ? '3rem' : '2.1rem', fontWeight: 900, color: '#fbbf24', marginTop: '2px', fontFamily: '"Outfit", sans-serif' }}>
              {formatHoursMinsSecs(getNextBreakInSeconds())}
            </span>
          </div>

          {/* Card 4: Players In */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#071830', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: isFullscreen ? '14px 12px' : '8px 10px', textAlign: 'center', flex: 1 }}>
            <span style={{ fontSize: isFullscreen ? '1.05rem' : '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PLAYERS IN / ALIVE</span>
            <span style={{ fontSize: isFullscreen ? '3rem' : '2.1rem', fontWeight: 900, color: '#ffffff', marginTop: '2px', fontFamily: '"Outfit", sans-serif' }}>
              {activePlayers.length} / {checkedInPlayers.length}
            </span>
          </div>

          {/* Card 5: Average Stack */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#071830', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: isFullscreen ? '14px 12px' : '8px 10px', textAlign: 'center', flex: 1 }}>
            <span style={{ fontSize: isFullscreen ? '1.05rem' : '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AVERAGE STACK</span>
            <span style={{ fontSize: isFullscreen ? '3rem' : '2.1rem', fontWeight: 900, color: '#ffffff', marginTop: '2px', fontFamily: '"Outfit", sans-serif' }}>
              {formatChipsCompact(avgStack)}
            </span>
          </div>

          {/* Card 6: Chips In Play */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#071830', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: isFullscreen ? '14px 12px' : '8px 10px', textAlign: 'center', flex: 1 }}>
            <span style={{ fontSize: isFullscreen ? '1.05rem' : '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CHIPS IN PLAY</span>
            <span style={{ fontSize: isFullscreen ? '3rem' : '2.1rem', fontWeight: 900, color: '#ffffff', marginTop: '2px', fontFamily: '"Outfit", sans-serif' }}>
              {formatChipsCompact(totalChips)}
            </span>
          </div>
        </div>

        {/* Right Column: Main Clock Display + Places Paid Card underneath */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'space-between' }}>
          
          {/* Card A: Timer & Blinds & Active Players (Full Width stack) */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            backgroundColor: 'rgba(0,0,0,0.2)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '16px', 
            padding: isFullscreen ? '16px 24px' : '12px 16px', 
            flex: 1, 
            textAlign: 'center' 
          }}>
            {/* Big countdown timer in custom heavy Outfit font */}
            <div 
              onClick={handleTogglePlay}
              style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                fontSize: isFullscreen ? '21.5rem' : '10.5rem', 
                fontWeight: 900, 
                color: '#ffffff', 
                fontFamily: '"Outfit", -apple-system, sans-serif', 
                letterSpacing: '-0.02em',
                cursor: 'pointer',
                userSelect: 'none',
                lineHeight: 0.85,
                margin: isFullscreen ? '2px 0 16px 0' : '2px 0'
              }}
            >
              {formatCountdown(timeRemaining)}
            </div>

            {/* Blinds Row (Current Blinds on Left, Next Level on Right) */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              borderTop: '2px solid rgba(255,255,255,0.15)', 
              paddingTop: '16px', 
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              {/* Current Blinds */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                <span style={{ fontSize: isFullscreen ? '1.2rem' : '1.05rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
                  CURRENT BLINDS
                </span>
                <span style={{ fontSize: isFullscreen ? '5.8rem' : '3rem', fontWeight: 900, color: '#fbbf24', fontFamily: '"Outfit", -apple-system, sans-serif', lineHeight: 1, letterSpacing: '-0.01em' }}>
                  {currentLevel.type === 'round' 
                    ? `${currentLevel.smallBlind?.toLocaleString()} / ${currentLevel.bigBlind?.toLocaleString()}` 
                    : 'BREAK TIME'}
                </span>
                {currentLevel.chipUp && (
                  <span style={{ fontSize: isFullscreen ? '1.2rem' : '1rem', color: 'var(--color-danger)', fontWeight: 800, textTransform: 'uppercase', marginLeft: '8px' }}>
                    ⚠️ CHIP UP
                  </span>
                )}
              </div>

              {/* Next Level */}
              {nextLevel && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: isFullscreen ? '1.4rem' : '1.2rem' }}>
                  <span style={{ fontWeight: 600 }}>NEXT LEVEL:</span>
                  <span style={{ fontWeight: 950, color: '#ffffff', fontSize: isFullscreen ? '2.4rem' : '1.4rem', fontFamily: '"Outfit", sans-serif' }}>
                    {nextLevel.type === 'round' 
                      ? `${nextLevel.smallBlind?.toLocaleString()} / ${nextLevel.bigBlind?.toLocaleString()}` 
                      : 'BREAK TIME'}
                  </span>
                </div>
              )}
            </div>

            {/* Active Players list (Full width under blinds row) */}
            <div style={{ 
              backgroundColor: 'rgba(5, 16, 32, 0.95)', 
              border: isBustOutOpen ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.15)', 
              boxShadow: isBustOutOpen ? '0 0 20px rgba(239, 68, 68, 0.4)' : 'none',
              borderRadius: '12px', 
              padding: isFullscreen ? '12px 18px' : '16px 20px', 
              width: '100%', 
              textAlign: 'left', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '6px',
              maxHeight: isFullscreen ? '500px' : '260px',
              transition: 'all 0.3s ease-in-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
                <span style={{ fontSize: isFullscreen ? '1.35rem' : '1.05rem', fontWeight: 800, color: 'var(--color-gold)', letterSpacing: '0.05em' }}>
                  ACTIVE PLAYERS ({activePlayers.length} ALIVE)
                </span>
              </div>
              <div style={{ 
                columnCount: 4,
                columnGap: '20px',
                overflowY: 'auto',
                paddingRight: '4px',
                width: '100%'
              }}>
                {sortedActivePlayers.map(p => {
                  const mem = members.find(m => m.id === p.memberId);
                  const name = mem ? `${mem.firstName} ${mem.lastName}` : 'Unknown';
                  return (
                    <div 
                      key={p.memberId}
                      onClick={() => {
                        eliminatePlayer(tournament.id, p.memberId);
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = '#7f1d1d';
                        e.currentTarget.style.borderColor = '#ef4444';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      }}
                      style={{ 
                        cursor: 'pointer', 
                        fontSize: isFullscreen ? '1.85rem' : '0.95rem', 
                        fontWeight: 700, 
                        color: '#ffffff',
                        padding: isFullscreen ? '4px 12px' : '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        textAlign: 'left',
                        border: '1px solid rgba(255,255,255,0.06)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        transition: 'all 0.15s ease-in-out',
                        breakInside: 'avoid',
                        marginBottom: isFullscreen ? '6px' : '6px',
                        display: 'block'
                      }}
                      title={`Click to bust out ${name}`}
                    >
                      {name}
                    </div>
                  );
                })}
                {activePlayers.length === 0 && (
                  <div style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '12px' }}>
                    No active players remaining.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card B: Places Paid & Controls Stack (Wide layout at the bottom, logo removed) */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '12px', 
            backgroundColor: '#071830', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '12px', 
            padding: isFullscreen ? '14px 20px' : '10px 16px',
            width: '100%'
          }}>
            {/* Inline Style Injection for infinite loop horizontal scrolling marquee */}
            <style>{`
              @keyframes marquee {
                0% { transform: translate3d(0, 0, 0); }
                100% { transform: translate3d(-50%, 0, 0); }
              }
            `}</style>

            {/* Places Paid Horizontal Marquee Ticker */}
            <div style={{ width: '100%' }}>

              {payoutsList.length > 0 ? (
                <div style={{ 
                  overflow: 'hidden', 
                  width: '100%', 
                  position: 'relative', 
                  display: 'flex', 
                  alignItems: 'center', 
                  height: isFullscreen ? '36px' : '30px', 
                  backgroundColor: 'rgba(255,255,255,0.02)', 
                  borderRadius: '6px', 
                  border: '1px solid rgba(255,255,255,0.05)', 
                  padding: '0 12px' 
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '40px',
                    whiteSpace: 'nowrap',
                    animation: 'marquee 25s linear infinite',
                    width: 'max-content'
                  }}>
                    {/* Render the payouts list twice for infinite seamless loop */}
                    {[...payoutsList, ...payoutsList].map((p, idx) => {
                      const playerNameAtPlace = getPlayerAtPlace(p.place);
                      const displayLabel = playerNameAtPlace 
                        ? `${p.place === 1 ? '🥇' : p.place === 2 ? '🥈' : p.place === 3 ? '🥉' : `${p.place}th`} ${playerNameAtPlace}`
                        : (p.place === 1 ? '🥇 1st Place' : p.place === 2 ? '🥈 2nd Place' : p.place === 3 ? '🥉 3rd Place' : `${p.place}th Place`);

                      return (
                        <div key={`${p.place}-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: isFullscreen ? '1.25rem' : '1rem' }}>
                          <span style={{ color: playerNameAtPlace ? '#ffffff' : 'rgba(255,255,255,0.7)', fontWeight: 800 }}>
                            {displayLabel}:
                          </span>
                          <span style={{ color: 'var(--color-emerald)', fontWeight: 900, fontFamily: '"Outfit", sans-serif' }}>
                            ${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', fontSize: '0.9rem', textAlign: 'center', padding: '6px' }}>
                  Setup place payout percentages to display dynamic awards.
                </div>
              )}
            </div>
            {/* Administration Actions shortcuts (excluding Buy-in and Bust Out) */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%', 
              borderTop: '1px solid rgba(255,255,255,0.05)', 
              paddingTop: '12px',
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              {/* Left Side: Tournament Name and Tagline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left', flex: 1, minWidth: '280px' }}>
                <h3 style={{ fontSize: isFullscreen ? '1.4rem' : '1.15rem', fontWeight: 800, margin: 0, color: '#fbbf24', lineHeight: 1.15 }}>
                  {tournament.name} — Tournament Clock
                </h3>
                <span style={{ fontSize: isFullscreen ? '0.85rem' : '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.15 }}>
                  {startingChipsPerPlayer.toLocaleString()} Starting Stack • {tournament.rebuys === 'None' ? 'Freeze-out' : 'Rebuys'} • ${tournament.addonAmount} Add-on for {addonChipsPerPlayer.toLocaleString()} at 1st Break
                </span>
              </div>

              {/* Right Side: Actions Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                {/* Fullscreen Button */}
                <button 
                  onClick={toggleFullscreenMode}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = '#071830';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  }}
                  style={{ 
                    backgroundColor: '#071830', 
                    color: '#ffffff', 
                    border: '1px solid rgba(255,255,255,0.15)', 
                    padding: isFullscreen ? '8px 14px' : '6px 10px', 
                    fontSize: isFullscreen ? '1rem' : '0.85rem', 
                    fontWeight: 700,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease-in-out'
                  }}
                >
                  {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                  <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
                </button>
              {/* Start / Pause Button */}
              <button 
                onClick={handleTogglePlay}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#071830';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                }}
                style={{ 
                  backgroundColor: '#071830', 
                  color: '#ffffff', 
                  border: '1px solid rgba(255,255,255,0.15)', 
                  padding: isFullscreen ? '8px 14px' : '6px 10px', 
                  fontSize: isFullscreen ? '1rem' : '0.85rem', 
                  fontWeight: 700,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                {isRunning ? <Pause size={16} /> : <Play size={16} />}
                <span>{isRunning ? 'Pause' : 'Start'}</span>
              </button>

              {/* Reset Clock */}
              <button 
                onClick={handleResetTime}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#071830';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                }}
                style={{ 
                  backgroundColor: '#071830', 
                  color: '#ffffff', 
                  border: '1px solid rgba(255,255,255,0.15)', 
                  padding: isFullscreen ? '8px 10px' : '6px 8px', 
                  fontSize: isFullscreen ? '1rem' : '0.85rem', 
                  fontWeight: 700,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease-in-out'
                }}
                title="Reset Clock"
              >
                <RotateCcw size={16} />
              </button>

              {/* Level - */}
              <button 
                onClick={handlePrevLevel}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#071830';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                }}
                style={{ 
                  backgroundColor: '#071830', 
                  color: '#ffffff', 
                  border: '1px solid rgba(255,255,255,0.15)', 
                  padding: isFullscreen ? '8px 14px' : '6px 10px', 
                  fontSize: isFullscreen ? '1rem' : '0.85rem', 
                  fontWeight: 700,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                Level -
              </button>

              {/* Level + */}
              <button 
                onClick={handleNextLevel}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#071830';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                }}
                style={{ 
                  backgroundColor: '#071830', 
                  color: '#ffffff', 
                  border: '1px solid rgba(255,255,255,0.15)', 
                  padding: isFullscreen ? '8px 14px' : '6px 10px', 
                  fontSize: isFullscreen ? '1rem' : '0.85rem', 
                  fontWeight: 700,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                Level +
              </button>

              {/* Add-on */}
              <button 
                onClick={() => setIsAddonOpen(true)}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#071830';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                }}
                style={{ 
                  backgroundColor: '#071830', 
                  color: '#ffffff', 
                  border: '1px solid rgba(255,255,255,0.15)', 
                  padding: isFullscreen ? '8px 14px' : '6px 10px', 
                  fontSize: isFullscreen ? '1rem' : '0.85rem', 
                  fontWeight: 700,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                <ShieldAlert size={16} />
                <span>Add-on</span>
              </button>

              {/* Chop */}
              <button 
                onClick={() => setIsChopOpen(true)}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#071830';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                }}
                style={{ 
                  backgroundColor: '#071830', 
                  color: '#ffffff', 
                  border: '1px solid rgba(255,255,255,0.15)', 
                  padding: isFullscreen ? '8px 14px' : '6px 10px', 
                  fontSize: isFullscreen ? '1rem' : '0.85rem', 
                  fontWeight: 700,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                <Award size={16} />
                <span>Chop</span>
              </button>

              {/* Reshuffle Seats (Only show if <= 10 players alive) */}
              {activePlayers.length <= 10 && activePlayers.length > 1 && (
                <button 
                  onClick={handleManualFinalTableShuffle}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = '#071830';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  }}
                  style={{ 
                    backgroundColor: '#071830', 
                    color: 'var(--color-gold)', 
                    border: '1px solid var(--color-gold)', 
                    padding: isFullscreen ? '8px 14px' : '6px 10px', 
                    fontSize: isFullscreen ? '1rem' : '0.85rem', 
                    fontWeight: 700,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease-in-out'
                  }}
                >
                  <Shuffle size={16} />
                  <span>Reshuffle Seats</span>
                </button>
              )}
              </div>
            </div>
          </div>

        </div>

      </div>



      {/* RIGHT CLICK CLOCK OPTIONS MODAL */}
      {isRightClickModalOpen && (
        <div 
          onClick={() => setIsRightClickModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1001,
            padding: '20px'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="glass-card animate-slide-up"
            style={{
              width: '100%',
              maxWidth: '320px',
              backgroundColor: '#071830',
              border: '1px solid rgba(255,255,255,0.15)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              borderRadius: '12px'
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 4px 0', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
              Clock Options
            </h3>
            
            {/* Toggle Play/Pause */}
            <button
              onClick={() => {
                handleTogglePlay();
                setIsRightClickModalOpen(false);
              }}
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease-in-out'
              }}
            >
              {isRunning ? 'Stop Clock' : 'Start Clock'}
            </button>

            {/* Set Clock Trigger */}
            {isEditingCustomTime ? (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input 
                  type="text"
                  value={customTimeInput}
                  onChange={e => setCustomTimeInput(e.target.value)}
                  placeholder="MM:SS"
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    padding: '6px 10px',
                    fontSize: '0.95rem',
                    textAlign: 'center'
                  }}
                  autoFocus
                />
                <button 
                  onClick={handleSaveCustomTime}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#071830',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Set
                </button>
                <button 
                  onClick={() => setIsEditingCustomTime(false)}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setCustomTimeInput(formatCountdown(timeRemaining));
                  setIsEditingCustomTime(true);
                }}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                Set Clock
              </button>
            )}

            {/* Reset Clock */}
            <button
              onClick={() => {
                handleResetTime();
                setIsRightClickModalOpen(false);
              }}
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease-in-out'
              }}
            >
              Reset Clock
            </button>

            {/* Next Level (-) */}
            <button
              onClick={() => {
                handleNextLevel();
                setIsRightClickModalOpen(false);
              }}
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease-in-out'
              }}
            >
              Next Level (-)
            </button>

            {/* Previous Level (+) */}
            <button
              onClick={() => {
                handlePrevLevel();
                setIsRightClickModalOpen(false);
              }}
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease-in-out'
              }}
            >
              Previous Level (+)
            </button>

            {/* Close Button */}
            <button
              onClick={() => setIsRightClickModalOpen(false)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.7)',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: '8px'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD-ON DIRECT TD COUNT */}
      {isAddonOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--color-gold)' }}>Record Tournament Add-ons</h3>
              <button onClick={() => setIsAddonOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Enter the total count of add-ons purchased in this tournament. This updates the total prize pool and chips in play.
            </p>

            <form onSubmit={handleSaveAddonsCount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Total Add-ons Count</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={addonsCountInput}
                  onChange={(e) => setAddonsCountInput(Number(e.target.value))}
                  className="form-input"
                  style={{ padding: '8px 12px' }}
                />
              </div>

              <button 
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px', fontWeight: 700 }}
              >
                Save Add-ons
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CHOP CALCULATOR */}
      {isChopOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '650px', backgroundColor: 'var(--bg-surface)', overflowY: 'auto', maxHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-gold)' }}>Chop Split Calculator</h3>
              <button onClick={() => setIsChopOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Enter current chip stacks for the remaining {activePlayers.length} active players. The calculator will estimate both a **Chip Chop** (proportional split) and **ICM Chop** (independent chip model split) of the net prize pool.
            </p>

            {/* Input stack list */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '12px', marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Player Name</div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'right' }}>Chip Stack</div>
              
              {activePlayers.map(p => {
                const mem = members.find(m => m.id === p.memberId);
                const name = mem ? `${mem.firstName} ${mem.lastName}` : 'Unknown';
                return (
                  <React.Fragment key={p.memberId}>
                    <div style={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>{name}</div>
                    <input
                      type="number"
                      value={chopStacks[p.memberId] || ''}
                      onChange={(e) => setChopStacks(prev => ({ ...prev, [p.memberId]: Number(e.target.value) }))}
                      className="form-input"
                      style={{ padding: '6px 12px', textAlign: 'right' }}
                    />
                  </React.Fragment>
                );
              })}
            </div>

            <button 
              onClick={handleCalculateChop}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px', fontWeight: 700, marginBottom: '24px' }}
            >
              Calculate Splits
            </button>

            {icmWarning && (
              <div style={{ color: '#fca5a5', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '6px', padding: '10px 12px', fontSize: '0.85rem', marginBottom: '16px', fontWeight: 600 }}>
                ⚠️ {icmWarning}
              </div>
            )}

            {/* Calculations results */}
            {chopResults.length > 0 && (
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px', color: '#ffffff' }}>Calculator Results</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.2fr 1.2fr', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  <div>Player</div>
                  <div style={{ textAlign: 'right' }}>Chips %</div>
                  <div style={{ textAlign: 'right', color: 'var(--color-gold)' }}>Chip Chop Split</div>
                  <div style={{ textAlign: 'right', color: 'var(--color-info)' }}>ICM Chop Split</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  {chopResults.map(res => {
                    const totalChopChips = chopResults.reduce((a, b) => a + b.stack, 0);
                    const pct = totalChopChips > 0 ? (res.stack / totalChopChips) * 100 : 0;
                    return (
                      <div key={res.memberId} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.2fr 1.2fr', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px', fontSize: '0.9rem' }}>
                        <div style={{ fontWeight: 600 }}>{res.name}</div>
                        <div style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{pct.toFixed(1)}%</div>
                        <div style={{ textAlign: 'right', color: 'var(--color-emerald)', fontWeight: 700 }}>
                          ${res.chipChop.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ textAlign: 'right', color: 'var(--color-info)', fontWeight: 700 }}>
                          {res.icmChop > 0 
                            ? `$${res.icmChop.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                            : 'N/A'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: FINAL TABLE ANNOUNCEMENT */}
      {isFinalTableOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001, padding: '24px' }}>
          <div className="glass-card animate-slide-up" style={{ width: '95%', maxWidth: '1150px', backgroundColor: 'rgba(8,10,15,0.98)', border: '3px solid var(--color-gold)', borderRadius: '24px', padding: '40px', textAlign: 'center', boxShadow: '0 30px 60px rgba(0,0,0,0.8)' }}>
            <h2 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 950, color: 'var(--color-gold)', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.15em', textShadow: '0 0 30px rgba(251,191,36,0.4)' }}>
              FINAL TABLE
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(1rem, 2vw, 1.3rem)', marginBottom: '32px', fontWeight: 600 }}>
              The field is down to {finalTablePlayers.length} players! Clock has been stopped.
            </p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '20px 32px', 
              backgroundColor: 'rgba(0,0,0,0.5)', 
              borderRadius: '16px', 
              padding: '28px', 
              marginBottom: '32px', 
              border: '1px solid rgba(255,255,255,0.06)' 
            }}>
              {finalTablePlayers.map((p, idx) => {
                const mem = members.find(m => m.id === p.memberId);
                const firstName = mem ? mem.firstName : 'Unknown';
                const lastName = mem ? mem.lastName : '';
                return (
                  <div key={p.memberId} style={{ 
                    display: 'flex', 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '12px 24px', 
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    borderRadius: '10px'
                  }}>
                    <span style={{ fontWeight: 800, color: 'var(--color-gold)', opacity: 0.9, fontSize: 'clamp(1.1rem, 2.2vw, 1.6rem)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Seat {idx + 1}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <span style={{ fontWeight: 900, color: '#ffffff', fontSize: 'clamp(1.5rem, 3.2vw, 2.5rem)', letterSpacing: '0.02em', textShadow: '0 2px 8px rgba(0,0,0,0.5)', lineHeight: 1.1 }}>
                        {firstName}
                      </span>
                      {lastName && (
                        <span style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: 'clamp(0.9rem, 1.8vw, 1.3rem)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px', lineHeight: 1 }}>
                          {lastName}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <button 
              onClick={() => setIsFinalTableOpen(false)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '16px', fontWeight: 800, fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderRadius: '12px' }}
            >
              Continue to Final Table
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: FULLSCREEN BUST-OUT ANNOUNCEMENT OVERLAY */}
      {bustOutOverlay && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(1, 1, 1, 0.96)', 
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.08) 0%, transparent 80%)',
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          zIndex: 10000, 
          padding: '40px',
          textAlign: 'center',
          boxShadow: 'inset 0 0 100px rgba(239, 68, 68, 0.3)',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          {/* Inline keyframes animation injected */}
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleUp {
              from { transform: scale(0.9); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
          
          <div style={{
            animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            {/* Elimination Icon/Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '2px solid #ef4444',
              borderRadius: '50px',
              padding: '8px 24px',
              color: '#ef4444',
              fontWeight: 800,
              fontSize: '1.25rem',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
            }}>
              Busted Out
            </div>

            {/* Pulsing display name */}
            <h1 style={{ 
              fontSize: '6.5rem', 
              fontWeight: 950, 
              color: '#ffffff', 
              margin: '20px 0 10px 0', 
              fontFamily: '"Outfit", sans-serif',
              letterSpacing: '-0.02em',
              textShadow: '0 0 40px rgba(255,255,255,0.15)',
              lineHeight: 1.1
            }}>
              {bustOutOverlay.playerName}
            </h1>

            {/* Finish Rank details */}
            <p style={{ 
              color: 'var(--color-gold)', 
              fontSize: '3rem', 
              margin: 0, 
              fontWeight: 900, 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em',
              fontFamily: '"Outfit", sans-serif',
              textShadow: '0 0 20px rgba(212,175,55,0.2)'
            }}>
              {(() => {
                const pos = bustOutOverlay.position;
                if (pos === 1) return '🏆 1st Place (Winner!)';
                if (pos === 2) return '🥈 2nd Place';
                if (pos === 3) return '🥉 3rd Place';
                
                // Add ordinal suffix helper
                const j = pos % 10, k = pos % 100;
                let suffix = 'th';
                if (j === 1 && k !== 11) suffix = 'st';
                else if (j === 2 && k !== 12) suffix = 'nd';
                else if (j === 3 && k !== 13) suffix = 'rd';
                return `${pos}${suffix} Place`;
              })()}
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
