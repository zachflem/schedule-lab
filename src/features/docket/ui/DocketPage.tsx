import { useSearchParams } from 'react-router';
import { Accordion, Spinner } from '@/shared/ui';
import { useDocket } from '../api/useDocket';
import { useAuth } from '@/shared/lib/auth';
import { JobDetails } from './sections/JobDetails';
import { SafetyChecklist } from './sections/SafetyChecklist';
import { StartMetrics } from './sections/StartMetrics';
import { JobNotes } from './sections/JobNotes';
import { FinishMetrics } from './sections/FinishMetrics';
import { LineItems } from './sections/LineItems';
import { SiteDocuments } from './sections/SiteDocuments';
import { DocketSummary } from './sections/DocketSummary';
import { SignatureCapture } from './sections/SignatureCapture';
import { DocketSubmitBar } from './DocketSubmitBar';
import { formatRecordId } from '@/shared/lib/format';

export function DocketPage() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId');
  const { state, update, saveDocket } = useDocket(jobId);
  const { user } = useAuth();
  
  const isDispatcher = user?.role === 'dispatcher' || user?.role === 'admin';
  const disabled = isDispatcher ? state.docketStatus === 'validated' : state.isLocked;

  if (state.loading) return <Spinner />;

  if (state.error && !state.job) {
    const isNotAssigned = state.error.includes('You are not assigned to this job');
    return (
      <div className="container" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
        <div className="card" style={{ padding: 'var(--space-8)', maxWidth: '500px', margin: '0 auto' }}>
          <div style={{ fontSize: 'var(--text-4xl)', marginBottom: 'var(--space-4)' }}>🚫</div>
          <h2 style={{ marginBottom: 'var(--space-2)' }}>Access Denied</h2>
          <p style={{ color: 'var(--color-gray-600)', marginBottom: 'var(--space-6)' }}>
            {isNotAssigned 
              ? "You are not assigned as a resource for this job. Please contact your dispatcher if you believe this is an error."
              : state.error}
          </p>
          <button 
            className="btn btn--primary" 
            onClick={() => window.history.back()}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const canSubmit = !!(
    state.time_leave_yard &&
    state.time_return_yard &&
    state.signatures.length > 0
  );

  const validationMessage = !state.time_leave_yard || !state.time_return_yard
    ? 'Leave yard and return yard times are required'
    : state.signatures.length === 0
      ? 'At least one signature is required'
      : undefined;

  return (
    <>
      <div className="container docket-page">
        <div className="docket-page__header">
          <div>
            <h1 className="docket-page__title">
              Site Docket {state.job && <span className="font-mono text-secondary ml-2">{formatRecordId(state.job.id, 'Site Docket')}</span>}
            </h1>
            {state.job && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginTop: 'var(--space-1)' }}>
                {state.job.customer_name} — {state.job.location || 'No location'}
              </p>
            )}
          </div>
          {state.docketStatus === 'validated' && <span className="badge badge--success">🔒 Validated</span>}
          {state.docketStatus === 'completed' && <span className="badge badge--primary">Completed</span>}
          {state.docketStatus === 'incomplete' && <span className="badge badge--danger">Needs Revision</span>}
          {state.docketStatus === 'draft' && <span className="badge badge--warning">Draft</span>}
        </div>

        {state.docketStatus === 'incomplete' && state.dispatcherNotes && (
          <div style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)', background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-300)', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-md)', color: 'var(--color-danger-800)' }}>
              Revision Required
            </h3>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-danger-900)' }}>
              <strong>Dispatcher Notes:</strong> {state.dispatcherNotes}
            </p>
          </div>
        )}

        {state.error && (
          <div style={{ padding: 'var(--space-3)', marginBottom: 'var(--space-3)', background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-400)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--color-danger-700)' }}>
            {state.error}
          </div>
        )}

        <div className="docket-page__sections">
          {/* Section 1: Job & Customer Details */}
          <Accordion number={1} title="Job & Customer Details" defaultOpen>
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
              disabled={disabled}
            />
          </Accordion>

          {/* Section 2: Safety Checklist */}
          <Accordion number={2} title="Safety Checklist & Hazards">
            <SafetyChecklist
              safetyCheck={state.safetyCheck}
              hazards={state.hazards}
              assetMetrics={state.assetMetrics}
              onSafetyCheckChange={v => update('safetyCheck', v)}
              onHazardsChange={v => update('hazards', v)}
              disabled={disabled}
            />
          </Accordion>

          {/* Section 3: Start Times & Metrics */}
          <Accordion number={3} title="Start Times & Metrics">
            <StartMetrics
              timeLeaveYard={state.time_leave_yard}
              timeArriveSite={state.time_arrive_site}
              assetMetrics={state.assetMetrics}
              onTimeLeaveYardChange={v => update('time_leave_yard', v)}
              onTimeArriveSiteChange={v => update('time_arrive_site', v)}
              onAssetMetricsChange={v => update('assetMetrics', v)}
              disabled={disabled}
            />
          </Accordion>

          {/* Section 4: Job Notes */}
          <Accordion number={4} title="Job Completion Notes">
            <JobNotes
              value={state.jobDescriptionActual}
              onChange={v => update('jobDescriptionActual', v)}
              disabled={disabled}
            />
          </Accordion>

          {/* Section 5: Finish Times & Metrics */}
          <Accordion number={5} title="Finish Times & Metrics">
            <FinishMetrics
              timeLeaveSite={state.time_leave_site}
              timeReturnYard={state.time_return_yard}
              breakMinutes={state.break_duration_minutes}
              assetMetrics={state.assetMetrics}
              onTimeLeaveSiteChange={v => update('time_leave_site', v)}
              onTimeReturnYardChange={v => update('time_return_yard', v)}
              onBreakMinutesChange={v => update('break_duration_minutes', v)}
              onAssetMetricsChange={v => update('assetMetrics', v)}
              disabled={disabled}
            />
          </Accordion>

          {/* Section 6: Billable Line Items */}
          <Accordion number={6} title="Billable Line Items"
            badge={
              state.lineItems.length > 0
                ? <span className="badge badge--active">{state.lineItems.length}</span>
                : undefined
            }
          >
            <LineItems
              items={state.lineItems}
              onChange={v => update('lineItems', v)}
              disabled={disabled}
            />
          </Accordion>

          {/* Section 7: Site Documents */}
          <Accordion number={7} title="Site Documents"
            badge={
              state.documentImages.length > 0
                ? <span className="badge badge--active">{state.documentImages.length}</span>
                : undefined
            }
          >
            <SiteDocuments
              images={state.documentImages}
              onChange={v => update('documentImages', v)}
              disabled={disabled}
            />
          </Accordion>

          {/* Section 8: Summary */}
          <Accordion number={8} title="Job Summary">
            <DocketSummary state={state} />
          </Accordion>

          {/* Section 9: Signatures */}
          <Accordion number={9} title="Customer Sign Off"
            badge={
              state.signatures.length > 0
                ? <span className="badge badge--locked">{state.signatures.length} signed</span>
                : undefined
            }
          >
            <SignatureCapture
              signatures={state.signatures}
              onChange={v => update('signatures', v)}
              disabled={disabled}
            />
          </Accordion>
        </div>
      </div>

      <DocketSubmitBar
        onSaveDraft={() => saveDocket(false)}
        onSubmit={() => saveDocket(true)}
        saving={state.saving}
        disabled={disabled}
        canSubmit={canSubmit}
        validationMessage={validationMessage}
      />
    </>
  );
}
