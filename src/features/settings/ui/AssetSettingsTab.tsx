import { useState, useEffect } from 'react';
import { api } from '@/shared/lib/api';

interface AssetType {
  id: string;
  name: string;
  checklist_questions: string[];
}

interface ComplianceType {
  id: string;
  name: string;
}

export function AssetSettingsTab() {
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [complianceTypes, setComplianceTypes] = useState<ComplianceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState<Partial<AssetType> | null>(null);
  const [editingCompliance, setEditingCompliance] = useState<Partial<ComplianceType> | null>(null);

  const fetchData = async () => {
    try {
      const [types, compliance] = await Promise.all([
        api.get<AssetType[]>('/asset-types'),
        api.get<ComplianceType[]>('/compliance-types'),
      ]);
      setAssetTypes(types);
      setComplianceTypes(compliance);
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

  const handleSaveCompliance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompliance?.name) return;
    try {
      if (editingCompliance.id) {
        await api.put(`/compliance-types/${editingCompliance.id}`, editingCompliance);
      } else {
        await api.post('/compliance-types', editingCompliance);
      }
      setEditingCompliance(null);
      fetchData();
    } catch (err) {
      alert('Failed to save compliance type');
    }
  };

  const handleDeleteCompliance = async (id: string) => {
    if (!confirm('Delete this compliance type?')) return;
    try {
      await api.delete(`/compliance-types/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete compliance type');
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

      {/* Compliance Types Section */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Compliance Types</h3>
          <button className="btn btn--secondary btn--sm" onClick={() => setEditingCompliance({ name: '' })}>
            + Add Type
          </button>
        </div>

        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {complianceTypes.map(ct => (
                <tr key={ct.id}>
                  <td style={{ fontWeight: 600 }}>{ct.name}</td>
                  <td style={{ textAlign: 'right', display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                    <button className="btn-icon" onClick={() => setEditingCompliance(ct)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button className="btn-icon" style={{ color: 'var(--color-danger-600)' }} onClick={() => handleDeleteCompliance(ct.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16 }}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {complianceTypes.length === 0 && (
                <tr><td colSpan={2} style={{ textAlign: 'center', color: 'var(--color-gray-400)', padding: 'var(--space-4)' }}>No compliance types yet</td></tr>
              )}
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

              <div className="form-group">
                <label className="form-label">Checklist Questions</label>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', fontStyle: 'italic', marginBottom: 'var(--space-2)' }}>
                  Ensure your questions result in a YES or N/A answer to progress. NO answers will halt docket progress.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {(editingType.checklist_questions || []).map((q, i) => (
                    <div key={i} style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <input
                        className="form-input"
                        value={q}
                        onChange={e => {
                          const updated = [...(editingType.checklist_questions || [])];
                          updated[i] = e.target.value;
                          setEditingType({ ...editingType, checklist_questions: updated });
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn--danger btn--icon btn--sm"
                        onClick={() => {
                          const updated = (editingType.checklist_questions || []).filter((_, idx) => idx !== i);
                          setEditingType({ ...editingType, checklist_questions: updated });
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    style={{ alignSelf: 'flex-start', marginTop: 'var(--space-1)' }}
                    onClick={() => setEditingType({
                      ...editingType,
                      checklist_questions: [...(editingType.checklist_questions || []), '']
                    })}
                  >
                    + Add Question
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
                <button type="button" className="btn btn--secondary" onClick={() => setEditingType(null)}>Cancel</button>
                <button type="submit" className="btn btn--primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Compliance Type Modal/Form Overlay */}
      {editingCompliance && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px' }}>
            <div className="card__header">
              <h3>{editingCompliance.id ? 'Edit' : 'Add'} Compliance Type</h3>
            </div>
            <form onSubmit={handleSaveCompliance} className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  required
                  className="form-input"
                  value={editingCompliance.name || ''}
                  onChange={e => setEditingCompliance({ ...editingCompliance, name: e.target.value })}
                  placeholder="e.g. CraneSafe, WorkCover, EPA Licence"
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn--secondary" onClick={() => setEditingCompliance(null)}>Cancel</button>
                <button type="submit" className="btn btn--primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
