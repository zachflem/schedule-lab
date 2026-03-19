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
      <div className="flex gap-4 overflow-x-auto pb-4 px-1" style={{ scrollbarWidth: 'thin' }}>
        {unscheduledJobs.length === 0 ? (
          <div className="text-sm text-gray-400 italic py-4 bg-white w-full text-center rounded-lg border border-dashed">No unscheduled jobs</div>
        ) : (
          unscheduledJobs.map(job => (
            <div 
              key={job.id} 
              className="job-card bg-white rounded-xl shadow-md border border-gray-100 hover:border-primary-500 transition-all relative flex flex-col group overflow-hidden"
              style={{ minWidth: '260px', flexShrink: 0 }}
            >
              {/* Drag Handle Bar */}
              <div 
                className="w-8 bg-gray-50 border-r border-gray-100 flex items-center justify-center cursor-move hover:bg-primary-50 hover:text-primary-600 transition-colors absolute top-0 left-0 bottom-0"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('jobId', job.id!);
                }}
                title="Drag to schedule"
              >
                <div className="flex flex-col gap-1 text-gray-400">
                  <div className="w-1 h-1 bg-current rounded-full"></div>
                  <div className="w-1 h-1 bg-current rounded-full"></div>
                  <div className="w-1 h-1 bg-current rounded-full"></div>
                  <div className="w-1 h-1 bg-current rounded-full"></div>
                </div>
              </div>

              {/* Card Content */}
              <div className="pl-10 p-4 cursor-pointer" onClick={() => onSelectJob(job)}>
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[10px] font-bold text-primary-600 uppercase tracking-wider">{job.customer_name}</div>
                  <div className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{formatRecordId(job.id, job.status_id)}</div>
                </div>
                <div className="text-sm font-bold text-gray-800 mb-2 line-clamp-2 leading-tight h-9">{job.job_brief || 'Untitled Job'}</div>
                
                <div className="flex flex-col gap-2 mt-auto">
                    <div className="text-[11px] text-gray-500 flex items-center gap-1">
                        <span className="opacity-70">📦</span> 
                        <span className="truncate">{job.asset_requirement || 'General Assets'}</span>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{job.status_id}</span>
                        <button 
                            className="btn btn--primary btn--sm"
                            style={{ padding: '4px 12px', fontSize: '11px', borderRadius: '6px' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelectJob(job);
                            }}
                        >
                            Schedule
                        </button>
                    </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
