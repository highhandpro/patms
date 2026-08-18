import React from 'react';
import { useApp } from '../context/AppContext';
import { PlayerBanner } from '../components/PlayerBanner';
import { Calendar, Clock, MapPin, DollarSign, Coins, Timer, RefreshCcw, AlarmClock, Zap, Plus } from 'lucide-react';
import { getEmbeddableFlyerUrl } from '../utils/flyer';

interface PlayerEventsProps {
  loggedInMemberId: string | null;
  onOpenLogin: () => void;
}

const abbreviateTournamentName = (name: string): string => {
  const match = name.match(/Season\s+(\d+)\s*,?\s*Game\s+(\d+)/i);
  if (match) {
    return `S${match[1]}-G${match[2]}`;
  }
  return name;
};

export const PlayerEvents: React.FC<PlayerEventsProps> = ({
  loggedInMemberId,
  onOpenLogin
}) => {
  const { state, registerPlayer, unregisterPlayer, registerDinnerPlayer, unregisterDinnerPlayer } = useApp();

  // Filter for upcoming tournaments (exclude Beta/TD-only/Archived games)
  const upcomingTournaments = state.tournaments
    .filter(t => t.status !== 'completed' && !t.name.toLowerCase().includes('beta') && !t.isBetaTest && !t.isArchived && !t.isTDOnly)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return dateStr;
  };

  const getMemberInitials = (memberId: string) => {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return { full: 'Unknown Player', display: 'Unknown' };
    const first = member.firstName.trim();
    const lastInitial = member.lastName.trim().charAt(0);
    const display = lastInitial ? `${first} ${lastInitial.toUpperCase()}.` : first;
    return { full: `${member.firstName} ${member.lastName}`, display };
  };

  return (
    <div className="player-page player-events-page animate-fade-in">
      <PlayerBanner>
        <h1 className="banner-title">Upcoming Events</h1>
      </PlayerBanner>

      <div className="player-page-content" style={{ padding: '24px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {upcomingTournaments.length === 0 ? (
            <div className="no-events-card glass-card" style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No upcoming tournaments scheduled at this time. Check back later!</p>
            </div>
          ) : (
            upcomingTournaments.map((tournament) => {
              const totalSeats = tournament.maxPlayers || 24;
              const regCount = tournament.entries.length;
              const seatsAvailable = Math.max(0, totalSeats - regCount);
              const waitlistCount = Math.max(0, regCount - totalSeats);
              
              const userEntryIndex = loggedInMemberId 
                ? tournament.entries.findIndex(e => e.memberId === loggedInMemberId) 
                : -1;
              const isUserRegistered = userEntryIndex !== -1;
              const isUserWaitlisted = isUserRegistered && userEntryIndex >= totalSeats;

              // Registered entries sorting (active seats first, alphabetically)
              const registeredEntries = tournament.entries.slice(0, totalSeats);
              const sortedRegistered = [...registeredEntries].sort((a, b) => {
                const nameA = getMemberInitials(a.memberId).display.toLowerCase();
                const nameB = getMemberInitials(b.memberId).display.toLowerCase();
                return nameA.localeCompare(nameB);
              });
              const registeredHalf = Math.ceil(sortedRegistered.length / 2);
              const registeredCol1 = sortedRegistered.slice(0, registeredHalf);
              const registeredCol2 = sortedRegistered.slice(registeredHalf);

              // Waitlisted entries (chronological)
              const waitlistEntries = tournament.entries.slice(totalSeats);
              const sortedWaitlist = [...waitlistEntries].sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return timeA - timeB;
              });

              const flyerInfo = getEmbeddableFlyerUrl(tournament.flyerUrl || '', tournament.flyerType);

              return (
                <div 
                  key={tournament.id} 
                  className="glass-card animate-slide-up"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '32px',
                    padding: '24px',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '1200px',
                    margin: '0 auto',
                    alignItems: 'stretch'
                  }}
                >
                  {/* Left Column: Flyer Image or Felt Placeholder */}
                  <div style={{
                    flex: '1 1 380px',
                    maxWidth: '100%',
                    position: 'relative',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1.5px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '420px',
                    background: flyerInfo.url 
                      ? 'rgba(0,0,0,0.15)'
                      : 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(3,48,22,0.95) 100%), url("/bg-felt.png")',
                    backgroundSize: 'cover'
                  }}>
                    {flyerInfo.url ? (
                      flyerInfo.type === 'image' ? (
                        <img 
                          src={flyerInfo.url} 
                          alt={`${tournament.name} Flyer`} 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            display: 'block', 
                            objectFit: 'contain',
                            position: 'absolute',
                            top: 0,
                            left: 0
                          }}
                        />
                      ) : (
                        <iframe 
                          src={flyerInfo.url} 
                          width="100%" 
                          height="100%" 
                          style={{
                            borderRadius: '12px',
                            border: 'none',
                            display: 'block',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%'
                          }}
                          allow="autoplay"
                        />
                      )
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px' }}>
                        <img 
                          src="/club-logo.png" 
                          alt="Logo" 
                          style={{ width: '180px', height: 'auto', opacity: 0.85, marginBottom: '20px' }} 
                        />
                        <p style={{ margin: 0, fontWeight: 800, color: 'var(--color-gold)', fontSize: '1.2rem' }}>
                          {tournament.name}
                        </p>
                        <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                          {formatDate(tournament.date)}
                        </p>
                      </div>
                    )}
                    
                    {/* Game Code Badge overlay (Top-Right) */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      backgroundColor: 'rgba(0, 0, 0, 0.75)',
                      backdropFilter: 'blur(4px)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      letterSpacing: '0.05em'
                    }}>
                      {abbreviateTournamentName(tournament.name)}
                    </div>
                  </div>

                  {/* Right Column: Title, Details Grid, RSVP Status & Registered Players */}
                  <div style={{
                    flex: '1 1 500px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '20px'
                  }}>
                    {/* Header */}
                    <div>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                        {tournament.name} — {formatDate(tournament.date)}
                      </h2>
                      <div style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.95rem', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span>{Math.min(regCount, totalSeats)} registered</span>
                        <span>|</span>
                        <span>{seatsAvailable} seats available</span>
                        {waitlistCount > 0 && (
                          <>
                            <span>|</span>
                            <span style={{ color: 'var(--color-gold)' }}>{waitlistCount} waitlisted</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Details Box (Grid) */}
                    <div style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '20px',
                      color: '#1f2937',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '16px 24px'
                    }}>
                      {/* Date */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: '220px', flex: '1 1 45%' }}>
                        <Calendar size={18} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DATE</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1f2937' }}>{formatDate(tournament.date)}</span>
                        </div>
                      </div>

                      {/* Starting Stack */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: '220px', flex: '1 1 45%' }}>
                        <Coins size={18} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>STARTING STACK</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1f2937' }}>{tournament.startingStack || '20,000 Starting Chips'}</span>
                        </div>
                      </div>

                      {/* Time */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: '220px', flex: '1 1 45%' }}>
                        <Clock size={18} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TIME</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1f2937' }}>{tournament.time || '11:45 AM'}</span>
                        </div>
                      </div>

                      {/* On-Time Bonus */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: '220px', flex: '1 1 45%' }}>
                        <Zap size={18} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ON-TIME BONUS</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1f2937' }}>+5,000 chips (Must RSVP & Arrive On Time)</span>
                        </div>
                      </div>

                      {/* Location */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: '220px', flex: '1 1 45%' }}>
                        <MapPin size={18} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LOCATION</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1f2937' }}>{tournament.location || 'Washougal Eagles Club'}</span>
                        </div>
                      </div>

                      {/* Add-on */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: '220px', flex: '1 1 45%' }}>
                        <Plus size={18} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>+${tournament.addonAmount} ADD-ON AT 1ST BREAK</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1f2937' }}>+{(tournament.addonChips || 15000).toLocaleString()} chips</span>
                        </div>
                      </div>

                      {/* Buy-in */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: '220px', flex: '1 1 45%' }}>
                        <DollarSign size={18} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>BUY-IN</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1f2937' }}>${tournament.buyInAmount} (includes ${tournament.dealerAppreciationAmount} ToC & ${tournament.bountyAmount} Bounty)</span>
                        </div>
                      </div>

                      {/* Rebuy Rules */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: '220px', flex: '1 1 45%' }}>
                        <RefreshCcw size={18} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>REBUY RULES</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1f2937' }}>{tournament.rebuys || 'None — Freeze out'}</span>
                        </div>
                      </div>

                      {/* Rounds */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: '220px', flex: '1 1 45%' }}>
                        <Timer size={18} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ROUNDS</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1f2937' }}>{tournament.roundLength || 15} minute levels</span>
                        </div>
                      </div>

                      {/* Late Entry */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: '220px', flex: '1 1 45%' }}>
                        <AlarmClock size={18} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LATE ENTRY</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1f2937' }}>{tournament.lateEntry || 'Through end of Round 2'}</span>
                        </div>
                      </div>
                    </div>

                    {/* RSVP Status / Button row */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px 20px',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1.5px solid var(--border-subtle)',
                      borderRadius: '12px',
                      gap: '12px',
                      flexWrap: 'wrap'
                    }}>
                      {!loggedInMemberId ? (
                        <>
                          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>You must register online for this game.</span>
                          <button 
                            onClick={onOpenLogin} 
                            className="btn btn-primary" 
                            style={{ backgroundColor: 'var(--color-emerald)', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            REGISTER NOW
                          </button>
                        </>
                      ) : isUserRegistered ? (
                        <>
                          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: isUserWaitlisted ? 'var(--color-gold)' : 'var(--color-emerald)' }}>
                            {isUserWaitlisted ? '✓ You are waitlisted for this game.' : '✓ You are registered for this game.'}
                          </span>
                          <button 
                            onClick={() => unregisterPlayer(tournament.id, loggedInMemberId)} 
                            className="btn btn-danger"
                            style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            CANCEL RSVP
                          </button>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>You are not registered for this game.</span>
                          <button 
                            onClick={() => registerPlayer(tournament.id, loggedInMemberId)} 
                            className="btn btn-primary" 
                            style={{ 
                              backgroundColor: seatsAvailable === 0 ? 'rgba(16, 185, 129, 0.2)' : 'var(--color-emerald)', 
                              padding: '10px 20px', 
                              borderRadius: '8px', 
                              fontWeight: 700, 
                              cursor: 'pointer' 
                            }}
                          >
                            {seatsAvailable === 0 ? 'JOIN WAITLIST' : 'REGISTER NOW'}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Dinner RSVP Toggle Bar */}
                    {tournament.hasDinnerRSVP && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px 20px',
                        backgroundColor: 'rgba(59, 130, 246, 0.05)',
                        border: '1.5px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '12px',
                        gap: '12px',
                        flexWrap: 'wrap',
                        marginTop: '12px'
                      }}>
                        {!loggedInMemberId ? (
                          <>
                            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              Reserve your spot for the {tournament.dinnerItemName || 'Dinner'}.
                            </span>
                            <button 
                              onClick={onOpenLogin} 
                              className="btn btn-primary" 
                              style={{ backgroundColor: 'var(--color-primary-blue, #0284c7)', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', border: 'none' }}
                            >
                              Diner RSVP
                            </button>
                          </>
                        ) : tournament.dinnerReservations?.includes(loggedInMemberId) ? (
                          <>
                            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-emerald)' }}>
                              ✓ You are RSVP'd for the {tournament.dinnerItemName || 'Dinner'}!
                            </span>
                            <button 
                              onClick={() => {
                                if (loggedInMemberId) {
                                  unregisterDinnerPlayer(tournament.id, loggedInMemberId);
                                }
                              }} 
                              className="btn btn-danger"
                              style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              CANCEL DINER RSVP
                            </button>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              You are not signed up for the {tournament.dinnerItemName || 'Dinner'}.
                            </span>
                            <button 
                              onClick={() => {
                                if (loggedInMemberId) {
                                  registerDinnerPlayer(tournament.id, loggedInMemberId);
                                }
                              }} 
                              className="btn btn-primary" 
                              style={{ 
                                backgroundColor: 'var(--color-primary-blue, #0284c7)', 
                                color: '#ffffff',
                                padding: '10px 20px', 
                                borderRadius: '8px', 
                                fontWeight: 700, 
                                cursor: 'pointer',
                                border: 'none'
                              }}
                            >
                              Diner RSVP
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Registered Players white box */}
                    <div style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '20px',
                      color: '#1f2937'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#1f2937' }}>Registered Players</h3>
                        <span style={{ fontSize: '0.9rem', color: seatsAvailable === 0 ? 'var(--color-gold)' : '#10b981', fontWeight: 700 }}>
                          {Math.min(regCount, totalSeats)} / {totalSeats} Seats Filled
                        </span>
                      </div>

                      {registeredEntries.length === 0 ? (
                        <div style={{ padding: '12px 0', textAlign: 'center', color: '#9ca3af' }}>
                          <p style={{ margin: 0, fontSize: '0.9rem' }}>No players registered yet.</p>
                        </div>
                      ) : (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px 16px'
                        }}>
                          {/* Column 1 */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {registeredCol1.map((entry, index) => {
                              const info = getMemberInitials(entry.memberId);
                              const memberObj = state.members.find(m => m.id === entry.memberId);
                              const logoUrl = memberObj?.logoUrl;
                              return (
                                <div key={entry.memberId} style={{
                                  backgroundColor: '#f9fafb',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '6px',
                                  padding: '6px 8px',
                                  fontSize: '0.8rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  color: '#374151'
                                }}>
                                  <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.75rem', width: '16px' }}>{index + 1}</span>
                                  {logoUrl && (
                                    <img 
                                      src={logoUrl} 
                                      alt="Logo" 
                                      style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e5e7eb', flexShrink: 0 }} 
                                    />
                                  )}
                                  <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info.full}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Column 2 */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {registeredCol2.map((entry, index) => {
                              const info = getMemberInitials(entry.memberId);
                              const memberObj = state.members.find(m => m.id === entry.memberId);
                              const logoUrl = memberObj?.logoUrl;
                              return (
                                <div key={entry.memberId} style={{
                                  backgroundColor: '#f9fafb',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '6px',
                                  padding: '6px 8px',
                                  fontSize: '0.8rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  color: '#374151'
                                }}>
                                  <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.75rem', width: '16px' }}>{registeredHalf + index + 1}</span>
                                  {logoUrl && (
                                    <img 
                                      src={logoUrl} 
                                      alt="Logo" 
                                      style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e5e7eb', flexShrink: 0 }} 
                                    />
                                  )}
                                  <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info.full}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Waitlist Box (only shown if waitlisted entries exist) */}
                    {sortedWaitlist.length > 0 && (
                      <div style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '20px',
                        color: '#1f2937'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '12px' }}>
                          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--color-gold)' }}>Waitlist</h3>
                          <span style={{ fontSize: '0.9rem', color: 'var(--color-gold)', fontWeight: 700 }}>
                            {sortedWaitlist.length} Player{sortedWaitlist.length === 1 ? '' : 's'} Waiting
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {sortedWaitlist.map((entry, index) => {
                            const info = getMemberInitials(entry.memberId);
                            const memberObj = state.members.find(m => m.id === entry.memberId);
                            const logoUrl = memberObj?.logoUrl;
                            return (
                              <div key={entry.memberId} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                backgroundColor: '#fdfbf7',
                                border: '1px solid #fef3c7',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                color: '#374151'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ color: 'var(--color-gold)', fontWeight: 700 }}>{index + 1}.</span>
                                  {logoUrl && (
                                    <img 
                                      src={logoUrl} 
                                      alt="Logo" 
                                      style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #fef3c7', flexShrink: 0 }} 
                                    />
                                  )}
                                  <span style={{ fontWeight: 600 }}>{info.full}</span>
                                </div>
                                {entry.createdAt && (
                                  <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                                    {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Dinner Reservation List Box */}
                    {tournament.hasDinnerRSVP && (
                      <div style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '20px',
                        color: '#1f2937',
                        marginTop: '12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '12px' }}>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#1f2937' }}>
                            {tournament.dinnerItemName || 'Dinner'} - Reservation List
                          </h3>
                          <span style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 700 }}>
                            {(tournament.dinnerReservations || []).length} RSVP'd
                          </span>
                        </div>

                        {(!tournament.dinnerReservations || tournament.dinnerReservations.length === 0) ? (
                          <div style={{ padding: '12px 0', textAlign: 'center', color: '#9ca3af' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>No reservations yet.</p>
                          </div>
                        ) : (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '8px 16px'
                          }}>
                            {/* Sort members alphabetically */}
                            {(() => {
                              const reservedMembers = (tournament.dinnerReservations || [])
                                .map(id => {
                                  const m = state.members.find(member => member.id === id);
                                  return {
                                    id,
                                    name: m ? `${m.firstName} ${m.lastName}` : 'Unknown Player',
                                    logoUrl: m?.logoUrl
                                  };
                                })
                                .sort((a, b) => a.name.localeCompare(b.name));

                              const half = Math.ceil(reservedMembers.length / 2);
                              const col1 = reservedMembers.slice(0, half);
                              const col2 = reservedMembers.slice(half);

                              return (
                                <>
                                  {/* Column 1 */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {col1.map((p, idx) => (
                                      <div key={p.id} style={{
                                        backgroundColor: '#f9fafb',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '6px',
                                        padding: '6px 8px',
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        color: '#374151'
                                      }}>
                                        <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.75rem', width: '16px' }}>{idx + 1}</span>
                                        {p.logoUrl && (
                                          <img 
                                            src={p.logoUrl} 
                                            alt="Logo" 
                                            style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e5e7eb', flexShrink: 0 }} 
                                          />
                                        )}
                                        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Column 2 */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {col2.map((p, idx) => (
                                      <div key={p.id} style={{
                                        backgroundColor: '#f9fafb',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '6px',
                                        padding: '6px 8px',
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        color: '#374151'
                                      }}>
                                        <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.75rem', width: '16px' }}>{half + idx + 1}</span>
                                        {p.logoUrl && (
                                          <img 
                                            src={p.logoUrl} 
                                            alt="Logo" 
                                            style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e5e7eb', flexShrink: 0 }} 
                                          />
                                        )}
                                        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
