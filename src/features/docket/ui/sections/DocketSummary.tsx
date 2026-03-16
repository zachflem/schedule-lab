import type { DocketFormState } from '../../api/useDocket';

interface DocketSummaryProps {
  state: DocketFormState;
}

export function DocketSummary({ state }: DocketSummaryProps) {
  const { time_leave_yard, time_return_yard, time_arrive_site, time_leave_site, break_duration_minutes } = state;

  const operatorHours = calcHours(time_leave_yard, time_return_yard, break_duration_minutes);
  const machineHours = calcHours(time_arrive_site, time_leave_site, break_duration_minutes);
  const travelTime = calcHours(time_leave_yard, time_arrive_site, 0) + calcHours(time_leave_site, time_return_yard, 0);

  const lineTotal = state.lineItems.reduce((s, li) => s + li.quantity * li.unit_rate, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Time Summary */}
      <div className="card">
        <div className="card__header">
          <span className="card__title">Time Summary</span>
        </div>
        <div className="card__body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
            <SummaryCell label="Operator Hours" value={`${operatorHours.toFixed(2)} hrs`} />
            <SummaryCell label="Machine Hours" value={`${machineHours.toFixed(2)} hrs`} />
            <SummaryCell label="Travel Time" value={`${travelTime.toFixed(2)} hrs`} />
          </div>
          <div style={{ marginTop: 'var(--space-2)' }}>
            <SummaryCell label="Break" value={`${break_duration_minutes} mins`} />
          </div>
        </div>
      </div>

      {/* Equipment */}
      {state.assetMetrics.length > 0 && (
        <div className="card">
          <div className="card__header">
            <span className="card__title">Equipment</span>
          </div>
          <div className="card__body">
            {state.assetMetrics.map(am => (
              <div key={am.asset_id} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-1) 0', fontSize: 'var(--text-sm)' }}>
                <span style={{ fontWeight: 500 }}>{am.asset_name}</span>
                <span style={{ color: 'var(--color-gray-500)' }}>{am.asset_type_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Billing Summary */}
      {state.lineItems.length > 0 && (
        <div className="card">
          <div className="card__header">
            <span className="card__title">Billing Summary</span>
          </div>
          <div className="card__body">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 'var(--text-lg)' }}>
              <span>Subtotal</span>
              <span>${lineTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-gray-900)' }}>
        {value}
      </div>
    </div>
  );
}

function calcHours(start: string, end: string, breakMins: number): number {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(0, (e - s - breakMins * 60000) / 3600000);
}
