import { useState, useEffect } from 'react';
import { useEnquiries } from '../api/useEnquiries';
import { Spinner } from '@/shared/ui';
import { toLocalDateString } from '@/shared/lib/date';

export function PublicEnquiryPage() {
  const { assetTypes, loading, error, loadAssetTypes, submitEnquiry } = useEnquiries();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    enquiry_type: 'Job' as 'Job' | 'Project',
    customer_name: '',
    site_contact_name: '',
    contact_email: '',
    contact_phone: '',
    preferred_date: new Date().toISOString().split('T')[0],
    location: '',
    job_brief: '',
    asset_type_id: '',
    asset_requirement: '',
  });

  useEffect(() => {
    loadAssetTypes();
  }, [loadAssetTypes]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await submitEnquiry(formData);
    if (result.success) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="public-enquiry-page public-enquiry-page--success">
        <div className="glass-card text-center">
          <div className="success-icon">✓</div>
          <h1>Enquiry Submitted!</h1>
          <p>Thank you for your enquiry. Our team will review the details and get back to you shortly.</p>
          <button className="btn btn--primary" onClick={() => setSubmitted(false)}>Submit Another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="public-enquiry-page">
      <div className="glass-card">
        <header className="form-header">
          <h1>Booking Enquiry</h1>
          <p>Provide the details below and we'll handle the rest.</p>
        </header>

        {error && <div className="alert alert--danger mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="enquiry-form">
          <section className="form-section">
            <h3>Enquiry Type</h3>
            <div className="selection-cards">
              <div 
                className={`selection-card ${formData.enquiry_type === 'Job' ? 'selection-card--active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, enquiry_type: 'Job' }))}
              >
                <div className="selection-card__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </div>
                <div className="selection-card__label">I have a one off job</div>
              </div>
              <div 
                className={`selection-card ${formData.enquiry_type === 'Project' ? 'selection-card--active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, enquiry_type: 'Project' }))}
              >
                <div className="selection-card__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                </div>
                <div className="selection-card__label">I have an ongoing project</div>
              </div>
            </div>
          </section>

          <section className="form-section">
            <h3>Customer Info</h3>
            <div className="form-group">
              <label className="form-label">Customer Name</label>
              <input
                name="customer_name"
                className="form-input"
                placeholder="Company or Individual Name"
                value={formData.customer_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Preferred Date</label>
                <input
                  type="date"
                  name="preferred_date"
                  className="form-input"
                  value={toLocalDateString(formData.preferred_date)}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Job Location</label>
                <input
                  name="location"
                  className="form-input"
                  placeholder="Address or Site Location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </section>

          <section className="form-section">
            <h3>Site Contact</h3>
            <div className="form-group">
              <label className="form-label">Contact Name</label>
              <input
                name="site_contact_name"
                className="form-input"
                placeholder="Name of person on site"
                value={formData.site_contact_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input
                  type="email"
                  name="contact_email"
                  className="form-input"
                  placeholder="email@example.com"
                  value={formData.contact_email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input
                  type="tel"
                  name="contact_phone"
                  className="form-input"
                  placeholder="Phone number"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </section>

          <section className="form-section">
            <h3>Job Details</h3>
            <div className="form-group">
              <label className="form-label">Asset Requirement</label>
              <select
                name="asset_type_id"
                className="form-input"
                value={formData.asset_type_id}
                onChange={handleChange}
                required
              >
                <option value="">Select Asset Type...</option>
                {assetTypes.map((at: any) => (
                  <option key={at.id} value={at.id}>{at.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Job Brief</label>
              <textarea
                name="job_brief"
                className="form-input"
                placeholder="Provide a short description of the work required..."
                rows={3}
                value={formData.job_brief}
                onChange={handleChange}
                required
              />
            </div>
          </section>

          <div className="form-actions">
            <button type="submit" className="btn btn--primary btn--lg" disabled={loading}>
              {loading ? <Spinner /> : 'Submit Enquiry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
