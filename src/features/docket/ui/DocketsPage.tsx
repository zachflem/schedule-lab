import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Spinner } from '@/shared/ui';
import { useAuth } from '@/shared/lib/auth';
import { useDocketsList } from '../api/useDocketsList';
import { RejectDocketModal } from './RejectDocketModal';
import { ValidateDocketModal } from './ValidateDocketModal';
import { ExportDocketsModal } from './ExportDocketsModal';
import { useToast } from '@/shared/lib/toast';

export function DocketsPage() {
  const { user } = useAuth();
  const isDispatcher = user?.role === 'dispatcher' || user?.role === 'admin';
  const [statusFilter, setStatusFilter] = useState('all');
  const { dockets, loading, error, refresh } = useDocketsList(isDispatcher ? statusFilter : 'all');

  const { showToast } = useToast();
  const navigate = useNavigate();

  // Validate modal
  const [validateData, setValidateData] = useState<{ id: string; jobId: string } | null>(null);

  // Reject modal (used standalone from table, separate from validate flow)
  const [rejectModalData, setRejectModalData] = useState<{ id: string; customerName: string } | null>(null);

  // Export mode
  const [exportMode, setExportMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);

  const toggleExportMode = () => {
    if (exportMode) {
      setExportMode(false);
      setSelectedIds(new Set());
      setStatusFilter('all');
    } else {
      setExportMode(true);
      setSelectedIds(new Set());
      setStatusFilter('validated');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === dockets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(dockets.map((d: any) => d.id)));
    }
  };

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="container">
        <div style={{ color: 'var(--color-danger-700)', padding: 'var(--space-4)', background: 'var(--color-danger-50)' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Dockets</h1>
        {isDispatcher && (
          <button
            className={`btn ${exportMode ? 'btn--primary' : 'btn--secondary'}`}
            onClick={toggleExportMode}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exportMode ? 'Cancel Export' : 'Export'}
          </button>
        )}
      </div>

      {/* Export mode banner */}
      {exportMode && (
        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--color-primary-50)',
          border: '1px solid var(--color-primary-200)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-primary-800)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Showing validated dockets. Select dockets to export.
        </div>
      )}

      {!isDispatcher ? (
        <OperatorFeed dockets={dockets} onOpen={(jobId) => navigate(`/docket?jobId=${jobId}`)} />
      ) : (
        <DispatcherFeed
          dockets={dockets}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          exportMode={exportMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onValidate={(id, jobId) => setValidateData({ id, jobId })}
          onReject={(id, customerName) => setRejectModalData({ id, customerName })}
          onNavigate={(jobId) => navigate(`/docket?jobId=${jobId}`)}
        />
      )}

      {/* Floating export action bar */}
      {exportMode && selectedIds.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 'var(--space-6)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--color-gray-900)',
          color: 'white',
          padding: 'var(--space-3) var(--space-5)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          zIndex: 100,
        }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
            {selectedIds.size} docket{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <button
            className="btn btn--primary"
            onClick={() => setShowExportModal(true)}
          >
            Export to Accounting
          </button>
        </div>
      )}

      {validateData && (
        <ValidateDocketModal
          docketId={validateData.id}
          jobId={validateData.jobId}
          onClose={() => setValidateData(null)}
          onValidated={() => {
            setValidateData(null);
            refresh();
            showToast('Docket validated successfully', 'success');
          }}
          onSentBack={() => {
            setValidateData(null);
            refresh();
            showToast('Docket sent back to operator', 'warning');
          }}
        />
      )}

      {rejectModalData && (
        <RejectDocketModal
          docketId={rejectModalData.id}
          customerName={rejectModalData.customerName}
          onClose={() => setRejectModalData(null)}
          onSuccess={() => {
            setRejectModalData(null);
            refresh();
            showToast('Docket sent back to operator', 'warning');
          }}
        />
      )}

      {showExportModal && (
        <ExportDocketsModal
          docketIds={Array.from(selectedIds)}
          onClose={() => setShowExportModal(false)}
          onExported={() => {
            setShowExportModal(false);
          }}
        />
      )}
    </div>
  );
}

// ── OperatorFeed ──────────────────────────────────────────────────────────────

