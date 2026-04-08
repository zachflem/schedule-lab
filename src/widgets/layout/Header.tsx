import { useAuth } from '@/shared/lib/auth';
import { RolePill } from './RolePill';

interface HeaderProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

export function Header({ onMenuToggle, isMenuOpen }: HeaderProps) {
  const { user, loading, logout } = useAuth();
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

      <div className="header-title">ScheduleLab</div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {/* Role pill — hidden on mobile, shown in nav menu instead */}
        {user && (
          <div className="header-role-pill">
            <RolePill />
          </div>
        )}

        {loading ? (
          <div className="spinner-small" />
        ) : user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {/* Name — hidden on mobile */}
            <span className="header-user-name">
              {user.name}
            </span>
            {/* Avatar — always visible */}
            <div className="header-avatar">
              {user.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
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

        {/* Logout — hidden on mobile, shown in nav menu instead */}
        {user && (
          <button
            onClick={logout}
            className="btn btn--sm btn--secondary header-logout"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
