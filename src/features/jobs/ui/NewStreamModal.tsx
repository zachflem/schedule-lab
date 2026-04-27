import { useState, useEffect } from 'react';
import { api } from '@/shared/lib/api';
import type { Customer, ProjectJobTemplate } from '@/shared/validation/schemas';
import type { ProjectWithMetadata } from '@/features/projects/api/useProjects';
import { ErrorMessage } from '@/shared/ui';

interface NewStreamModalProps {
  onClose: () => void;
  onCreate: (projectId: string, data: Partial<ProjectJobTemplate>) => Promise<{ success: boolean; error?: string }>;
}

type Step = 'select' | 'stream';

export function NewStreamModal({ onClose, onCreate }: NewStreamModalProps) {
  const [step, setStep] = useState<Step>('select');

  // Step 1 state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [projects, setProjects] = useState<ProjectWithMetadata[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Step 2 state
  const [formData, setFormData] = useState<Partial<ProjectJobTemplate>>({
    name: '',
    job_type: '',
    location: '',
    asset_requirement: '',
    max_weight: undefined,
    task_description: '',
    recurrence_type: 'none',
    recurrence_interval_value: undefined,
    recurrence_interval_unit: 'days',
    recurrence_downtime_value: undefined,
    recurrence_downtime_unit: 'days',
    recurrence_weekdays: [],
    recurrence_end_type: 'ongoing',
    recurrence_end_date: '',
    default_start_time: '07:00',
    default_end_time: '17:00',
    status: 'Active',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Customer[]>('/customers')
      .then(setCustomers)
      .catch(console.error)
      .finally(() => setLoadingCustomers(false));
  }, []);

  useEffect(() => {
    if (!selectedCustomerId) {
      setProjects([]);
      setSelectedProjectId('');
      return;
    }
    setLoadingProjects(true);
    setSelectedProjectId('');
    api.get<ProjectWithMetadata[]>('/projects', { customer_id: selectedCustomerId, status: 'Active' })
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoadingProjects(false));
  }, [selectedCustomerId]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleNext = () => {
    if (!selectedCustomerId) { setStep1Error('Please select a customer.'); return; }
    if (!selectedProjectId) { setStep1Error('Please select a project.'); return; }
    setStep1Error(null);
    setFormData(prev => ({
      ...prev,
      location: selectedProject?.description ? prev.location : prev.location,
    }));
    setStep('stream');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setIsSubmitting(true);
    setStreamError(null);
    const result = await onCreate(selectedProjectId, {
      ...formData,
      project_id: selectedProjectId,
      recurrence_end_date: formData.recurrence_end_date || null,
    });
    if (result.success) {
      onClose();
    } else {
      setStreamError(result.error || 'Failed to create stream');
      setIsSubmitting(false);
    }
  };

  const twoCol: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', width: '95%' }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: 'var(--text-xl)' }}>New Job Stream</h2>
            {step === 'stream' && selectedProject && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginTop: '2px' }}>
                {customers.find(c => c.id === selectedCustomerId)?.name} — {selectedProject.name}
              </p>
            )}
          </div>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        {step === 'select' ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {step1Error && <ErrorMessage message={step1Error} />}

              <div className="form-group">
                <label className="form-label">Customer <span style={{ color: 'var(--color-danger-500)' }}>*</span></label>
                <select
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="form-input"
                  disabled={loadingCustomers}
                >
                  <option value="">{loadingCustomers ? 'Loading…' : 'Select a customer'}</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id!}>{c.name}</option>
                  ))}
                </select>
              </div>

              {selectedCustomerId && (
                <div className="form-group">
                  <label className="form-label">Project <span style={{ color: 'var(--color-danger-500)' }}>*</span></label>
                  {loadingProjects ? (
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>Loading projects…</p>
                  ) : projects.length === 0 ? (
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
                      No active projects for this customer.
                    </p>
                  ) : (
                    <select
                      value={selectedProjectId}
                      onChange={e => setSelectedProjectId(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Select a project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id!}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleNext}
                  disabled={!selectedCustomerId || !selectedProjectId}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div className="modal-body flex flex-col gap-4">
              {streamError && (
                <div className="bg-red-50 text-red-600 p-3 rounded text-sm border border-red-100">
                  ⚠️ {streamError}
                </div>
              )}

              <div className="form-group">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Stream Name <span style={{ color: 'var(--color-danger-500)' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Crane Operator - Dayshift"
                  value={formData.name || ''}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div style={twoCol}>
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

            <div className="modal-footer flex justify-between gap-3 border-t pt-4 mt-2">
              <button type="button" className="btn btn--secondary" onClick={() => setStep('select')} disabled={isSubmitting}>
                ← Back
              </button>
              <div className="flex gap-3">
                <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Job Stream'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
