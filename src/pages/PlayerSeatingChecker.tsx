import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Trophy, ShieldAlert, Award } from 'lucide-react';

export const PlayerSeatingChecker: React.FC = () => {
  const { state } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewBoardMode, setViewBoardMode] = useState(false);
  
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Find active tournaments (status === 'active' or status === 'seating')
  const activeTournaments = state.tournaments.filter(
    t => !t.isArchived && (t.status === 'active' || t.status === 'draft')
  );

  // Default to first active tournament or null
  const [selectedTourId, setSelectedTourId] = useState<string | null>(() => {
    return activeTournaments.length > 0 ? activeTournaments[0].id : null;
  });

  const selectedTour = state.tournaments.find(t => t.id === selectedTourId);

  // Get seat mappings
  const seatingEntries: { playerId: string; name: string; tableName: string; seatNum: number; isDealer: boolean }[] = [];

  if (selectedTour && selectedTour.seating) {
    Object.entries(selectedTour.seating).forEach(([tableName, playerIds]) => {
      playerIds.forEach((playerId, index) => {
        if (playerId) {
          const m = state.members.find(member => member.id === playerId);
          const name = m ? `${m.firstName} ${m.lastName}` : `Player #${playerId}`;
          const isDealer = selectedTour.dealers?.[tableName] === playerId;
          seatingEntries.push({
            playerId,
            name,
            tableName,
            seatNum: index + 1,
            isDealer
          });
        }
      });
    });
  }

  // Filter entries based on search term
  const filteredEntries = seatingEntries.filter(entry =>
    entry.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '640px', margin: '0 auto', minHeight: 'calc(100vh - 120px)' }}>
      {/* Header Card */}
      <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy style={{ color: 'var(--color-gold)' }} size={26} />
          Seating Checker
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
          Search seating assignments for tonight's tournament.
        </p>
      </div>

      {activeTournaments.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px 20px', borderRadius: '16px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', textAlign: 'center', color: 'var(--text-muted)' }}>
          <ShieldAlert size={48} style={{ color: 'var(--color-gold)', marginBottom: '16px', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>No Active Seating Draws</h3>
          <p style={{ fontSize: '0.85rem' }}>There are no active tournaments with seating draws right now. Please check back when check-in is complete.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Selector if multiple active tournaments */}
          {activeTournaments.length > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Select Tournament</label>
              <select
                value={selectedTourId || ''}
                onChange={e => setSelectedTourId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-subtle)',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {activeTournaments.map(t => (
                  <option key={t.id} value={t.id} style={{ backgroundColor: '#0f172a' }}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedTour && (
            <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>{selectedTour.name}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginTop: '2px' }}>
                    Date: {selectedTour.date}
                  </span>
                </div>
                <div style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-emerald)', fontSize: '0.75rem', fontWeight: 700 }}>
                  ACTIVE GAME
                </div>
              </div>

              {/* Seating Availability Check */}
              {(!selectedTour.seating || Object.keys(selectedTour.seating).length === 0) ? (
                <div style={{ textAlign: 'center', padding: '32px 10px', color: 'var(--text-secondary)' }}>
                  {selectedTour.seatingTargetTime ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#ffffff', marginBottom: '4px' }}>Seating Draw Countdown</p>
                      {(() => {
                        const targetTime = new Date(selectedTour.seatingTargetTime).getTime();
                        const diff = targetTime - now;
                        if (diff <= 0) {
                          return (
                            <div>
                              <p style={{ fontSize: '0.9rem', color: 'var(--color-gold)', fontWeight: 700 }}>
                                Target time reached! Seating draw is processing...
                              </p>
                              <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>
                                Please standby. The seating chart will load automatically once drawn.
                              </p>
                            </div>
                          );
                        }
                        const totalSecs = Math.floor(diff / 1000);
                        const secs = totalSecs % 60;
                        const totalMins = Math.floor(totalSecs / 60);
                        const mins = totalMins % 60;
                        const hours = Math.floor(totalMins / 60);

                        const timeStr = hours > 0 
                          ? `${hours}h ${mins}m ${secs}s`
                          : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

                        return (
                          <>
                            <div style={{ 
                              fontSize: '3rem', 
                              fontWeight: 900, 
                              color: '#ffffff', 
                              fontFamily: '"Outfit", sans-serif',
                              letterSpacing: '-0.02em',
                              backgroundColor: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '12px',
                              padding: '10px 24px',
                              display: 'inline-block',
                              marginTop: '8px'
                            }}>
                              {timeStr}
                            </div>
                            <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                              Seat assignments will be drawn automatically at {new Date(selectedTour.seatingTargetTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <>
                      <p style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff', marginBottom: '6px' }}>Seating has not been drawn</p>
                      <p style={{ fontSize: '0.85rem' }}>The Tournament Director has not generated seating cards for this event yet.</p>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Mode Selector Toggle */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => setViewBoardMode(!viewBoardMode)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.85rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <span>{viewBoardMode ? '🔍 Search Mode' : '📋 Board Mode'}</span>
                    </button>
                  </div>

                  {!viewBoardMode ? (
                    <>
                      {/* Search Bar */}
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)' }} />
                        <input
                          type="text"
                          placeholder="Type your name to find your seat..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px 16px 12px 42px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                            border: '1.5px solid var(--border-subtle)',
                            color: '#ffffff',
                            fontSize: '0.95rem',
                            outline: 'none',
                            transition: 'border-color 0.2s ease'
                          }}
                        />
                      </div>

                      {/* Search Results / Full List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                        {filteredEntries.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            No matching players found.
                          </div>
                        ) : (
                          filteredEntries.map(entry => {
                            let tableColor = 'var(--text-secondary)';
                            let tableBg = 'rgba(255,255,255,0.04)';
                            let borderStyle = '1px solid var(--border-subtle)';

                            const lowerTable = entry.tableName.toLowerCase();
                            if (lowerTable.includes("red")) {
                              tableColor = '#ef4444';
                              tableBg = 'rgba(239, 68, 68, 0.08)';
                              borderStyle = '1.5px solid rgba(239, 68, 68, 0.25)';
                            } else if (lowerTable.includes("blue")) {
                              tableColor = '#3b82f6';
                              tableBg = 'rgba(59, 130, 246, 0.08)';
                              borderStyle = '1.5px solid rgba(59, 130, 246, 0.25)';
                            } else if (lowerTable.includes("gold") || lowerTable.includes("yellow")) {
                              tableColor = 'var(--color-gold)';
                              tableBg = 'rgba(245, 158, 11, 0.08)';
                              borderStyle = '1.5px solid rgba(245, 158, 11, 0.25)';
                            } else if (lowerTable.includes("gray") || lowerTable.includes("silver")) {
                              tableColor = '#94a3b8';
                              tableBg = 'rgba(148, 163, 184, 0.08)';
                              borderStyle = '1.5px solid rgba(148, 163, 184, 0.25)';
                            } else if (lowerTable.includes("purple")) {
                              tableColor = '#a855f7';
                              tableBg = 'rgba(168, 85, 247, 0.08)';
                              borderStyle = '1.5px solid rgba(168, 85, 247, 0.25)';
                            }

                            return (
                              <div
                                key={entry.playerId}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '14px 16px',
                                  borderRadius: '12px',
                                  backgroundColor: tableBg,
                                  border: borderStyle,
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                                    {entry.name}
                                  </span>
                                  {entry.isDealer && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-gold)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <Award size={14} /> Tonight's Dealer
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: tableColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {entry.tableName}
                                  </span>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                                    Seat {entry.seatNum}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {Object.entries(selectedTour.seating).map(([tableName, playerIds]) => {
                        let headerBg = 'rgba(255,255,255,0.08)';
                        let borderStyle = '1px solid rgba(255,255,255,0.1)';
                        let tableColor = 'var(--text-secondary)';
                        let rowBg = 'rgba(255,255,255,0.03)';
                        let activeNameColor = '#ffffff';

                        const lowerTable = tableName.toLowerCase();
                        if (lowerTable.includes("red")) {
                          tableColor = '#ef4444';
                          headerBg = 'rgba(239, 68, 68, 0.15)';
                          borderStyle = '1.5px solid rgba(239, 68, 68, 0.35)';
                        } else if (lowerTable.includes("blue")) {
                          tableColor = '#3b82f6';
                          headerBg = 'rgba(59, 130, 246, 0.15)';
                          borderStyle = '1.5px solid rgba(59, 130, 246, 0.35)';
                        } else if (lowerTable.includes("gold") || lowerTable.includes("yellow")) {
                          tableColor = 'var(--color-gold)';
                          headerBg = 'rgba(245, 158, 11, 0.15)';
                          borderStyle = '1.5px solid rgba(245, 158, 11, 0.35)';
                        } else if (lowerTable.includes("gray") || lowerTable.includes("silver")) {
                          tableColor = '#94a3b8';
                          headerBg = 'rgba(148, 163, 184, 0.15)';
                          borderStyle = '1.5px solid rgba(148, 163, 184, 0.35)';
                        } else if (lowerTable.includes("purple")) {
                          tableColor = '#a855f7';
                          headerBg = 'rgba(168, 85, 247, 0.15)';
                          borderStyle = '1.5px solid rgba(168, 85, 247, 0.35)';
                        }

                        return (
                          <div key={tableName} style={{
                            backgroundColor: 'rgba(0,0,0,0.2)',
                            border: borderStyle,
                            borderRadius: '12px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}>
                            <div style={{
                              backgroundColor: headerBg,
                              padding: '8px 12px',
                              borderRadius: '8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <h4 style={{ margin: 0, textTransform: 'uppercase', fontWeight: 800, color: tableColor, fontSize: '1rem', letterSpacing: '0.5px' }}>
                                {tableName}
                              </h4>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {playerIds.map((playerId, idx) => {
                                const seatNum = idx + 1;
                                if (!playerId) {
                                  return (
                                    <div key={`empty-${idx}`} style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      padding: '6px 10px',
                                      backgroundColor: 'rgba(255,255,255,0.01)',
                                      borderRadius: '6px',
                                      color: 'rgba(255,255,255,0.25)',
                                      fontSize: '0.85rem'
                                    }}>
                                      <span style={{ fontWeight: 800, marginRight: '10px', width: '24px' }}>#{seatNum}</span>
                                      <span style={{ fontStyle: 'italic' }}>Empty Seat</span>
                                    </div>
                                  );
                                }

                                const m = state.members.find(member => member.id === playerId);
                                const name = m ? `${m.firstName} ${m.lastName}` : `Player #${playerId}`;
                                const isDealer = selectedTour.dealers?.[tableName] === playerId;

                                return (
                                  <div key={playerId} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    backgroundColor: isDealer ? 'rgba(245, 158, 11, 0.08)' : rowBg,
                                    border: isDealer ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255,255,255,0.03)',
                                    borderRadius: '6px',
                                    fontSize: '0.9rem',
                                    color: activeNameColor
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontWeight: 800, width: '24px', color: 'rgba(255,255,255,0.5)' }}>#{seatNum}</span>
                                      <span style={{ fontWeight: 700 }}>{name}</span>
                                    </div>
                                    {isDealer && (
                                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-gold)', backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                        Dealer
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
