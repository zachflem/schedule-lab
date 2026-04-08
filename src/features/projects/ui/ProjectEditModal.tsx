import { useState, useEffect } from 'react';
import { api } from '@/shared/lib/api';
import type { Project, Customer } from '@/shared/validation/schemas';
import { ProjectStatusEnum } from '@/shared/validation/schemas';

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
    recurrence_type: 'none',
    recurrence_end_type: 'ongoing',
  } : {
    customer_id: project.customer_id,
    name: project.name,
    description: project.description,
    status: project.status,
    start_date: project.start_date,
    end_date: project.end_date,
    po_number: project.po_number,
    recurrence_type: project.recurrence_type,
    recurrence_interval_value: project.recurrence_interval_value,
    recurrence_interval_unit: project.recurrence_interval_unit,
    recurrence_downtime_value: project.recurrence_downtime_value,
    recurrence_downtime_unit: project.recurrence_downtime_unit,
    recurrence_weekdays: project.recurrence_weekdays ? (typeof project.recurrence_weekdays === 'string' ? JSON.parse(project.recurrence_weekdays) : project.recurrence_weekdays) : [],
    recurrence_end_type: project.recurrence_end_type,
    recurrence_end_date: project.recurrence_end_date,
    default_start_time: project.default_start_time,
    default_end_time: project.default_end_time,
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isCreate) {
      api.get<Customer[]>('/customers').then(setCustomers).catch(console.error);
    }
  }, [isCreate]);

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
        <div className="modal-header">
          <h2>{isCreate ? 'Create New Project' : `Project Settings: ${project?.name}`}</h2>
          <button className="btn-close" onClick={onClose} type="button">&times;</button>
        </div>

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

            <div style={{ background: 'var(--color-primary-50)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-primary-100)' }}>
              <div className="flex items-center gap-2 mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-600)" strokeWidth="2.5" style={{ width: '16px', height: '16px' }}>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /><polyline points="23 4 23 10 17 10" />
                </svg>
                <span className="font-bold text-xs uppercase tracking-wider text-primary">Recurrence Configuration</span>
              </div>
              
              <div className="form-group mb-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Recurrence Type</label>
                <select
                  className="form-input"
                  value={formData.recurrence_type}
                  onChange={e => setFormData((p: any) => ({ ...p, recurrence_type: e.target.value as any }))}
                >
                  <option value="none">Single Project (Manual Scheduling)</option>
                  <option value="interval">Cycle Interval (Work / Downtime)</option>
                  <option value="weekdays">Weekly Recurring (Set Days)</option>
                </select>
              </div>

              {formData.recurrence_type === 'interval' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="form-group">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Active Duration</label>
                      <div className="flex gap-2">
                        <input type="number" className="form-input w-20" value={formData.recurrence_interval_value || ''} 
                          onChange={e => setFormData((p: any) => ({ ...p, recurrence_interval_value: parseInt(e.target.value) }))} />
                        <select className="form-input" value={formData.recurrence_interval_unit || 'days'}
                          onChange={e => setFormData((p: any) => ({ ...p, recurrence_interval_unit: e.target.value as any }))}>
                          <option value="days">Days</option>
                          <option value="weeks">Weeks</option>
                          <option value="months">Months</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Downtime Gap</label>
                      <div className="flex gap-2">
                        <input type="number" className="form-input w-20" value={formData.recurrence_downtime_value ?? ''} 
                          onChange={e => setFormData((p: any) => ({ ...p, recurrence_downtime_value: parseInt(e.target.value) }))} />
                        <select className="form-input" value={formData.recurrence_downtime_unit || 'days'}
                          onChange={e => setFormData((p: any) => ({ ...p, recurrence_downtime_unit: e.target.value as any }))}>
                          <option value="days">Days</option>
                          <option value="weeks">Weeks</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {formData.recurrence_type === 'weekdays' && (
                <div className="form-group mb-4">
                  <label className="block text-xs font-semibold text-gray-500 mb-2">Repeat on Weekdays</label>
                  <div className="flex flex-wrap gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const current = formData.recurrence_weekdays || [];
                          const updated = current.includes(day as any) 
                            ? current.filter(d => d !== day) 
                            : [...current, day as any];
                          setFormData((p: any) => ({ ...p, recurrence_weekdays: updated }));
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          formData.recurrence_weekdays?.includes(day as any)
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-white text-gray-400 border border-gray-200 hover:border-primary hover:text-primary'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formData.recurrence_type !== 'none' && (
                <>
                  <div className="mt-4 pt-4 border-t border-primary-100" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Default Start Time</label>
                      <input type="time" className="form-input" value={formData.default_start_time || '07:00'} 
                        onChange={e => setFormData((p: any) => ({ ...p, default_start_time: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Default End Time</label>
                      <input type="time" className="form-input" value={formData.default_end_time || '17:00'} 
                        onChange={e => setFormData((p: any) => ({ ...p, default_end_time: e.target.value }))} />
                    </div>
                  </div>

                  <div className="mt-4 form-group">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">End Condition</label>
                    <div className="flex gap-4 items-center">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="end_type" checked={formData.recurrence_end_type === 'ongoing'} 
                          onChange={() => setFormData((p: any) => ({ ...p, recurrence_end_type: 'ongoing' }))} />
                        Ongoing
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="end_type" checked={formData.recurrence_end_type === 'date'} 
                          onChange={() => setFormData((p: any) => ({ ...p, recurrence_end_type: 'date' }))} />
                        Ends on date
                      </label>
                    </div>
                    {formData.recurrence_end_type === 'date' && (
                      <input type="date" className="form-input mt-2" value={formData.recurrence_end_date || ''} 
                        onChange={e => setFormData((p: any) => ({ ...p, recurrence_end_date: e.target.value }))} />
                    )}
                  </div>
                </>
              )}
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
      </div>
    </div>
  );
}
