interface JobNotesProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

export function JobNotes({ value, onChange, disabled }: JobNotesProps) {
  return (
    <div className="form-group">
      <label className="form-label">Actual Work Description</label>
      <textarea
        className="form-input"
        rows={4}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Describe the work completed on site..."
      />
    </div>
  );
}
