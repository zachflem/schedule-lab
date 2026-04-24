import { useMemo } from 'react';
import type { JobWithResources } from '../api/useJobs';

const STATUS_COLOR: Record<string, string> = {
  'Job Booked':     '#3b82f6',
  'Job Scheduled':  '#8b5cf6',
  'Allocated':      '#f59e0b',
  'Site Docket':    '#ec4899',
  'Completed':      '#22c55e',
  'Invoiced':       '#64748b',
};

function initials(name: string): string {
  return name.split(' ').map(n => n[0] || '').join('').toUpperCase();
}

function fmtTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

interface Props {
  jobs: JobWithResources[];
}

export function ScheduleMobileView({ jobs }: Props) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const sevenDaysOut = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return d;
  }, [today]);

  const todayStr = today.toDateString();
  const tomorrowStr = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toDateString();
  }, [today]);

  const groups = useMemo(() => {
    const scheduled = jobs
      .filter(j => {
        if (!j.start_time) return false;
        const s = new Date(j.start_time);
        return s >= today && s < sevenDaysOut;
      })
      .sort((a, b) => new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime());

    const map = new Map<string, { date: Date; jobs: JobWithResources[] }>();
    for (const job of scheduled) {
      const d = new Date(job.start_time!);
      d.setHours(0, 0, 0, 0);
      const key = d.toDateString();
      if (!map.has(key)) map.set(key, { date: d, jobs: [] });
      map.get(key)!.jobs.push(job);
    }
    return [...map.entries()].map(([key, val]) => ({ key, ...val }));
  }, [jobs, today, sevenDaysOut]);

  if (groups.length === 0) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>
          No jobs scheduled in the next 7 days
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {groups.map(({ key, date, jobs: dayJobs }) => {
        const isToday = key === todayStr;
        const isTomorrow = key === tomorrowStr;

        const dayLabel = isToday
          ? 'Today'
          : isTomorrow
          ? 'Tomorrow'
          : date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' });

        return (
          <div key={key}>
            {/* Date separator */}
            <div style={{ padding: '12px 0 8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: isToday ? '#2563eb' : '#64748b',
                whiteSpace: 'nowrap',
              }}>
                {isToday && <span style={{ color: '#ef4444', marginRight: '4px' }}>●</span>}
                {dayLabel}
              </span>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              <span style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap', fontWeight: 600 }}>
                {date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
              </span>
            </div>

            {/* Job cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '4px' }}>
              {dayJobs.map(job => {
                const color = STATUS_COLOR[job.status_id ?? ''] ?? '#3b82f6';
                const startTime = new Date(job.start_time!);
                const endTime = job.end_time ? new Date(job.end_time) : null;
                const description = (job.job_brief || job.task_description || '').slice(0, 200);
                const assets = job.resources?.filter((r: any) => r.resource_type === 'Asset') ?? [];
                const people = job.resources?.filter((r: any) => r.resource_type === 'Personnel') ?? [];
                const hasPills = assets.length > 0 || people.length > 0;

                return (
                  <div
                    key={job.id}
                    style={{
                      background: 'white',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      borderLeft: `3px solid ${color}`,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                      {fmtTime(startTime)}
                      {endTime && <span style={{ color: '#94a3b8' }}> – {fmtTime(endTime)}</span>}
                    </div>

                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                      {job.customer_name}
                    </div>

                    {description && (
                      <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                        {description}
                      </div>
                    )}

                    {hasPills && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '3px' }}>
                        {assets.map((a: any, k: number) => (
                          <span key={k} className="job-pill job-pill--asset">
                            {a.asset_number || a.asset_name?.slice(0, 6)}
                          </span>
                        ))}
                        {people.map((p: any, k: number) => (
                          <span key={k} className="job-pill job-pill--person">
                            {initials(p.personnel_name || '?')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
