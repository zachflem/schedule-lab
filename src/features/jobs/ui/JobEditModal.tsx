import { useState } from 'react';
import type { Job } from '@/shared/validation/schemas';
import { JobStatusEnum } from '@/shared/validation/schemas';
import type { JobWithResources } from '../api/useJobs';

interface JobEditModalProps {
  job: JobWithResources;
  onClose: () => void;
  onSave: (id: string, data: Partial<Job>) => Promise<{ success: boolean; error?: string }>;
}

export function JobEditModal({ job, onClose, onSave }: JobEditModalProps) {
  const [formData, setFormData] = useState({
    status_id: job.status_id || 'Job Booked',
    location: job.location || '',
    site_contact_name: job.site_contact_name || '',
    site_contact_phone: job.site_contact_phone || '',
    site_contact_email: job.site_contact_email || '',
    job_brief: job.job_brief || '',
    po_number: job.po_number || '',
    job_type: job.job_type || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await onSave(job.id!, formData);
      if (result.success) {
        onClose();
      } else {
        setError(result.error || 'Failed to update job');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', width: '95%' }}>
        <div className="modal-header">
          <h2>Edit Job: {job.customer_name}</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert--danger mb-4">{error}</div>}

            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Status</label>
                <select 
                  name="status_id" 
                  value={formData.status_id} 
                  onChange={handleChange}
                  className="form-input"
                  required
                >
                  {JobStatusEnum.options.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Location</label>
                <input 
                  type="text" 
                  name="location" 
                  value={formData.location} 
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Site Contact Name</label>
                <input 
                  type="text" 
                  name="site_contact_name" 
                  value={formData.site_contact_name} 
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Site Contact Phone</label>
                <input 
                  type="text" 
                  name="site_contact_phone" 
                  value={formData.site_contact_phone} 
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Site Contact Email</label>
                <input 
                  type="email" 
                  name="site_contact_email" 
                  value={formData.site_contact_email} 
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">PO Number</label>
                <input 
                  type="text" 
                  name="po_number" 
                  value={formData.po_number} 
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Job Type</label>
                <input 
                  type="text" 
                  name="job_type" 
                  value={formData.job_type} 
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Job Brief</label>
                <textarea 
                  name="job_brief" 
                  value={formData.job_brief} 
                  onChange={handleChange}
                  className="form-input"
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer mt-6 flex justify-end gap-3">
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button 
              type="submit" 
              className="btn btn--primary" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
