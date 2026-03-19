import { NavLink } from 'react-router';
import type { JobWithResources } from '../api/useJobs';
import { formatRecordId } from '@/shared/lib/format';

interface JobTableProps {
  jobs: JobWithResources[];
  loading?: boolean;
}

export function JobTable({ jobs, loading }: JobTableProps) {
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
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Job ID</th>
            <th>Customer / Project</th>
            <th>Location</th>
            <th>Schedule</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                No jobs found.
              </td>
            </tr>
          ) : (
            jobs.map(job => (
              <tr key={job.id}>
                <td className="font-mono text-xs">{formatRecordId(job.id, job.status_id)}</td>
                <td>
                  <div className="font-semibold">{job.customer_name}</div>
                  <div className="text-xs text-secondary">{job.project_name || 'No project'}</div>
                </td>
                <td className="text-sm">{job.location || '—'}</td>
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
                    <NavLink to={`/docket?jobId=${job.id}`} className="btn btn--secondary btn--sm">
                      Docket
                    </NavLink>
                    <button className="btn btn--secondary btn--sm" onClick={() => console.log('Edit job', job.id)}>
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
