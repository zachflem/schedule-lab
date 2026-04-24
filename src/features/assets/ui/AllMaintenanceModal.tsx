import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/shared/lib/api';
import { Spinner, ErrorMessage } from '@/shared/ui';
import { MaintenanceTaskModal } from './MaintenanceTaskModal';

interface MaintenanceTaskSummary {
  id: string;
  asset_id: string;
  asset_name: string;
  service_interval_type: 'hours' | 'odometer';
  current_machine_hours: number;
  current_odometer: number;
  activity_type: string;
  type_other: string | null;
  performed_by: string;
  description: string;
  cost: number | null;
  performed_at: string | null;
  meter_reading: number | null;
  created_at: string;
  photo_count: number;
  doc_count: number;
}

interface AllMaintenanceModalProps {
  onClose: () => void;
}

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  'Scheduled Service': { bg: 'var(--color-primary-50)', color: 'var(--color-primary-700)' },
  'General Repair':    { bg: 'var(--color-warning-50)', color: 'var(--color-warning-700)' },
  'Breakdown':         { bg: 'var(--color-danger-50)',  color: 'var(--color-danger-700)'  },
  'Other':             { bg: 'var(--color-gray-100)',   color: 'var(--color-gray-700)'    },
};

const DEFAULT_DAYS = 90;

function nDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function dateOf(task: MaintenanceTaskSummary): string {
  return (task.performed_at ?? task.created_at).slice(0, 10);
}

