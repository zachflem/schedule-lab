import { useState, useEffect } from 'react';
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

interface CustomerEditModalProps {
  customerId: string | null; // null = new customer
  onClose: () => void;
  onSaved: (newId?: string) => void;
}

export function CustomerEditModal({ customerId, onClose, onSaved }: CustomerEditModalProps) {
  const isNew = customerId === null;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    billing_address: '',
    payment_terms_days: 30,
    contacts: [],
  });

  useEffect(() => {
    if (!isNew) {
      async function fetchCustomer() {
        try {
          const customer = await api.get<Customer>(`/customers/${customerId}`);
          setFormData(customer);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch customer');
        } finally {
          setLoading(false);
        }
      }
      fetchCustomer();
    }
  }, [customerId, isNew]);

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
      if (!isNew) {
        await api.put(`/customers/${customerId}`, validated);
        onSaved();
      } else {
        const result = await api.post<{ id: string }>('/customers', validated);
        onSaved(result.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customer');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-slide-in" style={{ maxWidth: '680px', width: '100%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{isNew ? 'New Customer' : 'Edit Customer'}</h2>
          <button type="button" className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <Spinner />
          ) : (
            <form
              id="customer-edit-form"
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}
            >
              {error && (
                <div style={{ padding: 'var(--space-4)', background: 'var(--color-danger-50)', color: 'var(--color-danger-700)', borderRadius: 'var(--radius-md)' }}>
                  {error}
                </div>
              )}

                {/* Basic Details */}
                <div className="card" style={{ padding: 'var(--space-6)' }}>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Basic Details</h3>
                  <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                    <label className="form-label">Customer Name *</label>
                    <input
                      required
                      className="form-input"
                      value={formData.name ?? ''}
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
                  <div className="form-group">
                    <label className="form-label">Payment Terms</label>
                    <select
                      className="form-input"
                      value={formData.payment_terms_days ?? 30}
                      onChange={e => setFormData({ ...formData, payment_terms_days: Number(e.target.value) })}
                    >
                      <option value={7}>Net 7 days</option>
                      <option value={14}>Net 14 days</option>
                      <option value={30}>Net 30 days</option>
                      <option value={60}>Net 60 days</option>
                    </select>
                  </div>
                </div>

                {/* Contacts */}
                <div className="card" style={{ padding: 'var(--space-6)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                    <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>Contacts</h3>
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
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
                              Contact {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeContact(index)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger-600)', fontSize: 'var(--text-sm)', padding: '2px 6px' }}
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
            </form>
          )}
        </div>

        {!loading && (
          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
            <button type="submit" form="customer-edit-form" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        )}
      </div>
    </div>

  );
}
