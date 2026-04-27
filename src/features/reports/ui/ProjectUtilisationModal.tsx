import { useState, useEffect } from 'react';
import { api } from '@/shared/lib/api';
import { useSettings } from '@/shared/lib/useSettings';

interface ProjectOption {
  id: string;
  name: string;
  customer_name: string;
  status: string;
}

interface JobResource {
  asset_name?: string | null;
  asset_number?: string | null;
  personnel_name?: string | null;
  resource_type: string;
}

interface Job {
  id: string;
  job_brief?: string | null;
  location?: string | null;
  customer_name: string;
  start_time?: string | null;
  resources?: JobResource[];
}

interface Docket {
  id: string;
  job_id: string;
  date: string;
  operator_hours?: number | null;
  machine_hours?: number | null;
  break_duration_minutes?: number | null;
  docket_status: string;
  submitted_by_name?: string | null;
}

interface JobWithDockets extends Job {
  dockets: Docket[];
}

function formatDate(str?: string | null): string {
  if (!str) return '—';
  const s = str.length === 10 ? str + 'T12:00:00Z' : str;
  const d = new Date(s);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtHours(h: number): string {
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`;
}

function statusStyle(status: string): { bg: string; color: string } {
  if (status === 'validated' || status === 'completed') return { bg: 'var(--color-success-50)', color: 'var(--color-success-700)' };
  if (status === 'draft') return { bg: 'var(--color-warning-50)', color: 'var(--color-warning-600)' };
  if (status === 'incomplete') return { bg: 'var(--color-danger-50)', color: 'var(--color-danger-700)' };
  return { bg: 'var(--color-gray-100)', color: 'var(--color-gray-500)' };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function openPrintWindow(title: string, bodyContent: string, company: string, logoUrl?: string | null): void {
  const win = window.open('', '_blank');
  if (!win) { alert('Please allow pop-ups to export PDF'); return; }
  const header = `<div class="doc-header">
  ${logoUrl ? `<img src="${esc(logoUrl)}" class="doc-logo" alt="" />` : ''}
  <div class="doc-header-text">
    <div class="doc-company">${esc(company)}</div>
    <div class="doc-title">${esc(title)}</div>
  </div>
</div>`;
  win.document.write(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${esc(title)} — ${esc(company)}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #1e293b; line-height: 1.5; padding: 24px 32px; }
.doc-header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 2px solid #e2e8f0; }
.doc-logo { max-height: 48px; max-width: 140px; object-fit: contain; flex-shrink: 0; }
.doc-company { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
.doc-title { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 2px; }
h2 { font-size: 11px; font-weight: 700; margin: 20px 0 10px; padding-bottom: 5px; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.06em; color: #334155; }
.meta { font-size: 11px; color: #64748b; margin-bottom: 20px; display: flex; gap: 20px; flex-wrap: wrap; }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
.summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
.summary-card .value { font-size: 22px; font-weight: 800; color: #1e293b; }
.summary-card .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-top: 2px; }
table { width: 100%; border-collapse: collapse; font-size: 11px; }
thead th { background: #f8fafc; text-align: left; padding: 5px 8px; border-bottom: 2px solid #e2e8f0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; color: #475569; white-space: nowrap; }
tbody td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
tbody tr:last-child td { border-bottom: none; }
.badge { display: inline-block; padding: 1px 7px; border-radius: 99px; font-size: 10px; font-weight: 700; }
.badge-ok { background: #f0fdf4; color: #15803d; }
.badge-warn { background: #fffbeb; color: #d97706; }
.badge-err { background: #fef2f2; color: #b91c1c; }
.badge-gray { background: #f1f5f9; color: #475569; }
@media print { body { padding: 12px 16px; } .summary-grid { grid-template-columns: repeat(4, 1fr); } }
</style></head><body>
${header}
${bodyContent}
<script>
var imgs = document.querySelectorAll('img');
var pending = imgs.length;
function doPrint() { window.print(); }
if (pending === 0) { setTimeout(doPrint, 300); }
else { imgs.forEach(function(img) {
  if (img.complete) { if (!--pending) setTimeout(doPrint, 100); }
  else { img.onload = img.onerror = function() { if (!--pending) setTimeout(doPrint, 100); }; }
}); }
</script>
</body></html>`);
  win.document.close();
}

