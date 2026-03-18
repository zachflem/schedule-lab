import type { JobWithResources } from '../api/useJobs';

interface UnscheduledBucketProps {
  jobs: JobWithResources[];
  onSelectJob: (job: JobWithResources) => void;
}

export function UnscheduledBucket({ jobs, onSelectJob }: UnscheduledBucketProps) {
  const unscheduledJobs = jobs.filter(j => !j.start_time);

  return (
    <div className="unscheduled-bucket p-4 bg-gray-100 rounded-lg mb-6 shadow-inner">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">
        Unscheduled Jobs ({unscheduledJobs.length})
      </h3>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {unscheduledJobs.length === 0 ? (
          <div className="text-xs text-gray-400 italic py-2">No unscheduled jobs</div>
        ) : (
          unscheduledJobs.map(job => (
            <div 
              key={job.id} 
              className="job-card bg-white p-3 rounded shadow-sm border border-gray-200 cursor-pointer hover:border-primary-500 transition-colors"
              style={{ minWidth: '200px', flexShrink: 0 }}
              onClick={() => onSelectJob(job)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('jobId', job.id!);
              }}
            >
              <div className="text-xs font-bold text-primary-600 mb-1">{job.customer_name}</div>
              <div className="text-sm font-semibold truncate">{job.job_brief || 'Untitled Job'}</div>
              <div className="text-xs text-gray-500 mt-2 flex justify-between">
                <span>{job.asset_requirement}</span>
                <span className="badge badge--info text-[10px]">{job.status_id}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
