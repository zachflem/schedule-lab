import { useState, useEffect } from 'react';
import { api } from '@/shared/lib/api';
import { AssetSchema, type Asset, type AssetCompliance } from '@/shared/validation/schemas';
import { Spinner, ErrorMessage } from '@/shared/ui';
import { AssetForm } from './AssetForm';

interface AssetEditModalProps {
  assetId: string | null; // null = new asset
  onClose: () => void;
  onSaved: () => void;
}

export function AssetEditModal({ assetId, onClose, onSaved }: AssetEditModalProps) {
  const isNew = assetId === null;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetData, setAssetData] = useState<Partial<Asset> & { extension_data?: any } | undefined>();

  useEffect(() => {
    if (!isNew) {
      async function fetchAsset() {
        try {
          const data = await api.get<Asset & { extension_data?: any }>(`/assets/${assetId}`);
          setAssetData(data);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch asset');
        } finally {
          setLoading(false);
        }
      }
      fetchAsset();
    }
  }, [assetId, isNew]);

  const handleSave = async (data: any) => {
    setSaving(true);
    setError(null);

    try {
      AssetSchema.parse(data);

      if (!isNew) {
        await api.put(`/assets/${assetId}`, data);
      } else {
        const { id: newId } = await api.post<{ id: string }>('/assets', data);
        const pendingEntries: AssetCompliance[] = data.compliance_entries ?? [];
        for (const entry of pendingEntries) {
          await api.post(`/assets/${newId}/compliance`, {
            compliance_type_id: entry.compliance_type_id,
            expiry_date: entry.expiry_date,
          });
        }
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save asset');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-slide-in" style={{ maxWidth: '720px', width: '100%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
            {isNew ? 'Add New Asset' : `Edit ${assetData?.name || 'Asset'}`}
          </h2>
          <button type="button" className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <Spinner />
          ) : (
            <>
              {error && <ErrorMessage message={error} style={{ marginBottom: 'var(--space-4)' }} />}
              <AssetForm
                initialData={assetData}
                onSave={handleSave}
                onCancel={onClose}
                saving={saving}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
