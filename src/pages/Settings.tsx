import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Settings as SettingsType, BlindLevel } from '../types';
import { Settings as SettingsIcon, Save, Download, Upload, RefreshCw, CheckCircle, AlertTriangle, X, ArrowUp, ArrowDown, Play, Square } from 'lucide-react';
import { calculateStandings } from '../utils/stats';

import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { checkTableBalance, executePlayerMove, executeTableBreak, calculateFinalTableRedraw } from '../utils/tableBalancing';


const DEFAULT_BLINDS: BlindLevel[] = [
  { type: 'round', roundNumber: 1, duration: 18, smallBlind: 100, bigBlind: 200 },
  { type: 'round', roundNumber: 2, duration: 18, smallBlind: 200, bigBlind: 400 },
  { type: 'round', roundNumber: 3, duration: 18, smallBlind: 300, bigBlind: 600 },
  { type: 'round', roundNumber: 4, duration: 18, smallBlind: 400, bigBlind: 800 },
  { type: 'round', roundNumber: 5, duration: 18, smallBlind: 500, bigBlind: 1000 },
  { type: 'break', duration: 10, chipUp: false }, // Break 1 (10m)
  { type: 'round', roundNumber: 6, duration: 18, smallBlind: 600, bigBlind: 1200 },
  { type: 'round', roundNumber: 7, duration: 18, smallBlind: 700, bigBlind: 1400 },
  { type: 'round', roundNumber: 8, duration: 18, smallBlind: 800, bigBlind: 1600 },
  { type: 'round', roundNumber: 9, duration: 18, smallBlind: 900, bigBlind: 1800 },
  { type: 'break', duration: 10, chipUp: true },  // Break 2 (10m)
  { type: 'round', roundNumber: 10, duration: 18, smallBlind: 1000, bigBlind: 2000 },
  { type: 'round', roundNumber: 11, duration: 18, smallBlind: 1500, bigBlind: 3000 },
  { type: 'round', roundNumber: 12, duration: 18, smallBlind: 2000, bigBlind: 4000 },
  { type: 'round', roundNumber: 13, duration: 18, smallBlind: 2500, bigBlind: 5000 },
  { type: 'round', roundNumber: 14, duration: 18, smallBlind: 3000, bigBlind: 6000 },
  { type: 'break', duration: 10, chipUp: true },  // Break 3 (10m)
  { type: 'round', roundNumber: 15, duration: 18, smallBlind: 4000, bigBlind: 8000 },
  { type: 'round', roundNumber: 16, duration: 18, smallBlind: 5000, bigBlind: 10000 },
  { type: 'round', roundNumber: 17, duration: 18, smallBlind: 10000, bigBlind: 20000 },
  { type: 'round', roundNumber: 18, duration: 18, smallBlind: 15000, bigBlind: 30000 },
  { type: 'round', roundNumber: 19, duration: 18, smallBlind: 20000, bigBlind: 40000 },
  { type: 'round', roundNumber: 20, duration: 18, smallBlind: 25000, bigBlind: 50000 },
];

interface SettingsProps {
  onChangePassword?: () => void;
  isChiefAdmin?: boolean;
}

