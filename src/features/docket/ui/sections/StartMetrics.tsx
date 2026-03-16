import type { AssetMetric } from '@/shared/validation/schemas';
import { toLocalDatetimeString, fromLocalDatetimeStringToIso } from '@/shared/lib/date';

interface StartMetricsProps {
  timeLeaveYard: string;
  timeArriveSite: string;
  assetMetrics: AssetMetric[];
  onTimeLeaveYardChange: (v: string) => void;
  onTimeArriveSiteChange: (v: string) => void;
  onAssetMetricsChange: (metrics: AssetMetric[]) => void;
  disabled: boolean;
}

export function StartMetrics({
  timeLeaveYard, timeArriveSite, assetMetrics,
  onTimeLeaveYardChange, onTimeArriveSiteChange, onAssetMetricsChange,
  disabled,
}: StartMetricsProps) {
  const updateMetric = (idx: number, field: keyof AssetMetric, value: string) => {
    const updated = [...assetMetrics];
    updated[idx] = { ...updated[idx], [field]: value };
    onAssetMetricsChange(updated);
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Leave Yard</label>
          <input
            type="datetime-local"
            className="form-input"
            value={toLocalDatetimeString(timeLeaveYard)}
            onChange={e => onTimeLeaveYardChange(fromLocalDatetimeStringToIso(e.target.value))}
            disabled={disabled}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Arrive Site</label>
          <input
            type="datetime-local"
            className="form-input"
            value={toLocalDatetimeString(timeArriveSite)}
            onChange={e => onTimeArriveSiteChange(fromLocalDatetimeStringToIso(e.target.value))}
            disabled={disabled}
          />
        </div>
      </div>

      {assetMetrics.length > 0 && (
        <div>
          <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-gray-700)' }}>
            Start Readings
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {assetMetrics.map((am, idx) => (
              <div key={am.asset_id} className="asset-metric-card">
                <div className="asset-metric-card__name">
                  {am.asset_name}
                  <span className="asset-metric-card__type" style={{ marginLeft: 'var(--space-2)' }}>
                    {am.asset_type_name}
                  </span>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Odometer</label>
                    <input
                      className="form-input"
                      type="number"
                      value={am.start_odometer}
                      onChange={e => updateMetric(idx, 'start_odometer', e.target.value)}
                      disabled={disabled}
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Engine Hours</label>
                    <input
                      className="form-input"
                      type="number"
                      value={am.start_engine_lower}
                      onChange={e => updateMetric(idx, 'start_engine_lower', e.target.value)}
                      disabled={disabled}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
