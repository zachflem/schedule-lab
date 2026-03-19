import { useMemo } from 'react';
import type { JobWithResources } from '../api/useJobs';
import { formatRecordId } from '@/shared/lib/format';

interface GanttChartProps {
  jobs: JobWithResources[];
  resources: { assets: any[], personnel: any[] };
  onScheduleUpdate: (jobId: string, start: string, end: string) => void;
}

export function GanttChart({ jobs, resources, onScheduleUpdate }: GanttChartProps) {
  const scheduledJobs = jobs.filter(j => j.start_time && j.end_time);
  
  // Flatten resources into a single list for rows
  const rows = useMemo(() => {
    const r = [
      ...resources.assets.map(a => ({ id: a.id, name: a.name, type: 'Asset' })),
      ...resources.personnel.map(p => ({ id: p.id, name: p.name, type: 'Personnel' }))
    ];
    // Add an "Unassigned" row at the top just in case
    return [{ id: 'unassigned', name: 'Unassigned / General', type: 'System' }, ...r];
  }, [resources]);

  // Simple 7-day view starting from today
  const days = useMemo(() => {
    const d = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        d.push(date);
    }
    return d;
  }, []);

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('jobId');
    if (!jobId) return;

    // Default 8-hour job starting at 7 AM
    const start = new Date(date);
    start.setHours(7, 0, 0, 0);
    const end = new Date(start);
    end.setHours(15, 0, 0, 0);

    // TODO: If resourceId is provided and not 'unassigned', update job resources too
    onScheduleUpdate(jobId, start.toISOString(), end.toISOString());
  };

  return (
    <div className="gantt-container bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col mb-10">
      {/* Header Row */}
      <div className="gantt-header flex border-b border-gray-200 bg-gray-50/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="w-64 p-4 border-r border-gray-200 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">Resources</span>
        </div>
        <div className="flex-1 flex" style={{ minWidth: '700px' }}>
          {days.map(day => (
            <div key={day.toISOString()} className="flex-1 min-w-[100px] py-3 text-center border-r border-gray-100 last:border-0">
              <div className="text-[10px] font-bold text-primary-500 uppercase">{day.toLocaleDateString('en-AU', { weekday: 'short' })}</div>
              <div className="text-xl font-black text-gray-800">{day.getDate()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Body Rows */}
      <div className="gantt-body overflow-y-auto" style={{ maxHeight: '700px' }}>
        {rows.map(row => (
          <div key={row.id} className="gantt-row flex border-b border-gray-100 last:border-0 min-h-[100px] hover:bg-gray-50/30 transition-colors">
            {/* Resource Column */}
            <div className="w-64 p-4 border-r border-gray-200 flex flex-col justify-center shrink-0 bg-gray-50/20">
              <div className="text-sm font-bold text-gray-900 leading-tight">{row.name}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${row.type === 'Asset' ? 'bg-amber-400' : row.type === 'Personnel' ? 'bg-green-400' : 'bg-gray-400'}`}></span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{row.type}</span>
              </div>
            </div>

            {/* Daily Grid Cells */}
            <div className="flex-1 flex relative" style={{ minWidth: '700px' }}>
              {days.map(day => (
                <div 
                  key={day.toISOString()} 
                  className="flex-1 min-w-[100px] border-r border-gray-50 last:border-0 relative h-full transition-all drop-zone-cell"
                  onDragOver={(e) => {
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).classList.add('is-draggover');
                  }}
                  onDragLeave={(e) => {
                    (e.currentTarget as HTMLElement).classList.remove('is-draggover');
                  }}
                  onDrop={(e) => {
                    (e.currentTarget as HTMLElement).classList.remove('is-draggover');
                    handleDrop(e, day);
                  }}
                />
              ))}

              {/* Jobs Layer (Absolute within the flex-1 container) */}
              <div className="absolute inset-0 pointer-events-none p-2 flex flex-col gap-1">
                {scheduledJobs.filter(job => {
                  if (row.id === 'unassigned') return !job.resources || job.resources.length === 0;
                  return job.resources?.some(r => r.asset_id === row.id || r.personnel_id === row.id);
                }).map((job, idx) => {
                  const start = new Date(job.start_time!);
                  const dayIndex = days.findIndex(d => d.toDateString() === start.toDateString());
                  if (dayIndex === -1) return null;

                  return (
                    <div 
                      key={`${row.id}-${job.id}-${idx}`}
                      className="pointer-events-auto bg-white rounded-lg border-l-[6px] border-primary-600 shadow-md p-2 hover:shadow-lg transition-all absolute group/job"
                      style={{
                        left: `calc(${(dayIndex / 7) * 100}% + 8px)`,
                        width: `calc(${(1/7) * 100}% - 16px)`,
                        top: '8px',
                        zIndex: 10,
                        minHeight: '60px'
                      }}
                    >
                      <div className="flex justify-between items-start mb-1 overflow-hidden">
                        <div className="text-[10px] font-black text-gray-900 truncate uppercase">{job.customer_name}</div>
                        <div className="text-[8px] font-mono text-gray-400 bg-gray-50 px-1 rounded">{formatRecordId(job.id, job.status_id)}</div>
                      </div>
                      <div className="text-[10px] text-gray-600 leading-tight mb-1 line-clamp-1">{job.job_brief}</div>
                      <div className="flex justify-between items-center mt-1">
                        <div className="text-[9px] font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-full">
                          {new Date(job.start_time!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .is-draggover {
          background-color: var(--color-primary-50) !important;
          box-shadow: inset 0 0 0 2px var(--color-primary-500);
          z-index: 10;
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

