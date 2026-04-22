import { useState } from 'react';
import { GeneralTab } from './GeneralTab';
import { AssetSettingsTab } from './AssetSettingsTab';
import { CustomerSettingsTab } from './CustomerSettingsTab';
import { QualificationSettingsTab } from './QualificationSettingsTab';
import { IntegrationsTab } from './IntegrationsTab';

type TabId = 'general' | 'assets' | 'customers' | 'qualifications' | 'integrations';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('general');

  const tabs = [
    { id: 'general', label: 'General', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16 }}>
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )},
    { id: 'assets', label: 'Assets', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16 }}>
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    )},
    { id: 'customers', label: 'Customers', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    )},
    { id: 'qualifications', label: 'Qualifications', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16 }}>
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    )},
    { id: 'integrations', label: 'Integrations', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16 }}>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    )},
  ];

  return (
    <div className="container" style={{ paddingTop: 'var(--space-6)' }}>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800 }}>Settings</h1>
        <p style={{ color: 'var(--color-gray-500)' }}>Manage your platform configuration and master data.</p>
      </header>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-gray-200)', marginBottom: 'var(--space-6)', gap: 'var(--space-4)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabId)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-4)',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: activeTab === tab.id ? 'var(--color-primary-600)' : 'var(--color-gray-500)',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-primary-600)' : '2px solid transparent',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: '800px' }}>
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'assets' && <AssetSettingsTab />}
        {activeTab === 'customers' && <CustomerSettingsTab />}
        {activeTab === 'qualifications' && <QualificationSettingsTab />}
        {activeTab === 'integrations' && <IntegrationsTab />}
      </div>
    </div>
  );
}
