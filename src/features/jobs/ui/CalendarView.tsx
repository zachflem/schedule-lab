import { useMemo, useRef, useEffect, useState } from 'react';
import type { JobWithResources } from '../api/useJobs';
import { formatRecordId } from '@/shared/lib/format';

interface CalendarViewProps {
  jobs: JobWithResources[];
  resources: { assets: any[]; personnel: any[] };
  onScheduleUpdate?: (jobId: string, start: string, end: string) => void;
  daysToShow?: number;
}

const SLOT_W = 48;          // px per 30-min slot
const DATE_COL = 192;       // px, sticky left column
const SLOTS = 48;           // 24h × 2
const INNER_W = SLOTS * SLOT_W + DATE_COL;   // 2496px
const PX_PER_MIN = SLOT_W / 30;              // 1.6px/min
const HEADER_H = 44;        // px, time axis row
const ROW_H = 80;           // px, single-track row
const TRACK_H = 68;         // px per extra overlap track

export function CalendarView({ jobs, resources, onScheduleUpdate, daysToShow = 10 }: CalendarViewProps) {
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
    }),
  [totalDays]);

  const slotIndices = useMemo(() => Array.from({ length: SLOTS }, (_, i) => i), []);

  // Snap to 6am on mount — double-RAF ensures layout is complete
  useEffect(() => {
    const r1 = requestAnimationFrame(() => {
      const r2 = requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollLeft = 12 * SLOT_W;
      });
      return () => cancelAnimationFrame(r2);
    });
    return () => cancelAnimationFrame(r1);
  }, []);

  // Keep "now" line current
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setNowMins(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const handleDrop = (e: React.DragEvent, day: Date, slotIdx: number) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('jobId');
    if (!jobId || !onScheduleUpdate) return;

    const start = new Date(day);
    start.setHours(Math.floor(slotIdx / 2), (slotIdx % 2) * 30, 0, 0);

    // Duration = highest minimum_hire_period of assigned assets, fallback 4h
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

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">

      {/* ── Scrollable timeline (both axes) ── */}
      <div
        ref={scrollRef}
        className="cal-scroll overflow-auto"
        style={{ height: 'min(calc(100vh - 400px), 700px)', minHeight: '360px' }}
      >
        <div style={{ width: `${INNER_W}px` }}>

          {/* Time header — sticky top */}
          <div
            className="flex border-b border-gray-200 bg-gray-50/90 backdrop-blur-sm"
            style={{ position: 'sticky', top: 0, height: `${HEADER_H}px`, zIndex: 40 }}
          >
            {/* Corner cell — sticky both axes */}
            <div
              className="shrink-0 flex items-center justify-center border-r border-gray-200 bg-gray-50"
              style={{ width: `${DATE_COL}px`, position: 'sticky', left: 0, zIndex: 50 }}
            >
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Date</span>
            </div>

            {/* Hour slots */}
            <div className="relative flex">
              {slotIndices.map(i => {
                const isHour = i % 2 === 0;
                return (
                  <div
                    key={i}
                    className={`shrink-0 border-r last:border-0 ${isHour ? 'border-gray-200' : 'border-gray-100'}`}
                    style={{ width: `${SLOT_W}px`, height: `${HEADER_H}px` }}
                  >
                    {isHour && (
                      <span className="absolute bottom-1.5 left-1.5 text-[10px] font-semibold text-gray-400 select-none">
                        {String(i / 2).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Midday marker */}
              <div
                className="absolute inset-y-0 w-px bg-primary-300/50 pointer-events-none"
                style={{ left: `${24 * SLOT_W}px` }}
              />
              {/* Current time in header */}
              <div
                className="absolute inset-y-0 w-0.5 bg-red-400/70 pointer-events-none"
                style={{ left: `${nowMins * PX_PER_MIN}px` }}
              />
            </div>
          </div>

          {/* Day rows */}
          {days.map(day => {
            const isToday = day.toDateString() === todayStr;

            // Sort jobs for this day and stack overlapping ones into tracks
            const dayJobs = jobs
              .filter(j => j.start_time && new Date(j.start_time).toDateString() === day.toDateString())
              .sort((a, b) => +new Date(a.start_time!) - +new Date(b.start_time!));

            const tracks: JobWithResources[][] = [];
            dayJobs.forEach(job => {
              const ti = tracks.findIndex(t => {
                const last = t[t.length - 1];
                return +new Date(job.start_time!) >= +new Date(last.end_time!) - 60_000;
              });
              if (ti === -1) tracks.push([job]);
              else tracks[ti].push(job);
            });

            const numTracks = Math.max(tracks.length, 1);
            const rowH = numTracks > 1 ? numTracks * TRACK_H + 16 : ROW_H;

            return (
              <div
                key={day.toISOString()}
                className={`flex border-b border-gray-100 last:border-0 group ${isToday ? 'bg-primary-50/20' : 'hover:bg-gray-50/30'}`}
                style={{ height: `${rowH}px` }}
              >
                {/* Date label — sticky left */}
                <div
                  className={`shrink-0 flex flex-col justify-center px-4 border-r transition-colors ${
                    isToday
                      ? 'bg-primary-50/50 border-primary-100'
                      : 'bg-white border-gray-100 group-hover:bg-gray-50/50'
                  }`}
                  style={{ width: `${DATE_COL}px`, position: 'sticky', left: 0, zIndex: 30 }}
                >
                  <div className={`text-[9px] font-bold uppercase tracking-widest mb-0.5 ${isToday ? 'text-red-500' : 'text-primary-500'}`}>
                    {isToday ? 'Today' : day.toLocaleDateString('en-AU', { weekday: 'short' })}
                  </div>
                  <div className="text-xl font-black text-gray-900 leading-none flex items-baseline gap-1">
                    {day.getDate()}
                    <span className="text-[9px] font-bold text-gray-400 uppercase">
                      {day.toLocaleDateString('en-AU', { month: 'short' })}
                    </span>
                  </div>
                </div>

                {/* Slots + jobs */}
                <div className="relative flex flex-1">

                  {/* Drop-target slots */}
                  {slotIndices.map(i => (
                    <div
                      key={i}
                      className={`shrink-0 h-full border-r last:border-0 ${i % 2 === 0 ? 'border-gray-100' : 'border-gray-50'}`}
                      style={{ width: `${SLOT_W}px` }}
                      onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('is-draggover'); }}
                      onDragLeave={e => e.currentTarget.classList.remove('is-draggover')}
                      onDrop={e => { e.currentTarget.classList.remove('is-draggover'); handleDrop(e, day, i); }}
                    />
                  ))}

                  {/* Current-time line */}
                  {isToday && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-20 pointer-events-none"
                      style={{ left: `${nowMins * PX_PER_MIN}px` }}
                    >
                      <div className="absolute -top-px -left-[3px] w-2 h-2 rounded-full bg-red-400 border-2 border-white shadow-sm" />
                    </div>
                  )}

                  {/* Job cards (pointer-events-none wrapper so slots beneath still get drag events) */}
                  <div className="absolute inset-0 pointer-events-none">
                    {tracks.flatMap((track, ti) =>
                      track.map((job, ji) => {
                        const start = new Date(job.start_time!);
                        const end   = new Date(job.end_time!);
                        const startMins = start.getHours() * 60 + start.getMinutes();
                        const durMins   = (+end - +start) / 60_000;
                        const cardLeft  = startMins * PX_PER_MIN;
                        const cardW     = Math.max(durMins * PX_PER_MIN, 48);
                        const cardTop   = ti * TRACK_H + 8;

                        const people = job.resources?.filter(r => r.resource_type === 'Personnel') ?? [];
                        const assets = job.resources?.filter(r => r.resource_type === 'Asset')     ?? [];

                        return (
                          <div
                            key={`${job.id}-${ti}-${ji}`}
                            draggable
                            onDragStart={e => e.dataTransfer.setData('jobId', job.id!)}
                            className="cal-job absolute flex rounded-lg overflow-visible pointer-events-auto cursor-grab active:cursor-grabbing"
                            style={{
                              left:   `${cardLeft}px`,
                              width:  `${cardW}px`,
                              top:    `${cardTop}px`,
                              height: '56px',
                              zIndex: 10,
                              background: 'white',
                              border: '1px solid #e2e8f0',
                              borderLeft: '3px solid var(--color-primary-500)',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                            }}
                          >
                            {/* Drag handle */}
                            <div className="cal-drag-handle w-5 shrink-0 flex items-center justify-center bg-gray-50 border-r border-gray-100 rounded-l-[7px]">
                              <div className="cal-drag-dots grid grid-cols-2 gap-[3px]">
                                {[0,1,2,3,4,5].map(k => (
                                  <div key={k} className="w-[3px] h-[3px] rounded-full bg-gray-400" />
                                ))}
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 px-1.5 py-1 overflow-hidden pointer-events-none flex flex-col gap-0.5">
                              <div className="text-[10px] font-black text-gray-800 truncate uppercase tracking-tight leading-tight">
                                {job.customer_name}
                              </div>
                              <div className="flex gap-1 flex-wrap overflow-hidden">
                                {assets.map((a, k) => (
                                  <span key={`a-${k}`} className="job-pill job-pill--asset">
                                    {a.asset_number || a.asset_name.slice(0, 6)}
                                  </span>
                                ))}
                                {people.map((p, k) => (
                                  <span key={`p-${k}`} className="job-pill job-pill--person">
                                    {initials(p.personnel_name || 'S')}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Hover tooltip */}
                            <div className="cal-tooltip">
                              <div className="tt-header">
                                <span className="tt-customer">{job.customer_name}</span>
                                <span className="tt-id">{formatRecordId(job.id, job.status_id)}</span>
                              </div>
                              <div className="tt-body">
                                <div className="tt-time-row">
                                  <div>
                                    <div className="tt-label">Scheduled Time</div>
                                    <div className="tt-value tt-value--blue">
                                      {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </div>
                                  <div className="tt-badge">{job.job_type || 'General'}</div>
                                </div>
                                {job.job_brief && (
                                  <div>
                                    <div className="tt-label">Job Brief</div>
                                    <div className="tt-brief">{job.job_brief}</div>
                                  </div>
                                )}
                                {job.location && (
                                  <div>
                                    <div className="tt-label">Location</div>
                                    <div className="tt-location">{job.location}</div>
                                  </div>
                                )}
                                {job.asset_requirement && (
                                  <div className="tt-req">
                                    <div className="tt-label tt-label--amber">Asset Requirement</div>
                                    <div className="tt-req-text">"{job.asset_requirement}"</div>
                                  </div>
                                )}
                                <div className="tt-resources">
                                  <div>
                                    <div className="tt-label">Staff Assigned</div>
                                    <div className="tt-list">
                                      {people.length > 0 ? (
                                        <>
                                          {people.slice(0, 4).map((p, k) => <div key={k} className="tt-item">• {p.personnel_name}</div>)}
                                          {people.length > 4 && <div className="tt-more">+{people.length - 4} more</div>}
                                        </>
                                      ) : <span className="tt-none">Unassigned</span>}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="tt-label">Assets Allocated</div>
                                    <div className="tt-list">
                                      {assets.length > 0 ? (
                                        <>
                                          {assets.slice(0, 4).map((a, k) => <div key={k} className="tt-item">• {a.asset_name}</div>)}
                                          {assets.length > 4 && <div className="tt-more">+{assets.length - 4} more</div>}
                                        </>
                                      ) : <span className="tt-none">None</span>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="tt-arrow" />
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

      {/* Footer */}
      <div className="shrink-0 flex justify-center py-3 bg-gray-50 border-t border-gray-100">
        <button
          onClick={() => setExtraDays(p => p + 7)}
          className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:text-primary-600 transition-all shadow-sm hover:shadow"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Show another 7 days
        </button>
      </div>

      <style>{`
        /* ── Scrollbar ── */
        .cal-scroll::-webkit-scrollbar        { width: 6px; height: 6px; }
        .cal-scroll::-webkit-scrollbar-track  { background: transparent; }
        .cal-scroll::-webkit-scrollbar-thumb  { background: #d1d5db; border-radius: 99px; }
        .cal-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        .cal-scroll { scrollbar-width: thin; scrollbar-color: #d1d5db transparent; }

        /* ── Drag slot highlight ── */
        .is-draggover {
          background-color: var(--color-primary-50) !important;
          box-shadow: inset 0 0 0 2px var(--color-primary-400);
        }

        /* ── Job card ── */
        .cal-job { transition: box-shadow 0.15s ease; }
        .cal-job:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.13) !important; z-index: 50 !important; }
        .cal-drag-dots { opacity: 0.3; transition: opacity 0.15s; }
        .cal-job:hover .cal-drag-dots { opacity: 0.65; }
        .cal-drag-handle { transition: background 0.15s; }
        .cal-job:hover .cal-drag-handle { background: #eff6ff; }

        /* ── Tooltip ── */
        .cal-tooltip {
          position: absolute;
          bottom: calc(100% + 10px);
          left: 0;
          width: 276px;
          background: #0f172a;
          color: white;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #1e293b;
          box-shadow: 0 16px 40px -8px rgba(0,0,0,0.55);
          z-index: 1000;
          visibility: hidden;
          opacity: 0;
          transform: translateY(-4px);
          transition: opacity 0.15s ease, transform 0.15s ease;
          transition-delay: 0s;
          pointer-events: none;
        }
        .cal-job:hover .cal-tooltip {
          visibility: visible;
          opacity: 1;
          transform: translateY(0);
          transition-delay: 0.18s;
        }

        /* Tooltip internals */
        .tt-header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:8px; margin-bottom:8px; border-bottom:1px solid #1e293b; }
        .tt-customer { font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.08em; color:#60a5fa; }
        .tt-id { font-size:9px; color:#64748b; background:#1e293b; padding:1px 5px; border-radius:3px; font-family:monospace; white-space:nowrap; }
        .tt-body { display:flex; flex-direction:column; gap:8px; }
        .tt-time-row { display:flex; justify-content:space-between; align-items:center; background:rgba(30,41,59,0.6); padding:6px 8px; border-radius:6px; }
        .tt-label { font-size:8px; color:#64748b; text-transform:uppercase; font-weight:900; letter-spacing:0.06em; margin-bottom:2px; }
        .tt-label--amber { color:rgba(251,191,36,0.85); }
        .tt-value { font-size:11px; font-weight:700; }
        .tt-value--blue { color:#93c5fd; }
        .tt-badge { font-size:9px; font-weight:700; padding:2px 8px; background:rgba(51,65,85,0.6); color:#cbd5e1; border-radius:99px; border:1px solid #475569; white-space:nowrap; }
        .tt-brief { font-size:11px; color:#e2e8f0; line-height:1.45; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
        .tt-location { font-size:11px; color:#e2e8f0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .tt-req { background:rgba(245,158,11,0.1); border-left:2px solid #f59e0b; padding:5px 8px; border-radius:0 4px 4px 0; }
        .tt-req-text { font-size:11px; color:#fef3c7; font-style:italic; }
        .tt-resources { display:grid; grid-template-columns:1fr 1fr; gap:10px; padding-top:8px; border-top:1px solid #1e293b; }
        .tt-list { font-size:10px; color:#cbd5e1; margin-top:3px; }
        .tt-item { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px; }
        .tt-more { font-size:9px; font-style:italic; color:#64748b; }
        .tt-none { font-size:10px; color:#475569; font-style:italic; }
        .tt-arrow { position:absolute; bottom:-4px; left:20px; width:8px; height:8px; background:#0f172a; border-right:1px solid #1e293b; border-bottom:1px solid #1e293b; transform:rotate(45deg); }
      `}</style>
    </div>
  );
}
