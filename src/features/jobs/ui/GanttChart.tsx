import { useMemo } from 'react';
import type { JobWithResources } from '../api/useJobs';

interface GanttChartProps {
  jobs: JobWithResources[];
  resources: {
    assets: any[];
    personnel: any[];
  };
  startDate: Date;
  onScheduleUpdate: (jobId: string, start: string, end: string) => void;
}

export function GanttChart({ jobs, resources, startDate, onScheduleUpdate }: GanttChartProps) {
  const scheduledJobs = jobs.filter(j => j.start_time && j.end_time);
  
  // Flatten resources into a single list for rows
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [startDate]);

  const rows = useMemo(() => {
    const assetRows = resources.assets.map(a => ({
      id: a.id,
      name: a.name,
      type: 'Asset',
      asset_type: a.asset_type_name
    }));

    return [
      { id: 'unassigned', name: 'Unassigned / General', type: 'System' },
      ...assetRows
    ];
  }, [resources.assets]);

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
    <div className="gantt-scroll-area shadow-xl">
      <div className="flex flex-col" style={{ minWidth: 'fit-content' }}>
        {/* Header Row */}
        <div className="flex sticky-top bg-white border-b-2 border-gray-100">
          <div className="w-60 shrink-0 p-4 border-r border-gray-100 flex items-center justify-center bg-gray-50/50">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Asset Timeline</span>
          </div>
          <div className="flex flex-1">
            {days.map(day => (
              <div key={day.toISOString()} className="w-[180px] p-4 text-center border-r border-gray-50 last:border-0 bg-white">
                <div className="text-[10px] font-bold text-primary-500 uppercase tracking-widest mb-1">{day.toLocaleDateString('en-AU', { weekday: 'short' })}</div>
                <div className="text-2xl font-black text-gray-900 leading-none">{day.getDate()}</div>
                <div className="text-[9px] font-bold text-gray-400 uppercase mt-1">{day.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Body Rows */}
        <div className="gantt-body">
          {rows.map(row => (
            <div key={row.id} className="flex border-b border-gray-50 last:border-0 min-h-[100px] hover:bg-gray-50/30 transition-colors">
              {/* Resource Info */}
              <div className="w-60 shrink-0 p-4 border-r border-gray-100 bg-gray-50/10 flex flex-col justify-center sticky-left z-10 bg-white">
                <div className="text-sm font-black text-gray-800 leading-snug">{row.name}</div>
                {row.type === 'Asset' && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]"></span>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{('asset_type' in row) ? (row as any).asset_type : 'General'}</span>
                    </div>
                )}
              </div>

              {/* Grid Cells */}
              <div className="flex flex-1 relative bg-white/50" style={{ minWidth: '1260px' }}>
                {days.map(day => (
                  <div 
                    key={day.toISOString()} 
                    className="w-[180px] border-r border-gray-50/50 last:border-0 relative h-full transition-all drop-zone-cell"
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

                {/* Scheduled Jobs Layer */}
                <div className="absolute inset-0 pointer-events-none p-2 flex flex-col gap-2">
                  {scheduledJobs.filter(job => {
                    if (row.id === 'unassigned') return !job.resources || job.resources.length === 0;
                    return job.resources?.some(r => r.asset_id === row.id);
                  }).map((job, idx) => {
                    const start = new Date(job.start_time!);
                    const dayIndex = days.findIndex(d => d.toDateString() === start.toDateString());
                    if (dayIndex === -1) return null;

                    const jobPeople = job.resources?.filter(r => r.resource_type === 'Personnel') || [];
                    const jobAssets = job.resources?.filter(r => r.resource_type === 'Asset') || [];

                    const getInitials = (name: string) => {
                        return name.split(' ').map(n => n[0]).join('').toUpperCase();
                    };

                    return (
                      <div 
                        key={`${row.id}-${job.id}-${idx}`}
                        className="pointer-events-auto bg-white rounded-xl border border-gray-100 shadow-lg p-3 hover:scale-[1.02] hover:shadow-2xl transition-all absolute flex flex-col justify-between overflow-hidden cursor-pointer"
                        style={{
                          left: `calc(${dayIndex * 180}px + 10px)`,
                          width: `160px`,
                          top: '10px',
                          zIndex: 10,
                          minHeight: '70px',
                          borderLeft: '4px solid var(--color-primary-600)'
                        }}
                      >
                        <div className="flex flex-col gap-1">
                            <div className="text-[11px] font-black text-gray-900 leading-tight truncate uppercase tracking-tighter">
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
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .is-draggover {
          background-color: var(--color-primary-50) !important;
          box-shadow: inset 0 0 0 2px var(--color-primary-500);
          z-index: 10;
        }
      `}</style>
    </div>
  );
}

