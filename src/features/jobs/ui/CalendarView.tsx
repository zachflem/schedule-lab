import { useState, useRef, useLayoutEffect, useEffect, useMemo } from 'react';
import type { JobWithResources } from '../api/useJobs';
import { formatRecordId } from '@/shared/lib/format';

// ── Layout constants ──────────────────────────────────
const SLOT_W = 48;           // px per 30-min slot
const DATE_W = 148;          // date column px
const SLOTS = 48;            // 24h × 2
const GRID_W = SLOTS * SLOT_W; // 2304px — exact, never stretched
const TOTAL_W = DATE_W + GRID_W;
const PX_PER_MIN = SLOT_W / 30;
const HEADER_H = 44;
const ROW_H = 80;
const TRACK_H = 68;
const SNAP_SLOT = 12;        // scroll to 6am on load

const STATUS_COLOR: Record<string, string> = {
  'Job Booked':     '#3b82f6',
  'Job Scheduled':  '#8b5cf6',
  'Allocated':      '#f59e0b',
  'Site Docket':    '#ec4899',
  'Completed':      '#22c55e',
  'Invoiced':       '#64748b',
  'Enquiry':        '#94a3b8',
  'Quote':          '#f97316',
  'Quote Accepted': '#10b981',
};

function fmtHour(h: number): string {
  if (h === 0) return 'midnight';
  if (h === 12) return 'noon';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function initials(name: string): string {
  return name.split(' ').map(n => n[0] || '').join('').toUpperCase();
}

interface CalendarViewProps {
  jobs: JobWithResources[];
  resources: { assets: any[]; personnel: any[] };
  onScheduleUpdate?: (jobId: string, start: string, end: string) => void;
  daysToShow?: number;
}

export function CalendarView({ jobs, resources, onScheduleUpdate, daysToShow = 14 }: CalendarViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [extraDays, setExtraDays] = useState(0);
  const [nowMins, setNowMins] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  const todayStr = useMemo(() => new Date().toDateString(), []);
  const totalDays = daysToShow + extraDays;

  const days = useMemo(() =>
    Array.from({ length: totalDays }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + i);
      return d;
    }), [totalDays]);

  const slots = useMemo(() => Array.from({ length: SLOTS }, (_, i) => i), []);

  // Scroll to 6am — fires after layout so scroll container has correct dimensions
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = SNAP_SLOT * SLOT_W;
    const raf = requestAnimationFrame(() => { el.scrollLeft = SNAP_SLOT * SLOT_W; });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setNowMins(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Drop onto timeline: compute slot from mouse x relative to the grid div
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, day: Date) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('jobId');
    if (!jobId || !onScheduleUpdate) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const slotIdx = Math.max(0, Math.min(SLOTS - 1, Math.floor(x / SLOT_W)));

    const start = new Date(day);
    start.setHours(Math.floor(slotIdx / 2), (slotIdx % 2) * 30, 0, 0);

    const job = jobs.find(j => j.id === jobId);
    let duration = 240;
    if (job?.resources) {
      const maxHire = job.resources
        .filter(r => r.resource_type === 'Asset')
        .reduce((max, r) => {
          const asset = resources.assets.find(a => a.id === r.asset_id);
          return Math.max(max, asset?.minimum_hire_period || 0);
        }, 0);
      if (maxHire > 0) duration = maxHire;
    }

    onScheduleUpdate(
      jobId,
      start.toISOString(),
      new Date(+start + duration * 60_000).toISOString(),
    );
  };

  return (
    // Fills the position:relative host in JobsPage
    <div style={{ position: 'absolute', inset: 0, borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

      {/* ── Single scroll container — both axes ── */}
      <div
        ref={scrollRef}
        className="cv-scroll"
        style={{ position: 'absolute', inset: 0, overflow: 'auto' }}
      >
        {/* Inner content — exact width, NOT stretched to viewport on ultrawide */}
        <div style={{ width: `${TOTAL_W}px` }}>

          {/* ── Time header — sticky top ── */}
          <div
            style={{
              position: 'sticky', top: 0, zIndex: 40,
              height: `${HEADER_H}px`, display: 'flex',
              background: '#f8fafc', borderBottom: '2px solid #e2e8f0',
            }}
          >
            {/* Corner — sticky on both axes */}
            <div style={{
              position: 'sticky', left: 0, zIndex: 50,
              width: `${DATE_W}px`, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRight: '2px solid #e2e8f0', background: '#f8fafc',
            }}>
              <span style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Date</span>
            </div>

            {/* Hour slots — exact GRID_W, not flex-1 */}
            <div style={{ width: `${GRID_W}px`, flexShrink: 0, position: 'relative', display: 'flex' }}>
              {slots.map(i => {
                const isHour = i % 2 === 0;
                const showLabel = i % 4 === 0;
                const isBiz = i >= 12 && i < 36;
                return (
                  <div
                    key={i}
                    style={{
                      width: `${SLOT_W}px`, flexShrink: 0,
                      height: `${HEADER_H}px`,
                      borderRight: `1px solid ${isHour ? '#e2e8f0' : '#f1f5f9'}`,
                      background: isBiz ? 'rgba(219,234,254,0.35)' : 'transparent',
                      position: 'relative',
                    }}
                  >
                    {showLabel && (
                      <span style={{ position: 'absolute', bottom: '7px', left: '4px', fontSize: '11px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', userSelect: 'none' }}>
                        {fmtHour(i / 2)}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Vertical guide lines */}
              {([
                [12, 'rgba(59,130,246,0.2)'],
                [24, 'rgba(59,130,246,0.15)'],
                [36, 'rgba(249,115,22,0.2)'],
              ] as const).map(([slot, color]) => (
                <div key={slot} style={{ position: 'absolute', top: 0, bottom: 0, left: `${slot * SLOT_W}px`, width: '1px', background: color, pointerEvents: 'none' }} />
              ))}

              {/* Current time */}
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${nowMins * PX_PER_MIN}px`, width: '2px', background: 'rgba(239,68,68,0.5)', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* ── Day rows ── */}
          {days.map(day => {
            const isToday = day.toDateString() === todayStr;

            // midnight boundaries for this day
            const dayStart = day; // already set to 00:00:00 in useMemo
            const dayEnd = new Date(+dayStart + 24 * 60 * 60 * 1000); // next midnight

            // Find all jobs that overlap this day (including multi-day jobs)
            type Segment = {
              job: JobWithResources;
              segStart: Date;
              segEnd: Date;
              fromPrev: boolean; // job started before this day
              toNext: boolean;   // job ends after this day
            };

            const segments: Segment[] = jobs
              .filter(j => {
                if (!j.start_time || !j.end_time) return false;
                return new Date(j.start_time) < dayEnd && new Date(j.end_time) > dayStart;
              })
              .map(job => {
                const jobStart = new Date(job.start_time!);
                const jobEnd   = new Date(job.end_time!);
                return {
                  job,
                  segStart: jobStart < dayStart ? dayStart : jobStart,
                  segEnd:   jobEnd   > dayEnd   ? dayEnd   : jobEnd,
                  fromPrev: jobStart < dayStart,
                  toNext:   jobEnd   > dayEnd,
                };
              })
              .sort((a, b) => +a.segStart - +b.segStart);

            // Pack segments into non-overlapping tracks
            const tracks: Segment[][] = [];
            segments.forEach(seg => {
              const lane = tracks.findIndex(t => {
                const last = t[t.length - 1];
                return +seg.segStart >= +last.segEnd - 60_000;
              });
              if (lane === -1) tracks.push([seg]);
              else tracks[lane].push(seg);
            });

            const numTracks = Math.max(tracks.length, 1);
            const rowH = numTracks > 1 ? numTracks * TRACK_H + 16 : ROW_H;

            return (
              <div
                key={day.toISOString()}
                style={{
                  display: 'flex',
                  height: `${rowH}px`,
                  borderBottom: '1px solid #f1f5f9',
                  background: isToday ? 'rgba(239,246,255,0.5)' : 'white',
                }}
              >
                {/* Date label — sticky left */}
                <div
                  style={{
                    width: `${DATE_W}px`, flexShrink: 0,
                    position: 'sticky', left: 0, zIndex: 30,
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    paddingLeft: '16px', paddingRight: '12px',
                    borderRight: '2px solid #e2e8f0',
                    background: isToday ? '#eff6ff' : 'white',
                    boxShadow: isToday ? 'inset 3px 0 0 #3b82f6' : undefined,
                  }}
                >
                  <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: isToday ? '#ef4444' : '#94a3b8', marginBottom: '2px' }}>
                    {isToday ? '● Today' : day.toLocaleDateString('en-AU', { weekday: 'short' })}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 900, lineHeight: 1, color: isToday ? '#2563eb' : '#0f172a' }}>
                    {day.getDate()}
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginTop: '3px' }}>
                    {day.toLocaleDateString('en-AU', { month: 'short' })}
                  </div>
                </div>

                {/* Timeline — exact GRID_W, drop target, job cards */}
                <div
                  style={{ width: `${GRID_W}px`, flexShrink: 0, position: 'relative' }}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('cv-drop-active'); }}
                  onDragLeave={e => { e.currentTarget.classList.remove('cv-drop-active'); }}
                  onDrop={e => { e.currentTarget.classList.remove('cv-drop-active'); handleDrop(e, day); }}
                >
                  {/* Column grid lines */}
                  {slots.map(i => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute', top: 0, bottom: 0,
                        left: `${i * SLOT_W}px`, width: `${SLOT_W}px`,
                        borderRight: `1px solid ${i % 2 === 0 ? '#f1f5f9' : '#f8fafc'}`,
                        pointerEvents: 'none',
                      }}
                    />
                  ))}

                  {/* Guide lines */}
                  {([12, 24, 36] as const).map(slot => (
                    <div key={slot} style={{ position: 'absolute', top: 0, bottom: 0, left: `${slot * SLOT_W}px`, width: '1px', background: slot === 36 ? 'rgba(249,115,22,0.15)' : 'rgba(59,130,246,0.12)', pointerEvents: 'none' }} />
                  ))}

                  {/* Current time marker */}
                  {isToday && (
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${nowMins * PX_PER_MIN}px`, width: '2px', background: '#ef4444', zIndex: 20, pointerEvents: 'none' }}>
                      <div style={{ position: 'absolute', top: '-1px', left: '-3px', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
                    </div>
                  )}

                  {/* Job cards — pointer-events-none wrapper so drop target beneath gets events */}
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {tracks.flatMap((track, ti) =>
                      track.map((seg, ji) => {
                        const { job, segStart, segEnd, fromPrev, toNext } = seg;

                        // Position based on the segment's effective time on this day
                        const startMins = segStart.getHours() * 60 + segStart.getMinutes();
                        const durMins   = (+segEnd - +segStart) / 60_000;
                        const cardLeft  = startMins * PX_PER_MIN;
                        const cardW     = Math.max(durMins * PX_PER_MIN, SLOT_W);
                        const cardTop   = ti * TRACK_H + 8;
                        const color     = STATUS_COLOR[job.status_id ?? ''] ?? '#3b82f6';

                        // Full job times for tooltip display
                        const jobStart = new Date(job.start_time!);
                        const jobEnd   = new Date(job.end_time!);

                        const people = job.resources?.filter((r: any) => r.resource_type === 'Personnel') ?? [];
                        const assets = job.resources?.filter((r: any) => r.resource_type === 'Asset')     ?? [];

                        // Flatten corner radii when job continues across midnight
                        const radLeft  = fromPrev ? '0' : '8px';
                        const radRight = toNext   ? '0' : '8px';

                        return (
                          <div
                            key={`${job.id}-${day.toISOString()}-${ti}-${ji}`}
                            draggable={!fromPrev} // only drag from the originating day
                            onDragStart={e => e.dataTransfer.setData('jobId', job.id!)}
                            className="cv-card"
                            style={{
                              position: 'absolute',
                              left: `${cardLeft}px`,
                              width: `${cardW}px`,
                              top: `${cardTop}px`,
                              height: '56px',
                              zIndex: 10,
                              background: 'white',
                              border: '1px solid #e2e8f0',
                              borderLeft: fromPrev ? `1px solid ${color}` : `3px solid ${color}`,
                              borderRadius: `${radLeft} ${radRight} ${radRight} ${radLeft}`,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                              display: 'flex',
                              overflow: 'visible',
                              pointerEvents: 'auto',
                              cursor: fromPrev ? 'default' : 'grab',
                            }}
                          >
                            {/* Continuation arrow from previous day */}
                            {fromPrev && (
                              <div style={{ position: 'absolute', left: '-10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color, lineHeight: 1, pointerEvents: 'none' }}>◀</div>
                            )}

                            {/* Drag handle (only on originating day) */}
                            {!fromPrev && (
                              <div className="cv-handle" style={{ width: '18px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRight: '1px solid #f1f5f9', borderRadius: '7px 0 0 7px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '3px 3px', gap: '3px' }}>
                                  {[0,1,2,3,4,5].map(k => (
                                    <div key={k} style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#cbd5e1' }} />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Card content */}
                            <div style={{ flex: 1, padding: '5px 7px', overflow: 'hidden', pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ fontSize: '10px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {fromPrev && <span style={{ color, marginRight: '4px', fontSize: '9px' }}>cont.</span>}
                                {job.customer_name}
                              </div>
                              <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', overflow: 'hidden' }}>
                                {assets.map((a: any, k: number) => (
                                  <span key={k} className="job-pill job-pill--asset">
                                    {a.asset_number || a.asset_name.slice(0, 6)}
                                  </span>
                                ))}
                                {people.map((p: any, k: number) => (
                                  <span key={k} className="job-pill job-pill--person">
                                    {initials(p.personnel_name || 'S')}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Continuation arrow to next day */}
                            {toNext && (
                              <div style={{ position: 'absolute', right: '-10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color, lineHeight: 1, pointerEvents: 'none' }}>▶</div>
                            )}

                            {/* Hover tooltip — always shows full job times */}
                            <div className="cv-tip">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '8px', marginBottom: '8px', borderBottom: '1px solid #1e293b' }}>
                                <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#60a5fa' }}>{job.customer_name}</span>
                                <span style={{ fontSize: '9px', color: '#475569', background: '#1e293b', padding: '1px 5px', borderRadius: '3px', fontFamily: 'monospace' }}>{formatRecordId(job.id, job.status_id)}</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: '6px', padding: '6px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <div style={{ fontSize: '8px', color: '#64748b', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.06em', marginBottom: '2px' }}>Scheduled Time</div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#93c5fd' }}>
                                      {jobStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {jobEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    {(fromPrev || toNext) && (
                                      <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                                        {jobStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} → {jobEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', border: `1px solid ${color}`, color, background: `${color}20`, whiteSpace: 'nowrap' }}>
                                    {job.status_id || 'General'}
                                  </div>
                                </div>
                                {job.job_brief && (
                                  <div>
                                    <div style={{ fontSize: '8px', color: '#64748b', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.06em', marginBottom: '2px' }}>Brief</div>
                                    <div style={{ fontSize: '11px', color: '#e2e8f0', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{job.job_brief}</div>
                                  </div>
                                )}
                                {job.location && (
                                  <div>
                                    <div style={{ fontSize: '8px', color: '#64748b', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.06em', marginBottom: '2px' }}>Location</div>
                                    <div style={{ fontSize: '11px', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.location}</div>
                                  </div>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '8px', borderTop: '1px solid #1e293b' }}>
                                  <div>
                                    <div style={{ fontSize: '8px', color: '#64748b', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.06em', marginBottom: '3px' }}>Staff</div>
                                    <div style={{ fontSize: '10px', color: '#cbd5e1' }}>
                                      {people.length > 0
                                        ? people.slice(0, 4).map((p: any, k: number) => <div key={k} style={{ marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>• {p.personnel_name}</div>)
                                        : <span style={{ color: '#475569', fontStyle: 'italic' }}>Unassigned</span>}
                                      {people.length > 4 && <div style={{ fontSize: '9px', fontStyle: 'italic', color: '#475569' }}>+{people.length - 4} more</div>}
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '8px', color: '#64748b', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.06em', marginBottom: '3px' }}>Assets</div>
                                    <div style={{ fontSize: '10px', color: '#cbd5e1' }}>
                                      {assets.length > 0
                                        ? assets.slice(0, 4).map((a: any, k: number) => <div key={k} style={{ marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>• {a.asset_name}</div>)
                                        : <span style={{ color: '#475569', fontStyle: 'italic' }}>None</span>}
                                      {assets.length > 4 && <div style={{ fontSize: '9px', fontStyle: 'italic', color: '#475569' }}>+{assets.length - 4} more</div>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div style={{ position: 'absolute', bottom: '-4px', left: '20px', width: '8px', height: '8px', background: '#0f172a', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', transform: 'rotate(45deg)' }} />
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

          {/* Load more */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px', borderTop: '1px solid #f1f5f9', background: 'white', position: 'sticky', left: 0 }}>
            <button
              onClick={() => setExtraDays(p => p + 7)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#3b82f6'; (e.currentTarget as HTMLButtonElement).style.color = '#2563eb'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Show another 7 days
            </button>
          </div>

        </div>
      </div>

      <style>{`
        /* Scrollbar */
        .cv-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .cv-scroll::-webkit-scrollbar-track { background: transparent; }
        .cv-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 99px; }
        .cv-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        .cv-scroll { scrollbar-width: thin; scrollbar-color: #d1d5db transparent; }

        /* Drop target row highlight */
        .cv-drop-active { background: rgba(219,234,254,0.5) !important; outline: 2px solid #3b82f6; outline-offset: -2px; }

        /* Card hover */
        .cv-card { transition: box-shadow 0.15s ease, transform 0.1s ease; }
        .cv-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.13) !important; z-index: 50 !important; transform: translateY(-1px); }
        .cv-handle { transition: background 0.15s, opacity 0.15s; opacity: 0.5; }
        .cv-card:hover .cv-handle { opacity: 1; background: #eff6ff !important; }

        /* Tooltip */
        .cv-tip {
          position: absolute;
          bottom: calc(100% + 10px);
          left: 0;
          width: 284px;
          background: #0f172a;
          color: white;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid #1e293b;
          box-shadow: 0 20px 60px -10px rgba(0,0,0,0.65);
          z-index: 500;
          visibility: hidden;
          opacity: 0;
          transform: translateY(-3px);
          transition: opacity 0.15s ease, transform 0.15s ease;
          pointer-events: none;
        }
        .cv-card:hover .cv-tip {
          visibility: visible;
          opacity: 1;
          transform: translateY(0);
          transition-delay: 0.2s;
        }
      `}</style>
    </div>
  );
}
