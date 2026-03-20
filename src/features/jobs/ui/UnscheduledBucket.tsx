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
                          <div key={i} className="w-5 h-5 rounded-full bg-primary-100 border border-white flex items-center justify-center text-[8px] font-bold text-primary-700" title={p.personnel_name || 'Staff'}>
                             {(p.personnel_name || 'S').split(' ').map((n: string) => n[0] || '').join('').toUpperCase()}
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
                <div className="job-card-tooltip absolute invisible group-hover:visible pointer-events-none transition-all">
                  <div className="tooltip-header">
                    <div className="tooltip-customer">{job.customer_name}</div>
                    <div className="tooltip-id">{formatRecordId(job.id, job.status_id)}</div>
                  </div>
                  
                  <div className="tooltip-body">
                    <div className="tooltip-status-row">
                      <div>
                        <div className="tooltip-label">Current Status</div>
                        <div className="tooltip-value tooltip-value--primary">{job.status_id}</div>
                      </div>
                      <div className="tooltip-badge">
                        {job.job_type || 'General'}
                      </div>
                    </div>
                    
                    {job.job_brief && (
                      <div>
                        <div className="tooltip-label">Job Brief</div>
                        <div className="tooltip-brief">{job.job_brief}</div>
                      </div>
                    )}

                    {job.location && (
                      <div>
                        <div className="tooltip-label">Location</div>
                        <div className="tooltip-location">{job.location}</div>
                      </div>
                    )}

                    {job.asset_requirement && (
                      <div className="tooltip-asset-req">
                        <div className="tooltip-label tooltip-label--amber">Asset Requirement</div>
                        <div className="tooltip-asset-text">"{job.asset_requirement}"</div>
                      </div>
                    )}

                    <div className="tooltip-resources">
                       <div>
                         <div className="tooltip-label">Staff Assigned</div>
                         <div className="tooltip-resource-list">
                           {personnel.length > 0 ? (
                             <>
                               {personnel.slice(0, 4).map((p, i) => (
                                 <div key={i} className="tooltip-resource-item">• {p.personnel_name}</div>
                               ))}
                               {personnel.length > 4 && <div className="tooltip-more">+{personnel.length - 4} more</div>}
                             </>
                           ) : <span className="tooltip-unassigned">Unassigned</span>}
                         </div>
                       </div>
                       <div>
                         <div className="tooltip-label">Assets Allocated</div>
                         <div className="tooltip-resource-list">
                           {assets.length > 0 ? (
                             <>
                               {assets.slice(0, 4).map((a, i) => (
                                 <div key={i} className="tooltip-resource-item">• {a.asset_name}</div>
                               ))}
                               {assets.length > 4 && <div className="tooltip-more">+{assets.length - 4} more</div>}
                             </>
                           ) : <span className="tooltip-unassigned">None</span>}
                         </div>
                       </div>
                    </div>
                  </div>
                  
                  {/* Tooltip Triangle */}
                  <div className="tooltip-triangle"></div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .job-card-tooltip {
          z-index: 9999;
          background-color: #0f172a; /* Solid gray-900 */
          color: white;
          padding: 12px;
          border-radius: 8px;
          width: 256px;
          bottom: 100%;
          left: 0;
          margin-bottom: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
          border: 1px solid #334155; /* gray-700 */
          opacity: 0;
          transform: translateY(-5px);
        }
        
        .group:hover .job-card-tooltip {
          opacity: 1;
          transform: translateY(0);
          transition-delay: 200ms;
        }

        .tooltip-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
          border-bottom: 1px solid #1e293b; /* gray-800 */
          padding-bottom: 4px;
        }

        .tooltip-customer {
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #60a5fa; /* blue-400 equivalent */
        }

        .tooltip-id {
          font-size: 9px;
          font-family: monospace;
          color: #64748b; /* gray-500 */
          background-color: #1e293b; /* gray-800 */
          padding: 0 4px;
          border-radius: 2px;
        }

        .tooltip-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .tooltip-status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: rgba(30, 41, 59, 0.5);
          padding: 6px;
          border-radius: 6px;
        }

        .tooltip-label {
          font-size: 8px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        .tooltip-label--amber {
          color: rgba(245, 158, 11, 0.7);
        }

        .tooltip-value {
          font-size: 11px;
          font-weight: 700;
        }

        .tooltip-value--primary {
          color: #93c5fd; /* blue-300 */
        }

        .tooltip-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          background-color: rgba(51, 65, 85, 0.5);
          color: #cbd5e1;
          border-radius: 9999px;
          border: 1px solid #475569;
        }

        .tooltip-brief {
          font-size: 11px;
          color: #e2e8f0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .tooltip-location {
          font-size: 11px;
          color: #e2e8f0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tooltip-asset-req {
          background-color: rgba(245, 158, 11, 0.1);
          border-left: 2px solid #f59e0b;
          padding: 6px;
          border-radius: 0 4px 4px 0;
        }

        .tooltip-asset-text {
          font-size: 11px;
          color: #fef3c7;
          font-style: italic;
        }

        .tooltip-resources {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          padding-top: 8px;
          border-top: 1px solid #1e293b;
        }

        .tooltip-resource-list {
          font-size: 10px;
          color: #cbd5e1;
          font-weight: 500;
        }

        .tooltip-resource-item {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 2px;
        }

        .tooltip-more {
          font-size: 9px;
          font-style: italic;
          color: #64748b;
        }

        .tooltip-unassigned {
          color: #475569;
          font-style: italic;
        }

        .tooltip-triangle {
          position: absolute;
          bottom: -4px;
          left: 24px;
          width: 8px;
          height: 8px;
          background-color: #0f172a;
          border-right: 1px solid #334155;
          border-bottom: 1px solid #334155;
          transform: rotate(45deg);
        }

        .unscheduled-bucket {
          padding-top: 20px;
        }

        .job-card-condensed:hover {
          z-index: 10000;
        }
      `}</style>
    </div>
  );
}
