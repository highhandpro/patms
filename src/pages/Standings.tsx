import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { calculateStandings, formatDate } from '../utils/stats';
import { Plus, Award, Calendar, AlertCircle } from 'lucide-react';

export const Standings: React.FC = () => {
  const { state, addSeason, updateSeason } = useApp();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(
    state.seasons.find(s => s.isActive)?.id || (state.seasons[0]?.id || '')
  );

  // Season creation form states
  const [isAddingSeason, setIsAddingSeason] = useState(false);
  const [seasonName, setSeasonName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Find active season
  const activeSeason = state.seasons.find(s => s.id === selectedSeasonId) || null;

  // Calculate standings
  const standings = selectedSeasonId ? calculateStandings(state, selectedSeasonId) : [];

  const seasonToCPool = selectedSeasonId
    ? state.tournaments
        .filter(t => t.status === 'completed' && t.seasonId === selectedSeasonId)
        .reduce((sum, t) => sum + t.totalDealerAppreciation, 0)
    : 0;

  const handleAddSeason = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seasonName.trim() || !startDate || !endDate) return;

    addSeason(seasonName, startDate, endDate, isActive);
    setIsAddingSeason(false);
    
    // Reset form
    setSeasonName('');
    setStartDate('');
    setEndDate('');
    setIsActive(true);
  };

  const handleSetSeasonActive = (id: string) => {
    updateSeason(id, { isActive: true });
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
            Season Standings
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Track leaderboards, points, cash winnings, and manage club seasons.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => setIsAddingSeason(true)}>
          <Plus size={18} />
          <span>Create New Season</span>
        </button>
      </div>

      {/* Season Select & Configuration */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Select Season</span>
          <select
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            className="form-input"
            style={{ width: '220px', cursor: 'pointer', paddingRight: '36px' }}
          >
            {state.seasons.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} {s.isActive ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        {activeSeason && (
          <div style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.02)',
            padding: '12px 20px',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            marginTop: '22px'
          }}>
            <Calendar size={18} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Duration: <strong>{formatDate(activeSeason.startDate)}</strong> to <strong>{formatDate(activeSeason.endDate)}</strong>
              <span style={{ margin: '0 12px', color: 'var(--border-subtle)' }}>|</span>
              Season ToC Pool: <strong style={{ color: 'var(--color-gold)' }}>${seasonToCPool}</strong>
            </span>
            {activeSeason.isActive ? (
              <span className="badge badge-gold">Active Season</span>
            ) : (
              <button 
                onClick={() => handleSetSeasonActive(activeSeason.id)}
                className="btn btn-ghost" 
                style={{ fontSize: '0.8rem', padding: '4px 8px' }}
              >
                Set as Active Season
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Leaderboard Table */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={22} style={{ color: 'var(--color-gold)' }} />
            Leaderboard Standings
          </h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing {standings.length} active players
          </span>
        </div>

        {standings.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '70px' }}>Rank</th>
                  <th>Player Name</th>
                  <th style={{ textAlign: 'center' }}>Tournaments Played</th>
                  <th style={{ textAlign: 'center' }}>Wins (1st)</th>
                  <th style={{ textAlign: 'center' }}>Top 10s</th>
                  <th style={{ textAlign: 'center' }}>Bounties</th>
                  <th style={{ textAlign: 'right' }}>Total Earnings</th>
                  <th style={{ textAlign: 'right', color: 'var(--color-gold)' }}>Season Points</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((player, idx) => (
                  <tr key={player.memberId}>
                    <td style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                      {idx + 1}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {(() => {
                        const memberObj = state.members.find(m => m.id === player.memberId);
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {memberObj?.logoUrl ? (
                              <img 
                                src={memberObj.logoUrl} 
                                alt="Logo" 
                                style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }} 
                              />
                            ) : (
                              <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                                ♣
                              </div>
                            )}
                            <span>{player.name}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ textAlign: 'center' }}>{player.played}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: player.wins > 0 ? 'var(--text-gold)' : 'inherit' }}>
                      {player.wins}
                    </td>
                    <td style={{ textAlign: 'center' }}>{player.top10}</td>
                    <td style={{ textAlign: 'center' }}>{player.bounties}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-emerald)' }}>
                      ${player.earnings}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-gold)' }}>
                      {player.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            No completed tournaments for this season have calculated points yet.
          </div>
        )}
      </div>

      {/* Rules explanation box */}
      <div className="glass-card" style={{
        display: 'flex',
        gap: '16px',
        background: 'rgba(251,191,36,0.02)',
        border: '1px dashed rgba(251,191,36,0.15)'
      }}>
        <AlertCircle size={24} style={{ color: 'var(--color-gold)', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h4 style={{ color: 'var(--text-gold)', fontWeight: 600, fontSize: '0.95rem' }}>Point System Rules</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Points are automatically computed at tournament finalization using the club formula: 
            <code style={{ fontSize: '0.8rem', padding: '2px 6px', margin: '0 4px', verticalAlign: 'middle' }}>
              Points = (Base Position Points × Finish Multiplier) + (Bounties × 3) + Attendance
            </code>. Base Position Points are calculated as <code style={{ fontSize: '0.8rem', padding: '2px 6px' }}>Field Size - Finish Position + 1</code>. A 3x multiplier is applied to 1st place, and a 2x multiplier is applied to the final table (2nd-10th).
          </p>
        </div>
      </div>

      {/* Season Creator Modal Overlay */}
      {isAddingSeason && (
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
          <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '450px', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Create New Season</h3>
              <button 
                onClick={() => setIsAddingSeason(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSeason} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Season Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Season 2026"
                  value={seasonName}
                  onChange={(e) => setSeasonName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch (err) { console.warn(err); } }}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>End Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch (err) { console.warn(err); } }}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
                <input
                  type="checkbox"
                  id="active-checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-emerald)' }}
                />
                <label htmlFor="active-checkbox" style={{ fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none' }}>
                  Make this the active season immediately
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddingSeason(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Create Season
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
