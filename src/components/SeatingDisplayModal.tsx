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
  dealers,
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

  // Define the exactly 5 columns in specified order
  const tableColors = [
    { key: 'red table', name: 'Red Table', color: '#ef4444', gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(185, 28, 28, 0.05) 100%)', border: 'rgba(239, 68, 68, 0.3)' },
    { key: 'blue table', name: 'Blue Table', color: '#3b82f6', gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(29, 78, 216, 0.05) 100%)', border: 'rgba(59, 130, 246, 0.3)' },
    { key: 'gold table', name: 'Gold Table', color: '#d4a359', gradient: 'linear-gradient(135deg, rgba(212, 163, 89, 0.15) 0%, rgba(180, 130, 60, 0.05) 100%)', border: 'rgba(212, 163, 89, 0.3)' },
    { key: 'gray table', name: 'Gray Table', color: '#94a3b8', gradient: 'linear-gradient(135deg, rgba(148, 163, 184, 0.15) 0%, rgba(71, 85, 105, 0.05) 100%)', border: 'rgba(148, 163, 184, 0.3)' },
    { key: 'purple table', name: 'Purple Table', color: '#a855f7', gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(109, 40, 217, 0.05) 100%)', border: 'rgba(168, 85, 247, 0.3)' }
  ];

  // Calculate live prize pool statistics
  const buyInCount = activeTournament ? activeTournament.entries.filter((e: any) => e.hasBuyIn).length : 0;
  const addonsNum = activeTournament ? (activeTournament.totalAddons !== undefined ? activeTournament.totalAddons : activeTournament.entries.filter((e: any) => e.hasAddon).length) : 0;
  const calculatedPrizePool = activeTournament ? (buyInCount * activeTournament.buyInAmount) + (addonsNum * activeTournament.addonAmount) : 0;
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
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0a0a0c',
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
        style={{
          width: '320px',
          backgroundColor: '#0c0c0e',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          overflowY: 'auto'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-gold)', margin: 0, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
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
                <strong style={{ color: '#ffffff' }}>${row.amount} ({row.percent}%)</strong>
              </div>
            ))}
            {payoutRows.length === 0 && (
              <span style={{ fontSize: '0.85rem', color: '#a0aec0', fontStyle: 'italic' }}>No payouts configured</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div 
        style={{
          flex: 1,
          padding: '24px 30px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Floating Exit Button (Absolute) */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '30px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#a0aec0',
            cursor: 'pointer',
            padding: '8px 18px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            zIndex: 1000
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
            e.currentTarget.style.color = '#a0aec0';
          }}
        >
          <X size={14} />
          <span>Exit Display</span>
        </button>

        {/* 5 Columns Layout Grid */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(5, 1fr)', 
            gap: '18px',
            flex: 1,
            alignItems: 'stretch',
            marginTop: '45px'
          }}
        >
          {tableColors.map((t) => {
            const players = seating[t.key] || [];
            const hasPlayers = players.some(p => p !== "");
            const tableDealerId = dealers[t.key];

            // Always generate exactly 10 slots
            const seatSlots = Array(10).fill("");
            players.forEach((pId, idx) => {
              if (idx < 10) seatSlots[idx] = pId;
            });

            return (
              <div 
                key={t.key}
                style={{
                  backgroundColor: hasPlayers ? 'rgba(255, 255, 255, 0.015)' : 'rgba(255, 255, 255, 0.005)',
                  border: `1px solid ${hasPlayers ? t.border : 'rgba(255, 255, 255, 0.03)'}`,
                  borderRadius: '20px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  opacity: hasPlayers ? 1 : 0.2,
                  transition: 'all 0.3s ease',
                  boxShadow: hasPlayers ? `0 10px 30px -10px ${t.border}33` : 'none'
                }}
              >
                {/* Table Column Title */}
                <div 
                  style={{
                    background: t.gradient,
                    border: `1px solid ${t.border}`,
                    borderRadius: '12px',
                    padding: '10px',
                    textAlign: 'center',
                    marginBottom: '12px'
                  }}
                >
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: t.color, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t.name}
                  </h2>
                  {hasPlayers && (
                    <span style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: 600 }}>
                      {players.filter(p => p !== "").length} Players Seated
                    </span>
                  )}
                </div>

                {/* Seated Players List (Always exactly 10 slots) */}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  {seatSlots.map((playerId, idx) => {
                    const isDealer = playerId ? tableDealerId === playerId : false;
                    
                    if (!playerId) {
                      return (
                        <li 
                          key={`empty-${idx}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px 12px',
                            backgroundColor: 'rgba(255, 255, 255, 0.001)',
                            border: '1px dashed rgba(255, 255, 255, 0.015)',
                            borderRadius: '10px',
                            color: '#3f4b5b',
                            height: '52px',
                            boxSizing: 'border-box'
                          }}
                        >
                          <span style={{ fontWeight: 900, color: '#ffffff', marginRight: '12px', minWidth: '50px', fontSize: '1.6rem', letterSpacing: '-0.02em' }}>
                            #{idx + 1}
                          </span>
                          <span style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>Empty Seat</span>
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
                          padding: '6px 12px',
                          backgroundColor: isEliminated 
                            ? 'rgba(248, 113, 113, 0.01)'
                            : (isDealer ? 'rgba(212, 163, 89, 0.08)' : 'rgba(255, 255, 255, 0.02)'),
                          border: `1px solid ${isEliminated ? 'rgba(248, 113, 113, 0.06)' : (isDealer ? 'rgba(212, 163, 89, 0.3)' : 'rgba(255, 255, 255, 0.04)')}`,
                          borderRadius: '10px',
                          color: isEliminated 
                            ? 'var(--text-muted)'
                            : (isDealer ? 'var(--color-gold)' : '#e2e8f0'),
                          opacity: isEliminated ? 0.35 : 1,
                          textDecoration: isEliminated ? 'line-through' : 'none',
                          boxShadow: (!isEliminated && isDealer) ? '0 4px 12px rgba(212, 163, 89, 0.1)' : 'none',
                          height: '52px',
                          boxSizing: 'border-box',
                          cursor: (!isEliminated && onEliminatePlayer) ? 'pointer' : 'default',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ fontWeight: 900, color: isEliminated ? 'var(--text-muted)' : '#ffffff', marginRight: '12px', minWidth: '50px', fontSize: '1.6rem', letterSpacing: '-0.02em' }}>
                          #{idx + 1}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                          {!isEliminated && isDealer && <Crown size={15} fill="var(--color-gold)" style={{ color: 'var(--color-gold)', flexShrink: 0 }} />}
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', lineHeight: 1.05 }}>
                            <span style={{ fontWeight: 900, fontSize: '1.6rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', letterSpacing: '-0.015em' }}>
                              {details.firstName}
                            </span>
                            <span style={{ 
                              fontWeight: 600, 
                              fontSize: '0.75rem', 
                              color: isEliminated ? 'var(--text-muted)' : (isDealer ? 'rgba(212, 163, 89, 0.8)' : '#a0aec0'), 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.04em',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              marginTop: '1px'
                            }}>
                              {details.lastName}
                            </span>
                          </div>
                        </div>
                        {!isEliminated && isDealer && (
                          <span 
                            style={{ 
                              fontSize: '0.65rem', 
                              fontWeight: 800, 
                              color: 'var(--color-gold)',
                              backgroundColor: 'rgba(212, 163, 89, 0.15)',
                              padding: '2px 5px',
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
                              fontSize: '0.65rem', 
                              fontWeight: 800, 
                              color: 'var(--color-danger)',
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              padding: '2px 5px',
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
