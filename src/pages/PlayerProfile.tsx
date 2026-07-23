import React from 'react';
import { useApp } from '../context/AppContext';
import { PlayerBanner } from '../components/PlayerBanner';
import { calculateMemberStats } from '../utils/stats';
import { User, Mail, Phone, Trophy, Award, Hash } from 'lucide-react';

interface PlayerProfileProps {
  setActiveTab: (tab: string) => void;
  loggedInMemberId: string | null;
}

export const PlayerProfile: React.FC<PlayerProfileProps> = ({
  setActiveTab,
  loggedInMemberId
}) => {
  const { state, activeSeason } = useApp();

  if (!loggedInMemberId) {
    return (
      <div className="player-page animate-fade-in" style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-primary)' }}>Please log in to view your profile</h2>
        <button className="btn btn-secondary" onClick={() => setActiveTab('events')} style={{ marginTop: '20px' }}>
          <span>Back to Events</span>
        </button>
      </div>
    );
  }

  const member = state.members.find(m => m.id === loggedInMemberId);
  if (!member) {
    return (
      <div className="player-page animate-fade-in" style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-primary)' }}>Profile not found</h2>
      </div>
    );
  }

  // Calculate member stats dynamically
  const stats = calculateMemberStats(state, member.id);
  const displayName = `${member.firstName} ${member.lastName}`;

  return (
    <div className="player-page player-profile-page animate-fade-in">
      <PlayerBanner>
        <div className="banner-details-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {member.logoUrl ? (
            <img 
              src={member.logoUrl} 
              alt="Player Logo" 
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                objectFit: 'cover',
                marginBottom: '16px',
                border: '3px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
              }}
            />
          ) : (
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '50%',
              width: '120px',
              height: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              border: '3px solid rgba(255,255,255,0.3)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
            }}>
              <User size={64} style={{ color: 'white' }} />
            </div>
          )}
          <h1 className="banner-title text-center">{displayName}</h1>
          <p className="banner-subtitle text-center" style={{ marginBottom: '0px' }}>ID: {member.id}</p>
        </div>
      </PlayerBanner>

      <div className="player-page-content">
        
        {/* Profile Details & Stats */}
        <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
          
          {/* Left Column: Contact details & Tickets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'fit-content' }}>
            <div className="contact-details-panel glass-card" style={{ height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px' }}>Contact Details</h3>
              <div className="contact-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="contact-item" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Mail size={18} style={{ color: 'var(--text-secondary)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{member.email || 'No email registered'}</span>
                  </div>
                </div>
                <div className="contact-item" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Phone size={18} style={{ color: 'var(--text-secondary)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{member.phone || 'No phone registered'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Season Drawing Tickets Section */}
            {activeSeason && (
              <div className="glass-card" style={{ height: 'fit-content' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Season Drawing Tickets</h3>
                {(() => {
                  const seasonTickets = (member.drawingTickets || []).filter(t => t.seasonId === activeSeason.id);
                  return (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Tickets Earned ({activeSeason.name}):</span>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--color-emerald)' }}>{seasonTickets.length}</strong>
                      </div>
                      
                      {seasonTickets.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                          {seasonTickets.map(t => (
                            <div 
                              key={t.id} 
                              style={{ 
                                padding: '8px 10px', 
                                backgroundColor: 'rgba(255,255,255,0.01)', 
                                borderRadius: '8px', 
                                border: '1px solid var(--border-subtle)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ 
                                  fontSize: '0.7rem', 
                                  fontWeight: 700, 
                                  textTransform: 'uppercase', 
                                  padding: '2px 6px', 
                                  borderRadius: '4px',
                                  backgroundColor: t.reason === 'setup' ? 'rgba(59,130,246,0.15)' : 
                                                   t.reason === 'teardown' ? 'rgba(139,92,246,0.15)' : 
                                                   t.reason === 'dealing' ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
                                  color: t.reason === 'setup' ? '#60a5fa' : 
                                         t.reason === 'teardown' ? '#a78bfa' : 
                                         t.reason === 'dealing' ? '#34d399' : '#9ca3af'
                                }}>
                                  {t.reason}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                  {new Date(t.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              {t.note && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{t.note}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
                          No tickets earned this season yet.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Right Column: Statistics Grid & Recent Finishes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Stats Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div className="glass-card stat-card" style={{ textAlign: 'center' }}>
                <Hash size={24} style={{ color: 'var(--text-secondary)', margin: '0 auto 8px auto' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Games Played</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.played}</span>
              </div>
              <div className="glass-card stat-card" style={{ textAlign: 'center', borderLeft: '3px solid var(--color-emerald)' }}>
                <Trophy size={24} style={{ color: 'var(--color-emerald)', margin: '0 auto 8px auto' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Wins</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-emerald)' }}>{stats.wins}</span>
              </div>
              <div className="glass-card stat-card" style={{ textAlign: 'center', borderLeft: '3px solid var(--color-gold)' }}>
                <Trophy size={24} style={{ color: 'var(--color-gold)', margin: '0 auto 8px auto' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Total Payout</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-gold)' }}>${stats.earnings}</span>
              </div>
              <div className="glass-card stat-card" style={{ textAlign: 'center' }}>
                <Award size={24} style={{ color: 'var(--color-gold)', margin: '0 auto 8px auto' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Total Points</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-gold)' }}>{stats.points}</span>
              </div>
            </div>

            {/* Detailed Performance stats */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Detailed Performance</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', textAlign: 'center' }}>
                <div style={{ borderRight: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Top 10 Finishes</span>
                  <strong style={{ display: 'block', fontSize: '1.4rem', color: 'var(--text-primary)', marginTop: '4px' }}>{stats.top10}</strong>
                </div>
                <div style={{ borderRight: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Bounties Collected</span>
                  <strong style={{ display: 'block', fontSize: '1.4rem', color: 'var(--text-primary)', marginTop: '4px' }}>{stats.bounties}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Average Finish</span>
                  <strong style={{ display: 'block', fontSize: '1.4rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                    {stats.avgFinish > 0 ? `#${stats.avgFinish}` : '-'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Recent Finishes History */}
            {stats.recentFinishes.length > 0 && (
              <div className="glass-card">
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Recent Game History</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Placement positions in your last 5 tournaments (newest first):
                </p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {stats.recentFinishes.map((pos, idx) => {
                    const isWin = pos === 1;
                    const isTop3 = pos <= 3;
                    return (
                      <div 
                        key={idx}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '1.1rem',
                          background: isWin 
                            ? 'var(--color-emerald)' 
                            : (isTop3 ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)'),
                          color: isWin 
                            ? '#052e16' 
                            : (isTop3 ? 'var(--color-gold)' : 'var(--text-primary)'),
                          border: isTop3 
                            ? '1px solid var(--color-gold)' 
                            : '1px solid var(--border-subtle)'
                        }}
                        title={`Finished #${pos}`}
                      >
                        #{pos}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {member.cardUrl && (
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>My Custom Member Card</h3>
                <img 
                  src={member.cardUrl} 
                  alt="Custom Member Card" 
                  style={{ 
                    width: '240px', 
                    height: '420px', 
                    borderRadius: '12px', 
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    objectFit: 'cover',
                    display: 'block'
                  }} 
                />
              </div>
            )}

          </div>

        </div>

        {/* Page Footer */}
        <footer className="player-page-footer">
          <p>© 2026 Tim Hufler. All rights reserved.</p>
        </footer>

      </div>
    </div>
  );
};
