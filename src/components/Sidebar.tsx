import React from 'react';
import { LayoutDashboard, Users, Trophy, Award, Settings as SettingsIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { activeSeason } = useApp();

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'members', name: 'Members', icon: Users },
    { id: 'tournaments', name: 'Tournaments', icon: Trophy },
    { id: 'standings', name: 'Standings', icon: Award },
    { id: 'settings', name: 'Settings', icon: SettingsIcon },
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
          marginBottom: '24px'
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
                backgroundColor: isActive ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                color: isActive ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 400,
                border: isActive ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid transparent',
                borderRadius: '8px',
                padding: '12px 16px'
              }}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', marginTop: 'auto' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Penny Ante Poker Club
        </p>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2px' }}>
          v1.0 (Local-First)
        </p>
      </div>
    </aside>
  );
};
