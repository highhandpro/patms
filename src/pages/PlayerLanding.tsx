import React from 'react';

interface PlayerLandingProps {
  onOpenLogin: () => void;
  setPortalMode: (mode: 'player' | 'admin') => void;
}

export const PlayerLanding: React.FC<PlayerLandingProps> = ({ onOpenLogin, setPortalMode }) => {
  return (
    <div 
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 72px)',
        padding: '20px',
        backgroundImage: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.05) 0%, transparent 70%)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Dynamic Background Elements */}
      <div 
        style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          backgroundColor: 'rgba(16, 185, 129, 0.03)',
          filter: 'blur(80px)',
          top: '20%',
          left: '10%',
          zIndex: 0
        }}
      />
      <div 
        style={{
          position: 'absolute',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          backgroundColor: 'rgba(11, 107, 42, 0.02)',
          filter: 'blur(100px)',
          bottom: '15%',
          right: '10%',
          zIndex: 0
        }}
      />

      <div 
        style={{
          zIndex: 1,
          maxWidth: '600px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px'
        }}
      >
        {/* Large Club Logo Banner Card */}
        <div 
          style={{
            width: '100%',
            maxWidth: '520px',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)',
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-subtle)',
            marginBottom: '8px'
          }}
        >
          <img 
            src="/club-logo.png" 
            alt="Penny Ante Poker Club Logo" 
            style={{
              width: '100%',
              height: 'auto',
              display: 'block'
            }}
          />
        </div>

        {/* Premium Description */}
        <p 
          style={{
            fontSize: '1.05rem',
            color: 'rgba(255, 255, 255, 0.85)',
            lineHeight: 1.6,
            margin: '0 auto',
            maxWidth: '460px',
            textShadow: '0 1px 2px rgba(0,0,0,0.2)'
          }}
        >
          Welcome to the club. Sign in to view upcoming schedules, check live results, track player standings, and reserve your seat at the next table.
        </p>

        {/* Main CTA Action Area */}
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            maxWidth: '320px',
            marginTop: '16px'
          }}
        >
          <button 
            onClick={onOpenLogin}
            className="btn btn-primary animate-pulse"
            style={{
              width: '100%',
              padding: '14px 24px',
              fontSize: '1.05rem',
              fontWeight: 700,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            Login & Register
          </button>
          
          <button 
            onClick={() => setPortalMode('admin')}
            className="btn btn-ghost"
            style={{
              width: '100%',
              padding: '12px 24px',
              fontSize: '0.95rem',
              color: '#FFFFFF',
              borderRadius: '12px',
              border: '1.5px solid rgba(255, 255, 255, 0.3)',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s ease'
            }}
          >
            Access Admin Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
