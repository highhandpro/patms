import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Members } from './pages/Members';
import { Tournaments } from './pages/Tournaments';
import { Standings } from './pages/Standings';
import { Settings } from './pages/Settings';

// Player Portal Imports
import { PlayerNavbar } from './components/PlayerNavbar';
import { PlayerEvents } from './pages/PlayerEvents';
import { PlayerEventDetails } from './pages/PlayerEventDetails';
import { PlayerResults } from './pages/PlayerResults';
import { PlayerRankings } from './pages/PlayerRankings';
import { PlayerAbout } from './pages/PlayerAbout';
import { PlayerClubs } from './pages/PlayerClubs';
import { PlayerProfile } from './pages/PlayerProfile';
import { PlayerLanding } from './pages/PlayerLanding';
import { PlayerUpdateInfo } from './pages/PlayerUpdateInfo';
import { useApp } from './context/AppContext';
import type { Member } from './types';
import { auth } from './firebase';
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { ShieldAlert } from 'lucide-react';

function App() {
  // Admin tabs: dashboard, members, tournaments, standings, settings
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);

  // Portal selection: player (public website) or admin (dashboard manager)
  const [portalMode, setPortalMode] = useState<'player' | 'admin'>(() => {
    const saved = localStorage.getItem('patms_portal_mode');
    const isAdminAuth = sessionStorage.getItem('patms_admin_auth') === 'true';
    return (saved === 'admin' && isAdminAuth ? 'admin' : 'player') as 'player' | 'admin';
  });

  // Simulated logged-in member ID (defaults to null for landing page entry)
  const [loggedInMemberId, setLoggedInMemberId] = useState<string | null>(() => {
    return localStorage.getItem('patms_logged_in_member_id') || null;
  });

  // Player tabs: events, event-details, results, rankings, about, clubs, profile
  const [activePlayerTab, setActivePlayerTab] = useState<string>(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (path === '/update-info' || hash === '#/update-info' || hash === '#update-info') {
      return 'update-info';
    }
    return 'events';
  });

  const { state, submitMemberUpdate, registerGuestPlayer } = useApp();

  // Login & Player Card Modal states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPlayerCardOpen, setIsPlayerCardOpen] = useState(false);
  const [matchedMember, setMatchedMember] = useState<any>(null);
  const [isNewMemberLogin, setIsNewMemberLogin] = useState(false);
  const [playerCardError, setPlayerCardError] = useState<string | null>(null);

  // Guest Register form states
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [loginFirstName, setLoginFirstName] = useState('');
  const [loginLastName, setLoginLastName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Stored update fields in player card
  const [playerCardPhone, setPlayerCardPhone] = useState('');
  const [playerCardEmail, setPlayerCardEmail] = useState('');

  // Admin Authentication states
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return sessionStorage.getItem('patms_admin_auth') === 'true';
  });
  const [adminEmail, setAdminEmail] = useState<string | null>(() => {
    return sessionStorage.getItem('patms_admin_email') || null;
  });
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);

  const [showFirstNameDropdown, setShowFirstNameDropdown] = useState(false);

  const typedFirst = loginFirstName.trim().toLowerCase();
  const matchedPlayers = (!isGuestMode && typedFirst.length >= 3)
    ? state.members.filter(m => !m.isDeleted && m.firstName.toLowerCase().startsWith(typedFirst))
    : [];

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path === '/update-info' || hash === '#/update-info' || hash === '#update-info') {
        setActivePlayerTab('update-info');
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Levenshtein helper
  const calculateLevenshtein = (a: string, b: string): number => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  };



  const performDirectLogin = (m: Member) => {
    setMatchedMember(m);
    setPlayerCardPhone(m.phone);
    setPlayerCardEmail(m.email);
    setIsLoginModalOpen(false);
    setIsPlayerCardOpen(true);
  };

  const handleSelectMatchedPlayer = (m: Member) => {
    setLoginFirstName(m.firstName);
    setLoginLastName(m.lastName);
    setShowFirstNameDropdown(false);
    performDirectLogin(m);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const first = loginFirstName.trim().toLowerCase();
    const last = loginLastName.trim().toLowerCase();

    if (!first || !last) {
      setLoginError('Please enter both First Name and Last Name.');
      return;
    }

    // 1. Exact Match Check
    const exactMatch = state.members.find(
      m => !m.isDeleted && m.firstName.toLowerCase() === first && m.lastName.toLowerCase() === last
    );

    if (exactMatch) {
      performDirectLogin(exactMatch);
      return;
    }

    // 2. Fuzzy Match Check (edit distance <= 2)
    const fuzzyMatches = state.members.filter(m => {
      if (m.isDeleted) return false;
      const distFirst = calculateLevenshtein(m.firstName.toLowerCase(), first);
      const distLast = calculateLevenshtein(m.lastName.toLowerCase(), last);
      return distFirst <= 2 && distLast <= 2;
    });

    if (fuzzyMatches.length > 0) {
      const closest = fuzzyMatches.reduce((best, current) => {
        const bestDist = calculateLevenshtein(best.firstName.toLowerCase(), first) + calculateLevenshtein(best.lastName.toLowerCase(), last);
        const currDist = calculateLevenshtein(current.firstName.toLowerCase(), first) + calculateLevenshtein(current.lastName.toLowerCase(), last);
        return currDist < bestDist ? current : best;
      });

      performDirectLogin(closest);
      return;
    }

    // 3. No match found: Register as new member
    const numbers = state.members.map(m => {
      const parsed = parseInt(m.id, 10);
      return isNaN(parsed) ? 0 : parsed;
    });
    const nextNum = Math.max(100, ...numbers) + 1;
    const newId = String(nextNum);

    setMatchedMember({
      id: newId,
      firstName: loginFirstName.trim(),
      lastName: loginLastName.trim(),
      phone: '',
      email: ''
    });
    setPlayerCardPhone('');
    setPlayerCardEmail('');
    setIsNewMemberLogin(true);
    setPlayerCardError(null);
    setIsLoginModalOpen(false);
    setIsPlayerCardOpen(true);
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginFirstName.trim() || !loginLastName.trim()) {
      setLoginError('Please fill out First Name and Last Name.');
      return;
    }

    const guestId = registerGuestPlayer(
      loginFirstName.trim(),
      loginLastName.trim(),
      guestPhone.trim(),
      guestEmail.trim()
    );

    setLoggedInMemberId(guestId);
    setIsLoginModalOpen(false);
    setIsGuestMode(false);
    setLoginFirstName('');
    setLoginLastName('');
    setGuestPhone('');
    setGuestEmail('');
    setActivePlayerTab('events');
  };

  const handlePlayerCardConfirm = () => {
    if (!matchedMember) return;

    if (isNewMemberLogin) {
      setPlayerCardError(null);

      // Validate Phone Number (10 digits)
      const cleanPhone = playerCardPhone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        setPlayerCardError('Please enter a valid 10-digit phone number.');
        return;
      }

      // Validate Email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!playerCardEmail.trim() || !emailRegex.test(playerCardEmail.trim())) {
        setPlayerCardError('Please enter a valid email address.');
        return;
      }

      // Register new member (this adds to database and triggers Admin approval)
      const guestId = registerGuestPlayer(
        matchedMember.firstName,
        matchedMember.lastName,
        playerCardPhone.trim(),
        playerCardEmail.trim().toLowerCase(),
        matchedMember.logoUrl
      );

      setLoggedInMemberId(guestId);
      setIsPlayerCardOpen(false);
      setMatchedMember(null);
      setLoginFirstName('');
      setLoginLastName('');
      setIsNewMemberLogin(false);
      setPlayerCardError(null);
      setActivePlayerTab('events');
    } else {
      if (!isAdminAuthenticated) {
        setPlayerCardError(null);

        const isPhoneMissingInDb = !matchedMember.phone;
        if (isPhoneMissingInDb) {
          const cleanPhone = playerCardPhone.replace(/\D/g, '');
          if (cleanPhone.length !== 10) {
            setPlayerCardError('Please enter a valid 10-digit phone number.');
            return;
          }
        }

        const isEmailMissingInDb = !matchedMember.email;
        if (isEmailMissingInDb) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!playerCardEmail.trim() || !emailRegex.test(playerCardEmail.trim())) {
            setPlayerCardError('Please enter a valid email address.');
            return;
          }
        }
      }

      const hasEdits = playerCardPhone.trim() !== matchedMember.phone || playerCardEmail.trim() !== matchedMember.email;
      if (hasEdits) {
        submitMemberUpdate(matchedMember.id, playerCardPhone.trim(), playerCardEmail.trim());
      }

      setLoggedInMemberId(matchedMember.id);
      setIsPlayerCardOpen(false);
      setMatchedMember(null);
      setLoginFirstName('');
      setLoginLastName('');
      setPlayerCardError(null);
      setActivePlayerTab('events');
    }
  };

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        sessionStorage.setItem('patms_admin_auth', 'true');
        sessionStorage.setItem('patms_admin_email', user.email || '');
        setIsAdminAuthenticated(true);
        setAdminEmail(user.email || '');
      } else {
        sessionStorage.removeItem('patms_admin_auth');
        sessionStorage.removeItem('patms_admin_email');
        setIsAdminAuthenticated(false);
        setAdminEmail(null);
        setPortalMode(prev => prev === 'admin' ? 'player' : prev);
      }
    });
    return unsubscribe;
  }, []);

  const handleSwitchPortalMode = (mode: 'player' | 'admin') => {
    if (mode === 'admin') {
      if (isAdminAuthenticated) {
        setPortalMode('admin');
      } else {
        setAdminEmailInput('');
        setAdminPasswordInput('');
        setAdminPasswordError(null);
        setIsAdminPasswordModalOpen(true);
      }
    } else {
      setPortalMode('player');
    }
  };

  const handleAdminPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPasswordError(null);
    try {
      await signInWithEmailAndPassword(auth, adminEmailInput, adminPasswordInput);
      setIsAdminPasswordModalOpen(false);
      setPortalMode('admin');
    } catch (err: any) {
      console.error('Firebase Auth error during sign-in:', err);
      // If user is not found or invalid credentials, attempt auto-registration
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          console.log('User not found. Attempting to auto-register new administrator...');
          await createUserWithEmailAndPassword(auth, adminEmailInput, adminPasswordInput);
          setIsAdminPasswordModalOpen(false);
          setPortalMode('admin');
          return;
        } catch (createErr: any) {
          console.error('Firebase Auth error during auto-registration:', createErr);
          if (createErr.code === 'auth/email-already-in-use') {
            setAdminPasswordError('Invalid email or password. Please try again.');
          } else if (createErr.code === 'auth/weak-password') {
            setAdminPasswordError('Password should be at least 6 characters.');
          } else if (createErr.code === 'auth/invalid-email') {
            setAdminPasswordError('Please enter a valid email address.');
          } else {
            setAdminPasswordError(createErr.message || 'Authentication failed. Please try again.');
          }
          return;
        }
      }
      
      if (err.code === 'auth/wrong-password') {
        setAdminPasswordError('Invalid email or password. Please try again.');
      } else {
        setAdminPasswordError(err.message || 'Authentication failed. Please try again.');
      }
    }
  };

  const handleAdminLogout = async () => {
    try {
      await signOut(auth);
      setPortalMode('player');
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  // Sync state changes to localStorage
  useEffect(() => {
    localStorage.setItem('patms_portal_mode', portalMode);
  }, [portalMode]);

  useEffect(() => {
    if (loggedInMemberId) {
      localStorage.setItem('patms_logged_in_member_id', loggedInMemberId);
    } else {
      localStorage.removeItem('patms_logged_in_member_id');
    }
  }, [loggedInMemberId]);

  // Global modal triggers that can be activated from dashboard quick actions
  const [isCreateTourOpen, setIsCreateTourOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // Wrap tab change to clear tournament selection when clicking on main menu items
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedTournamentId(null);
  };

  const renderAdminContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            setActiveTab={setActiveTab}
            setSelectedTournamentId={setSelectedTournamentId}
            setIsCreateTourOpen={setIsCreateTourOpen}
            setIsAddMemberOpen={setIsAddMemberOpen}
          />
        );
      case 'members':
        return (
          <Members
            isAddMemberOpen={isAddMemberOpen}
            setIsAddMemberOpen={setIsAddMemberOpen}
          />
        );
      case 'tournaments':
        return (
          <Tournaments
            selectedTournamentId={selectedTournamentId}
            setSelectedTournamentId={setSelectedTournamentId}
            isCreateTourOpen={isCreateTourOpen}
            setIsCreateTourOpen={setIsCreateTourOpen}
            adminEmail={adminEmail}
          />
        );
      case 'standings':
        return <Standings />;
      case 'settings':
        if (adminEmail === 'steerbully777@gmail.com') {
          return (
            <div className="glass-card text-center animate-slide-up" style={{ padding: '60px 40px', maxWidth: '600px', margin: '80px auto 0 auto' }}>
              <ShieldAlert size={64} style={{ color: 'var(--color-danger)', marginBottom: '24px', marginLeft: 'auto', marginRight: 'auto' }} />
              <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '12px' }}>Access Denied</h1>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                You do not have administrative permissions to view or edit the club settings.
              </p>
              <button className="btn btn-primary" style={{ marginLeft: 'auto', marginRight: 'auto' }} onClick={() => setActiveTab('dashboard')}>
                Return to Dashboard
              </button>
            </div>
          );
        }
        return <Settings />;
      default:
        return <Dashboard setActiveTab={setActiveTab} setSelectedTournamentId={setSelectedTournamentId} setIsCreateTourOpen={setIsCreateTourOpen} setIsAddMemberOpen={setIsAddMemberOpen} />;
    }
  };

  const renderPlayerContent = () => {
    if (activePlayerTab === 'update-info') {
      return <PlayerUpdateInfo setActiveTab={setActivePlayerTab} />;
    }

    if (!loggedInMemberId) {
      return (
        <PlayerLanding 
          onOpenLogin={() => {
            setIsGuestMode(false);
            setLoginError(null);
            setIsLoginModalOpen(true);
          }} 
          setPortalMode={handleSwitchPortalMode} 
        />
      );
    }

    switch (activePlayerTab) {
      case 'events':
        return (
          <PlayerEvents 
            setActiveTab={setActivePlayerTab} 
            setSelectedTournamentId={setSelectedTournamentId} 
          />
        );
      case 'event-details':
        return (
          <PlayerEventDetails 
            setActiveTab={setActivePlayerTab} 
            tournamentId={selectedTournamentId}
            loggedInMemberId={loggedInMemberId}
          />
        );
      case 'results':
        return <PlayerResults />;
      case 'rankings':
        return <PlayerRankings />;
      case 'about':
        return <PlayerAbout />;
      case 'clubs':
        return <PlayerClubs setPortalMode={handleSwitchPortalMode} />;
      case 'profile':
        return (
          <PlayerProfile 
            setActiveTab={setActivePlayerTab} 
            loggedInMemberId={loggedInMemberId} 
          />
        );
      default:
        return <PlayerEvents setActiveTab={setActivePlayerTab} setSelectedTournamentId={setSelectedTournamentId} />;
    }
  };

  if (portalMode === 'player') {
    return (
      <div className="app-container player-portal-layout" style={{ flexDirection: 'column' }}>
        <PlayerNavbar 
          activeTab={activePlayerTab} 
          setActiveTab={setActivePlayerTab}
          loggedInMemberId={loggedInMemberId}
          setLoggedInMemberId={setLoggedInMemberId}
          setPortalMode={handleSwitchPortalMode}
          onOpenLogin={() => {
            setIsGuestMode(false);
            setLoginError(null);
            setIsLoginModalOpen(true);
          }}
        />
        <main className="player-main-content" style={{ flexGrow: 1 }}>
          {renderPlayerContent()}
        </main>

        {/* Glassmorphic Login/Register Modal */}
        {isLoginModalOpen && (
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(10px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setIsLoginModalOpen(false)}
          >
            <div 
              style={{
                backgroundColor: 'rgba(15, 15, 18, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(16, 185, 129, 0.15)',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '440px',
                padding: '32px',
                position: 'relative'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsLoginModalOpen(false)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  lineHeight: 1
                }}
              >
                ×
              </button>

              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                {isGuestMode ? 'Register as Guest' : 'Login by Name'}
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 24px 0', lineHeight: 1.4 }}>
                {isGuestMode 
                  ? 'Sign up as a new guest player to reserve your seat at upcoming tournaments.' 
                  : 'Enter your name to access your player profile and speed up event check-ins.'}
              </p>

              {loginError && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '10px',
                  color: 'var(--color-pomegranate)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  lineHeight: 1.4,
                  marginBottom: '20px'
                }}>
                  {loginError}
                </div>
              )}

              <form onSubmit={isGuestMode ? handleGuestSubmit : handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>First Name</label>
                    <input 
                      type="text" 
                      required
                      value={loginFirstName}
                      onChange={e => setLoginFirstName(e.target.value)}
                      onFocus={() => setShowFirstNameDropdown(true)}
                      onBlur={() => setTimeout(() => setShowFirstNameDropdown(false), 200)}
                      className="form-input"
                      style={{ padding: '10px 14px', borderRadius: '10px' }}
                    />
                    {showFirstNameDropdown && matchedPlayers.length > 0 && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: '#16161a',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '10px',
                          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
                          zIndex: 10,
                          maxHeight: '180px',
                          overflowY: 'auto',
                          marginTop: '4px'
                        }}
                      >
                        {matchedPlayers.map(m => (
                          <div
                            key={m.id}
                            onClick={() => handleSelectMatchedPlayer(m)}
                            style={{
                              padding: '10px 14px',
                              cursor: 'pointer',
                              color: 'var(--text-primary)',
                              fontSize: '0.9rem',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
                              textAlign: 'left'
                            }}
                            className="dropdown-item"
                          >
                            {m.firstName} {m.lastName}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Last Name</label>
                    <input 
                      type="text" 
                      required
                      value={loginLastName}
                      onChange={e => setLoginLastName(e.target.value)}
                      className="form-input"
                      style={{ padding: '10px 14px', borderRadius: '10px' }}
                    />
                  </div>
                </div>

                {isGuestMode && (
                  <>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Phone Number</label>
                      <input 
                        type="tel" 
                        required
                        placeholder="e.g. (360) 555-1234"
                        value={guestPhone}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          let formatted = val;
                          if (val.length > 3 && val.length <= 6) {
                            formatted = `(${val.slice(0, 3)}) ${val.slice(3)}`;
                          } else if (val.length > 6) {
                            formatted = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6, 10)}`;
                          }
                          setGuestPhone(formatted);
                        }}
                        className="form-input"
                        style={{ padding: '10px 14px', borderRadius: '10px' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Email Address</label>
                      <input 
                        type="email" 
                        required
                        placeholder="e.g. derek@gmail.com"
                        value={guestEmail}
                        onChange={e => setGuestEmail(e.target.value)}
                        className="form-input"
                        style={{ padding: '10px 14px', borderRadius: '10px' }}
                      />
                    </div>
                  </>
                )}

                <button 
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    padding: '12px 20px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    borderRadius: '10px',
                    marginTop: '8px'
                  }}
                >
                  {isGuestMode ? 'Complete Registration' : 'Find My Account'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', width: '100%' }}>
                  {isGuestMode ? (
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsGuestMode(false);
                        setLoginError(null);
                      }}
                      style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: 700,
                        backgroundColor: 'rgba(30, 64, 175, 0.3)', 
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        color: '#d1d5db', 
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'center'
                      }}
                    >
                      Already have an account? Login here
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsGuestMode(true);
                        setLoginError(null);
                      }}
                      style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: 700,
                        backgroundColor: 'rgba(30, 64, 175, 0.3)', 
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        color: '#d1d5db', 
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'center'
                      }}
                    >
                      Not on the list? Register as a guest
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Glassmorphic Player Card Modal */}
        {isPlayerCardOpen && matchedMember && (
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(10px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => {
              setIsPlayerCardOpen(false);
              setMatchedMember(null);
            }}
          >
            <div 
              style={{
                backgroundColor: 'rgba(15, 15, 18, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 1px 2px rgba(212, 163, 89, 0.3)',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '460px',
                padding: '36px',
                position: 'relative',
                textAlign: 'center'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Profile Card Header Badge */}
              <div 
                style={{
                  width: '216px',
                  height: '216px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(212, 163, 89, 0.1)',
                  border: '2px solid var(--text-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  color: 'var(--text-gold)',
                  fontSize: '6rem',
                  fontWeight: 800,
                  overflow: 'hidden'
                }}
              >
                {matchedMember.logoUrl ? (
                  <img src={matchedMember.logoUrl} alt="Player Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  '♣'
                )}
              </div>

              <h2 style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
                {matchedMember.firstName} {matchedMember.lastName}
              </h2>
              <div 
                style={{ 
                  display: 'inline-block',
                  fontSize: '0.85rem', 
                  color: 'var(--text-gold)', 
                  fontWeight: 700, 
                  backgroundColor: 'rgba(212, 163, 89, 0.1)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  marginBottom: isAdminAuthenticated ? '16px' : '24px',
                  letterSpacing: '0.05em'
                }}
              >
                {isNewMemberLogin ? `NEW MEMBER ID: #${matchedMember.id}` : `MEMBER ID: #${matchedMember.id}`}
              </div>


 
              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: '0 0 24px 0', lineHeight: 1.4 }}>
                {isNewMemberLogin ? 'Enter your contact details below.' : 'Please review your contact details below. You can correct them if they are outdated.'}
              </p>

              {playerCardError && (
                <div style={{
                  color: 'var(--color-danger)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  backgroundColor: 'rgba(248, 113, 113, 0.1)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  {playerCardError}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left', marginBottom: '28px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Phone Number {(!isAdminAuthenticated && (isNewMemberLogin || !matchedMember.phone)) && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                  </label>
                  <input 
                    type="tel"
                    placeholder="Enter phone number"
                    value={playerCardPhone}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      let formatted = val;
                      if (val.length > 3 && val.length <= 6) {
                        formatted = `(${val.slice(0, 3)}) ${val.slice(3)}`;
                      } else if (val.length > 6) {
                        formatted = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6, 10)}`;
                      }
                      setPlayerCardPhone(formatted);
                    }}
                    className="form-input"
                    style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '0.95rem' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Email Address {(!isAdminAuthenticated && (isNewMemberLogin || !matchedMember.email)) && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                  </label>
                  <input 
                    type="email"
                    placeholder="Enter email address"
                    value={playerCardEmail}
                    onChange={e => setPlayerCardEmail(e.target.value)}
                    className="form-input"
                    style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '0.95rem' }}
                  />
                </div>
              </div>
 
              {/* Confirmation Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button 
                  onClick={handlePlayerCardConfirm}
                  className="btn btn-primary"
                  style={{
                    padding: '14px 20px',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    borderRadius: '12px',
                    width: '100%',
                    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.2)'
                  }}
                >
                  {isNewMemberLogin ? 'CONFIRM AND LOGIN' : 'Yes, this is me!'}
                </button>
                <button 
                  onClick={() => {
                    setIsPlayerCardOpen(false);
                    setMatchedMember(null);
                    setIsNewMemberLogin(false);
                    setPlayerCardError(null);
                    setIsLoginModalOpen(true);
                  }}
                  className="btn btn-ghost"
                  style={{
                    padding: '12px 20px',
                    fontSize: '0.95rem',
                    borderRadius: '12px',
                    width: '100%',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    backgroundColor: 'rgba(255, 255, 255, 0.01)'
                  }}
                >
                  {isNewMemberLogin ? 'CANCEL' : 'No, this is not me'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Glassmorphic Admin Password Modal */}
        {isAdminPasswordModalOpen && (
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(10px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setIsAdminPasswordModalOpen(false)}
          >
            <div 
              style={{
                backgroundColor: 'rgba(15, 15, 18, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(16, 185, 129, 0.15)',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '400px',
                padding: '32px',
                position: 'relative',
                textAlign: 'center'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsAdminPasswordModalOpen(false)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  lineHeight: 1
                }}
              >
                ×
              </button>

              {/* Password Icon */}
              <div 
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '2px solid var(--color-emerald)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  color: 'var(--color-emerald)',
                  fontSize: '1.5rem'
                }}
              >
                🔒
              </div>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                Admin Authentication
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 20px 0', lineHeight: 1.4 }}>
                Please log in using your administrator credentials.
              </p>

              {adminPasswordError && (
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '8px',
                  color: 'var(--color-pomegranate)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  marginBottom: '16px',
                  textAlign: 'left'
                }}>
                  {adminPasswordError}
                </div>
              )}

              <form onSubmit={handleAdminPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0, textAlign: 'left' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Email Address</label>
                  <input 
                    type="email" 
                    required
                    placeholder="admin@pennyantepoker.com"
                    value={adminEmailInput}
                    onChange={e => setAdminEmailInput(e.target.value)}
                    className="form-input"
                    style={{ padding: '10px 14px', borderRadius: '10px' }}
                    autoFocus
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0, textAlign: 'left' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Password</label>
                  <input 
                    type="password" 
                    required
                    placeholder="Enter password"
                    value={adminPasswordInput}
                    onChange={e => setAdminPasswordInput(e.target.value)}
                    className="form-input"
                    style={{ padding: '10px 14px', borderRadius: '10px' }}
                  />
                </div>

                <button 
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    padding: '12px 20px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    borderRadius: '10px',
                    marginTop: '4px'
                  }}
                >
                  Sign In & Enter
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Admin Dashboard layout
  return (
    <div className="app-container admin-portal-layout">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        onSwitchPortal={() => setPortalMode('player')}
        onLogoutAdmin={handleAdminLogout}
        adminEmail={adminEmail}
      />
      <main className="main-content">
        {renderAdminContent()}
      </main>
    </div>
  );
}

export default App;