function OperatorFeed({ dockets, onOpen }: { dockets: any[]; onOpen: (jobId: string) => void }) {
  if (dockets.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
        <p style={{ color: 'var(--color-gray-500)' }}>You have no assigned jobs or dockets.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {dockets.map((docket: any) => {
        let badgeConfig = { label: 'Not Started', color: 'gray' };
        if (docket.docket_status === 'incomplete') badgeConfig = { label: 'Needs Revision', color: 'danger' };
        else if (docket.docket_status === 'draft') badgeConfig = { label: 'In Progress', color: 'primary' };
        else if (docket.docket_status === 'completed') badgeConfig = { label: 'Awaiting Validation', color: 'success' };
        else if (docket.docket_status === 'validated') badgeConfig = { label: 'Validated', color: 'success' };

        return (
          <div key={docket.id} className="card" style={{ padding: 'var(--space-4)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
              <div>
                <h3 style={{ margin: '0 0 var(--space-1)' }}>{docket.customer_name}</h3>
                <p style={{ margin: 0, color: 'var(--color-gray-600)', fontSize: 'var(--text-sm)' }}>
                  {docket.location || 'No location specified'}
                </p>
              </div>
              <span className={`badge badge--${badgeConfig.color}`}>{badgeConfig.label}</span>
            </div>

            {docket.docket_status === 'incomplete' && docket.dispatcher_notes && (
              <div style={{ padding: 'var(--space-2)', background: 'var(--color-danger-50)', borderLeft: '3px solid var(--color-danger-500)', fontSize: 'var(--text-sm)', color: 'var(--color-danger-900)', margin: 'var(--space-3) 0' }}>
                <strong>Note from Dispatch:</strong> {docket.dispatcher_notes}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>
                {docket.scheduled_start ? `Scheduled: ${new Date(docket.scheduled_start).toLocaleString()}` : ''}
              </div>
              {docket.docket_status !== 'validated' && (
                <button
                  className={`btn ${docket.docket_status === 'incomplete' ? 'btn--danger' : 'btn--primary'}`}
                  onClick={() => onOpen(docket.job_id)}
                >
                  {docket.docket_status === 'uncompleted' ? 'Start Docket' : 'Open Docket'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── DispatcherFeed ────────────────────────────────────────────────────────────

interface DispatcherFeedProps {
  dockets: any[];
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  exportMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onValidate: (id: string, jobId: string) => void;
  onReject: (id: string, customerName: string) => void;
  onNavigate: (jobId: string) => void;
}

function DispatcherFeed({
  dockets, statusFilter, setStatusFilter,
  exportMode, selectedIds, onToggleSelect, onToggleSelectAll,
  onValidate, onReject, onNavigate,
}: DispatcherFeedProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  const tabs = [
    { value: 'all', label: 'All Dockets' },
    { value: 'completed', label: 'Needs Validation' },
    { value: 'draft', label: 'In Progress' },
    { value: 'incomplete', label: 'Sent Back' },
    { value: 'validated', label: 'Validated' },
  ];

  const activeLabel = tabs.find(t => t.value === statusFilter)?.label ?? 'All Dockets';
  const isFiltered = statusFilter !== 'all';
  const allSelected = dockets.length > 0 && selectedIds.size === dockets.length;

  return (
    <>
      {/* Filter trigger */}
      {!exportMode && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <button
            className="btn btn--secondary"
            onClick={() => setFilterOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            {activeLabel}
            {isFiltered && (
              <span style={{
                background: 'var(--color-primary-600)',
                color: 'white',
                borderRadius: '999px',
                fontSize: '10px',
                fontWeight: 700,
                padding: '1px 6px',
                lineHeight: '1.4',
              }}>1</span>
            )}
          </button>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-400)' }}>
            {dockets.length} docket{dockets.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {exportMode && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
            {dockets.length} validated docket{dockets.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Filter modal */}
      {filterOpen && (
        <div className="modal-overlay" onClick={() => setFilterOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(360px, calc(100vw - 2rem))' }}
          >
            <div className="modal-header">
              <h2>Filter Dockets</h2>
              <button className="btn-close" onClick={() => setFilterOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {tabs.map((tab) => {
                  const isActive = statusFilter === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => { setStatusFilter(tab.value); setFilterOpen(false); }}
                      style={{
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${isActive ? 'var(--color-primary-200)' : 'var(--color-gray-200)'}`,
                        background: isActive ? 'var(--color-primary-50)' : 'white',
                        color: isActive ? 'var(--color-primary-700)' : 'var(--color-gray-700)',
                        fontWeight: 600,
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: '44px',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <span>{tab.label}</span>
                      {isActive && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn--secondary" onClick={() => setFilterOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="dockets-table-view card" style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              {exportMode && (
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleSelectAll}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                </th>
              )}
              <th>Date</th>
              <th>Customer / Job</th>
              <th>Status</th>
              <th>Submitted By</th>
              {!exportMode && <th style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {dockets.length === 0 ? (
              <tr>
                <td colSpan={exportMode ? 4 : 5} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-gray-500)' }}>
                  No dockets found
                </td>
              </tr>
            ) : (
              dockets.map((docket: any) => (
                <tr
                  key={docket.id}
                  style={exportMode ? { cursor: 'pointer', background: selectedIds.has(docket.id) ? 'var(--color-primary-50)' : undefined } : undefined}
                  onClick={exportMode ? () => onToggleSelect(docket.id) : undefined}
                >
                  {exportMode && (
                    <td onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(docket.id)}
                        onChange={() => onToggleSelect(docket.id)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </td>
                  )}
                  <td>{docket.date}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{docket.customer_name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>{docket.location || '-'}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      docket.docket_status === 'validated' ? 'badge--success' :
                      docket.docket_status === 'completed' ? 'badge--primary' :
                      docket.docket_status === 'incomplete' ? 'badge--danger' :
                      'badge--warning'
                    }`}>
                      {docket.docket_status.toUpperCase()}
                    </span>
                  </td>
                  <td>{docket.submitted_by_name || '-'}</td>
                  {!exportMode && (
                    <td style={{ textAlign: 'right' }}>
                      {docket.docket_status === 'completed' && (
                        <>
                          <button
                            className="btn btn--danger"
                            style={{ marginRight: '8px', padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => onReject(docket.id, docket.customer_name)}
                          >
                            Send Back
                          </button>
                          <button
                            className="btn btn--success"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => onValidate(docket.id, docket.job_id)}
                          >
                            Review & Validate
                          </button>
                        </>
                      )}
                      {docket.docket_status !== 'completed' && (
                        <button
                          className="btn btn--secondary"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => onNavigate(docket.job_id)}
                        >
                          {docket.docket_status === 'validated' ? 'View' : 'Edit'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="dockets-card-view">
        {dockets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-gray-500)' }}>No dockets found</div>
        ) : (
          dockets.map((docket: any) => (
            <div
              key={docket.id}
              className="card"
              style={{
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-3)',
                cursor: exportMode ? 'pointer' : undefined,
                background: exportMode && selectedIds.has(docket.id) ? 'var(--color-primary-50)' : undefined,
                border: exportMode && selectedIds.has(docket.id) ? '1px solid var(--color-primary-300)' : undefined,
              }}
              onClick={exportMode ? () => onToggleSelect(docket.id) : undefined}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                {exportMode && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(docket.id)}
                    onChange={() => onToggleSelect(docket.id)}
                    onClick={e => e.stopPropagation()}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', marginRight: 'var(--space-2)', marginTop: '2px' }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-gray-900)', marginBottom: '2px' }}>{docket.customer_name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>{docket.location || '-'}</div>
                </div>
                <span className={`badge ${
                  docket.docket_status === 'validated' ? 'badge--success' :
                  docket.docket_status === 'completed' ? 'badge--primary' :
                  docket.docket_status === 'incomplete' ? 'badge--danger' :
                  'badge--warning'
                }`} style={{ marginLeft: 'var(--space-2)', flexShrink: 0 }}>
                  {docket.docket_status.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginBottom: 'var(--space-3)' }}>
                <span>{docket.date}</span>
                <span>{docket.submitted_by_name || '-'}</span>
              </div>
              {!exportMode && (
                <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                  {docket.docket_status === 'completed' && (
                    <>
                      <button
                        className="btn btn--danger btn--sm"
                        onClick={() => onReject(docket.id, docket.customer_name)}
                      >
                        Send Back
                      </button>
                      <button
                        className="btn btn--success btn--sm"
                        onClick={() => onValidate(docket.id, docket.job_id)}
                      >
                        Review & Validate
                      </button>
                    </>
                  )}
                  {docket.docket_status !== 'completed' && (
                    <a
                      href={`/docket?jobId=${docket.job_id}`}
                      className="btn btn--secondary btn--sm"
                    >
                      {docket.docket_status === 'validated' ? 'View' : 'Edit'}
                    </a>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
