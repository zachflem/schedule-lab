import { useState } from 'react';

interface ExportDocketsModalProps {
  docketIds: string[];
  onClose: () => void;
  onExported: (markedInvoiced: boolean) => void;
}

type ExportFormat = 'xero' | 'generic';

const FORMATS: { id: ExportFormat; label: string; description: string }[] = [
  { id: 'xero',    label: 'Xero',        description: 'Xero invoice import CSV' },
  { id: 'generic', label: 'Generic CSV', description: 'Customisable CSV with selectable sections' },
];

const COMING_SOON = ['MYOB', 'QuickBooks', 'Reckon'];

interface Section { id: string; label: string; description: string }

const SECTIONS: Section[] = [
  { id: 'job_details', label: 'Job Details',  description: 'Date, customer, location, job brief, PO number' },
  { id: 'hours',       label: 'Hours',         description: 'Operator hours, machine hours, break duration' },
  { id: 'site_times',  label: 'Site Times',    description: 'Leave yard, arrive site, leave site, return yard' },
  { id: 'line_items',  label: 'Line Items',    description: 'Description, inventory code, quantity, unit rate, total' },
  { id: 'notes',       label: 'Notes',         description: 'Job description and dispatcher notes' },
];

export function ExportDocketsModal({ docketIds, onClose, onExported }: ExportDocketsModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('xero');
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(['job_details', 'hours'])
  );
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setSelectedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleExport = async (markInvoiced: boolean) => {
    if (selectedFormat === 'generic' && selectedSections.size === 0) {
      setError('Select at least one section to include in the export.');
      return;
    }

    setExporting(true);
    setError(null);
    try {
      const response = await fetch('/api/dockets/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: docketIds,
          format: selectedFormat,
          sections: selectedFormat === 'generic' ? Array.from(selectedSections) : undefined,
          markInvoiced,
        }),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? 'Export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      a.download = `dockets-export-${selectedFormat}-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onExported(markInvoiced);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      setExporting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-content modal-slide-in"
        style={{ maxWidth: '500px', width: '100%' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Export Dockets</h2>
          <button type="button" className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Docket count summary */}
          <div style={{
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-gray-50)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-gray-200)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-gray-700)',
          }}>
            <strong>{docketIds.length}</strong> validated docket{docketIds.length !== 1 ? 's' : ''} selected for export.
          </div>

          {/* Format selection */}
          <div>
            <label className="form-label" style={{ marginBottom: 'var(--space-3)', display: 'block' }}>
              Export Format
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {FORMATS.map(fmt => (
                <label
                  key={fmt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    border: `1px solid ${selectedFormat === fmt.id ? 'var(--color-primary-400)' : 'var(--color-gray-200)'}`,
                    borderRadius: 'var(--radius-md)',
                    background: selectedFormat === fmt.id ? 'var(--color-primary-50)' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="radio"
                    name="format"
                    value={fmt.id}
                    checked={selectedFormat === fmt.id}
                    onChange={() => setSelectedFormat(fmt.id)}
                    style={{ accentColor: 'var(--color-primary-600)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-gray-900)' }}>
                      {fmt.label}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
                      {fmt.description}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    color: 'var(--color-success-700)',
                    background: 'var(--color-success-50)',
                    border: '1px solid var(--color-success-200)',
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}>
                    Available
                  </span>
                </label>
              ))}

              {COMING_SOON.map(name => (
                <div
                  key={name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    border: '1px solid var(--color-gray-200)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-gray-50)',
                    opacity: 0.6,
                  }}
                >
                  <input type="radio" disabled style={{ opacity: 0.4 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
                      {name}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    color: 'var(--color-gray-500)',
                    background: 'var(--color-gray-100)',
                    border: '1px solid var(--color-gray-200)',
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}>
                    Coming soon
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Generic section picker */}
          {selectedFormat === 'generic' && (
            <div>
              <label className="form-label" style={{ marginBottom: 'var(--space-3)', display: 'block' }}>
                Sections to include
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {SECTIONS.map(section => {
                  const checked = selectedSections.has(section.id);
                  return (
                    <label
                      key={section.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-3) var(--space-4)',
                        border: `1px solid ${checked ? 'var(--color-primary-300)' : 'var(--color-gray-200)'}`,
                        borderRadius: 'var(--radius-md)',
                        background: checked ? 'var(--color-primary-50)' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSection(section.id)}
                        style={{ accentColor: 'var(--color-primary-600)', width: '16px', height: '16px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-gray-900)' }}>
                          {section.label}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
                          {section.description}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div style={{
              padding: 'var(--space-3)',
              background: 'var(--color-danger-50)',
              border: '1px solid var(--color-danger-200)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-danger-700)',
              fontSize: 'var(--text-sm)',
            }}>
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={exporting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => handleExport(false)}
            disabled={exporting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            {exporting ? 'Generating…' : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download CSV
              </>
            )}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => handleExport(true)}
            disabled={exporting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            {exporting ? 'Generating…' : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download CSV & Mark as INVOICED
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
