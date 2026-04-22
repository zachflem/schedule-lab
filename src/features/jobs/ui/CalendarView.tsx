import { useMemo, useRef, useEffect, useState } from 'react';
import type { JobWithResources } from '../api/useJobs';
import { formatRecordId } from '@/shared/lib/format';

interface CalendarViewProps {
  jobs: JobWithResources[];
  resources: {
    assets: any[];
    personnel: any[];
  };
  onScheduleUpdate?: (jobId: string, start: string, end: string) => void;
  daysToShow?: number;
}

// Global UI Constants for synchronization
const SLOT_WIDTH = 48; // Space available for 30-minute block (reduced from 80)
const DATE_COL_WIDTH = 192; // Consistent with Tailwind 'w-48' (12rem)
const TOTAL_WIDTH = (48 * SLOT_WIDTH) + DATE_COL_WIDTH;

export function CalendarView({ jobs, resources, onScheduleUpdate, daysToShow = 10 }: CalendarViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [extraDays, setExtraDays] = useState(0);
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  const todayStr = useMemo(() => new Date().toDateString(), []);

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
    // Double-RAF so layout is complete before scrolling. Override scroll-behavior
    // to 'auto' so the jump is instant — smooth animation gets cancelled by
    // subsequent re-renders (e.g. jobs API response), leaving the view at midnight.
    let raf1: number, raf2: number;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        el.style.scrollBehavior = 'auto';
        el.scrollLeft = 12 * SLOT_WIDTH; // 6am at left edge
        requestAnimationFrame(() => { el.style.scrollBehavior = ''; });
      });
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, []);

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    };
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  const handleDrop = (e: React.DragEvent, date: Date, blockIndex: number) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('jobId');
    if (!jobId) return;

    const start = new Date(date);
    const hours = Math.floor(blockIndex / 2);
    const mins = (blockIndex % 2) * 30;
    start.setHours(hours, mins, 0, 0);
    
    // Find the job to see its assigned assets
    const job = jobs.find(j => j.id === jobId);
    
    // Minimum hire period logic:
    // Should match the HIGHEST minimum hire period of all assigned assets.
    // Default fallback to 240 mins (4 hours) if no min hire found.
    let durationMinutes = 240;

    if (job && job.resources) {
        const assetResources = job.resources.filter(r => r.resource_type === 'Asset');
        if (assetResources.length > 0) {
            let maxMinHire = 0;
            assetResources.forEach(res => {
                const asset = resources.assets.find(a => a.id === res.asset_id);
                if (asset && (asset.minimum_hire_period || 0) > maxMinHire) {
                    maxMinHire = asset.minimum_hire_period;
                }
            });
            
            // Only use if a valid min hire was found (otherwise keeps default 240)
            if (maxMinHire > 0) {
                durationMinutes = maxMinHire;
            }
        }
    }

    const end = new Date(start.getTime() + durationMinutes * 60000);
    
    if (onScheduleUpdate) {
      onScheduleUpdate(jobId, start.toISOString(), end.toISOString());
    }
  };

  return (
    <div className="calendar-view shadow-2xl rounded-2xl overflow-hidden border border-gray-100 bg-white">
      <div className="calendar-header-row flex">
        <div ref={scrollContainerRef} className="calendar-timeline-scroll flex-1 overflow-x-auto no-scrollbar">
          <div className="calendar-timeline-header flex border-b border-gray-100 relative" style={{ width: `${TOTAL_WIDTH}px` }}>
            <div 
              className="calendar-date-column sticky-left bg-gray-50/80 backdrop-blur-md border-r border-gray-200 z-30 shrink-0 flex items-center justify-center"
              style={{ width: `${DATE_COL_WIDTH}px` }}
            >
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Date</span>
            </div>
            {timeBlocks.map((time, i) => {
              const isHour = i % 2 === 0;
              return (
                <div
                  key={i}
                  className={`calendar-time-block shrink-0 text-center border-r last:border-0 flex items-end justify-center ${isHour ? 'border-gray-200 pb-1.5' : 'border-gray-100 pb-1'}`}
                  style={{ width: `${SLOT_WIDTH}px`, height: '100%' }}
                >
                  {isHour && (
                    <span className="text-[10px] font-bold text-gray-500">{time.split(':')[0]}</span>
                  )}
                </div>
              );
            })}
            {/* Midday indicator */}
            <div className="absolute top-0 bottom-0 w-px bg-primary-400/30 z-0" style={{ left: `${24 * SLOT_WIDTH + DATE_COL_WIDTH}px` }}></div>
            {/* Now indicator in header */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-red-400/60 z-10" style={{ left: `${(nowMinutes / 30) * SLOT_WIDTH + DATE_COL_WIDTH}px` }}></div>
          </div>
          
          <div className="calendar-body relative" style={{ width: `${TOTAL_WIDTH}px` }}>
            {days.map(day => {
              // Group and track overlapping jobs for this day
              const jobsForDay = jobs.filter(job => {
                if (!job.start_time) return false;
                const jobStart = new Date(job.start_time);
                return jobStart.toDateString() === day.toDateString();
              }).sort((a, b) => new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime());

              const tracks: JobWithResources[][] = [];
              jobsForDay.forEach(job => {
                let trackIndex = tracks.findIndex(track => {
                  const lastJob = track[track.length - 1];
                  // Allow 1 minute gap to prevent sub-pixel overlap issues
                  return new Date(job.start_time!).getTime() >= new Date(lastJob.end_time!).getTime() - 60000;
                });
                if (trackIndex === -1) {
                  tracks.push([job]);
                } else {
                  tracks[trackIndex].push(job);
                }
              });

              const totalTracks = Math.max(tracks.length, 1);
              const rowHeight = totalTracks > 1 ? `${totalTracks * 4 + 2}rem` : '7rem';

              const isToday = day.toDateString() === todayStr;
              return (
                <div key={day.toISOString()} className={`calendar-day-row flex border-b border-gray-50 last:border-0 transition-colors group ${isToday ? 'bg-primary-50/40 hover:bg-primary-50/60' : 'hover:bg-gray-50/30'}`} style={{ height: rowHeight }}>
                  <div
                    className={`calendar-date-label sticky-left border-r z-20 shrink-0 p-4 flex flex-col justify-center ${isToday ? 'bg-primary-50/70 group-hover:bg-primary-50/90 border-primary-100' : 'bg-white group-hover:bg-gray-50/50 border-gray-100'}`}
                    style={{ width: `${DATE_COL_WIDTH}px` }}
                  >
                      <div className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${isToday ? 'text-red-500' : 'text-primary-500'}`}>
                        {isToday ? 'Today' : day.toLocaleDateString('en-AU', { weekday: 'short' })}
                      </div>
                      <div className="text-xl font-black text-gray-900 leading-none flex items-baseline gap-1">
                          {day.getDate()}
                          <span className="text-[10px] text-gray-400 font-bold uppercase">{day.toLocaleDateString('en-AU', { month: 'short' })}</span>
                      </div>
                  </div>
                  
                  <div className="flex-1 flex relative">
                    {timeBlocks.map((_, i) => (
                      <div
                        key={i}
                        className={`calendar-slot relative transition-all shrink-0 ${i % 2 === 0 ? 'border-r border-gray-200/70' : 'border-r border-gray-100/80'} last:border-0`}
                        style={{ width: `${SLOT_WIDTH}px` }}
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

                    {/* Now indicator line */}
                    {isToday && (
                      <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-30 pointer-events-none" style={{ left: `${(nowMinutes / 30) * SLOT_WIDTH}px` }}>
                        <div className="absolute -top-0 -left-1 w-2.5 h-2.5 rounded-full bg-red-400 border-2 border-white shadow-sm"></div>
                      </div>
                    )}

                    {/* Jobs on this day rendered in tracks */}
                    <div className="absolute inset-0 pointer-events-none p-1">
                      {tracks.flatMap((track, trackIdx) => 
                        track.map((job, idx) => {
                          const start = new Date(job.start_time!);
                          const end = new Date(job.end_time!);
                          const startMinutes = start.getHours() * 60 + start.getMinutes();
                          const durationMinutes = (end.getTime() - start.getTime()) / 60000;
                          
                          // Scaling factor based on SLOT_WIDTH
                          const SCALE = SLOT_WIDTH / 30; // pixels per minute
                          const left = (startMinutes * SCALE);
                          const width = Math.max(durationMinutes * SCALE, 40);

                          const jobPeople = job.resources?.filter(r => r.resource_type === 'Personnel') || [];
                          const jobAssets = job.resources?.filter(r => r.resource_type === 'Asset') || [];

                          const getInitials = (name: string) => {
                            return name.split(' ').map(n => n[0]).join('').toUpperCase();
                          };

                          // Position based on track
                          const topOffset = trackIdx * 64 + 8; // Each track gets 64px height

                          return (
                            <div 
                              key={`${job.id}-${trackIdx}-${idx}`}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('jobId', job.id!);
                              }}
                              className="calendar-job-item group/job pointer-events-auto bg-white rounded-lg border border-gray-100 shadow-md flex transition-all absolute overflow-visible cursor-grab active:cursor-grabbing hover:z-50 hover:scale-[1.01] hover:shadow-xl"
                              style={{
                                left: `${left}px`,
                                width: `${width}px`,
                                top: `${topOffset}px`,
                                height: '56px',
                                zIndex: 10,
                                borderLeft: '4px solid var(--color-primary-600)'
                              }}
                            >
                              {/* Drag Handle from UnscheduledBucket */}
                              <div className="calendar-job-drag-handle w-5 bg-gray-50 border-r border-gray-100 flex items-center justify-center shrink-0 rounded-l-lg hover:bg-primary-50 group-hover/job:bg-gray-100 transition-colors">
                                  <div className="flex flex-col gap-1 opacity-40 group-hover/job:opacity-80">
                                      <div className="flex gap-0.5">
                                          <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
                                          <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
                                      </div>
                                      <div className="flex gap-0.5">
                                          <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
                                          <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
                                      </div>
                                      <div className="flex gap-0.5">
                                          <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
                                          <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
                                      </div>
                                  </div>
                              </div>

                              <div className="flex-1 p-1.5 flex flex-col justify-between overflow-hidden">
                                <div className="flex flex-col gap-0.5 pointer-events-none">
                                    <div className="text-[10px] font-black text-gray-900 leading-tight truncate uppercase tracking-tighter">
                                        {job.customer_name}
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-1">
                                        {jobAssets.map((a, aIdx) => (
                                            <span key={`a-${aIdx}`} className="job-pill job-pill--asset">
                                                {a.asset_number || a.asset_name.slice(0, 6)}
                                            </span>
                                        ))}
                                        {jobPeople.map((p, pIdx) => (
                                            <span key={`p-${pIdx}`} className="job-pill job-pill--person">
                                                {getInitials(p.personnel_name || 'S')}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                              </div>

                              {/* Hover Tooltip */}
                              <div className="job-card-tooltip absolute invisible group-hover/job:visible pointer-events-none transition-all z-[1000] opacity-0 translate-y-[-5px]">
                                <div className="tooltip-header">
                                  <div className="tooltip-customer">{job.customer_name}</div>
                                  <div className="tooltip-id">{formatRecordId(job.id, job.status_id)}</div>
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
                                         {jobPeople.length > 0 ? (
                                           <>
                                             {jobPeople.slice(0, 4).map((p, i) => (
                                               <div key={i} className="tooltip-resource-item">• {p.personnel_name}</div>
                                             ))}
                                             {jobPeople.length > 4 && <div className="tooltip-more">+{jobPeople.length - 4} more</div>}
                                           </>
                                         ) : <span className="tooltip-unassigned">Unassigned</span>}
                                       </div>
                                     </div>
                                     <div>
                                       <div className="tooltip-label">Assets Allocated</div>
                                       <div className="tooltip-resource-list">
                                         {jobAssets.length > 0 ? (
                                           <>
                                             {jobAssets.slice(0, 4).map((a, i) => (
                                               <div key={i} className="tooltip-resource-item">• {a.asset_name}</div>
                                             ))}
                                             {jobAssets.length > 4 && <div className="tooltip-more">+{jobAssets.length - 4} more</div>}
                                           </>
                                         ) : <span className="tooltip-unassigned">None</span>}
                                       </div>
                                     </div>
                                  </div>
                                </div>
                                <div className="tooltip-triangle"></div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
      `}</style>
    </div>
  );
}
