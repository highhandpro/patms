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
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.08) 0%, transparent 65%)',
        color: '#ffffff',
        zIndex: 2147483647,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 40px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              backgroundColor: 'rgba(245, 158, 11, 0.2)',
              border: '1.5px solid rgba(245, 158, 11, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b'
            }}
          >
            <AlertTriangle size={30} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 950, margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>
              {isRebalance ? 'Table Balance Required' : 'Table Consolidation Alert'}
            </h2>
            <p style={{ fontSize: '1rem', color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', fontWeight: 600 }}>
              <Volume2 size={16} style={{ color: '#10b981' }} />
              Tournament Director Alert
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#cbd5e1',
            cursor: 'pointer',
            padding: '8px 18px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.95rem',
            fontWeight: 700,
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#cbd5e1';
          }}
        >
          <X size={18} />
          <span>Exit</span>
        </button>
      </div>

      {/* Rebalance Flow (Full Screen Centered) */}
      {isRebalance && recommendation.sourceTable && recommendation.targetTable && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', maxWidth: '820px', width: '100%', margin: '0 auto', gap: '28px' }}>
            
            {/* Table From -> To Banner */}
            <div
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1.5px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '20px',
                padding: '28px 36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '24px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
              }}
            >
              {/* Source Table Badge */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: '1rem', color: '#94a3b8', display: 'block', marginBottom: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  From ({recommendation.sourceActiveCount} active)
                </span>
                <span
                  style={{
                    backgroundColor: sourceBadge?.bg,
                    color: sourceBadge?.color,
                    padding: '12px 28px',
                    borderRadius: '14px',
                    fontWeight: 950,
                    fontSize: '1.6rem',
                    textTransform: 'uppercase',
                    display: 'inline-block',
                    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  {recommendation.sourceTable}
                </span>
              </div>

              <div style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowRight size={44} strokeWidth={2.5} />
              </div>

              {/* Target Table Badge */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: '1rem', color: '#94a3b8', display: 'block', marginBottom: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  To ({recommendation.targetActiveCount} active)
                </span>
                <span
                  style={{
                    backgroundColor: targetBadge?.bg,
                    color: targetBadge?.color,
                    padding: '12px 28px',
                    borderRadius: '14px',
                    fontWeight: 950,
                    fontSize: '1.6rem',
                    textTransform: 'uppercase',
                    display: 'inline-block',
                    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  {recommendation.targetTable}
                </span>
              </div>
            </div>

            {/* Instruction & Select Dropdown */}
            <div style={{ width: '100%' }}>
              <label style={{ display: 'block', fontSize: '1.25rem', fontWeight: 900, marginBottom: '12px', color: '#f8fafc' }}>
                Select Player Moving (Next Big Blind):
              </label>
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '18px 24px',
                  backgroundColor: '#ffffff',
                  border: '3px solid #f59e0b',
                  borderRadius: '16px',
                  color: selectedPlayerId ? '#0f172a' : '#dc2626',
                  fontSize: '1.45rem',
                  fontWeight: 900,
                  outline: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 6px 24px rgba(0, 0, 0, 0.35)'
                }}
              >
                <option 
                  value="" 
                  disabled 
                  style={{ backgroundColor: '#ffffff', color: '#dc2626', fontSize: '1.3rem', fontWeight: 900 }}
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
                      <option key={pId} value={pId} style={{ backgroundColor: '#ffffff', color: '#0f172a', fontSize: '1.3rem', fontWeight: 800 }}>
                        {name}
                      </option>
                    );
                  });
                })()}
              </select>
              <p style={{ fontSize: '1.05rem', color: '#94a3b8', marginTop: '12px', margin: 0, fontWeight: 600 }}>
                💡 The player will automatically be placed into the <strong>1st open seat</strong> at {recommendation.targetTable.toUpperCase()}.
              </p>
            </div>

          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '18px', maxWidth: '820px', width: '100%', margin: '0 auto', flexShrink: 0, paddingTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '18px 24px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                borderRadius: '14px',
                fontWeight: 800,
                fontSize: '1.15rem',
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
                padding: '18px 28px',
                backgroundColor: selectedPlayerId ? '#f59e0b' : 'rgba(245, 158, 11, 0.2)',
                border: selectedPlayerId ? 'none' : '1px solid rgba(245, 158, 11, 0.3)',
                color: selectedPlayerId ? '#000000' : '#64748b',
                borderRadius: '14px',
                fontWeight: 950,
                fontSize: '1.25rem',
                cursor: selectedPlayerId ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: selectedPlayerId ? '0 8px 25px rgba(245, 158, 11, 0.45)' : 'none',
                opacity: selectedPlayerId ? 1 : 0.6,
                transition: 'all 0.2s ease'
              }}
            >
              <CheckCircle size={24} />
              <span>Confirm & Move Player</span>
            </button>
          </div>
        </div>
      )}

      {/* Table Break / Consolidation Flow (Full Screen) */}
      {!isRebalance && recommendation.breakTable && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Top Banner */}
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1.5px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '16px',
              padding: '12px 24px',
              marginBottom: '16px',
              textAlign: 'center',
              flexShrink: 0
            }}
          >
            <span style={{ fontSize: '0.85rem', color: '#fca5a5', fontWeight: 800, display: 'block', marginBottom: '4px', letterSpacing: '0.06em' }}>
              TABLE BEING BROKEN
            </span>
            <span
              style={{
                backgroundColor: breakBadge?.bg,
                color: breakBadge?.color,
                padding: '6px 24px',
                borderRadius: '10px',
                fontWeight: 950,
                fontSize: '1.45rem',
                textTransform: 'uppercase',
                display: 'inline-block'
              }}
            >
              {recommendation.breakTable}
            </span>
            <p style={{ fontSize: '1.05rem', color: '#e2e8f0', marginTop: '6px', margin: 0, fontWeight: 700 }}>
              {recommendation.message}
            </p>
          </div>

          {/* Section Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexShrink: 0 }}>
            <label style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f8fafc', margin: 0 }}>
              Player Move Assignments (In Order 1, 2, 3...):
            </label>
            <span style={{ fontSize: '0.95rem', color: '#94a3b8', fontWeight: 700 }}>
              Fills open seats in order
            </span>
          </div>

          {/* 2-Column Grid (Fills screen height evenly) */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
            {(() => {
              const grouped = (recommendation.breakAssignments || []).reduce((acc, item) => {
                if (!acc[item.targetTable]) acc[item.targetTable] = [];
                acc[item.targetTable]!.push(item);
                return acc;
              }, {} as Record<string, PlayerMoveAssignment[]>);

              const targetTables = Object.keys(grouped);

              if (targetTables.length === 0) {
                return (
                  <p style={{ gridColumn: 'span 2', fontSize: '1.1rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
                    Active players from {recommendation.breakTable.toUpperCase()} will be distributed evenly into open seats.
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
                      border: '1.5px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '14px',
                      padding: '14px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.color,
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontWeight: 950,
                          fontSize: '1.05rem',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Moving to {tName}
                      </span>
                      <span style={{ fontSize: '0.95rem', color: '#94a3b8', fontWeight: 800 }}>
                        {playerList.length} player{playerList.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {playerList.map(item => (
                        <div
                          key={item.playerId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            fontSize: '1.05rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                            <span style={{ 
                              backgroundColor: '#f59e0b', 
                              color: '#000000', 
                              width: '26px', 
                              height: '26px', 
                              borderRadius: '50%', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontWeight: 950, 
                              fontSize: '0.9rem',
                              flexShrink: 0
                            }}>
                              {item.orderNumber}
                            </span>
                            <span style={{ fontWeight: 850, color: '#ffffff', fontSize: '1.15rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {getMemberName(item.playerId)}
                            </span>
                          </div>
                          <div style={{ flexShrink: 0 }}>
                            <span style={{ color: '#10b981', fontWeight: 950, fontSize: '1.1rem' }}>
                              {formatOpenSeatOrder(item.orderNumber)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '16px 22px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                borderRadius: '14px',
                fontWeight: 800,
                fontSize: '1.15rem',
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
                padding: '16px 24px',
                backgroundColor: '#ef4444',
                border: 'none',
                color: '#ffffff',
                borderRadius: '14px',
                fontWeight: 950,
                fontSize: '1.25rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 8px 25px rgba(239, 68, 68, 0.45)'
              }}
            >
              <Shuffle size={22} />
              <span>Confirm & Break Table</span>
            </button>
          </div>
        </div>
      )}
    </div>,
    portalTarget
  );
};
