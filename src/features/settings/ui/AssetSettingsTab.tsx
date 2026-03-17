import { useState, useEffect } from 'react';
import { api } from '@/shared/lib/api';

interface AssetType {
  id: string;
  name: string;
  checklist_questions: string[];
}

interface Qualification {
  id: string;
  name: string;
  rate_hourly: number;
  rate_after_hours: number;
}

export function AssetSettingsTab() {
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState<Partial<AssetType> | null>(null);
  const [editingQual, setEditingQual] = useState<Partial<Qualification> | null>(null);

  const fetchData = async () => {
    try {
      const [types, quals] = await Promise.all([
        api.get<AssetType[]>('/asset-types'),
        api.get<Qualification[]>('/qualifications')
      ]);
      setAssetTypes(types);
      setQualifications(quals);
    } catch (err) {
      console.error('Failed to fetch asset data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType?.name) return;
    try {
      if (editingType.id) {
        await api.put(`/asset-types/${editingType.id}`, editingType);
      } else {
        await api.post('/asset-types', editingType);
      }
      setEditingType(null);
      fetchData();
    } catch (err) {
      alert('Failed to save asset type');
    }
  };

  const handleSaveQual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQual?.name) return;
    try {
      if (editingQual.id) {
        await api.put(`/qualifications/${editingQual.id}`, editingQual);
      } else {
        await api.post('/qualifications', editingQual);
      }
      setEditingQual(null);
      fetchData();
    } catch (err) {
      alert('Failed to save qualification');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-8)' }}>
      {/* Asset Types Section */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Asset Types</h3>
          <button className="btn btn--secondary btn--sm" onClick={() => setEditingType({ name: '', checklist_questions: [] })}>
            + Add Type
          </button>
        </div>

        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Type Name</th>
                <th>Checklist Items</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assetTypes.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.name}</td>
                  <td style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-xs)' }}>
                    {t.checklist_questions.length} items
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-icon" onClick={() => setEditingType(t)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Qualifications Section */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Qualifications</h3>
          <button className="btn btn--secondary btn--sm" onClick={() => setEditingQual({ name: '', rate_hourly: 0, rate_after_hours: 0 })}>
            + Add Qualification
          </button>
        </div>

        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Rate (H)</th>
                <th>Rate (AH)</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {qualifications.map(q => (
                <tr key={q.id}>
                  <td style={{ fontWeight: 600 }}>{q.name}</td>
                  <td>${q.rate_hourly}</td>
                  <td>${q.rate_after_hours}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-icon" onClick={() => setEditingQual(q)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Asset Type Modal/Form Overlay */}
      {editingType && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px' }}>
            <div className="card__header">
              <h3>{editingType.id ? 'Edit' : 'Add'} Asset Type</h3>
            </div>
            <form onSubmit={handleSaveType} className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Type Name</label>
                <input required className="form-input" value={editingType.name || ''} onChange={e => setEditingType({...editingType, name: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn--secondary" onClick={() => setEditingType(null)}>Cancel</button>
                <button type="submit" className="btn btn--primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Qualification Modal/Form Overlay */}
      {editingQual && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px' }}>
            <div className="card__header">
              <h3>{editingQual.id ? 'Edit' : 'Add'} Qualification</h3>
            </div>
            <form onSubmit={handleSaveQual} className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input required className="form-input" value={editingQual.name || ''} onChange={e => setEditingQual({...editingQual, name: e.target.value})} />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Hourly Rate ($)</label>
                  <input type="number" className="form-input" value={editingQual.rate_hourly || 0} onChange={e => setEditingQual({...editingQual, rate_hourly: parseFloat(e.target.value)})} />
                </div>
                <div className="form-group">
                  <label className="form-label">After Hours ($)</label>
                  <input type="number" className="form-input" value={editingQual.rate_after_hours || 0} onChange={e => setEditingQual({...editingQual, rate_after_hours: parseFloat(e.target.value)})} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn--secondary" onClick={() => setEditingQual(null)}>Cancel</button>
                <button type="submit" className="btn btn--primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
