import { useState, useEffect } from 'react';
import { api } from '@/shared/lib/api';
import { useSettings } from '@/shared/lib/useSettings';

interface MaintenanceRecord {
  id: string;
  asset_id: string;
  asset_name: string;
  activity_type: string;
  type_other?: string | null;
  performed_by: string;
  description: string;
  cost?: number | null;
  performed_at?: string | null;
  meter_reading?: number | null;
  created_at: string;
}

interface AssetOption {
  id: string;
  name: string;
  asset_type_name: string;
}

const FIELDS = [
  { key: 'activity_type', label: 'Type' },
  { key: 'description', label: 'Description' },
  { key: 'performed_by', label: 'Performed By' },
  { key: 'performed_at', label: 'Date / Time' },
  { key: 'cost', label: 'Cost' },
  { key: 'meter_reading', label: 'Meter Reading' },
] as const;

type FieldKey = typeof FIELDS[number]['key'];

const DEFAULT_FIELDS: Set<FieldKey> = new Set(['activity_type', 'description', 'performed_by', 'performed_at']);

function formatDateTime(str?: string | null): string {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function renderCell(record: MaintenanceRecord, key: FieldKey): string {
  switch (key) {
    case 'activity_type':
      return record.activity_type === 'Other' && record.type_other
        ? `Other: ${record.type_other}`
        : record.activity_type;
    case 'description': return record.description;
    case 'performed_by': return record.performed_by;
    case 'performed_at': return formatDateTime(record.performed_at || record.created_at);
    case 'cost': return record.cost != null ? `$${record.cost.toFixed(2)}` : '—';
    case 'meter_reading': return record.meter_reading != null ? String(record.meter_reading) : '—';
  }
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
thead th { background: #f8fafc; text-align: left; padding: 5px 8px; border-bottom: 2px solid #e2e8f0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; color: #475569; white-space: nowrap; }
tbody td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
tbody tr:last-child td { border-bottom: none; }
.asset-section { margin-bottom: 24px; page-break-inside: avoid; }
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

export function MaintenanceReportModal({ onClose }: Props) {
  const settings = useSettings();
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(thirtyDaysAgo);
  const [toDate, setToDate] = useState(today);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [selectedFields, setSelectedFields] = useState<Set<FieldKey>>(new Set(DEFAULT_FIELDS));
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<AssetOption[]>('/assets')
      .then(data => {
        setAssets(data);
        setSelectedAssetIds(new Set(data.map(a => a.id)));
      })
      .catch(() => setError('Failed to load assets'))
      .finally(() => setLoadingAssets(false));
  }, []);

  const toggleAsset = (id: string) => {
    setSelectedAssetIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleField = (key: FieldKey) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const data = await api.get<MaintenanceRecord[]>('/maintenance', params);
      setRecords(data.filter(r => selectedAssetIds.has(r.asset_id)));
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const assetMap = new Map(assets.map(a => [a.id, a]));
  const assetGroups = new Map<string, MaintenanceRecord[]>();
  for (const r of records) {
    if (!assetGroups.has(r.asset_id)) assetGroups.set(r.asset_id, []);
    assetGroups.get(r.asset_id)!.push(r);
  }

  const activeFields = FIELDS.filter(f => selectedFields.has(f.key));

  const handleExport = () => {
    const colHeaders = activeFields.map(f => `<th>${f.label}</th>`).join('');
    const sections = Array.from(assetGroups.entries()).map(([assetId, assetRecords]) => {
      const asset = assetMap.get(assetId);
      const label = asset ? `${asset.name} — ${asset.asset_type_name}` : assetRecords[0].asset_name;
      const rows = assetRecords.map(r =>
        `<tr>${activeFields.map(f => `<td>${renderCell(r, f.key)}</td>`).join('')}</tr>`
      ).join('');
      return `<div class="asset-section"><h2>${label} (${assetRecords.length})</h2><table><thead><tr>${colHeaders}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }).join('');

    const html = `<h1>Maintenance Report</h1>
<div class="meta">
  <span>Period: ${fromDate || 'All'} – ${toDate || 'All'}</span>
  <span>Assets: ${assetGroups.size}</span>
  <span>Records: ${records.length}</span>
  <span>Generated: ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
</div>
${sections}`;

    openPrintWindow('Maintenance Report', html, settings?.company_name ?? 'Company', settings?.logo_url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ width: '100%', maxWidth: '860px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Maintenance Report</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
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

          {/* Asset multi-select */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <label className="form-label">Assets</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button className="btn btn--sm btn--secondary" onClick={() => setSelectedAssetIds(new Set(assets.map(a => a.id)))}>All</button>
                <button className="btn btn--sm btn--secondary" onClick={() => setSelectedAssetIds(new Set())}>None</button>
              </div>
            </div>
            {loadingAssets ? (
              <div style={{ color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)' }}>Loading assets…</div>
            ) : (
              <div style={{ border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', maxHeight: '180px', overflowY: 'auto' }}>
                {assets.map(asset => (
                  <label key={asset.id} style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                    padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--color-gray-100)',
                    cursor: 'pointer', fontSize: 'var(--text-sm)',
                  }}>
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={selectedAssetIds.has(asset.id)}
                      onChange={() => toggleAsset(asset.id)}
                    />
                    <span style={{ flex: 1 }}>{asset.name}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>{asset.asset_type_name}</span>
                  </label>
                ))}
              </div>
            )}
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginTop: 'var(--space-1)' }}>
              {selectedAssetIds.size} of {assets.length} selected
            </div>
          </div>

          {/* Field toggles */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>Fields to include</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {FIELDS.map(f => (
                <label
                  key={f.key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                    padding: 'var(--space-1) var(--space-3)',
                    border: `1px solid ${selectedFields.has(f.key) ? 'var(--color-primary-500)' : 'var(--color-gray-200)'}`,
                    borderRadius: '999px',
                    background: selectedFields.has(f.key) ? 'var(--color-primary-50)' : 'white',
                    cursor: 'pointer', fontSize: 'var(--text-sm)', userSelect: 'none', transition: 'all 0.15s',
                    color: selectedFields.has(f.key) ? 'var(--color-primary-700)' : 'var(--color-gray-700)',
                  }}
                >
                  <input type="checkbox" checked={selectedFields.has(f.key)} onChange={() => toggleField(f.key)} style={{ display: 'none' }} />
                  {f.label}
                </label>
              ))}
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
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-4)' }}>
                {records.length} record{records.length !== 1 ? 's' : ''} across {assetGroups.size} asset{assetGroups.size !== 1 ? 's' : ''}
              </div>

              {records.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)' }}>
                  No maintenance records found for the selected filters.
                </div>
              ) : (
                Array.from(assetGroups.entries()).map(([assetId, assetRecords]) => {
                  const asset = assetMap.get(assetId);
                  return (
                    <div key={assetId} style={{ marginBottom: 'var(--space-6)' }}>
                      <div style={{
                        fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-gray-800)',
                        marginBottom: 'var(--space-2)', paddingBottom: 'var(--space-2)',
                        borderBottom: '2px solid var(--color-gray-200)',
                        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                      }}>
                        {assetRecords[0].asset_name}
                        {asset && (
                          <span style={{ fontWeight: 400, color: 'var(--color-gray-400)' }}>— {asset.asset_type_name}</span>
                        )}
                        <span style={{ marginLeft: 'auto', fontWeight: 500, color: 'var(--color-gray-400)', fontSize: 'var(--text-xs)' }}>
                          {assetRecords.length} record{assetRecords.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                          <thead>
                            <tr style={{ background: 'var(--color-gray-50)' }}>
                              {activeFields.map(f => (
                                <th key={f.key} style={{ textAlign: 'left', padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--color-gray-200)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                                  {f.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {assetRecords.map(r => (
                              <tr key={r.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                                {activeFields.map(f => (
                                  <td key={f.key} style={{ padding: 'var(--space-2) var(--space-3)', verticalAlign: 'top', color: 'var(--color-gray-700)' }}>
                                    {renderCell(r, f.key)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
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
              disabled={generating || selectedAssetIds.size === 0 || selectedFields.size === 0}
            >
              {generating ? 'Generating…' : 'Generate Report'}
            </button>
            {generated && records.length > 0 && (
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
