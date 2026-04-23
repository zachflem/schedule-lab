import { useState, useEffect, useCallback } from 'react';
import { api } from '@/shared/lib/api';
import type { Asset } from '@/shared/validation/schemas';
import { Spinner } from '@/shared/ui';
import { AssetEditModal } from './AssetEditModal';
import { AssetMaintenanceModal } from './AssetMaintenanceModal';

interface AssetWithMetadata extends Asset {
  asset_type_name: string;
  required_qualification_name?: string | null;
}

export function AssetListPage() {
  const [assets, setAssets] = useState<AssetWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // null = closed, 'new' = create, string UUID = edit
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [maintenanceAsset, setMaintenanceAsset] = useState<{ id: string; name: string } | null>(null);

  const fetchAssets = useCallback(async () => {
    try {
      const data = await api.get<AssetWithMetadata[]>('/assets');
      setAssets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleSaved = () => {
    setEditingId(null);
    fetchAssets();
  };

  const calculateNextService = (asset: AssetWithMetadata) => {
    const current = asset.service_interval_type === 'hours'
      ? asset.current_machine_hours
      : asset.current_odometer;
    const nextServiceValue = asset.last_service_meter_reading + asset.service_interval_value;
    const remaining = nextServiceValue - current;
    return { next: nextServiceValue, remaining, unit: asset.service_interval_type === 'hours' ? 'hrs' : 'km' };
  };

  if (loading) return <Spinner />;

  return (
    <div className="container p-8">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="docket-page__title" style={{ marginBottom: 'var(--space-1)' }}>Asset Fleet</h1>
            <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-sm)' }}>Manage machines, trucks, and other equipment metrics.</p>
          </div>
          <button className="btn btn--primary" onClick={() => setEditingId('new')}>Add Asset</button>
        </div>
      </div>

      {error && (
        <div style={{ padding: 'var(--space-4)', background: 'var(--color-danger-50)', color: 'var(--color-danger-700)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
          {error}
        </div>
      )}

      {/* Desktop table */}
      <div className="list-table-view card" style={{ overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
              <th style={{ textAlign: 'left', padding: 'var(--space-4)' }}>Name</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-4)' }}>Type / Category</th>
              <th style={{ textAlign: 'center', padding: 'var(--space-4)' }}>Current Meter</th>
              <th style={{ textAlign: 'center', padding: 'var(--space-4)' }}>Next Service</th>
              <th style={{ textAlign: 'right', padding: 'var(--space-4)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assets.map(asset => {
              const service = calculateNextService(asset);
              const isOverdue = service.remaining <= 0;
              const isNearing = service.remaining > 0 && service.remaining < (asset.service_interval_value * 0.2);
              return (
                <tr key={asset.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                  <td style={{ padding: 'var(--space-4)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>{asset.name}</div>
                    {asset.required_qualification_name && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>Req: {asset.required_qualification_name}</div>
                    )}
                  </td>
                  <td style={{ padding: 'var(--space-4)' }}>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-700)' }}>{asset.asset_type_name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>{asset.category || 'General'}</div>
                  </td>
                  <td style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                    <div style={{ fontWeight: 500 }}>
                      {asset.service_interval_type === 'hours' ? `${asset.current_machine_hours} hrs` : `${asset.current_odometer} km`}
                    </div>
                  </td>
                  <td style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-1) var(--space-2)', borderRadius: 'var(--radius-sm)', display: 'inline-block', background: isOverdue ? 'var(--color-danger-50)' : isNearing ? 'var(--color-warning-50)' : 'var(--color-gray-50)', color: isOverdue ? 'var(--color-danger-700)' : isNearing ? 'var(--color-warning-700)' : 'var(--color-gray-700)', fontWeight: (isOverdue || isNearing) ? 600 : 400 }}>
                      {service.next} {service.unit}
                      <span style={{ marginLeft: 'var(--space-2)', fontSize: '10px', opacity: 0.8 }}>
                        ({service.remaining > 0 ? `due in ${service.remaining}` : `${Math.abs(service.remaining)} overdue`})
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                      <button className="btn btn--secondary btn--sm" onClick={() => setMaintenanceAsset({ id: asset.id!, name: asset.name })}>Maintenance</button>
                      <button className="btn btn--secondary btn--sm" onClick={() => setEditingId(asset.id!)}>Edit</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {assets.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-gray-400)' }}>No assets found in the fleet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="list-card-view">
        {assets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-gray-400)' }}>No assets found in the fleet.</div>
        ) : assets.map(asset => {
          const service = calculateNextService(asset);
          const isOverdue = service.remaining <= 0;
          const isNearing = service.remaining > 0 && service.remaining < (asset.service_interval_value * 0.2);
          return (
            <div key={asset.id} className="card" style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-gray-900)' }}>{asset.name}</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginTop: '2px' }}>
                    {asset.asset_type_name}{asset.category ? ` · ${asset.category}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button className="btn btn--secondary btn--sm" onClick={() => setMaintenanceAsset({ id: asset.id!, name: asset.name })}>Maintenance</button>
                  <button className="btn btn--secondary btn--sm" onClick={() => setEditingId(asset.id!)}>Edit</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', fontSize: 'var(--text-sm)' }}>
                <span style={{ color: 'var(--color-gray-600)' }}>
                  Current: <strong>{asset.service_interval_type === 'hours' ? `${asset.current_machine_hours} hrs` : `${asset.current_odometer} km`}</strong>
                </span>
                <span style={{ padding: '1px 8px', borderRadius: 'var(--radius-sm)', background: isOverdue ? 'var(--color-danger-50)' : isNearing ? 'var(--color-warning-50)' : 'var(--color-gray-50)', color: isOverdue ? 'var(--color-danger-700)' : isNearing ? 'var(--color-warning-700)' : 'var(--color-gray-600)', fontWeight: (isOverdue || isNearing) ? 600 : 400 }}>
                  {isOverdue ? `${Math.abs(service.remaining)} ${service.unit} overdue` : `${service.remaining} ${service.unit} to service`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {editingId !== null && (
        <AssetEditModal
          assetId={editingId === 'new' ? null : editingId}
          onClose={() => setEditingId(null)}
          onSaved={handleSaved}
        />
      )}

      {maintenanceAsset !== null && (
        <AssetMaintenanceModal
          assetId={maintenanceAsset.id}
          assetName={maintenanceAsset.name}
          onClose={() => setMaintenanceAsset(null)}
        />
      )}
    </div>
  );
}
