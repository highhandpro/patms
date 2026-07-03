import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PlayerBanner } from '../components/PlayerBanner';
import { Calendar, Clock, MapPin, DollarSign, Coins, Timer, RefreshCcw, AlarmClock, ArrowLeft, Zap, Handshake, Plus, Monitor } from 'lucide-react';
import type { Member } from '../types';
import { getEmbeddableFlyerUrl } from '../utils/flyer';
import { SeatingDisplayModal } from '../components/SeatingDisplayModal';

interface PlayerEventDetailsProps {
  setActiveTab: (tab: string) => void;
  tournamentId: string | null;
  loggedInMemberId: string | null;
}

export const PlayerEventDetails: React.FC<PlayerEventDetailsProps> = ({
  setActiveTab,
  tournamentId,
  loggedInMemberId
}) => {
  const { state, registerPlayer, unregisterPlayer, publicRegisterPlayer } = useApp();
  
  const [phone, setPhone] = useState('');
  const [memberIdInput, setMemberIdInput] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [memberFound, setMemberFound] = useState<Member | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDisplayModeOpen, setIsDisplayModeOpen] = useState(false);

  useEffect(() => {
    if (loggedInMemberId) {
      const member = state.members.find(m => m.id === loggedInMemberId);
      if (member) {
        setMemberFound(member);
        setFirstName(member.firstName);
        setLastName(member.lastName);
        setEmail(member.email);
        setPhone(member.phone);
        setMemberIdInput(member.id);
      }
    }
  }, [loggedInMemberId, state.members]);

  const tournament = state.tournaments.find(t => t.id === tournamentId);

  if (!tournament) {
    return (
      <div className="player-page animate-fade-in" style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-primary)' }}>Event not found</h2>
        <button className="btn btn-secondary" onClick={() => setActiveTab('events')} style={{ marginTop: '20px' }}>
          <ArrowLeft size={16} />
          <span>Back to Events</span>
        </button>
      </div>
    );
  }

  const regCount = tournament.entries.length;
  const totalSeats = tournament.maxPlayers || 24;
  const seatsAvailable = Math.max(0, totalSeats - regCount);
  const waitlistCount = Math.max(0, regCount - totalSeats);

  const isUserRegistered = loggedInMemberId 
    ? tournament.entries.some(e => e.memberId === loggedInMemberId) 
    : false;

  const handleRegisterToggle = () => {
    if (!loggedInMemberId) return;
    if (isUserRegistered) {
      unregisterPlayer(tournament.id, loggedInMemberId);
    } else {
      registerPlayer(tournament.id, loggedInMemberId);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Get name and display format for each entry
  const getMemberInitials = (memberId: string) => {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return { full: 'Unknown Player', display: 'Unknown' };
    const first = member.firstName.trim();
    const lastInitial = member.lastName.trim().charAt(0);
    const display = lastInitial ? `${first} ${lastInitial.toUpperCase()}.` : first;
    return { full: `${member.firstName} ${member.lastName}`, display };
  };

  // Divide entries into registered and waitlisted
  const registeredEntries = tournament.entries.slice(0, totalSeats);
  const waitlistedEntries = tournament.entries.slice(totalSeats);

  // Registered players sorted alphabetically
  const sortedRegistered = [...registeredEntries].sort((a, b) => {
    const nameA = getMemberInitials(a.memberId).display.toLowerCase();
    const nameB = getMemberInitials(b.memberId).display.toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const registeredHalf = Math.ceil(sortedRegistered.length / 2);
  const registeredCol1 = sortedRegistered.slice(0, registeredHalf);
  const registeredCol2 = sortedRegistered.slice(registeredHalf);

  // Waitlist sorted chronologically by registration date
  const sortedWaitlist = [...waitlistedEntries].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });

  // Phone formatting helper
  const formatPhoneNumber = (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `(${clean.slice(0, 3)}) ${clean.slice(3)}`;
    return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6, 10)}`;
  };

  // Phone input lookup
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);

    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 10) {
      // Find matching member
      const member = state.members.find(m => m.phone.replace(/\D/g, '') === clean);
      if (member) {
        setMemberFound(member);
        setFirstName(member.firstName);
        setLastName(member.lastName);
        setEmail(member.email);
        setMemberIdInput(member.id);
        setErrorMessage(null);
      } else {
        setMemberFound(null);
        setErrorMessage(null);
      }
    } else {
      if (memberFound) {
        setMemberFound(null);
        setFirstName('');
        setLastName('');
        setEmail('');
        setMemberIdInput('');
      }
    }
  };

  // Member ID input lookup
  const handleMemberIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim().toUpperCase();
    setMemberIdInput(val);

    if (val) {
      const member = state.members.find(m => m.id.toUpperCase() === val);
      if (member) {
        setMemberFound(member);
        setFirstName(member.firstName);
        setLastName(member.lastName);
        setEmail(member.email);
        setPhone(formatPhoneNumber(member.phone));
        setErrorMessage(null);
      } else {
        if (memberFound) {
          setMemberFound(null);
          setFirstName('');
          setLastName('');
          setEmail('');
          setPhone('');
        }
      }
    } else {
      if (memberFound) {
        setMemberFound(null);
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
      }
    }
  };

  // Submit RSVP handler
  const handleSubmitRSVP = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    const hasMemberId = !!memberIdInput.trim();

    if (!hasMemberId) {
      if (!cleanPhone || cleanPhone.length !== 10) {
        setErrorMessage('Please enter a valid 10-digit phone number.');
        return;
      }
    }
    if (!firstName.trim()) {
      setErrorMessage('Please enter your first name.');
      return;
    }
    if (!lastName.trim()) {
      setErrorMessage('Please enter your last name.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    // Register player
    publicRegisterPlayer(tournament.id, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      memberId: memberIdInput.trim() || undefined
    });

    setSubmitSuccess(true);
    setErrorMessage(null);

    // Clear form inputs
    setPhone('');
    setMemberIdInput('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setMemberFound(null);
  };

  return (
    <div className="player-page player-event-details-page animate-fade-in">
      <PlayerBanner>
        <div className="banner-details-container">
          <h1 className="banner-title text-center">{tournament.name}</h1>
          <p className="banner-subtitle text-center">{formatDate(tournament.date)}</p>


          {/* Registration Status Action Panel */}
          <div className="banner-action-panel">
            {loggedInMemberId ? (
              <div className="action-status-container">
                {isUserRegistered ? (
                  <>
                    <span className="status-text">You're registered for this event. No longer available?</span>
                    <button className="btn btn-cancel-reg" onClick={handleRegisterToggle}>
                      Cancel Registration
                    </button>
                  </>
                ) : (
                  <>
                    <span className="status-text">You are not registered for this event. Want to join?</span>
                    <button className="btn btn-primary btn-signup-reg" onClick={handleRegisterToggle} disabled={seatsAvailable === 0}>
                      {seatsAvailable === 0 ? 'Event Full' : 'Sign Up Now'}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="action-status-container">
                <span className="status-text" style={{ fontWeight: 600 }}>Use the RSVP / Sign Up form below to register instantly!</span>
              </div>
            )}
          </div>

          {/* Seat Status Counter */}
          <p className="banner-seats-left text-center" style={{ margin: '8px 0 0 0', fontSize: '1.05rem', fontWeight: 600 }}>
            {seatsAvailable} of {totalSeats} seats available {waitlistCount > 0 && <span style={{ color: 'var(--color-gold)' }}>({waitlistCount} waitlisted)</span>}
          </p>
        </div>
      </PlayerBanner>

      <div className="player-page-content">
        

        {/* Details Grid & Registered Table */}
        <div className="details-grid-container">
          
          {/* Section 1: Tournament Metrics (8 items) */}
          <div className="event-metrics-panel">
            <div className="metrics-grid">
              <div className="metric-cell">
                <Calendar size={20} className="metric-icon" />
                <div className="metric-info">
                  <span className="metric-label">Date</span>
                  <span className="metric-value">{formatDate(tournament.date)}</span>
                </div>
              </div>
              <div className="metric-cell">
                <Clock size={20} className="metric-icon" />
                <div className="metric-info">
                  <span className="metric-label">Time</span>
                  <span className="metric-value">{tournament.time || '6:00 PM'}</span>
                </div>
              </div>
              <div className="metric-cell">
                <MapPin size={20} className="metric-icon" />
                <div className="metric-info">
                  <span className="metric-label">Location</span>
                  <span className="metric-value">{tournament.location || 'Washougal Eagles Club'}</span>
                  {(tournament.location === 'Washougal Eagles Club' || !tournament.location) && (
                    <span className="metric-subtext">1910 Main St, Washougal, WA 98671</span>
                  )}
                </div>
              </div>
              <div className="metric-cell">
                <DollarSign size={20} className="metric-icon" />
                <div className="metric-info">
                  <span className="metric-label">Buy-in</span>
                  <span className="metric-value">${tournament.buyInAmount} Buy-In (includes ${tournament.dealerAppreciationAmount} ToC & ${tournament.bountyAmount} Bounty)</span>
                </div>
              </div>
              <div className="metric-cell">
                <Coins size={20} className="metric-icon" />
                <div className="metric-info">
                  <span className="metric-label">Starting Stack</span>
                  <span className="metric-value">{tournament.startingStack || '20,000 Starting Chips'}</span>
                </div>
              </div>
              <div className="metric-cell">
                <Zap size={20} className="metric-icon" />
                <div className="metric-info">
                  <span className="metric-label">On-Time Bonus</span>
                  <span className="metric-value">for 5,000 chips</span>
                </div>
              </div>
              {tournament.dealerAppreciationAmount > 0 && (
                <div className="metric-cell">
                  <Handshake size={20} className="metric-icon" />
                  <div className="metric-info">
                    <span className="metric-label">Dealer Appreciation</span>
                    <span className="metric-value">${tournament.dealerAppreciationAmount} for 5,000 chips</span>
                  </div>
                </div>
              )}
              {tournament.addonAmount > 0 && (
                <div className="metric-cell">
                  <Plus size={20} className="metric-icon" />
                  <div className="metric-info">
                    <span className="metric-label">Add-on</span>
                    <span className="metric-value">${tournament.addonAmount} for +{(tournament.addonChips || 15000).toLocaleString()} chips</span>
                  </div>
                </div>
              )}
              <div className="metric-cell">
                <Timer size={20} className="metric-icon" />
                <div className="metric-info">
                  <span className="metric-label">Rounds</span>
                  <span className="metric-value">{tournament.roundLength || 15} minute levels</span>
                </div>
              </div>
              <div className="metric-cell">
                <RefreshCcw size={20} className="metric-icon" />
                <div className="metric-info">
                  <span className="metric-label">Rebuy Rules</span>
                  <span className="metric-value">{tournament.rebuys || 'None — this is a freezeout format'}</span>
                </div>
              </div>
              <div className="metric-cell">
                <AlarmClock size={20} className="metric-icon" />
                <div className="metric-info">
                  <span className="metric-label">Late Entry</span>
                  <span className="metric-value">{tournament.lateEntry || 'Allowed through the end of Round 2'}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
              <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', fontSize: '1rem' }}>Tournament Details & Chips:</h4>
              <ul style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px', listStyleType: 'disc' }}>
                <li><strong>Starting Stack:</strong> {tournament.startingStack || '20,000 Starting Chips'}</li>
                <li><strong>RSVP & Arrive On Time:</strong> Receive +5,000 Bonus Chips</li>
                {tournament.addonAmount > 0 ? (
                  <li><strong>Add-On (${tournament.addonAmount}):</strong> Available at the First Break for +{(tournament.addonChips || 15000).toLocaleString()} Chips</li>
                ) : (
                  <li><strong>Add-On:</strong> Not available (Freezeout format)</li>
                )}
                <li><strong>High Hand Prize:</strong> ${tournament.highHandAmount !== undefined ? `$${tournament.highHandAmount}` : '$100'}</li>
                <li><strong>Maximum Investment:</strong> ${tournament.buyInAmount + tournament.addonAmount + tournament.dealerAppreciationAmount}</li>
              </ul>
              <div style={{ marginTop: '16px', backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', padding: '12px 14px', fontSize: '0.85rem', color: '#10B981', lineHeight: '1.4' }}>
                <strong>Note:</strong> Please don't all show up with only $100 bills. If you can bring smaller bills, it will help registration go much faster and make things easier for everyone! 😄
              </div>
            </div>
          </div>

          {/* Section 2: RSVP Form & Registered list stack */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Public RSVP Form Card */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {tournament.entries.length >= totalSeats ? 'Join the Waitlist' : 'RSVP & Sign Up'}
                </h3>
                <span 
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '12px',
                    backgroundColor: tournament.entries.length >= totalSeats ? 'rgba(251, 191, 36, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                    color: tournament.entries.length >= totalSeats ? 'var(--text-gold)' : 'var(--color-emerald)',
                    border: tournament.entries.length >= totalSeats ? '1px solid rgba(251, 191, 36, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span className={`indicator ${tournament.entries.length >= totalSeats ? 'indicator-gold' : 'indicator-green'}`} style={{ width: '6px', height: '6px', margin: 0, backgroundColor: tournament.entries.length >= totalSeats ? 'var(--text-gold)' : 'var(--color-emerald)' }}></span>
                  <span>{tournament.entries.length} / {totalSeats} Seats Filled</span>
                </span>
              </div>
              
              {submitSuccess ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px 0' }}>
                  <p style={{ color: 'var(--color-emerald)', fontWeight: 600, margin: 0 }}>
                    🎉 RSVP successful! You have been added to the event.
                  </p>
                  <button className="btn btn-secondary" onClick={() => setSubmitSuccess(false)} style={{ alignSelf: 'flex-start' }}>
                    RSVP Another Player
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitRSVP} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {errorMessage && (
                    <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 600 }}>
                      ⚠️ {errorMessage}
                    </div>
                  )}
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Member ID</label>
                      <input
                        type="text"
                        placeholder="e.g. 101"
                        value={memberIdInput}
                        onChange={handleMemberIdChange}
                        className="form-input"
                        style={{ padding: '8px 12px' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Phone Number</label>
                      <input
                        type="tel"
                        required={!memberIdInput.trim()}
                        placeholder="e.g. (360) 555-1234"
                        value={phone}
                        onChange={handlePhoneChange}
                        className="form-input"
                        style={{ padding: '8px 12px' }}
                      />
                    </div>
                  </div>

                  {memberFound && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-emerald)', fontWeight: 600, padding: '4px 8px', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px', width: 'fit-content' }}>
                      ✓ Member found! Name and email auto-filled.
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>First Name</label>
                      <input
                        type="text"
                        required
                        disabled={!!memberFound}
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="form-input"
                        style={{ padding: '8px 12px', backgroundColor: memberFound ? 'rgba(255, 255, 255, 0.05)' : '', color: memberFound ? 'var(--text-secondary)' : 'var(--text-primary)' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Last Name</label>
                      <input
                        type="text"
                        required
                        disabled={!!memberFound}
                        placeholder="Last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="form-input"
                        style={{ padding: '8px 12px', backgroundColor: memberFound ? 'rgba(255, 255, 255, 0.05)' : '', color: memberFound ? 'var(--text-secondary)' : 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Email Address</label>
                    <input
                      type="email"
                      required
                      disabled={!!memberFound}
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-input"
                      style={{ padding: '8px 12px', backgroundColor: memberFound ? 'rgba(255, 255, 255, 0.05)' : '', color: memberFound ? 'var(--text-secondary)' : 'var(--text-primary)' }}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ marginTop: '6px', padding: '10px' }}>
                    {tournament.entries.length >= totalSeats ? 'Join Waitlist' : 'RSVP & Sign Up'}
                  </button>
                </form>
              )}
            </div>

            {/* Registered Players Card */}
            <div className="registered-players-panel glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Registered Players</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-emerald)', fontWeight: 600 }}>
                  {Math.min(tournament.entries.length, totalSeats)} / {totalSeats} Seats Filled
                </span>
              </div>

              {tournament.entries.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <p style={{ margin: 0 }}>No players registered yet. Be the first to RSVP!</p>
                </div>
              ) : (
                <div className="registered-players-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  padding: '4px 0'
                }}>
                  {/* Column 1 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {registeredCol1.map((entry, index) => {
                      const info = getMemberInitials(entry.memberId);
                      return (
                        <div key={entry.memberId} style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }} title={info.full}>
                          <span style={{ color: 'var(--color-emerald)', fontWeight: 700, fontSize: '0.75rem', width: '20px' }}>{index + 1}</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{info.full}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Column 2 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {registeredCol2.map((entry, index) => {
                      const info = getMemberInitials(entry.memberId);
                      return (
                        <div key={entry.memberId} style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }} title={info.full}>
                          <span style={{ color: 'var(--color-emerald)', fontWeight: 700, fontSize: '0.75rem', width: '20px' }}>{registeredHalf + index + 1}</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{info.full}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Waitlist Card */}
            {sortedWaitlist.length > 0 && (
              <div className="waitlist-players-panel glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-gold)' }}>Waitlist</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-gold)', fontWeight: 600 }}>
                    {sortedWaitlist.length} Player{sortedWaitlist.length === 1 ? '' : 's'} Waiting
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sortedWaitlist.map((entry, index) => {
                    const info = getMemberInitials(entry.memberId);
                    return (
                      <div key={entry.memberId} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'rgba(251, 191, 36, 0.03)',
                        border: '1px solid rgba(251, 191, 36, 0.1)',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '0.85rem'
                      }} title={info.full}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'var(--color-gold)', fontWeight: 700 }}>{index + 1}.</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{info.full}</span>
                        </div>
                        {entry.createdAt && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Seating Assignments (Public Player View) */}
        {(() => {
          const savedSeating = localStorage.getItem(`patms_seating_${tournament.id}`);
          if (!savedSeating) return null;
          const seatingData = JSON.parse(savedSeating) as Record<string, string[]>;
          if (Object.keys(seatingData).length === 0) return null;

          const savedDealers = localStorage.getItem(`patms_dealers_${tournament.id}`);
          const dealersData = savedDealers ? JSON.parse(savedDealers) as Record<string, string> : {};

          return (
            <div style={{
              marginTop: '32px',
              padding: '24px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '850px',
              margin: '32px auto 0 auto',
              boxShadow: 'var(--shadow-lg)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Seating Assignments
                </h3>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setIsDisplayModeOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  <Monitor size={16} />
                  <span>Display Mode</span>
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                {Object.entries(seatingData).map(([tableName, players]) => (
                  <div key={tableName} style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '16px',
                    borderLeft: '4px solid var(--color-emerald)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{tableName}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{players.filter(p => p !== "").length} Players</span>
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {players.map((playerId, idx) => {
                        if (!playerId) {
                          return (
                            <li key={`empty-${idx}`} style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', opacity: 0.25 }}>
                              <span style={{ color: 'var(--text-muted)', marginRight: '8px', width: '45px' }}>Seat {idx + 1}:</span>
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Empty Seat</span>
                            </li>
                          );
                        }
                        const isDealer = dealersData[tableName] === playerId;
                        const memberInfo = getMemberInitials(playerId);
                        return (
                          <li key={playerId} style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--text-muted)', marginRight: '8px', width: '45px' }}>Seat {idx + 1}:</span>
                            <span style={{ 
                              fontWeight: 600, 
                              color: isDealer ? 'var(--color-gold)' : 'var(--text-primary)' 
                            }}>
                              {memberInfo.full}
                              {isDealer && (
                                <span style={{ 
                                  fontSize: '0.7rem', 
                                  color: 'var(--color-gold)', 
                                  marginLeft: '6px', 
                                  fontWeight: 700,
                                  backgroundColor: 'rgba(251, 191, 36, 0.1)',
                                  padding: '2px 6px',
                                  borderRadius: '10px'
                                }}>
                                  (Dealer)
                                </span>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Event Flyer PDF / Image Embedded Viewer */}
        {(() => {
          const flyerInfo = getEmbeddableFlyerUrl(tournament.flyerUrl || '', tournament.flyerType);
          if (!flyerInfo.url) return null;

          return (
            <div style={{
              marginTop: '32px',
              padding: '24px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              width: '100%',
              maxWidth: '850px',
              margin: '32px auto 0 auto',
              boxShadow: 'var(--shadow-lg)'
            }}>
              <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.2rem', margin: 0 }}>Event Flyer</h4>
              {flyerInfo.type === 'iframe' ? (
                <iframe 
                  src={flyerInfo.url} 
                  width="100%" 
                  height="650px" 
                  style={{
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                  allow="autoplay"
                />
              ) : flyerInfo.type === 'image' ? (
                <img 
                  src={flyerInfo.url} 
                  alt={`${tournament.name} Flyer`}
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '75vh',
                    borderRadius: '8px', 
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }} 
                />
              ) : (
                <object
                  data={flyerInfo.url}
                  type="application/pdf"
                  width="100%"
                  height="650px"
                  style={{
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>This browser does not support inline PDFs.</p>
                    <a 
                      href={flyerInfo.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-primary"
                      style={{ padding: '10px 20px', borderRadius: '8px' }}
                    >
                      View / Download PDF Flyer
                    </a>
                  </div>
                </object>
              )}
            </div>
          );
        })()}

        {/* Back Link */}
        <div className="back-link-container text-center">
          <button 
            className="btn btn-link btn-see-more-events"
            onClick={() => setActiveTab('events')}
          >
            See more events
          </button>
        </div>

        {/* Page Footer */}
        <footer className="player-page-footer">
          <p>© 2026 Tim Hufler. All rights reserved.</p>
        </footer>

      </div>

      {/* Full Screen Seating Assignments Modal */}
      {(() => {
        if (!tournament) return null;
        const savedSeating = localStorage.getItem(`patms_seating_${tournament.id}`);
        if (!savedSeating) return null;
        const seatingData = JSON.parse(savedSeating) as Record<string, string[]>;
        if (Object.keys(seatingData).length === 0) return null;

        const savedDealers = localStorage.getItem(`patms_dealers_${tournament.id}`);
        const dealersData = savedDealers ? JSON.parse(savedDealers) as Record<string, string> : {};

        return (
          <SeatingDisplayModal
            isOpen={isDisplayModeOpen}
            onClose={() => setIsDisplayModeOpen(false)}
            tournamentName={tournament.name}
            tournamentDate={tournament.date}
            seating={seatingData}
            dealers={dealersData}
            members={state.members}
          />
        );
      })()}

    </div>
  );
};
