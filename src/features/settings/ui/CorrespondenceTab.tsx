import { useState, useEffect } from 'react';
import { api } from '@/shared/lib/api';
import { CorrespondenceTemplateSchema, type CorrespondenceTemplate } from '@/shared/validation/schemas';
import { useToast } from '@/shared/lib/toast';
import { Spinner } from '@/shared/ui';

const BLANK: Partial<CorrespondenceTemplate> = { name: '', content: '' };

export function CorrespondenceTab() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<CorrespondenceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CorrespondenceTemplate>>(BLANK);

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    try {
      const data = await api.get<CorrespondenceTemplate[]>('/correspondence-templates');
      setTemplates(data);
    } catch {
      showToast('Failed to load templates.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = CorrespondenceTemplateSchema.parse(formData);
      if (editingId && editingId !== 'new') {
        await api.put(`/correspondence-templates/${editingId}`, validated);
      } else {
        await api.post('/correspondence-templates', validated);
      }
      setEditingId(null);
      setFormData(BLANK);
      fetchTemplates();
      showToast('Template saved.', 'success');
    } catch {
      showToast('Failed to save template.', 'warning');
    }
  };

  const handleEdit = (t: CorrespondenceTemplate) => {
    setEditingId(t.id!);
    setFormData(t);
  };

  const handleDelete = async (t: CorrespondenceTemplate) => {
    if (!confirm(`Delete "${t.name}"?`)) return;
    try {
      await api.delete(`/correspondence-templates/${t.id}`);
      fetchTemplates();
      showToast('Template deleted.', 'success');
    } catch {
      showToast('Failed to delete template.', 'warning');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData(BLANK);
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* Edit / Add form */}
      {editingId && (
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">{editingId === 'new' ? 'New Template' : 'Edit Template'}</h3>
            <button className="btn btn--secondary btn--icon" onClick={handleCancel}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16 }}>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Template Name</label>
              <input
                required
                className="form-input"
                placeholder="e.g. Standard Hire Terms & Conditions"
                value={formData.name ?? ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Content</label>
              <p style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
                This text will be appended to emails when the template is selected.
              </p>
              <textarea
                required
                className="form-input"
                rows={12}
                placeholder="Enter the template content here..."
                style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
                value={formData.content ?? ''}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-gray-100)' }}>
              <button type="button" className="btn btn--secondary" onClick={handleCancel}>Cancel</button>
              <button type="submit" className="btn btn--primary">Save Template</button>
            </div>
          </form>
        </div>
      )}

      {/* Templates list */}
      <div className="card">
        <div className="card__header">
          <div>
            <h3 className="card__title">Correspondence Templates</h3>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
              Reusable documents that can be attached to quotes and other outgoing emails.
            </p>
          </div>
          {!editingId && (
            <button className="btn btn--secondary btn--sm" onClick={() => setEditingId('new')}>
              + New Template
            </button>
          )}
        </div>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Preview</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--color-gray-400)', padding: 'var(--space-6)' }}>
                    No templates yet. Add one to get started.
                  </td>
                </tr>
              ) : templates.map(t => (
                <tr key={t.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 600 }}>
                      {t.name}
                      {!!t.is_system && (
                        <span style={{
                          fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em',
                          padding: '1px 6px', borderRadius: '10px',
                          background: 'var(--color-primary-50)', color: 'var(--color-primary-700)',
                          border: '1px solid var(--color-primary-200)',
                        }}>
                          BUILT-IN
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-sm)', maxWidth: '360px' }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.content || '—'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                      <button className="btn btn--secondary btn--icon" onClick={() => handleEdit(t)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16 }}>
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className="btn btn--secondary btn--icon"
                        style={{ color: t.is_system ? 'var(--color-gray-300)' : 'var(--color-danger-600)' }}
                        disabled={!!t.is_system}
                        title={t.is_system ? 'Built-in templates cannot be deleted' : 'Delete'}
                        onClick={() => handleDelete(t)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16 }}>
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6" /><path d="M14 11v6" />
                          <path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
