import { useState, useEffect, useRef } from 'react';
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
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoMessage, setLogoMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

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
      const { logo_url, ...settingsToSave } = settings;
      await api.put('/settings', settingsToSave);
      setMessage({ type: 'success', text: 'Settings updated successfully!' });
      document.documentElement.style.setProperty('--color-primary-600', settings.primary_color);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    setLogoMessage(null);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const response = await fetch('/api/settings/logo', { method: 'POST', body: formData });
      if (!response.ok) {
        const err = await response.json() as { error?: string };
        throw new Error(err.error ?? 'Upload failed');
      }
      const { logo_url } = await response.json() as { logo_url: string };
      setSettings(s => ({ ...s, logo_url }));
      setLogoMessage({ type: 'success', text: 'Logo uploaded successfully!' });
    } catch (err) {
      setLogoMessage({ type: 'error', text: err instanceof Error ? err.message : 'Upload failed.' });
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
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
            <label className="form-label">Company Logo</label>
            {settings.logo_url && (
              <div style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)', display: 'inline-block' }}>
                <img src={settings.logo_url} alt="Current logo" style={{ maxHeight: '48px', maxWidth: '180px', objectFit: 'contain', display: 'block' }} />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                style={{ display: 'none' }}
                onChange={handleLogoUpload}
              />
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
              >
                {logoUploading ? 'Uploading...' : settings.logo_url ? 'Replace Logo' : 'Upload Logo'}
              </button>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-400)' }}>PNG, JPEG, WebP or SVG — max 2 MB</span>
            </div>
            {logoMessage && (
              <p style={{ margin: 'var(--space-2) 0 0', fontSize: 'var(--text-sm)', color: logoMessage.type === 'success' ? 'var(--color-success-700)' : 'var(--color-danger-700)' }}>
                {logoMessage.text}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Installation URL (Public)</label>
            <input
              type="text"
              className="form-input"
              value={settings.base_url || ''}
              onChange={e => setSettings({ ...settings, base_url: e.target.value })}
              placeholder="https://schedule-lab.pages.dev"
            />
            <p className="text-xs text-gray-400 mt-1">This is the base URL used for public links (e.g. for enquiries).</p>
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
