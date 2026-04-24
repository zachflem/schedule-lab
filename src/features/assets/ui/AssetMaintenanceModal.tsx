import { useState, useEffect, useCallback } from 'react';
import { api } from '@/shared/lib/api';
import type { AssetMaintenanceActivityDetail } from '@/shared/validation/schemas';
import { Spinner, ErrorMessage } from '@/shared/ui';
import { MaintenanceTaskModal } from './MaintenanceTaskModal';

interface AssetMaintenanceModalProps {
  assetId: string;
  assetName: string;
  serviceIntervalType: 'hours' | 'odometer';
  currentMachineHours: number;
  currentOdometer: number;
  onClose: () => void;
}

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  'Scheduled Service': { bg: 'var(--color-primary-50)', color: 'var(--color-primary-700)' },
  'General Repair':    { bg: 'var(--color-warning-50)', color: 'var(--color-warning-700)' },
  'Breakdown':         { bg: 'var(--color-danger-50)',  color: 'var(--color-danger-700)'  },
  'Other':             { bg: 'var(--color-gray-100)',   color: 'var(--color-gray-700)'    },
};

function formatCost(cost: number | null | undefined): string {
  if (cost == null) return '—';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cost);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

export function AssetMaintenanceModal({
  assetId, assetName, serviceIntervalType, currentMachineHours, currentOdometer, onClose,
}: AssetMaintenanceModalProps) {
  const [activities, setActivities] = useState<AssetMaintenanceActivityDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | 'new' | null>(null);

  // Keep a live copy of the current reading so the task modal sees updates after saves
  const [currentReading, setCurrentReading] = useState(
    serviceIntervalType === 'hours' ? currentMachineHours : currentOdometer
  );

  const fetchActivities = useCallback(async () => {
    try {
      const data = await api.get<AssetMaintenanceActivityDetail[]>(`/assets/${assetId}/maintenance`);
      setActivities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load maintenance records');
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const handleTaskSaved = () => {
    setTaskId(null);
    setLoading(true);
    // Re-fetch activities; also refresh the current reading from the latest activity meter values
    fetchActivities().then(() => {
      // Pull the highest meter reading recorded to keep the hint accurate
      setActivities(prev => {
        const highest = prev.reduce((max, a) => (a.meter_reading ?? 0) > max ? (a.meter_reading ?? 0) : max, currentReading);
        setCurrentReading(highest);
        return prev;
      });
    });
  };

  const meterUnit = serviceIntervalType === 'hours' ? 'hrs' : 'km';

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content modal-slide-in"
          style={{ maxWidth: '920px', width: '100%' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-header">
            <div>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Maintenance</h2>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginTop: '2px' }}>{assetName}</div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <button className="btn btn--primary btn--sm" onClick={() => setTaskId('new')}>New Task</button>
              <button type="button" className="btn-close" onClick={onClose}>&times;</button>
            </div>
          </div>

          <div className="modal-body">
            {error && <ErrorMessage message={error} style={{ marginBottom: 'var(--space-4)' }} />}

            {loading ? (
              <Spinner />
            ) : activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-gray-400)' }}>
                <div style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-2)' }}>No maintenance records yet</div>
                <div style={{ fontSize: 'var(--text-sm)' }}>Click <strong>New Task</strong> to log the first activity.</div>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="list-table-view" style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
                        <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)' }}>Type</th>
                        <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)' }}>Performed By</th>
                        <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', maxWidth: '220px' }}>Description</th>
                        <th style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)' }}>Cost</th>
                        <th style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)' }}>Meter ({meterUnit})</th>
                        <th style={{ textAlign: 'center', padding: 'var(--space-3) var(--space-4)' }}>Files</th>
                        <th style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)', whiteSpace: 'nowrap' }}>Date / Time</th>
                        <th style={{ padding: 'var(--space-3) var(--space-4)' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map(activity => {
                        const typeColor = TYPE_COLORS[activity.activity_type] ?? TYPE_COLORS['Other'];
                        const label = activity.activity_type === 'Other' && activity.type_other
                          ? `Other: ${activity.type_other}`
                          : activity.activity_type;
                        const displayDate = activity.performed_at ?? activity.created_at;
                        return (
                          <tr key={activity.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                            <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: typeColor.bg, color: typeColor.color, whiteSpace: 'nowrap' }}>
                                {label}
                              </span>
                            </td>
                            <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-gray-700)' }}>
                              {activity.performed_by}
                            </td>
                            <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', maxWidth: '220px' }}>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activity.description}</div>
                            </td>
                            <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontSize: 'var(--text-sm)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                              {formatCost(activity.cost)}
                            </td>
                            <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontSize: 'var(--text-sm)', color: 'var(--color-gray-700)', whiteSpace: 'nowrap' }}>
                              {activity.meter_reading != null ? `${activity.meter_reading.toLocaleString()} ${meterUnit}` : '—'}
                            </td>
                            <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
                              {activity.photos.length > 0 && <span title={`${activity.photos.length} photo(s)`}>📷 {activity.photos.length}</span>}
                              {activity.docs.length > 0 && <span style={{ marginLeft: 'var(--space-2)' }} title={`${activity.docs.length} doc(s)`}>📄 {activity.docs.length}</span>}
                              {activity.photos.length === 0 && activity.docs.length === 0 && '—'}
                            </td>
                            <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', whiteSpace: 'nowrap' }}>
                              {formatDateTime(displayDate)}
                            </td>
                            <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                              <button className="btn btn--secondary btn--sm" onClick={() => setTaskId(activity.id!)}>Edit</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card view */}
                <div className="list-card-view">
                  {activities.map(activity => {
                    const typeColor = TYPE_COLORS[activity.activity_type] ?? TYPE_COLORS['Other'];
                    const label = activity.activity_type === 'Other' && activity.type_other
                      ? `Other: ${activity.type_other}`
                      : activity.activity_type;
                    const displayDate = activity.performed_at ?? activity.created_at;
                    return (
                      <div key={activity.id} className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: typeColor.bg, color: typeColor.color }}>
                            {label}
                          </span>
                          <button className="btn btn--secondary btn--sm" onClick={() => setTaskId(activity.id!)}>Edit</button>
                        </div>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-gray-800)', marginBottom: 'var(--space-1)' }}>{activity.performed_by}</div>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', marginBottom: 'var(--space-2)' }}>{activity.description}</div>
                        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
                          <span>{formatDateTime(displayDate)}</span>
                          {activity.meter_reading != null && <span>{activity.meter_reading.toLocaleString()} {meterUnit}</span>}
                          {activity.cost != null && <span style={{ fontWeight: 600, color: 'var(--color-gray-700)' }}>{formatCost(activity.cost)}</span>}
                          {activity.photos.length > 0 && <span>📷 {activity.photos.length}</span>}
                          {activity.docs.length > 0 && <span>📄 {activity.docs.length}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {taskId !== null && (
        <MaintenanceTaskModal
          assetId={assetId}
          taskId={taskId === 'new' ? null : taskId}
          serviceIntervalType={serviceIntervalType}
          currentReading={currentReading}
          onClose={() => setTaskId(null)}
          onSaved={handleTaskSaved}
        />
      )}
    </>
  );
}
