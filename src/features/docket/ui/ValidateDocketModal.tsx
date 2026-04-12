import { useState } from 'react';
import { useDocket } from '../api/useDocket';
import { api } from '@/shared/lib/api';
import { Spinner } from '@/shared/ui';
import { JobDetails } from './sections/JobDetails';
import { SafetyChecklist } from './sections/SafetyChecklist';
import { StartMetrics } from './sections/StartMetrics';
import { JobNotes } from './sections/JobNotes';
import { FinishMetrics } from './sections/FinishMetrics';
import { LineItems } from './sections/LineItems';
import { SiteDocuments } from './sections/SiteDocuments';
import { DocketSummary } from './sections/DocketSummary';
import { SignatureCapture } from './sections/SignatureCapture';
import { formatRecordId } from '@/shared/lib/format';

interface ValidateDocketModalProps {
  docketId: string;
  jobId: string;
  onClose: () => void;
  onValidated: () => void;
  onSentBack: () => void;
}

const SECTIONS = [
  { key: 'job_details',     label: 'Job & Customer Details' },
  { key: 'safety',          label: 'Safety Checklist & Hazards' },
  { key: 'start_metrics',   label: 'Start Times & Metrics' },
  { key: 'job_notes',       label: 'Job Completion Notes' },
  { key: 'finish_metrics',  label: 'Finish Times & Metrics' },
  { key: 'line_items',      label: 'Billable Line Items' },
  { key: 'site_documents',  label: 'Site Documents' },
  { key: 'summary',         label: 'Job Summary' },
  { key: 'signatures',      label: 'Customer Sign Off' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

type CheckState = Record<SectionKey, boolean>;

const allUnchecked = (): CheckState =>
  Object.fromEntries(SECTIONS.map(s => [s.key, false])) as CheckState;

type Phase = 'review' | 'confirm_sendback';

export function ValidateDocketModal({
  docketId,
  jobId,
  onClose,
  onValidated,
  onSentBack,
}: ValidateDocketModalProps) {
  const { state, update, saveDocket } = useDocket(jobId);
  const [checks, setChecks] = useState<CheckState>(allUnchecked());
  const [phase, setPhase] = useState<Phase>('review');
  const [sendBackNotes, setSendBackNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const allChecked = SECTIONS.every(s => checks[s.key]);
  const uncheckedSections = SECTIONS.filter(s => !checks[s.key]);

  const toggle = (key: SectionKey) =>
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSaveChanges = async () => {
    setSaving(true);
    setError(null);
    try {
      // Save with lock=true to keep status as 'completed'
      await saveDocket(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleValidateClick = async () => {
    if (!allChecked) {
      setPhase('confirm_sendback');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/dockets/${docketId}/validate`, {});
      onValidated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate docket');
      setSubmitting(false);
    }
  };

  const handleSendBack = async () => {
    if (!sendBackNotes.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/dockets/${docketId}/reject`, { notes: sendBackNotes });
      onSentBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send back docket');
      setSubmitting(false);
    }
  };

  if (state.loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner />
        </div>
      </div>
    );
  }

  const docketTitle = state.job
    ? `${state.job.customer_name} — ${state.job.location || 'No location'}`
    : 'Docket';

  const subtotal = state.lineItems.reduce((s, li) => s + li.quantity * li.unit_rate, 0);

  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '0', paddingBottom: '0' }}>
      <div
        className="modal-content modal-slide-in"
        style={{
          width: '100%',
          maxWidth: '800px',
          maxHeight: '100vh',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
          margin: '0 auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0 }}>
              Validate Docket
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
              {docketTitle}
              {state.existingDocketId && (
                <span style={{ marginLeft: 'var(--space-2)', fontFamily: 'monospace', color: 'var(--color-gray-400)' }}>
                  {formatRecordId(state.existingDocketId, 'Site Docket')}
                </span>
              )}
            </p>
          </div>
          <button type="button" className="btn-close" onClick={onClose}>&times;</button>
        </div>

        {/* Instruction banner */}
        <div style={{
          flexShrink: 0,
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--color-primary-50)',
          borderBottom: '1px solid var(--color-primary-100)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-primary-800)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Check each section once reviewed. All sections must be checked to validate.
          {allChecked && (
            <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--color-success-700)' }}>
              All sections reviewed
            </span>
          )}
          {!allChecked && (
            <span style={{ marginLeft: 'auto', color: 'var(--color-gray-500)' }}>
              {SECTIONS.filter(s => checks[s.key]).length}/{SECTIONS.length} reviewed
            </span>
          )}
        </div>

        {/* Scrollable body */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
          {error && (
            <div style={{ padding: 'var(--space-3)', marginBottom: 'var(--space-4)', background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-300)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-700)', fontSize: 'var(--text-sm)' }}>
              {error}
            </div>
          )}

          {phase === 'confirm_sendback' ? (
            <SendBackPrompt
              uncheckedSections={uncheckedSections.map(s => s.label)}
              notes={sendBackNotes}
              onNotesChange={setSendBackNotes}
              onBack={() => setPhase('review')}
              onConfirm={handleSendBack}
              submitting={submitting}
            />
          ) : (
            <div className="docket-page__sections">
              <CheckableSection
                sectionKey="job_details"
                label="Job & Customer Details"
                number={1}
                checked={checks.job_details}
                onToggle={() => toggle('job_details')}
              >
                <JobDetails
                  customerName={state.job?.customer_name || ''}
                  customerContacts={state.job?.customer_contacts}
                  siteContactName={state.job?.site_contact_name}
                  siteContactEmail={state.job?.site_contact_email}
                  siteContactPhone={state.job?.site_contact_phone}
                  location={state.job?.location}
                  jobBrief={state.job?.job_brief}
                  assetRequirement={state.job?.asset_requirement}
                  projectName={state.job?.project_name}
                  date={state.date}
                  onDateChange={v => update('date', v)}
                  disabled={false}
                />
              </CheckableSection>

              <CheckableSection
                sectionKey="safety"
                label="Safety Checklist & Hazards"
                number={2}
                checked={checks.safety}
                onToggle={() => toggle('safety')}
              >
                <SafetyChecklist
                  safetyCheck={state.safetyCheck}
                  hazards={state.hazards}
                  assetMetrics={state.assetMetrics}
                  onSafetyCheckChange={v => update('safetyCheck', v)}
                  onHazardsChange={v => update('hazards', v)}
                  disabled={false}
                />
              </CheckableSection>

              <CheckableSection
                sectionKey="start_metrics"
                label="Start Times & Metrics"
                number={3}
                checked={checks.start_metrics}
                onToggle={() => toggle('start_metrics')}
              >
                <StartMetrics
                  timeLeaveYard={state.time_leave_yard}
                  timeArriveSite={state.time_arrive_site}
                  assetMetrics={state.assetMetrics}
                  onTimeLeaveYardChange={v => update('time_leave_yard', v)}
                  onTimeArriveSiteChange={v => update('time_arrive_site', v)}
                  onAssetMetricsChange={v => update('assetMetrics', v)}
                  disabled={false}
                />
              </CheckableSection>

              <CheckableSection
                sectionKey="job_notes"
                label="Job Completion Notes"
                number={4}
                checked={checks.job_notes}
                onToggle={() => toggle('job_notes')}
              >
                <JobNotes
                  value={state.jobDescriptionActual}
                  onChange={v => update('jobDescriptionActual', v)}
                  disabled={false}
                />
              </CheckableSection>

              <CheckableSection
                sectionKey="finish_metrics"
                label="Finish Times & Metrics"
                number={5}
                checked={checks.finish_metrics}
                onToggle={() => toggle('finish_metrics')}
              >
                <FinishMetrics
                  timeLeaveSite={state.time_leave_site}
                  timeReturnYard={state.time_return_yard}
                  breakMinutes={state.break_duration_minutes}
                  assetMetrics={state.assetMetrics}
                  onTimeLeaveSiteChange={v => update('time_leave_site', v)}
                  onTimeReturnYardChange={v => update('time_return_yard', v)}
                  onBreakMinutesChange={v => update('break_duration_minutes', v)}
                  onAssetMetricsChange={v => update('assetMetrics', v)}
                  disabled={false}
                />
              </CheckableSection>

              <CheckableSection
                sectionKey="line_items"
                label="Billable Line Items"
                number={6}
                checked={checks.line_items}
                onToggle={() => toggle('line_items')}
                badge={state.lineItems.length > 0 ? `$${subtotal.toFixed(2)}` : undefined}
              >
                <LineItems
                  items={state.lineItems}
                  onChange={v => update('lineItems', v)}
                  disabled={false}
                />
              </CheckableSection>

              <CheckableSection
                sectionKey="site_documents"
                label="Site Documents"
                number={7}
                checked={checks.site_documents}
                onToggle={() => toggle('site_documents')}
                badge={state.documentImages.length > 0 ? `${state.documentImages.length} docs` : undefined}
              >
                <SiteDocuments
                  images={state.documentImages}
                  onChange={v => update('documentImages', v)}
                  disabled={false}
                />
              </CheckableSection>

              <CheckableSection
                sectionKey="summary"
                label="Job Summary"
                number={8}
                checked={checks.summary}
                onToggle={() => toggle('summary')}
              >
                <DocketSummary state={state} />
              </CheckableSection>

              <CheckableSection
                sectionKey="signatures"
                label="Customer Sign Off"
                number={9}
                checked={checks.signatures}
                onToggle={() => toggle('signatures')}
                badge={state.signatures.length > 0 ? `${state.signatures.length} signed` : undefined}
              >
                <SignatureCapture
                  signatures={state.signatures}
                  onChange={v => update('signatures', v)}
                  disabled={false}
                />
              </CheckableSection>
            </div>
          )}
        </div>

        {/* Footer action bar */}
        {phase === 'review' && (
          <div className="modal-footer" style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={onClose}
                disabled={submitting || saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleSaveChanges}
                disabled={saving || submitting}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              {!allChecked && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>
                  {uncheckedSections.length} section{uncheckedSections.length !== 1 ? 's' : ''} unchecked
                </span>
              )}
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => setPhase('confirm_sendback')}
                disabled={submitting || saving}
              >
                Send Back
              </button>
              <button
                type="button"
                className={`btn ${allChecked ? 'btn--success' : 'btn--primary'}`}
                onClick={handleValidateClick}
                disabled={submitting || saving}
                title={!allChecked ? 'All sections must be checked to validate' : undefined}
              >
                {submitting ? 'Validating...' : allChecked ? 'Validate Docket' : 'Validate (incomplete)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CheckableSection ──────────────────────────────────────────────────────────

interface CheckableSectionProps {
  sectionKey: SectionKey;
  label: string;
  number: number;
  checked: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}

function CheckableSection({ label, number, checked, onToggle, badge, children }: CheckableSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        border: `1px solid ${checked ? 'var(--color-success-300)' : 'var(--color-gray-200)'}`,
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-3)',
        background: checked ? 'var(--color-success-50)' : 'white',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Section header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: 'var(--space-3) var(--space-4)',
          gap: 'var(--space-3)',
          cursor: 'pointer',
        }}
        onClick={() => setOpen(o => !o)}
      >
        {/* Section number */}
        <span style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: checked ? 'var(--color-success-500)' : 'var(--color-gray-200)',
          color: checked ? 'white' : 'var(--color-gray-600)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 700,
          flexShrink: 0,
          transition: 'all 0.15s ease',
        }}>
          {checked ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : number}
        </span>

        {/* Label */}
        <span style={{ flex: 1, fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-gray-900)' }}>
          {label}
        </span>

        {/* Badge (subtotal, doc count, etc.) */}
        {badge && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', fontWeight: 600, marginRight: 'var(--space-2)' }}>
            {badge}
          </span>
        )}

        {/* Checkbox */}
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            style={{ width: '18px', height: '18px', accentColor: 'var(--color-success-600)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 'var(--text-xs)', color: checked ? 'var(--color-success-700)' : 'var(--color-gray-400)', fontWeight: 600 }}>
            {checked ? 'Reviewed' : 'Mark reviewed'}
          </span>
        </label>

        {/* Expand chevron */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--color-gray-400)' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Section content */}
      {open && (
        <div style={{
          padding: 'var(--space-4)',
          borderTop: '1px solid var(--color-gray-200)',
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── SendBackPrompt ────────────────────────────────────────────────────────────

interface SendBackPromptProps {
  uncheckedSections: string[];
  notes: string;
  onNotesChange: (v: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  submitting: boolean;
}

function SendBackPrompt({ uncheckedSections, notes, onNotesChange, onBack, onConfirm, submitting }: SendBackPromptProps) {
  return (
    <div style={{ padding: 'var(--space-2)' }}>
      <div style={{
        padding: 'var(--space-4)',
        background: 'var(--color-danger-50)',
        border: '1px solid var(--color-danger-200)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-4)',
      }}>
        <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-base)', color: 'var(--color-danger-800)' }}>
          Send docket back to operator?
        </h3>
        {uncheckedSections.length > 0 && (
          <>
            <p style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-danger-700)' }}>
              The following sections were not reviewed:
            </p>
            <ul style={{ margin: '0 0 var(--space-2)', paddingLeft: 'var(--space-5)', fontSize: 'var(--text-sm)', color: 'var(--color-danger-700)' }}>
              {uncheckedSections.map(s => <li key={s}>{s}</li>)}
            </ul>
          </>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">
          Revision Notes <span style={{ color: 'var(--color-danger-600)' }}>*</span>
        </label>
        <textarea
          className="form-input"
          rows={5}
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
          placeholder="Explain what the operator needs to fix or add..."
          disabled={submitting}
          autoFocus
        />
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
        <button type="button" className="btn btn--secondary" onClick={onBack} disabled={submitting}>
          Back to Review
        </button>
        <button
          type="button"
          className="btn btn--danger"
          onClick={onConfirm}
          disabled={submitting || !notes.trim()}
        >
          {submitting ? 'Sending...' : 'Send Back to Operator'}
        </button>
      </div>
    </div>
  );
}
