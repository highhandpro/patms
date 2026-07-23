import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { calculateStandings, formatDate } from '../utils/stats';
import { Plus, Award, Calendar, AlertCircle, X } from 'lucide-react';

interface StandingsProps {
  isChiefAdmin?: boolean;
}

const abbreviateTournamentName = (name: string): string => {
  const match = name.match(/Season\s+(\d+)\s*,?\s*Game\s+(\d+)/i);
  if (match) {
    return `S${match[1]}-G${match[2]}`;
  }
  return name;
};

export const Standings: React.FC<StandingsProps> = ({ isChiefAdmin }) => {
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

  // Drawing Simulator States
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [isDrawingInProgress, setIsDrawingInProgress] = useState(false);
  const [drawingWinner, setDrawingWinner] = useState<{ playerName: string; ticket: any } | null>(null);
  const [currentDisplayPlayer, setCurrentDisplayPlayer] = useState<string>('');

  const runRaffleDrawing = (tickets: any[]) => {
    if (tickets.length === 0) return;
    
    setIsDrawingInProgress(true);
    setDrawingWinner(null);
    
    let currentIteration = 0;
    const totalIterations = 35;
    
    const tick = () => {
      const randomTicket = tickets[Math.floor(Math.random() * tickets.length)];
      setCurrentDisplayPlayer(randomTicket.playerName);
      currentIteration++;
      
      if (currentIteration < totalIterations) {
        const nextDelay = 50 + Math.pow(currentIteration / totalIterations, 2) * 400;
        setTimeout(tick, nextDelay);
      } else {
        const finalWinner = tickets[Math.floor(Math.random() * tickets.length)];
        setCurrentDisplayPlayer(finalWinner.playerName);
        setDrawingWinner({
          playerName: finalWinner.playerName,
          ticket: finalWinner
        });
        setIsDrawingInProgress(false);
      }
    };
    
    setTimeout(tick, 50);
  };

  // Find active season
  const activeSeason = state.seasons.find(s => s.id === selectedSeasonId) || null;

  const [sortField, setSortField] = useState<string>('default');

  // Calculate standings
  const standings = selectedSeasonId ? calculateStandings(state, selectedSeasonId) : [];

  // Sort standings based on selected sortField
  const sortedStandings = [...standings].sort((a, b) => {
    if (sortField === 'default') return 0;
    const pointsA = a.gamePoints[sortField] || 0;
    const pointsB = b.gamePoints[sortField] || 0;
    if (pointsA !== pointsB) {
      return pointsB - pointsA; // Descending (1st to last order)
    }
    const indexA = standings.findIndex(s => s.memberId === a.memberId);
    const indexB = standings.findIndex(s => s.memberId === b.memberId);
    return indexA - indexB;
  });

  // Get completed tournaments sorted chronologically
  const completedTournaments = selectedSeasonId
    ? state.tournaments
        .filter(t => t.seasonId === selectedSeasonId && t.status === 'completed')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  const seasonToCPool = selectedSeasonId
    ? state.tournaments
        .filter(t => t.seasonId === selectedSeasonId && t.status === 'completed')
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
        <div style={{ display: 'flex', gap: '12px' }}>
          {isChiefAdmin && (
            <button className="btn btn-secondary" onClick={() => setIsDrawingModalOpen(true)} style={{ backgroundColor: 'var(--color-emerald)', color: '#052e16' }}>
              <Award size={18} />
              <span>Raffle Drawing</span>
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setIsAddingSeason(true)}>
            <Plus size={18} />
            <span>Create New Season</span>
          </button>
        </div>
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
              <span className="badge badge-info">Active Season</span>
            ) : (
              isChiefAdmin && (
                <button 
                  onClick={() => handleSetSeasonActive(activeSeason.id)}
                  className="btn btn-ghost" 
                  style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                >
                  Set as Active Season
                </button>
              )
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
                  <th 
                    style={{ textAlign: 'right', color: 'var(--color-gold)', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => setSortField('default')}
                    title="Click to sort by overall Season Points"
                  >
                    Season Points {sortField === 'default' && '▼'}
                  </th>
                  {completedTournaments.map(t => (
                    <th 
                      key={t.id} 
                      style={{ 
                        textAlign: 'center', 
                        minWidth: '85px', 
                        cursor: 'pointer', 
                        userSelect: 'none',
                        color: sortField === t.id ? 'var(--color-gold)' : 'inherit',
                        borderBottom: sortField === t.id ? '2px solid var(--color-gold)' : 'none'
                      }} 
                      onClick={() => setSortField(sortField === t.id ? 'default' : t.id)}
                      title={`Click to sort by ${t.name} points`}
                    >
                      {abbreviateTournamentName(t.name)} {sortField === t.id && '▼'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedStandings.map((player, idx) => (
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
                    {completedTournaments.map(t => {
                      const pts = player.gamePoints[t.id];
                      return (
                        <td key={t.id} style={{ textAlign: 'center', color: pts > 0 ? 'var(--text-primary)' : 'var(--text-secondary)', opacity: pts > 0 ? 1 : 0.35 }}>
                          {pts !== undefined ? pts : 0}
                        </td>
                      );
                    })}
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

      {/* Drawing Simulator Modal */}
      {isDrawingModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--bg-surface)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Season End Raffle Drawing</h3>
              <button 
                onClick={() => {
                  if (!isDrawingInProgress) {
                    setIsDrawingModalOpen(false);
                    setDrawingWinner(null);
                  }
                }}
                disabled={isDrawingInProgress}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Prize: <strong>Free game for the following season!</strong> Every ticket represents one entry.
            </p>
            
            {(() => {
              const tickets = state.members
                .filter(m => !m.isDeleted)
                .flatMap(m => (m.drawingTickets || [])
                  .filter(t => t.seasonId === selectedSeasonId)
                  .map(t => ({
                    ticketId: t.id,
                    memberId: m.id,
                    playerName: `${m.firstName} ${m.lastName}`,
                    reason: t.reason,
                    note: t.note
                  }))
                );
                
              const playerCounts = tickets.reduce((acc, t) => {
                acc[t.playerName] = (acc[t.playerName] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              
              const sortedParticipants = Object.entries(playerCounts).sort((a, b) => b[1] - a[1]);
              
              if (tickets.length === 0) {
                return (
                  <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', margin: '40px 0' }}>
                    No tickets found for this season.
                  </p>
                );
              }
              
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Wheel/Spinning Display */}
                  <div style={{ 
                    backgroundColor: 'rgba(255,255,255,0.02)', 
                    border: '1px solid var(--border-subtle)', 
                    borderRadius: '12px', 
                    padding: '30px 20px', 
                    textAlign: 'center',
                    minHeight: '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {isDrawingInProgress ? (
                      <div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-gold)', animation: 'pulse 0.5s infinite' }}>
                          {currentDisplayPlayer}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                          Shuffling entries...
                        </div>
                      </div>
                    ) : drawingWinner ? (
                      <div className="animate-scale-in">
                        <div style={{ fontSize: '1rem', color: 'var(--text-emerald)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          🎉 Winner Drawn! 🎉
                        </div>
                        <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-emerald)', marginTop: '4px' }}>
                          {drawingWinner.playerName}
                        </div>
                        <div style={{ 
                          fontSize: '0.85rem', 
                          color: 'var(--text-secondary)', 
                          marginTop: '12px',
                          display: 'inline-block',
                          padding: '6px 12px',
                          backgroundColor: 'rgba(255,255,255,0.04)',
                          borderRadius: '8px',
                          border: '1px dashed var(--border-subtle)'
                        }}>
                          Winning Ticket: <span style={{ textTransform: 'capitalize', fontWeight: 700 }}>{drawingWinner.ticket.reason}</span>
                          {drawingWinner.ticket.note && ` (${drawingWinner.ticket.note})`}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
                          Ready to draw from <strong>{tickets.length}</strong> total entries!
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => runRaffleDrawing(tickets)}
                      disabled={isDrawingInProgress}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '12px', fontSize: '1.1rem', fontWeight: 700 }}
                    >
                      {drawingWinner ? 'Draw Again' : 'Draw Winner!'}
                    </button>
                  </div>
                  
                  {/* Participant List */}
                  <div>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                      Entries breakdown ({sortedParticipants.length} players)
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                      {sortedParticipants.map(([name, count]) => {
                        const winPct = ((count / tickets.length) * 100).toFixed(1);
                        return (
                          <div 
                            key={name} 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              padding: '8px 12px', 
                              backgroundColor: 'rgba(255,255,255,0.01)', 
                              borderRadius: '8px', 
                              border: '1px solid var(--border-subtle)' 
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{name}</span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{count} ticket{count > 1 ? 's' : ''}</span>
                              <span className="badge badge-ghost" style={{ fontSize: '0.8rem' }}>{winPct}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
};
