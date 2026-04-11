import { useState, useEffect } from 'react';
import { api } from '@/shared/lib/api';
import type { Customer } from '@/shared/validation/schemas';

interface NewJobModalProps {
  onClose: () => void;
  onCreate: (data: any) => Promise<{ success: boolean; error?: string }>;
}

export function NewJobModal({ onClose, onCreate }: NewJobModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customer_id: '',
    status_id: 'Job Booked',
    job_type: '',
    po_number: '',
    location: '',
    site_contact_name: '',
    site_contact_phone: '',
    site_contact_email: '',
    job_brief: '',
  });

  useEffect(() => {
    api.get<Customer[]>('/customers')
      .then(setCustomers)
      .catch(console.error)
      .finally(() => setLoadingCustomers(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) {
      setError('Please select a customer.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const result = await onCreate(formData);
    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to create job');
      setIsSubmitting(false);
    }
  };

  const twoCol: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 'var(--space-4)',
  };
  const spanFull: React.CSSProperties = { gridColumn: '1 / -1' };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '560px', width: '95%' }}>
        <div className="modal-header">
          <h2 style={{ fontSize: 'var(--text-xl)' }}>New Job</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {error && <div className="alert alert--danger">{error}</div>}

            <div style={twoCol}>
              <div className="form-group" style={spanFull}>
                <label className="form-label">Customer <span style={{ color: 'var(--color-danger-500)' }}>*</span></label>
                <select
                  name="customer_id"
                  value={formData.customer_id}
                  onChange={handleChange}
                  className="form-input"
                  required
                  disabled={loadingCustomers}
                >
                  <option value="">{loadingCustomers ? 'Loading…' : 'Select a customer'}</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id!}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Job Type</label>
                <input type="text" name="job_type" value={formData.job_type} onChange={handleChange} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">PO Number</label>
                <input type="text" name="po_number" value={formData.po_number} onChange={handleChange} className="form-input" />
              </div>

              <div className="form-group" style={spanFull}>
                <label className="form-label">Location</label>
                <input type="text" name="location" value={formData.location} onChange={handleChange} className="form-input" />
              </div>

              <div className="form-group">
                <label className="form-label">Site Contact Name</label>
                <input type="text" name="site_contact_name" value={formData.site_contact_name} onChange={handleChange} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Site Contact Phone</label>
                <input type="text" name="site_contact_phone" value={formData.site_contact_phone} onChange={handleChange} className="form-input" />
              </div>
              <div className="form-group" style={spanFull}>
                <label className="form-label">Site Contact Email</label>
                <input type="email" name="site_contact_email" value={formData.site_contact_email} onChange={handleChange} className="form-input" />
              </div>

              <div className="form-group" style={spanFull}>
                <label className="form-label">Job Brief</label>
                <textarea name="job_brief" value={formData.job_brief} onChange={handleChange} className="form-input" rows={3} />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={isSubmitting || loadingCustomers}>
                {isSubmitting ? 'Creating…' : 'Create Job'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