interface Props {
  onClose: () => void;
}

export function ProjectUtilisationModal({ onClose }: Props) {
  const settings = useSettings();
  const today = new Date().toISOString().split('T')[0];
  const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [fromDate, setFromDate] = useState(startOfYear);
  const [toDate, setToDate] = useState(today);
  const [jobsWithDockets, setJobsWithDockets] = useState<JobWithDockets[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<ProjectOption[]>('/projects')
      .then(data => setProjects(data))
      .catch(() => setError('Failed to load projects'))
      .finally(() => setLoadingProjects(false));
  }, []);

  const handleGenerate = async () => {
    if (!selectedProjectId) return;
    setGenerating(true);
    setError(null);
    try {
      const jobs = await api.get<Job[]>('/jobs', { project_id: selectedProjectId, include: 'resources' });

      const results = await Promise.all(
        jobs.map(async job => {
          const dockets = await api.get<Docket[]>('/dockets', { job_id: job.id });
          const filtered = dockets.filter(d => {
            if (d.docket_status === 'uncompleted') return false;
            if (fromDate && d.date < fromDate) return false;
            if (toDate && d.date > toDate) return false;
            return true;
          });
          return { ...job, dockets: filtered };
        })
      );

      setJobsWithDockets(results.filter(j => j.dockets.length > 0));
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const totalDockets = jobsWithDockets.reduce((s, j) => s + j.dockets.length, 0);
  const totalOperatorHours = jobsWithDockets.reduce((s, j) => s + j.dockets.reduce((ds, d) => ds + (d.operator_hours ?? 0), 0), 0);
  const totalMachineHours = jobsWithDockets.reduce((s, j) => s + j.dockets.reduce((ds, d) => ds + (d.machine_hours ?? 0), 0), 0);

  const getResources = (job: JobWithDockets, type: 'Asset' | 'Personnel') =>
    (job.resources ?? []).filter(r => r.resource_type === type).map(r => type === 'Asset' ? r.asset_name : r.personnel_name).filter(Boolean) as string[];

  const handleExport = () => {
    if (!selectedProject) return;

    const summaryCards = `<div class="summary-grid">
  <div class="summary-card"><div class="value">${jobsWithDockets.length}</div><div class="label">Jobs</div></div>
  <div class="summary-card"><div class="value">${totalDockets}</div><div class="label">Dockets</div></div>
  <div class="summary-card"><div class="value">${totalOperatorHours.toFixed(1)}</div><div class="label">Operator Hours</div></div>
  <div class="summary-card"><div class="value">${totalMachineHours.toFixed(1)}</div><div class="label">Machine Hours</div></div>
</div>`;

    const rows = jobsWithDockets.flatMap(job => {
      const assets = getResources(job, 'Asset');
      const operators = getResources(job, 'Personnel');
      return job.dockets.map(d => {
        const label = d.docket_status;
        const cls = d.docket_status === 'validated' || d.docket_status === 'completed' ? 'badge-ok'
          : d.docket_status === 'draft' ? 'badge-warn'
          : d.docket_status === 'incomplete' ? 'badge-err' : 'badge-gray';
        return `<tr>
  <td>${formatDate(d.date)}</td>
  <td>${job.job_brief || job.location || '—'}</td>
  <td>${d.operator_hours != null ? `${d.operator_hours.toFixed(1)}h` : '—'}</td>
  <td>${d.machine_hours != null ? `${d.machine_hours.toFixed(1)}h` : '—'}</td>
  <td><span class="badge ${cls}">${label}</span></td>
  <td>${assets.join(', ') || '—'}</td>
  <td>${operators.join(', ') || '—'}</td>
</tr>`;
      });
    }).join('');

    const html = `<h1>Project Utilisation Report</h1>
<div class="meta">
  <span>Project: ${selectedProject.name}</span>
  <span>Customer: ${selectedProject.customer_name}</span>
  <span>Period: ${fromDate || 'All'} – ${toDate || 'All'}</span>
  <span>Generated: ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
</div>
<h2>Summary</h2>
${summaryCards}
<h2>Docket Details</h2>
${rows
  ? `<table><thead><tr><th>Date</th><th>Job</th><th>Op. Hours</th><th>Mach. Hours</th><th>Status</th><th>Assets</th><th>Operators</th></tr></thead><tbody>${rows}</tbody></table>`
  : '<p style="color:#94a3b8;font-style:italic;font-size:11px">No dockets found in the selected date range.</p>'}`;

    openPrintWindow(`Project Utilisation — ${selectedProject.name}`, html, settings?.company_name ?? 'Company', settings?.logo_url);
  };

  const colHeaders = ['Date', 'Job', 'Op. Hours', 'Mach. Hours', 'Status', 'Assets', 'Operators'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ width: '100%', maxWidth: '900px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Project Utilisation Report</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Project select */}
          <div className="form-group">
            <label className="form-label">Project</label>
            {loadingProjects ? (
              <div style={{ color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)' }}>Loading…</div>
            ) : (
              <select
                className="form-input"
                value={selectedProjectId}
                onChange={e => {
                  setSelectedProjectId(e.target.value);
                  setGenerated(false);
                  setJobsWithDockets([]);
                }}
              >
                <option value="">Select a project…</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.customer_name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Date range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">From</label>
              <input type="date" className="form-input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">To</label>
              <input type="date" className="form-input" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
          </div>

          {error && (
            <div style={{ padding: 'var(--space-3)', background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-500)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-700)', fontSize: 'var(--text-sm)' }}>
              {error}
            </div>
          )}

          {/* Generated report */}
          {generated && (
            <div>
              {/* Summary stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                {[
                  { label: 'Jobs', value: jobsWithDockets.length },
                  { label: 'Dockets', value: totalDockets },
                  { label: 'Operator Hours', value: fmtHours(totalOperatorHours) },
                  { label: 'Machine Hours', value: fmtHours(totalMachineHours) },
                ].map(stat => (
                  <div key={stat.label} style={{
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'var(--color-gray-50)',
                    border: '1px solid var(--color-gray-200)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-gray-900)' }}>{stat.value}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Docket table */}
              {jobsWithDockets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)' }}>
                  No dockets found for this project in the selected date range.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-gray-50)' }}>
                        {colHeaders.map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--color-gray-200)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {jobsWithDockets.flatMap(job => {
                        const assets = getResources(job, 'Asset');
                        const operators = getResources(job, 'Personnel');
                        return job.dockets.map(d => {
                          const { bg, color } = statusStyle(d.docket_status);
                          return (
                            <tr key={d.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                              <td style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--color-gray-700)', whiteSpace: 'nowrap' }}>
                                {formatDate(d.date)}
                              </td>
                              <td style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--color-gray-700)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {job.job_brief || job.location || '—'}
                              </td>
                              <td style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--color-gray-700)', whiteSpace: 'nowrap' }}>
                                {d.operator_hours != null ? fmtHours(d.operator_hours) : '—'}
                              </td>
                              <td style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--color-gray-700)', whiteSpace: 'nowrap' }}>
                                {d.machine_hours != null ? fmtHours(d.machine_hours) : '—'}
                              </td>
                              <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: 'var(--text-xs)', fontWeight: 700, background: bg, color }}>
                                  {d.docket_status}
                                </span>
                              </td>
                              <td style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--color-gray-600)', fontSize: 'var(--text-xs)' }}>
                                {assets.join(', ') || '—'}
                              </td>
                              <td style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--color-gray-600)', fontSize: 'var(--text-xs)' }}>
                                {operators.join(', ') || '—'}
                              </td>
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn--secondary" onClick={onClose}>Close</button>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {generating && (
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', display: 'flex', alignItems: 'center' }}>
                Fetching dockets…
              </span>
            )}
            <button
              className="btn btn--secondary"
              onClick={handleGenerate}
              disabled={!selectedProjectId || generating}
            >
              {generating ? 'Generating…' : 'Generate Report'}
            </button>
            {generated && jobsWithDockets.length > 0 && (
              <button className="btn btn--primary" onClick={handleExport}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export PDF
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
