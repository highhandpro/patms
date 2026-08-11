import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowRight, X, Shuffle, CheckCircle, Volume2 } from 'lucide-react';
import type { TableBalanceRecommendation, PlayerMoveAssignment } from '../utils/tableBalancing';
import { useApp } from '../context/AppContext';

interface TableBalanceAlertModalProps {
  isOpen: boolean;
  recommendation: TableBalanceRecommendation | null;
  seating?: Record<string, string[]>;
  onClose: () => void;
  onConfirmMove: (playerId: string, sourceTable: string, targetTable: string) => void;
  onConfirmBreak: (breakTable: string) => void;
}

const TABLE_THEME_BADGES: Record<string, { bg: string; color: string }> = {
  'red table': { bg: '#EE204D', color: '#ffffff' },
  'blue table': { bg: '#1F75FE', color: '#ffffff' },
  'gold table': { bg: '#E6BE8A', color: '#000000' },
  'gray table': { bg: '#8B8680', color: '#000000' },
  'purple table': { bg: '#7442C8', color: '#ffffff' }
};

export const TableBalanceAlertModal: React.FC<TableBalanceAlertModalProps> = ({
  isOpen,
  recommendation,
  seating,
  onClose,
  onConfirmMove,
  onConfirmBreak
}) => {
  const { state } = useApp();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  const getMemberName = (id: string) => {
    const m = state.members.find(member => member.id === id);
    return m ? `${m.firstName} ${m.lastName}` : id;
  };

  useEffect(() => {
    setSelectedPlayerId('');
  }, [recommendation, isOpen]);

  if (!isOpen || !recommendation) return null;

  const isRebalance = recommendation.type === 'rebalance';
  const sourceBadge = recommendation.sourceTable ? TABLE_THEME_BADGES[recommendation.sourceTable.toLowerCase()] || { bg: '#334155', color: '#fff' } : null;
  const targetBadge = recommendation.targetTable ? TABLE_THEME_BADGES[recommendation.targetTable.toLowerCase()] || { bg: '#334155', color: '#fff' } : null;
  const breakBadge = recommendation.breakTable ? TABLE_THEME_BADGES[recommendation.breakTable.toLowerCase()] || { bg: '#334155', color: '#fff' } : null;

  const formatOpenSeatOrder = (orderNum: number) => {
    if (orderNum === 1) return '1st Open Seat';
    if (orderNum === 2) return '2nd Open Seat';
    if (orderNum === 3) return '3rd Open Seat';
    return `${orderNum}th Open Seat`;
  };

  const portalTarget = typeof document !== 'undefined' ? (document.fullscreenElement || document.body) : null;
  if (!portalTarget) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#070b14',
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.09) 0%, transparent 65%)',
        color: '#ffffff',
        zIndex: 2147483647,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 44px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '18px',
              backgroundColor: 'rgba(245, 158, 11, 0.2)',
              border: '2px solid rgba(245, 158, 11, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b'
            }}
          >
            <AlertTriangle size={36} />
          </div>
          <div>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 950, margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>
              {isRebalance ? 'Table Balance Required' : 'Table Consolidation Alert'}
            </h2>
            <p style={{ fontSize: '1.2rem', color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontWeight: 700 }}>
              <Volume2 size={20} style={{ color: '#10b981' }} />
              Tournament Director Alert
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1.5px solid rgba(255, 255, 255, 0.2)',
            color: '#cbd5e1',
            cursor: 'pointer',
            padding: '10px 24px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '1.15rem',
            fontWeight: 800,
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.16)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#cbd5e1';
          }}
        >
          <X size={22} />
          <span>Exit</span>
        </button>
      </div>

      {/* Rebalance Flow (Full Screen Large TV Scaling) */}
      {isRebalance && recommendation.sourceTable && recommendation.targetTable && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', maxWidth: '960px', width: '100%', margin: '0 auto', gap: '34px' }}>
            
            {/* Table From -> To Banner */}
            <div
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '2px solid rgba(255, 255, 255, 0.14)',
                borderRadius: '24px',
                padding: '34px 44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '30px',
                boxShadow: '0 12px 35px rgba(0, 0, 0, 0.5)'
              }}
            >
              {/* Source Table Badge */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: '1.25rem', color: '#94a3b8', display: 'block', marginBottom: '12px', fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  From ({recommendation.sourceActiveCount} active)
                </span>
                <span
                  style={{
                    backgroundColor: sourceBadge?.bg,
                    color: sourceBadge?.color,
                    padding: '14px 34px',
                    borderRadius: '16px',
                    fontWeight: 950,
                    fontSize: '2.1rem',
                    textTransform: 'uppercase',
                    display: 'inline-block',
                    boxShadow: '0 8px 22px rgba(0, 0, 0, 0.35)'
                  }}
                >
                  {recommendation.sourceTable}
                </span>
              </div>

              <div style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowRight size={56} strokeWidth={3} />
              </div>

              {/* Target Table Badge */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: '1.25rem', color: '#94a3b8', display: 'block', marginBottom: '12px', fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  To ({recommendation.targetActiveCount} active)
                </span>
                <span
                  style={{
                    backgroundColor: targetBadge?.bg,
                    color: targetBadge?.color,
                    padding: '14px 34px',
                    borderRadius: '16px',
                    fontWeight: 950,
                    fontSize: '2.1rem',
                    textTransform: 'uppercase',
                    display: 'inline-block',
                    boxShadow: '0 8px 22px rgba(0, 0, 0, 0.35)'
                  }}
                >
                  {recommendation.targetTable}
                </span>
              </div>
            </div>

            {/* Instruction & Select Dropdown */}
            <div style={{ width: '100%' }}>
              <label style={{ display: 'block', fontSize: '1.5rem', fontWeight: 950, marginBottom: '14px', color: '#f8fafc' }}>
                Select Player Moving (Next Big Blind):
              </label>
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '22px 28px',
                  backgroundColor: '#ffffff',
                  border: '3.5px solid #f59e0b',
                  borderRadius: '18px',
                  color: selectedPlayerId ? '#0f172a' : '#dc2626',
                  fontSize: '1.75rem',
                  fontWeight: 950,
                  outline: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)'
                }}
              >
                <option 
                  value="" 
                  disabled 
                  style={{ backgroundColor: '#ffffff', color: '#dc2626', fontSize: '1.5rem', fontWeight: 950 }}
                >
                  SELECT PLAYER
                </option>
                {(() => {
                  const sourceTableSeats = (seating && recommendation.sourceTable && seating[recommendation.sourceTable]) || [];
                  const activeList = ((recommendation.sourceActivePlayers && recommendation.sourceActivePlayers.length > 0)
                    ? recommendation.sourceActivePlayers
                    : sourceTableSeats.filter(id => id && id.trim() !== '')
                  ).slice().sort((a, b) => getMemberName(a).localeCompare(getMemberName(b)));

                  return activeList.map(pId => {
                    const name = getMemberName(pId);
                    return (
                      <option key={pId} value={pId} style={{ backgroundColor: '#ffffff', color: '#0f172a', fontSize: '1.5rem', fontWeight: 850 }}>
                        {name}
                      </option>
                    );
                  });
                })()}
              </select>
              <p style={{ fontSize: '1.25rem', color: '#94a3b8', marginTop: '14px', margin: 0, fontWeight: 700 }}>
                💡 The player will automatically be placed into the <strong>1st open seat</strong> at {recommendation.targetTable.toUpperCase()}.
              </p>
            </div>

          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '22px', maxWidth: '960px', width: '100%', margin: '0 auto', flexShrink: 0, paddingTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '20px 28px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1.5px solid rgba(255, 255, 255, 0.2)',
                color: '#cbd5e1',
                borderRadius: '16px',
                fontWeight: 850,
                fontSize: '1.35rem',
                cursor: 'pointer'
              }}
            >
              Dismiss / Settle Later
            </button>
            <button
              type="button"
              disabled={!selectedPlayerId}
              onClick={() => {
                if (selectedPlayerId && recommendation.sourceTable && recommendation.targetTable) {
                  onConfirmMove(selectedPlayerId, recommendation.sourceTable, recommendation.targetTable);
                }
              }}
              style={{
                flex: 1.6,
                padding: '20px 36px',
                backgroundColor: selectedPlayerId ? '#f59e0b' : 'rgba(245, 158, 11, 0.2)',
                border: selectedPlayerId ? 'none' : '1.5px solid rgba(245, 158, 11, 0.3)',
                color: selectedPlayerId ? '#000000' : '#64748b',
                borderRadius: '16px',
                fontWeight: 950,
                fontSize: '1.45rem',
                cursor: selectedPlayerId ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                boxShadow: selectedPlayerId ? '0 10px 30px rgba(245, 158, 11, 0.5)' : 'none',
                opacity: selectedPlayerId ? 1 : 0.6,
                transition: 'all 0.2s ease'
              }}
            >
              <CheckCircle size={28} />
              <span>Confirm & Move Player</span>
            </button>
          </div>
        </div>
      )}

      {/* Table Break / Consolidation Flow (Full Screen Large TV Scaling) */}
      {!isRebalance && recommendation.breakTable && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Top Banner */}
          <div
            style={{
              backgroundColor: recommendation.isFinalTable ? 'rgba(234, 179, 8, 0.14)' : 'rgba(239, 68, 68, 0.14)',
              border: recommendation.isFinalTable ? '2px solid rgba(234, 179, 8, 0.5)' : '2px solid rgba(239, 68, 68, 0.45)',
              borderRadius: '20px',
              padding: '16px 28px',
              marginBottom: '18px',
              textAlign: 'center',
              flexShrink: 0
            }}
          >
            <span style={{ fontSize: '1rem', color: recommendation.isFinalTable ? '#fef08a' : '#fca5a5', fontWeight: 900, display: 'block', marginBottom: '6px', letterSpacing: '0.08em' }}>
              {recommendation.isFinalTable ? '🏆 FINAL TABLE REACHED — RANDOM REDRAW' : 'TABLE BEING BROKEN'}
            </span>
            <span
              style={{
                backgroundColor: recommendation.isFinalTable ? '#EE204D' : breakBadge?.bg,
                color: '#ffffff',
                padding: '8px 32px',
                borderRadius: '14px',
                fontWeight: 950,
                fontSize: '2.1rem',
                textTransform: 'uppercase',
                display: 'inline-block',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
              }}
            >
              {recommendation.isFinalTable ? 'RED TABLE (FINAL TABLE)' : recommendation.breakTable}
            </span>
            <p style={{ fontSize: '1.3rem', color: '#f1f5f9', marginTop: '10px', margin: 0, fontWeight: 800 }}>
              {recommendation.message}
            </p>
          </div>

          {/* Section Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexShrink: 0 }}>
            <label style={{ fontSize: '1.45rem', fontWeight: 950, color: '#f8fafc', margin: 0 }}>
              {recommendation.isFinalTable ? 'Final Table Seat Assignments (Seats 1 - 10):' : 'Player Move Assignments (In Order 1, 2, 3...):'}
            </label>
            <span style={{ fontSize: '1.15rem', color: '#94a3b8', fontWeight: 800 }}>
              {recommendation.isFinalTable ? 'Dealer assigned to Seat #1' : 'Fills open seats in order'}
            </span>
          </div>

          {/* 2-Column Grid (Fills screen height evenly with large cards) */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px', minHeight: 0, overflowY: 'auto', paddingRight: '6px' }}>
            {(() => {
              const grouped = (recommendation.breakAssignments || []).reduce((acc, item) => {
                if (!acc[item.targetTable]) acc[item.targetTable] = [];
                acc[item.targetTable]!.push(item);
                return acc;
              }, {} as Record<string, PlayerMoveAssignment[]>);

              const targetTables = Object.keys(grouped);

              if (targetTables.length === 0) {
                return (
                  <p style={{ gridColumn: 'span 2', fontSize: '1.35rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
                    Active players will be reseated.
                  </p>
                );
              }

              return targetTables.map(tName => {
                const badge = TABLE_THEME_BADGES[tName.toLowerCase()] || { bg: '#334155', color: '#fff' };
                const playerList = grouped[tName] || [];

                return (
                  <div
                    key={tName}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '2px solid rgba(255, 255, 255, 0.14)',
                      borderRadius: '18px',
                      padding: '18px 24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.color,
                          padding: '8px 20px',
                          borderRadius: '10px',
                          fontWeight: 950,
                          fontSize: '1.35rem',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)'
                        }}
                      >
                        {recommendation.isFinalTable ? 'RED TABLE (FINAL TABLE)' : `Moving to ${tName}`}
                      </span>
                      <span style={{ fontSize: '1.2rem', color: '#cbd5e1', fontWeight: 850 }}>
                        {playerList.length} player{playerList.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {playerList.map(item => {
                        const isDealerSeat = item.targetSeatNumber === 1 || item.targetSeatIndex === 0;
                        const seatLabel = recommendation.isFinalTable 
                          ? (isDealerSeat ? '👑 Seat #1 (Dealer)' : `Seat #${item.targetSeatNumber}`)
                          : formatOpenSeatOrder(item.orderNumber);

                        return (
                          <div
                            key={item.playerId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: isDealerSeat && recommendation.isFinalTable ? 'rgba(234, 179, 8, 0.16)' : 'rgba(0, 0, 0, 0.5)',
                              border: isDealerSeat && recommendation.isFinalTable ? '2px solid rgba(234, 179, 8, 0.6)' : '1.5px solid rgba(255, 255, 255, 0.12)',
                              padding: '12px 20px',
                              borderRadius: '12px',
                              gap: '16px'
                            }}
                          >
                            {/* Left: Seat Position */}
                            <div style={{ flexShrink: 0 }}>
                              <span style={{ 
                                color: isDealerSeat && recommendation.isFinalTable ? '#fbbf24' : '#10b981', 
                                fontWeight: 950, 
                                fontSize: '1.85rem',
                                letterSpacing: '-0.01em',
                                whiteSpace: 'nowrap'
                              }}>
                                {seatLabel}
                              </span>
                            </div>

                            {/* Right: Player Name */}
                            <div style={{ overflow: 'hidden', textAlign: 'right' }}>
                              <span style={{ 
                                fontWeight: 950, 
                                color: '#ffffff', 
                                fontSize: '1.95rem', 
                                textOverflow: 'ellipsis', 
                                overflow: 'hidden', 
                                whiteSpace: 'nowrap',
                                letterSpacing: '-0.02em',
                                display: 'block'
                              }}>
                                {getMemberName(item.playerId)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '20px', marginTop: '20px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '20px 28px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1.5px solid rgba(255, 255, 255, 0.2)',
                color: '#cbd5e1',
                borderRadius: '16px',
                fontWeight: 850,
                fontSize: '1.35rem',
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => {
                if (recommendation.breakTable) {
                  onConfirmBreak(recommendation.breakTable);
                }
              }}
              style={{
                flex: 1.6,
                padding: '20px 36px',
                backgroundColor: '#ef4444',
                border: 'none',
                color: '#ffffff',
                borderRadius: '16px',
                fontWeight: 950,
                fontSize: '1.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                boxShadow: '0 10px 30px rgba(239, 68, 68, 0.5)'
              }}
            >
              <Shuffle size={28} />
              <span>Confirm & Break Table</span>
            </button>
          </div>
        </div>
      )}
    </div>,
    portalTarget
  );
};
