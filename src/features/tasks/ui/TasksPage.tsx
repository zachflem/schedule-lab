import { useState, useEffect, useCallback } from 'react';
import { api } from '@/shared/lib/api';
import type { Task } from '@/shared/validation/schemas';
import { Spinner } from '@/shared/ui';
import { useAuth } from '@/shared/lib/auth';
import { TaskModal } from './TaskModal';

function formatDate(str: string) {
  return new Date(str).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function TasksPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'dispatcher';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'completed'>('open');

  const fetchTasks = useCallback(async () => {
    try {
      const data = await api.get<Task[]>('/tasks');
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleSaved = () => {
    setEditingId(null);
    fetchTasks();
  };

  const filtered = tasks.filter(t => {
    if (filter === 'open') return t.status === 'Open';
    if (filter === 'completed') return t.status === 'Completed';
    return true;
  });

  const openCount = tasks.filter(t => t.status === 'Open').length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;

  if (loading) return <Spinner />;

  return (
    <div className="container p-8">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 className="docket-page__title">Tasks</h1>
        {canEdit && (
          <button className="btn btn--primary" onClick={() => setEditingId('new')}>New Task</button>
        )}
      </div>

      {error && (
        <div style={{ padding: 'var(--space-4)', background: 'var(--color-danger-50)', color: 'var(--color-danger-700)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        {(['open', 'completed', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn btn--sm ${filter === f ? 'btn--primary' : 'btn--secondary'}`}
          >
            {f === 'open' && `Open (${openCount})`}
            {f === 'completed' && `Completed (${completedCount})`}
            {f === 'all' && `All (${tasks.length})`}
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="list-table-view card" style={{ overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
              <th style={{ textAlign: 'left', padding: 'var(--space-3)' }}>Task</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-3)' }}>Assigned To</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-3)' }}>Status</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-3)' }}>Created</th>
              <th style={{ textAlign: 'right', padding: 'var(--space-3)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(task => (
              <tr
                key={task.id}
                style={{ borderBottom: '1px solid var(--color-gray-100)', opacity: task.status === 'Completed' ? 0.7 : 1 }}
              >
                <td style={{ padding: 'var(--space-3)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>{task.title}</div>
                  {task.description && (
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginTop: '2px', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.description}
                    </div>
                  )}
                  {task.files && task.files.length > 0 && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginTop: '2px' }}>
                      {task.files.length} file{task.files.length !== 1 ? 's' : ''} attached
                    </div>
                  )}
                </td>
                <td style={{ padding: 'var(--space-3)' }}>
                  {task.assignees && task.assignees.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {(task.assignees as any[]).map((a: any) => (
                        <span key={a.id} style={{ padding: '2px 8px', background: 'var(--color-primary-50)', color: 'var(--color-primary-700)', borderRadius: '12px', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                          {a.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--color-gray-300)', fontSize: 'var(--text-sm)' }}>Unassigned</span>
                  )}
                </td>
                <td style={{ padding: 'var(--space-3)' }}>
                  {task.status === 'Completed' ? (
                    <div>
                      <span style={{ padding: '2px 8px', background: 'var(--color-success-50)', color: 'var(--color-success-700)', borderRadius: '12px', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                        Completed
                      </span>
                      {task.completed_by_name && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginTop: '2px' }}>
                          by {task.completed_by_name}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ padding: '2px 8px', background: 'var(--color-warning-50)', color: 'var(--color-warning-600)', borderRadius: '12px', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                      Open
                    </span>
                  )}
                </td>
                <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
                  {task.created_at ? formatDate(task.created_at) : '—'}
                  {task.created_by_name && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>by {task.created_by_name}</div>
                  )}
                </td>
                <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                  <button
                    className="btn btn--secondary btn--sm"
                    onClick={() => setEditingId(task.id!)}
                  >
                    {canEdit || task.status === 'Open' ? 'Open' : 'View'}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                  {filter === 'open' ? 'No open tasks.' : filter === 'completed' ? 'No completed tasks yet.' : 'No tasks found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="list-card-view">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-gray-400)' }}>
            {filter === 'open' ? 'No open tasks.' : filter === 'completed' ? 'No completed tasks yet.' : 'No tasks found.'}
          </div>
        ) : filtered.map(task => (
          <div
            key={task.id}
            className="card"
            style={{ padding: 'var(--space-4)', opacity: task.status === 'Completed' ? 0.75 : 1 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-gray-900)' }}>{task.title}</div>
                {task.description && (
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginTop: '2px' }}>{task.description}</div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)', marginLeft: 'var(--space-3)' }}>
                {task.status === 'Completed' ? (
                  <span style={{ padding: '2px 8px', background: 'var(--color-success-50)', color: 'var(--color-success-700)', borderRadius: '12px', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                    Done
                  </span>
                ) : (
                  <span style={{ padding: '2px 8px', background: 'var(--color-warning-50)', color: 'var(--color-warning-600)', borderRadius: '12px', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                    Open
                  </span>
                )}
                <button className="btn btn--secondary btn--sm" onClick={() => setEditingId(task.id!)}>
                  Open
                </button>
              </div>
            </div>

            {task.assignees && task.assignees.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'var(--space-2)' }}>
                {(task.assignees as any[]).map((a: any) => (
                  <span key={a.id} style={{ padding: '2px 8px', background: 'var(--color-primary-50)', color: 'var(--color-primary-700)', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                    {a.name}
                  </span>
                ))}
              </div>
            )}

            <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', display: 'flex', gap: 'var(--space-3)' }}>
              {task.created_at && <span>{formatDate(task.created_at)}</span>}
              {task.files && task.files.length > 0 && <span>{task.files.length} file{task.files.length !== 1 ? 's' : ''}</span>}
              {task.status === 'Completed' && task.completed_by_name && (
                <span>Completed by {task.completed_by_name}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {editingId !== null && (
        <TaskModal
          taskId={editingId === 'new' ? null : editingId}
          onClose={() => setEditingId(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
