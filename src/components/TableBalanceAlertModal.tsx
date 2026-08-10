import React, { useState, useEffect } from 'react';
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
    if (recommendation) {
      const sourceTableSeats = (seating && recommendation.sourceTable && seating[recommendation.sourceTable]) || [];
      const activeList = ((recommendation.sourceActivePlayers && recommendation.sourceActivePlayers.length > 0)
        ? recommendation.sourceActivePlayers
        : sourceTableSeats.filter(id => id && id.trim() !== '')
      ).slice().sort((a, b) => getMemberName(a).localeCompare(getMemberName(b)));

      if (activeList.length > 0) {
        setSelectedPlayerId(activeList[0]);
      } else {
        setSelectedPlayerId('');
      }
    } else {
      setSelectedPlayerId('');
    }
  }, [recommendation, seating, state.members]);

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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div
        style={{
          backgroundColor: '#0c1322',
          border: '2px solid rgba(245, 158, 11, 0.6)',
          boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.95), 0 0 50px rgba(245, 158, 11, 0.35)',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '860px',
          padding: '32px 36px',
          color: '#ffffff',
          position: 'relative',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
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
              <h2 style={{ fontSize: '1.75rem', fontWeight: 950, margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>
                {isRebalance ? 'Table Balance Required' : 'Table Consolidation Alert'}
              </h2>
              <p style={{ fontSize: '1rem', color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontWeight: 600 }}>
                <Volume2 size={16} style={{ color: '#10b981' }} />
                Tournament Director Alert
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={26} />
          </button>
        </div>

        {/* Rebalance Flow */}
        {isRebalance && recommendation.sourceTable && recommendation.targetTable && (
          <div>
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px'
              }}
            >
              {/* Source Table Badge */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: 800, textTransform: 'uppercase' }}>
                  From ({recommendation.sourceActiveCount} active)
                </span>
                <span
                  style={{
                    backgroundColor: sourceBadge?.bg,
                    color: sourceBadge?.color,
                    padding: '8px 18px',
                    borderRadius: '10px',
                    fontWeight: 950,
                    fontSize: '1.2rem',
                    textTransform: 'uppercase',
                    display: 'inline-block'
                  }}
                >
                  {recommendation.sourceTable}
                </span>
              </div>

              <div style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowRight size={32} />
              </div>

              {/* Target Table Badge */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: 800, textTransform: 'uppercase' }}>
                  To ({recommendation.targetActiveCount} active)
                </span>
                <span
                  style={{
                    backgroundColor: targetBadge?.bg,
                    color: targetBadge?.color,
                    padding: '8px 18px',
                    borderRadius: '10px',
                    fontWeight: 950,
                    fontSize: '1.2rem',
                    textTransform: 'uppercase',
                    display: 'inline-block'
                  }}
                >
                  {recommendation.targetTable}
                </span>
              </div>
            </div>

            {/* Instruction */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '1.1rem', fontWeight: 850, marginBottom: '10px', color: '#e2e8f0' }}>
                Select Player Moving (Next Big Blind):
              </label>
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px 18px',
                  backgroundColor: '#ffffff',
                  border: '2.5px solid #f59e0b',
                  borderRadius: '12px',
                  color: '#0f172a',
                  fontSize: '1.25rem',
                  fontWeight: 850,
                  outline: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)'
                }}
              >
                {(() => {
                  const sourceTableSeats = (seating && recommendation.sourceTable && seating[recommendation.sourceTable]) || [];
                  const activeList = ((recommendation.sourceActivePlayers && recommendation.sourceActivePlayers.length > 0)
                    ? recommendation.sourceActivePlayers
                    : sourceTableSeats.filter(id => id && id.trim() !== '')
                  ).slice().sort((a, b) => getMemberName(a).localeCompare(getMemberName(b)));

                  return activeList.map(pId => {
                    const name = getMemberName(pId);
                    return (
                      <option key={pId} value={pId} style={{ backgroundColor: '#ffffff', color: '#0f172a', fontSize: '1.15rem', fontWeight: 700 }}>
                        {name}
                      </option>
                    );
                  });
                })()}
              </select>
              <p style={{ fontSize: '0.95rem', color: '#94a3b8', marginTop: '10px', margin: 0, fontWeight: 600 }}>
                💡 The player will automatically be placed into the <strong>1st open seat</strong> at {recommendation.targetTable.toUpperCase()}.
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '28px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '16px 20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '1.05rem',
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
                  padding: '16px 20px',
                  backgroundColor: '#f59e0b',
                  border: 'none',
                  color: '#000000',
                  borderRadius: '12px',
                  fontWeight: 950,
                  fontSize: '1.15rem',
                  cursor: selectedPlayerId ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 6px 20px rgba(245, 158, 11, 0.45)'
                }}
              >
                <CheckCircle size={22} />
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
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1.5px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '16px',
                padding: '16px 20px',
                marginBottom: '20px',
                textAlign: 'center'
              }}
            >
              <span style={{ fontSize: '0.85rem', color: '#fca5a5', fontWeight: 800, display: 'block', marginBottom: '6px', letterSpacing: '0.05em' }}>
                TABLE BEING BROKEN
              </span>
              <span
                style={{
                  backgroundColor: breakBadge?.bg,
                  color: breakBadge?.color,
                  padding: '8px 22px',
                  borderRadius: '10px',
                  fontWeight: 950,
                  fontSize: '1.35rem',
                  textTransform: 'uppercase',
                  display: 'inline-block'
                }}
              >
                {recommendation.breakTable}
              </span>
              <p style={{ fontSize: '1.05rem', color: '#e2e8f0', marginTop: '10px', margin: 0, fontWeight: 700 }}>
                {recommendation.message}
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f8fafc', margin: 0 }}>
                  Player Move Assignments (In Order 1, 2, 3...):
                </label>
                <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 700 }}>
                  Fills open seats in order
                </span>
              </div>

              {/* Grouped Table Assignments List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '380px', overflowY: 'auto', paddingRight: '6px' }}>
                {(() => {
                  const grouped = (recommendation.breakAssignments || []).reduce((acc, item) => {
                    if (!acc[item.targetTable]) acc[item.targetTable] = [];
                    acc[item.targetTable]!.push(item);
                    return acc;
                  }, {} as Record<string, PlayerMoveAssignment[]>);

                  const targetTables = Object.keys(grouped);

                  if (targetTables.length === 0) {
                    return (
                      <p style={{ fontSize: '1rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
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
                          padding: '14px 18px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span
                            style={{
                              backgroundColor: badge.bg,
                              color: badge.color,
                              padding: '5px 14px',
                              borderRadius: '8px',
                              fontWeight: 950,
                              fontSize: '1rem',
                              textTransform: 'uppercase'
                            }}
                          >
                            Moving to {tName}
                          </span>
                          <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 700 }}>
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
                                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                fontSize: '1.05rem'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ 
                                  backgroundColor: '#f59e0b', 
                                  color: '#000000', 
                                  width: '28px', 
                                  height: '28px', 
                                  borderRadius: '50%', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  fontWeight: 950, 
                                  fontSize: '0.95rem' 
                                }}>
                                  {item.orderNumber}
                                </span>
                                <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '1.15rem' }}>
                                  {getMemberName(item.playerId)}
                                </span>
                              </div>
                              <div>
                                <span style={{ color: '#10b981', fontWeight: 900, fontSize: '1.1rem' }}>
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
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '16px 20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '1.05rem',
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
                  padding: '16px 20px',
                  backgroundColor: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '12px',
                  fontWeight: 950,
                  fontSize: '1.15rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 6px 20px rgba(239, 68, 68, 0.5)'
                }}
              >
                <Shuffle size={22} />
                <span>Confirm & Break Table</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
