import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Trophy, ChevronDown, User, LogOut, LogIn, Settings } from 'lucide-react';

interface PlayerNavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  loggedInMemberId: string | null;
  setLoggedInMemberId: (id: string | null) => void;
  setPortalMode: (mode: 'player' | 'admin') => void;
  onOpenLogin: () => void;
}

export const PlayerNavbar: React.FC<PlayerNavbarProps> = ({
  activeTab,
  setActiveTab,
  loggedInMemberId,
  setLoggedInMemberId,
  setPortalMode,
  onOpenLogin
}) => {
  const { state } = useApp();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);

  // Find the currently logged in member details
  const loggedInMember = state.members.find(m => m.id === loggedInMemberId);
  const displayName = loggedInMember 
    ? `${loggedInMember.firstName} ${loggedInMember.lastName}`
    : 'Guest';

  // Calculate total ToC prize pool for the active season
  const getSeasonToCPool = () => {
    const activeSeasonId = state.seasons.find(s => s.isActive)?.id;
    if (!activeSeasonId) return 0;

    let pool = 0;
    state.tournaments
      .filter(t => t.seasonId === activeSeasonId)
      .forEach(t => {
        if (t.status === 'completed') {
          pool += t.totalDealerAppreciation;
        }
      });
    return pool;
  };

  const tocPool = getSeasonToCPool();

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setShowUserDropdown(false);
  };

  const handleSimSelect = (memberId: string) => {
    setLoggedInMemberId(memberId);
    setShowSimModal(false);
    setShowUserDropdown(false);
  };

  // Filter members list to active ones for the simulator selector
  const activeMembersList = state.members
    .filter(m => !m.isDeleted)
    .sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`;
      const nameB = `${b.firstName} ${b.lastName}`;
      return nameA.localeCompare(nameB);
    });

  return (
    <header className="player-navbar">
      <div className="player-navbar-container">
        
        {/* Left: Brand/Logo */}
        <div 
          className="player-navbar-brand" 
          onClick={() => handleTabClick('events')}
          style={{ cursor: 'pointer' }}
        >
          <Trophy className="brand-icon" size={24} />
          <span>Penny Ante Club</span>
        </div>

        {/* Center: Navigation Links */}
        <nav className="player-navbar-nav">
          <button 
            className={`nav-link ${activeTab === 'events' || activeTab === 'event-details' ? 'active' : ''}`}
            onClick={() => handleTabClick('events')}
          >
            Events
          </button>
          <button 
            className={`nav-link ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => handleTabClick('summary')}
          >
            Summary
          </button>
          <button 
            className={`nav-link ${activeTab === 'results' ? 'active' : ''}`}
            onClick={() => handleTabClick('results')}
          >
            Results
          </button>
          <button 
            className={`nav-link ${activeTab === 'rankings' ? 'active' : ''}`}
            onClick={() => handleTabClick('rankings')}
          >
            Rankings
          </button>
          <button 
            className={`nav-link ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => handleTabClick('about')}
          >
            About
          </button>
          <button 
            className={`nav-link ${activeTab === 'clubs' ? 'active' : ''}`}
            onClick={() => handleTabClick('clubs')}
          >
            Clubs
          </button>
          {loggedInMemberId && (
            <button 
              className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => handleTabClick('profile')}
            >
              My Profile
            </button>
          )}
        </nav>

        {/* Right: User menu & Trophy Balance */}
        <div className="player-navbar-actions">
          
          {/* Season ToC Pool Badge */}
          <div className="navbar-earnings-badge" title="Season ToC Pool" style={{ cursor: 'default' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '2px' }}>ToC</span>
            <Trophy size={16} style={{ color: 'var(--color-gold)' }} />
            <span className="earnings-amount">${tocPool}</span>
          </div>

          {/* User profile dropdown switcher */}
          {loggedInMemberId ? (
            <div className="user-dropdown-container">
              <button 
                className="btn btn-navbar-user"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {loggedInMember?.logoUrl ? (
                  <img 
                    src={loggedInMember.logoUrl} 
                    alt="User logo" 
                    style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }} 
                  />
                ) : (
                  <User size={16} />
                )}
                <span className="user-name">{displayName}</span>
                <ChevronDown size={14} className={`arrow-icon ${showUserDropdown ? 'open' : ''}`} />
              </button>

              {showUserDropdown && (
                <div className="navbar-dropdown-menu">
                  <button onClick={() => handleTabClick('profile')} className="dropdown-item">
                    {loggedInMember?.logoUrl ? (
                      <img 
                        src={loggedInMember.logoUrl} 
                        alt="User logo" 
                        style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }} 
                      />
                    ) : (
                      <User size={16} />
                    )}
                    <span>My Profile</span>
                  </button>
                  <button onClick={() => setShowSimModal(true)} className="dropdown-item sim-switch">
                    <Settings size={16} />
                    <span>Switch Player (Sim)</span>
                  </button>
                  {loggedInMember?.role === 'admin' && (
                    <button onClick={() => setPortalMode('admin')} className="dropdown-item admin-switch">
                      <Settings size={16} style={{ color: 'var(--color-gold)' }} />
                      <span style={{ color: 'var(--color-gold)', fontWeight: 600 }}>Admin Dashboard (View-Only)</span>
                    </button>
                  )}
                  {loggedInMember?.role === 'tournament-director' && (
                    <button onClick={() => setPortalMode('admin')} className="dropdown-item admin-switch">
                      <Settings size={16} style={{ color: '#818CF8' }} />
                      <span style={{ color: '#818CF8', fontWeight: 600 }}>TD Dashboard</span>
                    </button>
                  )}
                  {loggedInMember?.role === 'chief-admin' && (
                    <button onClick={() => setPortalMode('admin')} className="dropdown-item admin-switch">
                      <Settings size={16} style={{ color: 'var(--color-emerald)' }} />
                      <span style={{ color: 'var(--color-emerald)', fontWeight: 600 }}>Chief Admin Dashboard</span>
                    </button>
                  )}
                  <div className="dropdown-divider"></div>
                  <button 
                    onClick={() => {
                      setLoggedInMemberId(null);
                      setShowUserDropdown(false);
                      setActiveTab('events');
                    }} 
                    className="dropdown-item logout-btn"
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              className="btn btn-navbar-login"
              onClick={onOpenLogin}
            >
              <LogIn size={16} />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>

      {/* Simulator / Login Modal */}
      {showSimModal && (
        <div className="sim-modal-overlay" onClick={() => setShowSimModal(false)}>
          <div className="sim-modal-content" onClick={e => e.stopPropagation()}>
            <div className="sim-modal-header">
              <h3>Simulate Player Login</h3>
              <button className="btn-close-modal" onClick={() => setShowSimModal(false)}>×</button>
            </div>
            <p className="sim-modal-description">
              Select a player to log in as. This lets you simulate different member accounts, view their balances, and test registration sign-ups.
            </p>
            <div className="sim-members-grid">
              {activeMembersList.map(member => {
                const name = `${member.firstName} ${member.lastName}`;
                const isSelected = member.id === loggedInMemberId;
                return (
                  <button
                    key={member.id}
                    className={`sim-member-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSimSelect(member.id)}
                  >
                    <span className="sim-member-name">{name}</span>
                    <span className="sim-member-id">{member.id}</span>
                  </button>
                );
              })}
            </div>
            <div className="sim-modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSimModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
