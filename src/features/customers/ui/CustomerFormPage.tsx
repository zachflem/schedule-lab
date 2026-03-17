import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api } from '@/shared/lib/api';
import { CustomerSchema, type Customer } from '@/shared/validation/schemas';
import { Spinner } from '@/shared/ui';

export function CustomerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!(id && id !== 'new'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    billing_address: '',
    site_contact_name: '',
    site_contact_phone: '',
    site_contact_email: '',
    billing_contact_name: '',
    billing_contact_phone: '',
    billing_contact_email: '',
  });

  useEffect(() => {
    if (id && id !== 'new') {
      async function fetchCustomer() {
        try {
          const customers = await api.get<Customer[]>('/customers');
          const customer = customers.find(c => c.id === id);
          if (customer) {
            setFormData(customer);
          } else {
            setError('Customer not found');
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch customer');
        } finally {
          setLoading(false);
        }
      }
      fetchCustomer();
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const validated = CustomerSchema.parse(formData);
      if (id && id !== 'new') {
        await api.put(`/customers/${id}`, validated);
      } else {
        await api.post('/customers', validated);
      }
      navigate('/customers');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="container" style={{ padding: 'var(--space-8)', maxWidth: '800px' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 className="docket-page__title">{id === 'new' ? 'New Customer' : 'Edit Customer'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {error && (
          <div style={{ padding: 'var(--space-4)', background: 'var(--color-danger-50)', color: 'var(--color-danger-700)', borderRadius: 'var(--radius-md)' }}>
            {error}
          </div>
        )}

        {/* Basic Details */}
        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Basic Details</h2>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Customer Name *</label>
              <input
                required
                className="form-input"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
            <label className="form-label">Customer Address</label>
            <textarea
              className="form-input"
              rows={3}
              value={formData.billing_address || ''}
              placeholder="Full postal or physical address"
              onChange={e => setFormData({ ...formData, billing_address: e.target.value })}
            />
          </div>
        </div>

        <div className="form-grid">
          {/* Site Contact */}
          <div className="card" style={{ padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)', color: 'var(--color-primary-600)' }}>
              Site Contact
            </h2>
            <div className="flex-col gap-3" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label">Contact Name</label>
                <input
                  className="form-input"
                  value={formData.site_contact_name || ''}
                  onChange={e => setFormData({ ...formData, site_contact_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input
                  className="form-input"
                  value={formData.site_contact_phone || ''}
                  onChange={e => setFormData({ ...formData, site_contact_phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.site_contact_email || ''}
                  onChange={e => setFormData({ ...formData, site_contact_email: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Billing Contact */}
          <div className="card" style={{ padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)', color: 'var(--color-secondary-600)' }}>
              Billing Contact
            </h2>
            <div className="flex-col gap-3" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label">Contact Name</label>
                <input
                  className="form-input"
                  value={formData.billing_contact_name || ''}
                  onChange={e => setFormData({ ...formData, billing_contact_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input
                  className="form-input"
                  value={formData.billing_contact_phone || ''}
                  onChange={e => setFormData({ ...formData, billing_contact_phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.billing_contact_email || ''}
                  onChange={e => setFormData({ ...formData, billing_contact_email: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn--secondary" onClick={() => navigate('/customers')}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