export function AllMaintenanceModal({ onClose }: AllMaintenanceModalProps) {
  const defaultFrom = useMemo(() => nDaysAgo(DEFAULT_DAYS), []);

  const [tasks, setTasks]       = useState<MaintenanceTaskSummary[]>([]);
  const [loading, setLoading]   = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]     = useState('');
  const [loadedFrom, setLoadedFrom] = useState(defaultFrom);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTaskSummary | null>(null);

  const fetchTasks = useCallback(async (from: string) => {
    setFetching(true);
    setError(null);
    try {
      const data = await api.get<MaintenanceTaskSummary[]>('/maintenance', { from });
      setTasks(data);
      setLoadedFrom(from);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load maintenance tasks');
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => { fetchTasks(defaultFrom); }, [fetchTasks, defaultFrom]);

  useEffect(() => {
    if (fromDate && fromDate < loadedFrom) {
      fetchTasks(fromDate);
    }
  }, [fromDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      const d = dateOf(t);
      if (fromDate && d < fromDate) return false;
      if (toDate   && d > toDate)   return false;
      return true;
    });
  }, [tasks, fromDate, toDate]);

  const hasFilter = fromDate || toDate;
  const expandedBeyondDefault = loadedFrom < defaultFrom;

  const handleTaskSaved = () => {
    setSelectedTask(null);
    fetchTasks(loadedFrom);
  };

  return createPortal(
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content modal-slide-in"
          style={{ maxWidth: '1000px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-header">
            <div>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>All Maintenance Tasks</h2>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginTop: '2px' }}>
                {!loading && `${filtered.length} record${filtered.length !== 1 ? 's' : ''}${hasFilter ? ' (filtered)' : ''}`}
              </div>
            </div>
            <button type="button" className="btn-close" onClick={onClose}>&times;</button>
          </div>

          {/* Filter bar */}
          <div style={{ padding: 'var(--space-3) var(--space-6)', borderBottom: '1px solid var(--color-gray-200)', background: 'var(--color-gray-50)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-gray-600)', whiteSpace: 'nowrap' }}>Date range</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: '160px', fontSize: 'var(--text-sm)', padding: 'var(--space-1) var(--space-2)' }}
                  value={fromDate}
                  disabled={fetching}
                  onChange={e => setFromDate(e.target.value)}
                />
                <span style={{ color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)' }}>to</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: '160px', fontSize: 'var(--text-sm)', padding: 'var(--space-1) var(--space-2)' }}
                  value={toDate}
                  disabled={fetching}
                  onChange={e => setToDate(e.target.value)}
                />
              </div>
              {fetching && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <Spinner /> Loading…
                </span>
              )}
              {hasFilter && !fetching && (
                <button className="btn btn--secondary btn--sm" onClick={() => { setFromDate(''); setToDate(''); }}>
                  Clear
                </button>
              )}
            </div>

            {!loading && (
              <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>
                {expandedBeyondDefault
                  ? `Loaded from ${formatDateShort(loadedFrom)} to today.`
                  : `Showing last ${DEFAULT_DAYS} days (from ${formatDateShort(loadedFrom)}).`
                }
                {' '}Set an earlier start date to load further back.
              </div>
            )}
          </div>

          <div className="modal-body" style={{ flex: 1, overflow: 'auto' }}>
            {error && <ErrorMessage message={error} style={{ marginBottom: 'var(--space-4)' }} />}

            {loading ? (
              <Spinner />
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-gray-400)' }}>
                {hasFilter ? 'No maintenance tasks in this date range.' : 'No maintenance tasks recorded yet.'}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="list-table-view">
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
                        <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)' }}>Asset</th>
                        <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)' }}>Type</th>
                        <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)' }}>Performed By</th>
                        <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', maxWidth: '200px' }}>Description</th>
                        <th style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)', whiteSpace: 'nowrap' }}>Date / Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(task => {
                        const typeColor = TYPE_COLORS[task.activity_type] ?? TYPE_COLORS['Other'];
                        const label = task.activity_type === 'Other' && task.type_other
                          ? `Other: ${task.type_other}`
                          : task.activity_type;
                        return (
                          <tr
                            key={task.id}
                            style={{ borderBottom: '1px solid var(--color-gray-100)', cursor: 'pointer' }}
                            onClick={() => setSelectedTask(task)}
                          >
                            <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-gray-900)', whiteSpace: 'nowrap' }}>
                              {task.asset_name}
                            </td>
                            <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: typeColor.bg, color: typeColor.color, whiteSpace: 'nowrap' }}>
                                {label}
                              </span>
                            </td>
                            <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-gray-700)', whiteSpace: 'nowrap' }}>
                              {task.performed_by}
                            </td>
                            <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', maxWidth: '200px' }}>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</div>
                            </td>
                            <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', whiteSpace: 'nowrap' }}>
                              {formatDateTime(task.performed_at ?? task.created_at)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card view */}
                <div className="list-card-view">
                  {filtered.map(task => {
                    const typeColor = TYPE_COLORS[task.activity_type] ?? TYPE_COLORS['Other'];
                    const label = task.activity_type === 'Other' && task.type_other
                      ? `Other: ${task.type_other}`
                      : task.activity_type;
                    return (
                      <div
                        key={task.id}
                        className="card"
                        style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-3)', cursor: 'pointer' }}
                        onClick={() => setSelectedTask(task)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-gray-900)' }}>{task.asset_name}</div>
                            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: typeColor.bg, color: typeColor.color, display: 'inline-block', marginTop: '4px' }}>
                              {label}
                            </span>
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', textAlign: 'right' }}>
                            {formatDateTime(task.performed_at ?? task.created_at)}
                          </div>
                        </div>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-gray-700)', marginBottom: 'var(--space-1)' }}>
                          {task.performed_by}
                        </div>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)' }}>{task.description}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {selectedTask && (
        <MaintenanceTaskModal
          assetId={selectedTask.asset_id}
          taskId={selectedTask.id}
          serviceIntervalType={selectedTask.service_interval_type}
          currentReading={selectedTask.service_interval_type === 'hours' ? selectedTask.current_machine_hours : selectedTask.current_odometer}
          onClose={() => setSelectedTask(null)}
          onSaved={handleTaskSaved}
        />
      )}
    </>,
    document.body
  );
}
