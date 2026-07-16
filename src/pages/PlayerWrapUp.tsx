import React from 'react';
import { useApp } from '../context/AppContext';
import { PlayerBanner } from '../components/PlayerBanner';
import { calculateStandings } from '../utils/stats';
import { Calendar, MapPin, ChevronRight, Coins, Clock, DollarSign, PlusCircle, Hourglass, RefreshCw, Award } from 'lucide-react';
import type { Member } from '../types';

interface PlayerWrapUpProps {
  setActiveTab: (tab: string) => void;
  setSelectedTournamentId: (id: string | null) => void;
}

export const PlayerWrapUp: React.FC<PlayerWrapUpProps> = ({
  setActiveTab,
  setSelectedTournamentId
}) => {
  const { state, activeSeason } = useApp();

  // 1. Get the most recently completed tournament
  const completedTournaments = state.tournaments
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first

  const lastTournament = completedTournaments[0] || null;

  // Get sorted entries for last tournament (only players who won money)
  const lastTournamentEntries = lastTournament
    ? [...lastTournament.entries]
        .filter(entry => entry.payoutEarned && entry.payoutEarned > 0)
        .sort((a, b) => {
          const posA = a.finishPosition || 999;
          const posB = b.finishPosition || 999;
          return posA - posB;
        })
    : [];

  // 2. Get active season standings
  const standings = activeSeason
    ? calculateStandings(state, activeSeason.id).slice(0, 10) // Top 10 as requested
    : [];

  // 3. Get next upcoming tournament
  const upcomingTournaments = state.tournaments
    .filter(t => t.status !== 'completed')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Closest date first

  const nextTournament = upcomingTournaments[0] || null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return dateStr;
  };

  const getPlayerName = (memberId: string) => {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return 'Unknown Player';
    return `${member.firstName} ${member.lastName}`;
  };

  const getPlayerMember = (memberId: string): Member | undefined => {
    return state.members.find(m => m.id === memberId);
  };

  const handleSeeNextEventDetails = () => {
    if (nextTournament) {
      setSelectedTournamentId(nextTournament.id);
      setActiveTab('event-details');
    }
  };

  return (
    <div className="player-page player-wrapup-page animate-fade-in">
      <PlayerBanner>
        <h1 className="banner-title text-center">Standings</h1>
      </PlayerBanner>

      <div className="player-page-content">
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(280px, 0.8fr)',
            gap: '32px',
            alignItems: 'start'
          }}
          className="wrapup-grid"
        >
          {/* LEFT COLUMN: Recent Results & Next Event */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* 1. Last Tournament Results */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  🏆 Last Game Results
                </h2>
                {lastTournament && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Played on {formatDate(lastTournament.date)}
                  </span>
                )}
              </div>

              {lastTournament ? (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="results-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '80px', textAlign: 'center', backgroundColor: '#052e16', color: '#ffffff', padding: '12px' }}>Place</th>
                          <th style={{ textAlign: 'left', backgroundColor: '#052e16', color: '#ffffff', padding: '12px' }}>Player</th>
                          <th style={{ width: '120px', textAlign: 'center', backgroundColor: '#052e16', color: '#ffffff', padding: '12px' }}>Winnings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lastTournamentEntries.map((entry, idx) => {
                          const place = entry.finishPosition || (idx + 1);
                          const isTop3 = place <= 3;
                          const member = getPlayerMember(entry.memberId);
                          const name = member ? `${member.firstName} ${member.lastName}` : getPlayerName(entry.memberId);

                          return (
                            <tr key={entry.memberId} className={isTop3 ? 'top-finish-row' : ''}>
                              <td className="result-place-cell" style={{ textAlign: 'center', padding: '12px' }}>
                                {isTop3 ? (
                                  <span className={`place-medal medal-${place}`} style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '50%',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    backgroundColor: place === 1 ? '#d4a359' : place === 2 ? '#9ca3af' : '#b45309',
                                    color: '#000000'
                                  }}>
                                    {place}
                                  </span>
                                ) : (
                                  <span className="place-number" style={{ fontWeight: 600 }}>{place}</span>
                                )}
                              </td>
                              <td style={{ padding: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  {member?.logoUrl ? (
                                    <img 
                                      src={member.logoUrl} 
                                      alt="" 
                                      style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} 
                                    />
                                  ) : (
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                      ♣
                                    </div>
                                  )}
                                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{name}</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center', padding: '12px', fontWeight: 700, color: 'var(--color-emerald)' }}>
                                {entry.payoutEarned && entry.payoutEarned > 0 ? `$${entry.payoutEarned}` : ''}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: '16px', textAlign: 'left' }}>
                    <button 
                      onClick={() => setActiveTab('results')}
                      className="btn-link"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-emerald)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        textDecoration: 'underline'
                      }}
                    >
                      See the full results <ChevronRight size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No completed game results found for the current season.
                </div>
              )}
            </div>

            {/* 2. Next Event Details */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '20px' }}>
                📅 Our Next Event
              </h2>

              {nextTournament ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                      {nextTournament.name}
                    </h3>
                  </div>

                  <div 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: '20px',
                      marginTop: '8px',
                      marginBottom: '8px'
                    }}
                    className="event-details-grid"
                  >
                    {/* Left Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                        <Calendar size={18} style={{ color: 'var(--color-emerald)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>{formatShortDate(nextTournament.date)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                        <Clock size={18} style={{ color: 'var(--color-emerald)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>{nextTournament.time || '5:30 PM'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                        <MapPin size={18} style={{ color: 'var(--color-emerald)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>{nextTournament.location || 'Tony\'s Place'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                        <DollarSign size={18} style={{ color: 'var(--color-emerald)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>
                          ${nextTournament.buyInAmount} Buy-In (includes ${nextTournament.dealerAppreciationAmount || 5} ToC & ${nextTournament.foodAmount || 5} Food)
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                        <Coins size={18} style={{ color: 'var(--color-gold)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>
                          {(nextTournament.startingChips || 8500).toLocaleString()} Starting Chips
                        </span>
                      </div>
                    </div>

                    {/* Right Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                        <Award size={18} style={{ color: 'var(--color-gold)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>On-time Bonus +500 Chips</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                        <PlusCircle size={18} style={{ color: 'var(--color-emerald)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>
                          ${nextTournament.addonAmount} Add-on at First Break for ${(nextTournament.addonChips || 3500).toLocaleString()} chips
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                        <Hourglass size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>{nextTournament.roundLength || 20} minute levels</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                        <RefreshCw size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>{nextTournament.rebuys || 'Freeze out - No rebuys'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                        <Clock size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>{nextTournament.lateEntry || 'Late Registration Ends After Level 1'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <button 
                      onClick={handleSeeNextEventDetails}
                      className="btn btn-primary"
                      style={{
                        padding: '12px 24px',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: '#052e16',
                        borderColor: '#052e16',
                        color: '#ffffff',
                        boxShadow: '0 4px 15px rgba(5, 46, 22, 0.25)'
                      }}
                    >
                      REGISTER NOW
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No upcoming events scheduled at this time. Check back soon!
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Season Standings (Top 10) */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
              📈 Season Standings
            </h2>
            {activeSeason && (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 20px 0' }}>
                Our top 10 players from each season earn a free roll in the Tournament of Champions.
              </p>
            )}

            {standings.length > 0 ? (
              <>
                <table className="standings-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '60px', textAlign: 'center', backgroundColor: '#052e16', color: '#ffffff', padding: '12px' }}>Place</th>
                      <th style={{ textAlign: 'left', backgroundColor: '#052e16', color: '#ffffff', padding: '12px' }}>Player</th>
                      <th style={{ width: '90px', textAlign: 'center', backgroundColor: '#052e16', color: '#ffffff', padding: '12px' }}>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row, idx) => {
                      const place = idx + 1;
                      const member = getPlayerMember(row.memberId);
                      return (
                        <tr key={row.memberId}>
                          <td style={{ textAlign: 'center', padding: '12px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                            {place}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {member?.logoUrl ? (
                                <img 
                                  src={member.logoUrl} 
                                  alt="" 
                                  style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} 
                                />
                              ) : (
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  ♣
                                </div>
                              )}
                              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{row.name}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', padding: '12px', fontWeight: 700, color: 'var(--color-emerald)' }}>
                            {row.points.toFixed(3).replace(/\.?0+$/, '')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                  <button 
                    onClick={() => setActiveTab('rankings')}
                    className="btn-link"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-emerald)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'underline'
                    }}
                  >
                    See where you fall in the standings <ChevronRight size={16} />
                  </button>
                  <button 
                    onClick={() => setActiveTab('about')}
                    className="btn-link"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: '0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'underline'
                    }}
                  >
                    See how rankings are calculated <ChevronRight size={16} />
                  </button>
                </div>
              </>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No active season rankings available yet.
              </div>
            )}
          </div>

        </div>

        {/* Page Footer */}
        <footer className="player-page-footer" style={{ marginTop: '48px' }}>
          <p>© 2026 Tim Hufler. All rights reserved.</p>
        </footer>

      </div>
    </div>
  );
};
