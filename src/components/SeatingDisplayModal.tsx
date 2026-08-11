import React, { useEffect } from 'react';
import { X, Crown, Award } from 'lucide-react';
import type { Member } from '../types';

interface SeatingDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentName: string;
  tournamentDate: string;
  seating: Record<string, string[]>;
  dealers: Record<string, string>;
  members: Member[];
  activeTournament?: any;
  onEliminatePlayer?: (playerId: string) => void;
}

export const SeatingDisplayModal: React.FC<SeatingDisplayModalProps> = ({
  isOpen,
  onClose,
  tournamentName,
  tournamentDate,
  seating,
  dealers: _dealers,
  members,
  activeTournament,
  onEliminatePlayer
}) => {
  // Toggle sidebar hiding body class
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('display-mode-active');
    } else {
      document.body.classList.remove('display-mode-active');
    }
    return () => {
      document.body.classList.remove('display-mode-active');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getMemberDetails = (id: string) => {
    const m = members.find(member => member.id === id);
    return m ? { firstName: m.firstName, lastName: m.lastName } : { firstName: 'Unknown', lastName: 'Player' };
  };

  // Define the exactly 5 columns in specified order with 70% opacity Crayola themes and large black text
  const tableColors = [
    {
      key: 'red table',
      name: 'Red Table',
      bgColor: 'rgba(238, 32, 77, 0.7)', // Crayola Red 70%
      textColor: '#000000',
      secondaryTextColor: 'rgba(0, 0, 0, 0.75)',
      mutedTextColor: 'rgba(0, 0, 0, 0.5)',
      borderColor: 'rgba(238, 32, 77, 0.9)',
      headerBg: 'rgba(255, 255, 255, 0.55)',
      rowBg: 'rgba(255, 255, 255, 0.55)',
      rowBorder: 'rgba(0, 0, 0, 0.2)',
      emptyRowBg: 'rgba(255, 255, 255, 0.25)',
      eliminatedRowBg: 'rgba(255, 255, 255, 0.22)',
      eliminatedBadgeBg: 'rgba(0, 0, 0, 0.15)',
      eliminatedBadgeText: '#000000',
      dealerBadgeBg: 'rgba(255, 255, 255, 0.85)',
      dealerBadgeText: '#000000',
      shadow: '0 10px 30px -10px rgba(238, 32, 77, 0.4)'
    },
    {
      key: 'blue table',
      name: 'Blue Table',
      bgColor: 'rgba(31, 117, 254, 0.7)', // Crayola Blue 70%
      textColor: '#000000',
      secondaryTextColor: 'rgba(0, 0, 0, 0.75)',
      mutedTextColor: 'rgba(0, 0, 0, 0.5)',
      borderColor: 'rgba(31, 117, 254, 0.9)',
      headerBg: 'rgba(255, 255, 255, 0.55)',
      rowBg: 'rgba(255, 255, 255, 0.55)',
      rowBorder: 'rgba(0, 0, 0, 0.2)',
      emptyRowBg: 'rgba(255, 255, 255, 0.25)',
      eliminatedRowBg: 'rgba(255, 255, 255, 0.22)',
      eliminatedBadgeBg: 'rgba(0, 0, 0, 0.15)',
      eliminatedBadgeText: '#000000',
      dealerBadgeBg: 'rgba(255, 255, 255, 0.85)',
      dealerBadgeText: '#000000',
      shadow: '0 10px 30px -10px rgba(31, 117, 254, 0.4)'
    },
    {
      key: 'gold table',
      name: 'Gold Table',
      bgColor: 'rgba(230, 190, 138, 0.7)', // Crayola Gold 70%
      textColor: '#000000',
      secondaryTextColor: 'rgba(0, 0, 0, 0.75)',
      mutedTextColor: 'rgba(0, 0, 0, 0.5)',
      borderColor: 'rgba(230, 190, 138, 0.9)',
      headerBg: 'rgba(255, 255, 255, 0.55)',
      rowBg: 'rgba(255, 255, 255, 0.55)',
      rowBorder: 'rgba(0, 0, 0, 0.2)',
      emptyRowBg: 'rgba(255, 255, 255, 0.25)',
      eliminatedRowBg: 'rgba(255, 255, 255, 0.22)',
      eliminatedBadgeBg: 'rgba(0, 0, 0, 0.15)',
      eliminatedBadgeText: '#000000',
      dealerBadgeBg: 'rgba(255, 255, 255, 0.85)',
      dealerBadgeText: '#000000',
      shadow: '0 10px 30px -10px rgba(230, 190, 138, 0.4)'
    },
    {
      key: 'gray table',
      name: 'Gray Table',
      bgColor: 'rgba(139, 134, 128, 0.7)', // Crayola Gray 70%
      textColor: '#000000',
      secondaryTextColor: 'rgba(0, 0, 0, 0.75)',
      mutedTextColor: 'rgba(0, 0, 0, 0.5)',
      borderColor: 'rgba(139, 134, 128, 0.9)',
      headerBg: 'rgba(255, 255, 255, 0.55)',
      rowBg: 'rgba(255, 255, 255, 0.55)',
      rowBorder: 'rgba(0, 0, 0, 0.2)',
      emptyRowBg: 'rgba(255, 255, 255, 0.25)',
      eliminatedRowBg: 'rgba(255, 255, 255, 0.22)',
      eliminatedBadgeBg: 'rgba(0, 0, 0, 0.15)',
      eliminatedBadgeText: '#000000',
      dealerBadgeBg: 'rgba(255, 255, 255, 0.85)',
      dealerBadgeText: '#000000',
      shadow: '0 10px 30px -10px rgba(139, 134, 128, 0.4)'
    },
    {
      key: 'purple table',
      name: 'Purple Table',
      bgColor: 'rgba(116, 66, 200, 0.7)', // Crayola Purple Heart 70%
      textColor: '#000000',
      secondaryTextColor: 'rgba(0, 0, 0, 0.75)',
      mutedTextColor: 'rgba(0, 0, 0, 0.5)',
      borderColor: 'rgba(116, 66, 200, 0.9)',
      headerBg: 'rgba(255, 255, 255, 0.55)',
      rowBg: 'rgba(255, 255, 255, 0.55)',
      rowBorder: 'rgba(0, 0, 0, 0.2)',
      emptyRowBg: 'rgba(255, 255, 255, 0.25)',
      eliminatedRowBg: 'rgba(255, 255, 255, 0.22)',
      eliminatedBadgeBg: 'rgba(0, 0, 0, 0.15)',
      eliminatedBadgeText: '#000000',
      dealerBadgeBg: 'rgba(255, 255, 255, 0.85)',
      dealerBadgeText: '#000000',
      shadow: '0 10px 30px -10px rgba(116, 66, 200, 0.4)'
    }
  ];

  const activeTables = tableColors.filter(t => {
    const players = seating[t.key] || [];
    return players.filter(p => p && typeof p === 'string' && p.trim() !== "").length > 0;
  });

  // Calculate live prize pool statistics
  const buyInCount = activeTournament ? activeTournament.entries.filter((e: any) => e.hasBuyIn).length : 0;
  const addonsNum = activeTournament ? (activeTournament.totalAddons !== undefined ? activeTournament.totalAddons : activeTournament.entries.filter((e: any) => e.hasAddon).length) : 0;
  
  const netBuyIn = activeTournament ? activeTournament.buyInAmount - activeTournament.bountyAmount - activeTournament.dealerAppreciationAmount : 0;
  const rawCalculatedPrizePool = activeTournament ? (buyInCount * netBuyIn) + (addonsNum * activeTournament.addonAmount) : 0;
  const calculatedPrizePool = activeTournament 
    ? (activeTournament.status === 'completed' 
        ? activeTournament.totalPrizePool 
        : Math.max(0, rawCalculatedPrizePool - (activeTournament.highHandAmount || 0)))
    : 0;

  const remainingCount = activeTournament ? activeTournament.entries.filter((e: any) => !e.eliminatedAt).length : 0;

  const payoutRows = activeTournament 
    ? (activeTournament.payoutPercentages || []).map((pct: number, idx: number) => {
        if (pct <= 0) return null;
        const amt = Math.round(calculatedPrizePool * (pct / 100));
        return { place: idx + 1, amount: amt, percent: pct };
      }).filter(Boolean)
    : [];

  return (
    <div 
      className="seating-display-modal"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#010101',
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(212, 163, 89, 0.05) 0%, transparent 50%)',
        color: '#e2e8f0',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden'
      }}
    >
      {/* Sidebar: Tournament Stats and Payout Breakdown */}
      <div 
        className="seating-display-sidebar"
        style={{
          width: '240px',
          backgroundColor: '#0c0c0e',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          overflowY: 'auto'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-gold)', margin: 0, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
            {tournamentName}
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#a0aec0', marginTop: '4px', margin: 0 }}>
            {tournamentDate}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Total Prize Pool</span>
            <strong style={{ fontSize: '1.3rem', color: 'var(--color-emerald)' }}>${calculatedPrizePool}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#a0aec0' }}>Players Remaining</span>
            <strong style={{ fontSize: '1.15rem', color: '#ffffff' }}>{remainingCount} / {buyInCount}</strong>
          </div>
        </div>

        {/* Prize Breakdown */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a0aec0', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={14} style={{ color: 'var(--color-gold)' }} />
            Prize Breakdown
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {payoutRows.map((row: any) => (
              <div key={row.place} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '6px 0', borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
                <span>{row.place === 1 ? '1st' : row.place === 2 ? '2nd' : row.place === 3 ? '3rd' : `${row.place}th`} Place:</span>
                <strong style={{ color: '#ffffff' }}>${row.amount}</strong>
              </div>
            ))}
            {payoutRows.length === 0 && (
              <span style={{ fontSize: '0.85rem', color: '#a0aec0', fontStyle: 'italic' }}>No payouts configured</span>
            )}
            {activeTournament && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '8px 0 6px 0', borderTop: '1px dashed rgba(255,255,255,0.1)', marginTop: '4px' }}>
                <span style={{ color: '#a0aec0' }}>High Hand:</span>
                <strong style={{ color: 'var(--color-gold)' }}>${activeTournament.highHandAmount || 0}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div 
        style={{
          flex: 1,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          height: '100vh',
          boxSizing: 'border-box'
        }}
      >
        {/* Floating Exit Button (Absolute) */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '24px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#cbd5e1',
            cursor: 'pointer',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            zIndex: 1000
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#cbd5e1';
          }}
        >
          <X size={14} />
          <span>Exit Display</span>
        </button>

        {/* Columns Layout Grid */}
        <div 
          className="seating-display-columns-grid"
          style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(${activeTables.length || 1}, 1fr)`, 
            gap: '12px',
            flex: 1,
            alignItems: 'stretch',
            marginTop: '36px',
            height: 'calc(100vh - 68px)',
            boxSizing: 'border-box'
          }}
        >
          {activeTables.map((t) => {
            const players = seating[t.key] || [];
            const hasPlayers = players.some(p => p && typeof p === 'string' && p.trim() !== "");

            // Always generate exactly 10 slots
            const seatSlots = Array(10).fill("");
            players.forEach((pId, idx) => {
              if (idx < 10) seatSlots[idx] = pId;
            });

            return (
              <div 
                key={t.key}
                style={{
                  backgroundColor: t.bgColor,
                  color: t.textColor,
                  border: `2px solid ${t.borderColor}`,
                  borderRadius: '16px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  opacity: hasPlayers ? 1 : 0.45,
                  transition: 'all 0.3s ease',
                  boxShadow: t.shadow,
                  height: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {/* Table Column Title */}
                <div 
                  style={{
                    background: t.headerBg,
                    border: `1px solid ${t.rowBorder}`,
                    borderRadius: '10px',
                    padding: '6px 10px',
                    textAlign: 'center',
                    marginBottom: '8px',
                    flexShrink: 0
                  }}
                >
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#000000', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t.name}
                  </h2>
                  {hasPlayers && (
                    <span style={{ fontSize: '0.8rem', color: '#000000', fontWeight: 800 }}>
                      {players.filter(p => p && typeof p === 'string' && p.trim() !== "").length} Players Seated
                    </span>
                  )}
                </div>

                {/* Seated Players List (Always exactly 10 slots filling the available height evenly) */}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minHeight: 0, justifyContent: 'space-between' }}>
                  {seatSlots.map((playerId, idx) => {
                    const preassigned = activeTournament?.preassignedDealers || [];
                    const isDealer = playerId ? preassigned.includes(playerId) : false;
                    
                    if (!playerId) {
                      return (
                        <li 
                          key={`empty-${idx}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '2px 10px',
                            backgroundColor: t.emptyRowBg,
                            border: `1px dashed ${t.rowBorder}`,
                            borderRadius: '8px',
                            color: t.mutedTextColor,
                            flex: 1,
                            minHeight: 0,
                            boxSizing: 'border-box'
                          }}
                        >
                          <span style={{ fontWeight: 900, color: t.mutedTextColor, marginRight: '8px', minWidth: '40px', fontSize: 'clamp(1.1rem, 1.4vw, 1.35rem)', letterSpacing: '-0.02em' }}>
                            #{idx + 1}
                          </span>
                          <span style={{ fontStyle: 'italic', fontSize: 'clamp(0.9rem, 1.1vw, 1.05rem)', color: t.mutedTextColor, fontWeight: 600 }}>Empty Seat</span>
                        </li>
                      );
                    }

                    const details = getMemberDetails(playerId);
                    const entry = activeTournament ? activeTournament.entries.find((e: any) => e.memberId === playerId) : null;
                    const isEliminated = entry ? !!entry.eliminatedAt : false;

                    return (
                      <li 
                        key={playerId}
                        onClick={() => {
                          if (!isEliminated && onEliminatePlayer) {
                            onEliminatePlayer(playerId);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '2px 10px',
                          backgroundColor: isEliminated 
                            ? t.eliminatedRowBg 
                            : (isDealer ? t.dealerBadgeBg : t.rowBg),
                          border: `1px solid ${t.rowBorder}`,
                          borderRadius: '8px',
                          color: '#000000',
                          opacity: isEliminated ? 0.5 : 1,
                          textDecoration: isEliminated ? 'line-through' : 'none',
                          boxShadow: 'none',
                          flex: 1,
                          minHeight: 0,
                          boxSizing: 'border-box',
                          cursor: (!isEliminated && onEliminatePlayer) ? 'pointer' : 'default',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span 
                          className={isEliminated ? '' : 'seating-display-active-seat'}
                          style={{ fontWeight: 900, color: isEliminated ? t.mutedTextColor : '#000000', marginRight: '8px', minWidth: '40px', fontSize: 'clamp(1.15rem, 1.5vw, 1.45rem)', letterSpacing: '-0.02em', textDecoration: isEliminated ? 'line-through' : 'none' }}
                        >
                          #{idx + 1}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                          {!isEliminated && isDealer && <Crown size={18} fill="#000000" style={{ color: '#000000', flexShrink: 0 }} />}
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', lineHeight: 1.05 }}>
                            <span 
                              className={isEliminated ? '' : 'seating-display-active-name'}
                              style={{ fontWeight: 900, fontSize: 'clamp(1.25rem, 1.7vw, 1.6rem)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', letterSpacing: '-0.015em', color: isEliminated ? t.mutedTextColor : '#000000', textDecoration: isEliminated ? 'line-through' : 'none' }}
                            >
                              {details.firstName}
                            </span>
                            <span 
                              className={isEliminated ? '' : 'seating-display-active-name'}
                              style={{ 
                                fontWeight: 900, 
                                fontSize: 'clamp(0.85rem, 1.1vw, 1rem)', 
                                color: isEliminated ? t.mutedTextColor : '#000000', 
                                textTransform: 'uppercase', 
                                letterSpacing: '0.04em',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                marginTop: '1px',
                                textDecoration: isEliminated ? 'line-through' : 'none'
                              }}
                            >
                              {details.lastName}
                            </span>
                          </div>
                        </div>
                        {!isEliminated && isDealer && (
                          <span 
                            style={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 900, 
                              color: '#000000',
                              backgroundColor: 'rgba(255, 255, 255, 0.85)',
                              border: '1px solid rgba(0, 0, 0, 0.35)',
                              padding: '2px 6px',
                              borderRadius: '6px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              flexShrink: 0
                            }}
                          >
                            Dealer
                          </span>
                        )}
                        {isEliminated && (
                          <span 
                            style={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 900, 
                              color: t.eliminatedBadgeText,
                              backgroundColor: t.eliminatedBadgeBg,
                              border: `1px solid ${t.rowBorder}`,
                              padding: '2px 6px',
                              borderRadius: '6px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              flexShrink: 0
                            }}
                          >
                            Out
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
