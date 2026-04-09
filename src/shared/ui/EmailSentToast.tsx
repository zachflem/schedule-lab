import { useEffect } from 'react';

interface EmailSentToastProps {
  message: string;
  onClose: () => void;
}

export function EmailSentToast({ message, onClose }: EmailSentToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="email-toast">
      <div className="email-toast__icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-success-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <polyline points="2,7 12,13 22,7" />
        </svg>
      </div>
      <div className="email-toast__body">
        <p className="email-toast__title">Email notification sent</p>
        <p className="email-toast__message">{message}</p>
      </div>
      <button className="email-toast__close" onClick={onClose} aria-label="Dismiss">
        &times;
      </button>
    </div>
  );
}
