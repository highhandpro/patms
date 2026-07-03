import React from 'react';
import { PlayerBanner } from '../components/PlayerBanner';
import { MapPin, ShieldAlert } from 'lucide-react';

interface PlayerClubsProps {
  setPortalMode: (mode: 'player' | 'admin') => void;
}

export const PlayerClubs: React.FC<PlayerClubsProps> = ({ 
  setPortalMode 
}) => {
  return (
    <div className="player-page player-clubs-page animate-fade-in">
      <PlayerBanner>
        <h1 className="banner-title text-center">Clubs & Locations</h1>
      </PlayerBanner>

      <div className="player-page-content">
        <div className="clubs-grid" style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '32px' }}>
          
          {/* Main Locations Panel */}
          <div className="locations-panel glass-card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem', marginBottom: '16px' }}>
              <MapPin size={24} style={{ color: 'var(--color-emerald)' }} />
              <span>Host Club Venues</span>
            </h2>
            <div className="location-card" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '20px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>Washougal Eagles Club</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '2px' }}>Primary Tournament Venue</p>
              <p style={{ marginTop: '12px', fontSize: '1rem', fontWeight: 600, color: 'var(--color-emerald)', lineHeight: '1.4' }}>
                📍 1910 Main St,<br />
                Washougal, WA 98671
              </p>
            </div>
          </div>

          {/* Right Panel: Admin shortcut & Partnerships */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Admin Portal Card */}
            <div className="glass-card admin-shortcut-card" style={{ borderLeft: '4px solid var(--color-emerald)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <ShieldAlert size={20} style={{ color: 'var(--color-emerald)' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Director's Access</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Are you a Tournament Director or League Organizer? Switch to the admin interface to manage members, record buy-ins, track eliminations, and configure league seasons.
              </p>
              <button 
                className="btn btn-primary" 
                onClick={() => setPortalMode('admin')}
                style={{ width: '100%', marginTop: '20px' }}
              >
                Go to Admin Dashboard
              </button>
            </div>

            {/* Partner League info */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '12px' }}>League Affiliates</h3>
              <p style={{ fontSize: '0.9rem' }}>
                Our league collaborates with other local groups to host regional invitationals and annual tournaments. Contact Tim Hufler or another tournament organizer if you'd like your league to affiliate with Penny Ante Club.
              </p>
            </div>

          </div>

        </div>

        {/* Page Footer */}
        <footer className="player-page-footer">
          <p>© 2026 Tim Hufler. All rights reserved.</p>
        </footer>

      </div>
    </div>
  );
};
