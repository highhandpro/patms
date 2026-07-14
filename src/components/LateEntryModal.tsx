import React from 'react';
import type { Member } from '../types';

interface LateEntryModalProps {
  isOpen: boolean;
  activeTournament: any;
  members: Member[];
  seating: Record<string, string[]>;
  selectedLateMemberId: string;
  setSelectedLateMemberId: (id: string) => void;
  selectedLateTable: string;
  setSelectedLateTable: (t: string) => void;
  lateSearchQuery: string;
  setLateSearchQuery: (q: string) => void;
  showLateDropdown: boolean;
  setShowLateDropdown: (show: boolean) => void;
  getMemberName: (id: string) => string;
  onCancel: () => void;
  onSubmit: () => void;
}

export const LateEntryModal: React.FC<LateEntryModalProps> = ({
  isOpen,
  activeTournament,
  members,
  seating,
  selectedLateMemberId,
  setSelectedLateMemberId,
  selectedLateTable,
  setSelectedLateTable,
  lateSearchQuery,
  setLateSearchQuery,
  showLateDropdown,
  setShowLateDropdown,
  getMemberName,
  onCancel,
  onSubmit
}) => {
  if (!isOpen || !activeTournament) return null;

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
      zIndex: 1001,
      padding: '20px'
    }}>
      <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '450px', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Add Late Entry</h3>
        
        {/* Search Input for Member Lookup */}
        <div className="form-group" style={{ position: 'relative', marginBottom: 0 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.85rem' }}>Search Registry Player</label>
          <input
            type="text"
            placeholder="Type member name or ID..."
            value={lateSearchQuery}
            onChange={(e) => {
              setLateSearchQuery(e.target.value);
              setShowLateDropdown(true);
            }}
            onFocus={() => setShowLateDropdown(true)}
            className="form-input"
            style={{ padding: '10px 14px' }}
          />

          {showLateDropdown && lateSearchQuery.trim() !== '' && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              maxHeight: '180px',
              overflowY: 'auto',
              zIndex: 20,
              boxShadow: 'var(--shadow-md)'
            }}>
              {(() => {
                const registeredIds = activeTournament.entries.map((e: any) => e.memberId);
                const matched = members
                  .filter(m => !registeredIds.includes(m.id))
                  .filter(m => `${m.firstName} ${m.lastName}`.toLowerCase().includes(lateSearchQuery.toLowerCase()) || m.id.toLowerCase().includes(lateSearchQuery.toLowerCase()));

                if (matched.length > 0) {
                  return matched.map(m => (
                    <div
                      key={m.id}
                      onClick={() => {
                        setSelectedLateMemberId(m.id);
                        setLateSearchQuery(`${m.firstName} ${m.lastName}`);
                        setShowLateDropdown(false);
                      }}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid var(--border-subtle)'
                      }}
                      className="interactive"
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.firstName} {m.lastName}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{m.id}</span>
                    </div>
                  ));
                }

                return (
                  <div style={{ padding: '12px 16px', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.85rem' }}>
                    No unregistered members match.
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {selectedLateMemberId && (
          <div style={{ fontSize: '0.85rem', padding: '10px 12px', backgroundColor: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: 'var(--color-emerald)' }}>
            Selected Player: <strong>{getMemberName(selectedLateMemberId)} ({selectedLateMemberId})</strong>
          </div>
        )}

        {/* Select Destination Table */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.85rem' }}>Assign to Table</label>
          <select
            value={selectedLateTable}
            onChange={(e) => setSelectedLateTable(e.target.value)}
            className="form-input"
            style={{ padding: '10px 14px' }}
          >
            <option value="" disabled>-- Select a Table --</option>
            {Object.keys(seating).map(tableName => {
              const currentSize = seating[tableName]?.filter(id => id !== "").length ?? 0;
              const isFull = currentSize >= 10;
              return (
                <option key={tableName} value={tableName} disabled={isFull}>
                  {tableName.toUpperCase()} ({currentSize}/10 seated) {isFull ? ' (FULL)' : ''}
                </option>
              );
            })}
            {Object.keys(seating).length < 5 && (
              <option value="create_new">
                + Create New Table
              </option>
            )}
          </select>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            style={{ padding: '8px 16px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="btn btn-primary"
            disabled={!selectedLateMemberId || !selectedLateTable}
            style={{ padding: '8px 16px' }}
          >
            Confirm late entry
          </button>
        </div>
      </div>
    </div>
  );
};
