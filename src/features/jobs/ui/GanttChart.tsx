import { useMemo } from 'react';
import type { JobWithResources } from '../api/useJobs';

interface GanttChartProps {
  jobs: JobWithResources[];
  onScheduleUpdate: (jobId: string, start: string, end: string) => void;
}

export function GanttChart({ jobs, onScheduleUpdate }: GanttChartProps) {
  const scheduledJobs = jobs.filter(j => j.start_time && j.end_time);
  
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

    onScheduleUpdate(jobId, start.toISOString(), end.toISOString());
  };

  return (
    <div className="gantt-container bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <div className="gantt-header grid" style={{ gridTemplateColumns: `repeat(7, 1fr)` }}>
        {days.map(day => (
          <div key={day.toISOString()} className="p-3 text-center border-r last:border-0 bg-gray-50">
            <div className="text-xs font-bold text-gray-400 uppercase">{day.toLocaleDateString('en-AU', { weekday: 'short' })}</div>
            <div className="text-lg font-bold">{day.getDate()}</div>
          </div>
        ))}
      </div>

      <div className="gantt-body relative" style={{ minHeight: '400px' }}>
        <div className="grid h-full absolute inset-0" style={{ gridTemplateColumns: `repeat(7, 1fr)` }}>
          {days.map(day => (
            <div 
              key={day.toISOString()} 
              className="border-r last:border-0 hover:bg-gray-50 transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, day)}
            />
          ))}
        </div>

        <div className="jobs-layer relative pointer-events-none p-4">
          {scheduledJobs.map(job => {
            const start = new Date(job.start_time!);
            const dayIndex = days.findIndex(d => d.toDateString() === start.toDateString());
            
            if (dayIndex === -1) return null;

            return (
              <div 
                key={job.id}
                className="pointer-events-auto bg-primary-100 border-l-4 border-primary-600 p-2 m-1 rounded shadow-sm mb-2"
                style={{
                  gridColumn: dayIndex + 1,
                //   width: '90%'
                }}
              >
                <div className="text-xs font-bold text-primary-800">{job.customer_name}</div>
                <div className="text-[10px] truncate">{job.job_brief}</div>
                <div className="text-[9px] text-primary-600 mt-1">
                  {new Date(job.start_time!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                  {' - '}
                  {new Date(job.end_time!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
