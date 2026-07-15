import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Members } from './pages/Members';
import { Tournaments } from './pages/Tournaments';
import { Standings } from './pages/Standings';
import { Settings } from './pages/Settings';
import { ChangePasswordModal } from './components/ChangePasswordModal';

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
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { applyThemePalette } from './utils/theme';
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

  const { state, submitMemberUpdate, registerGuestPlayer, updateMember } = useApp();

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
  const [isSubAdmin, setIsSubAdmin] = useState(() => {
    const role = sessionStorage.getItem('patms_admin_role');
    return role ? role === 'admin' : sessionStorage.getItem('patms_admin_sub') === 'true';
  });
  const [isTournamentDirector, setIsTournamentDirector] = useState(() => {
    return sessionStorage.getItem('patms_admin_role') === 'tournament-director';
  });
  const [isChiefAdmin, setIsChiefAdmin] = useState(() => {
    return sessionStorage.getItem('patms_admin_role') === 'chief-admin';
  });
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [showFirstNameDropdown, setShowFirstNameDropdown] = useState(false);
  const [showLastNameDropdown, setShowLastNameDropdown] = useState(false);



  const [isPinSetupOpen, setIsPinSetupOpen] = useState(false);
  const [setupPin, setSetupPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinSetupError, setPinSetupError] = useState<string | null>(null);

  // Temporary Password authentication states
  const [isTempCodePromptOpen, setIsTempCodePromptOpen] = useState(false);
  const [tempCodeInput, setTempCodeInput] = useState('');
  const [tempCodeError, setTempCodeError] = useState<string | null>(null);
  const [memberForTempCode, setMemberForTempCode] = useState<Member | null>(null);
  const [isNoEmailAlertOpen, setIsNoEmailAlertOpen] = useState(false);
  const [isEmailSentNotificationOpen, setIsEmailSentNotificationOpen] = useState(false);
  const [simulatedSentCode, setSimulatedSentCode] = useState('');

  const generateTempCode = () => {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  };

  const typedFirst = loginFirstName.trim().toLowerCase();
  const matchedPlayers = (!isGuestMode && typedFirst.length >= 1)
    ? state.members.filter(m => !m.isDeleted && m.firstName.toLowerCase().startsWith(typedFirst))
    : [];

  const typedLast = loginLastName.trim().toLowerCase();
  const matchedPlayersLast = (!isGuestMode && typedLast.length >= 1)
    ? state.members.filter(m => !m.isDeleted && m.lastName.toLowerCase().startsWith(typedLast))
    : [];

  useEffect(() => {
    if (state.settings.colorPalette) {
      applyThemePalette(state.settings.colorPalette);
    }
  }, [state.settings.colorPalette]);

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



  const performDirectLogin = async (m: Member) => {
    setLoginError(null);
    
    // Check if player has email on file
    if (!m.email || !m.email.includes('@')) {
      setMatchedMember(m);
      setIsLoginModalOpen(false);
      setIsNoEmailAlertOpen(true);
      return;
    }

    // Generate and update Firestore with temporary code
    const code = generateTempCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    try {
      await updateMember(m.id, { tempPassword: code, tempPasswordExpires: expires });
      setMemberForTempCode(m);
      setSimulatedSentCode(code);
      setTempCodeInput('');
      setTempCodeError(null);
      setIsLoginModalOpen(false);
      setIsTempCodePromptOpen(true);
      setIsEmailSentNotificationOpen(true);
    } catch (err: any) {
      setLoginError('Failed to generate authentication code: ' + err.message);
    }
  };

  const handleSelectMatchedPlayer = (m: Member) => {
    setLoginFirstName(m.firstName);
    setLoginLastName(m.lastName);
    setShowFirstNameDropdown(false);
    setShowLastNameDropdown(false);
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

  const handlePlayerCardConfirm = async () => {
    if (!matchedMember) return;

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

    try {
      if (isNewMemberLogin) {
        // Register guest player directly (we set their email and phone!)
        const guestId = registerGuestPlayer(
          matchedMember.firstName,
          matchedMember.lastName,
          playerCardPhone.trim(),
          playerCardEmail.trim().toLowerCase(),
          matchedMember.logoUrl
        );

        setLoggedInMemberId(guestId);
      } else {
        // Update existing member record
        await updateMember(matchedMember.id, {
          phone: playerCardPhone.trim(),
          email: playerCardEmail.trim().toLowerCase()
        });

        // Submit pending approval if phone/email was edited
        submitMemberUpdate(matchedMember.id, playerCardPhone.trim(), playerCardEmail.trim());

        setLoggedInMemberId(matchedMember.id);
      }

      // Close modal and clear states
      setIsPlayerCardOpen(false);
      setMatchedMember(null);
      setLoginFirstName('');
      setLoginLastName('');
      setIsNewMemberLogin(false);
      setActivePlayerTab('events');
    } catch (err: any) {
      setPlayerCardError('Failed to save profile: ' + err.message);
    }
  };

  const handleTempCodeVerify = () => {
    if (!memberForTempCode) return;
    setTempCodeError(null);

    // Get current record of member from Firestore state
    const member = state.members.find(m => m.id === memberForTempCode.id);
    if (!member) {
      setTempCodeError('Player profile not found.');
      return;
    }

    if (!member.tempPassword || !member.tempPasswordExpires) {
      setTempCodeError('No active access code found. Please try logging in again.');
      return;
    }

    // Check expiry
    const isExpired = new Date().getTime() > new Date(member.tempPasswordExpires).getTime();
    if (isExpired) {
      setTempCodeError('Access code has expired. Please try logging in again.');
      return;
    }

    // Check code match (case-insensitive)
    if (tempCodeInput.trim().toUpperCase() === member.tempPassword.toUpperCase()) {
      setLoggedInMemberId(member.id);
      setIsTempCodePromptOpen(false);
      setMemberForTempCode(null);
      setTempCodeInput('');
      setLoginFirstName('');
      setLoginLastName('');
      setIsEmailSentNotificationOpen(false);
      setActivePlayerTab('events');
    } else {
      setTempCodeError('Incorrect code. Please try again.');
    }
  };

  const handlePinSetupConfirm = async () => {
    if (!matchedMember) return;
    setPinSetupError(null);

    // Validate 4-digit PIN
    if (!/^\d{4}$/.test(setupPin)) {
      setPinSetupError('PIN must be exactly 4 digits.');
      return;
    }

    if (setupPin !== confirmPin) {
      setPinSetupError('PIN confirmation does not match.');
      return;
    }

    try {
      if (isNewMemberLogin) {
        // Register guest player with the set PIN
        const guestId = registerGuestPlayer(
          matchedMember.firstName,
          matchedMember.lastName,
          playerCardPhone.trim(),
          playerCardEmail.trim().toLowerCase(),
          matchedMember.logoUrl,
          setupPin
        );

        setLoggedInMemberId(guestId);
      } else {
        // Update existing member record with PIN
        await updateMember(matchedMember.id, { pin: setupPin });

        // Submit pending approval if phone/email was edited
        const hasEdits = playerCardPhone.trim() !== matchedMember.phone || playerCardEmail.trim() !== matchedMember.email;
        if (hasEdits) {
          submitMemberUpdate(matchedMember.id, playerCardPhone.trim(), playerCardEmail.trim());
        }

        setLoggedInMemberId(matchedMember.id);
      }

      // Close setup modal and clear states
      setIsPinSetupOpen(false);
      setMatchedMember(null);
      setLoginFirstName('');
      setLoginLastName('');
      setIsNewMemberLogin(false);
      setSetupPin('');
      setConfirmPin('');
      setActivePlayerTab('events');
    } catch (err: any) {
      setPinSetupError('Failed to save PIN: ' + err.message);
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

  // Sync admin role states dynamically based on authenticated adminEmail
  useEffect(() => {
    if (adminEmail) {
      const cleanEmail = adminEmail.toLowerCase();
      const isPrimaryChief = cleanEmail === 'thufler@gmail.com';
      const isPrimaryTD = cleanEmail === 'steerbully777@gmail.com';

      const matchedMember = state.members.find(m => m.email.toLowerCase() === cleanEmail && !m.isDeleted);
      
      let role: 'chief-admin' | 'tournament-director' | 'admin' = 'admin'; // default to view-only if not found
      if (matchedMember) {
        if (matchedMember.role === 'chief-admin') role = 'chief-admin';
        else if (matchedMember.role === 'tournament-director') role = 'tournament-director';
        else if (matchedMember.role === 'admin') role = 'admin';
        else if ((matchedMember.role as any) === 'sub-admin') role = 'admin'; // legacy fallback
      }

      // Force primary overrides
      if (isPrimaryChief) role = 'chief-admin';
      if (isPrimaryTD && role !== 'chief-admin') role = 'tournament-director';

      setIsSubAdmin(role === 'admin');
      setIsTournamentDirector(role === 'tournament-director');
      setIsChiefAdmin(role === 'chief-admin');
      sessionStorage.setItem('patms_admin_role', role);
      sessionStorage.setItem('patms_admin_sub', role === 'admin' ? 'true' : 'false');
    } else {
      setIsSubAdmin(false);
      setIsTournamentDirector(false);
      setIsChiefAdmin(false);
      sessionStorage.removeItem('patms_admin_role');
      sessionStorage.setItem('patms_admin_sub', 'false');
    }
  }, [adminEmail, state.members]);

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

  const handleForgotPassword = async () => {
    const cleanEmail = adminEmailInput.trim().toLowerCase();
    if (!cleanEmail) {
      setAdminPasswordError("Please enter your Email Address first to request a password reset.");
      return;
    }
    
    // Verify that the email belongs to an authorized admin
    const targetMember = state.members.find(m => m.email.toLowerCase() === cleanEmail && !m.isDeleted);
    const isPrimaryChief = cleanEmail === 'thufler@gmail.com';
    const isPrimaryTD = cleanEmail === 'steerbully777@gmail.com';

    if (!targetMember && !isPrimaryChief && !isPrimaryTD) {
      setAdminPasswordError('Unauthorized email address.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setAdminPasswordError(null);
      alert(`A password reset link has been sent to ${cleanEmail}. Please check your inbox and follow the instructions.`);
    } catch (err: any) {
      console.error("Firebase Password Reset Error:", err);
      setAdminPasswordError(err.message || "Failed to send password reset email.");
    }
  };

  const handleAdminPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPasswordError(null);

    const cleanEmail = adminEmailInput.trim().toLowerCase();
    const pass = adminPasswordInput;

    const targetMember = state.members.find(m => m.email.toLowerCase() === cleanEmail && !m.isDeleted);
    const isInitialSetup = state.members.length === 0;
    const isPrimaryChief = cleanEmail === 'thufler@gmail.com';
    const isPrimaryTD = cleanEmail === 'steerbully777@gmail.com';

    // Verify they are authorized to sign in
    if (!targetMember && !isInitialSetup && !isPrimaryChief && !isPrimaryTD) {
      setAdminPasswordError('Unauthorized email. Only registered admins/sub-admins can log in.');
      return;
    }

    let role: 'chief-admin' | 'tournament-director' | 'admin' = 'admin'; // fallback view-only
    if (targetMember) {
      if (targetMember.role === 'chief-admin') role = 'chief-admin';
      else if (targetMember.role === 'tournament-director') role = 'tournament-director';
      else if (targetMember.role === 'admin') role = 'admin';
      else if ((targetMember.role as any) === 'sub-admin') role = 'admin';
    }

    // Force primary overrides
    if (isPrimaryChief) role = 'chief-admin';
    if (isPrimaryTD && role !== 'chief-admin') role = 'tournament-director';

    // Tim Hufler (Chief Admin) local bypass override to guarantee access
    if (isPrimaryChief && pass === '482-917') {
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, pass);
      } catch (authErr) {
        console.warn('Firebase Auth sign-in failed during chief-admin override, proceeding with local auth bypass:', authErr);
      }
      sessionStorage.setItem('patms_admin_auth', 'true');
      sessionStorage.setItem('patms_admin_email', cleanEmail);
      sessionStorage.setItem('patms_admin_role', role);
      sessionStorage.setItem('patms_admin_sub', 'false');
      setIsAdminAuthenticated(true);
      setAdminEmail(cleanEmail);
      setIsSubAdmin(false);
      setIsTournamentDirector(false);
      setIsChiefAdmin(true);
      setIsAdminPasswordModalOpen(false);
      setPortalMode('admin');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, cleanEmail, pass);
      
      sessionStorage.setItem('patms_admin_auth', 'true');
      sessionStorage.setItem('patms_admin_email', cleanEmail);
      sessionStorage.setItem('patms_admin_role', role);
      sessionStorage.setItem('patms_admin_sub', role === 'admin' ? 'true' : 'false');
      setIsAdminAuthenticated(true);
      setAdminEmail(cleanEmail);
      setIsSubAdmin(role === 'admin');
      setIsTournamentDirector(role === 'tournament-director');
      setIsChiefAdmin(role === 'chief-admin');
      setIsAdminPasswordModalOpen(false);
      setPortalMode('admin');
    } catch (err: any) {
      console.error('Firebase Auth error during sign-in:', err);
      // Auto-register initial setup, primary chief, or primary TD if they don't have account yet
      if ((err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') && (isInitialSetup || isPrimaryChief || isPrimaryTD)) {
        try {
          console.log('User not found. Attempting to auto-register new administrator...');
          await createUserWithEmailAndPassword(auth, cleanEmail, pass);
          sessionStorage.setItem('patms_admin_auth', 'true');
          sessionStorage.setItem('patms_admin_email', cleanEmail);
          sessionStorage.setItem('patms_admin_role', role);
          sessionStorage.setItem('patms_admin_sub', role === 'admin' ? 'true' : 'false');
          setIsAdminAuthenticated(true);
          setAdminEmail(cleanEmail);
          setIsSubAdmin(role === 'admin');
          setIsTournamentDirector(role === 'tournament-director');
          setIsChiefAdmin(role === 'chief-admin');
          setIsAdminPasswordModalOpen(false);
          setPortalMode('admin');
          return;
        } catch (createErr: any) {
          console.error('Firebase Auth error during auto-registration:', createErr);
          if (createErr.code === 'auth/weak-password') {
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
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setAdminPasswordError('Invalid email or password. Please try again.');
      } else {
        setAdminPasswordError(err.message || 'Authentication failed. Please try again.');
      }
    }
  };

  const handleAdminLogout = async () => {
    try {
      await signOut(auth);
      sessionStorage.removeItem('patms_admin_auth');
      sessionStorage.removeItem('patms_admin_email');
      sessionStorage.removeItem('patms_admin_sub');
      sessionStorage.removeItem('patms_admin_role');
      setIsAdminAuthenticated(false);
      setAdminEmail(null);
      setIsSubAdmin(false);
      setIsTournamentDirector(false);
      setIsChiefAdmin(false);
      setPortalMode('player');
    } catch (err) {
      console.error('Failed to log out:', err);
      // Fallback manual cleanup on error
      sessionStorage.removeItem('patms_admin_auth');
      sessionStorage.removeItem('patms_admin_email');
      sessionStorage.removeItem('patms_admin_sub');
      sessionStorage.removeItem('patms_admin_role');
      setIsAdminAuthenticated(false);
      setAdminEmail(null);
      setIsSubAdmin(false);
      setIsTournamentDirector(false);
      setIsChiefAdmin(false);
      setPortalMode('player');
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
            isSubAdmin={isSubAdmin}
          />
        );
      case 'members':
        return (
          <Members
            isAddMemberOpen={isAddMemberOpen}
            setIsAddMemberOpen={setIsAddMemberOpen}
            isSubAdmin={isSubAdmin}
            isChiefAdmin={isChiefAdmin}
          />
        );
      case 'tournaments':
        return (
          <Tournaments
            selectedTournamentId={selectedTournamentId}
            setSelectedTournamentId={setSelectedTournamentId}
            isCreateTourOpen={isCreateTourOpen}
            setIsCreateTourOpen={setIsCreateTourOpen}
            isSubAdmin={isSubAdmin}
            isChiefAdmin={isChiefAdmin}
          />
        );
      case 'standings':
        return <Standings isChiefAdmin={isChiefAdmin} />;
      case 'settings':
        if (isSubAdmin) {
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
        return <Settings onChangePassword={() => setIsChangePasswordOpen(true)} isChiefAdmin={isChiefAdmin} />;
      default:
        return <Dashboard setActiveTab={setActiveTab} setSelectedTournamentId={setSelectedTournamentId} setIsCreateTourOpen={setIsCreateTourOpen} setIsAddMemberOpen={setIsAddMemberOpen} isSubAdmin={isSubAdmin} />;
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
    if (state.settings.isUnderConstruction) {
      return (
        <div className="app-container player-portal-layout animate-fade-in" style={{
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 20px',
          textAlign: 'center',
          background: 'url("/bg-felt.png")',
          minHeight: '100vh',
          color: '#FFFFFF'
        }}>
          <div className="glass-card animate-slide-up" style={{
            maxWidth: '550px',
            width: '100%',
            padding: '48px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            borderRadius: '24px',
            backgroundColor: 'var(--bg-surface)'
          }}>
            <div style={{
              backgroundColor: 'rgba(212, 175, 55, 0.1)',
              borderRadius: '50%',
              padding: '24px',
              color: 'var(--color-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px dashed var(--color-gold)'
            }}>
              <ShieldAlert size={48} />
            </div>

            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-gold)', margin: 0, letterSpacing: '-0.02em' }}>
                Penny Ante Poker Club
              </h1>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#FFFFFF', marginTop: '12px', margin: '12px 0 0 0' }}>
                Site Under Construction
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '16px', lineHeight: 1.6, margin: '16px 0 0 0' }}>
                We are currently performing scheduled maintenance, database optimizations, and system migrations. We'll be back shortly with a fully updated experience!
              </p>
            </div>

            <div style={{ width: '100%', borderTop: '1px solid var(--border-subtle)', margin: '12px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', alignItems: 'center' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Tournament Director or Administrator?
              </p>
              <button
                onClick={() => handleSwitchPortalMode('admin')}
                className="btn btn-ghost"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  padding: '10px 24px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  borderRadius: '10px',
                  width: 'auto'
                }}
              >
                Access Admin Dashboard
              </button>
            </div>
          </div>

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
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-lg)',
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
                    backgroundColor: 'rgba(11, 107, 42, 0.08)',
                    border: '2px solid #0B6B2A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                    color: '#0B6B2A',
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>Password</label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-gold)',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        Forgot Password?
                      </button>
                    </div>
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
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-lg)',
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
                      autoFocus
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
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '10px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
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
                              borderBottom: '1px solid var(--border-subtle)',
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
                  <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Last Name</label>
                    <input 
                      type="text" 
                      required
                      value={loginLastName}
                      onChange={e => setLoginLastName(e.target.value)}
                      onFocus={() => setShowLastNameDropdown(true)}
                      onBlur={() => setTimeout(() => setShowLastNameDropdown(false), 200)}
                      className="form-input"
                      style={{ padding: '10px 14px', borderRadius: '10px' }}
                    />
                    {showLastNameDropdown && matchedPlayersLast.length > 0 && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '10px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          zIndex: 10,
                          maxHeight: '180px',
                          overflowY: 'auto',
                          marginTop: '4px'
                        }}
                      >
                        {matchedPlayersLast.map(m => (
                          <div
                            key={m.id}
                            onClick={() => handleSelectMatchedPlayer(m)}
                            style={{
                              padding: '10px 14px',
                              cursor: 'pointer',
                              color: 'var(--text-primary)',
                              fontSize: '0.9rem',
                              borderBottom: '1px solid var(--border-subtle)',
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
                        backgroundColor: 'rgba(11, 107, 42, 0.04)', 
                        border: '1px solid rgba(11, 107, 42, 0.15)',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        color: '#0B6B2A', 
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
                        backgroundColor: 'rgba(11, 107, 42, 0.04)', 
                        border: '1px solid rgba(11, 107, 42, 0.15)',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        color: '#0B6B2A', 
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
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-lg)',
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
                  backgroundColor: 'rgba(11, 107, 42, 0.05)',
                  border: '2px solid #0B6B2A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  color: '#0B6B2A',
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
                  color: '#0B6B2A', 
                  fontWeight: 700, 
                  backgroundColor: 'rgba(11, 107, 42, 0.05)',
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
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }}
                >
                  {isNewMemberLogin ? 'CANCEL' : 'No, this is not me'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Glassmorphic Temporary Code Verification Modal */}
        {isTempCodePromptOpen && memberForTempCode && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
              gap: '16px'
            }}
            onClick={() => {
              setIsTempCodePromptOpen(false);
              setMemberForTempCode(null);
              setTempCodeInput('');
              setIsEmailSentNotificationOpen(false);
              setIsLoginModalOpen(true);
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '24px',
                padding: '36px',
                maxWidth: '440px',
                width: '100%',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                position: 'relative',
                border: '1px solid var(--border-subtle)',
                textAlign: 'center'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => {
                  setIsTempCodePromptOpen(false);
                  setMemberForTempCode(null);
                  setTempCodeInput('');
                  setIsEmailSentNotificationOpen(false);
                  setIsLoginModalOpen(true);
                }}
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

              <div 
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(212, 175, 55, 0.08)',
                  border: '2px solid var(--color-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  color: 'var(--color-gold)',
                  fontSize: '1.5rem'
                }}
              >
                ✉️
              </div>

              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                Enter Access Code
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 24px 0', lineHeight: 1.4 }}>
                Please enter the 4-digit temporary access code sent to your email.
              </p>

              {tempCodeError && (
                <div style={{
                  color: 'var(--color-danger)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  backgroundColor: 'rgba(248, 113, 113, 0.1)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  {tempCodeError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', marginBottom: '28px' }}>
                <div style={{ width: '100%', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Access Code
                  </label>
                  <input
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={4}
                    autoFocus
                    placeholder="Enter Code"
                    value={tempCodeInput}
                    onChange={e => setTempCodeInput(e.target.value.replace(/\D/g, ''))}
                    className="form-input"
                    style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '1.25rem', textAlign: 'center', letterSpacing: '0.5em', fontWeight: 'bold' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={handleTempCodeVerify}
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
                  VERIFY & LOGIN
                </button>
                <button
                  onClick={() => {
                    setIsTempCodePromptOpen(false);
                    setMemberForTempCode(null);
                    setTempCodeInput('');
                    setIsEmailSentNotificationOpen(false);
                    setIsLoginModalOpen(true);
                  }}
                  className="btn btn-ghost"
                  style={{
                    padding: '12px 20px',
                    fontSize: '0.95rem',
                    borderRadius: '12px',
                    width: '100%',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }}
                >
                  CANCEL
                </button>
              </div>
            </div>

            {/* Centered Email Simulation Dispatch Card (Under the Modal Card!) */}
            {isEmailSentNotificationOpen && (
              <div 
                style={{
                  backgroundColor: '#0F1926',
                  border: '1px solid var(--border-focus)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  color: '#FFFFFF',
                  maxWidth: '440px',
                  width: '100%',
                  boxShadow: 'var(--shadow-lg)',
                  position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ color: 'var(--text-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Access Code
                  </strong>
                  <button 
                    onClick={() => setIsEmailSentNotificationOpen(false)}
                    style={{ background: 'none', border: 'none', color: '#BFBFBF', cursor: 'pointer', fontSize: '1.2rem', padding: 0, lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
                
                <div style={{ marginTop: '12px', padding: '10px 16px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>Enter Code</span>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '2px' }}>
                    {simulatedSentCode}
                  </h3>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Support Alert Modal (No Email) */}
        {isNoEmailAlertOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px'
            }}
            onClick={() => {
              setIsNoEmailAlertOpen(false);
              setMatchedMember(null);
              setIsLoginModalOpen(true);
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '24px',
                padding: '36px',
                maxWidth: '440px',
                width: '100%',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                position: 'relative',
                border: '1px solid var(--border-subtle)',
                textAlign: 'center'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => {
                  setIsNoEmailAlertOpen(false);
                  setMatchedMember(null);
                  setIsLoginModalOpen(true);
                }}
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

              <div 
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '2px solid var(--color-danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  color: 'var(--color-danger)',
                  fontSize: '1.5rem'
                }}
              >
                ⚠️
              </div>

              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                Email Required
              </h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600, margin: '0 0 12px 0', lineHeight: 1.4 }}>
                No email address on file.
              </p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0 0 28px 0', lineHeight: 1.5 }}>
                Please send a text to <strong>Tim Hufler, Website Support</strong> to add an email address to your profile.
              </p>

              <button
                onClick={() => {
                  setIsNoEmailAlertOpen(false);
                  setMatchedMember(null);
                  setIsLoginModalOpen(true);
                }}
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
                BACK TO LOGIN
              </button>
            </div>
          </div>
        )}



        {/* Glassmorphic PIN Setup Modal */}
        {isPinSetupOpen && matchedMember && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px'
            }}
            onClick={() => {
              setIsPinSetupOpen(false);
              setMatchedMember(null);
              setIsNewMemberLogin(false);
              setIsLoginModalOpen(true);
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '24px',
                padding: '36px',
                maxWidth: '440px',
                width: '100%',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                position: 'relative',
                border: '1px solid var(--border-subtle)',
                textAlign: 'center'
              }}
              onClick={e => e.stopPropagation()}
            >
              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                Create a 4-Digit PIN
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 24px 0', lineHeight: 1.4 }}>
                Please assign a secure 4-digit PIN for future logins to secure your profile.
              </p>

              {pinSetupError && (
                <div style={{
                  color: 'var(--color-danger)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  backgroundColor: 'rgba(248, 113, 113, 0.1)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  {pinSetupError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', marginBottom: '28px' }}>
                <div style={{ width: '100%', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Enter 4-Digit PIN
                  </label>
                  <input
                    type="password"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={4}
                    autoFocus
                    placeholder="Enter PIN"
                    value={setupPin}
                    onChange={e => setSetupPin(e.target.value.replace(/\D/g, ''))}
                    className="form-input"
                    style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '1.25rem', textAlign: 'center', letterSpacing: '0.5em', fontWeight: 'bold' }}
                  />
                </div>
                <div style={{ width: '100%', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Confirm 4-Digit PIN
                  </label>
                  <input
                    type="password"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="Confirm PIN"
                    value={confirmPin}
                    onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    className="form-input"
                    style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '1.25rem', textAlign: 'center', letterSpacing: '0.5em', fontWeight: 'bold' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={handlePinSetupConfirm}
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
                  SAVE & LOGIN
                </button>
                <button
                  onClick={() => {
                    setIsPinSetupOpen(false);
                    setMatchedMember(null);
                    setIsNewMemberLogin(false);
                    setIsLoginModalOpen(true);
                  }}
                  className="btn btn-ghost"
                  style={{
                    padding: '12px 20px',
                    fontSize: '0.95rem',
                    borderRadius: '12px',
                    width: '100%',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }}
                >
                  CANCEL
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
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-lg)',
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
                  backgroundColor: 'rgba(11, 107, 42, 0.08)',
                  border: '2px solid #0B6B2A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  color: '#0B6B2A',
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>Password</label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-gold)',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Forgot Password?
                    </button>
                  </div>
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
        isSubAdmin={isSubAdmin}
        isChiefAdmin={isChiefAdmin}
        isTournamentDirector={isTournamentDirector}
        onChangePassword={() => setIsChangePasswordOpen(true)}
      />
      <main className="main-content">
        {renderAdminContent()}
      </main>
      <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
    </div>
  );
}

export default App;
