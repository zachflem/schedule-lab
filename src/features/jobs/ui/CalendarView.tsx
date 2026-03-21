import { useMemo, useRef, useEffect, useState } from 'react';
import type { JobWithResources } from '../api/useJobs';

interface CalendarViewProps {
  jobs: JobWithResources[];
  resources: {
    assets: any[];
    personnel: any[];
  };
  onScheduleUpdate: (jobId: string, start: string, end: string) => void;
  daysToShow?: number;
}

export function CalendarView({ jobs, resources, onScheduleUpdate, daysToShow = 10 }: CalendarViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [extraDays, setExtraDays] = useState(0);

  const totalDays = daysToShow + extraDays;

  const days = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [totalDays]);

  const timeBlocks = useMemo(() => {
    return Array.from({ length: 48 }, (_, i) => {
      const hours = Math.floor(i / 2);
      const mins = (i % 2) * 30;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    });
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current) {
        // Center on 12:00 PM
        // 48 blocks total. Midday is index 24.
        const blockWidth = 80;
        const middayOffset = 24 * blockWidth;
        const containerWidth = scrollContainerRef.current.clientWidth;
        scrollContainerRef.current.scrollLeft = middayOffset - (containerWidth / 2);
    }
  }, []);

  const handleDrop = (e: React.DragEvent, date: Date, blockIndex: number) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('jobId');
    if (!jobId) return;

    const start = new Date(date);
    const hours = Math.floor(blockIndex / 2);
    const mins = (blockIndex % 2) * 30;
    start.setHours(hours, mins, 0, 0);
    
    // Find the job to see if it has an asset with a minimum hire period
    const job = jobs.find(j => j.id === jobId);
    let durationMinutes = 240; // Default 4 hours if no min hire or job not found

    if (job && job.resources) {
        const assetResource = job.resources.find(r => r.resource_type === 'Asset');
        if (assetResource) {
            const asset = resources.assets.find(a => a.id === assetResource.asset_id);
            if (asset && asset.minimum_hire_period > 0) {
                durationMinutes = asset.minimum_hire_period;
            }
        }
    }

    const end = new Date(start.getTime() + durationMinutes * 60000);

    onScheduleUpdate(jobId, start.toISOString(), end.toISOString());
  };

  return (
    <div className="calendar-view shadow-2xl rounded-2xl overflow-hidden border border-gray-100 bg-white">
      <div className="calendar-header-row flex">
        <div className="calendar-date-column sticky-left bg-gray-50/80 backdrop-blur-md border-r border-gray-200 z-30 w-48 shrink-0 flex items-center justify-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">10-Day Forecast</span>
        </div>
        <div ref={scrollContainerRef} className="calendar-timeline-scroll flex-1 overflow-x-auto no-scrollbar scroll-smooth">
          <div className="calendar-timeline-header flex border-b border-gray-100 relative" style={{ width: '3840px' }}>
            {timeBlocks.map((time, i) => (
              <div 
                key={i} 
                className="calendar-time-block shrink-0 p-3 text-center border-r border-gray-50 last:border-0"
                style={{ width: '80px' }}
              >
                <span className="text-[10px] font-bold text-gray-400">{i % 2 === 0 ? time : ''}</span>
              </div>
            ))}
            {/* Midday indicator line */}
            <div className="absolute top-0 bottom-0 w-1 bg-primary-500/20 z-0" style={{ left: '1920px' }}></div>
          </div>
          
          <div className="calendar-body relative" style={{ width: '3840px' }}>
            {days.map(day => (
              <div key={day.toISOString()} className="calendar-day-row flex border-b border-gray-50 last:border-0 hover:bg-gray-50/30 transition-colors group">
                <div className="calendar-date-label sticky-left bg-white group-hover:bg-gray-50/50 border-r border-gray-100 z-20 w-48 shrink-0 p-4 flex flex-col justify-center">
                    <div className="text-[10px] font-bold text-primary-500 uppercase tracking-widest mb-0.5">{day.toLocaleDateString('en-AU', { weekday: 'short' })}</div>
                    <div className="text-xl font-black text-gray-900 leading-none flex items-baseline gap-1">
                        {day.getDate()}
                        <span className="text-[10px] text-gray-400 font-bold uppercase">{day.toLocaleDateString('en-AU', { month: 'short' })}</span>
                    </div>
                </div>
                
                <div className="flex-1 flex relative">
                  {timeBlocks.map((_, i) => (
                    <div 
                      key={i} 
                      className="calendar-slot border-r border-gray-50/50 last:border-0 relative transition-all shrink-0"
                      style={{ width: '80px' }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        (e.currentTarget as HTMLElement).classList.add('is-draggover');
                      }}
                      onDragLeave={(e) => {
                        (e.currentTarget as HTMLElement).classList.remove('is-draggover');
                      }}
                      onDrop={(e) => {
                        (e.currentTarget as HTMLElement).classList.remove('is-draggover');
                        handleDrop(e, day, i);
                      }}
                    />
                  ))}

                  {/* Jobs on this day */}
                  <div className="absolute inset-0 pointer-events-none p-1">
                    {jobs.filter(job => {
                      if (!job.start_time) return false;
                      const jobStart = new Date(job.start_time);
                      return jobStart.toDateString() === day.toDateString();
                    }).map((job, idx) => {
                      const start = new Date(job.start_time!);
                      const end = new Date(job.end_time!);
                      const startMinutes = start.getHours() * 60 + start.getMinutes();
                      const durationMinutes = (end.getTime() - start.getTime()) / 60000;
                      
                      // Each minute is 2.666px (since 30 mins = 80px)
                      const left = (startMinutes * (80 / 30));
                      const width = Math.max(durationMinutes * (80 / 30), 60);

                      const jobPeople = job.resources?.filter(r => r.resource_type === 'Personnel') || [];
                      const jobAssets = job.resources?.filter(r => r.resource_type === 'Asset') || [];

                      return (
                        <div 
                          key={`${job.id}-${idx}`}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('jobId', job.id!);
                          }}
                          className="calendar-job-item group/job pointer-events-auto bg-white rounded-lg border border-gray-100 shadow-md p-2 hover:scale-[1.01] hover:shadow-xl transition-all absolute flex flex-col justify-between overflow-visible cursor-grab active:cursor-grabbing"
                          style={{
                            left: `${left}px`,
                            width: `${width}px`,
                            top: '8px',
                            bottom: '8px',
                            zIndex: 10,
                            borderLeft: '4px solid var(--color-primary-600)'
                          }}
                        >
                          <div className="flex flex-col gap-0.5 pointer-events-none">
                              <div className="text-[10px] font-black text-gray-900 leading-tight truncate uppercase tracking-tighter">
                                  {job.customer_name}
                              </div>
                              <div className="text-[9px] font-bold text-gray-400 line-clamp-2">{job.job_brief}</div>
                          </div>

                          <div className="flex gap-0.5 mt-1 overflow-hidden pointer-events-none">
                              {jobPeople.slice(0, 3).map((p, pIdx) => (
                                  <span key={pIdx} className="text-[8px] px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded-sm font-bold truncate">
                                      {p.personnel_name?.split(' ')[0]}
                                  </span>
                              ))}
                          </div>

                          {/* Hover Tooltip - Copied from UnscheduledBucket */}
                          <div className="job-card-tooltip absolute invisible group-hover/job:visible pointer-events-none transition-all z-[1000] opacity-0 translate-y-[-5px]">
                            <div className="tooltip-header">
                              <div className="tooltip-customer">{job.customer_name}</div>
                              <div className="tooltip-id">{job.id?.slice(-6).toUpperCase()}</div>
                            </div>
                            
                            <div className="tooltip-body">
                              <div className="tooltip-status-row">
                                <div>
                                  <div className="tooltip-label">Scheduled Time</div>
                                  <div className="tooltip-value tooltip-value--primary">
                                      {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
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

                              <div className="tooltip-resources">
                                 <div>
                                   <div className="tooltip-label">Staff</div>
                                   <div className="tooltip-resource-list">
                                     {jobPeople.length > 0 ? (
                                       jobPeople.slice(0, 3).map((p, i) => (
                                         <div key={i} className="tooltip-resource-item">• {p.personnel_name}</div>
                                       ))
                                     ) : <span className="tooltip-unassigned">None</span>}
                                   </div>
                                 </div>
                                 <div>
                                   <div className="tooltip-label">Assets</div>
                                   <div className="tooltip-resource-list">
                                     {jobAssets.length > 0 ? (
                                       jobAssets.slice(0, 3).map((a, i) => (
                                         <div key={i} className="tooltip-resource-item">• {a.asset_name}</div>
                                       ))
                                     ) : <span className="tooltip-unassigned">None</span>}
                                   </div>
                                 </div>
                              </div>
                            </div>
                            <div className="tooltip-triangle"></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
          <button 
            onClick={() => setExtraDays(prev => prev + 7)}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-600 uppercase tracking-widest shadow-sm hover:shadow-md hover:border-primary-200 hover:text-primary-600 transition-all active:scale-95"
          >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              See another 7 days
          </button>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .is-draggover {
          background-color: var(--color-primary-50) !important;
          box-shadow: inset 0 0 0 2px var(--color-primary-500);
          z-index: 10;
        }
        .sticky-left {
            position: sticky;
            left: 0;
            z-index: 20;
        }
        .calendar-view {
            --calendar-row-height: 7rem;
        }
        .calendar-day-row {
            height: var(--calendar-row-height);
        }
        
        /* Tooltip Styles (Mirroring UnscheduledBucket) */
        .job-card-tooltip {
          z-index: 9999;
          background-color: #0f172a;
          color: white;
          padding: 12px;
          border-radius: 8px;
          width: 280px;
          bottom: calc(100% + 15px);
          left: 0;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
          border: 1px solid #334155;
          opacity: 0;
          transform: translateY(-5px);
          transition: all 0.2s ease;
        }
        
        .calendar-job-item:hover .job-card-tooltip {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
          transition-delay: 200ms;
        }

        .tooltip-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          border-bottom: 1px solid #1e293b;
          padding-bottom: 4px;
        }

        .tooltip-customer {
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          color: #60a5fa;
        }

        .tooltip-id {
          font-size: 9px;
          color: #64748b;
          background-color: #1e293b;
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
        }

        .tooltip-value {
          font-size: 11px;
          font-weight: 700;
        }

        .tooltip-value--primary {
          color: #93c5fd;
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
        }

        .tooltip-resource-item {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 2px;
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
      `}</style>
    </div>
  );
}
