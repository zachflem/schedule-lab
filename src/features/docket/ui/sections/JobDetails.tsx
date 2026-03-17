import { toLocalDateString } from '@/shared/lib/date';

interface JobDetailsProps {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
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
  customerName, customerEmail, customerPhone,
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

      {(customerEmail || customerPhone) && (
        <div className="form-grid">
          {customerEmail && (
            <div className="form-group">
              <label className="form-label">Billing Email</label>
              <input className="form-input form-input--readonly" value={customerEmail} readOnly />
            </div>
          )}
          {customerPhone && (
            <div className="form-group">
              <label className="form-label">Billing Phone</label>
              <input className="form-input form-input--readonly" value={customerPhone} readOnly />
            </div>
          )}
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
