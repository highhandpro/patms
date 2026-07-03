import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Check } from 'lucide-react';

interface PlayerUpdateInfoProps {
  setActiveTab: (tab: string) => void;
}

export const PlayerUpdateInfo: React.FC<PlayerUpdateInfoProps> = ({ setActiveTab }) => {
  const { state, submitPlayerInfoForm } = useApp();

  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [textReminders, setTextReminders] = useState(true);
  const [emailAnnouncements, setEmailAnnouncements] = useState(true);

  const [isRecognized, setIsRecognized] = useState<boolean | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-redirect or reset URL hash helper if they want to go back
  const handleGoBack = () => {
    window.location.hash = '';
    window.location.pathname = '/';
    setActiveTab('events');
  };

  const formatPhoneNumber = (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `(${clean.slice(0, 3)}) ${clean.slice(3)}`;
    return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const clean = val.replace(/\D/g, '');
    const formatted = formatPhoneNumber(val);
    setPhone(formatted);

    if (clean.length === 10) {
      const match = state.members.find(
        m => !m.isDeleted && m.phone.replace(/\D/g, '') === clean
      );
      if (match) {
        setIsRecognized(true);
        setFirstName(match.firstName);
        setLastName(match.lastName);
        setEmail(match.email);
        setTextReminders(match.textReminders !== undefined ? match.textReminders : true);
        setEmailAnnouncements(match.emailAnnouncements !== undefined ? match.emailAnnouncements : true);
        setError(null);
      } else {
        setIsRecognized(false);
      }
    } else {
      setIsRecognized(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit cell phone number.');
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your First Name and Last Name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      await submitPlayerInfoForm(
        firstName.trim(),
        lastName.trim(),
        phone.trim(),
        email.trim(),
        textReminders,
        emailAnnouncements
      );
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      setError('Failed to submit information. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100%',
      padding: '40px 20px',
      backgroundColor: '#010101'
    }}>
      {/* Back button link */}
      <button 
        onClick={handleGoBack}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          cursor: 'pointer',
          marginBottom: '20px',
          textDecoration: 'underline'
        }}
      >
        ← Back to Penny Ante Club
      </button>

      {/* Main card */}
      <div style={{
        width: '100%',
        maxWidth: '520px',
        backgroundColor: '#f5eedc',
        border: '3px solid #0d5236',
        borderRadius: '24px',
        padding: '32px 24px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        fontFamily: "'Outfit', sans-serif",
        color: '#0a3622'
      }}>
        {/* Logo and Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
          <img 
            src="/club-logo-skull.png" 
            alt="Penny Ante Poker Club Logo" 
            style={{ width: '80px', height: '80px', objectFit: 'contain' }} 
          />
          <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.15em', color: '#0d5236', textTransform: 'uppercase' }}>
            Penny Ante Poker Club
          </span>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0d5236', margin: '4px 0 0 0', lineHeight: 1.25, letterSpacing: '-0.02em' }}>
            Help Us Keep Your Player Information Current
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#3c5a4d', margin: '4px 0 0 0', lineHeight: 1.4, fontWeight: 500 }}>
            This only takes about 30 seconds and helps keep tournament registration, reminders, and club announcements accurate.
          </p>
        </div>

        {error && (
          <div style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '10px',
            color: '#b91c1c',
            fontSize: '0.85rem',
            fontWeight: 600,
            textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Phone Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0d5236' }}>Cell Phone</label>
            <input 
              type="tel"
              required
              disabled={isSubmitted}
              placeholder="e.g. (360) 869-2538"
              value={phone}
              onChange={handlePhoneChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid #c2b79e',
                backgroundColor: '#eef4fc',
                fontSize: '1rem',
                color: '#0f172a',
                fontWeight: 600,
                outline: 'none'
              }}
            />
            <span style={{ fontSize: '0.75rem', color: '#5c786c', fontWeight: 500 }}>
              We'll use your phone number to look up your existing player record.
            </span>
          </div>

          {/* Unrecognized warning */}
          {isRecognized === false && (
            <div style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#fbf6e6',
              border: '1px solid #f3e4bc',
              borderRadius: '10px',
              color: '#7c5a14',
              fontSize: '0.85rem',
              fontWeight: 700,
              lineHeight: 1.4,
              textAlign: 'center'
            }}>
              We don't recognize this phone number yet. You can still complete and submit the form below.
            </div>
          )}

          {/* Name Fields (2 Columns) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0d5236' }}>First Name</label>
              <input 
                type="text"
                required
                disabled={isSubmitted}
                placeholder="e.g. Timothy"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #c2b79e',
                  backgroundColor: '#eef4fc',
                  fontSize: '1rem',
                  color: '#0f172a',
                  fontWeight: 600,
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0d5236' }}>Last Name</label>
              <input 
                type="text"
                required
                disabled={isSubmitted}
                placeholder="e.g. Hufler"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #c2b79e',
                  backgroundColor: '#eef4fc',
                  fontSize: '1rem',
                  color: '#0f172a',
                  fontWeight: 600,
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Email Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0d5236' }}>Email Address</label>
            <input 
              type="email"
              required
              disabled={isSubmitted}
              placeholder="e.g. acemagnets@gmx.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid #c2b79e',
                backgroundColor: '#eef4fc',
                fontSize: '1rem',
                color: '#0f172a',
                fontWeight: 600,
                outline: 'none'
              }}
            />
          </div>

          {/* Communication Checkboxes */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: 'rgba(13, 82, 54, 0.05)',
            border: '1px solid rgba(13, 82, 54, 0.1)',
            borderRadius: '10px',
            padding: '14px 16px',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: '#0d5236'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input 
                type="checkbox"
                disabled={isSubmitted}
                checked={textReminders}
                onChange={(e) => setTextReminders(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: '#0d5236',
                  cursor: 'pointer'
                }}
              />
              Send me tournament registration reminders by text.
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input 
                type="checkbox"
                disabled={isSubmitted}
                checked={emailAnnouncements}
                onChange={(e) => setEmailAnnouncements(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: '#0d5236',
                  cursor: 'pointer'
                }}
              />
              Send me tournament announcements by email.
            </label>
          </div>

          {/* Submit Button */}
          {!isSubmitted && (
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '14px 20px',
                backgroundColor: '#0d5236',
                border: 'none',
                borderRadius: '12px',
                color: '#f5eedc',
                fontSize: '1.1rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 8px 16px rgba(13, 82, 54, 0.25)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0f6643'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0d5236'; }}
            >
              {isSubmitting ? 'Saving...' : 'Save My Information'}
            </button>
          )}
        </form>

        {/* Success Dialog */}
        {isSubmitted && (
          <div className="animate-slide-up" style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            marginTop: '10px'
          }}>
            <div style={{ fontSize: '0.85rem', color: '#0d5236', fontWeight: 700, textAlign: 'center' }}>
              Your information was submitted for admin review.
            </div>

            {/* Thank you box */}
            <div style={{
              width: '100%',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '2px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '16px',
              padding: '24px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#052e16'
              }}>
                <Check size={24} strokeWidth={3} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#047857', margin: 0 }}>
                Thank You!
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#065f46', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                Your contact information has been received.<br />
                We'll review it and update your player record.<br />
                <strong>See you at the tables!</strong>
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ fontSize: '0.75rem', color: '#789c8c', fontWeight: 600, textAlign: 'center', marginTop: '4px' }}>
          Your information is never shared outside the Penny Ante Poker Club.
        </div>
      </div>
    </div>
  );
};
