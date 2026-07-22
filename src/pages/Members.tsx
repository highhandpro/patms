import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { calculateMemberStats } from '../utils/stats';
import { UserPlus, Phone, Mail, Calendar, Eye, Edit2, Trash2, X } from 'lucide-react';
import type { Member } from '../types';
import { initializeApp, deleteApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '../firebase';

interface MembersProps {
  isAddMemberOpen: boolean;
  setIsAddMemberOpen: (open: boolean) => void;
  isSubAdmin?: boolean;
  isChiefAdmin?: boolean;
}

export const Members: React.FC<MembersProps> = ({ isAddMemberOpen, setIsAddMemberOpen, isSubAdmin, isChiefAdmin }) => {
  const { state, addMember, updateMember, deleteMember, approveMemberUpdate, rejectMemberUpdate, updateTournament } = useApp();
  const [search, setSearch] = useState('');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedMemberForProfile, setSelectedMemberForProfile] = useState<Member | null>(null);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [role, setRole] = useState<'chief-admin' | 'tournament-director' | 'admin' | 'player'>('player');
  const [memberIdInput, setMemberIdInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [cardUrl, setCardUrl] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [pin, setPin] = useState('');
  const [isDealer, setIsDealer] = useState(false);

  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [playerAId, setPlayerAId] = useState('');
  const [playerBId, setPlayerBId] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const [mergeErrorMsg, setMergeErrorMsg] = useState<string | null>(null);
  const [mergeSuccessMsg, setMergeSuccessMsg] = useState<string | null>(null);

  const activeMembers = state.members.filter(m => !m.isDeleted);

  const getPotentialDuplicates = () => {
    const dups: Array<{ playerA: Member; playerB: Member; reason: string }> = [];
    const seen = new Set<string>();

    for (let i = 0; i < activeMembers.length; i++) {
      for (let j = i + 1; j < activeMembers.length; j++) {
        const m1 = activeMembers[i];
        const m2 = activeMembers[j];

        const name1 = `${m1.firstName.trim()} ${m1.lastName.trim()}`.toLowerCase();
        const name2 = `${m2.firstName.trim()} ${m2.lastName.trim()}`.toLowerCase();

        const email1 = m1.email?.trim().toLowerCase();
        const email2 = m2.email?.trim().toLowerCase();

        const phone1 = m1.phone?.replace(/\D/g, '');
        const phone2 = m2.phone?.replace(/\D/g, '');

        let matchReason = '';
        if (name1 === name2) {
          matchReason = 'Identical Names';
        } else if (email1 && email2 && email1 === email2) {
          matchReason = `Matching Email (${m1.email})`;
        } else if (phone1 && phone2 && phone1 === phone2) {
          matchReason = `Matching Phone (${m1.phone})`;
        }

        if (matchReason) {
          const key = [m1.id, m2.id].sort().join('-');
          if (!seen.has(key)) {
            seen.add(key);
            dups.push({ playerA: m1, playerB: m2, reason: matchReason });
          }
        }
      }
    }
    return dups;
  };

  const handleExecuteMerge = async () => {
    if (!playerAId || !playerBId) {
      setMergeErrorMsg('Please select both players.');
      return;
    }
    if (playerAId === playerBId) {
      setMergeErrorMsg('Cannot merge a player into themselves.');
      return;
    }

    const playerA = activeMembers.find(m => m.id === playerAId);
    const playerB = activeMembers.find(m => m.id === playerBId);

    if (!playerA || !playerB) {
      setMergeErrorMsg('Selected players not found.');
      return;
    }

    if (!window.confirm(`Are you sure you want to merge ${playerB.firstName} ${playerB.lastName} into ${playerA.firstName} ${playerA.lastName}? This will combine all tournament records/points and soft-delete ${playerB.firstName}'s profile.`)) {
      return;
    }

    setIsMerging(true);
    setMergeErrorMsg(null);
    setMergeSuccessMsg(null);

    try {
      const combinedNotes = [playerA.notes, playerB.notes].filter(Boolean).join('\n');
      const updatedFields: Partial<Member> = {};

      if (!playerA.email && playerB.email) updatedFields.email = playerB.email;
      if (!playerA.phone && playerB.phone) updatedFields.phone = playerB.phone;
      if (!playerA.nickname && playerB.nickname) updatedFields.nickname = playerB.nickname;
      if (!playerA.pin && playerB.pin) updatedFields.pin = playerB.pin;
      if (combinedNotes !== playerA.notes) updatedFields.notes = combinedNotes;

      const tournamentsToUpdate = state.tournaments.filter(t => 
        t.entries.some(e => e.memberId === playerA.id || e.memberId === playerB.id)
      );

      for (const t of tournamentsToUpdate) {
        const entryA = t.entries.find(e => e.memberId === playerA.id);
        const entryB = t.entries.find(e => e.memberId === playerB.id);

        let updatedEntries = [...t.entries];

        if (entryB) {
          if (entryA) {
            const combinedBounties = (entryA.bountiesCollected || 0) + (entryB.bountiesCollected || 0);
            const combinedPayout = (entryA.payoutEarned || 0) + (entryB.payoutEarned || 0);
            
            const betterFinish = Math.min(entryA.finishPosition || 999, entryB.finishPosition || 999);
            const finalFinish = betterFinish === 999 ? undefined : betterFinish;
            
            const betterPoints = Math.max(entryA.pointsEarned || 0, entryB.pointsEarned || 0);

            let finalEliminatedBy = entryA.eliminatedBy;
            if (entryA.finishPosition && entryB.finishPosition) {
              if ((entryA.finishPosition || 999) < (entryB.finishPosition || 999)) {
                finalEliminatedBy = entryA.eliminatedBy;
              } else {
                finalEliminatedBy = entryB.eliminatedBy;
              }
            }
            if (finalEliminatedBy === playerA.id || finalEliminatedBy === playerB.id) {
              finalEliminatedBy = undefined;
            }

            const updatedEntryA = {
              ...entryA,
              bountiesCollected: combinedBounties,
              payoutEarned: combinedPayout,
              finishPosition: finalFinish,
              pointsEarned: betterPoints,
              hasBuyIn: entryA.hasBuyIn || entryB.hasBuyIn,
              hasAddon: entryA.hasAddon || entryB.hasAddon,
              hasDealerAppreciation: entryA.hasDealerAppreciation || entryB.hasDealerAppreciation,
              eliminatedAt: (entryA.finishPosition || 999) < (entryB.finishPosition || 999) ? entryA.eliminatedAt : entryB.eliminatedAt,
              eliminatedBy: finalEliminatedBy
            };

            updatedEntries = updatedEntries
              .filter(e => e.memberId !== playerB.id)
              .map(e => e.memberId === playerA.id ? updatedEntryA : e);
          } else {
            updatedEntries = updatedEntries.map(e => {
              if (e.memberId === playerB.id) {
                return {
                  ...e,
                  memberId: playerA.id,
                  eliminatedBy: e.eliminatedBy === playerB.id || e.eliminatedBy === playerA.id ? undefined : e.eliminatedBy
                };
              }
              return e;
            });
          }

          await updateTournament(t.id, { entries: updatedEntries });
        }
      }

      if (Object.keys(updatedFields).length > 0) {
        await updateMember(playerA.id, updatedFields);
      }

      await deleteMember(playerB.id);

      setMergeSuccessMsg(`Successfully merged ${playerB.firstName} ${playerB.lastName} into ${playerA.firstName} ${playerA.lastName}!`);
      setPlayerAId('');
      setPlayerBId('');
    } catch (err: any) {
      console.error(err);
      setMergeErrorMsg(err.message || 'An error occurred during merging.');
    } finally {
      setIsMerging(false);
    }
  };


  // Phone input formatting
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanVal = rawVal.replace(/[^\d]/g, '');
    const len = cleanVal.length;
    
    if (len === 0) setPhone('');
    else if (len <= 3) setPhone(cleanVal);
    else if (len <= 6) setPhone(`(${cleanVal.slice(0, 3)}) ${cleanVal.slice(3)}`);
    else setPhone(`(${cleanVal.slice(0, 3)}) ${cleanVal.slice(3, 6)}-${cleanVal.slice(6, 10)}`);
  };

  const handleOpenAdd = () => {
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setRole('player');
    setMemberIdInput('');
    setLogoUrl('');
    setCardUrl('');
    setTempPassword('');
    setPin('');
    setIsDealer(false);
    setErrorMsg(null);
    setIsAddMemberOpen(true);
  };

  const handleOpenEdit = (m: Member) => {
    setEditingMember(m);
    setFirstName(m.firstName);
    setLastName(m.lastName);
    setPhone(m.phone);
    setEmail(m.email);
    setNotes(m.notes || '');
    setRole(m.role || 'player');
    setMemberIdInput(m.id);
    setLogoUrl(m.logoUrl || '');
    setCardUrl(m.cardUrl || '');
    setTempPassword('');
    setPin(m.pin || '');
    setIsDealer(!!m.isDealer);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    const cleanEmail = email.trim().toLowerCase();

    // If role is administrative, check/create Firebase Auth account
    if (role !== 'player') {
      if (!cleanEmail) {
        setErrorMsg("Email address is required for administrative roles.");
        return;
      }

      const isNewAdminRole = !editingMember || !editingMember.role || editingMember.role === 'player';
      const needsPass = isNewAdminRole || tempPassword.trim().length > 0;

      if (needsPass) {
        const pass = tempPassword.trim();
        if (pass.length < 6) {
          setErrorMsg("Password must be at least 6 characters long.");
          return;
        }

        try {
          const appName = 'SecondaryAuth_' + Math.random().toString(36).slice(2, 9);
          const secondaryApp = initializeApp(firebaseConfig, appName);
          const secondaryAuth = initializeAuth(secondaryApp, {
            persistence: inMemoryPersistence
          });
          await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, pass);
          await deleteApp(secondaryApp);
        } catch (authErr: any) {
          console.error("Firebase auth creation failed:", authErr);
          if (authErr.code !== 'auth/email-already-in-use') {
            setErrorMsg("Auth Error: " + (authErr.message || authErr.code));
            return;
          }
        }
      }
    }

    if (pin.trim() && !/^\d{4}$/.test(pin.trim())) {
      setErrorMsg('PIN must be exactly 4 digits.');
      return;
    }

    try {
      if (editingMember) {
        await updateMember(editingMember.id, {
          firstName,
          lastName,
          phone,
          email,
          notes,
          logoUrl,
          cardUrl,
          role,
          pin: pin.trim(),
          isDealer: isDealer
        });
        setEditingMember(null);
      } else {
        if (memberIdInput.trim()) {
          const idExists = state.members.some(m => m.id === memberIdInput.trim());
          if (idExists) {
            setErrorMsg(`Member ID "${memberIdInput.trim()}" is already assigned. Please use a unique ID.`);
            return;
          }
        }
        await addMember(firstName, lastName, phone, email, notes, memberIdInput.trim(), logoUrl, cardUrl, role, pin.trim(), isDealer);
        setIsAddMemberOpen(false);
      }

      // Reset fields
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setNotes('');
      setRole('player');
      setLogoUrl('');
      setCardUrl('');
      setMemberIdInput('');
      setTempPassword('');
      setPin('');
      setIsDealer(false);
      setErrorMsg(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save changes: ' + (err as Error).message);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to retire member ${name}? This will preserve their historical tournament rankings but remove them from active lookups.`)) {
      deleteMember(id);
    }
  };

  const exportMembersCSV = () => {
    const headers = ["Member ID", "First Name", "Last Name", "Phone", "Email", "Joined Date", "Notes"];
    const rows = state.members
      .filter(m => !m.isDeleted)
      .map(m => [
        m.id,
        m.firstName,
        m.lastName,
        m.phone,
        m.email,
        m.joinedDate,
        m.notes || ""
      ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `member_registry.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      let importedCount = 0;
      let skippedCount = 0;

      const startIndex = lines[0].toLowerCase().includes("name") || lines[0].toLowerCase().includes("id") ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
        const parts = matches.map(p => p.replace(/^"|"$/g, '').trim());

        if (parts.length >= 2) {
          let fName = parts[0];
          let lName = parts[1];
          let pNum = "";
          let emailAddr = "";
          let noteText = "";

          if (/^\d+$/.test(parts[0]) && parts.length >= 3) {
            fName = parts[1];
            lName = parts[2];
            pNum = parts[3] || "";
            emailAddr = parts[4] || "";
            noteText = parts[5] || "";
          } else {
            pNum = parts[2] || "";
            emailAddr = parts[3] || "";
            noteText = parts[4] || "";
          }

          if (fName && lName) {
            addMember(fName, lName, pNum, emailAddr, noteText);
            importedCount++;
          } else {
            skippedCount++;
          }
        } else {
          skippedCount++;
        }
      }

      alert(`Imported ${importedCount} members successfully!${skippedCount > 0 ? ` Skipped ${skippedCount} invalid rows.` : ''}`);
    };
    reader.readAsText(file);
  };

  // Filter members (only non-deleted ones, searchable by name, phone, email, memberId)
  const filteredMembers = activeMembers
    .filter(m => {
      const q = search.toLowerCase();
      return (
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.email.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.firstName.localeCompare(b.firstName) || a.lastName.localeCompare(b.lastName));

  // Calculate profile statistics if a member is clicked
  const profileStats = selectedMemberForProfile ? calculateMemberStats(state, selectedMemberForProfile.id) : null;

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
            Member Directory
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Manage member list, register new players, and view player profile statistics.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {!isSubAdmin && (
            <button className="btn btn-secondary" onClick={() => { setIsMergeModalOpen(true); setMergeErrorMsg(null); setMergeSuccessMsg(null); }}>
              <span>Merge Duplicates</span>
            </button>
          )}
          <button className="btn btn-secondary" onClick={exportMembersCSV}>
            <span>Export CSV</span>
          </button>
          {!isSubAdmin && (
            <>
              <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center' }}>
                <span>Import CSV</span>
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleCSVImport} 
                  style={{ display: 'none' }} 
                />
              </label>
              <button className="btn btn-primary" onClick={handleOpenAdd}>
                <UserPlus size={18} />
                <span>Register New Player</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pending Approvals Review Section */}
      {!isSubAdmin && state.pendingApprovals && state.pendingApprovals.length > 0 && (
        <div className="glass-card" style={{ border: '1px solid var(--color-gold)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-gold)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <span className="indicator indicator-gold" style={{ width: '8px', height: '8px', backgroundColor: 'var(--text-gold)' }}></span>
              <span>Pending Player Updates & Registrations</span>
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              Players have self-submitted the following contact info edits or guest sign-ups. Please review and approve them.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {state.pendingApprovals.map(approval => {
              const originalMember = state.members.find(m => m.id === approval.memberId);
              const isGuest = approval.type === 'guest';
              
              return (
                <div 
                  key={approval.id} 
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>
                        {approval.firstName} {approval.lastName}
                      </span>
                      <span 
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: isGuest ? 'rgba(46, 155, 69, 0.12)' : 'rgba(212, 175, 55, 0.12)',
                          color: isGuest ? 'var(--color-emerald)' : 'var(--text-gold)'
                        }}
                      >
                        {isGuest ? 'New Guest' : `Member #${approval.memberId}`}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {/* Phone */}
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Phone: </span>
                        {isGuest ? (
                          <span>{approval.phone || 'N/A'}</span>
                        ) : (
                          <>
                            <span style={{ textDecoration: 'line-through', marginRight: '6px' }}>{originalMember?.phone || 'None'}</span>
                            <span style={{ color: 'var(--color-emerald)', fontWeight: 600 }}>→ {approval.phone || 'None'}</span>
                          </>
                        )}
                      </div>

                      {/* Email */}
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Email: </span>
                        {isGuest ? (
                          <span>{approval.email || 'N/A'}</span>
                        ) : (
                          <>
                            <span style={{ textDecoration: 'line-through', marginRight: '6px' }}>{originalMember?.email || 'None'}</span>
                            <span style={{ color: 'var(--color-emerald)', fontWeight: 600 }}>→ {approval.email || 'None'}</span>
                          </>
                        )}
                      </div>


                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => approveMemberUpdate(approval.id)}
                      className="btn btn-primary"
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        backgroundColor: 'var(--color-emerald)',
                        borderColor: 'var(--color-emerald)',
                        color: 'black'
                      }}
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => rejectMemberUpdate(approval.id)}
                      className="btn btn-secondary"
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        backgroundColor: 'transparent',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: 'var(--color-pomegranate)'
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search and List */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Search Input */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <input
            type="text"
            placeholder="Search by name, phone, or member ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
          />
        </div>

        {/* Directory Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>ID</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Joined</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Dealer</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length > 0 ? (
                filteredMembers.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{m.id}</td>
                    <td style={{ fontWeight: 600 }}>
                      {m.firstName} {m.lastName} {m.cardUrl ? ' 🖼️' : ''}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                          {m.phone || 'No phone'}
                        </span>
                        <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                          <Mail size={12} style={{ color: 'var(--text-muted)' }} />
                          {m.email || 'No email'}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                        {m.joinedDate}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={!!m.isDealer}
                        onChange={(e) => updateMember(m.id, { isDealer: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: isSubAdmin ? 'not-allowed' : 'pointer' }}
                        disabled={isSubAdmin}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          title="View Profile Stats"
                          onClick={() => setSelectedMemberForProfile(m)}
                          className="btn btn-ghost"
                          style={{ padding: '6px' }}
                        >
                          <Eye size={16} />
                        </button>
                        {!isSubAdmin && (m.role !== 'chief-admin' || isChiefAdmin) && (
                          <>
                            <button
                              title="Edit Info"
                              onClick={() => handleOpenEdit(m)}
                              className="btn btn-ghost"
                              style={{ padding: '6px' }}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              title="Retire Player"
                              onClick={() => handleDelete(m.id, `${m.firstName} ${m.lastName}`)}
                              className="btn btn-ghost"
                              style={{ padding: '6px', color: 'var(--color-danger)' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    {search ? 'No members match your search criteria.' : 'No active members registered.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal Overlay */}
      {(isAddMemberOpen || editingMember) && createPortal(
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
          zIndex: 999999,
          padding: '20px'
        }}>
          <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--bg-surface)', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {editingMember ? `Edit Member Info (${editingMember.id})` : 'Register New Player'}
              </h3>
              <button 
                onClick={() => { setIsAddMemberOpen(false); setEditingMember(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            {errorMsg && (
              <div style={{
                padding: '10px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                color: 'var(--color-danger)',
                fontSize: '0.85rem',
                fontWeight: 500,
                marginBottom: '16px'
              }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flexGrow: 1 }}>
              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '8px', paddingBottom: '8px', flexGrow: 1 }}>
                
                {/* Logo & Player Card Upload Section */}
              <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
                {/* Logo Upload Section */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Player Logo</span>
                  <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    color: 'var(--text-gold)',
                    fontSize: '2.5rem',
                    fontWeight: 800
                  }}>
                    {logoUrl ? (
                      <img src={logoUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      '♣'
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => document.getElementById('admin-edit-logo-input')?.click()}
                      className="btn btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                    >
                      Upload Logo
                    </button>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="btn btn-ghost"
                        style={{ padding: '3px 8px', fontSize: '0.7rem', color: 'var(--color-danger)', border: '1px solid rgba(239,68,68,0.15)' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    id="admin-edit-logo-input"
                    accept="image/png, image/jpeg, image/webp, image/svg+xml"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 1500 * 1024) {
                        alert('Maximum file size is 1.5 MB.');
                        return;
                      }
                      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
                      if (!allowedTypes.includes(file.type)) {
                        alert('Only PNG, JPG, WebP, and SVG formats are supported.');
                        return;
                      }
                      
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                          const canvas = document.createElement('canvas');
                          canvas.width = 768;
                          canvas.height = 768;
                          const ctx = canvas.getContext('2d');
                          if (!ctx) return;
                          
                          const size = Math.min(img.width, img.height);
                          const sx = (img.width - size) / 2;
                          const sy = (img.height - size) / 2;
                          
                          ctx.clearRect(0, 0, 768, 768);
                          ctx.drawImage(img, sx, sy, size, size, 0, 0, 768, 768);
                          
                          let dataUrl = canvas.toDataURL('image/webp', 0.8);
                          if (dataUrl.length > 900 * 1024) {
                            dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                          }
                          if (dataUrl.length > 900 * 1024) {
                            const smallCanvas = document.createElement('canvas');
                            smallCanvas.width = 512;
                            smallCanvas.height = 512;
                            const sCtx = smallCanvas.getContext('2d');
                            if (sCtx) {
                              sCtx.drawImage(canvas, 0, 0, 512, 512);
                              dataUrl = smallCanvas.toDataURL('image/jpeg', 0.6);
                            }
                          }
                          setLogoUrl(dataUrl);
                        };
                        img.src = event.target?.result as string;
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </div>

                {/* Player Card Upload Section */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Player Card (2" x 3.5")</span>
                  <div style={{
                    width: '100px',
                    height: '175px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    color: 'var(--text-gold)',
                    fontSize: '2rem',
                    fontWeight: 800,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}>
                    {cardUrl ? (
                      <img src={cardUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      '🃏'
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => document.getElementById('admin-edit-card-input')?.click()}
                      className="btn btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                    >
                      Upload Card
                    </button>
                    {cardUrl && (
                      <button
                        type="button"
                        onClick={() => setCardUrl('')}
                        className="btn btn-ghost"
                        style={{ padding: '3px 8px', fontSize: '0.7rem', color: 'var(--color-danger)', border: '1px solid rgba(239,68,68,0.15)' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    id="admin-edit-card-input"
                    accept="image/png, image/jpeg, image/webp, image/svg+xml"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
                      if (!allowedTypes.includes(file.type)) {
                        alert('Only PNG, JPG, WebP, and SVG formats are supported.');
                        return;
                      }
                      
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                          const canvas = document.createElement('canvas');
                          canvas.width = 1200;
                          canvas.height = 2100;
                          const ctx = canvas.getContext('2d');
                          if (!ctx) return;
                          
                          const targetRatio = 1200 / 2100;
                          const sourceRatio = img.width / img.height;
                          let sx, sy, sWidth, sHeight;
                          if (sourceRatio > targetRatio) {
                            sHeight = img.height;
                            sWidth = img.height * targetRatio;
                            sx = (img.width - sWidth) / 2;
                            sy = 0;
                          } else {
                            sWidth = img.width;
                            sHeight = img.width / targetRatio;
                            sx = 0;
                            sy = (img.height - sHeight) / 2;
                          }
                          
                          ctx.clearRect(0, 0, 1200, 2100);
                          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 1200, 2100);
                          
                          const dataUrl = canvas.toDataURL('image/webp', 0.85);
                          setCardUrl(dataUrl);
                        };
                        img.src = event.target?.result as string;
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </div>
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="member-id">Member ID</label>
                <input
                  id="member-id"
                  type="text"
                  disabled={!!editingMember}
                  placeholder="Auto-generated if left blank"
                  value={memberIdInput}
                  onChange={(e) => setMemberIdInput(e.target.value.replace(/\D/g, ''))}
                  className="form-input"
                  style={{
                    opacity: editingMember ? 0.6 : 1,
                    cursor: editingMember ? 'not-allowed' : 'text'
                  }}
                />
                {editingMember && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Member ID is locked and cannot be changed once assigned.
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="first-name">First Name</label>
                  <input
                    id="first-name"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="last-name">Last Name</label>
                  <input
                    id="last-name"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  type="text"
                  placeholder="e.g. (555) 555-5555"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="e.g. john.doe@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                <input
                  id="admin-dealer-checkbox"
                  type="checkbox"
                  checked={isDealer}
                  onChange={(e) => setIsDealer(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="admin-dealer-checkbox" style={{ fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', margin: 0, color: 'var(--text-primary)' }}>
                  Available/Willing to Deal (Dealer Status)
                </label>
              </div>

              {!isSubAdmin && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="role">Admin Role / Permissions</label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="form-input"
                  >
                    <option value="player">Player (Default - No Admin Access)</option>
                    <option value="admin">Admin (View-Only Admin Access)</option>
                    <option value="tournament-director">Tournament Director (Full Access, except Reset)</option>
                    {isChiefAdmin && (
                      <option value="chief-admin">Chief Administrator (Full Authority)</option>
                    )}
                  </select>
                </div>
              )}

              {!isSubAdmin && role !== 'player' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="tempPassword">
                    {editingMember && editingMember.role && editingMember.role !== 'player'
                      ? "Reset Password (leave blank to keep current)"
                      : "Temporary Password (min 6 characters)"}
                  </label>
                  <input
                    type="password"
                    id="tempPassword"
                    placeholder="Enter password"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    className="form-input"
                    required={!(editingMember && editingMember.role && editingMember.role !== 'player')}
                  />
                </div>
              )}

              {role === 'player' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="player-pin">4-Digit Security PIN (Optional)</label>
                  <input
                    type="password"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={4}
                    id="player-pin"
                    placeholder="Enter 4-digit PIN (leave blank to clear PIN)"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="form-input"
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block', lineHeight: 1.3 }}>
                    If left blank, the player will be required to log in via a temporary PIN emailed to their registered address.
                  </span>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="notes">Admin Notes</label>
                <textarea
                  id="notes"
                  placeholder="Accompanying notes (seating preference, host eligibility, etc.)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-input"
                  rows={3}
                  style={{ resize: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => { setIsAddMemberOpen(false); setEditingMember(null); }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingMember ? 'Save Changes' : 'Register Player'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Member Statistics Profile Modal */}
      {selectedMemberForProfile && profileStats && createPortal(
        <div 
          onClick={() => setSelectedMemberForProfile(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            overflowY: 'auto',
            zIndex: 999999,
            padding: '40px 20px'
          }}
        >
          <div 
            className="glass-card animate-slide-up" 
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '600px', backgroundColor: '#FFFFFF' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {selectedMemberForProfile.logoUrl ? (
                  <img 
                    src={selectedMemberForProfile.logoUrl} 
                    alt="Logo" 
                    style={{ width: '144px', height: '144px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} 
                  />
                ) : (
                  <div style={{ width: '144px', height: '144px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '4rem', color: 'var(--text-secondary)' }}>
                    ♣
                  </div>
                )}
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>MEMBER CARD ({selectedMemberForProfile.id})</span>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                    {selectedMemberForProfile.firstName} {selectedMemberForProfile.lastName}
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMemberForProfile(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Stats grid */}
            <div className="grid-cols-3" style={{ gap: '16px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Games Played</span>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '4px' }}>{profileStats.played}</h2>
              </div>
              <div style={{ backgroundColor: 'rgba(16,185,129,0.03)', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(16,185,129,0.1)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-emerald)' }}>Wins</span>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '4px', color: 'var(--text-emerald)' }}>{profileStats.wins}</h2>
              </div>
              <div style={{ backgroundColor: 'rgba(251,191,36,0.03)', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(251,191,36,0.1)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-gold)' }}>Top 10 Finishes</span>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '4px', color: 'var(--text-gold)' }}>{profileStats.top10}</h2>
              </div>
            </div>

            {/* Finance and averages */}
            <div className="grid-cols-2" style={{ gap: '16px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Cash Earnings</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-emerald)' }}>${profileStats.earnings}</span>
              </div>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Average Finish Position</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>#{profileStats.avgFinish || 'N/A'}</span>
              </div>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Bounties Collected</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-gold)' }}>{profileStats.bounties}</span>
              </div>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Season Points</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-gold)' }}>{profileStats.points} pts</span>
              </div>
            </div>

            {/* Recent Finishes History */}
            {profileStats.recentFinishes && profileStats.recentFinishes.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', marginBottom: '24px' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  Recent Game History
                </h4>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {profileStats.recentFinishes.map((pos, idx) => {
                    const isWin = pos === 1;
                    const isTop3 = pos <= 3;
                    return (
                      <div 
                        key={idx}
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '1rem',
                          background: isWin 
                            ? 'var(--color-emerald)' 
                            : (isTop3 ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)'),
                          color: isWin 
                            ? '#052e16' 
                            : (isTop3 ? 'var(--color-gold)' : 'var(--text-primary)'),
                          border: isTop3 
                            ? '1px solid var(--color-gold)' 
                            : '1px solid var(--border-subtle)'
                        }}
                        title={`Finished #${pos}`}
                      >
                        #{pos}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Profile Info */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact Details</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                <strong>Phone:</strong> {selectedMemberForProfile.phone || 'No phone recorded'}
              </p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                <strong>Email:</strong> {selectedMemberForProfile.email || 'No email recorded'}
              </p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                <strong>Auth Status:</strong> {selectedMemberForProfile.email ? '📧 Email Authentication Active' : '⚠️ No Email (Login Blocked)'}
              </p>
              {selectedMemberForProfile.notes && (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  <strong>Notes:</strong> {selectedMemberForProfile.notes}
                </p>
              )}
            </div>

            {selectedMemberForProfile.cardUrl && (
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Player Card</span>
                <img 
                  src={selectedMemberForProfile.cardUrl} 
                  alt="Player Card" 
                  style={{ 
                    width: '220px', 
                    height: '385px', 
                    borderRadius: '12px', 
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    objectFit: 'cover',
                    display: 'block'
                  }} 
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button 
                onClick={() => setSelectedMemberForProfile(null)}
                className="btn btn-primary"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isMergeModalOpen && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div 
            style={{
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '28px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              color: '#1A202C',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#1A202C' }}>
                Merge Duplicate Players
              </h2>
              <button 
                onClick={() => setIsMergeModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#718096', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Error and Success Alerts */}
            {mergeErrorMsg && (
              <div style={{ padding: '12px 16px', backgroundColor: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '8px', color: '#C53030', fontSize: '0.9rem', fontWeight: 500 }}>
                {mergeErrorMsg}
              </div>
            )}
            {mergeSuccessMsg && (
              <div style={{ padding: '12px 16px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', color: '#15803d', fontSize: '0.9rem', fontWeight: 500 }}>
                {mergeSuccessMsg}
              </div>
            )}

            {/* Suggestions Scan Panel */}
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 10px 0', color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                System Scan Suggestions
              </h3>
              {(() => {
                const dups = getPotentialDuplicates();
                if (dups.length === 0) {
                  return (
                    <span style={{ fontSize: '0.85rem', color: '#718096', fontStyle: 'italic' }}>
                      No potential duplicates detected by name, email, or phone.
                    </span>
                  );
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                    {dups.map((d, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1A202C' }}>
                            {d.playerA.firstName} {d.playerA.lastName} & {d.playerB.firstName} {d.playerB.lastName}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#718096' }}>
                            Reason: {d.reason} • IDs: {d.playerA.id} & {d.playerB.id}
                          </span>
                        </div>
                        <button 
                          className="btn btn-secondary" 
                          style={{ fontSize: '0.75rem', padding: '4px 10px', height: 'auto' }}
                          onClick={() => {
                            setPlayerAId(d.playerA.id);
                            setPlayerBId(d.playerB.id);
                            setMergeErrorMsg(null);
                            setMergeSuccessMsg(null);
                          }}
                        >
                          Review & Merge
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Selector Workspace */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Selector A */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4A5568', display: 'block', marginBottom: '6px' }}>
                  Player A (Saved Player - Profile to Keep)
                </label>
                <select
                  value={playerAId}
                  onChange={(e) => { setPlayerAId(e.target.value); setMergeErrorMsg(null); setMergeSuccessMsg(null); }}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #CBD5E0', borderRadius: '8px', fontSize: '0.9rem', backgroundColor: '#FFFFFF', color: '#1A202C' }}
                >
                  <option value="">Select a player...</option>
                  {activeMembers
                    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
                    .map(m => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName} (ID: {m.id})
                      </option>
                    ))}
                </select>
              </div>

              {/* Selector B */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4A5568', display: 'block', marginBottom: '6px' }}>
                  Player B (Merged Player - Profile to Merge & Delete)
                </label>
                <select
                  value={playerBId}
                  onChange={(e) => { setPlayerBId(e.target.value); setMergeErrorMsg(null); setMergeSuccessMsg(null); }}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #CBD5E0', borderRadius: '8px', fontSize: '0.9rem', backgroundColor: '#FFFFFF', color: '#1A202C' }}
                >
                  <option value="">Select a player to merge...</option>
                  {activeMembers
                    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
                    .map(m => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName} (ID: {m.id})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Comparison Workspace (Only shown if both selected) */}
            {(() => {
              const pA = activeMembers.find(m => m.id === playerAId);
              const pB = activeMembers.find(m => m.id === playerBId);

              if (!pA || !pB) return null;

              const willFillEmail = !pA.email && pB.email;
              const willFillPhone = !pA.phone && pB.phone;
              const willFillNickname = !pA.nickname && pB.nickname;
              const willFillPin = !pA.pin && pB.pin;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid #E2E8F0', paddingTop: '20px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Profile Comparison & Updates
                  </h3>
                  
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                          <th style={{ padding: '8px 12px', fontWeight: 700, color: '#4A5568', width: '20%' }}>Field</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700, color: '#4A5568', width: '40%' }}>Player A (Saved)</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700, color: '#4A5568', width: '40%' }}>Player B (Deleted)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #EDF2F7' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#718096' }}>Member ID</td>
                          <td style={{ padding: '8px 12px' }}>{pA.id}</td>
                          <td style={{ padding: '8px 12px', color: '#A0AEC0' }}>{pB.id} (will be removed)</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #EDF2F7' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#718096' }}>Full Name</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{pA.firstName} {pA.lastName}</td>
                          <td style={{ padding: '8px 12px' }}>{pB.firstName} {pB.lastName}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #EDF2F7' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#718096' }}>Nickname</td>
                          <td style={{ padding: '8px 12px', backgroundColor: willFillNickname ? '#F0FDF4' : 'transparent', color: willFillNickname ? '#15803D' : 'inherit', fontWeight: willFillNickname ? 600 : 400 }}>
                            {pA.nickname || (willFillNickname ? pB.nickname : 'None')}
                          </td>
                          <td style={{ padding: '8px 12px' }}>{pB.nickname || 'None'}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #EDF2F7' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#718096' }}>Phone</td>
                          <td style={{ padding: '8px 12px', backgroundColor: willFillPhone ? '#F0FDF4' : 'transparent', color: willFillPhone ? '#15803D' : 'inherit', fontWeight: willFillPhone ? 600 : 400 }}>
                            {pA.phone || (willFillPhone ? pB.phone : 'None')}
                          </td>
                          <td style={{ padding: '8px 12px' }}>{pB.phone || 'None'}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #EDF2F7' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#718096' }}>Email</td>
                          <td style={{ padding: '8px 12px', backgroundColor: willFillEmail ? '#F0FDF4' : 'transparent', color: willFillEmail ? '#15803D' : 'inherit', fontWeight: willFillEmail ? 600 : 400 }}>
                            {pA.email || (willFillEmail ? pB.email : 'None')}
                          </td>
                          <td style={{ padding: '8px 12px' }}>{pB.email || 'None'}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #EDF2F7' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#718096' }}>Security PIN</td>
                          <td style={{ padding: '8px 12px', backgroundColor: willFillPin ? '#F0FDF4' : 'transparent', color: willFillPin ? '#15803D' : 'inherit', fontWeight: willFillPin ? 600 : 400 }}>
                            {pA.pin ? '✓ Set' : (willFillPin ? '✓ Set (transferred)' : 'Not set')}
                          </td>
                          <td style={{ padding: '8px 12px' }}>{pB.pin ? '✓ Set' : 'Not set'}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#718096' }}>Profile Notes</td>
                          <td style={{ padding: '8px 12px', whiteSpace: 'pre-wrap' }}>
                            {[pA.notes, pB.notes].filter(Boolean).join('\n') || 'None'}
                          </td>
                          <td style={{ padding: '8px 12px' }}>{pB.notes || 'None'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ backgroundColor: '#FFFDF5', border: '1px solid #FEF08A', borderRadius: '8px', padding: '12px 14px', fontSize: '0.825rem', color: '#854D0E', lineHeight: '1.4' }}>
                    <strong>Note:</strong> Tournament results, payouts, bounties, and points from both profiles will be combined. Any matching entries in the same tournament will combine bounties/cash and keep the higher place/points.
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => { setPlayerAId(''); setPlayerBId(''); }}
                      className="btn btn-secondary"
                      disabled={isMerging}
                      style={{ color: '#4A5568' }}
                    >
                      Clear Selection
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteMerge}
                      className="btn btn-primary"
                      disabled={isMerging}
                      style={{ backgroundColor: '#3182CE', borderColor: '#3182CE' }}
                    >
                      {isMerging ? 'Merging Players...' : 'Merge Profiles & Combine Points'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
