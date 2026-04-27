import { useState, useEffect, useRef } from 'react';
import { api } from '@/shared/lib/api';
import type { Project, Customer, ProjectJobTemplate, ProjectContact, CustomerContact, ProjectDocument, ProjectDocumentVisibility } from '@/shared/validation/schemas';
import { ProjectStatusEnum, CustomerContactRoleEnum, ProjectDocumentVisibilityEnum, DOCUMENT_VISIBILITY_LABELS } from '@/shared/validation/schemas';
import { ProjectTemplateModal } from './ProjectTemplateModal';

interface ProjectModalProps {
  project?: any;
  mode?: 'create' | 'edit';
  customerId?: string;
  onClose: () => void;
  onUpdate?: (id: string, data: Partial<Project>) => Promise<{ success: boolean; error?: string }>;
  onCreate?: (data: Project) => Promise<{ success: boolean; id?: string; error?: string }>;
}

const emptyContact = (): ProjectContact => ({
  name: '',
  phone: '',
  email: '',
  location: '',
  role: null,
});

export function ProjectEditModal({ project, mode = 'edit', customerId, onClose, onUpdate, onCreate }: ProjectModalProps) {
  const isCreate = mode === 'create';

  const [formData, setFormData] = useState<Partial<Project>>(isCreate ? {
    customer_id: customerId,
    name: '',
    description: '',
    status: 'Active',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    contacts: [],
  } : {
    customer_id: project.customer_id,
    name: project.name,
    description: project.description,
    status: project.status,
    start_date: project.start_date,
    end_date: project.end_date,
    po_number: project.po_number,
    contacts: project.contacts ?? [],
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<ProjectJobTemplate[]>([]);
  const [customerContacts, setCustomerContacts] = useState<CustomerContact[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [pendingDocs, setPendingDocs] = useState<{ file: File; label: string; visibility: ProjectDocumentVisibility }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'contacts' | 'documents' | 'streams'>('settings');
  const [editingTemplate, setEditingTemplate] = useState<Partial<ProjectJobTemplate> | null>(null);

  const contacts = (formData.contacts ?? []) as ProjectContact[];

  const loadTemplates = async () => {
    if (!project?.id) return;
    try {
      const data = await api.get<ProjectJobTemplate[]>(`/projects/${project.id}/templates`);
      setTemplates(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCustomerContacts = async (cid: string) => {
    try {
      const customer = await api.get<Customer>(`/customers/${cid}`);
      setCustomerContacts(customer.contacts ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDocuments = async () => {
    if (!project?.id) return;
    try {
      const data = await api.get<ProjectDocument[]>(`/projects/${project.id}/documents`);
      setDocuments(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isCreate && !customerId) {
      api.get<Customer[]>('/customers').then(setCustomers).catch(console.error);
    } else if (!isCreate) {
      loadTemplates();
      loadDocuments();
      if (project?.customer_id) loadCustomerContacts(project.customer_id);
    }
  }, [isCreate, project?.id, customerId]);

  // When customer is selected in create mode, load their contacts
  useEffect(() => {
    if (isCreate && formData.customer_id) {
      loadCustomerContacts(formData.customer_id);
    }
  }, [isCreate, formData.customer_id]);

  const addContact = () => {
    setFormData(p => ({ ...p, contacts: [...contacts, emptyContact()] }));
  };

  const importContact = (c: CustomerContact) => {
    const imported: ProjectContact = {
      name: c.name,
      phone: c.phone ?? '',
      email: c.email ?? '',
      location: c.location ?? '',
      role: c.role ?? null,
    };
    setFormData(p => ({ ...p, contacts: [...contacts, imported] }));
  };

  const removeContact = (index: number) => {
    setFormData(p => ({ ...p, contacts: contacts.filter((_, i) => i !== index) }));
  };

  const updateContact = (index: number, field: keyof ProjectContact, value: string) => {
    const updated = contacts.map((c, i) => i === index ? { ...c, [field]: value } : c);
    setFormData(p => ({ ...p, contacts: updated }));
  };

  const handleDocFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newPending = files.map(f => ({ file: f, label: '', visibility: 'dispatcher' as ProjectDocumentVisibility }));
    setPendingDocs(prev => [...prev, ...newPending]);
    e.target.value = '';
  };

  const handleUploadPending = async () => {
    if (pendingDocs.length === 0 || !project?.id) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const pending of pendingDocs) {
        const fd = new FormData();
        fd.append('file', pending.file);
        fd.append('visibility', pending.visibility);
        if (pending.label.trim()) fd.append('label', pending.label.trim());
        const res = await fetch(`/api/projects/${project.id}/documents`, { method: 'POST', body: fd });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error((err as any).error ?? 'Upload failed');
        }
      }
      setPendingDocs([]);
      await loadDocuments();
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!project?.id) return;
    try {
      await api.delete(`/projects/${project.id}/documents/${docId}`);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err: any) {
      setUploadError(err.message);
    }
  };

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

  // Contacts not already in the project (by name+email match)
  const importableContacts = customerContacts.filter(cc =>
    !contacts.some(pc => pc.name === cc.name && pc.email === cc.email)
  );

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
                className={`modal-tab${activeTab === 'settings' ? ' active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                Settings
              </button>
              <button
                className={`modal-tab${activeTab === 'contacts' ? ' active' : ''}`}
                onClick={() => setActiveTab('contacts')}
              >
                Contacts {contacts.length > 0 && `(${contacts.length})`}
              </button>
              <button
                className={`modal-tab${activeTab === 'documents' ? ' active' : ''}`}
                onClick={() => setActiveTab('documents')}
              >
                Documents {documents.length > 0 && `(${documents.length})`}
              </button>
              <button
                id="tab-streams"
                className={`modal-tab${activeTab === 'streams' ? ' active' : ''}`}
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

            {isCreate && !customerId && (
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

            {isCreate && (
              <ContactsSection
                contacts={contacts}
                importableContacts={importableContacts}
                onAdd={addContact}
                onImport={importContact}
                onRemove={removeContact}
                onUpdate={updateContact}
              />
            )}
          </div>

          <div className="modal-footer flex justify-end gap-3 border-t pt-4 mt-2">
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (isCreate ? 'Create Project' : 'Save Settings')}
            </button>
          </div>
        </form>
        )}

        {activeTab === 'contacts' && (
          <form onSubmit={handleSubmit}>
            <div className="modal-body py-4">
              <ContactsSection
                contacts={contacts}
                importableContacts={importableContacts}
                onAdd={addContact}
                onImport={importContact}
                onRemove={removeContact}
                onUpdate={updateContact}
              />
            </div>
            <div className="modal-footer flex justify-end gap-3 border-t pt-4 mt-2">
              <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Contacts'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'documents' && (
          <div className="modal-body py-4 flex flex-col gap-4">
            {uploadError && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-sm border border-red-100">
                ⚠️ {uploadError}
              </div>
            )}

            {/* Existing documents */}
            {documents.length === 0 && pendingDocs.length === 0 ? (
              <div
                style={{ border: '2px dashed var(--color-gray-200)', borderRadius: 'var(--radius-md)', padding: 'var(--space-8)', textAlign: 'center', cursor: 'pointer', color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)' }}
                onClick={() => docFileInputRef.current?.click()}
              >
                Click to upload project documents (PDF, Word, Excel, images · max 20 MB)
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {documents.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)' }}>
                    <span style={{ fontSize: '18px' }}>{doc.file_type === 'application/pdf' ? '📄' : doc.file_type.startsWith('image/') ? '🖼️' : '📎'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a
                        href={`/api/projects/${project?.id}/documents/${doc.id}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary-600)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                      >
                        {doc.label || doc.file_name}
                      </a>
                      {doc.label && (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>{doc.file_name}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {DOCUMENT_VISIBILITY_LABELS[doc.visibility as ProjectDocumentVisibility]}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger-600)', fontSize: 'var(--text-lg)', lineHeight: 1, padding: '0 var(--space-1)', flexShrink: 0 }}
                      title="Delete document"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Pending uploads */}
            {pendingDocs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-gray-600)' }}>Ready to upload</div>
                {pendingDocs.map((pending, i) => (
                  <div key={i} style={{ border: '1px dashed var(--color-primary-300)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', background: 'var(--color-primary-50)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span style={{ fontSize: '16px' }}>📎</span>
                      <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--color-gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pending.file.name}</span>
                      <button
                        type="button"
                        onClick={() => setPendingDocs(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger-600)', fontSize: 'var(--text-lg)', lineHeight: 1, padding: '0 var(--space-1)' }}
                      >&times;</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-2)' }}>
                      <input
                        className="form-input"
                        style={{ fontSize: 'var(--text-sm)' }}
                        placeholder="Label (optional)"
                        value={pending.label}
                        onChange={e => setPendingDocs(prev => prev.map((p, j) => j === i ? { ...p, label: e.target.value } : p))}
                      />
                      <select
                        className="form-input"
                        style={{ fontSize: 'var(--text-sm)' }}
                        value={pending.visibility}
                        onChange={e => setPendingDocs(prev => prev.map((p, j) => j === i ? { ...p, visibility: e.target.value as ProjectDocumentVisibility } : p))}
                      >
                        {ProjectDocumentVisibilityEnum.options.map(v => (
                          <option key={v} value={v}>{DOCUMENT_VISIBILITY_LABELS[v]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'space-between', alignItems: 'center' }}>
              <input
                ref={docFileInputRef}
                type="file"
                accept="application/pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png,image/webp"
                multiple
                style={{ display: 'none' }}
                onChange={handleDocFileSelect}
              />
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => docFileInputRef.current?.click()}>
                + Add Files
              </button>
              {pendingDocs.length > 0 && (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={handleUploadPending}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : `Upload ${pendingDocs.length} file${pendingDocs.length > 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>
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
                if (editingTemplate.id) {
                  await api.put(`/projects/${project.id}/templates/${editingTemplate.id}`, data);
                } else {
                  await api.post(`/projects/${project.id}/templates`, data);
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

interface ContactsSectionProps {
  contacts: ProjectContact[];
  importableContacts: CustomerContact[];
  onAdd: () => void;
  onImport: (c: CustomerContact) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof ProjectContact, value: string) => void;
}

function ContactsSection({ contacts, importableContacts, onAdd, onImport, onRemove, onUpdate }: ContactsSectionProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>Contacts</h3>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          {importableContacts.length > 0 && (
            <select
              className="form-input"
              style={{ fontSize: 'var(--text-sm)', padding: '4px 8px', height: 'auto' }}
              value=""
              onChange={e => {
                const idx = parseInt(e.target.value, 10);
                if (!isNaN(idx)) onImport(importableContacts[idx]);
              }}
            >
              <option value="">+ From customer...</option>
              {importableContacts.map((c, i) => (
                <option key={i} value={i}>{c.name}{c.role ? ` (${c.role})` : ''}</option>
              ))}
            </select>
          )}
          <button type="button" className="btn btn--secondary btn--sm" onClick={onAdd}>
            + Add Contact
          </button>
        </div>
      </div>

      {contacts.length === 0 ? (
        <p style={{ color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-6) 0' }}>
          No contacts yet. Add one manually or copy from the customer's contacts.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {contacts.map((contact, index) => (
            <div
              key={index}
              style={{
                border: '1px solid var(--color-gray-200)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
                  Contact {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger-600)', fontSize: 'var(--text-sm)', padding: '2px 6px' }}
                >
                  Remove
                </button>
              </div>

              <div className="form-grid" style={{ gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    required
                    className="form-input"
                    value={contact.name}
                    onChange={e => onUpdate(index, 'name', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-input"
                    value={contact.role || ''}
                    onChange={e => onUpdate(index, 'role', e.target.value)}
                  >
                    <option value="">— select role —</option>
                    {CustomerContactRoleEnum.options.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    value={contact.phone || ''}
                    maxLength={15}
                    onChange={e => onUpdate(index, 'phone', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={contact.email || ''}
                    onChange={e => onUpdate(index, 'email', e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Location</label>
                  <input
                    className="form-input"
                    value={contact.location || ''}
                    maxLength={64}
                    placeholder="e.g. Head Office, Site B"
                    onChange={e => onUpdate(index, 'location', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