export const Settings: React.FC<SettingsProps> = ({ onChangePassword, isChiefAdmin }) => {
  const { state, activeSeason, updateSettings, exportDatabase, importDatabase, resetDatabaseToDefault } = useApp();

  // Simulation states
  const [simRunning, setSimRunning] = useState(false);
  const [simStatus, setSimStatus] = useState('');
  const simStopRef = React.useRef(false);

  const startSimulation = async () => {
    if (simRunning) return;
    simStopRef.current = false;
    setSimRunning(true);
    setSimStatus('Initializing 40 mock players...');

    try {
      // 1. Create 40 mock players in members collection if they don't exist
      for (let i = 1; i <= 40; i++) {
        if (simStopRef.current) break;
        const memberId = `mock-p-${i}`;
        await setDoc(doc(db, 'members', memberId), {
          id: memberId,
          firstName: 'Mock',
          lastName: `Player ${i}`,
          email: `mock${i}@example.com`,
          phone: `555-01${i.toString().padStart(2, '0')}`,
          points: 0,
          role: 'player',
          isMock: true,
          isDeleted: false,
          joinedDate: new Date().toISOString()
        });
      }

      if (simStopRef.current) {
        setSimRunning(false);
        setSimStatus('Simulation stopped.');
        return;
      }

      setSimStatus('Creating Simulation Tournament...');
      const tournamentId = `tour-sim-${Date.now()}`;

      // Load saved rules config values (or fall back to standard defaults if undefined)
      const buyInVal = state.settings.defaultBuyIn || 40;
      const addonVal = state.settings.defaultAddon || 10;
      const bountyVal = state.settings.defaultBounty || 5;
      const dealerAppVal = state.settings.defaultDealerAppreciation || 0;
      const currentBlinds = state.settings.blinds && state.settings.blinds.length > 0
        ? state.settings.blinds
        : blindsList;
      const firstLevelDuration = currentBlinds[0]?.duration || 15;

      // Create entries using custom settings rules
      const entries = [];
      for (let i = 1; i <= 40; i++) {
        entries.push({
          memberId: `mock-p-${i}`,
          hasBuyIn: true,
          hasAddon: false,
          hasDealerAppreciation: dealerAppVal > 0,
          payoutEarned: 0,
          bountiesCollected: 0,
          pointsEarned: 0,
          createdAt: new Date().toISOString()
        });
      }

      // Shuffle initial seating
      const playerIds = Array.from({ length: 40 }, (_, i) => `mock-p-${i + 1}`);
      const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

      const initialSeating = {
        'table 1': shuffled.slice(0, 10),
        'table 2': shuffled.slice(10, 20),
        'table 3': shuffled.slice(20, 30),
        'table 4': shuffled.slice(30, 40)
      };

      const tournamentState = {
        id: tournamentId,
        seasonId: activeSeason?.id || 'season-4',
        name: '40-Player Simulation Tour',
        date: new Date().toISOString().split('T')[0],
        status: 'active',
        buyInAmount: buyInVal,
        addonAmount: addonVal,
        bountyAmount: bountyVal,
        dealerAppreciationAmount: dealerAppVal,
        entries,
        seating: initialSeating,
        blinds: currentBlinds,
        clockState: {
          currentLevelIndex: 0,
          timeRemainingSeconds: firstLevelDuration * 60,
          isRunning: true,
          lastUpdated: new Date().toISOString()
        },
        totalPrizePool: 40 * (buyInVal - bountyVal - dealerAppVal),
        maxPlayers: 40,
        roundLength: firstLevelDuration,
        startingChips: 10000,
        isMock: true
      };

      await setDoc(doc(db, 'tournaments', tournamentId), tournamentState);
      setSimStatus('Tournament created! Select "40-Player Simulation Tour" on clock. Sim starts in 10s...');

      // Let's run a background task loop in JS
      let activeIds = [...shuffled];
      let currentSeating: Record<string, string[]> = { ...initialSeating };
      let currentTournamentState: any = { ...tournamentState };

      // Sleep helper
      const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

      for (let s = 10; s > 0; s--) {
        if (simStopRef.current) break;
        setSimStatus(`Tournament created! Select "40-Player Simulation Tour" on clock. Sim starts in ${s}s...`);
        await sleep(1000);
      }

      while (activeIds.length > 1) {
        if (simStopRef.current) break;

        setSimStatus(`Game running: ${activeIds.length} players alive. Simulating next bust out...`);
        await sleep(2500);

        if (simStopRef.current) break;

        // Bust a random player
        const randomIdx = Math.floor(Math.random() * activeIds.length);
        const bustedId = activeIds[randomIdx];
        activeIds.splice(randomIdx, 1);

        const finishPos = activeIds.length + 1;
        setSimStatus(`Busted Mock Player ${bustedId.replace('mock-p-', '')} at #${finishPos}`);

        // Update entries
        const updatedEntries = currentTournamentState.entries.map((e: any) => {
          if (e.memberId === bustedId) {
            return { ...e, eliminatedAt: new Date().toISOString(), finishPosition: finishPos };
          }
          return e;
        });
        currentTournamentState.entries = updatedEntries;

        await updateDoc(doc(db, 'tournaments', tournamentId), { entries: updatedEntries });

        // Check balancing
        const rec = checkTableBalance(currentSeating, currentTournamentState);
        if (rec) {
          setSimStatus(`Alert: ${rec.message}`);
          
          // Pause clock
          currentTournamentState.clockState.isRunning = false;
          currentTournamentState.clockState.lastUpdated = new Date().toISOString();
          await updateDoc(doc(db, 'tournaments', tournamentId), { clockState: currentTournamentState.clockState });

          await sleep(4000); // Sleep so they see the balancing popup

          if (simStopRef.current) break;

          // Apply move/break
          if (rec.type === 'rebalance') {
            const activePlayers = rec.sourceActivePlayers || [];
            const randomIdx = Math.floor(Math.random() * activePlayers.length);
            const movingPlayerId = activePlayers[randomIdx];
            currentSeating = executePlayerMove(currentSeating, movingPlayerId, rec.sourceTable!, rec.targetTable!, currentTournamentState);
            setSimStatus(`Balancing: Moved player ${movingPlayerId.replace('mock-p-', '')}`);
          } else if (rec.type === 'break') {
            if (rec.isFinalTable) {
              const redraw = calculateFinalTableRedraw(currentSeating, currentTournamentState);
              currentSeating = redraw.finalSeating;
              setSimStatus('Consolidating to Final Table! Redrawing all seats.');
            } else {
              currentSeating = executeTableBreak(currentSeating, rec.breakTable!, currentTournamentState);
              setSimStatus(`Table break: Table ${rec.breakTable!.replace('table ', '')} broken`);
            }
          }

          currentTournamentState.seating = currentSeating;
          await updateDoc(doc(db, 'tournaments', tournamentId), { seating: currentSeating });

          await sleep(4000); // Wait for seat verification

          if (simStopRef.current) break;

          // Resume clock
          currentTournamentState.clockState.isRunning = true;
          currentTournamentState.clockState.lastUpdated = new Date().toISOString();
          await updateDoc(doc(db, 'tournaments', tournamentId), { clockState: currentTournamentState.clockState });
        }
      }

      // Declare winner
      if (activeIds.length === 1 && !simStopRef.current) {
        const winnerId = activeIds[0];
        setSimStatus(`Winner: Mock Player ${winnerId.replace('mock-p-', '')}! 🎉`);
        
        const finalEntries = currentTournamentState.entries.map((e: any) => {
          if (e.memberId === winnerId) {
            return { ...e, finishPosition: 1 };
          }
          return e;
        });

        currentTournamentState.clockState.isRunning = false;
        currentTournamentState.clockState.lastUpdated = new Date().toISOString();

        await updateDoc(doc(db, 'tournaments', tournamentId), {
          entries: finalEntries,
          clockState: currentTournamentState.clockState
        });
      }

      setSimRunning(false);
    } catch (err: any) {
      console.error(err);
      setSimStatus(`Error: ${err.message}`);
      setSimRunning(false);
    }
  };

  const stopSimulation = () => {
    simStopRef.current = true;
    setSimRunning(false);
    setSimStatus('Simulation stopped manually.');
  };

  // Settings states
  const [buyIn, setBuyIn] = useState(state.settings.defaultBuyIn);
  const [addon, setAddon] = useState(state.settings.defaultAddon);
  const [bounty, setBounty] = useState(state.settings.defaultBounty);
  const [dealerApp, setDealerApp] = useState(state.settings.defaultDealerAppreciation);
  const [attendancePoints, setAttendancePoints] = useState(state.settings.pointsBaseAttendance);
  const [maxPlayers, setMaxPlayers] = useState(state.settings.maxPlayersPerTable);
  const colorPalette = state.settings.colorPalette || 'default';
  const [underConstruction, setUnderConstruction] = useState(!!state.settings.isUnderConstruction);
  const [requireOnlineForAttendancePoints, setRequireOnlineForAttendancePoints] = useState(
    state.settings.requireOnlineForAttendancePoints !== false
  );
  
  // Blinds preset states & handlers
  const [selectedPresetName, setSelectedPresetName] = useState('');
  const [newPresetName, setNewPresetName] = useState('');

  const handleLoadPreset = (name: string) => {
    setSelectedPresetName(name);
    if (!name) return;
    const preset = state.settings.savedBlinds?.[name];
    if (preset && preset.length > 0) {
      setBlindsList(preset);
    }
  };

  const handleSavePreset = async () => {
    const name = newPresetName.trim();
    if (!name) return;

    const saved = state.settings.savedBlinds || {};
    const updatedSavedBlinds = {
      ...saved,
      [name]: blindsList
    };

    const updatedSettings = {
      ...state.settings,
      savedBlinds: updatedSavedBlinds
    };

    try {
      await updateSettings(updatedSettings);
      setNewPresetName('');
      setSelectedPresetName(name);
    } catch (err: any) {
      alert(`Failed to save preset: ${err.message}`);
    }
  };

  const handleDeletePreset = async () => {
    if (!selectedPresetName) return;
    if (!window.confirm(`Are you sure you want to delete the preset "${selectedPresetName}"?`)) return;

    const saved = { ...(state.settings.savedBlinds || {}) };
    delete saved[selectedPresetName];

    const updatedSettings = {
      ...state.settings,
      savedBlinds: saved
    };

    try {
      await updateSettings(updatedSettings);
      setSelectedPresetName('');
    } catch (err: any) {
      alert(`Failed to delete preset: ${err.message}`);
    }
  };

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [blindsList, setBlindsList] = useState<BlindLevel[]>(() => {
    return state.settings.blinds && state.settings.blinds.length > 0
      ? state.settings.blinds
      : DEFAULT_BLINDS;
  });

  const handleUpdateLevel = (index: number, field: keyof BlindLevel, value: any) => {
    const updated = blindsList.map((level, idx) => {
      if (idx === index) {
        return { ...level, [field]: value };
      }
      return level;
    });

    let roundCounter = 1;
    const finalLevels = updated.map(level => {
      if (level.type === 'round') {
        const nextRound = { ...level, roundNumber: roundCounter };
        roundCounter++;
        return nextRound;
      }
      return level;
    });

    setBlindsList(finalLevels);
  };

  const handleRemoveLevel = (index: number) => {
    const updated = blindsList.filter((_, idx) => idx !== index);
    
    let roundCounter = 1;
    const finalLevels = updated.map(level => {
      if (level.type === 'round') {
        const nextRound = { ...level, roundNumber: roundCounter };
        roundCounter++;
        return nextRound;
      }
      return level;
    });

    setBlindsList(finalLevels);
  };

  const handleMoveLevelUp = (index: number) => {
    if (index === 0) return;
    const updated = [...blindsList];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;

    let roundCounter = 1;
    const finalLevels = updated.map(level => {
      if (level.type === 'round') {
        const nextRound = { ...level, roundNumber: roundCounter };
        roundCounter++;
        return nextRound;
      }
      return level;
    });

    setBlindsList(finalLevels);
  };

  const handleMoveLevelDown = (index: number) => {
    if (index === blindsList.length - 1) return;
    const updated = [...blindsList];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;

    let roundCounter = 1;
    const finalLevels = updated.map(level => {
      if (level.type === 'round') {
        const nextRound = { ...level, roundNumber: roundCounter };
        roundCounter++;
        return nextRound;
      }
      return level;
    });

    setBlindsList(finalLevels);
  };

  const handleAddLevel = () => {
    const roundsOnly = blindsList.filter(l => l.type === 'round');
    let lastSmall = 100;
    let lastBig = 200;
    if (roundsOnly.length > 0) {
      const lastRound = roundsOnly[roundsOnly.length - 1];
      lastSmall = lastRound.smallBlind ?? 100;
      lastBig = lastRound.bigBlind ?? 200;
    }

    const newLevel: BlindLevel = {
      type: 'round',
      roundNumber: roundsOnly.length + 1,
      duration: 18,
      smallBlind: lastSmall * 2,
      bigBlind: lastBig * 2,
      chipUp: false
    };

    setBlindsList([...blindsList, newLevel]);
  };

  const handleAddBreak = () => {
    const newBreak: BlindLevel = {
      type: 'break',
      duration: 10,
      chipUp: false
    };
    setBlindsList([...blindsList, newBreak]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SettingsType = {
      ...state.settings,
      defaultBuyIn: buyIn,
      defaultAddon: addon,
      defaultBounty: bounty,
      defaultDealerAppreciation: dealerApp,
      pointsBaseAttendance: attendancePoints,
      maxPlayersPerTable: maxPlayers,
      blinds: blindsList,
      colorPalette: colorPalette,
      isUnderConstruction: underConstruction,
      requireOnlineForAttendancePoints: requireOnlineForAttendancePoints
    };

    updateSettings(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };



  const handleExport = () => {
    const dataStr = exportDatabase();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const date = new Date().toISOString().split('T')[0];
    const exportFileDefaultName = `patms_backup_${date}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleExcelExport = () => {
    const activeMembers = state.members.filter(m => !m.isDeleted);
    const membersData = activeMembers.map(m => ({
      'Member ID': m.id,
      'First Name': m.firstName,
      'Last Name': m.lastName,
      'Phone': m.phone || '',
      'Email': m.email || '',
      'Joined Date': m.joinedDate ? m.joinedDate.split('T')[0] : '',
      'Nickname': m.nickname || '',
      'Text Reminders': m.textReminders ? 'Yes' : 'No',
      'Email Announcements': m.emailAnnouncements ? 'Yes' : 'No',
      'Notes': m.notes || ''
    }));

    const standingsData = activeSeason 
      ? calculateStandings(state, activeSeason.id).map((s, index) => ({
          'Rank': index + 1,
          'Player Name': s.name,
          'Member ID': s.memberId,
          'Total Points': s.points,
          'Events Played': s.played,
          'Wins': s.wins,
          'Top 10 Finishes': s.top10,
          'Bounties Collected': s.bounties,
          'Total Earnings ($)': s.earnings
        }))
      : [];

    const wb = XLSX.utils.book_new();
    
    const wsMembers = XLSX.utils.json_to_sheet(membersData);
    XLSX.utils.book_append_sheet(wb, wsMembers, 'Members List');

    if (activeSeason) {
      const wsStandings = XLSX.utils.json_to_sheet(standingsData);
      XLSX.utils.book_append_sheet(wb, wsStandings, `Standings - ${activeSeason.name}`);
    }

    const fitToColumn = (data: any[]) => {
      if (data.length === 0) return [];
      const keys = Object.keys(data[0]);
      return keys.map(key => {
        const maxLength = data.reduce((max, r) => {
          const val = r[key] ? r[key].toString() : '';
          return Math.max(max, val.length);
        }, key.length);
        return { wch: maxLength + 3 };
      });
    };

    wsMembers['!cols'] = fitToColumn(membersData);
    if (activeSeason && standingsData.length > 0) {
      const wsStandings = wb.Sheets[`Standings - ${activeSeason.name}`];
      wsStandings['!cols'] = fitToColumn(standingsData);
    }

    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `penny_ante_poker_database_${date}.xlsx`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        const success = importDatabase(result);
        if (success) {
          setImportStatus('success');
          // Reload settings values from new state
          const parsed = JSON.parse(result);
          if (parsed.settings) {
            setBuyIn(parsed.settings.defaultBuyIn);
            setAddon(parsed.settings.defaultAddon);
            setBounty(parsed.settings.defaultBounty);
            setDealerApp(parsed.settings.defaultDealerAppreciation);
            setAttendancePoints(parsed.settings.pointsBaseAttendance);
            setMaxPlayers(parsed.settings.maxPlayersPerTable);
            setUnderConstruction(!!parsed.settings.isUnderConstruction);
            setRequireOnlineForAttendancePoints(parsed.settings.requireOnlineForAttendancePoints !== false);
          }
        } else {
          setImportStatus('error');
        }
        setTimeout(() => setImportStatus('idle'), 4000);
      }
    };
    fileReader.readAsText(files[0]);
  };

  const handleReset = () => {
    if (confirm('WARNING: This will wipe all members, seasons, settings, and tournament history. Are you absolutely sure?')) {
      if (confirm('LAST WARNING: This action cannot be undone. Wipe database and restore default mock data?')) {
        resetDatabaseToDefault();
        window.location.reload();
      }
    }
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
          Settings & Configuration
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
          Configure default values, modify rules parameters, and manage database import/export backup.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '32px' }}>
        
        {/* Column 1: Rules & Blinds */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Blinds Configuration Card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <span>⏱️</span>
                <span>Blinds Configuration</span>
              </h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleAddLevel}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  + Add Level
                </button>
                <button
                  type="button"
                  onClick={handleAddBreak}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  + Add Break
                </button>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
              Customize the levels, blind amounts, break durations, and chip-up alarms.
            </p>

             {/* Blinds Presets (Save/Load/Delete) */}
             <div style={{
               display: 'flex',
               flexWrap: 'wrap',
               gap: '12px',
               alignItems: 'center',
               backgroundColor: 'rgba(255,255,255,0.02)',
               border: '1px solid var(--border-subtle)',
               borderRadius: '8px',
               padding: '12px',
               marginTop: '4px',
               marginBottom: '4px'
             }}>
               <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                 Blinds Presets:
               </span>
               
               {/* Load Preset Dropdown */}
               <select
                 value={selectedPresetName}
                 onChange={(e) => handleLoadPreset(e.target.value)}
                 className="form-input"
                 style={{ width: '180px', padding: '4px 8px', fontSize: '0.85rem', margin: 0 }}
               >
                 <option value="">-- Select Preset --</option>
                 {Object.keys(state.settings.savedBlinds || {}).map(name => (
                   <option key={name} value={name}>{name}</option>
                 ))}
               </select>

               {/* Action Buttons */}
               <button
                 type="button"
                 onClick={handleDeletePreset}
                 disabled={!selectedPresetName}
                 className="btn btn-secondary"
                 style={{ 
                   padding: '6px 12px', 
                   fontSize: '0.85rem', 
                   color: selectedPresetName ? 'var(--color-danger)' : 'var(--text-secondary)',
                   borderColor: selectedPresetName ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)'
                 }}
               >
                 Delete
               </button>

               <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
                 <input
                   type="text"
                   placeholder="New preset name..."
                   value={newPresetName}
                   onChange={(e) => setNewPresetName(e.target.value)}
                   className="form-input"
                   style={{ width: '160px', padding: '4px 8px', fontSize: '0.85rem', margin: 0 }}
                 />
                 <button
                   type="button"
                   onClick={handleSavePreset}
                   disabled={!newPresetName.trim()}
                   className="btn btn-primary"
                   style={{ padding: '6px 12px', fontSize: '0.85rem', backgroundColor: 'var(--color-emerald)', borderColor: 'var(--color-emerald)' }}
                 >
                   Save Preset
                 </button>
               </div>
             </div>

            <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Level</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Duration (mins)</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Small Blind</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Big Blind</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>Chip Up</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {blindsList.map((level, idx) => {
                    const isRound = level.type === 'round';
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: !isRound ? 'rgba(11, 107, 42, 0.05)' : 'transparent' }}>
                        <td style={{ padding: '8px 16px', fontWeight: 700, color: isRound ? 'var(--text-primary)' : 'var(--color-emerald)' }}>
                          {isRound ? `Level ${level.roundNumber}` : 'Break'}
                        </td>
                        <td style={{ padding: '8px 16px' }}>
                          <input
                            type="number"
                            min={1}
                            value={level.duration}
                            onChange={e => handleUpdateLevel(idx, 'duration', Number(e.target.value))}
                            className="form-input"
                            style={{ width: '80px', padding: '6px 8px', borderRadius: '4px', textAlign: 'center', margin: 0 }}
                          />
                        </td>
                        <td style={{ padding: '8px 16px' }}>
                          {isRound ? (
                            <input
                              type="number"
                              min={0}
                              value={level.smallBlind ?? 0}
                              onChange={e => handleUpdateLevel(idx, 'smallBlind', Number(e.target.value))}
                              className="form-input"
                              style={{ width: '100px', padding: '6px 8px', borderRadius: '4px', margin: 0 }}
                            />
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 16px' }}>
                          {isRound ? (
                            <input
                              type="number"
                              min={0}
                              value={level.bigBlind ?? 0}
                              onChange={e => handleUpdateLevel(idx, 'bigBlind', Number(e.target.value))}
                              className="form-input"
                              style={{ width: '100px', padding: '6px 8px', borderRadius: '4px', margin: 0 }}
                            />
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={!!level.chipUp}
                            onChange={e => handleUpdateLevel(idx, 'chipUp', e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleMoveLevelUp(idx)}
                              disabled={idx === 0}
                              style={{ background: 'none', border: 'none', color: idx === 0 ? 'rgba(255,255,255,0.15)' : 'var(--text-muted)', cursor: idx === 0 ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', padding: '2px' }}
                              onMouseEnter={e => { if (idx > 0) e.currentTarget.style.color = 'var(--color-emerald)'; }}
                              onMouseLeave={e => { if (idx > 0) e.currentTarget.style.color = 'var(--text-muted)'; }}
                              title="Move Level Up"
                            >
                              <ArrowUp size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveLevelDown(idx)}
                              disabled={idx === blindsList.length - 1}
                              style={{ background: 'none', border: 'none', color: idx === blindsList.length - 1 ? 'rgba(255,255,255,0.15)' : 'var(--text-muted)', cursor: idx === blindsList.length - 1 ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', padding: '2px' }}
                              onMouseEnter={e => { if (idx < blindsList.length - 1) e.currentTarget.style.color = 'var(--color-emerald)'; }}
                              onMouseLeave={e => { if (idx < blindsList.length - 1) e.currentTarget.style.color = 'var(--text-muted)'; }}
                              title="Move Level Down"
                            >
                              <ArrowDown size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveLevel(idx)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: '2px' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                              title="Remove Level"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rules & Defaults Form */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SettingsIcon size={22} style={{ color: 'var(--color-emerald)' }} />
              App Rules & Financial Defaults
            </h3>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Default Buy-in ($)</label>
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
                  <label>Default Bounty ($)</label>
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
                  <label>Default Add-on ($)</label>
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
                  <label>Attendance Points</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={attendancePoints}
                    onChange={(e) => setAttendancePoints(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Max Players Per Table</label>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    required
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '20px 0' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                  <input
                    id="under-construction"
                    type="checkbox"
                    checked={underConstruction}
                    onChange={(e) => setUnderConstruction(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}
                  />
                  <label htmlFor="under-construction" style={{ cursor: 'pointer', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '4px', margin: 0 }}>
                    <span style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>🚧 Enable "Under Construction" Mode</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400, lineHeight: 1.4 }}>
                      When enabled, normal players will see an "Under Construction" splash page. Admin access remains active.
                    </span>
                  </label>
                </div>

                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                  <input
                    id="require-online-attendance"
                    type="checkbox"
                    checked={requireOnlineForAttendancePoints}
                    onChange={(e) => setRequireOnlineForAttendancePoints(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}
                  />
                  <label htmlFor="require-online-attendance" style={{ cursor: 'pointer', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '4px', margin: 0 }}>
                    <span style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>🌐 Require Online Registration for Attendance Points</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400, lineHeight: 1.4 }}>
                      When enabled, players must register online in the Player Portal to qualify for the baseline attendance points. Players registered manually on-site by the TD will receive 0 attendance points.
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
                <button type="submit" className="btn btn-primary">
                  <Save size={18} />
                  <span>Save Rules Config</span>
                </button>
                
                {saveSuccess && (
                  <span style={{ color: 'var(--color-emerald)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 600 }}>
                    <CheckCircle size={16} />
                    Changes saved successfully!
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Portability Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          

          {/* Account & Security Card */}
          {onChangePassword && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Account & Security</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Protect your account by updating your administrative password.
              </p>
              
              <button 
                onClick={onChangePassword} 
                className="btn btn-secondary" 
                style={{ width: '100%', justifyContent: 'flex-start', marginTop: '8px' }}
              >
                <SettingsIcon size={18} />
                <span>Change Password</span>
              </button>
            </div>
          )}

          {/* Backups Card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Data Portability</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Export the current local database state into a single JSON file, or restore files created on another browser.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              
              <button onClick={handleExport} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
                <Download size={18} />
                <span>Export Database (.json)</span>
              </button>

              <button onClick={handleExcelExport} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--color-emerald)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                <Download size={18} />
                <span>Export Database to Excel (.xlsx)</span>
              </button>

              <div style={{ position: 'relative' }}>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={!isChiefAdmin}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: isChiefAdmin ? 'pointer' : 'not-allowed'
                  }}
                />
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', justifyContent: 'flex-start', cursor: isChiefAdmin ? 'pointer' : 'not-allowed', opacity: isChiefAdmin ? 1 : 0.6 }}
                  disabled={!isChiefAdmin}
                >
                  <Upload size={18} />
                  <span>Import Database File {!isChiefAdmin && '🔒'}</span>
                </button>
              </div>

              {importStatus === 'success' && (
                <div style={{ color: 'var(--color-emerald)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={16} />
                  Database imported successfully!
                </div>
              )}

              {importStatus === 'error' && (
                <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={16} />
                  Error: Invalid file format or schema.
                </div>
              )}

            </div>
          </div>

          {/* Tournament Simulation Card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Tournament Simulation</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Simulate a live 40-player tournament in real-time. This creates a mock tournament, automatically registers and buys in 40 players, structures seating across 4 tables, and runs a fast-paced game (with table balancing and breaks) down to 1 winner.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              {!simRunning ? (
                <button 
                  onClick={startSimulation} 
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'flex-start', background: 'var(--color-emerald)', borderColor: 'var(--color-emerald)', color: 'white' }}
                >
                  <Play size={18} />
                  <span>Start 40-Player Simulation</span>
                </button>
              ) : (
                <button 
                  onClick={stopSimulation} 
                  className="btn btn-danger" 
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  <Square size={18} />
                  <span>Stop Simulation</span>
                </button>
              )}

              {simStatus && (
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                  fontFamily: 'monospace'
                }}>
                  {simStatus}
                </div>
              )}
            </div>
          </div>

          {/* Danger Zone Card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderColor: 'rgba(248,113,113,0.2)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-danger)' }}>Danger Zone</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Completely clear the browser storage. This will delete all custom records and reset the database back to default mock data.
            </p>

            <button 
              onClick={handleReset} 
              className="btn btn-danger" 
              style={{ alignSelf: 'flex-start', marginTop: '8px', cursor: isChiefAdmin ? 'pointer' : 'not-allowed', opacity: isChiefAdmin ? 1 : 0.6 }}
              disabled={!isChiefAdmin}
            >
              <RefreshCw size={18} />
              <span>Full Database Reset {!isChiefAdmin && '🔒'}</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
