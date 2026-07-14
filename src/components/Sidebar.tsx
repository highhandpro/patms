import React from 'react';
import { LayoutDashboard, Users, Trophy, Award, Settings as SettingsIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSwitchPortal?: () => void;
  onLogoutAdmin?: () => void;
  isSubAdmin?: boolean;
  isChiefAdmin?: boolean;
  isTournamentDirector?: boolean;
  onChangePassword?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onSwitchPortal, onLogoutAdmin, isSubAdmin, isChiefAdmin, isTournamentDirector, onChangePassword }) => {
  const { activeSeason, state } = useApp();
  const pendingApprovalsCount = state.pendingApprovals?.length || 0;

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'members', name: 'Members', icon: Users },
    { id: 'tournaments', name: 'Tournaments', icon: Trophy },
    { id: 'standings', name: 'Standings', icon: Award },
    ...(isSubAdmin ? [] : [{ id: 'settings', name: 'Settings', icon: SettingsIcon }]),
  ];

  return (
    <aside className="sidebar">
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy size={28} />
          <span>PATMS</span>
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Tournament Manager
        </p>
      </div>

      {activeSeason && (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: isSubAdmin ? '12px' : '24px'
        }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.7)', display: 'block', fontWeight: 600 }}>
            Active Season
          </span>
          <span style={{ fontSize: '0.9rem', color: '#D4AF37', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <span className="indicator indicator-gold" style={{ width: '6px', height: '6px', backgroundColor: '#D4AF37' }}></span>
            {activeSeason.name}
          </span>
        </div>
      )}

      {isChiefAdmin && (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#5FCB72', fontWeight: 700, display: 'block' }}>
              Chief Admin Mode
            </span>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              Full Authority
            </span>
          </div>
          {onChangePassword && (
            <button 
              onClick={onChangePassword}
              className="btn btn-ghost"
              style={{
                fontSize: '0.75rem',
                padding: '4px 8px',
                color: 'var(--color-emerald)',
                borderColor: 'rgba(16, 185, 129, 0.2)',
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                width: '100%',
                justifyContent: 'center',
                minHeight: '28px'
              }}
            >
              Change Password
            </button>
          )}
        </div>
      )}

      {isTournamentDirector && (
        <div style={{
          backgroundColor: 'rgba(99, 102, 241, 0.05)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#818CF8', fontWeight: 700, display: 'block' }}>
              Tournament Director Mode
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Full Access, except Reset
            </span>
          </div>
          {onChangePassword && (
            <button 
              onClick={onChangePassword}
              className="btn btn-ghost"
              style={{
                fontSize: '0.75rem',
                padding: '4px 8px',
                color: '#818CF8',
                borderColor: 'rgba(99, 102, 241, 0.2)',
                backgroundColor: 'rgba(99, 102, 241, 0.05)',
                width: '100%',
                justifyContent: 'center',
                minHeight: '28px'
              }}
            >
              Change Password
            </button>
          )}
        </div>
      )}

      {isSubAdmin && (
        <div style={{
          backgroundColor: 'rgba(245,158,11,0.05)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-gold)', fontWeight: 700, display: 'block' }}>
              Admin Mode
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              View-Only Access
            </span>
          </div>
          {onChangePassword && (
            <button 
              onClick={onChangePassword}
              className="btn btn-ghost"
              style={{
                fontSize: '0.75rem',
                padding: '4px 8px',
                color: 'var(--text-gold)',
                borderColor: 'rgba(245,158,11,0.2)',
                backgroundColor: 'rgba(245,158,11,0.05)',
                width: '100%',
                justifyContent: 'center',
                minHeight: '28px'
              }}
            >
              Change Password
            </button>
          )}
        </div>
      )}

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`btn btn-ghost sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span style={{ flexGrow: 1, textAlign: 'left' }}>{item.name}</span>
              {item.id === 'members' && pendingApprovalsCount > 0 && (
                <span 
                  style={{
                    backgroundColor: '#E5E7EB',
                    color: '#111827',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: '10px',
                    padding: '2px 8px',
                    lineHeight: 1
                  }}
                >
                  {pendingApprovalsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.15)', paddingTop: '16px', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button 
          onClick={onSwitchPortal}
          className="btn btn-ghost"
          style={{
            width: '100%',
            justifyContent: 'center',
            fontSize: '0.85rem',
            color: '#FFFFFF',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            borderStyle: 'solid',
            borderWidth: '1px',
            borderRadius: '8px',
            padding: '8px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)'
          }}
        >
          Switch to Player Portal
        </button>
        {onLogoutAdmin && (
          <button 
            onClick={onLogoutAdmin}
            className="btn btn-ghost"
            style={{
              width: '100%',
              justifyContent: 'center',
              fontSize: '0.85rem',
              color: '#FFA39E',
              borderColor: 'rgba(217, 58, 47, 0.3)',
              borderStyle: 'solid',
              borderWidth: '1px',
              borderRadius: '8px',
              padding: '8px 12px',
              backgroundColor: 'rgba(217, 58, 47, 0.1)'
            }}
          >
            Log Out Admin
          </button>
        )}
        <div>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center' }}>
            Penny Ante Poker Club
          </p>
          <p style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center', marginTop: '2px' }}>
            v1.0 (Local-First)
          </p>
        </div>
      </div>
    </aside>
  );
};
