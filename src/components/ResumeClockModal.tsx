import React from 'react';
import { createPortal } from 'react-dom';
import { Play, X } from 'lucide-react';
import type { PlayerMoveAssignment } from '../utils/tableBalancing';
import { useApp } from '../context/AppContext';

interface ResumeClockModalProps {
  isOpen: boolean;
  modalData: {
    title: string;
    message: string;
    assignments?: PlayerMoveAssignment[];
  } | null;
  onStartClock: () => void;
  onKeepPaused: () => void;
}

const TABLE_THEME_BADGES: Record<string, { bg: string; color: string }> = {
  'red table': { bg: '#EE204D', color: '#ffffff' },
  'blue table': { bg: '#1F75FE', color: '#ffffff' },
  'gold table': { bg: '#E6BE8A', color: '#000000' },
  'gray table': { bg: '#8B8680', color: '#000000' },
  'purple table': { bg: '#7442C8', color: '#ffffff' }
};

export const ResumeClockModal: React.FC<ResumeClockModalProps> = ({
  isOpen,
  modalData,
  onStartClock,
  onKeepPaused
}) => {
  const { state } = useApp();

  if (!isOpen || !modalData) return null;

  const portalTarget = typeof document !== 'undefined' ? (document.fullscreenElement || document.body) : null;
  if (!portalTarget) return null;

  const getMemberName = (id: string) => {
    const m = state.members.find(member => member.id === id);
    return m ? `${m.firstName} ${m.lastName}` : 'Player';
  };

  const formatOpenSeatOrder = (orderNum: number) => {
    if (orderNum === 1) return '1st Open Seat';
    if (orderNum === 2) return '2nd Open Seat';
    if (orderNum === 3) return '3rd Open Seat';
    return `${orderNum}th Open Seat`;
  };

  const assignments = modalData.assignments || [];
  const grouped = assignments.reduce((acc, item) => {
    if (!acc[item.targetTable]) acc[item.targetTable] = [];
    acc[item.targetTable].push(item);
    return acc;
  }, {} as Record<string, PlayerMoveAssignment[]>);

  const targetTables = Object.keys(grouped);

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
        backgroundColor: '#041408',
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.12) 0%, transparent 65%)',
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '18px',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              border: '2px solid rgba(16, 185, 129, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981'
            }}
          >
            <Play size={32} fill="#10b981" style={{ marginLeft: '3px' }} />
          </div>
          <div>
            <span style={{ fontSize: '1rem', color: '#fbbf24', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '2px' }}>
              TABLE REORGANIZATION COMPLETE
            </span>
            <h2 style={{ fontSize: '2.3rem', fontWeight: 950, margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>
              {modalData.title}
            </h2>
            <p style={{ fontSize: '1.15rem', color: '#cbd5e1', margin: 0, marginTop: '2px', fontWeight: 700 }}>
              {modalData.message}
            </p>
          </div>
        </div>
        <button
          onClick={onKeepPaused}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1.5px solid rgba(255, 255, 255, 0.2)',
            color: '#cbd5e1',
            cursor: 'pointer',
            padding: '10px 22px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
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
          <X size={20} />
          <span>Exit</span>
        </button>
      </div>

      {/* 2 x 2 Grid of Move Assignments */}
      {targetTables.length > 0 && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', minHeight: 0, overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
          {targetTables.map(tName => {
            const badge = TABLE_THEME_BADGES[tName.toLowerCase()] || { bg: '#334155', color: '#fff' };
            const playerList = grouped[tName] || [];

            return (
              <div
                key={tName}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '2px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: '18px',
                  padding: '16px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      backgroundColor: badge.bg,
                      color: badge.color,
                      padding: '8px 18px',
                      borderRadius: '10px',
                      fontWeight: 950,
                      fontSize: '1.3rem',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)'
                    }}
                  >
                    Moving to {tName}
                  </span>
                  <span style={{ fontSize: '1.15rem', color: '#cbd5e1', fontWeight: 850 }}>
                    {playerList.length} player{playerList.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {playerList.map(item => (
                    <div
                      key={item.playerId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        border: '1.5px solid rgba(255, 255, 255, 0.12)',
                        padding: '12px 18px',
                        borderRadius: '12px',
                        gap: '16px'
                      }}
                    >
                      {/* Left: Open Seat Position */}
                      <div style={{ flexShrink: 0 }}>
                        <span style={{ 
                          color: '#10b981', 
                          fontWeight: 950, 
                          fontSize: '1.75rem',
                          letterSpacing: '-0.01em',
                          whiteSpace: 'nowrap'
                        }}>
                          {formatOpenSeatOrder(item.orderNumber)}
                        </span>
                      </div>

                      {/* Right: Player Name */}
                      <div style={{ overflow: 'hidden', textAlign: 'right' }}>
                        <span style={{ 
                          fontWeight: 950, 
                          color: '#ffffff', 
                          fontSize: '1.85rem', 
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
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
        <button
          onClick={onStartClock}
          style={{
            width: '100%',
            padding: '20px 32px',
            fontWeight: 950,
            fontSize: '1.6rem',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            borderRadius: '16px',
            backgroundColor: '#10b981',
            border: 'none',
            color: '#ffffff',
            boxShadow: '0 10px 30px rgba(16, 185, 129, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#059669';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#10b981';
          }}
        >
          <Play size={28} fill="#ffffff" />
          <span>START THE CLOCK</span>
        </button>

        <button
          onClick={onKeepPaused}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.65)',
            fontSize: '1.1rem',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '8px'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)';
          }}
        >
          Keep Clock Paused
        </button>
      </div>
    </div>,
    portalTarget
  );
};
