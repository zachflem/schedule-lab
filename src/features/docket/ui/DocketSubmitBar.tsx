interface SubmitBarProps {
  onSaveDraft: () => void;
  onSubmit: () => void;
  saving: boolean;
  disabled: boolean;
  canSubmit: boolean;
  validationMessage?: string;
}

export function DocketSubmitBar({
  onSaveDraft, onSubmit, saving, disabled, canSubmit, validationMessage,
}: SubmitBarProps) {
  if (disabled) {
    return (
      <div className="submit-bar">
        <span className="badge badge--locked">🔒 Docket Locked</span>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
          This docket has been submitted and cannot be modified.
        </span>
      </div>
    );
  }

  return (
    <div className="submit-bar">
      <div>
        {validationMessage && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger-600)' }}>
            {validationMessage}
          </span>
        )}
      </div>
      <div className="submit-bar__actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={onSaveDraft}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          type="button"
          className="btn btn--success"
          onClick={onSubmit}
          disabled={saving || !canSubmit}
        >
          {saving ? 'Submitting...' : '🔒 Lock & Submit'}
        </button>
      </div>
    </div>
  );
}
