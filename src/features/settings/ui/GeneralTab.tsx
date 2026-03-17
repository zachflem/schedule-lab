import { useState, useEffect } from 'react';
import { api } from '@/shared/lib/api';
import { type PlatformSettings } from '@/shared/validation/schemas';

export function GeneralTab() {
  const [settings, setSettings] = useState<PlatformSettings>({
    id: 'global',
    company_name: 'ScheduleLab',
    primary_color: '#2563eb',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const data = await api.get<PlatformSettings>('/settings');
        setSettings(data);
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/settings', settings);
      setMessage({ type: 'success', text: 'Settings updated successfully!' });
      // Update CSS variable for primary color if changed
      document.documentElement.style.setProperty('--color-primary-600', settings.primary_color);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div className="card shadow-sm" style={{ maxWidth: '600px' }}>
      <div className="card__header">
        <h3 className="card__title">Platform Identity</h3>
      </div>
      <form onSubmit={handleSave} className="card__body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Company Name</label>
            <input
              type="text"
              className="form-input"
              value={settings.company_name}
              onChange={e => setSettings({ ...settings, company_name: e.target.value })}
              placeholder="e.g. ScheduleLab"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Primary Brand Color</label>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <input
                type="color"
                style={{ width: '48px', height: '48px', padding: 0, border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                value={settings.primary_color}
                onChange={e => setSettings({ ...settings, primary_color: e.target.value })}
              />
              <input
                type="text"
                className="form-input"
                style={{ fontFamily: 'monospace' }}
                value={settings.primary_color}
                onChange={e => setSettings({ ...settings, primary_color: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Logo URL</label>
            <input
              type="text"
              className="form-input"
              value={settings.logo_url || ''}
              onChange={e => setSettings({ ...settings, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
          </div>

          {message && (
            <div style={{ 
              padding: 'var(--space-3)', 
              borderRadius: 'var(--radius-md)',
              background: message.type === 'success' ? 'var(--color-success-50)' : 'var(--color-danger-50)',
              color: message.type === 'success' ? 'var(--color-success-700)' : 'var(--color-danger-700)',
              fontSize: 'var(--text-sm)',
            }}>
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
