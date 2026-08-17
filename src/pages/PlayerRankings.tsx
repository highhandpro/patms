import React from 'react';
import { useApp } from '../context/AppContext';
import { PlayerBanner } from '../components/PlayerBanner';
import { calculateStandings } from '../utils/stats';
import { Award } from 'lucide-react';

const abbreviateTournamentName = (name: string): string => {
  const match = name.match(/Season\s+(\d+)\s*,?\s*Game\s+(\d+)/i);
  if (match) {
    return `S${match[1]}-G${match[2]}`;
  }
  return name;
};

export const PlayerRankings: React.FC = () => {
  const { state, activeSeason } = useApp();

  // Calculate standings dynamically
  const standings = activeSeason 
    ? calculateStandings(state, activeSeason.id) 
    : [];

  const activeSeasonToCPool = activeSeason
    ? state.tournaments
        .filter(t => t.seasonId === activeSeason.id && t.status === 'completed' && !t.name.toLowerCase().includes('beta') && !t.isBetaTest)
        .reduce((sum, t) => sum + t.totalDealerAppreciation, 0)
    : 0;

  // Get completed tournaments sorted chronologically (exclude Beta)
  const completedTournaments = activeSeason
    ? state.tournaments
        .filter(t => t.seasonId === activeSeason.id && t.status === 'completed' && !t.name.toLowerCase().includes('beta') && !t.isBetaTest)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  return (
    <div className="player-page player-rankings-page animate-fade-in">
      <PlayerBanner>
        <h1 className="banner-title text-center">Season Standings</h1>
        {activeSeason && (
          <p className="banner-subtitle text-center">
            {activeSeason.name} Rankings
          </p>
        )}
      </PlayerBanner>

      <div className="player-page-content">
        
        {standings.length === 0 ? (
          <div className="no-standings-card glass-card">
            <p>No games played yet in the current season. Standings will appear once a tournament is completed!</p>
          </div>
        ) : (
          <div className="standings-panel glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="standings-header-summary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Award size={22} style={{ color: 'var(--color-gold)' }} />
                  <span>Leaderboard Standings</span>
                </h3>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Showing {standings.length} active players.
                </p>
              </div>
              {activeSeason && (
                <div style={{ backgroundColor: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)', padding: '10px 20px', borderRadius: '10px', color: 'var(--color-gold)', fontWeight: 700, fontSize: '0.95rem' }}>
                  Season ToC Pool: ${activeSeasonToCPool}
                </div>
              )}
            </div>

            {/* Responsive scrolling container */}
            <div className="table-container" style={{ overflowX: 'auto', width: '100%' }}>
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
                    {completedTournaments.map(t => (
                      <th key={t.id} style={{ textAlign: 'center', minWidth: '85px' }}>
                        {abbreviateTournamentName(t.name)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {standings.map((player, idx) => {
                    const rank = idx + 1;
                    return (
                      <tr key={player.memberId}>
                        <td style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                          {rank}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {(() => {
                            const memberObj = state.members.find(m => m.id === player.memberId);
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                                <span style={{ marginRight: '6px' }}>{player.name}</span>
                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                                  {player.badges?.filter(b => b.isUnlocked).map(badge => (
                                    <span 
                                      key={badge.id}
                                      title={`${badge.title}: ${badge.description} (${badge.progress})`}
                                      style={{
                                        cursor: 'help',
                                        fontSize: '0.9rem',
                                        filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.25))',
                                        display: 'inline-block'
                                      }}
                                    >
                                      {badge.icon}
                                    </span>
                                  ))}
                                </div>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Page Footer */}
        <footer className="player-page-footer">
          <p>© 2026 Tim Hufler. All rights reserved.</p>
        </footer>

      </div>
    </div>
  );
};
