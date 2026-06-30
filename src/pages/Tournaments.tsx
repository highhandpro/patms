import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { Member } from '../types';
import { 
  Trophy, Play, Pause, RotateCcw, SkipForward, SkipBack, Plus, Trash2, 
  UserMinus, ChevronLeft, Volume2, Unlock, Calendar, ShieldAlert, Award
} from 'lucide-react';

interface TournamentsProps {
  selectedTournamentId: string | null;
  setSelectedTournamentId: (id: string | null) => void;
  isCreateTourOpen: boolean;
  setIsCreateTourOpen: (open: boolean) => void;
}

// Blind structures
interface BlindLevel {
  level: number;
  smallBlind: number;
  bigBlind: number;
  durationSeconds: number;
  isBreak: boolean;
}

const defaultBlindStructure: BlindLevel[] = [
  { level: 1, smallBlind: 25, bigBlind: 50, durationSeconds: 900, isBreak: false }, // 15 mins
  { level: 2, smallBlind: 50, bigBlind: 100, durationSeconds: 900, isBreak: false },
  { level: 3, smallBlind: 100, bigBlind: 200, durationSeconds: 900, isBreak: false },
  { level: 4, smallBlind: 150, bigBlind: 300, durationSeconds: 900, isBreak: false },
  { level: 0, smallBlind: 0, bigBlind: 0, durationSeconds: 300, isBreak: true }, // 5 min Break
  { level: 5, smallBlind: 200, bigBlind: 400, durationSeconds: 900, isBreak: false },
  { level: 6, smallBlind: 300, bigBlind: 600, durationSeconds: 900, isBreak: false },
  { level: 7, smallBlind: 400, bigBlind: 800, durationSeconds: 900, isBreak: false },
  { level: 8, smallBlind: 500, bigBlind: 1000, durationSeconds: 900, isBreak: false }
];

