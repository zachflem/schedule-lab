import { useEffect } from 'react';
import { Link } from 'react-router';
import { useDashboard } from '../api/useDashboard';
import { useAuth } from '@/shared/lib/auth';
import { Spinner, ErrorMessage } from '@/shared/ui';
import { OperatorDashboard } from './OperatorDashboard';
import './DashboardPage.css';

// Status dot color lookup
const STATUS_COLORS: Record<string, string> = {
  'Job Booked':    '#3b82f6',
  'Job Scheduled': '#8b5cf6',
  'Allocated':     '#f59e0b',
  'Site Docket':   '#ec4899',
  'Completed':     '#22c55e',
  'Invoiced':      '#64748b',
  'Enquiry':       '#94a3b8',
  'Quote':         '#f97316',
  'Quote Sent':    '#f97316',
  'Quote Accepted':'#10b981',
  'Cancelled':     '#ef4444',
};

const PIPELINE_STAGES = [
  { key: 'Enquiry',       label: 'Enquiry' },
  { key: 'Quote',         label: 'Quote' },
  { key: 'Quote Sent',    label: 'Sent' },
  { key: 'Quote Accepted',label: 'Accepted' },
  { key: 'Job Booked',    label: 'Booked' },
  { key: 'Job Scheduled', label: 'Scheduled' },
  { key: 'Allocated',     label: 'Allocated' },
  { key: 'Site Docket',   label: 'Docket' },
];

