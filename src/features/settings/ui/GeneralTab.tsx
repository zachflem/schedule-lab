import { useState, useEffect, useRef } from 'react';
import { api } from '@/shared/lib/api';
import { invalidateSettings } from '@/shared/lib/useSettings';
import { type PlatformSettings } from '@/shared/validation/schemas';
import { useToast } from '@/shared/lib/toast';

export function GeneralTab() {
  const { showToast } = useToast();
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

  const [testEmail, setTestEmail] = useState('');
  const [testEmailConfirm, setTestEmailConfirm] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

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
      invalidateSettings();
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

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (testEmail !== testEmailConfirm) {
      showToast('Email addresses do not match.', 'warning');
      return;
    }
    setSendingTest(true);
    try {
      await api.post('/settings/test-email', { to: testEmail });
      showToast(`Test email sent to ${testEmail}!`, 'success');
      setTestEmail('');
      setTestEmailConfirm('');
    } catch {
      showToast('Failed to send test email. Check your Resend API key and try again.', 'warning');
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '600px' }}>
    <div className="card shadow-sm">
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

    <div className="card shadow-sm">
      <div className="card__header">
        <h3 className="card__title">Test Email</h3>
      </div>
      <form onSubmit={handleSendTestEmail} className="card__body">
        <p style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
          Send a test email to verify your email configuration is working. The email will use your current company name and logo.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Recipient Email</label>
            <input
              type="email"
              className="form-input"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Email</label>
            <input
              type="email"
              className="form-input"
              value={testEmailConfirm}
              onChange={e => setTestEmailConfirm(e.target.value)}
              placeholder="you@example.com"
              required
            />
            {testEmailConfirm && testEmail !== testEmailConfirm && (
              <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-danger-700)' }}>
                Email addresses do not match.
              </p>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn--secondary"
              disabled={sendingTest || !testEmail || testEmail !== testEmailConfirm}
            >
              {sendingTest ? 'Sending...' : 'Send Test Email'}
            </button>
          </div>
        </div>
      </form>
    </div>
    </div>
  );
}
