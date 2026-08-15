import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';
import type { Member } from '../types';

interface EliminationModalProps {
  isOpen: boolean;
  playerName: string;
  bountiesWon: number;
  setBountiesWon: (n: number) => void;
  onCancel: () => void;
  onConfirm: (bounties: number, additionalPlayers?: { memberId: string; bounties: number }[]) => void;
  isAbsolute?: boolean;
  initialBounties?: number;
  activePlayersList?: { memberId: string; bountiesCollected: number }[];
  members?: Member[];
  primaryPlayerId?: string;
  onPauseClock?: () => void;
}

export const EliminationModal: React.FC<EliminationModalProps> = ({
  isOpen,
  playerName,
  bountiesWon,
  setBountiesWon,
  onCancel,
  onConfirm,
  isAbsolute,
  initialBounties,
  activePlayersList = [],
  members = [],
  primaryPlayerId,
  onPauseClock
}) => {
  const [isMultiPlayer, setIsMultiPlayer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [eliminationList, setEliminationList] = useState<{ memberId: string; name: string; bounties: number }[]>([]);

  useEffect(() => {
    if (isOpen && primaryPlayerId) {
      setEliminationList([{ memberId: primaryPlayerId, name: playerName, bounties: initialBounties || 0 }]);
      setIsMultiPlayer(false);
      setSearchQuery('');
    }
  }, [isOpen, primaryPlayerId, playerName, initialBounties]);

  // Keep list item 0 in sync with primary bountiesWon state
  useEffect(() => {
    setEliminationList(prev => {
      if (prev.length > 0 && prev[0].memberId === primaryPlayerId) {
        const copy = [...prev];
        if (copy[0].bounties !== bountiesWon) {
          copy[0].bounties = bountiesWon;
          return copy;
        }
      }
      return prev;
    });
  }, [bountiesWon, primaryPlayerId]);

  // Automatically pause clock if multi-player option is toggled on
  useEffect(() => {
    if (isMultiPlayer) {
      onPauseClock?.();
    }
  }, [isMultiPlayer, onPauseClock]);

  if (!isOpen) return null;

  const otherActivePlayers = activePlayersList
    .filter(p => p.memberId !== primaryPlayerId)
    .map(p => {
      const m = members.find(mem => mem.id === p.memberId);
      const name = m ? `${m.firstName} ${m.lastName}` : p.memberId;
      return { memberId: p.memberId, name, originalBounties: p.bountiesCollected };
    })
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleTogglePlayerSelection = (memberId: string, name: string, originalBounties: number) => {
    setEliminationList(prev => {
      const exists = prev.some(item => item.memberId === memberId);
      if (exists) {
        return prev.filter(item => item.memberId !== memberId);
      } else {
        return [...prev, { memberId, name, bounties: originalBounties }];
      }
    });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= eliminationList.length) return;

    const copy = [...eliminationList];
    const temp = copy[index];
    copy[index] = copy[newIndex];
    copy[newIndex] = temp;
    setEliminationList(copy);
  };

  const setPlayerBounties = (memberId: string, bounties: number) => {
    setEliminationList(prev => prev.map(item => item.memberId === memberId ? { ...item, bounties } : item));
    if (memberId === primaryPlayerId) {
      setBountiesWon(bounties);
    }
  };

  const handleConfirm = () => {
    if (isMultiPlayer && eliminationList.length > 1) {
      // Exclude primary player from additionalPlayers array to avoid duplication,
      // but retain the exact sorted order of ALL eliminations
      const primaryItem = eliminationList.find(item => item.memberId === primaryPlayerId);
      const primaryBounties = primaryItem ? primaryItem.bounties : bountiesWon;
      
      const additional = eliminationList.map(item => ({
        memberId: item.memberId,
        bounties: item.bounties
      }));
      onConfirm(primaryBounties, additional);
    } else {
      onConfirm(bountiesWon, []);
    }
  };

  return (
    <div style={{
      position: isAbsolute ? 'absolute' : 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      zIndex: 1000001
    }}>
      <div className="glass-card animate-slide-up" style={{ 
        width: '100%', 
        maxWidth: isMultiPlayer ? '750px' : '400px', 
        backgroundColor: '#FFFFFF', 
        color: '#1A202C', 
        padding: '24px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        transition: 'max-width 0.2s ease-in-out'
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>
          Eliminate Player
        </h3>

        {/* Multi-Player Toggle Checkbox */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 12px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          marginBottom: '16px',
          cursor: 'pointer',
          userSelect: 'none'
        }} onClick={() => setIsMultiPlayer(!isMultiPlayer)}>
          <input
            type="checkbox"
            checked={isMultiPlayer}
            onChange={(e) => setIsMultiPlayer(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-emerald)' }}
            onClick={(e) => e.stopPropagation()}
          />
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>
            Bust out multiple players (same hand)
          </span>
        </div>

        {isMultiPlayer ? (
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '20px',
            textAlign: 'left',
            overflowY: 'auto',
            flex: 1,
            paddingRight: '4px'
          }}>
            {/* Left Column: Selector list */}
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#4b5563', margin: 0 }}>
                1. Select Other Busted Players
              </h4>
              
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search active players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ padding: '8px 12px 8px 34px', fontSize: '0.9rem', width: '100%' }}
                />
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              </div>

              <div style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                maxHeight: '260px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#f9fafb'
              }}>
                {otherActivePlayers.map(p => {
                  const isChecked = eliminationList.some(item => item.memberId === p.memberId);
                  return (
                    <label
                      key={p.memberId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'background-color 0.15s ease'
                      }}
                      className="interactive"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleTogglePlayerSelection(p.memberId, p.name, p.originalBounties)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--color-emerald)' }}
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{p.name}</span>
                    </label>
                  );
                })}
                {otherActivePlayers.length === 0 && (
                  <div style={{ padding: '16px', color: '#9ca3af', textAlign: 'center', fontSize: '0.85rem' }}>
                    No other active players found.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Ordered List & Bounties */}
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#4b5563', margin: 0 }}>
                2. Order by Stack Size (Shortest First)
              </h4>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 4px 0', fontStyle: 'italic' }}>
                Move players so they are ranked from shortest stack (first eliminated) at the top, to largest stack (last eliminated) at the bottom.
              </p>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {eliminationList.map((item, idx) => (
                  <div
                    key={item.memberId}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '10px 12px',
                      backgroundColor: item.memberId === primaryPlayerId ? 'rgba(16, 185, 129, 0.05)' : '#ffffff',
                      border: item.memberId === primaryPlayerId ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>
                        {idx + 1}. {item.name} {item.memberId === primaryPlayerId && <span style={{ fontSize: '0.75rem', color: 'var(--color-emerald)', fontWeight: 600 }}>(Selected)</span>}
                      </span>
                      {/* Up / Down Controls */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveItem(idx, 'up')}
                          className="btn btn-secondary"
                          style={{ padding: '2px 4px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Move up (shorter stack)"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === eliminationList.length - 1}
                          onClick={() => moveItem(idx, 'down')}
                          className="btn btn-secondary"
                          style={{ padding: '2px 4px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Move down (larger stack)"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Compact Bounties Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>Bounties won:</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[0, 1, 2, 3].map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setPlayerBounties(item.memberId, n)}
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: item.bounties === n ? '2px solid var(--color-emerald)' : '1px solid var(--border-subtle)',
                              backgroundColor: item.bounties === n ? 'var(--color-emerald)' : '#ffffff',
                              color: item.bounties === n ? '#ffffff' : '#4b5563',
                              padding: 0,
                              cursor: 'pointer'
                            }}
                          >
                            {n}
                          </button>
                        ))}
                        {/* Custom Input for > 3 bounties */}
                        <input
                          type="number"
                          min={0}
                          value={item.bounties > 3 ? item.bounties : ''}
                          onChange={(e) => setPlayerBounties(item.memberId, Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="+"
                          style={{
                            width: '28px',
                            height: '24px',
                            borderRadius: '4px',
                            border: item.bounties > 3 ? '2px solid var(--color-emerald)' : '1px solid var(--border-subtle)',
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: 0,
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {initialBounties !== undefined && initialBounties > 0 && (
              <div style={{
                backgroundColor: 'rgba(217, 119, 6, 0.1)',
                border: '1px solid #d97706',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                fontSize: '0.85rem',
                color: '#b45309',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'left'
              }}>
                <span>⚠️</span>
                <span>
                  This player already has <strong>{initialBounties}</strong> bounty/bounties recorded. Please update and confirm the total number of bounties they collected.
                </span>
              </div>
            )}

            <div className="form-group" style={{ textAlign: 'center' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600 }}>Number of Bounties Won</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', margin: '12px 0' }}>
                {[0, 1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setBountiesWon(num);
                      onConfirm(num);
                    }}
                    className={`btn ${bountiesWon === num ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      width: '45px',
                      height: '45px',
                      borderRadius: '50%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      padding: 0,
                      border: bountiesWon === num ? '2px solid var(--color-emerald)' : '1px solid var(--border-subtle)'
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Or enter custom bounties won:</label>
                <input
                  type="number"
                  min={0}
                  value={bountiesWon}
                  onChange={(e) => setBountiesWon(Math.max(0, parseInt(e.target.value) || 0))}
                  className="form-input"
                  style={{ textAlign: 'center', padding: '8px 12px', fontSize: '1rem', width: '100%' }}
                  placeholder="Enter bounties won"
                />
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <button onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleConfirm} className="btn btn-danger">
            {isMultiPlayer && eliminationList.length > 1 ? `Confirm Eliminations (${eliminationList.length})` : 'Confirm Elimination'}
          </button>
        </div>
      </div>
    </div>
  );
};
