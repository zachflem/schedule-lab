import { useState, useEffect } from 'react';
import { api } from '@/shared/lib/api';
import { QualificationSchema, type Qualification } from '@/shared/validation/schemas';
import { Spinner } from '@/shared/ui';

export function QualificationSettingsTab() {
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch qualifications');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save qualification');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete qualification');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>Qualification Management</h2>
        {!editingId && (
          <button className="btn btn--primary" onClick={() => setEditingId('new')}>
            Add New Qualification
          </button>
        )}
      </header>

      {error && (
        <div style={{ padding: 'var(--space-4)', background: 'var(--color-danger-50)', color: 'var(--color-danger-700)', borderRadius: 'var(--radius-md)' }}>
          {error}
        </div>
      )}

      {editingId && (
        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <h3 style={{ marginBottom: 'var(--space-4)', fontWeight: 600 }}>
            {editingId === 'new' ? 'New Qualification' : 'Edit Qualification'}
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 'var(--space-4)', alignItems: 'end' }}>
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
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setEditingId(null)}>Cancel</button>
              <button type="submit" className="btn btn--primary">Save</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
              <th style={{ textAlign: 'left', padding: 'var(--space-3)' }}>Name</th>
              <th style={{ textAlign: 'center', padding: 'var(--space-3)' }}>Regular Rate</th>
              <th style={{ textAlign: 'center', padding: 'var(--space-3)' }}>After Hours</th>
              <th style={{ textAlign: 'right', padding: 'var(--space-3)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {qualifications.map(qual => (
              <tr key={qual.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                <td style={{ padding: 'var(--space-3)', fontWeight: 600 }}>{qual.name}</td>
                <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>${qual.rate_hourly?.toFixed(2)}</td>
                <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>${qual.rate_after_hours?.toFixed(2)}</td>
                <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                    <button className="button button-sm" onClick={() => handleEdit(qual)}>Edit</button>
                    <button className="button button-sm button-danger" onClick={() => handleDelete(qual.id!)}>Delete</button>
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
