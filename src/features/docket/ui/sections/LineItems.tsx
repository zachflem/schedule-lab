import type { DocketLineItem } from '@/shared/validation/schemas';

interface LineItemsProps {
  items: DocketLineItem[];
  onChange: (items: DocketLineItem[]) => void;
  disabled: boolean;
}

export function LineItems({ items, onChange, disabled }: LineItemsProps) {
  const addItem = () => {
    onChange([...items, {
      description: '',
      inventory_code: 'AD-HOC',
      quantity: 0,
      unit_rate: 0,
      is_taxable: true,
    }]);
  };

  const updateItem = (idx: number, field: keyof DocketLineItem, value: unknown) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((sum, li) => sum + li.quantity * li.unit_rate, 0);
  const gst = items
    .filter(li => li.is_taxable)
    .reduce((sum, li) => sum + li.quantity * li.unit_rate * 0.1, 0);
  const total = subtotal + gst;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase' }}>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
        {!disabled && (
          <button type="button" className="btn btn--secondary btn--sm" onClick={addItem}>
            + Add Item
          </button>
        )}
      </div>

      {items.map((li, idx) => (
        <div key={idx} className="line-item-row">
          <input
            className="form-input"
            placeholder="Description"
            value={li.description}
            onChange={e => updateItem(idx, 'description', e.target.value)}
            disabled={disabled}
          />
          <input
            className="form-input"
            placeholder="Code"
            value={li.inventory_code}
            onChange={e => updateItem(idx, 'inventory_code', e.target.value)}
            disabled={disabled}
          />
          <input
            className="form-input"
            type="number"
            placeholder="Qty"
            value={li.quantity || ''}
            onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
            disabled={disabled}
            step="0.25"
          />
          <input
            className="form-input"
            type="number"
            placeholder="Rate"
            value={li.unit_rate || ''}
            onChange={e => updateItem(idx, 'unit_rate', parseFloat(e.target.value) || 0)}
            disabled={disabled}
            step="0.01"
          />
          <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', textAlign: 'right', whiteSpace: 'nowrap' }}>
            ${(li.quantity * li.unit_rate).toFixed(2)}
          </div>
          {!disabled && (
            <button type="button" className="btn btn--danger btn--icon btn--sm" onClick={() => removeItem(idx)}>
              ✕
            </button>
          )}
        </div>
      ))}

      {items.length > 0 && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <div className="line-items-total">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', padding: 'var(--space-1) 0' }}>
            <span>GST (10%)</span>
            <span>${gst.toFixed(2)}</span>
          </div>
          <div className="line-items-total" style={{ borderTopWidth: '3px' }}>
            <span>Total (inc. GST)</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
