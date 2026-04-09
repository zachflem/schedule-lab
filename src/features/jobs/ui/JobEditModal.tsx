import { useState, useEffect, useMemo } from 'react';
import { api } from '@/shared/lib/api';
import type { Asset, Personnel } from '@/shared/validation/schemas';
import { JobStatusEnum } from '@/shared/validation/schemas';
import type { JobWithResources } from '../api/useJobs';
import { Spinner } from '@/shared/ui';
import { useToast } from '@/shared/lib/toast';

interface AssetWithMetadata extends Asset {
  asset_type_name?: string;
}

interface JobEditModalProps {
  job: JobWithResources;
  onClose: () => void;
  onSave: (id: string, data: any) => Promise<{ success: boolean; error?: string }>;
  onApplyToFuture?: (projectId: string, data: any) => Promise<{ success: boolean; updated?: number; error?: string }>;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 'var(--text-xs)',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--color-gray-400)',
      marginBottom: 'var(--space-4)',
      paddingBottom: 'var(--space-2)',
      borderBottom: '1px solid var(--color-gray-100)',
    }}>
      {children}
    </div>
  );
}

export function JobEditModal({ job, onClose, onSave, onApplyToFuture }: JobEditModalProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    status_id: job.status_id || 'Job Booked',
    location: job.location || '',
    site_contact_name: job.site_contact_name || '',
    site_contact_phone: job.site_contact_phone || '',
    site_contact_email: job.site_contact_email || '',
    job_brief: job.job_brief || '',
    po_number: job.po_number || '',
    job_type: job.job_type || '',
    start_time: job.start_time ? new Date(job.start_time).toISOString().slice(0, 16) : '',
    end_time: job.end_time ? new Date(job.end_time).toISOString().slice(0, 16) : '',
  });

  const [allAssets, setAllAssets] = useState<AssetWithMetadata[]>([]);
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyToFuture, setApplyToFuture] = useState(false);
  const [futureUpdateMsg, setFutureUpdateMsg] = useState<string | null>(null);

  const isPartOfProject = !!job.project_id;

  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<string[]>([]);
  const [selectedQualifications, setSelectedQualifications] = useState<string[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [personnelSearch, setPersonnelSearch] = useState('');

  const isLocked = ['Job Scheduled', 'Allocated', 'Site Docket', 'Completed', 'Invoiced'].includes(job.status_id as string);

  useEffect(() => {
    async function fetchData() {
      try {
        const [assetsData, personnelData] = await Promise.all([
          api.get<Asset[]>('/assets'),
          api.get<Personnel[]>('/personnel')
        ]);
        setAllAssets(assetsData);
        setAllPersonnel(personnelData);
        if (job.resources) {
          setSelectedAssets(job.resources.filter(r => r.resource_type === 'Asset' && r.asset_id).map(r => r.asset_id));
          setSelectedPersonnel(job.resources.filter(r => r.resource_type === 'Personnel' && r.personnel_id).map(r => r.personnel_id));
        }
      } catch (err) {
        console.error('Failed to fetch resources', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [job.resources]);

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(allAssets.map(a => a.asset_type_name || 'Other'))).sort();
  }, [allAssets]);

  const uniqueQualifications = useMemo(() => {
    return Array.from(new Set(allPersonnel.flatMap(p => p.qualifications?.map(q => q.name) || []))).sort();
  }, [allPersonnel]);

  const filteredAssets = useMemo(() => {
    return allAssets.filter(a => {
      const matchesSearch = a.name.toLowerCase().includes(assetSearch.toLowerCase());
      const matchesType = selectedAssetTypes.length === 0 || selectedAssetTypes.includes(a.asset_type_name || 'Other');
      return matchesSearch && matchesType;
    });
  }, [allAssets, assetSearch, selectedAssetTypes]);

  const filteredPersonnel = useMemo(() => {
    return allPersonnel.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(personnelSearch.toLowerCase());
      const matchesQual = selectedQualifications.length === 0 ||
        p.qualifications?.some(q => selectedQualifications.includes(q.name));
      return matchesSearch && matchesQual;
    });
  }, [allPersonnel, personnelSearch, selectedQualifications]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggleAsset = (id: string) => {
    if (isLocked) return;
    setSelectedAssets(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const handleTogglePersonnel = (id: string) => {
    if (isLocked) return;
    setSelectedPersonnel(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.start_time && formData.end_time && selectedAssets.length > 0) {
      const start = new Date(formData.start_time);
      const end = new Date(formData.end_time);
      const durationMinutes = (end.getTime() - start.getTime()) / 60000;
      const breachAssets = allAssets.filter(a =>
        selectedAssets.includes(a.id!) &&
        a.minimum_hire_period > 0 &&
        durationMinutes < a.minimum_hire_period
      );
      if (breachAssets.length > 0) {
        const msg = `The following assets have a minimum hire period that is not met:\n${breachAssets.map(a => `- ${a.name}: ${a.minimum_hire_period} mins`).join('\n')}\n\nThe current booking is only ${durationMinutes} minutes. Do you want to proceed anyway?`;
        if (!window.confirm(msg)) return;
      }
    }

    setIsSubmitting(true);
    setError(null);
    setFutureUpdateMsg(null);
    try {
      const resources = [
        ...selectedAssets.map(id => ({ resource_type: 'Asset', asset_id: id })),
        ...selectedPersonnel.map(id => ({ resource_type: 'Personnel', personnel_id: id }))
      ];
      const prevStatus = job.status_id;
      const result = await onSave(job.id!, { ...formData, resources });
      if (result.success) {
        if (formData.status_id === 'Job Scheduled' && prevStatus !== 'Job Scheduled') {
          showToast('Job scheduled — team notified by email');
        }
        if (applyToFuture && isPartOfProject && onApplyToFuture && job.project_id) {
          const futurePayload = {
            status_id: formData.status_id,
            location: formData.location || null,
            site_contact_name: formData.site_contact_name || null,
            site_contact_email: formData.site_contact_email || null,
            site_contact_phone: formData.site_contact_phone || null,
            job_brief: formData.job_brief || null,
            po_number: formData.po_number || null,
            job_type: formData.job_type || null,
            resources,
          };
          const futureResult = await onApplyToFuture(job.project_id, futurePayload);
          if (futureResult.success) {
            setFutureUpdateMsg(`✓ Applied to ${futureResult.updated} future job${futureResult.updated !== 1 ? 's' : ''} in this project.`);
            setTimeout(onClose, 1500);
            return;
          }
        }
        onClose();
      } else {
        setError(result.error || 'Failed to update job');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2-column responsive grid (collapses to 1 on narrow modals / mobile)
  const twoCol: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 'var(--space-4)',
  };
  const spanFull: React.CSSProperties = { gridColumn: '1 / -1' };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '680px', width: '95%' }}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: 'var(--text-xl)' }}>Edit Job</h2>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginTop: '2px', fontWeight: 600 }}>
              {job.customer_name}
            </div>
            {isPartOfProject && (
              <div style={{ fontSize: '11px', color: 'var(--color-primary-600)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '11px', height: '11px' }}>
                  <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" />
                </svg>
                Part of a recurring project
              </div>
            )}
          </div>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

            {error && <div className="alert alert--danger">{error}</div>}

            {/* ── Section 1: Job Info ─────────────────────── */}
            <section>
              <SectionHeader>Job Details</SectionHeader>
              <div style={twoCol}>
                <div className="form-group" style={spanFull}>
                  <label className="form-label">Status</label>
                  <select name="status_id" value={formData.status_id} onChange={handleChange} className="form-input" required>
                    {JobStatusEnum.options.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">PO Number</label>
                  <input type="text" name="po_number" value={formData.po_number} onChange={handleChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Job Type</label>
                  <input type="text" name="job_type" value={formData.job_type} onChange={handleChange} className="form-input" />
                </div>
              </div>
            </section>

            {/* ── Section 2: Location & Contact ──────────── */}
            <section>
              <SectionHeader>Location & Site Contact</SectionHeader>
              <div style={twoCol}>
                <div className="form-group" style={spanFull}>
                  <label className="form-label">Location</label>
                  <input type="text" name="location" value={formData.location} onChange={handleChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Name</label>
                  <input type="text" name="site_contact_name" value={formData.site_contact_name} onChange={handleChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input type="text" name="site_contact_phone" value={formData.site_contact_phone} onChange={handleChange} className="form-input" />
                </div>
                <div className="form-group" style={spanFull}>
                  <label className="form-label">Contact Email</label>
                  <input type="email" name="site_contact_email" value={formData.site_contact_email} onChange={handleChange} className="form-input" />
                </div>
                <div className="form-group" style={spanFull}>
                  <label className="form-label">Job Brief</label>
                  <textarea name="job_brief" value={formData.job_brief} onChange={handleChange} className="form-input" rows={3} />
                </div>
              </div>
            </section>

            {/* ── Section 3: Allocations ─────────────────── */}
            <section>
              <SectionHeader>Allocations</SectionHeader>

              {isLocked && (
                <div style={{ background: 'var(--color-warning-50)', border: '1px solid var(--color-warning-500)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-warning-600)', marginBottom: 'var(--space-4)' }}>
                  <strong>Locked:</strong> Unschedule this job on the schedule page to modify allocations.
                </div>
              )}

              {loading ? <Spinner /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

                  {/* Assets */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                      <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-gray-700)' }}>
                        Assets
                        <span style={{ marginLeft: '6px', fontSize: 'var(--text-xs)', fontWeight: 700, background: 'var(--color-primary-100)', color: 'var(--color-primary-700)', borderRadius: '999px', padding: '0 6px' }}>
                          {selectedAssets.length}
                        </span>
                      </label>
                      {!isLocked && (
                        <input type="text" placeholder="Search…" className="form-input" style={{ width: '120px', padding: '3px 8px', fontSize: 'var(--text-xs)' }} value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} />
                      )}
                    </div>

                    {!isLocked && uniqueTypes.length > 1 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: 'var(--space-2)' }}>
                        <button type="button" onClick={() => setSelectedAssetTypes([])} className={`btn btn--sm ${selectedAssetTypes.length === 0 ? 'btn--primary' : 'btn--secondary'}`} style={{ borderRadius: '20px', padding: '1px 8px', fontSize: '10px' }}>All</button>
                        {uniqueTypes.map(type => (
                          <button key={type} type="button" onClick={() => setSelectedAssetTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])} className={`btn btn--sm ${selectedAssetTypes.includes(type) ? 'btn--primary' : 'btn--secondary'}`} style={{ borderRadius: '20px', padding: '1px 8px', fontSize: '10px' }}>
                            {type}
                          </button>
                        ))}
                      </div>
                    )}

                    <div style={{ border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', height: '160px', overflowY: 'auto' }}>
                      {isLocked ? (
                        <div style={{ padding: 'var(--space-2)' }}>
                          {allAssets.filter(a => selectedAssets.includes(a.id!)).map(a => (
                            <div key={a.id} style={{ fontSize: 'var(--text-sm)', padding: '6px 0', borderBottom: '1px solid var(--color-gray-100)' }}>{a.name}</div>
                          ))}
                          {selectedAssets.length === 0 && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', padding: 'var(--space-3)', textAlign: 'center' }}>No assets allocated</div>}
                        </div>
                      ) : filteredAssets.length === 0 ? (
                        <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)' }}>No assets found</div>
                      ) : (
                        filteredAssets.map(a => (
                          <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '8px var(--space-3)', borderBottom: '1px solid var(--color-gray-50)', cursor: 'pointer', background: selectedAssets.includes(a.id!) ? 'var(--color-primary-50)' : 'white', transition: 'background var(--transition-fast)' }}>
                            <input type="checkbox" checked={selectedAssets.includes(a.id!)} onChange={() => handleToggleAsset(a.id!)} style={{ flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: 'var(--text-sm)', fontWeight: selectedAssets.includes(a.id!) ? 600 : 400 }}>{a.name}</div>
                              <div style={{ fontSize: '10px', color: 'var(--color-gray-400)' }}>{a.asset_type_name}</div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Personnel */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                      <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-gray-700)' }}>
                        Personnel
                        <span style={{ marginLeft: '6px', fontSize: 'var(--text-xs)', fontWeight: 700, background: 'var(--color-primary-100)', color: 'var(--color-primary-700)', borderRadius: '999px', padding: '0 6px' }}>
                          {selectedPersonnel.length}
                        </span>
                      </label>
                      {!isLocked && (
                        <input type="text" placeholder="Search…" className="form-input" style={{ width: '120px', padding: '3px 8px', fontSize: 'var(--text-xs)' }} value={personnelSearch} onChange={(e) => setPersonnelSearch(e.target.value)} />
                      )}
                    </div>

                    {!isLocked && uniqueQualifications.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: 'var(--space-2)' }}>
                        <button type="button" onClick={() => setSelectedQualifications([])} className={`btn btn--sm ${selectedQualifications.length === 0 ? 'btn--primary' : 'btn--secondary'}`} style={{ borderRadius: '20px', padding: '1px 8px', fontSize: '10px' }}>All</button>
                        {uniqueQualifications.map(qual => (
                          <button key={qual} type="button" onClick={() => setSelectedQualifications(prev => prev.includes(qual) ? prev.filter(q => q !== qual) : [...prev, qual])} className={`btn btn--sm ${selectedQualifications.includes(qual) ? 'btn--primary' : 'btn--secondary'}`} style={{ borderRadius: '20px', padding: '1px 8px', fontSize: '10px' }}>
                            {qual}
                          </button>
                        ))}
                      </div>
                    )}

                    <div style={{ border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', height: '160px', overflowY: 'auto' }}>
                      {isLocked ? (
                        <div style={{ padding: 'var(--space-2)' }}>
                          {allPersonnel.filter(p => selectedPersonnel.includes(p.id!)).map(p => (
                            <div key={p.id} style={{ fontSize: 'var(--text-sm)', padding: '6px 0', borderBottom: '1px solid var(--color-gray-100)' }}>{p.name}</div>
                          ))}
                          {selectedPersonnel.length === 0 && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', padding: 'var(--space-3)', textAlign: 'center' }}>No personnel allocated</div>}
                        </div>
                      ) : filteredPersonnel.length === 0 ? (
                        <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)' }}>No personnel found</div>
                      ) : (
                        filteredPersonnel.map(p => (
                          <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '8px var(--space-3)', borderBottom: '1px solid var(--color-gray-50)', cursor: 'pointer', background: selectedPersonnel.includes(p.id!) ? 'var(--color-primary-50)' : 'white', transition: 'background var(--transition-fast)' }}>
                            <input type="checkbox" checked={selectedPersonnel.includes(p.id!)} onChange={() => handleTogglePersonnel(p.id!)} style={{ flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: 'var(--text-sm)', fontWeight: selectedPersonnel.includes(p.id!) ? 600 : 400 }}>{p.name}</div>
                              <div style={{ fontSize: '10px', color: 'var(--color-gray-400)' }}>
                                {p.qualifications?.map(q => q.name).join(', ') || 'No qualifications'}
                              </div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}
            </section>

            {/* ── Section 4: Schedule ────────────────────── */}
            <section>
              <SectionHeader>
                Schedule
                {!formData.start_time && (
                  <span style={{ marginLeft: 'var(--space-2)', fontSize: '10px', fontWeight: 700, background: 'var(--color-warning-50)', color: 'var(--color-warning-600)', border: '1px solid var(--color-warning-500)', borderRadius: '999px', padding: '1px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Unscheduled
                  </span>
                )}
              </SectionHeader>
              <div style={twoCol}>
                <div className="form-group">
                  <label className="form-label">Start Date / Time</label>
                  <input type="datetime-local" name="start_time" value={formData.start_time} onChange={handleChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date / Time</label>
                  <input type="datetime-local" name="end_time" value={formData.end_time} onChange={handleChange} className="form-input" />
                </div>
              </div>
            </section>

          </div>

          {/* Footer */}
          <div className="modal-footer" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {futureUpdateMsg && (
              <div style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--color-success-50)', border: '1px solid var(--color-success-500)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--color-success-700)', textAlign: 'center' }}>
                {futureUpdateMsg}
              </div>
            )}
            {isPartOfProject && !isLocked && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--color-gray-700)' }}>
                <input type="checkbox" checked={applyToFuture} onChange={e => setApplyToFuture(e.target.checked)} />
                <span>Apply changes to all <strong>future</strong> jobs in this project</span>
              </label>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
                {isSubmitting
                  ? (applyToFuture ? 'Applying to project…' : 'Saving…')
                  : applyToFuture ? 'Save & Apply to Future Jobs' : 'Save Changes'
                }
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
