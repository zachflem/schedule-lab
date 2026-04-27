import { useState, useEffect } from 'react';
import { api } from '@/shared/lib/api';
import { useSettings } from '@/shared/lib/useSettings';

interface AssetOption {
  id: string;
  name: string;
  asset_type_name: string;
}

interface ComplianceEntry {
  id: string;
  compliance_type_name: string;
  expiry_date: string;
  document_key?: string | null;
  document_name?: string | null;
}

interface MaintenanceRecord {
  id: string;
  asset_id: string;
  activity_type: string;
  type_other?: string | null;
  performed_by: string;
  description: string;
  performed_at?: string | null;
  created_at: string;
}

function formatDate(str: string): string {
  const d = new Date(str.length === 10 ? str + 'T12:00:00Z' : str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(str?: string | null): string {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function expiryStatus(dateStr: string): { label: string; color: string; bg: string } {
  const expiry = new Date(dateStr + 'T12:00:00Z');
  const daysUntil = Math.floor((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return { label: 'Expired', color: 'var(--color-danger-700)', bg: 'var(--color-danger-50)' };
  if (daysUntil <= 30) return { label: `${daysUntil}d left`, color: 'var(--color-warning-600)', bg: 'var(--color-warning-50)' };
  return { label: 'Valid', color: 'var(--color-success-700)', bg: 'var(--color-success-50)' };
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
h2 { font-size: 11px; font-weight: 700; margin: 20px 0 8px; padding-bottom: 5px; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.06em; color: #334155; }
.meta { font-size: 11px; color: #64748b; margin-bottom: 20px; display: flex; gap: 20px; flex-wrap: wrap; }
table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; }
thead th { background: #f8fafc; text-align: left; padding: 5px 8px; border-bottom: 2px solid #e2e8f0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; color: #475569; }
tbody td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
tbody tr:last-child td { border-bottom: none; }
.badge { display: inline-block; padding: 1px 7px; border-radius: 99px; font-size: 10px; font-weight: 700; }
.badge-ok { background: #f0fdf4; color: #15803d; }
.badge-warn { background: #fffbeb; color: #d97706; }
.badge-err { background: #fef2f2; color: #b91c1c; }
p.empty { font-size: 11px; color: #94a3b8; font-style: italic; margin: 4px 0 12px; }
@media print { body { padding: 12px 16px; } }
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

export function CompliancePackModal({ onClose }: Props) {
  const settings = useSettings();
  const today = new Date().toISOString().split('T')[0];
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [compliance, setCompliance] = useState<ComplianceEntry[]>([]);
  const [loadingCompliance, setLoadingCompliance] = useState(false);
  const [selectedComplianceIds, setSelectedComplianceIds] = useState<Set<string>>(new Set());
  const [fromDate, setFromDate] = useState(oneYearAgo);
  const [toDate, setToDate] = useState(today);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<AssetOption[]>('/assets')
      .then(data => setAssets(data))
      .catch(() => setError('Failed to load assets'))
      .finally(() => setLoadingAssets(false));
  }, []);

  useEffect(() => {
    if (!selectedAssetId) {
      setCompliance([]);
      setSelectedComplianceIds(new Set());
      return;
    }
    setLoadingCompliance(true);
    setGenerated(false);
    setMaintenanceRecords([]);
    api.get<ComplianceEntry[]>(`/assets/${selectedAssetId}/compliance`)
      .then(data => {
        setCompliance(data);
        setSelectedComplianceIds(new Set(data.map(c => c.id)));
      })
      .catch(() => setError('Failed to load compliance entries'))
      .finally(() => setLoadingCompliance(false));
  }, [selectedAssetId]);

  const toggleCompliance = (id: string) => {
    setSelectedComplianceIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!selectedAssetId) return;
    setGenerating(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const data = await api.get<MaintenanceRecord[]>('/maintenance', params);
      setMaintenanceRecords(data.filter(r => r.asset_id === selectedAssetId));
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch maintenance records');
    } finally {
      setGenerating(false);
    }
  };

  const selectedAsset = assets.find(a => a.id === selectedAssetId);
  const selectedComplianceEntries = compliance.filter(c => selectedComplianceIds.has(c.id));

  const handleExport = () => {
    if (!selectedAsset) return;

    const complianceRows = selectedComplianceEntries.map(c => {
      const { label } = expiryStatus(c.expiry_date);
      const badgeClass = label === 'Expired' ? 'badge-err' : label.endsWith('left') ? 'badge-warn' : 'badge-ok';
      return `<tr>
        <td>${c.compliance_type_name}</td>
        <td>${formatDate(c.expiry_date)}</td>
        <td><span class="badge ${badgeClass}">${label}</span></td>
        <td>${c.document_name || '—'}</td>
      </tr>`;
    }).join('');

    const maintenanceRows = maintenanceRecords.map(r => `<tr>
      <td>${r.activity_type === 'Other' && r.type_other ? `Other: ${r.type_other}` : r.activity_type}</td>
      <td>${r.description}</td>
      <td>${r.performed_by}</td>
      <td>${formatDateTime(r.performed_at || r.created_at)}</td>
    </tr>`).join('');

    const html = `<h1>Compliance Pack — ${selectedAsset.name}</h1>
<div class="meta">
  <span>Asset Type: ${selectedAsset.asset_type_name}</span>
  <span>Generated: ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
</div>

<h2>Compliance Documentation</h2>
${selectedComplianceEntries.length > 0
  ? `<table><thead><tr><th>Document Type</th><th>Expiry Date</th><th>Status</th><th>File</th></tr></thead><tbody>${complianceRows}</tbody></table>`
  : '<p class="empty">No compliance documents selected.</p>'}

<h2>Maintenance Records (${fromDate || 'All'} – ${toDate || 'All'})</h2>
${maintenanceRecords.length > 0
  ? `<table><thead><tr><th>Type</th><th>Description</th><th>Performed By</th><th>Date / Time</th></tr></thead><tbody>${maintenanceRows}</tbody></table>`
  : '<p class="empty">No maintenance records in the selected date range.</p>'}`;

    openPrintWindow(`Compliance Pack — ${selectedAsset.name}`, html, settings?.company_name ?? 'Company', settings?.logo_url);
  };

  const sectionLabel = (text: string) => (
    <div style={{
      fontWeight: 700, fontSize: 'var(--text-xs)', textTransform: 'uppercase' as const,
      letterSpacing: '0.05em', color: 'var(--color-gray-500)',
      paddingBottom: 'var(--space-2)', borderBottom: '2px solid var(--color-gray-200)',
      marginBottom: 'var(--space-3)',
    }}>
      {text}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ width: '100%', maxWidth: '720px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Compliance Pack</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Asset select */}
          <div className="form-group">
            <label className="form-label">Asset</label>
            {loadingAssets ? (
              <div style={{ color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)' }}>Loading…</div>
            ) : (
              <select
                className="form-input"
                value={selectedAssetId}
                onChange={e => setSelectedAssetId(e.target.value)}
              >
                <option value="">Select an asset…</option>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>{a.name} — {a.asset_type_name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Compliance entries */}
          {selectedAssetId && (
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <label className="form-label">Compliance Documents to Include</label>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button className="btn btn--sm btn--secondary" onClick={() => setSelectedComplianceIds(new Set(compliance.map(c => c.id)))}>All</button>
                  <button className="btn btn--sm btn--secondary" onClick={() => setSelectedComplianceIds(new Set())}>None</button>
                </div>
              </div>
              {loadingCompliance ? (
                <div style={{ color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)' }}>Loading…</div>
              ) : compliance.length === 0 ? (
                <div style={{ color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)', padding: 'var(--space-4)', textAlign: 'center', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)' }}>
                  No compliance entries for this asset.
                </div>
              ) : (
                <div style={{ border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  {compliance.map(entry => {
                    const status = expiryStatus(entry.expiry_date);
                    return (
                      <label key={entry.id} style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                        padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--color-gray-100)',
                        cursor: 'pointer', fontSize: 'var(--text-sm)',
                      }}>
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={selectedComplianceIds.has(entry.id)}
                          onChange={() => toggleCompliance(entry.id)}
                        />
                        <span style={{ flex: 1 }}>{entry.compliance_type_name}</span>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
                          {formatDate(entry.expiry_date)}
                        </span>
                        <span style={{
                          fontSize: 'var(--text-xs)', fontWeight: 700, padding: '1px 8px',
                          borderRadius: '999px', color: status.color, background: status.bg,
                        }}>
                          {status.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Date range for maintenance */}
          {selectedAssetId && (
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                Maintenance Records Date Range
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">From</label>
                  <input type="date" className="form-input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">To</label>
                  <input type="date" className="form-input" value={toDate} onChange={e => setToDate(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: 'var(--space-3)', background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-500)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-700)', fontSize: 'var(--text-sm)' }}>
              {error}
            </div>
          )}

          {/* Generated preview */}
          {generated && selectedAsset && (
            <div style={{ border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', background: 'var(--color-gray-50)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-gray-900)', marginBottom: 'var(--space-1)' }}>
                {selectedAsset.name}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-4)' }}>
                {selectedAsset.asset_type_name}
              </div>

              {sectionLabel(`Compliance Documentation (${selectedComplianceEntries.length})`)}
              {selectedComplianceEntries.length === 0 ? (
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-400)', marginBottom: 'var(--space-4)' }}>
                  No documents selected.
                </div>
              ) : (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  {selectedComplianceEntries.map(entry => {
                    const status = expiryStatus(entry.expiry_date);
                    return (
                      <div key={entry.id} style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                        padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-gray-200)',
                        fontSize: 'var(--text-sm)',
                      }}>
                        <span style={{ flex: 1 }}>{entry.compliance_type_name}</span>
                        <span style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-xs)' }}>
                          Expires {formatDate(entry.expiry_date)}
                        </span>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, padding: '1px 8px', borderRadius: '999px', color: status.color, background: status.bg }}>
                          {status.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {sectionLabel(`Maintenance Records (${maintenanceRecords.length})`)}
              {maintenanceRecords.length === 0 ? (
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-400)' }}>
                  No maintenance records in the selected period.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-gray-100)' }}>
                      {['Type', 'Description', 'Performed By', 'Date / Time'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--color-gray-200)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {maintenanceRecords.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--color-gray-200)' }}>
                        <td style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--color-gray-700)', whiteSpace: 'nowrap' }}>
                          {r.activity_type === 'Other' && r.type_other ? `Other: ${r.type_other}` : r.activity_type}
                        </td>
                        <td style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--color-gray-700)' }}>{r.description}</td>
                        <td style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--color-gray-700)', whiteSpace: 'nowrap' }}>{r.performed_by}</td>
                        <td style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--color-gray-700)', whiteSpace: 'nowrap' }}>
                          {formatDateTime(r.performed_at || r.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn--secondary" onClick={onClose}>Close</button>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              className="btn btn--secondary"
              onClick={handleGenerate}
              disabled={!selectedAssetId || generating}
            >
              {generating ? 'Generating…' : 'Generate'}
            </button>
            {generated && (
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
