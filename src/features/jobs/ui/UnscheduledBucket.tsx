import type { JobWithResources } from '../api/useJobs';
import { formatRecordId } from '@/shared/lib/format';

interface UnscheduledBucketProps {
  jobs: JobWithResources[];
  onSelectJob: (job: JobWithResources) => void;
}

export function UnscheduledBucket({ jobs, onSelectJob }: UnscheduledBucketProps) {
  const unscheduledJobs = jobs.filter(j => !j.start_time);

  return (
    <div className="unscheduled-bucket p-4 bg-gray-100 rounded-lg mb-6 shadow-inner">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500 flex justify-between items-center">
        <span>Unscheduled Jobs ({unscheduledJobs.length})</span>
        <span className="text-[10px] font-normal lowercase italic text-gray-400">Tip: Drag handle (⋮⋮) to timeline to schedule</span>
      </h3>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {unscheduledJobs.length === 0 ? (
          <div className="text-xs text-gray-400 italic py-2">No unscheduled jobs</div>
        ) : (
          unscheduledJobs.map(job => (
            <div 
              key={job.id} 
              className="job-card bg-white p-3 rounded shadow-sm border border-gray-200 hover:border-primary-500 transition-colors relative group"
              style={{ minWidth: '220px', flexShrink: 0 }}
            >
              <div 
                className="absolute top-2 left-1 cursor-move p-1 text-gray-300 hover:text-primary-500 group-hover:text-gray-400"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('jobId', job.id!);
                  // Add a visual preview if possible, but standard drag is fine
                }}
                title="Drag to schedule"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="w-3 h-0.5 bg-current rounded-full"></span>
                  <span className="w-3 h-0.5 bg-current rounded-full"></span>
                  <span className="w-3 h-0.5 bg-current rounded-full"></span>
                </div>
              </div>

              <div className="pl-5 cursor-pointer" onClick={() => onSelectJob(job)}>
                <div className="flex justify-between items-start mb-1">
                  <div className="text-xs font-bold text-primary-600 truncate">{job.customer_name}</div>
                  <div className="text-[10px] font-mono text-gray-400">{formatRecordId(job.id, job.status_id)}</div>
                </div>
                <div className="text-sm font-semibold truncate">{job.job_brief || 'Untitled Job'}</div>
                <div className="text-xs text-gray-500 mt-2 flex justify-between items-center">
                  <span className="truncate mr-2">{job.asset_requirement || 'No assets specified'}</span>
                  <button 
                    className="btn btn--xs btn--primary py-0.5 px-2 text-[10px]"
                    onClick={(e) => {
                       e.stopPropagation();
                       onSelectJob(job); // For now, open modal to schedule. I will add schedule fields to modal.
                    }}
                  >
                    Schedule
                  </button>
                </div>
              </div>
            </div>

          ))
        )}
      </div>
    </div>
  );
}
