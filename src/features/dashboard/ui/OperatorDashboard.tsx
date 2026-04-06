import { Link } from 'react-router';
import type { DashboardData } from '../api/useDashboard';
import './OperatorDashboard.css';

interface OperatorDashboardProps {
  data: DashboardData;
  userName?: string;
}

function formatDateDisplay(iso: string | null): string {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  
  if (isToday) return 'TODAY';
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTimeDisplay(iso: string | null): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function OperatorDashboard({ data, userName }: OperatorDashboardProps) {
  const { assignedJobs = [], operatorDockets = [] } = data;

  const urgentDockets = operatorDockets.filter(d => 
    d.docket_status === 'incomplete' || d.docket_status === 'uncompleted'
  );

  const draftDockets = operatorDockets.filter(d => 
    d.docket_status === 'draft'
  );

  const greetingTime = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="operator-dashboard">
      
      {/* ── Greeting ─────────────────────────────────── */}
      <div className="dashboard-greeting">
        <h1>{greetingTime()}{userName ? `, ${userName.split(' ')[0]}` : ''}. 👋</h1>
        <p>Here's what requires your attention today.</p>
      </div>

      {/* ── Urgent Alerts ─────────────────────────────── */}
      {urgentDockets.length > 0 && (
        <section className="urgent-alerts">
          <div className="jobs-section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Urgent: Dockets Requiring Completion
          </div>
          {urgentDockets.map(docket => (
            <Link 
              key={docket.id} 
              to={`/docket?job_id=${docket.job_id}`}
              className={`alert-card ${docket.docket_status === 'uncompleted' ? 'alert-card--warning' : ''}`}
            >
              <div className="alert-icon">
                {docket.docket_status === 'incomplete' ? (
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                )}
              </div>
              <div className="alert-content">
                <div className="alert-title">
                  {docket.docket_status === 'incomplete' ? 'Revision Required' : 'Docket Not Started'}
                  {" — "}{docket.customer_name}
                </div>
                <div className="alert-desc">
                  {docket.docket_status === 'incomplete' 
                    ? (docket.dispatcher_notes || 'Please review and resubmit this docket.')
                    : `Job at ${docket.location || 'site'} requires a completed docket.`
                  }
                </div>
              </div>
              <div className="alert-action">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* ── My Schedule ───────────────────────────────── */}
      <section className="jobs-section">
        <div className="jobs-section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          My Schedule
        </div>
        
        {assignedJobs.length === 0 ? (
          <div className="panel-empty" style={{ background: 'white', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-gray-100)' }}>
            <p>No jobs assigned to you at the moment.</p>
          </div>
        ) : (
          <div className="operator-jobs-grid">
            {assignedJobs.map(job => (
              <Link key={job.id} to={`/docket?job_id=${job.id}`} className="operator-job-card">
                <div className="job-card-header">
                  <div className="job-card-time">
                    <span className="time-label">{formatDateDisplay(job.start_time)}</span>
                    <span className="time-value">
                      {formatTimeDisplay(job.start_time)}
                    </span>
                  </div>
                  <div className="job-card-status">
                    {job.status_id}
                  </div>
                </div>
                
                <div className="job-card-body">
                  <h3>{job.customer_name}</h3>
                  <div className="job-card-location">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    {job.location || 'Location TBD'}
                  </div>
                </div>

                <div className="job-card-footer">
                  <span className="btn-start-job">
                    Open Docket →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Draft Dockets ─────────────────────────────── */}
      {draftDockets.length > 0 && (
        <section className="drafts-section">
          <div className="jobs-section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            In-Progress Drafts
          </div>
          <div className="drafts-list">
            {draftDockets.map(draft => (
              <Link key={draft.id} to={`/docket?job_id=${draft.job_id}`} className="draft-item">
                <div className="draft-info">
                  <span className="draft-customer">{draft.customer_name}</span>
                  <span className="draft-date">{new Date(draft.date).toLocaleDateString()}</span>
                </div>
                <div className="draft-badge">
                  DRAFT
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
