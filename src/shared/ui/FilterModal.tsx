import { useState } from 'react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterModalProps {
  title?: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
  onSelectAll?: () => void;
  onClearAll?: () => void;
  buttonLabel?: string;
}

export function FilterModal({
  title = 'Filter by Status',
  options,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
  buttonLabel = 'Filters',
}: FilterModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const allSelected = selected.length === options.length;
  const noneSelected = selected.length === 0;

  return (
    <>
      <button
        className="btn btn--secondary"
        onClick={() => setIsOpen(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="11" y1="18" x2="13" y2="18" />
        </svg>
        {buttonLabel}
        {!allSelected && !noneSelected && (
          <span style={{
            background: 'var(--color-primary-600)',
            color: 'white',
            borderRadius: '999px',
            fontSize: '10px',
            fontWeight: 700,
            padding: '1px 6px',
            lineHeight: '1.4',
          }}>
            {selected.length}
          </span>
        )}
        {noneSelected && (
          <span style={{
            background: 'var(--color-danger-500)',
            color: 'white',
            borderRadius: '999px',
            fontSize: '10px',
            fontWeight: 700,
            padding: '1px 6px',
            lineHeight: '1.4',
          }}>
            0
          </span>
        )}
      </button>

      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(360px, calc(100vw - 2rem))' }}
          >
            <div className="modal-header">
              <h2>{title}</h2>
              <button className="btn-close" onClick={() => setIsOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {options.map((option) => {
                  const isSelected = selected.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => onToggle(option.value)}
                      style={{
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${isSelected ? 'var(--color-primary-200)' : 'var(--color-gray-200)'}`,
                        background: isSelected ? 'var(--color-primary-50)' : 'white',
                        color: isSelected ? 'var(--color-primary-700)' : 'var(--color-gray-700)',
                        fontWeight: 600,
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: '44px',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <span>{option.label}</span>
                      {isSelected && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {onSelectAll && (
                  <button
                    className="btn btn--secondary btn--sm"
                    onClick={onSelectAll}
                    disabled={allSelected}
                  >
                    Select All
                  </button>
                )}
                {onClearAll && (
                  <button
                    className="btn btn--secondary btn--sm"
                    onClick={onClearAll}
                    disabled={noneSelected}
                  >
                    Clear
                  </button>
                )}
              </div>
              <button className="btn btn--primary btn--sm" onClick={() => setIsOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
