import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { Member } from '../types';
import { 
  Mail, 
  Send, 
  Save, 
  Smartphone, 
  Monitor, 
  Eye, 
  Key, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  HelpCircle,
  EyeOff
} from 'lucide-react';

export const EmailManager: React.FC = () => {
  const { state, updateSettings } = useApp();
  
  // Settings values
  const [resendApiKey, setResendApiKey] = useState(state.settings.resendApiKey || '');
  const [emailSender, setEmailSender] = useState(state.settings.emailSender || 'Penny Ante Poker Club <onboarding@resend.dev>');
  const [emailCorsProxy, setEmailCorsProxy] = useState(state.settings.emailCorsProxy || '');
  
  // Templates state
  const [selectedTemplate, setSelectedTemplate] = useState<'loginPin' | 'resetPin' | 'announcement'>('loginPin');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  
  // UI states
  const [showApiKey, setShowApiKey] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [testRecipient, setTestRecipient] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Test Email status
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Broadcast states
  const abortBroadcastRef = useRef<boolean>(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState({ sent: 0, total: 0, success: 0, failed: 0 });
  const [broadcastLogs, setBroadcastLogs] = useState<{ name: string; email: string; status: 'sending' | 'success' | 'failed'; error?: string }[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [showRecipients, setShowRecipients] = useState(false);
  
  // Tournament selection state for announcements
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const selectedTournament = state.tournaments.find(t => t.id === selectedTournamentId);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load selected template values on change or when settings load
  useEffect(() => {
    const templates = state.settings.emailTemplates;
    if (templates && templates[selectedTemplate]) {
      setSubject(templates[selectedTemplate].subject);
      setBody(templates[selectedTemplate].body);
    } else {
      // Fallbacks
      if (selectedTemplate === 'loginPin') {
        setSubject('Your Temporary Security PIN - Penny Ante Poker Club');
        setBody(`<div style="font-family: 'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 40px 20px; border-radius: 12px; max-width: 600px; margin: 0 auto; color: #1f2937;">
  <div style="background-color: #052e16; padding: 24px; border-top-left-radius: 12px; border-top-right-radius: 12px; text-align: center; border-bottom: 3px solid #fbbf24;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: -0.02em;">Penny Ante Poker Club</h1>
  </div>
  <div style="background-color: #ffffff; padding: 40px; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <h2 style="margin-top: 0; font-size: 20px; color: #111827;">Hello {{first_name}},</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">You requested a temporary security PIN to access your player profile. Use the verification code below to log in:</p>
    <div style="text-align: center; margin: 32px 0;">
      <span style="display: inline-block; background-color: #f3f4f6; color: #052e16; font-size: 36px; font-weight: 800; letter-spacing: 6px; padding: 16px 32px; border-radius: 8px; border: 1px solid #e5e7eb; font-family: 'JetBrains Mono', monospace;">{{code}}</span>
    </div>
    <p style="font-size: 14px; color: #9ca3af; line-height: 1.6;">If you did not request this email, you can safely ignore it. This code will expire in 15 minutes.</p>
    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">&copy; 2026 Penny Ante Poker Club. All rights reserved.</p>
  </div>
</div>`);
      } else if (selectedTemplate === 'resetPin') {
        setSubject('Reset Your Security PIN - Penny Ante Poker Club');
        setBody(`<div style="font-family: 'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 40px 20px; border-radius: 12px; max-width: 600px; margin: 0 auto; color: #1f2937;">
  <div style="background-color: #052e16; padding: 24px; border-top-left-radius: 12px; border-top-right-radius: 12px; text-align: center; border-bottom: 3px solid #fbbf24;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: -0.02em;">Penny Ante Poker Club</h1>
  </div>
  <div style="background-color: #ffffff; padding: 40px; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <h2 style="margin-top: 0; font-size: 20px; color: #111827;">Hello {{first_name}},</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">We received a request to reset the security PIN for your Penny Ante Poker Club account. Please use the following code to complete your reset:</p>
    <div style="text-align: center; margin: 32px 0;">
      <span style="display: inline-block; background-color: #f3f4f6; color: #b91c1c; font-size: 36px; font-weight: 800; letter-spacing: 6px; padding: 16px 32px; border-radius: 8px; border: 1px solid #e5e7eb; font-family: 'JetBrains Mono', monospace;">{{code}}</span>
    </div>
    <p style="font-size: 14px; color: #9ca3af; line-height: 1.6;">If you did not request a PIN reset, please verify your account security or contact Tim Hufler. This code will expire in 15 minutes.</p>
    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">&copy; 2026 Penny Ante Poker Club. All rights reserved.</p>
  </div>
</div>`);
      } else {
        setSubject('Club Announcement - Penny Ante Poker Club');
        setBody(`<div style="font-family: 'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 40px 20px; border-radius: 12px; max-width: 600px; margin: 0 auto; color: #1f2937;">
  <div style="background-color: #052e16; padding: 24px; border-top-left-radius: 12px; border-top-right-radius: 12px; text-align: center; border-bottom: 3px solid #fbbf24;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: -0.02em;">Penny Ante Poker Club</h1>
  </div>
  <div style="background-color: #ffffff; padding: 40px; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <h2 style="margin-top: 0; font-size: 20px; color: #111827;">Hello {{first_name}},</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
      We have an exciting announcement for members of the Penny Ante Poker Club!
    </p>
    <div style="background-color: #f9fafb; border-left: 4px solid #052e16; padding: 16px; margin: 24px 0; border-radius: 6px;">
      <p style="font-size: 15px; line-height: 1.6; color: #1f2937; margin: 0; font-weight: 500;">
        Write your main announcement content here. You can customize this layout completely using HTML.
      </p>
    </div>
    <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
      Check the standings, schedule, and live tournament results directly on our portal:
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://pennyantepoker.com" style="display: inline-block; background-color: #052e16; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px; border-bottom: 3px solid #042512; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.15); transition: background-color 0.2s;">Visit the Poker Portal</a>
    </div>
    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">&copy; 2026 Penny Ante Poker Club. All rights reserved.</p>
  </div>
</div>`);
      }
    }
  }, [selectedTemplate, state.settings.emailTemplates]);

  // Insert token helper at cursor position
  const insertToken = (token: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const text = textarea.value;
    const replacement = `{{${token}}}`;
    const newBody = text.substring(0, startPos) + replacement + text.substring(endPos);
    
    setBody(newBody);
    
    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = startPos + replacement.length;
      textarea.selectionEnd = startPos + replacement.length;
    }, 50);
  };

  // Replace tokens for live previewing
  const getCompiledPreview = (rawContent: string, member?: Member) => {
    const firstName = member ? member.firstName : "Tim";
    const lastName = member ? member.lastName : "Hufler";
    const code = "5432";
    
    let result = rawContent
      .replace(/\{\{\s*first_name\s*\}\}/g, firstName)
      .replace(/\{\{\s*last_name\s*\}\}/g, lastName)
      .replace(/\{\{\s*code\s*\}\}/g, code);

    // Replace tournament placeholders
    if (selectedTournament) {
      result = result
        .replace(/\{\{\s*tournament_name\s*\}\}/g, selectedTournament.name)
        .replace(/\{\{\s*tournament_date\s*\}\}/g, selectedTournament.date)
        .replace(/\{\{\s*tournament_time\s*\}\}/g, selectedTournament.time || 'N/A')
        .replace(/\{\{\s*tournament_location\s*\}\}/g, selectedTournament.location || 'N/A')
        .replace(/\{\{\s*tournament_buyin\s*\}\}/g, `$${selectedTournament.buyInAmount}`)
        .replace(/\{\{\s*tournament_addon\s*\}\}/g, `$${selectedTournament.addonAmount}`)
        .replace(/\{\{\s*tournament_bounty\s*\}\}/g, `$${selectedTournament.bountyAmount}`)
        .replace(/\{\{\s*tournament_starting_stack\s*\}\}/g, selectedTournament.startingStack || 'N/A')
        .replace(/\{\{\s*tournament_round_length\s*\}\}/g, selectedTournament.roundLength ? `${selectedTournament.roundLength} mins` : 'N/A')
        .replace(/\{\{\s*tournament_rebuys\s*\}\}/g, selectedTournament.rebuys || 'N/A')
        .replace(/\{\{\s*tournament_late_entry\s*\}\}/g, selectedTournament.lateEntry || 'N/A')
        .replace(/\{\{\s*tournament_flyer_url\s*\}\}/g, selectedTournament.flyerUrl || '');
    } else {
      // Fallback preview values if no tournament is selected
      result = result
        .replace(/\{\{\s*tournament_name\s*\}\}/g, "S4-G2 Bounty Hunter Tournament")
        .replace(/\{\{\s*tournament_date\s*\}\}/g, "2026-08-15")
        .replace(/\{\{\s*tournament_time\s*\}\}/g, "11:45 AM")
        .replace(/\{\{\s*tournament_location\s*\}\}/g, "Wasougal Eagles Club")
        .replace(/\{\{\s*tournament_buyin\s*\}\}/g, "$55")
        .replace(/\{\{\s*tournament_addon\s*\}\}/g, "$15")
        .replace(/\{\{\s*tournament_bounty\s*\}\}/g, "$20")
        .replace(/\{\{\s*tournament_starting_stack\s*\}\}/g, "20,000 Starting Chips")
        .replace(/\{\{\s*tournament_round_length\s*\}\}/g, "18 mins")
        .replace(/\{\{\s*tournament_rebuys\s*\}\}/g, "Freeze out")
        .replace(/\{\{\s*tournament_late_entry\s*\}\}/g, "Late Registration Closed")
        .replace(/\{\{\s*tournament_flyer_url\s*\}\}/g, "https://drive.google.com/file/d/example/view");
    }

    return result;
  };

  // Save Settings to Firestore
  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    const updatedTemplates = {
      ...(state.settings.emailTemplates || {}),
      [selectedTemplate]: {
        subject,
        body
      }
    };

    const newSettings = {
      ...state.settings,
      resendApiKey: resendApiKey.trim(),
      emailSender: emailSender.trim(),
      emailCorsProxy: emailCorsProxy.trim(),
      emailTemplates: updatedTemplates
    };

    try {
      await updateSettings(newSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Dispatch Test Email
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient.trim()) return;

    setIsSendingTest(true);
    setTestResult(null);

    const finalSubject = getCompiledPreview(subject);
    const finalBody = getCompiledPreview(body);

    const sender = emailSender.trim();
    const apiKey = resendApiKey.trim();
    const proxy = emailCorsProxy.trim();
    const useLocalApi = !apiKey;

    try {
      const endpoint = useLocalApi 
        ? '/api/send-email'
        : (proxy 
            ? `${proxy.endsWith('/') ? proxy : proxy + '/' }https://api.resend.com/emails`
            : 'https://api.resend.com/emails');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (!useLocalApi) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          from: sender,
          to: [testRecipient.trim()],
          subject: finalSubject,
          html: finalBody
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP status ${response.status}`);
      }

      setTestResult({
        success: true,
        message: `Test email successfully dispatched to ${testRecipient}!`
      });
      setTestRecipient('');
    } catch (err: any) {
      console.error("Test email dispatch failed:", err);
      setTestResult({
        success: false,
        message: `Dispatch failed: ${err.message || err}. (Note: If this is a CORS issue, check proxy or API Key configuration).`
      });
    } finally {
      setIsSendingTest(false);
    }
  };


  // Members calculation
  const activeMembers = state.members.filter(m => !m.isDeleted);
  const optedInMembers = activeMembers.filter(m => {
    const hasEmail = m.email && m.email.trim().includes('@');
    const isOptedIn = m.emailAnnouncements !== false; // defaults to true
    return hasEmail && isOptedIn;
  });
  const optedOutCount = activeMembers.filter(m => {
    const hasEmail = m.email && m.email.trim().includes('@');
    const isOptedIn = m.emailAnnouncements !== false;
    return hasEmail && !isOptedIn;
  }).length;

  const handleBroadcast = async () => {
    if (optedInMembers.length === 0) {
      alert("There are no opted-in members with valid email addresses to send to.");
      return;
    }

    const confirmMsg = `Are you sure you want to broadcast this announcement to all ${optedInMembers.length} opted-in members? This will send personalized emails one-by-one using your Resend integration.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsBroadcasting(true);
    abortBroadcastRef.current = false;
    setBroadcastProgress({ sent: 0, total: optedInMembers.length, success: 0, failed: 0 });
    
    // Initialize logs
    setBroadcastLogs(optedInMembers.map(m => ({
      name: `${m.firstName} ${m.lastName}`,
      email: m.email,
      status: 'sending'
    })));
    setShowLogs(true);

    const apiKey = resendApiKey.trim();
    const sender = emailSender.trim();
    const proxy = emailCorsProxy.trim();
    const useLocalApi = !apiKey;

    if (!useLocalApi && !apiKey) {
      alert("Resend API Key is required to broadcast. Please configure it above.");
      setIsBroadcasting(false);
      return;
    }

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < optedInMembers.length; i++) {
      if (abortBroadcastRef.current) {
        setBroadcastLogs(prev => [
          ...prev.slice(0, i),
          ...prev.slice(i).map(item => ({ 
            ...item, 
            status: 'failed' as const, 
            error: 'Broadcast cancelled by administrator.' 
          }))
        ]);
        break;
      }

      const member = optedInMembers[i];
      
      // Update status to 'sending'
      setBroadcastLogs(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'sending' } : item));

      // Compile personalized subject and body using the helper (substitutes member and selected tournament details)
      const personalizedSubject = getCompiledPreview(subject, member);
      const personalizedBody = getCompiledPreview(body, member);

      try {
        const endpoint = useLocalApi 
          ? '/api/send-email'
          : (proxy 
              ? `${proxy.endsWith('/') ? proxy : proxy + '/' }https://api.resend.com/emails`
              : 'https://api.resend.com/emails');

        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (!useLocalApi) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            from: sender,
            to: [member.email.trim()],
            subject: personalizedSubject,
            html: personalizedBody
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `HTTP status ${response.status}`);
        }

        successCount++;
        setBroadcastLogs(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'success' } : item));
      } catch (err: any) {
        console.error(`Broadcast failed for ${member.firstName} ${member.lastName}:`, err);
        failedCount++;
        setBroadcastLogs(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'failed', error: err.message || err.toString() } : item));
      }

      setBroadcastProgress(prev => ({
        ...prev,
        sent: i + 1,
        success: successCount,
        failed: failedCount
      }));

      // Delay between sends
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    setIsBroadcasting(false);
  };

  const handleCancelBroadcast = () => {
    abortBroadcastRef.current = true;
  };


  return (
    <div className="email-manager-page animate-fade-in" style={{ padding: '32px' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Mail size={32} className="text-emerald" style={{ color: 'var(--color-emerald)' }} />
            <span>Email Template Manager</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '6px' }}>
            Configure Resend credentials, customize message templates, and visually preview outgoing emails.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', fontWeight: 600 }}
          >
            <Save size={18} />
            <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {/* Save Status Notification */}
      {saveSuccess && (
        <div className="glass-card animate-slide-up" style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', padding: '14px 20px', borderRadius: '10px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle size={20} />
          <span>Email configurations and templates saved successfully to Firestore!</span>
        </div>
      )}
      {saveError && (
        <div className="glass-card animate-slide-up" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', padding: '14px 20px', borderRadius: '10px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={20} />
          <span>Error saving configuration: {saveError}</span>
        </div>
      )}

      {/* Settings Panel Grid */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '32px', border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: 'var(--text-primary)' }}>
          <Key size={18} style={{ color: 'var(--color-gold)' }} />
          <span>Resend & Delivery Configuration</span>
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
          {/* API Key */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Resend API Key</span>
              <span title="Generate an API key in your Resend Dashboard (resend.com)" style={{ cursor: 'help', display: 'inline-flex' }}>
                <HelpCircle size={14} className="text-muted" />
              </span>
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type={showApiKey ? "text" : "password"}
                value={resendApiKey}
                onChange={(e) => setResendApiKey(e.target.value)}
                placeholder="re_xxxxxxxxxxxxxxxxx"
                className="form-input"
                style={{ paddingRight: '40px', width: '100%', borderRadius: '8px' }}
              />
              <button 
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Sender */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Sender Address ("From")</span>
              <span title="Must be onboarding@resend.dev or a domain you've verified on Resend" style={{ cursor: 'help', display: 'inline-flex' }}>
                <HelpCircle size={14} className="text-muted" />
              </span>
            </label>
            <input 
              type="text"
              value={emailSender}
              onChange={(e) => setEmailSender(e.target.value)}
              placeholder="Penny Ante Poker <onboarding@resend.dev>"
              className="form-input"
              style={{ width: '100%', borderRadius: '8px' }}
            />
          </div>

          {/* CORS Proxy */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>CORS Proxy URL (Optional)</span>
              <span title="Since Resend blocks browser CORS, you can route requests through a proxy like: https://cors-anywhere.herokuapp.com/" style={{ cursor: 'help', display: 'inline-flex' }}>
                <HelpCircle size={14} className="text-muted" />
              </span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input 
                type="text"
                value={emailCorsProxy}
                onChange={(e) => setEmailCorsProxy(e.target.value)}
                placeholder="https://cors-anywhere.herokuapp.com/"
                className="form-input"
                style={{ width: '100%', borderRadius: '8px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast Announcement Control Dashboard */}
      {selectedTemplate === 'announcement' && (
        <div className="glass-card" style={{ padding: '24px', marginBottom: '32px', border: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-primary)' }}>
            <Send size={18} style={{ color: 'var(--color-emerald)' }} />
            <span>Broadcast Announcement to Club</span>
          </h3>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', gap: '32px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Total Members</span>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{activeMembers.length}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-emerald)', fontWeight: 600 }}>Opted-In Recipients</span>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-emerald)', marginTop: '4px' }}>{optedInMembers.length}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Opted-Out</span>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-secondary)', marginTop: '4px' }}>{optedOutCount}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowRecipients(!showRecipients)}
                className="btn btn-ghost"
                style={{ fontSize: '0.85rem', padding: '10px 16px', borderRadius: '8px' }}
              >
                {showRecipients ? 'Hide Recipient List' : 'View Recipient List'}
              </button>
              
              {!isBroadcasting ? (
                <button
                  onClick={handleBroadcast}
                  disabled={optedInMembers.length === 0}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, minHeight: '40px' }}
                >
                  <Send size={16} />
                  <span>Send Announcement to {optedInMembers.length} Members</span>
                </button>
              ) : (
                <button
                  onClick={handleCancelBroadcast}
                  className="btn btn-danger"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, minHeight: '40px', backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                >
                  <span className="animate-pulse" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffffff', marginRight: '4px' }}></span>
                  <span>Stop Broadcast</span>
                </button>
              )}
            </div>
          </div>

          {/* Recipient list drawer */}
          {showRecipients && (
            <div className="animate-slide-down" style={{ marginTop: '16px', padding: '16px', backgroundColor: 'rgba(0,0,0,0.1)', border: '1px solid var(--border-subtle)', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>Recipient List ({optedInMembers.length} players)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {optedInMembers.map((m) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '4px 8px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{m.firstName} {m.lastName}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{m.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Broadcast Progress details */}
          {isBroadcasting && (
            <div className="animate-slide-up" style={{ marginTop: '20px', padding: '16px', border: '1px solid rgba(16,185,129,0.2)', backgroundColor: 'rgba(16,185,129,0.02)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Broadcasting announcement... {broadcastProgress.sent} / {broadcastProgress.total} emails processed
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-emerald)' }}>
                  {Math.round((broadcastProgress.sent / broadcastProgress.total) * 100)}% Complete
                </span>
              </div>
              
              {/* Progress bar */}
              <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ width: `${(broadcastProgress.sent / broadcastProgress.total) * 100}%`, height: '100%', backgroundColor: 'var(--color-emerald)', transition: 'width 0.2s' }}></div>
              </div>

              <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem', marginBottom: '12px' }}>
                <span style={{ color: 'var(--color-emerald)', fontWeight: 600 }}>✓ {broadcastProgress.success} Successful</span>
                {broadcastProgress.failed > 0 && <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>✗ {broadcastProgress.failed} Failed</span>}
              </div>

              {/* Real-time sending logs */}
              <div style={{ maxHeight: '150px', overflowY: 'auto', backgroundColor: '#070a13', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px', fontFamily: 'monospace', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {broadcastLogs.map((log, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: log.status === 'success' ? '#10B981' : log.status === 'failed' ? '#EF4444' : '#60A5FA' }}>
                    <span>[{log.status.toUpperCase()}] {log.name} ({log.email})</span>
                    {log.error && <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>- {log.error}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final summary message if done and not currently broadcasting */}
          {!isBroadcasting && broadcastProgress.sent > 0 && (
            <div className="animate-slide-up" style={{ marginTop: '20px', padding: '16px', border: '1px solid var(--border-subtle)', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: broadcastProgress.failed === 0 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={20} style={{ color: broadcastProgress.failed === 0 ? 'var(--color-emerald)' : 'var(--color-gold)' }} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Broadcast Finished</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Successfully sent {broadcastProgress.success} of {broadcastProgress.total} announcement emails.
                  {broadcastProgress.failed > 0 && ` ${broadcastProgress.failed} emails encountered dispatch failures (check the log below).`}
                </p>
                
                {/* View results log toggle */}
                <button 
                  onClick={() => setShowLogs(!showLogs)} 
                  style={{ background: 'none', border: 'none', padding: 0, marginTop: '6px', fontSize: '0.75rem', color: 'var(--color-emerald)', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {showLogs ? 'Hide detailed results' : 'Show detailed results'}
                </button>
              </div>
            </div>
          )}

          {/* Completed results detailed log */}
          {!isBroadcasting && broadcastProgress.sent > 0 && showLogs && (
            <div className="animate-slide-down" style={{ marginTop: '12px', maxHeight: '150px', overflowY: 'auto', backgroundColor: '#070a13', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px', fontFamily: 'monospace', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {broadcastLogs.map((log, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: log.status === 'success' ? '#10B981' : '#EF4444' }}>
                  <span>[{log.status.toUpperCase()}] {log.name} ({log.email})</span>
                  {log.error && <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>- {log.error}</span>}
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* Editor & Preview Split Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '32px', alignItems: 'start' }}>
        
        {/* Left: Template Selector and Content Editor */}
        <div className="glass-card" style={{ padding: '24px', border: '1px solid var(--border-subtle)' }}>
          
          {/* Template Selection Tab Header */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '24px', paddingBottom: '4px' }}>
            <button
              onClick={() => setSelectedTemplate('loginPin')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: selectedTemplate === 'loginPin' ? '2.5px solid var(--color-emerald)' : '2.5px solid transparent',
                color: selectedTemplate === 'loginPin' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: selectedTemplate === 'loginPin' ? 700 : 500,
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                transition: 'all 0.2s'
              }}
            >
              Temporary Login PIN
            </button>
            <button
              onClick={() => setSelectedTemplate('resetPin')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: selectedTemplate === 'resetPin' ? '2.5px solid var(--color-emerald)' : '2.5px solid transparent',
                color: selectedTemplate === 'resetPin' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: selectedTemplate === 'resetPin' ? 700 : 500,
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                transition: 'all 0.2s'
              }}
            >
              Reset Security PIN
            </button>
            <button
              onClick={() => setSelectedTemplate('announcement')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: selectedTemplate === 'announcement' ? '2.5px solid var(--color-emerald)' : '2.5px solid transparent',
                color: selectedTemplate === 'announcement' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: selectedTemplate === 'announcement' ? 700 : 500,
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                transition: 'all 0.2s'
              }}
            >
              Club Announcement
            </button>
          </div>

          {/* Tournament Selector (Only for announcements) */}
          {selectedTemplate === 'announcement' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Select Tournament to Announce (Optional - Populates details below)
              </label>
              <select
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
                className="form-input"
                style={{ width: '100%', borderRadius: '8px', fontSize: '0.95rem', cursor: 'pointer' }}
              >
                <option value="">-- No specific tournament (Uses generic sample values) --</option>
                {state.tournaments
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(t => (
                    <option key={t.id} value={t.id}>
                      {t.date} - {t.name} ({t.location || 'No Location'})
                    </option>
                  ))
                }
              </select>
            </div>
          )}

          {/* Subject Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Subject Line</label>
            <input 
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject line"
              className="form-input"
              style={{ width: '100%', borderRadius: '8px', fontSize: '0.95rem' }}
            />
          </div>

          {/* Body Editor Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email HTML Body</label>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'flex-end', maxWidth: '70%' }}>
              <button 
                type="button"
                onClick={() => insertToken('first_name')}
                className="btn btn-ghost"
                style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px', borderColor: 'rgba(255,255,255,0.08)', minHeight: '26px' }}
                title="Insert {{first_name}} placeholder tag"
              >
                + First Name
              </button>
              {selectedTemplate === 'announcement' ? (
                <>
                  <button 
                    type="button"
                    onClick={() => insertToken('last_name')}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px', borderColor: 'rgba(255,255,255,0.08)', minHeight: '26px' }}
                    title="Insert {{last_name}} placeholder tag"
                  >
                    + Last Name
                  </button>
                  <button 
                    type="button"
                    onClick={() => insertToken('tournament_name')}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px', borderColor: 'rgba(16,185,129,0.2)', backgroundColor: 'rgba(16,185,129,0.05)', color: '#10B981', minHeight: '26px' }}
                    title="Insert {{tournament_name}} placeholder tag"
                  >
                    + Tour Name
                  </button>
                  <button 
                    type="button"
                    onClick={() => insertToken('tournament_date')}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px', borderColor: 'rgba(16,185,129,0.2)', backgroundColor: 'rgba(16,185,129,0.05)', color: '#10B981', minHeight: '26px' }}
                    title="Insert {{tournament_date}} placeholder tag"
                  >
                    + Tour Date
                  </button>
                  <button 
                    type="button"
                    onClick={() => insertToken('tournament_time')}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px', borderColor: 'rgba(16,185,129,0.2)', backgroundColor: 'rgba(16,185,129,0.05)', color: '#10B981', minHeight: '26px' }}
                    title="Insert {{tournament_time}} placeholder tag"
                  >
                    + Tour Time
                  </button>
                  <button 
                    type="button"
                    onClick={() => insertToken('tournament_location')}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px', borderColor: 'rgba(16,185,129,0.2)', backgroundColor: 'rgba(16,185,129,0.05)', color: '#10B981', minHeight: '26px' }}
                    title="Insert {{tournament_location}} placeholder tag"
                  >
                    + Tour Location
                  </button>
                  <button 
                    type="button"
                    onClick={() => insertToken('tournament_buyin')}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px', borderColor: 'rgba(16,185,129,0.2)', backgroundColor: 'rgba(16,185,129,0.05)', color: '#10B981', minHeight: '26px' }}
                    title="Insert {{tournament_buyin}} placeholder tag"
                  >
                    + Buy-in
                  </button>
                  <button 
                    type="button"
                    onClick={() => insertToken('tournament_addon')}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px', borderColor: 'rgba(16,185,129,0.2)', backgroundColor: 'rgba(16,185,129,0.05)', color: '#10B981', minHeight: '26px' }}
                    title="Insert {{tournament_addon}} placeholder tag"
                  >
                    + Add-on
                  </button>
                  <button 
                    type="button"
                    onClick={() => insertToken('tournament_bounty')}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px', borderColor: 'rgba(16,185,129,0.2)', backgroundColor: 'rgba(16,185,129,0.05)', color: '#10B981', minHeight: '26px' }}
                    title="Insert {{tournament_bounty}} placeholder tag"
                  >
                    + Bounty
                  </button>
                  <button 
                    type="button"
                    onClick={() => insertToken('tournament_starting_stack')}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px', borderColor: 'rgba(16,185,129,0.2)', backgroundColor: 'rgba(16,185,129,0.05)', color: '#10B981', minHeight: '26px' }}
                    title="Insert {{tournament_starting_stack}} placeholder tag"
                  >
                    + Stacks
                  </button>
                </>
              ) : (
                <button 
                  type="button"
                  onClick={() => insertToken('code')}
                  className="btn btn-ghost"
                  style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px', borderColor: 'rgba(255,255,255,0.08)', minHeight: '26px' }}
                  title="Insert {{code}} placeholder tag"
                >
                  + Verification Code
                </button>
              )}
            </div>
          </div>

          {/* HTML Source Editor */}
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="form-input"
            rows={18}
            style={{ 
              width: '100%', 
              fontFamily: "'JetBrains Mono', Consolas, monospace", 
              fontSize: '0.85rem', 
              lineHeight: '1.5',
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: '#0a0f1d',
              color: '#d4e2f0',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          />

          {/* Placeholders Help Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px', padding: '10px 14px', backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '8px', fontSize: '0.78rem', color: '#60A5FA' }}>
            <Sparkles size={16} style={{ flexShrink: 0 }} />
            <span>Use placeholder variables like <strong><code>{"{{first_name}}"}</code></strong> and <strong><code>{"{{code}}"}</code></strong> to dynamically customize the email fields.</span>
          </div>

          {/* Test Dispatch Form Section */}
          <div style={{ marginTop: '28px', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-primary)' }}>Dispatch Test Email</h4>
            <form onSubmit={handleSendTestEmail} style={{ display: 'flex', gap: '12px' }}>
              <input
                type="email"
                required
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="recipient@example.com"
                className="form-input"
                style={{ flexGrow: 1, borderRadius: '8px', fontSize: '0.9rem' }}
              />
              <button
                type="submit"
                disabled={isSendingTest || !testRecipient.trim()}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', whiteSpace: 'nowrap' }}
              >
                <Send size={15} />
                <span>{isSendingTest ? 'Sending...' : 'Send Test'}</span>
              </button>
            </form>

            {testResult && (
              <div 
                className="animate-slide-up" 
                style={{ 
                  marginTop: '12px', 
                  padding: '10px 14px', 
                  borderRadius: '8px', 
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: testResult.success ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', 
                  border: testResult.success ? '1px solid rgba(16,185,129,0.18)' : '1px solid rgba(239,68,68,0.18)', 
                  color: testResult.success ? '#10B981' : '#EF4444'
                }}
              >
                {testResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

        </div>

        {/* Right: Real-time Inbox Mock Envelope Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '24px' }}>
          
          {/* Controls bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Eye size={16} style={{ color: 'var(--color-emerald)' }} />
              <span>Inbox Live Preview</span>
            </span>

            {/* Desktop vs Mobile Toggle */}
            <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                type="button"
                onClick={() => setPreviewMode('desktop')}
                style={{
                  background: previewMode === 'desktop' ? 'var(--bg-card-header)' : 'none',
                  border: 'none',
                  color: previewMode === 'desktop' ? 'var(--text-primary)' : 'var(--text-muted)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  transition: 'all 0.15s'
                }}
              >
                <Monitor size={14} />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('mobile')}
                style={{
                  background: previewMode === 'mobile' ? 'var(--bg-card-header)' : 'none',
                  border: 'none',
                  color: previewMode === 'mobile' ? 'var(--text-primary)' : 'var(--text-muted)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  transition: 'all 0.15s'
                }}
              >
                <Smartphone size={14} />
                <span>Mobile</span>
              </button>
            </div>
          </div>

          {/* The Live Email Envelope Shell */}
          <div 
            className="glass-card" 
            style={{ 
              borderRadius: '16px', 
              overflow: 'hidden', 
              boxShadow: 'var(--shadow-xl)', 
              border: '1px solid var(--border-subtle)',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              width: '100%',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {/* Header / Email client headers */}
            <div style={{ backgroundColor: '#f8fafc', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', marginBottom: '8px' }}>
                <span style={{ color: '#64748b', width: '60px', fontWeight: 600 }}>From:</span>
                <span style={{ color: '#334155', fontFamily: 'monospace' }}>
                  {emailSender || 'Penny Ante Poker <onboarding@resend.dev>'}
                </span>
              </div>
              <div style={{ display: 'flex', marginBottom: '8px' }}>
                <span style={{ color: '#64748b', width: '60px', fontWeight: 600 }}>To:</span>
                <span style={{ color: '#334155' }}>
                  Tim &lt;recipient@example.com&gt;
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ color: '#64748b', width: '60px', fontWeight: 600 }}>Subject:</span>
                <span style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.88rem' }}>
                  {getCompiledPreview(subject)}
                </span>
              </div>
            </div>

            {/* Email Body Area with responsive viewport frame */}
            <div 
              style={{ 
                padding: '24px', 
                backgroundColor: '#f1f5f9', 
                display: 'flex', 
                justifyContent: 'center', 
                minHeight: '420px',
                maxHeight: '600px',
                overflowY: 'auto'
              }}
            >
              {/* Frame simulator */}
              <div 
                style={{ 
                  width: previewMode === 'mobile' ? '375px' : '100%', 
                  backgroundColor: '#ffffff', 
                  borderRadius: previewMode === 'mobile' ? '12px' : '0px',
                  boxShadow: previewMode === 'mobile' ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : 'none',
                  border: previewMode === 'mobile' ? '6px solid #1e293b' : 'none',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {/* Embedded dynamic iframe to isolate CSS */}
                <iframe
                  title="email-body-preview"
                  srcDoc={body ? getCompiledPreview(body) : ''}
                  style={{
                    width: '100%',
                    height: '480px',
                    border: 'none',
                    backgroundColor: '#ffffff',
                    display: 'block'
                  }}
                />
              </div>
            </div>
          </div>
          
        </div>

      </div>

    </div>
  );
};
