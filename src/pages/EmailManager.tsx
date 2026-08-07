import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
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
  const [selectedTemplate, setSelectedTemplate] = useState<'loginPin' | 'resetPin'>('loginPin');
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
      } else {
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
  const getCompiledPreview = (rawContent: string, isSubjectField = false) => {
    const sampleFirstName = "Tim";
    const sampleCode = isSubjectField ? "5432" : "5432";
    
    return rawContent
      .replace(/\{\{\s*first_name\s*\}\}/g, sampleFirstName)
      .replace(/\{\{\s*code\s*\}\}/g, sampleCode);
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

    const finalSubject = getCompiledPreview(subject, true);
    const finalBody = getCompiledPreview(body, false);

    const sender = emailSender.trim();
    const apiKey = resendApiKey.trim();
    const proxy = emailCorsProxy.trim();

    if (!apiKey) {
      setTestResult({
        success: false,
        message: 'Resend API Key is required to send emails. Enter it in the settings panel.'
      });
      setIsSendingTest(false);
      return;
    }

    try {
      const endpoint = proxy 
        ? `${proxy.endsWith('/') ? proxy : proxy + '/' }https://api.resend.com/emails`
        : 'https://api.resend.com/emails';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
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
        message: `Test email successfully dispatched to ${testRecipient} via Resend!`
      });
      setTestRecipient('');
    } catch (err: any) {
      console.error("Test email dispatch failed:", err);
      setTestResult({
        success: false,
        message: `Dispatch failed: ${err.message || err}. (Note: If this is a CORS error, you can configure the CORS Proxy input to route requests securely).`
      });
    } finally {
      setIsSendingTest(false);
    }
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
          </div>

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
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => insertToken('first_name')}
                className="btn btn-ghost"
                style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px', borderColor: 'rgba(255,255,255,0.08)', minHeight: '26px' }}
                title="Insert {{first_name}} placeholder tag"
              >
                + Member First Name
              </button>
              <button 
                onClick={() => insertToken('code')}
                className="btn btn-ghost"
                style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px', borderColor: 'rgba(255,255,255,0.08)', minHeight: '26px' }}
                title="Insert {{code}} placeholder tag"
              >
                + Verification Code
              </button>
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
                  {getCompiledPreview(subject, true)}
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
                  srcDoc={body ? getCompiledPreview(body, false) : ''}
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
