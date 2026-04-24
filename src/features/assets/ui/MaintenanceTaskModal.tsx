import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/shared/lib/api';
import { MAINTENANCE_ACTIVITY_TYPES, type AssetMaintenanceActivityDetail, type MaintenanceFile } from '@/shared/validation/schemas';
import { Spinner, ErrorMessage } from '@/shared/ui';

interface MaintenanceTaskModalProps {
  assetId: string;
  taskId: string | null; // null = new
  serviceIntervalType: 'hours' | 'odometer';
  currentReading: number;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  activity_type: typeof MAINTENANCE_ACTIVITY_TYPES[number];
  type_other: string;
  performed_by: string;
  description: string;
  cost: string;
  performed_at: string;
  meter_reading: string;
}

function localDateTimeNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultForm(): FormState {
  return {
    activity_type: 'Scheduled Service',
    type_other: '',
    performed_by: '',
    description: '',
    cost: '',
    performed_at: localDateTimeNow(),
    meter_reading: '',
  };
}

export function MaintenanceTaskModal({ assetId, taskId, serviceIntervalType, currentReading, onClose, onSaved }: MaintenanceTaskModalProps) {
  const isNew = taskId === null;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());

  const [existingPhotos, setExistingPhotos] = useState<MaintenanceFile[]>([]);
  const [existingDocs, setExistingDocs] = useState<MaintenanceFile[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [pendingDocs, setPendingDocs] = useState<File[]>([]);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const meterLabel = serviceIntervalType === 'hours' ? 'Machine Hours' : 'Odometer (km)';
  const meterUnit  = serviceIntervalType === 'hours' ? 'hrs' : 'km';

  useEffect(() => {
    if (!isNew) {
      api.get<AssetMaintenanceActivityDetail>(`/assets/${assetId}/maintenance/${taskId}`)
        .then(data => {
          setForm({
            activity_type: data.activity_type,
            type_other: data.type_other ?? '',
            performed_by: data.performed_by,
            description: data.description,
            cost: data.cost != null ? String(data.cost) : '',
            performed_at: data.performed_at ?? localDateTimeNow(),
            meter_reading: data.meter_reading != null ? String(data.meter_reading) : '',
          });
          setExistingPhotos(data.photos);
          setExistingDocs(data.docs);
        })
        .catch(err => setError(err instanceof Error ? err.message : 'Failed to load task'))
        .finally(() => setLoading(false));
    }
  }, [assetId, taskId, isNew]);

  const totalPhotos = existingPhotos.length + pendingPhotos.length;
  const totalDocs   = existingDocs.length + pendingDocs.length;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const available = 10 - totalPhotos;
    if (files.length > available) {
      setError(`You can only add ${available} more photo(s) (max 10 total)`);
      e.target.value = '';
      return;
    }
    setPendingPhotos(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const available = 10 - totalDocs;
    if (files.length > available) {
      setError(`You can only add ${available} more document(s) (max 10 total)`);
      e.target.value = '';
      return;
    }
    setPendingDocs(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const handleDeleteExistingPhoto = async (photoId: string) => {
    try {
      await api.delete(`/assets/${assetId}/maintenance/${taskId}/photos/${photoId}`);
      setExistingPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete photo');
    }
  };

  const handleDeleteExistingDoc = async (docId: string) => {
    try {
      await api.delete(`/assets/${assetId}/maintenance/${taskId}/docs/${docId}`);
      setExistingDocs(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);

    const costValue = form.cost.trim() ? parseFloat(form.cost) : null;
    if (form.cost.trim() && (isNaN(costValue!) || costValue! < 0)) {
      setError('Cost must be a valid positive number');
      setSaving(false);
      return;
    }

    const meterValue = form.meter_reading.trim() ? parseFloat(form.meter_reading) : null;
    if (form.meter_reading.trim() && (isNaN(meterValue!) || meterValue! < 0)) {
      setError(`${meterLabel} must be a valid positive number`);
      setSaving(false);
      return;
    }

    const payload = {
      activity_type: form.activity_type,
      type_other: form.activity_type === 'Other' ? form.type_other.trim() || null : null,
      performed_by: form.performed_by.trim(),
      description: form.description.trim(),
      cost: costValue,
      performed_at: form.performed_at || null,
      meter_reading: meterValue,
    };

    try {
      let activeId = taskId;

      if (isNew) {
        const { id } = await api.post<{ id: string }>(`/assets/${assetId}/maintenance`, payload);
        activeId = id;
      } else {
        await api.put(`/assets/${assetId}/maintenance/${taskId}`, payload);
      }

      for (const file of pendingPhotos) {
        const fd = new FormData();
        fd.append('photo', file);
        const res = await fetch(`/api/assets/${assetId}/maintenance/${activeId}/photos`, { method: 'POST', body: fd });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error((err as any).error ?? 'Photo upload failed');
        }
      }

      for (const file of pendingDocs) {
        const fd = new FormData();
        fd.append('doc', file);
        const res = await fetch(`/api/assets/${assetId}/maintenance/${activeId}/docs`, { method: 'POST', body: fd });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error((err as any).error ?? 'Document upload failed');
        }
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!taskId || !confirm('Delete this maintenance record? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/assets/${assetId}/maintenance/${taskId}`);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-slide-in"
        style={{ maxWidth: '680px', width: '100%' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
            {isNew ? 'New Maintenance Task' : 'Edit Maintenance Task'}
          </h2>
          <button type="button" className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <Spinner />
          ) : (
            <>
              {error && <ErrorMessage message={error} style={{ marginBottom: 'var(--space-4)' }} />}

              {/* Activity Type */}
              <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="card__header">
                  <h3 style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Maintenance Type</h3>
                </div>
                <div className="card__body">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                    {MAINTENANCE_ACTIVITY_TYPES.map(type => (
                      <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-sm)' }}>
                        <input
                          type="radio"
                          name="activity_type"
                          value={type}
                          checked={form.activity_type === type}
                          onChange={() => setForm(prev => ({ ...prev, activity_type: type }))}
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                  {form.activity_type === 'Other' && (
                    <div style={{ marginTop: 'var(--space-3)' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Describe the activity type"
                        value={form.type_other}
                        onChange={e => setForm(prev => ({ ...prev, type_other: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Core Fields */}
              <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="card__header">
                  <h3 style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Details</h3>
                </div>
                <div className="card__body">
                  <div className="form-grid" style={{ gap: 'var(--space-4)' }}>
                    <div className="form-group">
                      <label className="form-label">Date &amp; Time <span style={{ color: 'var(--color-danger-500)' }}>*</span></label>
                      <input
                        type="datetime-local"
                        className="form-input"
                        value={form.performed_at}
                        onChange={e => setForm(prev => ({ ...prev, performed_at: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Performed By <span style={{ color: 'var(--color-danger-500)' }}>*</span></label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Name of person performing maintenance"
                        value={form.performed_by}
                        onChange={e => setForm(prev => ({ ...prev, performed_by: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cost</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-500)', fontSize: 'var(--text-sm)', pointerEvents: 'none' }}>$</span>
                        <input
                          type="number"
                          className="form-input"
                          style={{ paddingLeft: 'calc(var(--space-3) + 14px)' }}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          value={form.cost}
                          onChange={e => setForm(prev => ({ ...prev, cost: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">{meterLabel}</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          className="form-input"
                          placeholder={`Current: ${currentReading.toLocaleString()} ${meterUnit}`}
                          min={currentReading}
                          step={serviceIntervalType === 'hours' ? '0.1' : '1'}
                          value={form.meter_reading}
                          onChange={e => setForm(prev => ({ ...prev, meter_reading: e.target.value }))}
                        />
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginTop: '4px' }}>
                        Current reading: {currentReading.toLocaleString()} {meterUnit}. Leave blank to skip update.
                      </div>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
                    <label className="form-label">Service Description <span style={{ color: 'var(--color-danger-500)' }}>*</span></label>
                    <textarea
                      className="form-input"
                      rows={4}
                      placeholder="Describe the work performed..."
                      value={form.description}
                      onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>

              {/* Photos */}
              <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Photos <span style={{ color: 'var(--color-gray-400)', fontWeight: 400 }}>({totalPhotos}/10)</span></h3>
                  {totalPhotos < 10 && (
                    <button type="button" className="btn btn--secondary btn--sm" onClick={() => photoInputRef.current?.click()}>
                      Add Photos
                    </button>
                  )}
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handlePhotoSelect}
                />
                <div className="card__body">
                  {totalPhotos === 0 ? (
                    <div
                      style={{ border: '2px dashed var(--color-gray-200)', borderRadius: 'var(--radius-md)', padding: 'var(--space-6)', textAlign: 'center', cursor: 'pointer', color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)' }}
                      onClick={() => photoInputRef.current?.click()}
                    >
                      Click to add photos (JPEG, PNG, WebP · max 10 MB each)
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 'var(--space-3)' }}>
                      {existingPhotos.map(photo => (
                        <div key={photo.id} style={{ position: 'relative' }}>
                          <img
                            src={`/api/assets/${assetId}/maintenance/${taskId}/photos/${photo.id}`}
                            alt={photo.file_name}
                            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteExistingPhoto(photo.id)}
                            style={{ position: 'absolute', top: '4px', right: '4px', background: 'var(--color-danger-600)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', lineHeight: '20px', textAlign: 'center', cursor: 'pointer', padding: 0 }}
                            title="Remove photo"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                      {pendingPhotos.map((file, i) => (
                        <div key={`pending-photo-${i}`} style={{ position: 'relative' }}>
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '2px dashed var(--color-primary-300)' }}
                          />
                          <button
                            type="button"
                            onClick={() => setPendingPhotos(prev => prev.filter((_, j) => j !== i))}
                            style={{ position: 'absolute', top: '4px', right: '4px', background: 'var(--color-danger-600)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', lineHeight: '20px', textAlign: 'center', cursor: 'pointer', padding: 0 }}
                            title="Remove photo"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Documents / Reports <span style={{ color: 'var(--color-gray-400)', fontWeight: 400 }}>({totalDocs}/10)</span></h3>
                  {totalDocs < 10 && (
                    <button type="button" className="btn btn--secondary btn--sm" onClick={() => docInputRef.current?.click()}>
                      Add Documents
                    </button>
                  )}
                </div>
                <input
                  ref={docInputRef}
                  type="file"
                  accept=".pdf,application/pdf,image/jpeg,image/png,image/webp"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleDocSelect}
                />
                <div className="card__body">
                  {totalDocs === 0 ? (
                    <div
                      style={{ border: '2px dashed var(--color-gray-200)', borderRadius: 'var(--radius-md)', padding: 'var(--space-6)', textAlign: 'center', cursor: 'pointer', color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)' }}
                      onClick={() => docInputRef.current?.click()}
                    >
                      Click to upload documents (PDF, PNG, JPEG, WebP · max 10 MB each)
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {existingDocs.map(doc => (
                        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)' }}>
                          <span style={{ fontSize: '16px' }}>📄</span>
                          <a
                            href={`/api/assets/${assetId}/maintenance/${taskId}/docs/${doc.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--color-primary-600)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {doc.file_name}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteExistingDoc(doc.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger-600)', fontSize: 'var(--text-lg)', lineHeight: 1, padding: '0 var(--space-1)' }}
                            title="Remove document"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                      {pendingDocs.map((file, i) => (
                        <div key={`pending-doc-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-primary-50)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-primary-300)' }}>
                          <span style={{ fontSize: '16px' }}>📄</span>
                          <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--color-gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPendingDocs(prev => prev.filter((_, j) => j !== i))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger-600)', fontSize: 'var(--text-lg)', lineHeight: 1, padding: '0 var(--space-1)' }}
                            title="Remove document"
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
            <div>
              {!isNew && (
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button type="button" className="btn btn--secondary" onClick={onClose} disabled={saving || deleting}>Cancel</button>
              <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saving || deleting}>
                {saving ? 'Saving…' : isNew ? 'Create Task' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
