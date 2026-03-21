import { useState, useEffect } from 'react';
import { api } from '@/shared/lib/api';
import { type Asset, type ExtensionFieldDefinition } from '@/shared/validation/schemas';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [types, quals] = await Promise.all([
          api.get<AssetTypeEnriched[]>('/asset-types'),
          api.get<Qualification[]>('/qualifications')
        ]);
        setAssetTypes(types);
        setQualifications(quals);
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
      extension_data: {
        ...(prev.extension_data || {}),
        [key]: value
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (loading) return <div>Loading form...</div>;

  return (
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
        <div className="card__body flex-col gap-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Category</label>
              <input 
                className="form-input"
                value={formData.category || ''}
                onChange={e => handleInputChange('category', e.target.value)}
                placeholder="e.g. Mobile Crane"
              />
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
      </div>

      {/* Pricing & Operations */}
      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Pricing & Operations</h3>
        </div>
        <div className="card__body flex-col gap-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
        <div className="card__body flex-col gap-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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

      {/* Compliance Expiries */}
      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Compliance & Expiries</h3>
        </div>
        <div className="card__body flex-col gap-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">CraneSafe Expiry</label>
              <input 
                type="date"
                className="form-input"
                value={formData.cranesafe_expiry || ''}
                onChange={e => handleInputChange('cranesafe_expiry', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Rego Expiry</label>
              <input 
                type="date"
                className="form-input"
                value={formData.rego_expiry || ''}
                onChange={e => handleInputChange('rego_expiry', e.target.value)}
              />
            </div>
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
  );
}
