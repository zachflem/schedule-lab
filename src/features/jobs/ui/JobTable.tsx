import { NavLink } from 'react-router';
import type { JobWithResources } from '../api/useJobs';
import { formatRecordId } from '@/shared/lib/format';

interface JobTableProps {
  jobs: JobWithResources[];
  loading?: boolean;
  onEdit?: (job: JobWithResources) => void;
}

export function JobTable({ jobs, loading, onEdit }: JobTableProps) {
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
            <th>Resources</th>
            <th>Schedule</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                No jobs found.
              </td>
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
                        <span key={`a-${i}`} className="job-pill job-pill--asset">
                          {a.asset_number || a.asset_name.slice(0, 6)}
                        </span>
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
                      <NavLink to={`/docket?jobId=${job.id}`} className="btn btn--secondary btn--sm">
                        Docket
                      </NavLink>
                      <button 
                        className="btn btn--secondary btn--sm" 
                        onClick={() => onEdit?.(job)}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
