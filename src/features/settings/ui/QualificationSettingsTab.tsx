import { useState, useEffect } from 'react';
import { api } from '@/shared/lib/api';
import { QualificationSchema, type Qualification } from '@/shared/validation/schemas';
import { useToast } from '@/shared/lib/toast';
import { Spinner } from '@/shared/ui';

export function QualificationSettingsTab() {
  const { showToast } = useToast();
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Qualification>>({
    name: '',
    rate_hourly: 0,
    rate_after_hours: 0,
  });

  useEffect(() => {
    fetchQualifications();
  }, []);

  const fetchQualifications = async () => {
    try {
      const data = await api.get<Qualification[]>('/qualifications');
      setQualifications(data);
    } catch {
      showToast('Failed to fetch qualifications.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = QualificationSchema.parse(formData);
      if (editingId && editingId !== 'new') {
        await api.put(`/qualifications/${editingId}`, validated);
      } else {
        await api.post('/qualifications', validated);
      }
      setEditingId(null);
      setFormData({ name: '', rate_hourly: 0, rate_after_hours: 0 });
      fetchQualifications();
      showToast('Qualification saved.', 'success');
    } catch {
      showToast('Failed to save qualification.', 'warning');
    }
  };

  const handleEdit = (qual: Qualification) => {
    setEditingId(qual.id!);
    setFormData(qual);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this qualification?')) return;
    try {
      await api.delete(`/qualifications/${id}`);
      fetchQualifications();
      showToast('Qualification deleted.', 'success');
    } catch {
      showToast('Failed to delete qualification.', 'warning');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ name: '', rate_hourly: 0, rate_after_hours: 0 });
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '800px' }}>

      {/* Add / Edit form */}
      {editingId && (
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">{editingId === 'new' ? 'New Qualification' : 'Edit Qualification'}</h3>
            <button className="btn-icon" onClick={handleCancel}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Qualification Name</label>
                <input
                  required
                  className="form-input"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Regular Hourly Rate ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.rate_hourly}
                  onChange={e => setFormData({ ...formData, rate_hourly: parseFloat(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">After Hours Rate ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.rate_after_hours}
                  onChange={e => setFormData({ ...formData, rate_after_hours: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-gray-100)' }}>
              <button type="button" className="btn btn--secondary" onClick={handleCancel}>Cancel</button>
              <button type="submit" className="btn btn--primary">Save</button>
            </div>
          </form>
        </div>
      )}

      {/* Qualifications list */}
      <div className="card">
        <div className="card__header">
          <div>
            <h3 className="card__title">Qualifications</h3>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
              Manage operator qualifications and their associated billing rates.
            </p>
          </div>
          {!editingId && (
            <button className="btn btn--secondary btn--sm" onClick={() => setEditingId('new')}>
              + Add Qualification
            </button>
          )}
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th style={{ textAlign: 'center' }}>Regular Rate</th>
              <th style={{ textAlign: 'center' }}>After Hours</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {qualifications.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-gray-400)', padding: 'var(--space-6)' }}>No qualifications yet</td></tr>
            ) : qualifications.map(qual => (
              <tr key={qual.id}>
                <td style={{ fontWeight: 600 }}>{qual.name}</td>
                <td style={{ textAlign: 'center' }}>${qual.rate_hourly?.toFixed(2)}</td>
                <td style={{ textAlign: 'center' }}>${qual.rate_after_hours?.toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                    <button className="btn-icon" onClick={() => handleEdit(qual)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button className="btn-icon" style={{ color: 'var(--color-danger-600)' }} onClick={() => handleDelete(qual.id!)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16 }}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
