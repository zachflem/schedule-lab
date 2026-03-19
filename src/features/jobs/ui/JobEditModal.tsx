import { useState, useEffect, useMemo } from 'react';
import { api } from '@/shared/lib/api';
import type { Asset, Personnel } from '@/shared/validation/schemas';
import { JobStatusEnum } from '@/shared/validation/schemas';
import type { JobWithResources } from '../api/useJobs';
import { Spinner } from '@/shared/ui';

interface JobEditModalProps {
  job: JobWithResources;
  onClose: () => void;
  onSave: (id: string, data: any) => Promise<{ success: boolean; error?: string }>;
}

export function JobEditModal({ job, onClose, onSave }: JobEditModalProps) {
  const [formData, setFormData] = useState({
    status_id: job.status_id || 'Job Booked',
    location: job.location || '',
    site_contact_name: job.site_contact_name || '',
    site_contact_phone: job.site_contact_phone || '',
    site_contact_email: job.site_contact_email || '',
    job_brief: job.job_brief || '',
    po_number: job.po_number || '',
    job_type: job.job_type || '',
  });

  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([]);
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
        
        // Initialize selections from existing resources
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

  const filteredAssets = useMemo(() => {
    return allAssets.filter(a => a.name.toLowerCase().includes(assetSearch.toLowerCase()));
  }, [allAssets, assetSearch]);

  const filteredPersonnel = useMemo(() => {
    return allPersonnel.filter(p => p.name.toLowerCase().includes(personnelSearch.toLowerCase()));
  }, [allPersonnel, personnelSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggleAsset = (id: string) => {
    if (isLocked) return;
    setSelectedAssets(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleTogglePersonnel = (id: string) => {
    if (isLocked) return;
    setSelectedPersonnel(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const resources = [
        ...selectedAssets.map(id => ({ resource_type: 'Asset', asset_id: id })),
        ...selectedPersonnel.map(id => ({ resource_type: 'Personnel', personnel_id: id }))
      ];
      
      const result = await onSave(job.id!, { ...formData, resources });
      if (result.success) {
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

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '900px', width: '95%' }}>
        <div className="modal-header">
          <h2>Edit Job: {job.customer_name}</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 350px', gap: '2rem' }}>
            <div className="main-info">
              {error && <div className="alert alert--danger mb-4">{error}</div>}

              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Status</label>
                  <select 
                    name="status_id" 
                    value={formData.status_id} 
                    onChange={handleChange}
                    className="form-input"
                    required
                  >
                    {JobStatusEnum.options.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Location</label>
                  <input type="text" name="location" value={formData.location} onChange={handleChange} className="form-input" />
                </div>

                <div className="form-group">
                  <label className="form-label">Site Contact Name</label>
                  <input type="text" name="site_contact_name" value={formData.site_contact_name} onChange={handleChange} className="form-input" />
                </div>

                <div className="form-group">
                  <label className="form-label">Site Contact Phone</label>
                  <input type="text" name="site_contact_phone" value={formData.site_contact_phone} onChange={handleChange} className="form-input" />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Site Contact Email</label>
                  <input type="email" name="site_contact_email" value={formData.site_contact_email} onChange={handleChange} className="form-input" />
                </div>

                <div className="form-group">
                  <label className="form-label">PO Number</label>
                  <input type="text" name="po_number" value={formData.po_number} onChange={handleChange} className="form-input" />
                </div>

                <div className="form-group">
                  <label className="form-label">Job Type</label>
                  <input type="text" name="job_type" value={formData.job_type} onChange={handleChange} className="form-input" />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Job Brief</label>
                  <textarea name="job_brief" value={formData.job_brief} onChange={handleChange} className="form-input" rows={4} />
                </div>
              </div>
            </div>

            <div className="resource-sidebar border-l pl-6">
              <h3 className="mb-4 text-lg font-bold">Allocations</h3>
              
              {isLocked && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded text-sm text-amber-800 mb-4">
                  <strong>Locked:</strong> Unschedule this job on the schedule page to modify allocations.
                </div>
              )}

              {loading ? <Spinner /> : (
                <div className="flex flex-col gap-6">
                  {/* Assets Section */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="font-semibold text-sm">Assets ({selectedAssets.length})</label>
                      {!isLocked && (
                        <input 
                          type="text" 
                          placeholder="Search..." 
                          className="text-xs p-1 border rounded w-32"
                          value={assetSearch}
                          onChange={(e) => setAssetSearch(e.target.value)}
                        />
                      )}
                    </div>
                    <div className="border rounded h-40 overflow-y-auto">
                      {isLocked ? (
                        <div className="p-2 space-y-1">
                          {allAssets.filter(a => selectedAssets.includes(a.id!)).map(a => (
                            <div key={a.id} className="text-sm py-1 border-b last:border-0">{a.name}</div>
                          ))}
                        </div>
                      ) : (
                        filteredAssets.map(a => (
                          <label key={a.id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer border-b last:border-0">
                            <input 
                              type="checkbox" 
                              checked={selectedAssets.includes(a.id!)} 
                              onChange={() => handleToggleAsset(a.id!)}
                              className="mr-2"
                            />
                            <span className="text-sm">{a.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Personnel Section */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="font-semibold text-sm">Personnel ({selectedPersonnel.length})</label>
                      {!isLocked && (
                        <input 
                          type="text" 
                          placeholder="Search..." 
                          className="text-xs p-1 border rounded w-32"
                          value={personnelSearch}
                          onChange={(e) => setPersonnelSearch(e.target.value)}
                        />
                      )}
                    </div>
                    <div className="border rounded h-40 overflow-y-auto">
                      {isLocked ? (
                        <div className="p-2 space-y-1">
                          {allPersonnel.filter(p => selectedPersonnel.includes(p.id!)).map(p => (
                            <div key={p.id} className="text-sm py-1 border-b last:border-0">{p.name}</div>
                          ))}
                        </div>
                      ) : (
                        filteredPersonnel.map(p => (
                          <label key={p.id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer border-b last:border-0">
                            <input 
                              type="checkbox" 
                              checked={selectedPersonnel.includes(p.id!)} 
                              onChange={() => handleTogglePersonnel(p.id!)}
                              className="mr-2"
                            />
                            <span className="text-sm">{p.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer mt-6 flex justify-end gap-3">
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button 
              type="submit" 
              className="btn btn--primary" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
