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
    <div className="gantt-container bg-white rounded-lg shadow border border-gray-200 overflow-hidden flex flex-col">
      {/* Header Row: Resources Label + Dates */}
      <div className="gantt-header flex border-b border-gray-200 bg-gray-50">
        <div className="w-48 p-3 border-r border-gray-200 font-bold text-gray-400 uppercase text-[10px] flex items-center">
            Resources
        </div>
        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(7, 1fr)` }}>
          {days.map(day => (
            <div key={day.toISOString()} className="p-3 text-center border-r last:border-0">
              <div className="text-[10px] font-bold text-gray-400 uppercase">{day.toLocaleDateString('en-AU', { weekday: 'short' })}</div>
              <div className="text-lg font-bold">{day.getDate()}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="gantt-body overflow-y-auto" style={{ maxHeight: '600px' }}>
        {rows.map(row => (
          <div key={row.id} className="flex border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors group">
            {/* Resource Label */}
            <div className="w-48 p-3 border-r border-gray-200 flex flex-col justify-center bg-gray-50/50">
              <div className="text-xs font-bold text-gray-700 truncate">{row.name}</div>
              <div className="text-[9px] text-gray-400 uppercase tracking-tight">{row.type}</div>
            </div>

            {/* Day Cells */}
            <div className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(7, 1fr)`, minHeight: '80px' }}>
              {days.map(day => (
                <div 
                  key={day.toISOString()} 
                  className="border-r border-gray-100 last:border-0 relative h-full transition-colors drop-zone"
                  onDragOver={(e) => {
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).classList.add('bg-primary-50');
                  }}
                  onDragLeave={(e) => {
                    (e.currentTarget as HTMLElement).classList.remove('bg-primary-50');
                  }}
                  onDrop={(e) => {
                    (e.currentTarget as HTMLElement).classList.remove('bg-primary-50');
                    handleDrop(e, day);
                  }}
                />
              ))}

              {/* Jobs for this resource on this row */}
              <div className="absolute inset-0 pointer-events-none p-1">
                {scheduledJobs.filter(job => {
                  // Job belongs to this row if it's assigned to this resource, 
                  // or if it's the unassigned row and the job has no resources
                  if (row.id === 'unassigned') {
                    return !job.resources || job.resources.length === 0;
                  }
                  return job.resources?.some(r => r.asset_id === row.id || r.personnel_id === row.id);
                }).map(job => {
                  const start = new Date(job.start_time!);
                  const dayIndex = days.findIndex(d => d.toDateString() === start.toDateString());
                  if (dayIndex === -1) return null;

                  return (
                    <div 
                      key={`${row.id}-${job.id}`}
                      className="pointer-events-auto bg-primary-100 border-l-4 border-primary-600 p-1.5 rounded shadow-sm mb-1 text-left overflow-hidden absolute"
                      style={{
                        left: `calc(${(dayIndex / 7) * 100}% + 4px)`,
                        width: `calc(${(1/7) * 100}% - 8px)`,
                        top: '4px',
                        zIndex: 10
                      }}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <div className="text-[10px] font-bold text-primary-800 truncate">{job.customer_name}</div>
                        <div className="text-[8px] font-mono text-primary-600 flex-shrink-0">{formatRecordId(job.id, job.status_id)}</div>
                      </div>
                      <div className="text-[9px] truncate text-gray-600">{job.job_brief}</div>
                      <div className="text-[8px] text-primary-600 mt-0.5">
                        {new Date(job.start_time!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
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
        .drop-zone:hover {
          background-color: var(--color-gray-50);
        }
        .bg-primary-50 {
          background-color: #eff6ff !important;
          outline: 2px dashed #3b82f6;
          outline-offset: -2px;
          z-index: 5;
        }
      `}</style>
    </div>
  );
}

