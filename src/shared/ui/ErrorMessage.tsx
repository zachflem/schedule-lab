import { useState, type CSSProperties } from 'react';
import { useToast } from '../lib/toast';

export function ErrorMessage({ message, style }: { message: string; style?: CSSProperties }) {
  const { showToast } = useToast();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function sendReport() {
    if (sent || sending) return;
    setSending(true);
    try {
      await fetch('/api/report-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, url: window.location.href }),
      });
      setSent(true);
      showToast('Error report sent', 'success');
    } catch {
      showToast('Could not send error report', 'warning');
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{
        padding: 'var(--space-4)',
        background: 'var(--color-danger-50)',
        color: 'var(--color-danger-700)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        justifyContent: 'space-between',
        ...style,
      }}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={sendReport}
        disabled={sending || sent}
        title={sent ? 'Report sent' : 'Send error report'}
        style={{
          background: 'none',
          border: 'none',
          cursor: sent ? 'default' : 'pointer',
          padding: 'var(--space-1)',
          color: sent ? 'var(--color-danger-400)' : 'var(--color-danger-600)',
          flexShrink: 0,
          opacity: sending ? 0.5 : 1,
          lineHeight: 0,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 16, height: 16 }}
        >
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </button>
    </div>
  );
}
