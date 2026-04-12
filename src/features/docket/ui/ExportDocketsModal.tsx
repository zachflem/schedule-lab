import { useState } from 'react';

interface ExportDocketsModalProps {
  docketIds: string[];
  onClose: () => void;
  onExported: () => void;
}

type AccountingPackage = 'xero';

const PACKAGES: { id: AccountingPackage; label: string; available: boolean }[] = [
  { id: 'xero', label: 'Xero', available: true },
];

const COMING_SOON = ['MYOB', 'QuickBooks', 'Reckon'];

export function ExportDocketsModal({ docketIds, onClose, onExported }: ExportDocketsModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<AccountingPackage>('xero');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const response = await fetch('/api/dockets/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: docketIds, format: selectedPackage }),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? 'Export failed');
      }

      // Trigger file download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      a.download = `dockets-export-${selectedPackage}-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onExported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      setExporting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-content modal-slide-in"
        style={{ maxWidth: '480px', width: '100%' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Export to Accounting</h2>
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
            Each docket will be exported as a separate invoice.
          </div>

          {/* Package selection */}
          <div>
            <label className="form-label" style={{ marginBottom: 'var(--space-3)', display: 'block' }}>
              Accounting Package
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {PACKAGES.map(pkg => (
                <label
                  key={pkg.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    border: `1px solid ${selectedPackage === pkg.id ? 'var(--color-primary-400)' : 'var(--color-gray-200)'}`,
                    borderRadius: 'var(--radius-md)',
                    background: selectedPackage === pkg.id ? 'var(--color-primary-50)' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="radio"
                    name="package"
                    value={pkg.id}
                    checked={selectedPackage === pkg.id}
                    onChange={() => setSelectedPackage(pkg.id)}
                    style={{ accentColor: 'var(--color-primary-600)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-gray-900)' }}>
                      {pkg.label}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
                      Exports as Xero invoice import CSV
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
            className="btn btn--primary"
            onClick={handleExport}
            disabled={exporting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            {exporting ? (
              'Generating...'
            ) : (
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
        </div>
      </div>
    </div>
  );
}
