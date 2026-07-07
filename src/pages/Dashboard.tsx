import React from 'react';
import { useApp } from '../context/AppContext';
import { calculateStandings, formatDate } from '../utils/stats';
import { Users, Trophy, Coins, Plus, Play, ChevronRight, Calendar, ArrowUpRight } from 'lucide-react';
import type { Tournament } from '../types';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  setSelectedTournamentId: (id: string | null) => void;
  setIsCreateTourOpen: (open: boolean) => void;
  setIsAddMemberOpen: (open: boolean) => void;
  isSubAdmin?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  setActiveTab,
  setSelectedTournamentId,
  setIsCreateTourOpen,
  setIsAddMemberOpen,
  isSubAdmin
}) => {
  const { state, activeSeason } = useApp();

  // Get active members count
  const activeMembersCount = state.members.filter(m => !m.isDeleted).length;

  // Filter completed tournaments in active season
  const completedTournaments = state.tournaments.filter(
    t => t.status === 'completed' && t.seasonId === activeSeason?.id
  );

  const totalDealerStaffApprec = activeSeason
    ? state.tournaments
        .filter(t => t.seasonId === activeSeason.id)
        .reduce((sum, t) => {
          if (t.status === 'completed') {
            return sum + t.totalDealerAppreciation;
          } else {
            const dealerCount = t.entries.filter(e => e.hasDealerAppreciation).length;
            return sum + (dealerCount * t.dealerAppreciationAmount);
          }
        }, 0)
    : 0;

  // Active or draft tournaments (running right now)
  const activeTournaments = state.tournaments.filter(t => t.status !== 'completed');

  // Standings leaderboard (top 15)
  const standings = activeSeason ? calculateStandings(state, activeSeason.id).slice(0, 15) : [];

  // Recent tournaments (up to 3)
  const recentTournaments = [...completedTournaments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const getWinnerName = (t: Tournament) => {
    const winnerEntry = t.entries.find(e => e.finishPosition === 1);
    if (!winnerEntry) return 'No winner';
    const winnerMember = state.members.find(m => m.id === winnerEntry.memberId);
    return winnerMember ? `${winnerMember.firstName} ${winnerMember.lastName}` : 'Unknown';
  };

  const handleManageActive = (tourId: string) => {
    setSelectedTournamentId(tourId);
    setActiveTab('tournaments');
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
          Club Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
          Welcome back, Tournament Director. Here is the club status for today.
        </p>
      </div>

      {/* Active Tournament Alert / Notification */}
      {activeTournaments.length > 0 && (
        <div className="glass-card" style={{
          borderLeft: '4px solid var(--color-emerald)',
          background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="indicator indicator-emerald"></span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Active Tournament in Progress</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
              <strong>{activeTournaments[0].name}</strong> is currently in{' '}
              <span style={{ textTransform: 'capitalize', color: activeTournaments[0].status === 'active' ? 'var(--text-emerald)' : 'var(--color-warning)' }}>
                {activeTournaments[0].status}
              </span>{' '}
              state with {activeTournaments[0].entries.length} players checked in.
            </p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => handleManageActive(activeTournaments[0].id)}
          >
            <Play size={18} fill="currentColor" />
            <span>Manage Live Game</span>
          </button>
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div className="grid-cols-3">
        
        {/* Metric 1 */}
        <div className="glass-card interactive" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: '12px',
            padding: '12px',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)'
          }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Active Members</span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '2px', color: 'var(--text-primary)' }}>
              {activeMembersCount}
            </h2>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-card interactive" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: '12px',
            padding: '12px',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)'
          }}>
            <Trophy size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Tournaments</span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '2px', color: 'var(--text-primary)' }}>
              {completedTournaments.length}
            </h2>
          </div>
        </div>

        {/* Metric 3: ToC Pool */}
        <div className="glass-card interactive" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{
            backgroundColor: 'rgba(251, 191, 36, 0.05)',
            borderRadius: '12px',
            padding: '12px',
            border: '1px solid rgba(251, 191, 36, 0.1)',
            color: 'var(--color-gold)'
          }}>
            <Coins size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>ToC Pool</span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '2px', color: 'var(--color-gold)' }}>
              ${totalDealerStaffApprec}
            </h2>
          </div>
        </div>

      </div>

      {/* Main Grid: Standings (left) & Actions/Recent Tournaments (right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '32px' }}>
        
        {/* Leaderboard Column */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Season Standings (Top 15)</h3>
            <button 
              onClick={() => setActiveTab('standings')}
              className="btn btn-ghost" 
              style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}
            >
              <span>View All</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {standings.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Rank</th>
                    <th>Player</th>
                    <th style={{ textAlign: 'center' }}>Games</th>
                    <th style={{ textAlign: 'center' }}>Top 10s</th>
                    <th style={{ textAlign: 'right' }}>Cash</th>
                    <th style={{ textAlign: 'right', color: 'var(--color-gold)' }}>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((player, idx) => (
                    <tr key={player.memberId}>
                      <td style={{ fontWeight: 600 }}>
                        {idx + 1}
                      </td>
                      <td style={{ fontWeight: 500 }}>{player.name}</td>
                      <td style={{ textAlign: 'center' }}>{player.played}</td>
                      <td style={{ textAlign: 'center' }}>{player.top10}</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-emerald)' }}>${player.earnings}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-gold)' }}>{player.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              No completed tournament records in the active season yet.
            </div>
          )}
        </div>

        {/* Right Actions & Recent Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
           {/* Quick Actions Card */}
           {!isSubAdmin && (
             <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Quick Actions</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 <button 
                   onClick={() => {
                     setActiveTab('tournaments');
                     setIsCreateTourOpen(true);
                   }}
                   className="btn btn-primary" 
                   style={{ width: '100%', justifyContent: 'flex-start', padding: '14px 20px' }}
                 >
                   <Plus size={20} />
                   <span>Create New Tournament</span>
                 </button>
                 <button 
                   onClick={() => {
                     setActiveTab('members');
                     setIsAddMemberOpen(true);
                   }}
                   className="btn btn-secondary" 
                   style={{ width: '100%', justifyContent: 'flex-start', padding: '14px 20px' }}
                 >
                   <Plus size={20} />
                   <span>Register New Member</span>
                 </button>
               </div>
             </div>
           )}

          {/* Recent Tournaments Card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Recent Tournaments</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentTournaments.length > 0 ? (
                recentTournaments.map((t) => (
                  <div 
                    key={t.id} 
                    onClick={() => handleManageActive(t.id)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                    className="interactive"
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{t.name}</span>
                      <div style={{ display: 'flex', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem', alignItems: 'center' }}>
                        <Calendar size={12} />
                        <span>{formatDate(t.date)}</span>
                        <span>•</span>
                        <span>{t.entries.length} players</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Winner</span>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-gold)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {getWinnerName(t)}
                        <ArrowUpRight size={14} />
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  No recent tournaments found.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
