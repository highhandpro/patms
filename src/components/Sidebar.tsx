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
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-emerald)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy size={28} />
          <span>PATMS</span>
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Tournament Manager
        </p>
      </div>

      {activeSeason && (
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: isSubAdmin ? '12px' : '24px'
        }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>
            Active Season
          </span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-gold)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <span className="indicator indicator-gold" style={{ width: '6px', height: '6px' }}></span>
            {activeSeason.name}
          </span>
        </div>
      )}

      {isChiefAdmin && (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-emerald)', fontWeight: 700, display: 'block' }}>
              Chief Admin Mode
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
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
              className="btn btn-ghost"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                backgroundColor: isActive ? 'rgba(0, 120, 212, 0.08)' : 'transparent',
                color: isActive ? '#0078d4' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 400,
                border: isActive ? '1px solid rgba(0, 120, 212, 0.2)' : '1px solid transparent',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
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

      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button 
          onClick={onSwitchPortal}
          className="btn btn-ghost"
          style={{
            width: '100%',
            justifyContent: 'center',
            fontSize: '0.85rem',
            color: '#0078d4',
            borderColor: 'rgba(0, 120, 212, 0.3)',
            borderStyle: 'solid',
            borderWidth: '1px',
            borderRadius: '8px',
            padding: '8px 12px',
            backgroundColor: 'rgba(0, 120, 212, 0.04)'
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
              color: 'var(--color-danger)',
              borderColor: 'rgba(239, 68, 68, 0.2)',
              borderStyle: 'solid',
              borderWidth: '1px',
              borderRadius: '8px',
              padding: '8px 12px',
              backgroundColor: 'rgba(239, 68, 68, 0.02)'
            }}
          >
            Log Out Admin
          </button>
        )}
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Penny Ante Poker Club
          </p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2px' }}>
            v1.0 (Local-First)
          </p>
        </div>
      </div>
    </aside>
  );
};
