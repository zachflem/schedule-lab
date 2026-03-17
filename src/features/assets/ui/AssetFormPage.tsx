import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api } from '@/shared/lib/api';
import { AssetSchema, type Asset } from '@/shared/validation/schemas';
import { Spinner } from '@/shared/ui';
import { AssetForm } from './AssetForm';

export function AssetFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!(id && id !== 'new'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetData, setAssetData] = useState<Partial<Asset> & { extension_data?: any } | undefined>();

  useEffect(() => {
    if (id && id !== 'new') {
      async function fetchAsset() {
        try {
          const data = await api.get<Asset & { extension_data?: any }>(`/assets/${id}`);
          setAssetData(data);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch asset');
        } finally {
          setLoading(false);
        }
      }
      fetchAsset();
    }
  }, [id]);

  const handleSave = async (data: any) => {
    setSaving(true);
    setError(null);

    try {
      // Validate core data
      AssetSchema.parse(data);

      if (id && id !== 'new') {
        await api.put(`/assets/${id}`, data);
      } else {
        await api.post('/assets', data);
      }
      navigate('/assets');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="container" style={{ padding: 'var(--space-8)', maxWidth: '900px' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 className="docket-page__title">
          {id === 'new' ? 'Add New Asset' : `Edit ${assetData?.name || 'Asset'}`}
        </h1>
      </div>

      {error && (
        <div style={{ 
          padding: 'var(--space-4)', 
          background: 'var(--color-danger-50)', 
          color: 'var(--color-danger-700)', 
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-6)'
        }}>
          {error}
        </div>
      )}

      <AssetForm 
        initialData={assetData} 
        onSave={handleSave} 
        onCancel={() => navigate('/assets')} 
        saving={saving}
      />
    </div>
  );
}
