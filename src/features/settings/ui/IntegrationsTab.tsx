import { useState, useEffect } from 'react';
import { api } from '@/shared/lib/api';
import { type PlatformSettings } from '@/shared/validation/schemas';
import { useToast } from '@/shared/lib/toast';

export function IntegrationsTab() {
  const { showToast } = useToast();
  const [xeroAccountCode, setXeroAccountCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<PlatformSettings>('/settings')
      .then(data => setXeroAccountCode(data.xero_account_code ?? ''))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings', { xero_account_code: xeroAccountCode || null });
      showToast('Integration settings saved.', 'success');
    } catch {
      showToast('Failed to save settings.', 'warning');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: '600px' }}>
      <div className="card shadow-sm">
        <div className="card__header">
          <div>
            <h3 className="card__title">Xero Export</h3>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
              Configure how validated dockets are exported to Xero as invoices.
            </p>
          </div>
        </div>
        <form onSubmit={handleSave} className="card__body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Default Account Code</label>
              <input
                type="text"
                className="form-input"
                value={xeroAccountCode}
                onChange={e => setXeroAccountCode(e.target.value)}
                placeholder="e.g. 200"
                style={{ maxWidth: '200px' }}
              />
              <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>
                This code maps each invoice line to a chart of accounts category in Xero.
                Find it in Xero under Accounting → Chart of Accounts.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
