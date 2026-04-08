import { useState, useEffect } from 'react';
import { api } from '@/shared/lib/api';
import type { Project, Customer, ProjectJobTemplate } from '@/shared/validation/schemas';
import { ProjectStatusEnum } from '@/shared/validation/schemas';
import { ProjectTemplateModal } from './ProjectTemplateModal';

interface ProjectModalProps {
  project?: any;
  mode?: 'create' | 'edit';
  onClose: () => void;
  onUpdate?: (id: string, data: Partial<Project>) => Promise<{ success: boolean; error?: string }>;
  onCreate?: (data: Project) => Promise<{ success: boolean; id?: string; error?: string }>;
}

export function ProjectEditModal({ project, mode = 'edit', onClose, onUpdate, onCreate }: ProjectModalProps) {
  const isCreate = mode === 'create';
  
  const [formData, setFormData] = useState<Partial<Project>>(isCreate ? {
    name: '',
    description: '',
    status: 'Active',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  } : {
    customer_id: project.customer_id,
    name: project.name,
    description: project.description,
    status: project.status,
    start_date: project.start_date,
    end_date: project.end_date,
    po_number: project.po_number,
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<ProjectJobTemplate[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'streams'>('settings');
  const [editingTemplate, setEditingTemplate] = useState<Partial<ProjectJobTemplate> | null>(null);

  const loadTemplates = async () => {
    if (!project?.id) return;
    try {
      const data = await api.get<ProjectJobTemplate[]>(`/projects/${project.id}/templates`);
      setTemplates(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isCreate) {
      api.get<Customer[]>('/customers').then(setCustomers).catch(console.error);
    } else {
      loadTemplates();
    }
  }, [isCreate, project?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (isCreate) {
        if (!onCreate) return;
        const res = await onCreate(formData as Project);
        if (res.success) onClose();
        else setError(res.error || 'Failed to create project');
      } else {
        if (!onUpdate || !project) return;
        const res = await onUpdate(project.id, formData);
        if (res.success) onClose();
        else setError(res.error || 'Failed to update project');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', width: '95%' }}>
        <div className="modal-header flex-col items-start gap-4 pb-0">
          <div className="flex justify-between w-full">
            <h2>{isCreate ? 'Create New Project' : `Project: ${project?.name}`}</h2>
            <button className="btn-close" onClick={onClose} type="button">&times;</button>
          </div>
          {!isCreate && (
            <div className="flex gap-4 border-b w-full">
              <button 
                className={`pb-2 px-2 border-b-2 transition-colors ${activeTab === 'settings' ? 'border-primary text-primary font-bold' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                onClick={() => setActiveTab('settings')}
              >
                Settings
              </button>
              <button 
                id="tab-streams"
                className={`pb-2 px-2 border-b-2 transition-colors ${activeTab === 'streams' ? 'border-primary text-primary font-bold' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                onClick={() => setActiveTab('streams')}
              >
                Job Streams ({templates.length})
              </button>
            </div>
          )}
        </div>

        {activeTab === 'settings' && (
          <form onSubmit={handleSubmit}>
          <div className="modal-body py-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-sm border border-red-100">
                ⚠️ {error}
              </div>
            )}

            {isCreate && (
              <div className="form-group">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Customer</label>
                <select
                  className="form-input"
                  value={formData.customer_id || ''}
                  onChange={e => setFormData(p => ({ ...p, customer_id: e.target.value }))}
                  required
                >
                  <option value="">Select a customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Project Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.name || ''}
                onChange={e => setFormData((p: any) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
              <textarea
                className="form-input"
                rows={3}
                value={formData.description || ''}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select
                  className="form-input"
                  value={formData.status}
                  onChange={e => setFormData((p: any) => ({ ...p, status: e.target.value as any }))}
                >
                  {ProjectStatusEnum.options.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="block text-sm font-semibold text-gray-700 mb-1">PO Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.po_number || ''}
                  onChange={e => setFormData((p: any) => ({ ...p, po_number: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Project Starts</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.start_date || ''}
                  onChange={e => setFormData((p: any) => ({ ...p, start_date: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Primary End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.end_date || ''}
                  onChange={e => setFormData((p: any) => ({ ...p, end_date: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>

          <div className="modal-footer flex justify-end gap-3 border-t pt-4 mt-2">
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (isCreate ? 'Create Project' : 'Save Settings')}
            </button>
          </div>
        </form>
        )}

        {activeTab === 'streams' && (
          <div className="modal-body py-4 flex flex-col gap-4 min-h-[300px]">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div>
                <h3 className="font-bold text-sm">Recurring Job Streams</h3>
                <p className="text-xs text-gray-500">Configure parallel recurring job sequences (e.g. multiple assets or rosters)</p>
              </div>
              <button className="btn btn--sm btn--primary" onClick={() => setEditingTemplate({})}>+ Add Stream</button>
            </div>

            <div className="flex flex-col gap-3">
              {templates.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm italic">
                  No job streams configured yet.
                </div>
              ) : (
                templates.map(t => (
                  <div key={t.id} className="border border-gray-200 rounded-lg p-3 hover:border-primary-300 transition-colors bg-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-sm text-gray-800">{t.name}</div>
                        <div className="text-xs text-gray-500 flex gap-2 mt-1">
                          {t.job_type && <span className="bg-gray-100 px-2 py-0.5 rounded">{t.job_type}</span>}
                          {t.asset_requirement && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">{t.asset_requirement}</span>}
                        </div>
                      </div>
                      <div className="bg-primary-50 text-primary-700 text-xs px-2 py-1 rounded font-bold border border-primary-100">
                        {t.recurrence_type === 'none' ? 'Single Job' : t.recurrence_type === 'interval' ? 'Interval' : 'Weekly'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {editingTemplate && (
          <ProjectTemplateModal
            template={editingTemplate}
            projectDetails={project}
            onClose={() => setEditingTemplate(null)}
            onSave={async (data) => {
              try {
                // Determine if creating or updating
                if (editingTemplate.id) {
                  // Not fully implemented yet, but placeholders
                  await api.put(`/projects/${project.id}/templates/${editingTemplate.id}`, data);
                } else {
                  await api.post(`/projects/${project.id}/templates`, data);
                  // Generate right away if the user desires, or just generate behind the scenes
                  await api.post(`/projects/${project.id}/generate-jobs`, {});
                }
                loadTemplates();
                return { success: true };
              } catch (err: any) {
                return { success: false, error: err.message };
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
