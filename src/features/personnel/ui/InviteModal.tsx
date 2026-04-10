import { useState } from 'react';

interface InviteModalProps {
  recipientName: string;
  isNewUser: boolean;
  onSend: (message: string) => void;
  onSkip?: () => void;
  onClose: () => void;
  isSending: boolean;
}

export function InviteModal({ recipientName, isNewUser, onSend, onSkip, onClose, isSending }: InviteModalProps) {
  const [message, setMessage] = useState('');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '500px', width: '90%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Send Invite to {recipientName}</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ padding: 'var(--space-6)' }}>
          <p style={{ margin: '0 0 var(--space-4)', color: 'var(--color-gray-600)', fontSize: 'var(--text-sm)' }}>
            {recipientName} will receive an email with login instructions.
            You can include a personal message below.
          </p>
          <div className="form-group">
            <label className="form-label">Custom Message <span style={{ color: 'var(--color-gray-400)', fontWeight: 400 }}>(optional)</span></label>
            <textarea
              className="form-input"
              rows={4}
              placeholder="e.g. Hi! We're excited to have you on board. Let us know if you have any questions."
              value={message}
              onChange={e => setMessage(e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
          {isNewUser && onSkip && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onSkip}
              disabled={isSending}
            >
              Save Without Invite
            </button>
          )}
          {!isNewUser && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onClose}
              disabled={isSending}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onSend(message)}
            disabled={isSending}
          >
            {isSending ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}
