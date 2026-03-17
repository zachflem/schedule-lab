export function CustomerSettingsTab() {
  return (
    <div className="card">
      <div className="card__header">
        <h3 className="card__title">Customer Configuration</h3>
      </div>
      <div className="card__body">
        <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-sm)' }}>
          Customer-specific platform settings will be managed here. This currently includes viewing defaults and portal settings.
        </p>
        <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-8)', border: '2px dashed var(--color-gray-200)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--color-gray-400)' }}>
          Coming Soon
        </div>
      </div>
    </div>
  );
}
