import { NavLink } from 'react-router';
import { useAuth } from '@/shared/lib/auth';
import type { JobWithResources } from '../api/useJobs';
import { formatRecordId } from '@/shared/lib/format';

interface JobTableProps {
  jobs: JobWithResources[];
  loading?: boolean;
  onEdit?: (job: JobWithResources) => void;
}

export function JobTable({ jobs, loading, onEdit }: JobTableProps) {
  const { user } = useAuth();
  const isAdminOrDispatcher = user?.role === 'admin' || user?.role === 'dispatcher';

  const getStatusBadge = (status: any) => {
    const statusStr = String(status);
    const classes: Record<string, string> = {
      'Job Booked': 'badge--active',
      'Job Scheduled': 'badge--info',
      'In Progress': 'badge--warning',
      'Halt': 'badge--danger',
      'Completed': 'badge--success',
    };
    return <span className={`badge ${classes[statusStr] || ''}`}>{statusStr}</span>;
  };

  if (loading && !jobs.length) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
        <p>Loading jobs...</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="list-table-view data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Customer / Project</th>
              <th>Location</th>
              <th>Resources</th>
              <th>Schedule</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>No jobs found.</td>
              </tr>
            ) : (
              jobs.map(job => {
                const personnel = job.resources?.filter(r => r.resource_type === 'Personnel') || [];
                const assets = job.resources?.filter(r => r.resource_type === 'Asset') || [];
                return (
                  <tr key={job.id}>
                    <td className="font-mono text-xs">{formatRecordId(job.id, job.status_id)}</td>
                    <td>
                      <div className="font-semibold">{job.customer_name}</div>
                      <div className="text-xs text-secondary">{job.project_name || 'No project'}</div>
                    </td>
                    <td className="text-sm">{job.location || '—'}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {assets.map((a, i) => (
                          <span key={`a-${i}`} className="job-pill job-pill--asset">{a.asset_number || a.asset_name.slice(0, 6)}</span>
                        ))}
                        {personnel.map((p, i) => (
                          <span key={`p-${i}`} className="job-pill job-pill--person">
                            {(p.personnel_name || 'S').split(' ').map((n: string) => n[0] || '').join('').toUpperCase()}
                          </span>
                        ))}
                        {assets.length === 0 && personnel.length === 0 && (
                          <span className="text-[10px] text-gray-400 italic">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {job.start_time ? (
                        <div className="text-xs">
                          <div className="font-semibold">{new Date(job.start_time).toLocaleDateString()}</div>
                          <div className="text-secondary">
                            {new Date(job.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {job.end_time ? new Date(job.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-secondary italic">Unscheduled</span>
                      )}
                    </td>
                    <td>{getStatusBadge(job.status_id)}</td>
                    <td>
                      <div className="flex gap-2">
                        <NavLink to={`/docket?jobId=${job.id}`} className="btn btn--secondary btn--sm">Docket</NavLink>
                        {isAdminOrDispatcher && (
                          <button className="btn btn--secondary btn--sm" onClick={() => onEdit?.(job)}>Edit</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="list-card-view">
        {jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-gray-500)' }}>No jobs found.</div>
        ) : jobs.map(job => {
          const personnel = job.resources?.filter(r => r.resource_type === 'Personnel') || [];
          const assets = job.resources?.filter(r => r.resource_type === 'Asset') || [];
          return (
            <div key={job.id} className="card" style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-gray-900)' }}>{job.customer_name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>{job.project_name || 'No project'}</div>
                </div>
                {getStatusBadge(job.status_id)}
              </div>

              {job.location && (
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {job.location}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
                  {job.start_time ? new Date(job.start_time).toLocaleDateString() + ' · ' + new Date(job.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unscheduled'}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {assets.map((a, i) => <span key={`a-${i}`} className="job-pill job-pill--asset">{a.asset_number || a.asset_name.slice(0, 6)}</span>)}
                  {personnel.map((p, i) => <span key={`p-${i}`} className="job-pill job-pill--person">{(p.personnel_name || 'S').split(' ').map((n: string) => n[0] || '').join('').toUpperCase()}</span>)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <NavLink to={`/docket?jobId=${job.id}`} className="btn btn--primary btn--sm">Docket</NavLink>
                {isAdminOrDispatcher && (
                  <button className="btn btn--secondary btn--sm" onClick={() => onEdit?.(job)}>Edit</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
