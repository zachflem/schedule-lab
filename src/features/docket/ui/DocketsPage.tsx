import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Spinner } from '@/shared/ui';
import { useAuth } from '@/shared/lib/auth';
import { useDocketsList } from '../api/useDocketsList';
import { RejectDocketModal } from './RejectDocketModal';
import { api } from '@/shared/lib/api';
import { useToast } from '@/shared/lib/toast';

export function DocketsPage() {
  const { user } = useAuth();
  const isDispatcher = user?.role === 'dispatcher' || user?.role === 'admin';
  const [statusFilter, setStatusFilter] = useState('all');
  const { dockets, loading, error, refresh } = useDocketsList(isDispatcher ? statusFilter : 'all');
  const navigate = useNavigate();

  const { showToast } = useToast();
  const [rejectModalData, setRejectModalData] = useState<{ id: string; customerId: string; customerName: string } | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const handleValidate = async (id: string) => {
    try {
      setValidatingId(id);
      await api.post(`/dockets/${id}/validate`, {});
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error validating docket');
    } finally {
      setValidatingId(null);
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
      </div>

      {!isDispatcher ? (
        <OperatorFeed dockets={dockets} onOpen={(id) => navigate(`/docket?jobId=${id}`)} />
      ) : (
        <DispatcherFeed
          dockets={dockets}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onEdit={(jobId: string) => navigate(`/docket?jobId=${jobId}`)}
          onValidate={handleValidate}
          onReject={(id: string, custId: string, custName: string) => setRejectModalData({ id, customerId: custId, customerName: custName })}
          validatingId={validatingId}
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
    </div>
  );
}

function OperatorFeed({ dockets, onOpen }: { dockets: any[], onOpen: (jobId: string) => void }) {
  if (dockets.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
        <p style={{ color: 'var(--color-gray-500)' }}>You have no assigned jobs or dockets.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {dockets.map(docket => {
        let badgeConfig = { label: 'Not Started', color: 'gray' };
        if (docket.docket_status === 'incomplete') badgeConfig = { label: 'Needs Revision', color: 'danger' };
        else if (docket.docket_status === 'draft') badgeConfig = { label: 'In Progress', color: 'primary' };
        else if (docket.docket_status === 'completed') badgeConfig = { label: 'Awaiting Validation', color: 'success' };

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
              <button className={`btn ${docket.docket_status === 'incomplete' ? 'btn--danger' : 'btn--primary'}`} onClick={() => onOpen(docket.job_id)}>
                {docket.docket_status === 'uncompleted' ? 'Start Docket' : 'Open Docket'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DispatcherFeed({ dockets, statusFilter, setStatusFilter, onEdit, onValidate, onReject, validatingId }: any) {
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

  return (
    <>
      {/* Filter trigger */}
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
            }}>
              1
            </span>
          )}
        </button>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-400)' }}>
          {dockets.length} docket{dockets.length !== 1 ? 's' : ''}
        </span>
      </div>

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
              <button className="btn btn--secondary" onClick={() => setFilterOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="dockets-table-view card" style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer / Job</th>
              <th>Status</th>
              <th>Submitted By</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {dockets.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-gray-500)' }}>No dockets found</td></tr>
            ) : (
              dockets.map((docket: any) => (
                <tr key={docket.id}>
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
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn--secondary" style={{ marginRight: '8px', padding: '4px 8px', fontSize: '12px' }} onClick={() => onEdit(docket.job_id)}>
                      {docket.docket_status === 'validated' ? 'View' : 'Edit'}
                    </button>
                    {docket.docket_status === 'completed' && (
                      <>
                        <button
                          className="btn btn--danger"
                          style={{ marginRight: '8px', padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => onReject(docket.id, docket.customer_id, docket.customer_name)}
                        >
                          Send Back
                        </button>
                        <button
                          className="btn btn--success"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => onValidate(docket.id)}
                          disabled={validatingId === docket.id}
                        >
                          {validatingId === docket.id ? '...' : 'Validate'}
                        </button>
                      </>
                    )}
                  </td>
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
            <div key={docket.id} className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
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
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <button className="btn btn--secondary btn--sm" onClick={() => onEdit(docket.job_id)}>
                  {docket.docket_status === 'validated' ? 'View' : 'Edit'}
                </button>
                {docket.docket_status === 'completed' && (
                  <>
                    <button
                      className="btn btn--danger btn--sm"
                      onClick={() => onReject(docket.id, docket.customer_id, docket.customer_name)}
                    >
                      Send Back
                    </button>
                    <button
                      className="btn btn--success btn--sm"
                      onClick={() => onValidate(docket.id)}
                      disabled={validatingId === docket.id}
                    >
                      {validatingId === docket.id ? '...' : 'Validate'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
