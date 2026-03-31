import { useAuth } from '@/shared/lib/auth';

interface HeaderProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

export function Header({ onMenuToggle, isMenuOpen }: HeaderProps) {
  const { user, loading } = useAuth();
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

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {loading ? (
          <div className="spinner-small" />
        ) : user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-gray-600)' }}>
              {user.name}
            </span>
            <div 
              style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                background: 'var(--color-primary-100)', 
                color: 'var(--color-primary-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                border: '1px solid var(--color-primary-200)'
              }}
            >
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
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
        
        {user && (
          <a 
            href="/cdn-cgi/access/logout"
            className="btn btn--sm btn--secondary"
            style={{ 
              fontSize: '10px', 
              padding: '2px 8px', 
              opacity: 0.7,
              textDecoration: 'none',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Logout
          </a>
        )}
      </div>
    </header>
  );
}
