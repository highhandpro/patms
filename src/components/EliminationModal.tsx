import React from 'react';

interface EliminationModalProps {
  isOpen: boolean;
  playerName: string;
  bountiesWon: number;
  setBountiesWon: (n: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export const EliminationModal: React.FC<EliminationModalProps> = ({
  isOpen,
  playerName,
  bountiesWon,
  setBountiesWon,
  onCancel,
  onConfirm
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
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
      <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-surface)' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px' }}>
          Eliminate {playerName}
        </h3>

        <div className="form-group">
          <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600 }}>Number of Bounties Won</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', margin: '12px 0' }}>
            {[0, 1, 2, 3, 4, 5].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => setBountiesWon(num)}
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn btn-danger">
            Confirm Elimination
          </button>
        </div>
      </div>
    </div>
  );
};