export const Tournaments: React.FC<TournamentsProps> = ({
  selectedTournamentId,
  setSelectedTournamentId,
  isCreateTourOpen,
  setIsCreateTourOpen
}) => {
  const { 
    state, 
    activeSeason,
    createTournament, 
    updateTournament, 
    deleteTournament,
    registerPlayer,
    unregisterPlayer,
    toggleEntryAddon,
    toggleEntryDealerApp,
    eliminatePlayer,
    undoElimination,
    finalizeTournament,
    reopenTournament
  } = useApp();

  // Create Form State
  const [tourName, setTourName] = useState('');
  const [tourDate, setTourDate] = useState(new Date().toISOString().split('T')[0]);
  const [buyIn, setBuyIn] = useState(state.settings.defaultBuyIn);
  const [addon, setAddon] = useState(state.settings.defaultAddon);
  const [bounty, setBounty] = useState(state.settings.defaultBounty);
  const [dealerApp, setDealerApp] = useState(state.settings.defaultDealerAppreciation);

  // Active Sub-tab inside Selected Tournament
  // draft: 'checkin' | 'seating'
  // active: 'clock' | 'seating' | 'players'
  // completed: 'results'
  const [subTab, setSubTab] = useState<'checkin' | 'seating' | 'clock' | 'players' | 'results'>('checkin');

  // Player search in checkin
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Seating State (stored in localStorage keyed by tournament ID)
  const [seating, setSeating] = useState<Record<string, string[]>>({});

  // Clock States
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(defaultBlindStructure[0].durationSeconds);
  const [isClockRunning, setIsClockRunning] = useState(false);
  const timerRef = useRef<any>(null);

  // Elimination selector modal state
  const [eliminatingPlayerId, setEliminatingPlayerId] = useState<string | null>(null);
  const [eliminatorId, setEliminatorId] = useState<string>('none'); // memberId of collector

  // Load tournament specific states when ID changes
  const activeTournament = state.tournaments.find(t => t.id === selectedTournamentId) || null;

  useEffect(() => {
    if (activeTournament) {
      // Default sub-tab based on status
      if (activeTournament.status === 'draft') setSubTab('checkin');
      else if (activeTournament.status === 'active') setSubTab('clock');
      else if (activeTournament.status === 'completed') setSubTab('results');

      // Load seating
      const savedSeating = localStorage.getItem(`patms_seating_${activeTournament.id}`);
      if (savedSeating) {
        setSeating(JSON.parse(savedSeating));
      } else {
        setSeating({});
      }

      // Load clock status (if active and saved)
      const savedClock = localStorage.getItem(`patms_clock_${activeTournament.id}`);
      if (savedClock) {
        const { idx, seconds } = JSON.parse(savedClock);
        setCurrentLevelIdx(idx);
        setTimeLeft(seconds);
      } else {
        setCurrentLevelIdx(0);
        setTimeLeft(defaultBlindStructure[0].durationSeconds);
      }
      setIsClockRunning(false);
    }
  }, [selectedTournamentId, activeTournament?.status]);

  // Save clock tick
  useEffect(() => {
    if (activeTournament && activeTournament.status === 'active') {
      localStorage.setItem(
        `patms_clock_${activeTournament.id}`,
        JSON.stringify({ idx: currentLevelIdx, seconds: timeLeft })
      );
    }
  }, [currentLevelIdx, timeLeft, activeTournament]);

  // Audio Beep generator
  const triggerAlarm = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Ring multiple times
      for (let i = 0; i < 3; i++) {
        const timeOffset = i * 0.4;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime + timeOffset); // A5 note
        gain.gain.setValueAtTime(0, ctx.currentTime + timeOffset);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + timeOffset + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + timeOffset + 0.3);
        
        osc.start(ctx.currentTime + timeOffset);
        osc.stop(ctx.currentTime + timeOffset + 0.35);
      }
    } catch (e) {
      console.error('AudioContext alarm error', e);
    }
  };

  // Clock Logic
  useEffect(() => {
    if (isClockRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            triggerAlarm();
            // Advance to next level
            setCurrentLevelIdx(curr => {
              const next = curr + 1;
              if (next < defaultBlindStructure.length) {
                setTimeLeft(defaultBlindStructure[next].durationSeconds);
                return next;
              } else {
                setIsClockRunning(false);
                return curr; // stay at last
              }
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isClockRunning]);

  const toggleClock = () => {
    setIsClockRunning(!isClockRunning);
  };

  const resetClock = () => {
    setIsClockRunning(false);
    setTimeLeft(defaultBlindStructure[currentLevelIdx].durationSeconds);
  };

  const skipLevel = () => {
    if (currentLevelIdx < defaultBlindStructure.length - 1) {
      const nextIdx = currentLevelIdx + 1;
      setCurrentLevelIdx(nextIdx);
      setTimeLeft(defaultBlindStructure[nextIdx].durationSeconds);
    }
  };

  const prevLevel = () => {
    if (currentLevelIdx > 0) {
      const prevIdx = currentLevelIdx - 1;
      setCurrentLevelIdx(prevIdx);
      setTimeLeft(defaultBlindStructure[prevIdx].durationSeconds);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Seating Algorithm
  const generateSeating = () => {
    if (!activeTournament) return;
    const players = activeTournament.entries.map(e => e.memberId);
    if (players.length === 0) return;

    // Shuffle players
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const maxPerTable = state.settings.maxPlayersPerTable;
    
    // Balance players
    const numTables = Math.ceil(shuffled.length / maxPerTable);
    const newSeating: Record<string, string[]> = {};
    
    for (let i = 0; i < numTables; i++) {
      newSeating[`Table ${i + 1}`] = [];
    }

    shuffled.forEach((playerId, index) => {
      const tableNum = (index % numTables) + 1;
      newSeating[`Table ${tableNum}`].push(playerId);
    });

    setSeating(newSeating);
    localStorage.setItem(`patms_seating_${activeTournament.id}`, JSON.stringify(newSeating));
  };

  // Manual player movement
  const movePlayerTable = (playerId: string, sourceTable: string, targetTable: string) => {
    const updated = { ...seating };
    
    // Remove from source
    updated[sourceTable] = updated[sourceTable].filter(id => id !== playerId);
    
    // Add to target
    if (!updated[targetTable]) {
      updated[targetTable] = [];
    }
    updated[targetTable].push(playerId);

    // Clean up empty tables
    if (updated[sourceTable].length === 0) {
      delete updated[sourceTable];
    }

    setSeating(updated);
    localStorage.setItem(`patms_seating_${activeTournament!.id}`, JSON.stringify(updated));
  };

  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tourName.trim()) return;

    const newId = createTournament(tourName, tourDate, buyIn, addon, bounty, dealerApp);
    setIsCreateTourOpen(false);
    setSelectedTournamentId(newId);
    
    // Reset inputs
    setTourName('');
    setBuyIn(state.settings.defaultBuyIn);
    setAddon(state.settings.defaultAddon);
    setBounty(state.settings.defaultBounty);
    setDealerApp(state.settings.defaultDealerAppreciation);
  };

  const handleDeleteTour = (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete tournament "${name}"? This cannot be undone.`)) {
      deleteTournament(id);
      setSelectedTournamentId(null);
    }
  };

  const handleStartTournament = () => {
    if (!activeTournament) return;
    if (activeTournament.entries.length < 2) {
      alert('You need at least 2 registered players to start a tournament.');
      return;
    }
    
    // Generate seating automatically if not already set
    if (Object.keys(seating).length === 0) {
      generateSeating();
    }

    updateTournament(activeTournament.id, { status: 'active' });
    setSubTab('clock');
  };

  const handleFinalize = () => {
    if (!activeTournament) return;
    
    const remaining = activeTournament.entries.filter(e => !e.eliminatedAt);
    if (remaining.length > 1) {
      alert(`There are still ${remaining.length} players active. Finalize all eliminations down to 1 player first.`);
      return;
    }

    if (confirm('Finalize tournament results? This will locks payouts, register standings points, and save results to club history.')) {
      finalizeTournament(activeTournament.id);
      setSubTab('results');
    }
  };

  const handleReopen = () => {
    if (!activeTournament) return;
    if (confirm('Reopen this tournament? Season standings points and payouts will be cleared until re-finalized.')) {
      reopenTournament(activeTournament.id);
      setSubTab('clock');
    }
  };

  // Search autocomplete in checkin
  const availableMembers = state.members.filter(m => 
    !m.isDeleted && 
    !activeTournament?.entries.some(e => e.memberId === m.id)
  );

  const matchedMembers = searchQuery.trim() === '' 
    ? [] 
    : availableMembers.filter(m => {
        const q = searchQuery.toLowerCase();
        return (
          m.firstName.toLowerCase().includes(q) ||
          m.lastName.toLowerCase().includes(q) ||
          m.phone.includes(q) ||
          m.id.toLowerCase().includes(q)
        );
      });

  const handlePlayerSelect = (m: Member) => {
    if (activeTournament) {
      registerPlayer(activeTournament.id, m.id);
      setSearchQuery('');
      setShowDropdown(false);
    }
  };

  // Elimination submit
  const submitElimination = () => {
    if (activeTournament && eliminatingPlayerId) {
      const killerId = eliminatorId === 'none' ? undefined : eliminatorId;
      eliminatePlayer(activeTournament.id, eliminatingPlayerId, killerId);
      setEliminatingPlayerId(null);
      setEliminatorId('none');
    }
  };

  // Help getters
  const getMemberName = (id: string) => {
    const m = state.members.find(member => member.id === id);
    return m ? `${m.firstName} ${m.lastName}` : 'Unknown Player';
  };

  const getActivePlayersList = () => {
    if (!activeTournament) return [];
    return activeTournament.entries
      .filter(e => !e.eliminatedAt)
      .map(e => state.members.find(m => m.id === e.memberId))
      .filter(Boolean) as Member[];
  };

  // Render Section 1: Tournament Selector List
  if (!activeTournament) {
    return (
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
              Tournaments Manager
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
              Create, search, or administer Penny Ante club tournaments.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setIsCreateTourOpen(true)}>
            <Plus size={18} />
            <span>New Tournament</span>
          </button>
        </div>

        {/* List of Tournaments */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Tournaments Registry</h3>
          
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tournament Name</th>
                  <th>Date</th>
                  <th>Season</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Players</th>
                  <th style={{ textAlign: 'right' }}>Prize Pool</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.tournaments.length > 0 ? (
                  [...state.tournaments]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((t) => {
                      const seasonName = state.seasons.find(s => s.id === t.seasonId)?.name || 'Unassigned';
                      
                      // Calculate dynamic values for drafts
                      const prizePool = t.status === 'completed' 
                        ? t.totalPrizePool 
                        : (t.entries.filter(e => e.hasBuyIn).length * t.buyInAmount) + 
                          (t.entries.filter(e => e.hasAddon).length * t.addonAmount);

                      return (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 600 }}>{t.name}</td>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                              {t.date}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{seasonName}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${
                              t.status === 'completed' ? 'badge-secondary' :
                              t.status === 'active' ? 'badge-emerald' : 'badge-warning'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{t.entries.length}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-emerald)' }}>
                            ${prizePool}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button
                                onClick={() => setSelectedTournamentId(t.id)}
                                className="btn btn-primary"
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              >
                                Manage
                              </button>
                              <button
                                onClick={() => handleDeleteTour(t.id, t.name)}
                                className="btn btn-ghost"
                                style={{ padding: '6px', color: 'var(--color-danger)' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      No tournament records created yet. Create one using the button above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Creation Overlay Modal */}
        {isCreateTourOpen && (
          <div style={{
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
            zIndex: 1000,
            padding: '20px'
          }}>
            <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--bg-surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Initialize Tournament</h3>
                <button 
                  onClick={() => setIsCreateTourOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {!activeSeason ? (
                <div style={{ padding: '20px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                  <ShieldAlert size={40} style={{ color: 'var(--color-danger)' }} />
                  <p style={{ color: 'var(--text-secondary)' }}>
                    No active season exists. You must create and activate a Season in the <strong>Standings</strong> page first before starting a tournament.
                  </p>
                  <button onClick={() => setIsCreateTourOpen(false)} className="btn btn-secondary">Ok</button>
                </div>
              ) : (
                <form onSubmit={handleCreateTournament} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Tournament Name / Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Weekly Standings #15"
                      value={tourName}
                      onChange={(e) => setTourName(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Tournament Date</label>
                    <input
                      type="date"
                      required
                      value={tourDate}
                      onChange={(e) => setTourDate(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Buy-in ($)</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={buyIn}
                        onChange={(e) => setBuyIn(Number(e.target.value))}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Add-on ($)</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={addon}
                        onChange={(e) => setAddon(Number(e.target.value))}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Bounty ($)</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={bounty}
                        onChange={(e) => setBounty(Number(e.target.value))}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>ToC & High Hand Fee ($)</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={dealerApp}
                        onChange={(e) => setDealerApp(Number(e.target.value))}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setIsCreateTourOpen(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                    >
                      Initialize Draft
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    );
  }

  // Render Section 2: Manage View for a Selected Tournament
  // Calculate dynamic financials
  const buyInCount = activeTournament.entries.filter(e => e.hasBuyIn).length;
  const addonCount = activeTournament.entries.filter(e => e.hasAddon).length;
  const bountyCount = activeTournament.entries.filter(e => e.hasBuyIn).length;
  const dealerCount = activeTournament.entries.filter(e => e.hasDealerAppreciation).length;

  const currentPrizePool = activeTournament.status === 'completed' 
    ? activeTournament.totalPrizePool 
    : (buyInCount * activeTournament.buyInAmount) + (addonCount * activeTournament.addonAmount);

  const currentBountyPool = activeTournament.status === 'completed'
    ? activeTournament.totalBountyPool
    : bountyCount * activeTournament.bountyAmount;

  const currentDealerPool = activeTournament.status === 'completed'
    ? activeTournament.totalDealerAppreciation
    : dealerCount * activeTournament.dealerAppreciationAmount;

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Back & Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          onClick={() => setSelectedTournamentId(null)}
          className="btn btn-secondary"
          style={{ padding: '8px 14px', fontSize: '0.85rem' }}
        >
          <ChevronLeft size={16} />
          <span>Back to Registry</span>
        </button>

        <div style={{ display: 'inline-flex', gap: '10px' }}>
          {activeTournament.status === 'draft' && (
            <button className="btn btn-primary" onClick={handleStartTournament}>
              <Play size={16} fill="currentColor" />
              <span>Lock Entries & Start Game</span>
            </button>
          )}
          {activeTournament.status === 'active' && (
            <button className="btn btn-primary" onClick={handleFinalize} style={{ backgroundColor: 'var(--color-gold)', color: '#78350f' }}>
              <Award size={16} />
              <span>Finalize Standings</span>
            </button>
          )}
          {activeTournament.status === 'completed' && (
            <button className="btn btn-secondary" onClick={handleReopen}>
              <Unlock size={16} />
              <span>Reopen Tournament</span>
            </button>
          )}
        </div>
      </div>

      {/* Tournament Meta Card */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{activeTournament.name}</h2>
            <span className={`badge ${
              activeTournament.status === 'completed' ? 'badge-secondary' :
              activeTournament.status === 'active' ? 'badge-emerald' : 'badge-warning'
            }`}>
              {activeTournament.status}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Date: <strong>{activeTournament.date}</strong> | Total checked in: <strong>{activeTournament.entries.length} players</strong>
          </p>
        </div>

        {/* Finance Box */}
        <div style={{ display: 'flex', gap: '24px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Prize Pool</span>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--color-emerald)', fontWeight: 700 }}>${currentPrizePool}</h3>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Bounties</span>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--color-gold)', fontWeight: 700 }}>${currentBountyPool}</h3>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>ToC & High Hand Pool</span>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--text-secondary)', fontWeight: 700 }}>${currentDealerPool}</h3>
          </div>
        </div>
      </div>

      {/* Navigation tabs inside tournament */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', gap: '12px' }}>
        {activeTournament.status === 'draft' && (
          <>
            <button 
              className={`btn btn-ghost ${subTab === 'checkin' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('checkin')}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: subTab === 'checkin' ? '3px solid var(--color-emerald)' : 'none',
                color: subTab === 'checkin' ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: subTab === 'checkin' ? 600 : 400
              }}
            >
              Check-in Registration
            </button>
            <button 
              className={`btn btn-ghost ${subTab === 'seating' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('seating')}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: subTab === 'seating' ? '3px solid var(--color-emerald)' : 'none',
                color: subTab === 'seating' ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: subTab === 'seating' ? 600 : 400
              }}
            >
              Seating Preview
            </button>
          </>
        )}

        {activeTournament.status === 'active' && (
          <>
            <button 
              className={`btn btn-ghost ${subTab === 'clock' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('clock')}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: subTab === 'clock' ? '3px solid var(--color-emerald)' : 'none',
                color: subTab === 'clock' ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: subTab === 'clock' ? 600 : 400
              }}
            >
              Live Clock / Timer
            </button>
            <button 
              className={`btn btn-ghost ${subTab === 'players' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('players')}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: subTab === 'players' ? '3px solid var(--color-emerald)' : 'none',
                color: subTab === 'players' ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: subTab === 'players' ? 600 : 400
              }}
            >
              Eliminations Tracker ({activeTournament.entries.filter(e => !e.eliminatedAt).length} alive)
            </button>
            <button 
              className={`btn btn-ghost ${subTab === 'seating' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('seating')}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: subTab === 'seating' ? '3px solid var(--color-emerald)' : 'none',
                color: subTab === 'seating' ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: subTab === 'seating' ? 600 : 400
              }}
            >
              Seating Tables
            </button>
            <button 
              className={`btn btn-ghost ${subTab === 'checkin' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('checkin')}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: subTab === 'checkin' ? '3px solid var(--color-emerald)' : 'none',
                color: subTab === 'checkin' ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: subTab === 'checkin' ? 600 : 400
              }}
            >
              Edit Check-ins
            </button>
          </>
        )}

        {activeTournament.status === 'completed' && (
          <button 
            className={`btn btn-ghost active-subtab`}
            onClick={() => setSubTab('results')}
            style={{
              borderRadius: '8px 8px 0 0',
              borderBottom: '3px solid var(--color-emerald)',
              color: 'var(--color-emerald)',
              fontWeight: 600
            }}
          >
            Standings & Results
          </button>
        )}
      </div>

      {/* Sub-tab contents */}

      {/* Check-in Tab */}
      {subTab === 'checkin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-slide-up">
          {activeTournament.status === 'draft' && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Fast Player Lookup</h4>
              
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  placeholder="Type name, phone number, or Member ID..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  className="form-input"
                />

                {showDropdown && searchQuery.trim() !== '' && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '0 0 10px 10px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 200,
                    boxShadow: 'var(--shadow-lg)'
                  }}>
                    {matchedMembers.length > 0 ? (
                      matchedMembers.map(m => (
                        <div
                          key={m.id}
                          onClick={() => handlePlayerSelect(m)}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid var(--border-subtle)'
                          }}
                          className="interactive"
                        >
                          <span style={{ fontWeight: 600 }}>{m.firstName} {m.lastName}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{m.id} • {m.phone || 'No phone'}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '12px 16px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        No unregistered members match.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Checked-in list */}
          <div className="glass-card">
            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Checked-in Registrations</h4>
            {activeTournament.entries.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Player Name</th>
                      <th>ID</th>
                      <th style={{ textAlign: 'center' }}>Buy-in (${activeTournament.buyInAmount})</th>
                      <th style={{ textAlign: 'center' }}>Add-on (${activeTournament.addonAmount})</th>
                      <th style={{ textAlign: 'center' }}>ToC & High Hand (${activeTournament.dealerAppreciationAmount})</th>
                      {activeTournament.status === 'draft' && <th style={{ textAlign: 'right' }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {activeTournament.entries.map((entry) => {
                      const m = state.members.find(member => member.id === entry.memberId);
                      if (!m) return null;

                      return (
                        <tr key={entry.memberId}>
                          <td style={{ fontWeight: 600 }}>{m.firstName} {m.lastName}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{m.id}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ color: 'var(--color-emerald)' }}>✓ Paid</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={entry.hasAddon}
                              onChange={() => toggleEntryAddon(activeTournament.id, entry.memberId)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-emerald)' }}
                              disabled={activeTournament.status !== 'draft' && activeTournament.status !== 'active'}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={entry.hasDealerAppreciation}
                              onChange={() => toggleEntryDealerApp(activeTournament.id, entry.memberId)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-emerald)' }}
                              disabled={activeTournament.status !== 'draft' && activeTournament.status !== 'active'}
                            />
                          </td>
                          {activeTournament.status === 'draft' && (
                            <td style={{ textAlign: 'right' }}>
                              <button
                                onClick={() => unregisterPlayer(activeTournament.id, entry.memberId)}
                                className="btn btn-ghost"
                                style={{ padding: '4px', color: 'var(--color-danger)' }}
                              >
                                <UserMinus size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                No players registered yet. Search for names to register check-ins.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seating Tab (Draft & Active) */}
      {subTab === 'seating' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-slide-up">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Seating Assignments</h3>
            <button className="btn btn-secondary" onClick={generateSeating}>
              <RotateCcw size={16} />
              <span>Reshuffle & Balance Seating</span>
            </button>
          </div>

          {Object.keys(seating).length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {Object.entries(seating).map(([tableName, players]) => (
                <div key={tableName} className="glass-card accent-emerald" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{tableName}</h4>
                    <span className="badge badge-emerald">{players.length} Players</span>
                  </div>

                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {players.map((playerId, idx) => {
                      const entry = activeTournament.entries.find(e => e.memberId === playerId);
                      const isEliminated = entry ? !!entry.eliminatedAt : false;
                      
                      return (
                        <li 
                          key={playerId} 
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            fontSize: '0.9rem',
                            opacity: isEliminated ? 0.4 : 1,
                            textDecoration: isEliminated ? 'line-through' : 'none'
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>
                            <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>Seat {idx + 1}:</span>
                            {getMemberName(playerId)}
                          </span>

                          {/* Seating manual movement */}
                          {!isEliminated && Object.keys(seating).length > 1 && (
                            <select
                              value={tableName}
                              onChange={(e) => movePlayerTable(playerId, tableName, e.target.value)}
                              style={{
                                backgroundColor: 'rgba(0,0,0,0.3)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                padding: '2px 4px',
                                cursor: 'pointer'
                              }}
                            >
                              {Object.keys(seating).map(tName => (
                                <option key={tName} value={tName}>{tName}</option>
                              ))}
                            </select>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
              No seating generated yet. Click the button above to shuffle and balance players into tables.
            </div>
          )}
        </div>
      )}

      {/* Clock Tab (Active Game) */}
      {subTab === 'clock' && (
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '32px' }} className="animate-slide-up">
          
          {/* Main big timer display */}
          <div className="glass-card" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '48px 24px',
            background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, rgba(0,0,0,0) 100%)',
            position: 'relative'
          }}>
            
            {/* Blinds banner info */}
            <span style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {defaultBlindStructure[currentLevelIdx].isBreak ? '☕ BREAK TIME' : `LEVEL ${defaultBlindStructure[currentLevelIdx].level}`}
            </span>

            {/* Huge Clock */}
            <h1 style={{ 
              fontSize: '6.5rem', 
              fontWeight: 800, 
              margin: '12px 0', 
              fontFamily: 'var(--font-mono)', 
              color: defaultBlindStructure[currentLevelIdx].isBreak ? 'var(--color-gold)' : 'var(--text-primary)',
              textShadow: defaultBlindStructure[currentLevelIdx].isBreak 
                ? '0 0 30px rgba(251,191,36,0.3)' 
                : isClockRunning ? '0 0 30px rgba(16,185,129,0.2)' : 'none'
            }}>
              {formatTime(timeLeft)}
            </h1>

            {/* Small Blinds Amount display */}
            {!defaultBlindStructure[currentLevelIdx].isBreak ? (
              <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-emerald)', marginBottom: '32px' }}>
                Blinds: {defaultBlindStructure[currentLevelIdx].smallBlind} / {defaultBlindStructure[currentLevelIdx].bigBlind}
              </h2>
            ) : (
              <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-gold)', marginBottom: '32px' }}>
                Take a break!
              </h2>
            )}

            {/* Timer controls */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <button onClick={prevLevel} className="btn btn-secondary" style={{ borderRadius: '50%', width: '50px', height: '50px', padding: 0 }}>
                <SkipBack size={20} />
              </button>

              <button 
                onClick={toggleClock} 
                className="btn" 
                style={{ 
                  borderRadius: '50%', 
                  width: '72px', 
                  height: '72px', 
                  padding: 0,
                  backgroundColor: isClockRunning ? 'var(--color-danger)' : 'var(--color-emerald)',
                  color: '#000'
                }}
              >
                {isClockRunning ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" style={{ marginLeft: '4px' }} />}
              </button>

              <button onClick={resetClock} className="btn btn-secondary" style={{ borderRadius: '50%', width: '50px', height: '50px', padding: 0 }}>
                <RotateCcw size={20} />
              </button>

              <button onClick={skipLevel} className="btn btn-secondary" style={{ borderRadius: '50%', width: '50px', height: '50px', padding: 0 }}>
                <SkipForward size={20} />
              </button>
            </div>

            {/* Manual beep alarm testing */}
            <button 
              onClick={triggerAlarm}
              className="btn btn-ghost" 
              style={{ position: 'absolute', right: '16px', bottom: '16px', padding: '6px' }}
              title="Test Sound Alarm"
            >
              <Volume2 size={16} />
            </button>
          </div>

          {/* Right sidebar showing level progress */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Blind Schedule</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '320px', paddingRight: '4px' }}>
              {defaultBlindStructure.map((level, idx) => {
                const isCurrent = idx === currentLevelIdx;
                return (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: isCurrent ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.01)',
                      border: isCurrent ? '1px solid var(--color-emerald)' : '1px solid var(--border-subtle)',
                      opacity: idx < currentLevelIdx ? 0.4 : 1
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {level.isBreak ? '☕ Break' : `Lvl ${level.level}`}
                    </span>
                    <span style={{ fontWeight: 700, color: level.isBreak ? 'var(--color-gold)' : 'var(--text-primary)' }}>
                      {level.isBreak ? '5:00' : `${level.smallBlind} / ${level.bigBlind}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Eliminations Tab (Active Game) */}
      {subTab === 'players' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-slide-up">
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            
            {/* Active Players List */}
            <div className="glass-card">
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Active Standings ({getActivePlayersList().length} remaining)</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {getActivePlayersList().map((p) => (
                  <div 
                    key={p.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{p.firstName} {p.lastName}</span>
                    <button 
                      onClick={() => setEliminatingPlayerId(p.id)}
                      className="btn btn-danger"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      Eliminate
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Eliminated Players List */}
            <div className="glass-card" style={{ borderColor: 'rgba(248,113,113,0.1)' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', color: 'var(--color-danger)' }}>Eliminated Players</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeTournament.entries
                  .filter(e => e.eliminatedAt)
                  .sort((a, b) => (a.finishPosition || 0) - (b.finishPosition || 0))
                  .map((entry) => {
                    const name = getMemberName(entry.memberId);
                    const killer = entry.eliminatedBy ? getMemberName(entry.eliminatedBy) : 'None';
                    
                    return (
                      <div 
                        key={entry.memberId}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(248,113,113,0.02)',
                          border: '1px solid rgba(248,113,113,0.1)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600 }}>
                            {entry.finishPosition ? `#${entry.finishPosition} - ` : ''}
                            {name}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Knocked out by: <strong style={{ color: 'var(--text-gold)' }}>{killer}</strong>
                          </span>
                        </div>
                        <button 
                          onClick={() => undoElimination(activeTournament.id, entry.memberId)}
                          className="btn btn-ghost"
                          style={{ padding: '6px', fontSize: '0.8rem' }}
                        >
                          Undo
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>

          </div>

          {/* Elimination details prompt modal */}
          {eliminatingPlayerId && (
            <div style={{
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
              zIndex: 1000,
              padding: '20px'
            }}>
              <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-surface)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px' }}>
                  Eliminate {getMemberName(eliminatingPlayerId)}
                </h3>

                <div className="form-group">
                  <label>Who knocked them out? (Bounty Winner)</label>
                  <select
                    value={eliminatorId}
                    onChange={(e) => setDiscriminator(e.target.value)}
                    className="form-input"
                  >
                    <option value="none">No Bounty Claimed (Dealer/No Player)</option>
                    {getActivePlayersList()
                      .filter(p => p.id !== eliminatingPlayerId)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                      ))
                    }
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button onClick={() => setEliminatingPlayerId(null)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button onClick={submitElimination} className="btn btn-danger">
                    Confirm Elimination
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Results Tab (Completed) */}
      {subTab === 'results' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-slide-up">
          
          <div className="glass-card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={22} style={{ color: 'var(--color-gold)' }} />
              Final Tournament Rankings
            </h3>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '70px' }}>Rank</th>
                    <th>Player Name</th>
                    <th style={{ textAlign: 'center' }}>Buy-in</th>
                    <th style={{ textAlign: 'center' }}>Add-on</th>
                    <th style={{ textAlign: 'center' }}>ToC & High Hand</th>
                    <th style={{ textAlign: 'center' }}>Bounties</th>
                    <th style={{ textAlign: 'right' }}>Cash Payout</th>
                    <th style={{ textAlign: 'right', color: 'var(--color-gold)' }}>Standings Points</th>
                  </tr>
                </thead>
                <tbody>
                  {[...activeTournament.entries]
                    .sort((a, b) => (a.finishPosition || 99) - (b.finishPosition || 99))
                    .map((entry) => {
                      const name = getMemberName(entry.memberId);
                      return (
                        <tr key={entry.memberId}>
                          <td style={{ fontWeight: 700 }}>
                            {entry.finishPosition === 1 ? '👑 1' : entry.finishPosition === 2 ? '🥈 2' : entry.finishPosition === 3 ? '🥉 3' : entry.finishPosition}
                          </td>
                          <td style={{ fontWeight: 600 }}>{name}</td>
                          <td style={{ textAlign: 'center' }}>✓</td>
                          <td style={{ textAlign: 'center' }}>{entry.hasAddon ? '✓' : '-'}</td>
                          <td style={{ textAlign: 'center' }}>{entry.hasDealerAppreciation ? '✓' : '-'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{entry.bountiesCollected}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-emerald)' }}>
                            {entry.payoutEarned > 0 ? `$${entry.payoutEarned}` : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-gold)' }}>
                            {entry.pointsEarned} pts
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );

  // Helper workaround
  function setDiscriminator(val: string) {
    setEliminatorId(val);
  }
};
