import React from 'react';
import { PlayerBanner } from '../components/PlayerBanner';
import { Info, Coins, Award } from 'lucide-react';

export const PlayerAbout: React.FC = () => {
  return (
    <div className="player-page player-about-page animate-fade-in">
      <PlayerBanner>
        <h1 className="banner-title text-center">About Our Club</h1>
      </PlayerBanner>

      <div className="player-page-content">
        <div className="about-grid">
          
          {/* Card 1: Club Info */}
          <div className="about-card glass-card">
            <div className="about-card-header">
              <Info className="about-icon" size={24} />
              <h2>Penny Ante Poker Club</h2>
            </div>
            <p>
              Welcome to the Penny Ante Poker Club! We are a local home poker league dedicated to friendly competition, skill building, and camaraderie. We play structured tournaments running on regular schedules with points tracked across the season.
            </p>
            <p style={{ marginTop: '12px' }}>
              Whether you are looking to improve your game, test your tournament strategies, or just meet local poker enthusiasts, our league provides a welcoming and professional structure for players of all experience levels.
            </p>
          </div>

          {/* Card 2: Tournament Rules */}
          <div className="about-card glass-card">
            <div className="about-card-header">
              <Coins className="about-icon" size={24} />
              <h2>Tournament Structure</h2>
            </div>
            <ul className="about-rules-list">
              <li><strong>Buy-In:</strong> $50 Buy-In (includes 20,000 Starting Chips, $5 ToC & $20 Bounty).</li>
              <li><strong>Optional Dealer Appreciation:</strong> $5 for +5,000 Bonus Chips.</li>
              <li><strong>RSVP & Arrive On Time:</strong> Receive +5,000 Bonus Chips.</li>
              <li style={{ color: 'var(--color-gold)', fontWeight: 600 }}>
                Please bring smaller bills instead of $100 bills to help registration go faster! 😄
              </li>
            </ul>
          </div>

          {/* Card 3: Standings Points Formula */}
          <div className="about-card glass-card" style={{ gridColumn: 'span 2' }}>
            <div className="about-card-header">
              <Award className="about-icon" size={24} />
              <h2>Season Rankings & Points System</h2>
            </div>
            <p>
              We calculate points for each tournament to maintain a seasonal leaderboard. The points formula rewards both attendance and placement performance:
            </p>
            <div className="points-formula-box">
              <code className="formula-code">
                Points = (Base Position Points × Finish Multiplier) + (Bounties × 3) + 10 (Attendance)
              </code>
            </div>
            <div className="formula-explanation" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '16px' }}>
              <div>
                <h4 style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Base Position Points</h4>
                <p style={{ fontSize: '0.9rem' }}>
                  Base points are calculated as: <code>Field Size - Finish Position + 1</code>. 
                  For example, in a field of 20 players, 1st place gets 20 base points, 2nd gets 19 base points, down to 1 base point for the last place.
                </p>
              </div>
              <div>
                <h4 style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Multipliers & Bounties</h4>
                <ul style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginLeft: '16px', marginTop: '4px' }}>
                  <li><strong>1st Place Winner:</strong> Receives a <strong>3x multiplier</strong> on base position points.</li>
                  <li><strong>Final Table (2nd to 10th):</strong> Receives a <strong>2x multiplier</strong>.</li>
                  <li><strong>Bounty Chips:</strong> Each bounty collected is worth <strong>3 points</strong>.</li>
                  <li><strong>Attendance:</strong> Every player receives <strong>10 points</strong> just for playing.</li>
                </ul>
              </div>
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
