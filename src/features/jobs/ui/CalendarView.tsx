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
        // Each block is 60px wide (specified in CSS below)
        const blockWidth = 60;
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
          <div className="calendar-timeline-header flex border-b border-gray-100 relative" style={{ width: '2880px' }}>
            {timeBlocks.map((time, i) => (
              <div key={i} className="calendar-time-block w-[60px] shrink-0 p-3 text-center border-r border-gray-50 last:border-0">
                <span className="text-[10px] font-bold text-gray-400">{i % 2 === 0 ? time : ''}</span>
              </div>
            ))}
            {/* Midday indicator line */}
            <div className="absolute top-0 bottom-0 w-1 bg-primary-500/20 z-0" style={{ left: '1440px' }}></div>
          </div>
          
          <div className="calendar-body relative" style={{ width: '2880px' }}>
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
                      className="calendar-slot w-[60px] h-20 border-r border-gray-50/50 last:border-0 relative transition-all"
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
                      
                      // Each minute is 2px (since 30 mins = 60px)
                      const left = (startMinutes * 2);
                      const width = Math.max(durationMinutes * 2, 40); // Min width for visibility

                      const jobPeople = job.resources?.filter(r => r.resource_type === 'Personnel') || [];

                      return (
                        <div 
                          key={`${job.id}-${idx}`}
                          className="pointer-events-auto bg-white rounded-lg border border-gray-100 shadow-md p-2 hover:scale-[1.02] hover:shadow-xl transition-all absolute flex flex-col justify-between overflow-hidden cursor-pointer"
                          style={{
                            left: `${left}px`,
                            width: `${width}px`,
                            top: '4px',
                            bottom: '4px',
                            zIndex: 10,
                            borderLeft: '3px solid var(--color-primary-600)'
                          }}
                        >
                          <div className="flex flex-col gap-0.5">
                              <div className="text-[9px] font-black text-gray-900 leading-tight truncate uppercase tracking-tighter">
                                  {job.customer_name}
                              </div>
                              <div className="text-[8px] font-bold text-gray-400 line-clamp-1">{job.job_brief}</div>
                          </div>

                          <div className="flex gap-0.5 mt-1 overflow-hidden">
                              {jobPeople.slice(0, 2).map((p, pIdx) => (
                                  <span key={pIdx} className="text-[7px] px-1 py-0.5 bg-primary-50 text-primary-700 rounded-sm font-bold truncate">
                                      {p.personnel_name?.split(' ')[0]}
                                  </span>
                              ))}
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
            --calendar-row-height: 5rem;
        }
      `}</style>
    </div>
  );
}
