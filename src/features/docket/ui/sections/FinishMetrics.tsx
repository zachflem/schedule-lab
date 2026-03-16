import type { AssetMetric } from '@/shared/validation/schemas';
import { toLocalDatetimeString, fromLocalDatetimeStringToIso } from '@/shared/lib/date';

interface FinishMetricsProps {
  timeLeaveSite: string;
  timeReturnYard: string;
  breakMinutes: number;
  assetMetrics: AssetMetric[];
  onTimeLeaveSiteChange: (v: string) => void;
  onTimeReturnYardChange: (v: string) => void;
  onBreakMinutesChange: (v: number) => void;
  onAssetMetricsChange: (metrics: AssetMetric[]) => void;
  disabled: boolean;
}

export function FinishMetrics({
  timeLeaveSite, timeReturnYard, breakMinutes, assetMetrics,
  onTimeLeaveSiteChange, onTimeReturnYardChange, onBreakMinutesChange,
  onAssetMetricsChange, disabled,
}: FinishMetricsProps) {
  const updateMetric = (idx: number, field: keyof AssetMetric, value: string) => {
    const updated = [...assetMetrics];
    updated[idx] = { ...updated[idx], [field]: value };
    onAssetMetricsChange(updated);
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Leave Site</label>
          <input
            type="datetime-local"
            className="form-input"
            value={toLocalDatetimeString(timeLeaveSite)}
            onChange={e => onTimeLeaveSiteChange(fromLocalDatetimeStringToIso(e.target.value))}
            disabled={disabled}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Return Yard</label>
          <input
            type="datetime-local"
            className="form-input"
            value={toLocalDatetimeString(timeReturnYard)}
            onChange={e => onTimeReturnYardChange(fromLocalDatetimeStringToIso(e.target.value))}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="form-group" style={{ maxWidth: '12rem' }}>
        <label className="form-label">Break Duration (mins)</label>
        <input
          type="number"
          className="form-input"
          value={breakMinutes}
          onChange={e => onBreakMinutesChange(parseInt(e.target.value) || 0)}
          disabled={disabled}
          min={0}
          step={15}
        />
      </div>

      {assetMetrics.length > 0 && (
        <div>
          <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-gray-700)' }}>
            End Readings
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {assetMetrics.map((am, idx) => (
              <div key={am.asset_id} className="asset-metric-card">
                <div className="asset-metric-card__name">
                  {am.asset_name}
                  <span className="asset-metric-card__type" style={{ marginLeft: 'var(--space-2)' }}>{am.asset_type_name}</span>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Odometer</label>
                    <input
                      className="form-input"
                      type="number"
                      value={am.end_odometer}
                      onChange={e => updateMetric(idx, 'end_odometer', e.target.value)}
                      disabled={disabled}
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Engine Hours</label>
                    <input
                      className="form-input"
                      type="number"
                      value={am.end_engine_lower}
                      onChange={e => updateMetric(idx, 'end_engine_lower', e.target.value)}
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