function formatDate(iso: string | null): { day: string; month: string } {
  if (!iso) return { day: '—', month: '—' };
  const d = new Date(iso);
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleString('default', { month: 'short' }).toUpperCase(),
  };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function initials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function StatCard({
  label, value, sub, variant, icon,
}: {
  label: string;
  value: number | string;
  sub?: string;
  variant: 'primary' | 'success' | 'warning' | 'danger' | 'purple';
  icon: React.ReactNode;
}) {
  return (
    <div className={`stat-card stat-card--${variant}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, load } = useDashboard();

  useEffect(() => { load(); }, [load]);

  const greetingTime = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading && !data) return <Spinner />;

  if (data && user?.role === 'operator') {
    return (
      <div className="container dashboard-page">
        <OperatorDashboard data={data} userName={user?.name} onTaskSaved={load} />
      </div>
    );
  }

  // --- Admin/Dispatcher View ---
  const jobCounts = data?.jobStatusCounts ?? [];
  const enqCounts = data?.enquiryStatusCounts ?? [];

  const totalActive = jobCounts
    .filter(j => ['Job Booked', 'Job Scheduled', 'Allocated', 'Site Docket'].includes(j.status_id))
    .reduce((s, j) => s + Number(j.count), 0);

  const totalPipeline = jobCounts
    .filter(j => ['Enquiry', 'Quote', 'Quote Sent', 'Quote Accepted'].includes(j.status_id))
    .reduce((s, j) => s + Number(j.count), 0);

  const newEnqCount = enqCounts.find(e => e.status === 'New')?.count ?? 0;

  const todayJobs = (data?.upcomingJobs ?? []).filter(j => {
    if (!j.start_time) return false;
    const today = new Date().toISOString().slice(0, 10);
    return j.start_time.slice(0, 10) === today;
  }).length;

  const pipelineMax = Math.max(
    1,
    ...PIPELINE_STAGES.map(s => Number(jobCounts.find(j => j.status_id === s.key)?.count ?? 0))
  );

  if (loading && !data) return <Spinner />;

  return (
    <div className="container dashboard-page">

      {/* ── Greeting ─────────────────────────────────── */}
      <div className="dashboard-greeting">
        <h1>{greetingTime()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}. 👋</h1>
        <p>Here's what's happening in your operations today.</p>
      </div>

      {error && <ErrorMessage message={error} style={{ marginBottom: 'var(--space-6)' }} />}

      {/* ── Stat Cards ───────────────────────────────── */}
      <div className="stats-grid">
        <StatCard
          label="Active Jobs"
          value={totalActive}
          sub="Booked → On Site"
          variant="primary"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        />
        <StatCard
          label="In Pipeline"
          value={totalPipeline}
          sub="Enquiry → Quote Accepted"
          variant="purple"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />
        <StatCard
          label="New Enquiries"
          value={newEnqCount}
          sub="Awaiting action"
          variant="warning"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          }
        />
        <StatCard
          label="Today's Jobs"
          value={todayJobs}
          sub="Scheduled for today"
          variant="success"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
      </div>

      {/* ── Pipeline Overview ─────────────────────────── */}
      <div className="dashboard-panel dashboard-panel--full" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="panel-header">
          <div className="panel-title">
            <div className="panel-title-dot" style={{ background: '#8b5cf6' }} />
            Job Pipeline Overview
          </div>
          <Link to="/jobs" className="panel-action">View all jobs →</Link>
        </div>
        <div className="panel-body">
          <div className="pipeline-grid">
            {PIPELINE_STAGES.map(stage => {
              const count = Number(jobCounts.find(j => j.status_id === stage.key)?.count ?? 0);
              const pct = Math.round((count / pipelineMax) * 100);
              return (
                <div key={stage.key} className="pipeline-stage">
                  <div className={`pipeline-count ${count > 0 ? 'pipeline-count--highlight' : ''}`}>
                    {count}
                  </div>
                  <div className="pipeline-bar-wrap">
                    <div className="pipeline-bar" style={{ width: `${pct}%`, background: STATUS_COLORS[stage.key] }} />
                  </div>
                  <div className="pipeline-label">{stage.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Body Grid ────────────────────────────────── */}
      <div className="dashboard-body">

        {/* New Enquiries Panel */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <div className="panel-title">
              <div className="panel-title-dot" style={{ background: 'var(--color-warning-500)' }} />
              New Enquiries
              {newEnqCount > 0 && (
                <div className="action-badge">{newEnqCount}</div>
              )}
            </div>
            <Link to="/enquiries" className="panel-action">View all →</Link>
          </div>
          <div className="panel-body">
            {(data?.newEnquiries ?? []).length === 0 ? (
              <div className="panel-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <p>No new enquiries. You're all caught up!</p>
              </div>
            ) : (
              <div className="enquiry-cards">
                {(data?.newEnquiries ?? []).map(enq => (
                  <div key={enq.id} className="enquiry-card">
                    <div className="enquiry-avatar">{initials(enq.customer_name)}</div>
                    <div className="enquiry-info">
                      <div className="enquiry-customer">{enq.customer_name}</div>
                      <div className="enquiry-brief">
                        {enq.job_brief || enq.location || enq.contact_email}
                      </div>
                    </div>
                    <div className="enquiry-meta">
                      <div className="enquiry-time">{timeAgo(enq.created_at)}</div>
                      <Link
                        to="/enquiries"
                        className="btn btn--sm btn--primary"
                        style={{ fontSize: '10px', padding: '2px 8px', textDecoration: 'none' }}
                      >
                        Review
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Jobs Panel */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <div className="panel-title">
              <div className="panel-title-dot" style={{ background: 'var(--color-success-500)' }} />
              Upcoming (Next 7 Days)
            </div>
            <Link to="/schedule" className="panel-action">View schedule →</Link>
          </div>
          <div className="panel-body">
            {(data?.upcomingJobs ?? []).length === 0 ? (
              <div className="panel-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <p>No jobs scheduled this week.</p>
              </div>
            ) : (
              <div className="upcoming-list">
                {(data?.upcomingJobs ?? []).map(job => {
                  const { day, month } = formatDate(job.start_time);
                  return (
                    <div key={job.id} className="upcoming-item">
                      <div className="upcoming-date-block">
                        <div className="upcoming-day">{day}</div>
                        <div className="upcoming-month">{month}</div>
                      </div>
                      <div className="upcoming-info">
                        <div className="upcoming-customer">{job.customer_name}</div>
                        <div className="upcoming-detail">
                          {job.location || job.job_brief || '—'}
                        </div>
                      </div>
                      <div
                        className="status-dot"
                        style={{ background: STATUS_COLORS[job.status_id] ?? '#94a3b8' }}
                        title={job.status_id}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Open Tasks Panel */}
        <div className="dashboard-panel dashboard-panel--full">
          <div className="panel-header">
            <div className="panel-title">
              <div className="panel-title-dot" style={{ background: '#10b981' }} />
              Open Tasks
              {(data?.openTasks ?? []).length > 0 && (
                <div className="action-badge">{(data?.openTasks ?? []).length}</div>
              )}
            </div>
            <Link to="/tasks" className="panel-action">View all →</Link>
          </div>
          <div className="panel-body">
            {(data?.openTasks ?? []).length === 0 ? (
              <div className="panel-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                <p>No open tasks. All caught up!</p>
              </div>
            ) : (
              <div className="enquiry-cards">
                {(data?.openTasks ?? []).map(task => (
                  <div key={task.id} className="enquiry-card">
                    <div className="enquiry-avatar" style={{ background: '#d1fae5', color: '#065f46', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                    </div>
                    <div className="enquiry-info">
                      <div className="enquiry-customer">{task.title}</div>
                      <div className="enquiry-brief">
                        {task.assignees && task.assignees.length > 0
                          ? task.assignees.map(a => a.name).join(', ')
                          : task.description || 'Unassigned'}
                      </div>
                    </div>
                    <div className="enquiry-meta">
                      <div className="enquiry-time">{timeAgo(task.created_at)}</div>
                      <Link
                        to="/tasks"
                        className="btn btn--sm btn--secondary"
                        style={{ fontSize: '10px', padding: '2px 8px', textDecoration: 'none' }}
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Fleet Maintenance Panel */}
        {data?.maintenanceStats && (
          <div className="dashboard-panel dashboard-panel--full">
            <div className="panel-header">
              <div className="panel-title">
                <div className="panel-title-dot" style={{ background: '#f97316' }} />
                Fleet Maintenance
              </div>
              <Link to="/assets" className="panel-action">View fleet →</Link>
            </div>
            <div className="panel-body">
              <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '120px', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-gray-900)' }}>{data.maintenanceStats.tasksThisMonth}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', marginTop: '2px' }}>Tasks this month</div>
                </div>
                <div style={{ flex: 1, minWidth: '120px', background: data.maintenanceStats.breakdownsThisMonth > 0 ? 'var(--color-danger-50)' : 'var(--color-gray-50)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: data.maintenanceStats.breakdownsThisMonth > 0 ? 'var(--color-danger-700)' : 'var(--color-gray-900)' }}>{data.maintenanceStats.breakdownsThisMonth}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: data.maintenanceStats.breakdownsThisMonth > 0 ? 'var(--color-danger-600)' : 'var(--color-gray-500)', marginTop: '2px' }}>Breakdowns this month</div>
                </div>
                <div style={{ flex: 1, minWidth: '120px', background: data.maintenanceStats.assetsNeedingService.length > 0 ? 'var(--color-warning-50)' : 'var(--color-gray-50)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: data.maintenanceStats.assetsNeedingService.length > 0 ? 'var(--color-warning-700)' : 'var(--color-gray-900)' }}>{data.maintenanceStats.assetsNeedingService.length}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: data.maintenanceStats.assetsNeedingService.length > 0 ? 'var(--color-warning-600)' : 'var(--color-gray-500)', marginTop: '2px' }}>Assets need service</div>
                </div>
              </div>
              {data.maintenanceStats.assetsNeedingService.length > 0 && (
                <div className="enquiry-cards">
                  {data.maintenanceStats.assetsNeedingService.map(asset => {
                    const isOverdue = asset.remaining <= 0;
                    const unit = asset.service_interval_type === 'hours' ? 'hrs' : 'km';
                    return (
                      <div key={asset.id} className="enquiry-card">
                        <div
                          className="enquiry-avatar"
                          style={{
                            background: isOverdue ? 'var(--color-danger-50)' : 'var(--color-warning-50)',
                            color: isOverdue ? 'var(--color-danger-700)' : 'var(--color-warning-700)',
                            fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                        </div>
                        <div className="enquiry-info">
                          <div className="enquiry-customer">{asset.name}</div>
                          <div className="enquiry-brief">
                            {isOverdue
                              ? `${Math.abs(asset.remaining)} ${unit} overdue`
                              : `${asset.remaining} ${unit} until service`}
                          </div>
                        </div>
                        <div className="enquiry-meta">
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: '999px',
                            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                            background: isOverdue ? 'var(--color-danger-50)' : 'var(--color-warning-50)',
                            color: isOverdue ? 'var(--color-danger-700)' : 'var(--color-warning-700)',
                            border: `1px solid ${isOverdue ? 'var(--color-danger-200)' : 'var(--color-warning-200)'}`,
                          }}>
                            {isOverdue ? 'Overdue' : 'Due Soon'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {data.maintenanceStats.assetsNeedingService.length === 0 && (
                <div className="panel-empty">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <p>All assets are within service intervals.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Jobs Panel */}
        <div className="dashboard-panel dashboard-panel--full">
          <div className="panel-header">
            <div className="panel-title">
              <div className="panel-title-dot" />
              Active Jobs
            </div>
            <Link to="/jobs" className="panel-action">View all →</Link>
          </div>
          <div className="panel-body">
            {(data?.activeJobs ?? []).length === 0 ? (
              <div className="panel-empty">
                <p>No active jobs right now.</p>
              </div>
            ) : (
              <div className="enquiry-cards">
                {(data?.activeJobs ?? []).map(job => (
                  <div key={job.id} className="enquiry-card">
                    <div
                      className="enquiry-avatar"
                      style={{
                        background: `${STATUS_COLORS[job.status_id] ?? '#94a3b8'}22`,
                        color: STATUS_COLORS[job.status_id] ?? '#94a3b8',
                      }}
                    >
                      {initials(job.customer_name)}
                    </div>
                    <div className="enquiry-info">
                      <div className="enquiry-customer">{job.customer_name}</div>
                      <div className="enquiry-brief">
                        {job.location || job.job_brief || '—'}
                      </div>
                    </div>
                    <div className="enquiry-meta">
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '10px',
                          fontWeight: 700,
                          background: `${STATUS_COLORS[job.status_id] ?? '#94a3b8'}18`,
                          color: STATUS_COLORS[job.status_id] ?? '#94a3b8',
                          border: `1px solid ${STATUS_COLORS[job.status_id] ?? '#94a3b8'}44`,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {job.status_id}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
