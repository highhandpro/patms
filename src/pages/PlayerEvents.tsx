import React from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Clock, MapPin, DollarSign, Coins, Timer, RefreshCcw, AlarmClock, Zap, Handshake, Plus } from 'lucide-react';
import { getEmbeddableFlyerUrl } from '../utils/flyer';

interface PlayerEventsProps {
  setActiveTab: (tab: string) => void;
  setSelectedTournamentId: (id: string | null) => void;
}

export const PlayerEvents: React.FC<PlayerEventsProps> = ({
  setActiveTab,
  setSelectedTournamentId
}) => {
  const { state } = useApp();

  // Filter for upcoming (active or draft) tournaments
  const upcomingTournaments = state.tournaments
    .filter(t => t.status !== 'completed')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleSeeDetails = (id: string) => {
    setSelectedTournamentId(id);
    setActiveTab('event-details');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="player-page player-events-page animate-fade-in">
      <div 
        className="upcoming-events-banner-container"
        style={{
          width: '100%',
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          marginBottom: '32px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <img 
          src="/upcoming-events-banner.png" 
          alt="Upcoming Events" 
          style={{
            width: '100%',
            height: 'auto',
            display: 'block'
          }}
        />
      </div>

      <div className="player-page-content">
        <div className="events-list-container">
          {upcomingTournaments.length === 0 ? (
            <div className="no-events-card glass-card">
              <p>No upcoming tournaments scheduled at this time. Check back later!</p>
            </div>
          ) : (
            upcomingTournaments.map((tournament) => {
              const totalSeats = tournament.maxPlayers || 24;
              const regCount = Math.min(tournament.entries.length, totalSeats);
              const seatsAvailable = Math.max(0, totalSeats - tournament.entries.length);
              const waitlistCount = Math.max(0, tournament.entries.length - totalSeats);

              return (
                <div key={tournament.id} className="event-card glass-card">
                  <div className="event-card-header">
                    <h2 className="event-card-title">{tournament.name}</h2>
                    <div className="event-card-seats">
                      <span className="seats-registered">{regCount} registered</span>
                      <span className="seats-divider">|</span>
                      <span className="seats-available">{seatsAvailable} seats available</span>
                      {waitlistCount > 0 && (
                        <>
                          <span className="seats-divider">|</span>
                          <span className="seats-waitlist" style={{ color: 'var(--color-gold)', fontWeight: 600 }}>{waitlistCount} waitlisted</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="event-card-body-grid">
                    {/* Column 1 */}
                    <div className="details-col">
                      <div className="detail-item">
                        <Calendar size={18} className="detail-icon" />
                        <div className="detail-text">
                          <span className="detail-val">{formatDate(tournament.date)}</span>
                        </div>
                      </div>
                      <div className="detail-item">
                        <Clock size={18} className="detail-icon" />
                        <div className="detail-text">
                          <span className="detail-val">{tournament.time || '6:00 PM'}</span>
                        </div>
                      </div>
                      <div className="detail-item">
                        <MapPin size={18} className="detail-icon" />
                        <div className="detail-text">
                          <span className="detail-val">{tournament.location || 'Washougal Eagles Club'}</span>
                          {(tournament.location === 'Washougal Eagles Club' || !tournament.location) && (
                            <span className="detail-sub">1910 Main St, Washougal, WA 98671</span>
                          )}
                        </div>
                      </div>
                      <div className="detail-item">
                        <DollarSign size={18} className="detail-icon" />
                        <div className="detail-text">
                          <span className="detail-val">${tournament.buyInAmount} Buy-In (includes ${tournament.dealerAppreciationAmount} ToC & ${tournament.bountyAmount} Bounty)</span>
                        </div>
                      </div>
                      <div className="detail-item">
                        <Coins size={18} className="detail-icon" />
                        <div className="detail-text">
                          <span className="detail-val">{tournament.startingStack || '20,000 Starting Chips'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Column 2 */}
                    <div className="details-col">

                      <div className="detail-item">
                        <Zap size={18} className="detail-icon" />
                        <div className="detail-text">
                          <span className="detail-val">On-Time Bonus for 5,000 chips</span>
                        </div>
                      </div>

                      {tournament.dealerAppreciationAmount > 0 && (
                        <div className="detail-item">
                          <Handshake size={18} className="detail-icon" />
                          <div className="detail-text">
                            <span className="detail-val">${tournament.dealerAppreciationAmount} Dealer Appreciation for 5,000 chips</span>
                          </div>
                        </div>
                      )}

                      {tournament.addonAmount > 0 && (
                        <div className="detail-item">
                          <Plus size={18} className="detail-icon" />
                          <div className="detail-text">
                            <span className="detail-val">${tournament.addonAmount} Add-on at First Break for {(tournament.addonChips || 15000).toLocaleString()} chips</span>
                          </div>
                        </div>
                      )}
                      <div className="detail-item">
                        <Timer size={18} className="detail-icon" />
                        <div className="detail-text">
                          <span className="detail-val">{tournament.roundLength || 15} minute levels</span>
                        </div>
                      </div>
                      <div className="detail-item">
                        <RefreshCcw size={18} className="detail-icon" />
                        <div className="detail-text">
                          <span className="detail-val">{tournament.rebuys || 'None — this is a freezeout format'}</span>
                        </div>
                      </div>
                      <div className="detail-item">
                        <AlarmClock size={18} className="detail-icon" />
                        <div className="detail-text">
                          <span className="detail-val">{tournament.lateEntry || 'Allowed through the end of Round 2'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="event-card-actions">
                    <button 
                      className="btn btn-primary btn-see-details"
                      onClick={() => handleSeeDetails(tournament.id)}
                    >
                      See Details and Sign Up
                    </button>
                  </div>

                  {(() => {
                    const flyerInfo = getEmbeddableFlyerUrl(tournament.flyerUrl || '', tournament.flyerType);
                    if (!flyerInfo.url) return null;

                    return (
                      <div style={{
                        marginTop: '20px',
                        paddingTop: '20px',
                        borderTop: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                        width: '100%'
                      }}>
                        {flyerInfo.type === 'iframe' ? (
                          <iframe 
                            src={flyerInfo.url} 
                            width="100%" 
                            height="550px" 
                            style={{
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.05)',
                              maxWidth: '850px'
                            }}
                            allow="autoplay"
                          />
                        ) : flyerInfo.type === 'image' ? (
                          <img 
                            src={flyerInfo.url} 
                            alt={`${tournament.name} Flyer`}
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: '500px',
                              borderRadius: '8px', 
                              border: '1px solid rgba(255, 255, 255, 0.05)'
                            }} 
                          />
                        ) : (
                          <object
                            data={flyerInfo.url}
                            type="application/pdf"
                            width="100%"
                            height="500px"
                            style={{
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.05)',
                              maxWidth: '750px'
                            }}
                          >
                            <div style={{ textAlign: 'center', padding: '10px' }}>
                              <a 
                                href={flyerInfo.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="btn btn-secondary"
                                style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem' }}
                              >
                                View PDF Flyer
                              </a>
                            </div>
                          </object>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
