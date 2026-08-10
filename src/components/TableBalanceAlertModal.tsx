import React, { useState, useEffect } from 'react';
import { AlertTriangle, ArrowRight, X, Shuffle, CheckCircle, Volume2 } from 'lucide-react';
import type { TableBalanceRecommendation, PlayerMoveAssignment } from '../utils/tableBalancing';
import { useApp } from '../context/AppContext';

interface TableBalanceAlertModalProps {
  isOpen: boolean;
  recommendation: TableBalanceRecommendation | null;
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
  onClose,
  onConfirmMove,
  onConfirmBreak
}) => {
  const { state } = useApp();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  useEffect(() => {
    if (recommendation && recommendation.sourceActivePlayers && recommendation.sourceActivePlayers.length > 0) {
      // Default to first active player in list
      setSelectedPlayerId(recommendation.sourceActivePlayers[0]);
    } else {
      setSelectedPlayerId('');
    }
  }, [recommendation]);

  if (!isOpen || !recommendation) return null;

  const getMemberName = (id: string) => {
    const m = state.members.find(member => member.id === id);
    return m ? `${m.firstName} ${m.lastName}` : id;
  };

  const isRebalance = recommendation.type === 'rebalance';
  const sourceBadge = recommendation.sourceTable ? TABLE_THEME_BADGES[recommendation.sourceTable.toLowerCase()] || { bg: '#334155', color: '#fff' } : null;
  const targetBadge = recommendation.targetTable ? TABLE_THEME_BADGES[recommendation.targetTable.toLowerCase()] || { bg: '#334155', color: '#fff' } : null;
  const breakBadge = recommendation.breakTable ? TABLE_THEME_BADGES[recommendation.breakTable.toLowerCase()] || { bg: '#334155', color: '#fff' } : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '2px solid rgba(245, 158, 11, 0.5)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 35px rgba(245, 158, 11, 0.25)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '520px',
          padding: '28px',
          color: '#ffffff',
          position: 'relative',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b'
              }}
            >
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                {isRebalance ? 'Table Balance Required' : 'Table Consolidation Alert'}
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <Volume2 size={13} style={{ color: '#10b981' }} />
                Tournament Director Alert
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Rebalance Flow */}
        {isRebalance && recommendation.sourceTable && recommendation.targetTable && (
          <div>
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              {/* Source Table Badge */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase' }}>
                  From ({recommendation.sourceActiveCount} active)
                </span>
                <span
                  style={{
                    backgroundColor: sourceBadge?.bg,
                    color: sourceBadge?.color,
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontWeight: 900,
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    display: 'inline-block'
                  }}
                >
                  {recommendation.sourceTable}
                </span>
              </div>

              <div style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowRight size={22} />
              </div>

              {/* Target Table Badge */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase' }}>
                  To ({recommendation.targetActiveCount} active)
                </span>
                <span
                  style={{
                    backgroundColor: targetBadge?.bg,
                    color: targetBadge?.color,
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontWeight: 900,
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    display: 'inline-block'
                  }}
                >
                  {recommendation.targetTable}
                </span>
              </div>
            </div>

            {/* Instruction */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, marginBottom: '8px', color: '#e2e8f0' }}>
                Select Player Moving (Next Big Blind):
              </label>
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  backgroundColor: '#1e293b',
                  border: '1.5px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {(recommendation.sourceActivePlayers || []).map(pId => (
                  <option key={pId} value={pId} style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>
                    {getMemberName(pId)}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px', margin: 0 }}>
                💡 The player will automatically be placed into the first open seat at {recommendation.targetTable.toUpperCase()}.
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#cbd5e1',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
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
                  flex: 1.5,
                  padding: '12px 16px',
                  backgroundColor: '#f59e0b',
                  border: 'none',
                  color: '#000000',
                  borderRadius: '10px',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  cursor: selectedPlayerId ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
                }}
              >
                <CheckCircle size={18} />
                <span>Confirm & Move Player</span>
              </button>
            </div>
          </div>
        )}

        {/* Table Break Flow */}
        {!isRebalance && recommendation.breakTable && (
          <div>
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '14px',
                padding: '14px',
                marginBottom: '16px',
                textAlign: 'center'
              }}
            >
              <span style={{ fontSize: '0.8rem', color: '#fca5a5', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                TABLE BEING BROKEN
              </span>
              <span
                style={{
                  backgroundColor: breakBadge?.bg,
                  color: breakBadge?.color,
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontWeight: 900,
                  fontSize: '1rem',
                  textTransform: 'uppercase',
                  display: 'inline-block'
                }}
              >
                {recommendation.breakTable}
              </span>
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '8px', margin: 0, fontWeight: 600 }}>
                {recommendation.message}
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  Player Move Assignments (In Order 1, 2, 3...):
                </label>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                  Fills open seats in order
                </span>
              </div>

              {/* Grouped Table Assignments List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                {(() => {
                  const grouped = (recommendation.breakAssignments || []).reduce((acc, item) => {
                    if (!acc[item.targetTable]) acc[item.targetTable] = [];
                    acc[item.targetTable]!.push(item);
                    return acc;
                  }, {} as Record<string, PlayerMoveAssignment[]>);

                  const targetTables = Object.keys(grouped);

                  if (targetTables.length === 0) {
                    return (
                      <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
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
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '10px',
                          padding: '10px 12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span
                            style={{
                              backgroundColor: badge.bg,
                              color: badge.color,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontWeight: 900,
                              fontSize: '0.8rem',
                              textTransform: 'uppercase'
                            }}
                          >
                            Moving to {tName}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                            {playerList.length} player{playerList.length > 1 ? 's' : ''}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {playerList.map(item => (
                            <div
                              key={item.playerId}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '0.85rem'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ 
                                  backgroundColor: '#f59e0b', 
                                  color: '#000000', 
                                  width: '20px', 
                                  height: '20px', 
                                  borderRadius: '50%', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  fontWeight: 900, 
                                  fontSize: '0.75rem' 
                                }}>
                                  {item.orderNumber}
                                </span>
                                <span style={{ fontWeight: 700, color: '#ffffff' }}>
                                  {getMemberName(item.playerId)}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#10b981', fontWeight: 800 }}>
                                  Seat {item.targetSeatNumber}
                                </span>
                                <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.75rem' }}>
                                  ({item.orderNumber === 1 ? '1st' : item.orderNumber === 2 ? '2nd' : `${item.orderNumber}th`} open seat)
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
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#cbd5e1',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
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
                  padding: '12px 16px',
                  backgroundColor: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '10px',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
                }}
              >
                <Shuffle size={18} />
                <span>Confirm & Break Table</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
