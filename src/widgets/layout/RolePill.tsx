import { useState } from 'react';
import { useAuth } from '@/shared/lib/auth';

export function RolePill() {
  const { user, setMockRole } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!user) return null;

  const isRealAdmin = user.realRole === 'admin' || user.role === 'admin';
  const currentRole = user.role;
  const isMocked = user.isMocked;

  const roleColors: Record<string, { bg: string; text: string; border: string }> = {
    admin: {
      bg: 'var(--color-primary-50)',
      text: 'var(--color-primary-700)',
      border: 'var(--color-primary-200)',
    },
    dispatcher: {
      bg: 'var(--color-success-50)',
      text: 'var(--color-success-700)',
      border: 'var(--color-success-500)',
    },
    operator: {
      bg: 'var(--color-warning-50)',
      text: 'var(--color-warning-700)',
      border: 'var(--color-warning-500)',
    },
  };

  const colors = roleColors[currentRole] || roleColors.operator;

  const handlePillClick = () => {
    if (isRealAdmin) {
      setIsModalOpen(true);
    }
  };

  const handleRoleSelect = async (role: string) => {
    await setMockRole(role);
    setIsModalOpen(false);
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <>
      <div 
        className={`role-pill ${isRealAdmin ? 'cursor-pointer' : ''}`}
        onClick={handlePillClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 10px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 700,
          backgroundColor: colors.bg,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          transition: 'all 0.2s ease',
          userSelect: 'none',
          boxShadow: isMocked ? '0 0 8px var(--color-warning-200)' : 'none',
        }}
        title={isRealAdmin ? "Click to switch roles (Admins only)" : `Role: ${capitalize(currentRole)}`}
      >
        {capitalize(currentRole)}
        {isMocked && <span style={{ marginLeft: '4px', color: 'var(--color-warning-600)' }}>*</span>}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '320px' }}>
            <div className="modal-header">
              <h2>Switch Mock Role</h2>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-4)' }}>
                Select a user level to simulate. This will affect your available menu items and permissions.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {(['admin', 'dispatcher', 'operator'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleSelect(role)}
                    style={{
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-gray-200)',
                      background: currentRole === role ? 'var(--color-primary-50)' : 'white',
                      color: currentRole === role ? 'var(--color-primary-700)' : 'var(--color-gray-700)',
                      fontWeight: 600,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'between',
                    }}
                  >
                    <span style={{ flex: 1 }}>{capitalize(role)}</span>
                    {currentRole === role && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn--secondary" 
                onClick={() => setIsModalOpen(false)}
                style={{ fontSize: 'var(--text-sm)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
