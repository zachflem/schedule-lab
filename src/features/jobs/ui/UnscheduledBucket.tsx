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
          unscheduledJobs.map(job => {
            const personnel = job.resources?.filter(r => r.resource_type === 'Personnel') || [];
            const assets = job.resources?.filter(r => r.resource_type === 'Asset') || [];

            return (
              <div 
                key={job.id} 
                className="job-card-condensed bg-white rounded-xl shadow-md border border-gray-100 hover:border-primary-500 transition-all relative flex group overflow-visible"
                style={{ minWidth: '220px', flexShrink: 0, height: '70px' }}
              >
                {/* Drag Handle Bar */}
                <div 
                  className="w-6 bg-gray-50 border-r border-gray-100 flex items-center justify-center cursor-move hover:bg-primary-50 hover:text-primary-600 transition-colors rounded-l-xl"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('jobId', job.id!);
                  }}
                  title="Drag to schedule"
                >
                  <div className="flex flex-col gap-1 text-gray-300">
                    <div className="w-1 h-1 bg-current rounded-full"></div>
                    <div className="w-1 h-1 bg-current rounded-full"></div>
                    <div className="w-1 h-1 bg-current rounded-full"></div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="flex-1 p-2 flex flex-col justify-between cursor-pointer overflow-hidden" onClick={() => onSelectJob(job)}>
                  <div className="text-[11px] font-black text-gray-900 truncate uppercase tracking-tight">
                    {job.customer_name}
                  </div>
                  
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="flex -space-x-1 overflow-hidden shrink-0">
                      {personnel.length > 0 ? (
                        personnel.slice(0, 3).map((p, i) => (
                          <div key={i} className="w-5 h-5 rounded-full bg-primary-100 border border-white flex items-center justify-center text-[8px] font-bold text-primary-700" title={p.personnel_name}>
                             {p.personnel_name?.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                        ))
                      ) : (
                        <div className="text-[9px] text-gray-400 italic">No Staff</div>
                      )}
                      {personnel.length > 3 && <div className="w-5 h-5 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[8px] font-bold text-gray-500">+{personnel.length - 3}</div>}
                    </div>
                    <div className="h-3 w-px bg-gray-100"></div>
                    <div className="text-[10px] text-gray-500 truncate font-medium">
                      {assets.length > 0 ? `${assets.length} Assets` : 'No Assets'}
                    </div>
                  </div>
                </div>

                {/* Fixed Schedule Button */}
                <div className="pr-2 flex items-center">
                  <button 
                    className="btn btn--primary btn--sm"
                    style={{ padding: '4px 8px', fontSize: '10px', borderRadius: '4px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectJob(job);
                    }}
                  >
                    Schedule
                  </button>
                </div>

                {/* Hover Tooltip */}
                <div className="job-card-tooltip invisible group-hover:visible absolute z-[100] bg-gray-900/95 backdrop-blur-sm text-white p-3 rounded-lg shadow-2xl w-64 bottom-full left-0 mb-3 pointer-events-none transition-all">
                  <div className="flex justify-between items-start mb-2 border-b border-gray-700 pb-1">
                    <div className="text-[10px] font-bold text-primary-400 font-black uppercase tracking-widest">{job.customer_name}</div>
                    <div className="text-[9px] font-mono text-gray-500 bg-gray-800 px-1 rounded">{formatRecordId(job.id, job.status_id)}</div>
                  </div>
                  
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center bg-gray-800/50 p-1.5 rounded-md">
                      <div>
                        <div className="text-[8px] text-gray-500 uppercase font-black tracking-tighter">Current Status</div>
                        <div className="text-[11px] font-bold text-primary-300">{job.status_id}</div>
                      </div>
                      <div className="text-[10px] font-bold px-2 py-0.5 bg-gray-700/50 text-gray-300 rounded-full border border-gray-600">
                        {job.job_type || 'General'}
                      </div>
                    </div>
                    
                    {job.job_brief && (
                      <div>
                        <div className="text-[8px] text-gray-500 uppercase font-black tracking-tighter">Job Brief</div>
                        <div className="text-[11px] line-clamp-3 text-gray-200 leading-snug">{job.job_brief}</div>
                      </div>
                    )}

                    {job.location && (
                      <div>
                        <div className="text-[8px] text-gray-500 uppercase font-black tracking-tighter">Location</div>
                        <div className="text-[11px] text-gray-200 truncate">{job.location}</div>
                      </div>
                    )}

                    {job.asset_requirement && (
                      <div className="bg-amber-500/10 border-l-2 border-amber-500 p-1.5 rounded-r">
                        <div className="text-[8px] text-amber-500/70 uppercase font-black tracking-tighter">Asset Requirement</div>
                        <div className="text-[11px] text-amber-100 italic">"{job.asset_requirement}"</div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-700">
                       <div>
                         <div className="text-[8px] text-gray-500 uppercase font-black tracking-tighter">Staff Assigned</div>
                         <div className="text-[10px] text-gray-300 font-medium">
                           {personnel.length > 0 ? (
                             <div className="flex flex-col gap-0.5">
                               {personnel.slice(0, 4).map((p, i) => (
                                 <div key={i} className="truncate">• {p.personnel_name}</div>
                               ))}
                               {personnel.length > 4 && <div className="text-[9px] italic text-gray-500">+ {personnel.length - 4} more</div>}
                             </div>
                           ) : <span className="text-gray-600 italic">Unassigned</span>}
                         </div>
                       </div>
                       <div>
                         <div className="text-[8px] text-gray-500 uppercase font-black tracking-tighter">Assets Allocated</div>
                         <div className="text-[10px] text-gray-300 font-medium">
                           {assets.length > 0 ? (
                             <div className="flex flex-col gap-0.5">
                               {assets.slice(0, 4).map((a, i) => (
                                 <div key={i} className="truncate">• {a.asset_name}</div>
                               ))}
                               {assets.length > 4 && <div className="text-[9px] italic text-gray-500">+ {assets.length - 4} more</div>}
                             </div>
                           ) : <span className="text-gray-600 italic">None</span>}
                         </div>
                       </div>
                    </div>
                  </div>
                  
                  {/* Tooltip Triangle */}
                  <div className="absolute -bottom-1 left-6 w-2 h-2 bg-gray-900/95 rotate-45"></div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .job-card-tooltip {
          opacity: 0;
          transform: translateY(-5px);
        }
        .group:hover .job-card-tooltip {
          opacity: 1;
          transform: translateY(0);
          transition-delay: 200ms;
        }
        .unscheduled-bucket {
          padding-top: 10px; /* Space for tooltips */
        }
      `}</style>
    </div>
  );
}
