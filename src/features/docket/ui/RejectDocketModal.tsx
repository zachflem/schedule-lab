import { useState } from 'react';
import { api } from '@/shared/lib/api';
import { ErrorMessage } from '@/shared/ui';

interface RejectDocketModalProps {
  docketId: string;
  customerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RejectDocketModal({ docketId, customerName, onClose, onSuccess }: RejectDocketModalProps) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!notes.trim()) {
      setError('Notes are required to explain what needs revision.');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      await api.post(`/dockets/${docketId}/reject`, { notes });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send back docket');
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>
          Send Docket Back
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-4)' }}>
          Customer: <strong>{customerName}</strong>
        </p>

        {error && <ErrorMessage message={error} style={{ marginBottom: 'var(--space-3)' }} />}

        <div className="form-group">
          <label className="form-label" htmlFor="dispatcher_notes">
            Revision Notes (Required)
          </label>
          <textarea
            id="dispatcher_notes"
            className="form-control"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Explain what the operator needs to fix or add..."
            disabled={submitting}
            autoFocus
          />
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
          <button 
            type="button" 
            className="btn btn--secondary" 
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn--danger" 
            onClick={handleSubmit}
            disabled={submitting || !notes.trim()}
          >
            {submitting ? 'Sending...' : 'Send Back to Operator'}
          </button>
        </div>
      </div>
    </div>
  );
}
