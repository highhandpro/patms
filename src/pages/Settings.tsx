import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Settings as SettingsType } from '../types';
import { Settings as SettingsIcon, Save, Download, Upload, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { calculateStandings } from '../utils/stats';
import * as XLSX from 'xlsx';

interface SettingsProps {
  onChangePassword?: () => void;
  isChiefAdmin?: boolean;
}

export const Settings: React.FC<SettingsProps> = ({ onChangePassword, isChiefAdmin }) => {
  const { state, activeSeason, updateSettings, exportDatabase, importDatabase, resetDatabaseToDefault } = useApp();

  // Settings states
  const [buyIn, setBuyIn] = useState(state.settings.defaultBuyIn);
  const [addon, setAddon] = useState(state.settings.defaultAddon);
  const [bounty, setBounty] = useState(state.settings.defaultBounty);
  const [dealerApp, setDealerApp] = useState(state.settings.defaultDealerAppreciation);
  const [attendancePoints, setAttendancePoints] = useState(state.settings.pointsBaseAttendance);
  const [maxPlayers, setMaxPlayers] = useState(state.settings.maxPlayersPerTable);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Chip Denominations & Calculator states
  const [chipVals, setChipVals] = useState(() => {
    const saved = localStorage.getItem('patms_chip_setup');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.values) return parsed.values;
      } catch (e) {}
    }
    return { white: 25, red: 100, blue: 500, green: 1000, black: 5000 };
  });

  const [startingStackTarget, setStartingStackTarget] = useState(() => {
    const saved = localStorage.getItem('patms_chip_setup');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.target) return parsed.target;
      } catch (e) {}
    }
    return 10000;
  });

  const handleChipValChange = (color: 'white' | 'red' | 'blue' | 'green' | 'black', val: number) => {
    const updated = { ...chipVals, [color]: val };
    setChipVals(updated);
    localStorage.setItem('patms_chip_setup', JSON.stringify({ values: updated, target: startingStackTarget }));
  };

  const handleStackTargetChange = (val: number) => {
    setStartingStackTarget(val);
    localStorage.setItem('patms_chip_setup', JSON.stringify({ values: chipVals, target: val }));
  };

  // Run the heuristics algorithm
  const calculateChipDistribution = () => {
    const denoms = [
      { color: 'black', text: 'Black', val: chipVals.black },
      { color: 'green', text: 'Green', val: chipVals.green },
      { color: 'blue', text: 'Blue', val: chipVals.blue },
      { color: 'red', text: 'Red', val: chipVals.red },
      { color: 'white', text: 'White', val: chipVals.white }
    ].filter(d => d.val > 0);

    let remaining = startingStackTarget;
    const distribution: Record<string, number> = {};
    const ascendingDenoms = [...denoms].reverse();

    ascendingDenoms.forEach((d, idx) => {
      if (remaining <= 0) {
        distribution[d.color] = 0;
        return;
      }
      let count = 0;
      if (idx === 0) {
        count = Math.min(12, Math.floor(remaining / d.val));
      } else if (idx === 1) {
        count = Math.min(10, Math.floor(remaining / d.val));
      } else if (idx === 2) {
        count = Math.min(8, Math.floor(remaining / d.val));
      } else if (idx === ascendingDenoms.length - 1) {
        count = Math.floor(remaining / d.val);
      } else {
        count = Math.min(6, Math.floor(remaining / d.val));
      }
      distribution[d.color] = count;
      remaining -= count * d.val;
    });

    // Greedily allocate remaining backwards if any (high to low)
    denoms.forEach(d => {
      if (remaining >= d.val) {
        const extra = Math.floor(remaining / d.val);
        distribution[d.color] = (distribution[d.color] || 0) + extra;
        remaining -= extra * d.val;
      }
    });

    // Remainder to smallest denom
    if (remaining > 0 && ascendingDenoms.length > 0) {
      const smallest = ascendingDenoms[0];
      distribution[smallest.color] = (distribution[smallest.color] || 0) + 1;
    }

    return denoms.map(d => {
      const qty = distribution[d.color] || 0;
      return { ...d, qty };
    }).filter(d => d.qty > 0);
  };

  const distributionResults = calculateChipDistribution();
  const computedTotal = distributionResults.reduce((sum, d) => sum + d.qty * d.val, 0);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SettingsType = {
      defaultBuyIn: buyIn,
      defaultAddon: addon,
      defaultBounty: bounty,
      defaultDealerAppreciation: dealerApp,
      pointsBaseAttendance: attendancePoints,
      maxPlayersPerTable: maxPlayers
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
        
        {/* Column 1: Rules & Chip Assistant */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Rules & Defaults Form */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SettingsIcon size={22} style={{ color: 'var(--color-emerald)' }} />
              App Rules & Financial Defaults
            </h3>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Default Dealer Appreciation ($)</label>
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

          {/* Starting Stack Assistant & Chip Denominations */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.4rem' }}>🪙</span>
              Starting Stack Assistant & Chip Denominations
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '-10px' }}>
              Define values for color denominations and calculate a balanced starting chip stack distribution.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '8px' }}>
              {/* Left Column: Input Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ color: 'var(--color-emerald)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px' }}>
                  Chip Value Configuration
                </h4>
                {(['white', 'red', 'blue', 'green', 'black'] as const).map((color) => (
                  <div key={color} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`chip-circle ${color}`} style={{ width: '28px', height: '28px', fontSize: '0.7rem' }}>
                        {color[0].toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.9rem', textTransform: 'capitalize' }}>{color} Chip:</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={chipVals[color]}
                      onChange={(e) => handleChipValChange(color, Number(e.target.value))}
                      className="form-input"
                      style={{ width: '100px', padding: '6px 10px', margin: 0, textAlign: 'right' }}
                    />
                  </div>
                ))}

                <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
                  <label style={{ fontWeight: 700, color: 'var(--color-emerald)' }}>Starting Chips Needed</label>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={startingStackTarget}
                    onChange={(e) => handleStackTargetChange(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Right Column: Recommended Distribution */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ color: 'var(--color-emerald)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px' }}>
                  Recommended Distribution
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {distributionResults.map((d) => (
                    <div key={d.color} className="chip-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`chip-circle ${d.color}`}>
                          {d.text[0]}
                        </span>
                        <span style={{ fontSize: '0.9rem' }}>${d.val} Chips</span>
                      </div>
                      <div>
                        <span className="chip-qty">× {d.qty}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                          (${ (d.qty * d.val).toLocaleString() })
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  borderTop: '1px dashed rgba(255,255,255,0.1)',
                  marginTop: 'auto'
                }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Calculated Total Stack:</span>
                  <span style={{ color: 'var(--color-gold)', fontSize: '1.25rem', fontWeight: 800 }}>
                    ${computedTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
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
