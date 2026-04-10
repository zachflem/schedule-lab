import { useState, useEffect } from 'react';
import { api } from '@/shared/lib/api';
import { type Asset, type AssetCompliance, type ComplianceType, type ExtensionFieldDefinition } from '@/shared/validation/schemas';

interface AssetWithExtensions extends Asset {
  extension_data?: Record<string, any>;
}

interface Qualification {
  id: string;
  name: string;
}

interface AssetTypeEnriched {
  id: string;
  name: string;
  extension_schema: ExtensionFieldDefinition[] | null;
}

interface AssetFormProps {
  initialData?: Partial<AssetWithExtensions>;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function expiryColor(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days < 0) return 'var(--color-danger-600)';
  if (days <= 30) return 'var(--color-danger-500)';
  if (days <= 90) return 'var(--color-warning-500)';
  return 'var(--color-success-600)';
}

function expiryLabel(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return 'Expires today';
  return `${days}d remaining`;
}

export function AssetForm({ initialData, onSave, onCancel, saving }: AssetFormProps) {
  const [formData, setFormData] = useState<Partial<AssetWithExtensions>>(initialData || {
    name: '',
    asset_type_id: '',
    required_operators: 1,
    current_machine_hours: 0,
    current_odometer: 0,
    service_interval_type: 'hours',
    service_interval_value: 250,
    last_service_meter_reading: 0,
    minimum_hire_period: 0,
  });

  const [assetTypes, setAssetTypes] = useState<AssetTypeEnriched[]>([]);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [complianceTypes, setComplianceTypes] = useState<ComplianceType[]>([]);
  const [complianceEntries, setComplianceEntries] = useState<AssetCompliance[]>(
    (initialData?.compliance_entries as AssetCompliance[]) ?? []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add compliance modal state
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [complianceForm, setComplianceForm] = useState<{
    compliance_type_id: string;
    expiry_date: string;
    document?: File | null;
  }>({ compliance_type_id: '', expiry_date: '' });
  const [savingCompliance, setSavingCompliance] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const fetches: Promise<any>[] = [
          api.get<AssetTypeEnriched[]>('/asset-types'),
          api.get<Qualification[]>('/qualifications'),
          api.get<ComplianceType[]>('/compliance-types'),
        ];
        const [types, quals, compTypes] = await Promise.all(fetches);
        setAssetTypes(types);
        setQualifications(quals);
        setComplianceTypes(compTypes);
      } catch (err) {
        setError('Failed to load form data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const selectedType = assetTypes.find(t => t.id === formData.asset_type_id);
  const extensionSchema = selectedType?.extension_schema || [];

  const handleInputChange = (field: keyof Asset, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleExtensionChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      extension_data: { ...(prev.extension_data || {}), [key]: value }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, compliance_entries: complianceEntries });
  };

  const handleAddCompliance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complianceForm.compliance_type_id || !complianceForm.expiry_date) return;
    setSavingCompliance(true);
    try {
      // For new assets (no id yet), just store locally — will be saved after asset is created
      if (!initialData?.id) {
        const typeName = complianceTypes.find(ct => ct.id === complianceForm.compliance_type_id)?.name ?? '';
        setComplianceEntries(prev => [
          ...prev.filter(e => e.compliance_type_id !== complianceForm.compliance_type_id),
          {
            compliance_type_id: complianceForm.compliance_type_id,
            compliance_type_name: typeName,
            expiry_date: complianceForm.expiry_date,
            document_key: null,
            document_name: null,
          }
        ]);
        setShowComplianceModal(false);
        setComplianceForm({ compliance_type_id: '', expiry_date: '' });
        return;
      }

      // Existing asset — save directly via API
      const saved = await api.post<{ id: string }>(
        `/assets/${initialData.id}/compliance`,
        {
          compliance_type_id: complianceForm.compliance_type_id,
          expiry_date: complianceForm.expiry_date,
        }
      );

      // Upload document if provided
      if (complianceForm.document) {
        const fd = new FormData();
        fd.append('document', complianceForm.document);
        await fetch(`/api/assets/${initialData.id}/compliance/${saved.id}/document`, {
          method: 'POST',
          body: fd,
        });
      }

      // Refresh compliance list
      const updated = await api.get<AssetCompliance[]>(`/assets/${initialData.id}/compliance`);
      setComplianceEntries(updated);
      setShowComplianceModal(false);
      setComplianceForm({ compliance_type_id: '', expiry_date: '' });
    } catch (err) {
      alert('Failed to save compliance entry');
    } finally {
      setSavingCompliance(false);
    }
  };

  const handleDeleteCompliance = async (entry: AssetCompliance) => {
    if (!initialData?.id) {
      setComplianceEntries(prev => prev.filter(e => e.compliance_type_id !== entry.compliance_type_id));
      return;
    }
    if (!confirm(`Remove ${entry.compliance_type_name} compliance record?`)) return;
    try {
      await api.delete(`/assets/${initialData.id}/compliance/${entry.id}`);
      setComplianceEntries(prev => prev.filter(e => e.id !== entry.id));
    } catch {
      alert('Failed to delete compliance entry');
    }
  };

  // Available types not already added
  const availableComplianceTypes = complianceTypes.filter(
    ct => !complianceEntries.some(e => e.compliance_type_id === ct.id)
  );

  if (loading) return <div>Loading form...</div>;

  return (
    <>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {error && (
          <div style={{ padding: 'var(--space-3)', background: 'var(--color-danger-50)', color: 'var(--color-danger-700)', borderRadius: 'var(--radius-md)' }}>
            {error}
          </div>
        )}

        {/* General Settings */}
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">General Information</h3>
          </div>
          <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Asset Name *</label>
                <input
                  required
                  className="form-input"
                  value={formData.name || ''}
                  onChange={e => handleInputChange('name', e.target.value)}
                  placeholder="e.g. Franna 25t"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Asset Number</label>
                <input
                  className="form-input"
                  value={formData.asset_number || ''}
                  onChange={e => handleInputChange('asset_number', e.target.value)}
                  placeholder="e.g. LHMC15"
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Asset Type *</label>
                <select
                  required
                  className="form-input"
                  value={formData.asset_type_id || ''}
                  onChange={e => handleInputChange('asset_type_id', e.target.value)}
                >
                  <option value="">Select Type</option>
                  {assetTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input
                  className="form-input"
                  value={formData.category || ''}
                  onChange={e => handleInputChange('category', e.target.value)}
                  placeholder="e.g. Mobile Crane"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Required Qualification</label>
              <select
                className="form-input"
                value={formData.required_qualification_id || ''}
                onChange={e => handleInputChange('required_qualification_id', e.target.value)}
              >
                <option value="">None Required</option>
                {qualifications.map(q => (
                  <option key={q.id} value={q.id}>{q.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Pricing & Operations */}
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Pricing & Operations</h3>
          </div>
          <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Hourly Rate ($)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.rate_hourly || ''}
                  onChange={e => handleInputChange('rate_hourly', parseFloat(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Dry Hire Rate ($)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.rate_dry_hire || ''}
                  onChange={e => handleInputChange('rate_dry_hire', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Required Operators</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.required_operators || 1}
                  onChange={e => handleInputChange('required_operators', parseInt(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Min. Hire Period (mins)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.minimum_hire_period || 0}
                  onChange={e => handleInputChange('minimum_hire_period', parseInt(e.target.value))}
                  placeholder="e.g. 240"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry & Maintenance */}
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Telemetry & Maintenance</h3>
          </div>
          <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Current Machine Hours</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.current_machine_hours || 0}
                  onChange={e => handleInputChange('current_machine_hours', parseFloat(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Current Odometer (km)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.current_odometer || 0}
                  onChange={e => handleInputChange('current_odometer', parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--color-gray-100)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
              <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-primary-600)', marginBottom: 'var(--space-3)', textTransform: 'uppercase' }}>
                Service Schedule
              </h4>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Service By</label>
                  <select
                    className="form-input"
                    value={formData.service_interval_type}
                    onChange={e => handleInputChange('service_interval_type', e.target.value)}
                  >
                    <option value="hours">Machine Hours</option>
                    <option value="odometer">Odometer (km)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Service Every (value)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.service_interval_value}
                    onChange={e => handleInputChange('service_interval_value', parseFloat(e.target.value))}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
                <label className="form-label">Last Service Reading</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.last_service_meter_reading}
                  onChange={e => handleInputChange('last_service_meter_reading', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Compliance & Expiries */}
        <div className="card">
          <div className="card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card__title">Compliance & Expiries</h3>
          </div>
          <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Static fields */}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Rego Expiry</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.rego_expiry || ''}
                  onChange={e => handleInputChange('rego_expiry', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Insurance Expiry</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.insurance_expiry || ''}
                  onChange={e => handleInputChange('insurance_expiry', e.target.value)}
                />
              </div>
            </div>

            {/* Dynamic compliance entries */}
            {(complianceEntries.length > 0 || complianceTypes.length > 0) && (
              <div style={{ borderTop: '1px solid var(--color-gray-100)', paddingTop: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-primary-600)', textTransform: 'uppercase' }}>
                    Compliance Records
                  </h4>
                  {availableComplianceTypes.length > 0 && (
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => setShowComplianceModal(true)}
                    >
                      + Add Compliance
                    </button>
                  )}
                </div>

                {complianceEntries.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {complianceEntries.map(entry => (
                      <div
                        key={entry.compliance_type_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 'var(--space-3)',
                          background: 'var(--color-gray-50)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-gray-200)',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{entry.compliance_type_name}</span>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
                            Expires {entry.expiry_date}
                          </span>
                          {entry.document_name && (
                            <a
                              href={`/api/assets/${initialData?.id}/compliance/${entry.id}/document`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)' }}
                            >
                              {entry.document_name}
                            </a>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: expiryColor(entry.expiry_date) }}>
                            {expiryLabel(entry.expiry_date)}
                          </span>
                          <button
                            type="button"
                            className="btn-icon"
                            style={{ color: 'var(--color-danger-500)' }}
                            onClick={() => handleDeleteCompliance(entry)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16 }}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)', padding: 'var(--space-4) 0' }}>
                    No compliance records yet.{' '}
                    {availableComplianceTypes.length > 0 && (
                      <button type="button" style={{ color: 'var(--color-primary-600)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit' }} onClick={() => setShowComplianceModal(true)}>
                        Add one
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Extensions */}
        {extensionSchema.length > 0 && (
          <div className="card" style={{ borderLeft: '4px solid var(--color-primary-500)' }}>
            <div className="card__header">
              <h3 className="card__title">{selectedType?.name} Specific Details</h3>
            </div>
            <div className="card__body form-grid">
              {extensionSchema.map(field => (
                <div key={field.key} className="form-group">
                  <label className="form-label">
                    {field.label} {field.required ? '*' : ''}
                  </label>

                  {field.type === 'select' ? (
                    <select
                      required={field.required}
                      className="form-input"
                      value={formData.extension_data?.[field.key] || ''}
                      onChange={e => handleExtensionChange(field.key, e.target.value)}
                    >
                      <option value="">Select Option</option>
                      {field.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === 'boolean' ? (
                    <div className="form-checkbox-row" style={{ padding: 'var(--space-2) 0' }}>
                      <input
                        type="checkbox"
                        className="form-checkbox"
                        checked={!!formData.extension_data?.[field.key]}
                        onChange={e => handleExtensionChange(field.key, e.target.checked)}
                      />
                      <span style={{ fontSize: 'var(--text-sm)' }}>Enable {field.label}</span>
                    </div>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      required={field.required}
                      className="form-input"
                      value={formData.extension_data?.[field.key] || ''}
                      onChange={e => handleExtensionChange(field.key, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
          <button type="button" className="btn btn--secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving...' : initialData?.id ? 'Update Asset' : 'Create Asset'}
          </button>
        </div>
      </form>

      {/* Add Compliance Modal */}
      {showComplianceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card" style={{ width: '440px' }}>
            <div className="card__header">
              <h3 className="card__title">Add Compliance Record</h3>
            </div>
            <form onSubmit={handleAddCompliance} className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Compliance Type *</label>
                <select
                  required
                  className="form-input"
                  value={complianceForm.compliance_type_id}
                  onChange={e => setComplianceForm(prev => ({ ...prev, compliance_type_id: e.target.value }))}
                >
                  <option value="">Select type…</option>
                  {availableComplianceTypes.map(ct => (
                    <option key={ct.id} value={ct.id}>{ct.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Expiry Date *</label>
                <input
                  required
                  type="date"
                  className="form-input"
                  value={complianceForm.expiry_date}
                  onChange={e => setComplianceForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Document (PDF, PNG, JPEG — max 10 MB)</label>
                <input
                  type="file"
                  className="form-input"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={e => setComplianceForm(prev => ({ ...prev, document: e.target.files?.[0] ?? null }))}
                />
                {!initialData?.id && complianceForm.document && (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', marginTop: '4px' }}>
                    Document will be uploaded after the asset is saved.
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn--secondary" onClick={() => { setShowComplianceModal(false); setComplianceForm({ compliance_type_id: '', expiry_date: '' }); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={savingCompliance}>
                  {savingCompliance ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
