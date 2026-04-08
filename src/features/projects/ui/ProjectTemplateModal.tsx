import { useState } from 'react';
import type { ProjectJobTemplate } from '@/shared/validation/schemas';

interface ProjectTemplateModalProps {
  template?: Partial<ProjectJobTemplate>;
  projectDetails: any; // Used to inherit defaults like location, start_time, etc.
  onClose: () => void;
  onSave: (data: Partial<ProjectJobTemplate>) => Promise<{ success: boolean; id?: string; error?: string }>;
}

export function ProjectTemplateModal({ template, projectDetails, onClose, onSave }: ProjectTemplateModalProps) {
  const [formData, setFormData] = useState<Partial<ProjectJobTemplate>>({
    project_id: projectDetails?.id,
    name: template?.name || '',
    job_type: template?.job_type || '',
    location: template?.location || projectDetails?.location || '',
    asset_requirement: template?.asset_requirement || '',
    max_weight: template?.max_weight ?? undefined,
    hazards: template?.hazards || '',
    site_access: template?.site_access || '',
    task_description: template?.task_description || '',
    recurrence_type: template?.recurrence_type || 'none',
    recurrence_interval_value: template?.recurrence_interval_value ?? undefined,
    recurrence_interval_unit: template?.recurrence_interval_unit || 'days',
    recurrence_downtime_value: template?.recurrence_downtime_value ?? undefined,
    recurrence_downtime_unit: template?.recurrence_downtime_unit || 'days',
    recurrence_weekdays: template?.recurrence_weekdays || [],
    recurrence_end_type: template?.recurrence_end_type || 'ongoing',
    recurrence_end_date: template?.recurrence_end_date || '',
    default_start_time: template?.default_start_time || projectDetails?.default_start_time || '07:00',
    default_end_time: template?.default_end_time || projectDetails?.default_end_time || '17:00',
    status: template?.status || 'Active'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await onSave(formData);
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Failed to save job stream');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '600px', width: '95%' }}>
        <div className="modal-header">
          <h2>{template?.id ? 'Edit Job Stream' : 'Add Job Stream'}</h2>
          <button className="btn-close" onClick={onClose} type="button">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body py-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-sm border border-red-100">
                ⚠️ {error}
              </div>
            )}

            <div className="form-group">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Stream Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Crane Operator - Dayshift"
                value={formData.name || ''}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Job Type</label>
                <input type="text" className="form-input" value={formData.job_type || ''} onChange={e => setFormData(p => ({ ...p, job_type: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
                <input type="text" className="form-input" value={formData.location || ''} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Asset Requirement</label>
                <input type="text" className="form-input" value={formData.asset_requirement || ''} onChange={e => setFormData(p => ({ ...p, asset_requirement: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Max Weight</label>
                <input type="number" className="form-input" value={formData.max_weight ?? ''} onChange={e => setFormData(p => ({ ...p, max_weight: e.target.value ? parseFloat(e.target.value) : undefined }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Task Description</label>
              <textarea className="form-input" rows={2} value={formData.task_description || ''} onChange={e => setFormData(p => ({ ...p, task_description: e.target.value }))} />
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
                  <option value="none">Single (No Recurrence)</option>
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
                          const current = (formData.recurrence_weekdays as any) || [];
                          const updated = current.includes(day) 
                            ? current.filter((d: string) => d !== day) 
                            : [...current, day];
                          setFormData(p => ({ ...p, recurrence_weekdays: updated }));
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
                        onChange={e => setFormData(p => ({ ...p, default_start_time: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Default End Time</label>
                      <input type="time" className="form-input" value={formData.default_end_time || '17:00'} 
                        onChange={e => setFormData(p => ({ ...p, default_end_time: e.target.value }))} />
                    </div>
                  </div>

                  <div className="mt-4 form-group">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">End Condition</label>
                    <div className="flex gap-4 items-center">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="end_type" checked={formData.recurrence_end_type === 'ongoing'} 
                          onChange={() => setFormData(p => ({ ...p, recurrence_end_type: 'ongoing' }))} />
                        Ongoing
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="end_type" checked={formData.recurrence_end_type === 'date'} 
                          onChange={() => setFormData(p => ({ ...p, recurrence_end_type: 'date' }))} />
                        Ends on date
                      </label>
                    </div>
                    {formData.recurrence_end_type === 'date' && (
                      <input type="date" className="form-input mt-2" value={formData.recurrence_end_date || ''} 
                        onChange={e => setFormData(p => ({ ...p, recurrence_end_date: e.target.value }))} />
                    )}
                  </div>
                </>
              )}
            </div>
            
          </div>

          <div className="modal-footer flex justify-end gap-3 border-t pt-4 mt-2">
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Job Stream'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
