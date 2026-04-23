import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/shared/lib/api';
import type { Task, TaskFile } from '@/shared/validation/schemas';
import type { Personnel } from '@/shared/validation/schemas';
import { Spinner } from '@/shared/ui';
import { useAuth } from '@/shared/lib/auth';

interface TaskModalProps {
  taskId: string | null; // null = new
  onClose: () => void;
  onSaved: () => void;
}

const isImage = (type: string) => type.startsWith('image/');

export function TaskModal({ taskId, onClose, onSaved }: TaskModalProps) {
  const { user } = useAuth();
  const isNew = taskId === null;
  const canEdit = user?.role === 'admin' || user?.role === 'dispatcher';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [task, setTask] = useState<Task | null>(null);

  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [existingFiles, setExistingFiles] = useState<TaskFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<Personnel[]>('/personnel').then(setPersonnel).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isNew) {
      api.get<Task>(`/tasks/${taskId}`)
        .then(data => {
          setTask(data);
          setTitle(data.title);
          setDescription(data.description ?? '');
          setAssigneeIds((data.assignees ?? []).map((a: any) => a.id));
          setExistingFiles(data.files ?? []);
        })
        .catch(err => setError(err instanceof Error ? err.message : 'Failed to load task'))
        .finally(() => setLoading(false));
    }
  }, [taskId, isNew]);

  const totalFiles = existingFiles.length + pendingFiles.length;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const available = 3 - totalFiles;
    if (files.length > available) {
      setError(`You can only add ${available} more file(s) (max 3 total)`);
      e.target.value = '';
      return;
    }
    setPendingFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const handleDeleteExistingFile = async (fileId: string) => {
    try {
      await api.delete(`/tasks/${taskId}/files/${fileId}`);
      setExistingFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  const handleToggleAssignee = (id: string) => {
    setAssigneeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setError(null);
    if (!title.trim()) { setError('Task title is required'); return; }

    setSaving(true);
    try {
      let activeId = taskId;

      if (isNew) {
        const { id } = await api.post<{ id: string }>('/tasks', {
          title: title.trim(),
          description: description.trim() || null,
          assignee_ids: assigneeIds,
        });
        activeId = id;
      } else {
        await api.put(`/tasks/${taskId}`, {
          title: title.trim(),
          description: description.trim() || null,
          assignee_ids: assigneeIds,
        });
      }

      for (const file of pendingFiles) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`/api/tasks/${activeId}/files`, { method: 'POST', body: fd });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error((err as any).error ?? 'File upload failed');
        }
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!taskId) return;
    setCompleting(true);
    setError(null);
    try {
      await api.patch(`/tasks/${taskId}`, { action: 'complete' });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task');
      setCompleting(false);
    }
  };

  const handleReopen = async () => {
    if (!taskId) return;
    setCompleting(true);
    setError(null);
    try {
      await api.patch(`/tasks/${taskId}`, { action: 'reopen' });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reopen task');
      setCompleting(false);
    }
  };

  const handleDelete = async () => {
    if (!taskId || !confirm('Delete this task? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/tasks/${taskId}`);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
    }
  };

  const isCompleted = task?.status === 'Completed';

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-slide-in"
        style={{ maxWidth: '640px', width: '100%' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
            {isNew ? 'New Task' : 'Edit Task'}
          </h2>
          <button type="button" className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <Spinner />
          ) : (
            <>
              {error && (
                <div style={{ padding: 'var(--space-4)', background: 'var(--color-danger-50)', color: 'var(--color-danger-700)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
                  {error}
                </div>
              )}

              {/* Status banner for completed tasks */}
              {isCompleted && (
                <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--color-success-50)', color: 'var(--color-success-700)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
                  Completed by <strong>{task.completed_by_name ?? 'Unknown'}</strong>
                  {task.completed_at && (
                    <span style={{ marginLeft: 'var(--space-2)', color: 'var(--color-success-600)' }}>
                      on {new Date(task.completed_at).toLocaleString()}
                    </span>
                  )}
                </div>
              )}

              {/* Task Details */}
              <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="card__header">
                  <h3 style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Task Details</h3>
                </div>
                <div className="card__body">
                  <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                    <label className="form-label">
                      Title <span style={{ color: 'var(--color-danger-500)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Pick up milk for the break room"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      placeholder="Optional details..."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      disabled={!canEdit}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>

              {/* Assignees */}
              {canEdit && (
                <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                  <div className="card__header">
                    <h3 style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Assign To</h3>
                  </div>
                  <div className="card__body">
                    {personnel.length === 0 ? (
                      <div style={{ color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)' }}>No personnel found.</div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-2)' }}>
                        {personnel.map(p => (
                          <label
                            key={p.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-sm)', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', background: assigneeIds.includes(p.id!) ? 'var(--color-primary-50)' : 'transparent', border: assigneeIds.includes(p.id!) ? '1px solid var(--color-primary-200)' : '1px solid transparent' }}
                          >
                            <input
                              type="checkbox"
                              checked={assigneeIds.includes(p.id!)}
                              onChange={() => handleToggleAssignee(p.id!)}
                            />
                            {p.name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Assignees read-only for operators */}
              {!canEdit && task?.assignees && task.assignees.length > 0 && (
                <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                  <div className="card__header">
                    <h3 style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Assigned To</h3>
                  </div>
                  <div className="card__body">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      {task.assignees.map((a: any) => (
                        <span key={a.id} style={{ padding: '2px 10px', background: 'var(--color-primary-50)', color: 'var(--color-primary-700)', borderRadius: '12px', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                          {a.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Files */}
              <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                    Files / Receipts <span style={{ color: 'var(--color-gray-400)', fontWeight: 400 }}>({totalFiles}/3)</span>
                  </h3>
                  {canEdit && totalFiles < 3 && (
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Add File
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                <div className="card__body">
                  {totalFiles === 0 ? (
                    canEdit ? (
                      <div
                        style={{ border: '2px dashed var(--color-gray-200)', borderRadius: 'var(--radius-md)', padding: 'var(--space-6)', textAlign: 'center', cursor: 'pointer', color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)' }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Click to attach files (images, PDFs · max 10 MB each · 3 files total)
                      </div>
                    ) : (
                      <div style={{ color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)' }}>No files attached.</div>
                    )
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {existingFiles.map(file => (
                        <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)' }}>
                          <span style={{ fontSize: '16px' }}>{isImage(file.file_type) ? '🖼️' : '📄'}</span>
                          <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--color-gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.file_name}
                          </span>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleDeleteExistingFile(file.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger-600)', fontSize: 'var(--text-lg)', lineHeight: 1, padding: '0 var(--space-1)' }}
                              title="Remove file"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      ))}
                      {pendingFiles.map((file, i) => (
                        <div key={`pending-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-primary-50)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-primary-300)' }}>
                          <span style={{ fontSize: '16px' }}>{isImage(file.type) ? '🖼️' : '📄'}</span>
                          <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--color-gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger-600)', fontSize: 'var(--text-lg)', lineHeight: 1, padding: '0 var(--space-1)' }}
                            title="Remove file"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {!loading && (
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {!isNew && canEdit && (
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={handleDelete}
                  disabled={deleting || saving || completing}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              {!isNew && !isCompleted && (
                <button
                  type="button"
                  className="btn btn--success btn--sm"
                  onClick={handleComplete}
                  disabled={completing || saving || deleting}
                  style={{ background: 'var(--color-success-600)', color: '#fff', border: 'none' }}
                >
                  {completing ? 'Saving…' : 'Mark Complete'}
                </button>
              )}
              {!isNew && isCompleted && canEdit && (
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={handleReopen}
                  disabled={completing || saving || deleting}
                >
                  {completing ? 'Saving…' : 'Reopen'}
                </button>
              )}
              <button type="button" className="btn btn--secondary" onClick={onClose} disabled={saving || deleting || completing}>
                Cancel
              </button>
              {canEdit && (
                <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saving || deleting || completing}>
                  {saving ? 'Saving…' : isNew ? 'Create Task' : 'Save Changes'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
