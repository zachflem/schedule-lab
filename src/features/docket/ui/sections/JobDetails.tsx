import { toLocalDateString } from '@/shared/lib/date';

interface CustomerContact {
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  role?: string;
}

interface JobDetailsProps {
  customerName: string;
  customerContacts?: CustomerContact[];
  siteContactName?: string;
  siteContactEmail?: string;
  siteContactPhone?: string;
  location?: string;
  jobBrief?: string;
  assetRequirement?: string;
  projectName?: string;
  date: string;
  onDateChange: (date: string) => void;
  disabled: boolean;
}

export function JobDetails({
  customerName, customerContacts,
  siteContactName, siteContactEmail, siteContactPhone,
  location, jobBrief, assetRequirement, projectName,
  date, onDateChange, disabled,
}: JobDetailsProps) {
  return (
    <div className="flex-col gap-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Customer</label>
          <input className="form-input form-input--readonly" value={customerName} readOnly />
        </div>
        <div className="form-group">
          <label className="form-label">Date</label>
          <input
            type="date"
            className="form-input"
            value={toLocalDateString(date)}
            onChange={e => onDateChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Site Contact</label>
          <input className="form-input form-input--readonly" value={siteContactName || '—'} readOnly />
        </div>
        <div className="form-group">
          <label className="form-label">Site Email</label>
          <input className="form-input form-input--readonly" value={siteContactEmail || '—'} readOnly />
        </div>
        <div className="form-group">
          <label className="form-label">Site Phone</label>
          <input className="form-input form-input--readonly" value={siteContactPhone || '—'} readOnly />
        </div>
      </div>

      {customerContacts && customerContacts.length > 0 && (
        <div>
          <label className="form-label" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>Customer Contacts</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {customerContacts.map((contact, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-2)', padding: 'var(--space-3)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', marginBottom: '2px' }}>{contact.role || 'Contact'}</div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{contact.name}</div>
                </div>
                {contact.phone && (
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', marginBottom: '2px' }}>Phone</div>
                    <div style={{ fontSize: 'var(--text-sm)' }}>{contact.phone}</div>
                  </div>
                )}
                {contact.email && (
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', marginBottom: '2px' }}>Email</div>
                    <div style={{ fontSize: 'var(--text-sm)' }}>{contact.email}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Location</label>
        <input className="form-input form-input--readonly" value={location || '—'} readOnly />
      </div>

      {projectName && (
        <div className="form-group">
          <label className="form-label">Project</label>
          <input className="form-input form-input--readonly" value={projectName} readOnly />
        </div>
      )}

      {jobBrief && (
        <div className="form-group">
          <label className="form-label">Job Brief</label>
          <textarea className="form-input form-input--readonly" value={jobBrief} readOnly rows={2} />
        </div>
      )}

      {assetRequirement && (
        <div className="form-group">
          <label className="form-label">Asset Requirement</label>
          <input className="form-input form-input--readonly" value={assetRequirement} readOnly />
        </div>
      )}
    </div>
  );
}
