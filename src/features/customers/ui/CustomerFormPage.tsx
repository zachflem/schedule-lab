import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api } from '@/shared/lib/api';
import { CustomerSchema, CustomerContactRoleEnum, type Customer, type CustomerContact } from '@/shared/validation/schemas';
import { Spinner } from '@/shared/ui';

const emptyContact = (): CustomerContact => ({
  name: '',
  phone: '',
  email: '',
  location: '',
  role: null,
});

export function CustomerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!(id && id !== 'new'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    billing_address: '',
    contacts: [],
  });

  useEffect(() => {
    if (id && id !== 'new') {
      async function fetchCustomer() {
        try {
          const customer = await api.get<Customer>(`/customers/${id}`);
          setFormData(customer);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch customer');
        } finally {
          setLoading(false);
        }
      }
      fetchCustomer();
    }
  }, [id]);

  const contacts = formData.contacts ?? [];

  const addContact = () => {
    setFormData({ ...formData, contacts: [...contacts, emptyContact()] });
  };

  const removeContact = (index: number) => {
    setFormData({ ...formData, contacts: contacts.filter((_, i) => i !== index) });
  };

  const updateContact = (index: number, field: keyof CustomerContact, value: string) => {
    const updated = contacts.map((c, i) => i === index ? { ...c, [field]: value } : c);
    setFormData({ ...formData, contacts: updated });
  };

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

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {error && (
          <div style={{ padding: 'var(--space-4)', background: 'var(--color-danger-50)', color: 'var(--color-danger-700)', borderRadius: 'var(--radius-md)' }}>
            {error}
          </div>
        )}

        {/* Basic Details */}
        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Basic Details</h2>
          <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
            <label className="form-label">Customer Name *</label>
            <input
              required
              className="form-input"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="form-group">
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

        {/* Contacts */}
        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Contacts</h2>
            <button type="button" className="btn btn--secondary btn--sm" onClick={addContact}>
              + Add Contact
            </button>
          </div>

          {contacts.length === 0 ? (
            <p style={{ color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-6) 0' }}>
              No contacts yet. Click "Add Contact" to add one.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {contacts.map((contact, index) => (
                <div
                  key={index}
                  style={{
                    border: '1px solid var(--color-gray-200)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-4)',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
                      Contact {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeContact(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-danger-600)',
                        fontSize: 'var(--text-sm)',
                        padding: '2px 6px',
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="form-grid" style={{ gap: 'var(--space-3)' }}>
                    <div className="form-group">
                      <label className="form-label">Name *</label>
                      <input
                        required
                        className="form-input"
                        value={contact.name}
                        onChange={e => updateContact(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <select
                        className="form-input"
                        value={contact.role || ''}
                        onChange={e => updateContact(index, 'role', e.target.value)}
                      >
                        <option value="">— select role —</option>
                        {CustomerContactRoleEnum.options.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input
                        className="form-input"
                        value={contact.phone || ''}
                        maxLength={15}
                        onChange={e => updateContact(index, 'phone', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-input"
                        value={contact.email || ''}
                        onChange={e => updateContact(index, 'email', e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Location</label>
                      <input
                        className="form-input"
                        value={contact.location || ''}
                        maxLength={64}
                        placeholder="e.g. Head Office, Site B"
                        onChange={e => updateContact(index, 'location', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
