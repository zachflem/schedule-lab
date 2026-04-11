import { useAuth } from '@/shared/lib/auth';
import { useSettings } from '@/shared/lib/useSettings';

interface HeaderProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

export function Header({ onMenuToggle, isMenuOpen }: HeaderProps) {
  const { user, loading } = useAuth();
  const settings = useSettings();

  return (
    <header className="header">
      <button
        className="menu-trigger"
        onClick={onMenuToggle}
        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        aria-expanded={isMenuOpen}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="nav-item-icon"
          style={{ transition: 'transform 0.3s ease' }}
        >
          {isMenuOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </>
          )}
        </svg>
      </button>

      <div className="header-brand">
        <img
          src={settings?.logo_url || '/logo.png'}
          alt={settings?.company_name || 'ScheduleLab'}
          className="header-brand-logo"
        />
        <div className="header-brand-text">
          <span className="header-brand-name">{settings?.company_name || 'ScheduleLab'}</span>
          {settings?.company_name && settings.company_name !== 'ScheduleLab' && (
            <span className="header-brand-powered">powered by ScheduleLab</span>
          )}
        </div>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
        {loading ? (
          <div className="spinner-small" />
        ) : user ? (
          <div className="header-avatar">
            {user.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
        ) : (
          <a
            href="/cdn-cgi/access/login"
            className="btn btn--sm btn--primary"
            style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)' }}
          >
            Login
          </a>
        )}
      </div>
    </header>
  );
}
