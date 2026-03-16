import type { PreStartSafetyCheck, Hazard, AssetMetric } from '@/shared/validation/schemas';

interface SafetyChecklistProps {
  safetyCheck: PreStartSafetyCheck;
  hazards: Hazard[];
  assetMetrics: AssetMetric[];
  onSafetyCheckChange: (check: PreStartSafetyCheck) => void;
  onHazardsChange: (hazards: Hazard[]) => void;
  disabled: boolean;
}

const COMM_METHODS = ['UHF Radio', 'Hand Signals', 'Verbal', 'Mobile Phone', 'Two-Way Radio'];

export function SafetyChecklist({
  safetyCheck, hazards, assetMetrics,
  onSafetyCheckChange, onHazardsChange, disabled,
}: SafetyChecklistProps) {
  const updateCheck = (key: string, value: string) => {
    onSafetyCheckChange({
      ...safetyCheck,
      checks: { ...safetyCheck.checks, [key]: value },
    });
  };

  const toggleComm = (method: string) => {
    const current = safetyCheck.commMethods || [];
    const updated = current.includes(method)
      ? current.filter((m: string) => m !== method)
      : [...current, method];
    onSafetyCheckChange({ ...safetyCheck, commMethods: updated });
  };

  const addHazard = () => {
    onHazardsChange([...hazards, { detail: '', control: '' }]);
  };

  const updateHazard = (idx: number, field: 'detail' | 'control', value: string) => {
    const updated = [...hazards];
    updated[idx] = { ...updated[idx], [field]: value };
    onHazardsChange(updated);
  };

  const removeHazard = (idx: number) => {
    onHazardsChange(hazards.filter((_, i) => i !== idx));
  };

  // Collect all checklist questions from asset types
  const allQuestions: { key: string; question: string; assetName: string }[] = [];
  assetMetrics.forEach(am => {
    (am.checklist_questions || []).forEach((q: string, qi: number) => {
      const key = `${am.asset_id}_q${qi}`;
      allQuestions.push({ key, question: q, assetName: am.asset_name });
    });
  });

  const hasCrane = assetMetrics.some(a =>
    a.asset_type_name?.toLowerCase().includes('crane')
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Per-asset checklists */}
      {allQuestions.length > 0 && (
        <div>
          <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-gray-700)' }}>
            Safety Checks
          </h4>
          {allQuestions.map(({ key, question, assetName }) => (
            <div key={key} className="checklist-item">
              <span className="checklist-item__question">
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>[{assetName}]</span>{' '}
                {question}
              </span>
              <div className="checklist-item__options">
                {(['YES', 'NO', 'N/A'] as const).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    disabled={disabled}
                    className={`checklist-option ${
                      safetyCheck.checks?.[key] === opt
                        ? opt === 'YES' ? 'checklist-option--yes'
                          : opt === 'NO' ? 'checklist-option--no'
                          : 'checklist-option--na'
                        : ''
                    }`}
                    onClick={() => updateCheck(key, opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Crane pre-lift fields */}
      {hasCrane && (
        <div>
          <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-gray-700)' }}>
            Pre-Lift Assessment
          </h4>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Est. Weight</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input
                  className="form-input"
                  type="number"
                  value={safetyCheck.estWeight || ''}
                  onChange={e => onSafetyCheckChange({ ...safetyCheck, estWeight: e.target.value })}
                  disabled={disabled}
                  placeholder="0"
                />
                <select
                  className="form-input"
                  style={{ width: '5rem' }}
                  value={safetyCheck.weightUnit || 't'}
                  onChange={e => onSafetyCheckChange({ ...safetyCheck, weightUnit: e.target.value as 't' | 'kg' })}
                  disabled={disabled}
                >
                  <option value="t">Tonnes</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Est. Radius (m)</label>
              <input
                className="form-input"
                type="number"
                value={safetyCheck.estRadius || ''}
                onChange={e => onSafetyCheckChange({ ...safetyCheck, estRadius: e.target.value })}
                disabled={disabled}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Crane Capacity (t)</label>
              <input
                className="form-input"
                type="number"
                value={safetyCheck.craneCapacity || ''}
                onChange={e => onSafetyCheckChange({ ...safetyCheck, craneCapacity: e.target.value })}
                disabled={disabled}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">% Capacity</label>
              <input
                className="form-input form-input--readonly"
                value={
                  safetyCheck.estWeight && safetyCheck.craneCapacity
                    ? `${Math.round((parseFloat(safetyCheck.estWeight) / parseFloat(safetyCheck.craneCapacity)) * 100)}%`
                    : '—'
                }
                readOnly
              />
            </div>
          </div>
        </div>
      )}

      {/* Communication methods */}
      <div>
        <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-gray-700)' }}>
          Communication Methods
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {COMM_METHODS.map(method => (
            <button
              key={method}
              type="button"
              className={`checklist-option ${(safetyCheck.commMethods || []).includes(method) ? 'checklist-option--yes' : ''}`}
              onClick={() => toggleComm(method)}
              disabled={disabled}
              style={{ padding: 'var(--space-2) var(--space-3)' }}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* Hazards */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
          <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-gray-700)' }}>
            Hazards & Controls
          </h4>
          {!disabled && (
            <button type="button" className="btn btn--secondary btn--sm" onClick={addHazard}>
              + Add Hazard
            </button>
          )}
        </div>
        {hazards.length === 0 && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-400)', fontStyle: 'italic' }}>
            No hazards recorded
          </p>
        )}
        {hazards.map((h, i) => (
          <div key={i} className="hazard-row">
            <input
              className="form-input"
              placeholder="Hazard detail..."
              value={h.detail}
              onChange={e => updateHazard(i, 'detail', e.target.value)}
              disabled={disabled}
            />
            <input
              className="form-input"
              placeholder="Control measure..."
              value={h.control}
              onChange={e => updateHazard(i, 'control', e.target.value)}
              disabled={disabled}
            />
            {!disabled && (
              <button type="button" className="btn btn--danger btn--icon btn--sm" onClick={() => removeHazard(i)}>
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
