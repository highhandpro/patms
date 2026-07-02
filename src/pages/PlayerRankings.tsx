import React from 'react';
import { useApp } from '../context/AppContext';
import { PlayerBanner } from '../components/PlayerBanner';
import { calculateStandings } from '../utils/stats';

export const PlayerRankings: React.FC = () => {
  const { state, activeSeason } = useApp();

  // Calculate standings dynamically
  const standings = activeSeason 
    ? calculateStandings(state, activeSeason.id) 
    : [];

  const activeSeasonToCPool = activeSeason
    ? state.tournaments
        .filter(t => t.status === 'completed' && t.seasonId === activeSeason.id)
        .reduce((sum, t) => sum + t.totalDealerAppreciation, 0)
    : 0;

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
          <div className="standings-panel glass-card">
            <div className="standings-header-summary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3>Leaderboard</h3>
                <p>Top players ranked by total points accumulated this season.</p>
              </div>
              {activeSeason && (
                <div style={{ backgroundColor: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)', padding: '10px 20px', borderRadius: '10px', color: 'var(--color-gold)', fontWeight: 700, fontSize: '0.95rem' }}>
                  Season ToC Pool: ${activeSeasonToCPool}
                </div>
              )}
            </div>

            <table className="standings-table">
              <thead>
                <tr>
                  <th style={{ width: '70px', textAlign: 'center' }}>Rank</th>
                  <th>Player Name</th>
                  <th style={{ textAlign: 'center' }}>Points</th>
                  <th style={{ textAlign: 'center' }}>Earnings</th>
                  <th style={{ textAlign: 'center' }}>Bounties</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((standing, index) => {
                  const rank = index + 1;
                  const isTop3 = rank <= 3;
                  return (
                    <tr key={standing.memberId} className={isTop3 ? 'top-standing-row' : ''}>
                      <td className="standing-rank-cell">
                        {isTop3 ? (
                          <span className={`standing-medal medal-${rank}`}>
                            {rank}
                          </span>
                        ) : (
                          <span className="standing-rank-number">{rank}</span>
                        )}
                      </td>
                      <td className="standing-player-name-cell">
                        {standing.name}
                      </td>
                      <td className="standing-stat-cell points-stat">
                        {standing.points}
                      </td>
                      <td className="standing-stat-cell earnings-stat">
                        ${standing.earnings}
                      </td>
                      <td className="standing-stat-cell">
                        {standing.bounties}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
