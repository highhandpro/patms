import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PlayerBanner } from '../components/PlayerBanner';
import { ChevronDown } from 'lucide-react';

export const PlayerResults: React.FC = () => {
  const { state } = useApp();
  
  // Find completed tournaments
  const completedTournaments = state.tournaments
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest completed first

  // Set default selected tournament: tour-310 if exists, otherwise the first completed
  const initialSelectedId = completedTournaments.some(t => t.id === 'tour-310')
    ? 'tour-310'
    : (completedTournaments[0]?.id || null);

  const [selectedTourId, setSelectedTourId] = useState<string | null>(initialSelectedId);

  const selectedTournament = state.tournaments.find(t => t.id === selectedTourId);

  const getPlayerName = (memberId: string) => {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return 'Unknown Player';
    return `${member.firstName} ${member.lastName}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Sort tournament entries by finish position
  const sortedEntries = selectedTournament
    ? [...selectedTournament.entries].sort((a, b) => (a.finishPosition || 999) - (b.finishPosition || 999))
    : [];

  return (
    <div className="player-page player-results-page animate-fade-in">
      <PlayerBanner>
        <h1 className="banner-title text-center">Results</h1>
      </PlayerBanner>

      <div className="player-page-content">
        
        {/* Tournament Selection Selector */}
        {completedTournaments.length > 1 && (
          <div className="results-selector-container">
            <label htmlFor="tournament-select" className="select-label">Select Game:</label>
            <div className="custom-select-wrapper">
              <select
                id="tournament-select"
                value={selectedTourId || ''}
                onChange={e => setSelectedTourId(e.target.value)}
                className="custom-select"
              >
                {completedTournaments.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({formatDate(t.date)})
                  </option>
                ))}
              </select>
              <ChevronDown className="select-arrow" size={16} />
            </div>
          </div>
        )}

        {/* Selected Tournament Results Table */}
        {selectedTournament ? (
          <div className="results-panel glass-card">
            <div className="results-header-info">
              <h2 className="results-tournament-title">{selectedTournament.name}</h2>
              <p className="results-tournament-date">Played on {formatDate(selectedTournament.date)}</p>
            </div>

            <table className="results-table">
              <thead>
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>Place</th>
                  <th>Player</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((entry) => {
                  const place = entry.finishPosition || '-';
                  const isTop3 = entry.finishPosition && entry.finishPosition <= 3;
                  return (
                    <tr key={entry.memberId} className={isTop3 ? 'top-finish-row' : ''}>
                      <td className="result-place-cell">
                        {isTop3 ? (
                          <span className={`place-medal medal-${entry.finishPosition}`}>
                            {place}
                          </span>
                        ) : (
                          <span className="place-number">{place}</span>
                        )}
                      </td>
                      <td className="result-player-cell">
                        {(() => {
                          const m = state.members.find(member => member.id === entry.memberId);
                          const name = m ? `${m.firstName} ${m.lastName}` : getPlayerName(entry.memberId);
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {m?.logoUrl ? (
                                <img 
                                  src={m.logoUrl} 
                                  alt="Card Preview" 
                                  style={{ width: '21px', height: '28px', borderRadius: '3px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }} 
                                />
                              ) : (
                                <div style={{ width: '21px', height: '28px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                                  ♣
                                </div>
                              )}
                              <span>{name}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="result-points-cell">
                        {entry.pointsEarned}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-results-placeholder glass-card">
            <p>No completed tournament results available yet.</p>
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
