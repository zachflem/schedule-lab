import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { api } from '@/shared/lib/api';
import type { Personnel } from '@/shared/validation/schemas';
import { Spinner } from '@/shared/ui';
import { useAuth } from '@/shared/lib/auth';

function formatLastLogin(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);

  if (date >= todayStart) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (date >= yesterdayStart) {
    return 'Yesterday';
  }
  return date.toLocaleDateString();
}

export function PersonnelListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPersonnel() {
      try {
        const data = await api.get<Personnel[]>('/personnel');
        setPersonnel(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch personnel');
      } finally {
        setLoading(false);
      }
    }
    fetchPersonnel();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="container p-8">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 className="docket-page__title">Personnel & Operators</h1>
        <Link to="/personnel/new" className="btn btn--primary">Add Person</Link>
      </div>

      {error && (
        <div style={{ padding: 'var(--space-4)', background: 'var(--color-danger-50)', color: 'var(--color-danger-700)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
          {error}
        </div>
      )}

      {/* Desktop table */}
      <div className="list-table-view card" style={{ overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
              <th style={{ textAlign: 'left', padding: 'var(--space-3)' }}>Name</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-3)' }}>Contact</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-3)' }}>Qualifications</th>
              <th style={{ textAlign: 'center', padding: 'var(--space-3)' }}>Can Login</th>
              {isAdmin && <th style={{ textAlign: 'left', padding: 'var(--space-3)' }}>Last Login</th>}
              <th style={{ textAlign: 'right', padding: 'var(--space-3)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {personnel.map(person => (
              <tr key={person.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                <td style={{ padding: 'var(--space-3)', fontWeight: 600 }}>{person.name}</td>
                <td style={{ padding: 'var(--space-3)', color: 'var(--color-gray-600)', fontSize: 'var(--text-sm)' }}>
                  <div>{person.email}</div>
                  <div style={{ color: 'var(--color-gray-400)' }}>{person.phone}</div>
                </td>
                <td style={{ padding: 'var(--space-3)', color: 'var(--color-gray-600)', fontSize: 'var(--text-sm)' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {person.qualifications && person.qualifications.length > 0 ? (
                      person.qualifications.map((q: any) => {
                        const expiry = q.expiry_date ? new Date(q.expiry_date) : null;
                        const diffDays = expiry ? Math.ceil((expiry.getTime() - Date.now()) / 86400000) : null;
                        const color = diffDays === null ? { bg: 'var(--color-primary-50)', text: 'var(--color-primary-700)' }
                          : diffDays <= 30 ? { bg: 'var(--color-danger-50)', text: 'var(--color-danger-700)' }
                          : diffDays <= 90 ? { bg: 'var(--color-warning-50)', text: 'var(--color-warning-600)' }
                          : { bg: 'var(--color-success-50)', text: 'var(--color-success-700)' };
                        return (
                          <span key={q.id} title={expiry ? `Expires: ${expiry.toLocaleDateString()}` : undefined} style={{ padding: '2px 6px', background: color.bg, color: color.text, borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                            {q.name}{expiry && <span style={{ opacity: 0.6, fontSize: '8px' }}> ({q.expiry_date})</span>}
                          </span>
                        );
                      })
                    ) : <span style={{ color: 'var(--color-gray-300)' }}>None</span>}
                  </div>
                </td>
                <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: 'var(--text-xs)', fontWeight: 600, background: person.can_login ? 'var(--color-success-50)' : 'var(--color-gray-100)', color: person.can_login ? 'var(--color-success-700)' : 'var(--color-gray-600)' }}>
                    {person.can_login ? 'Yes' : 'No'}
                  </span>
                </td>
                {isAdmin && (
                  <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
                    {person.last_login_date ? formatLastLogin(person.last_login_date) : <span style={{ color: 'var(--color-gray-300)' }}>Never</span>}
                  </td>
                )}
                <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                  <Link to={`/personnel/${person.id}`} className="btn btn--secondary btn--sm">Edit</Link>
                </td>
              </tr>
            ))}
            {personnel.length === 0 && (
              <tr><td colSpan={isAdmin ? 6 : 5} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-gray-400)' }}>No personnel records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="list-card-view">
        {personnel.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-gray-400)' }}>No personnel records found.</div>
        ) : personnel.map(person => (
          <div key={person.id} className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-gray-900)' }}>{person.name}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginTop: '2px' }}>{person.email}</div>
                {person.phone && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>{person.phone}</div>}
                {isAdmin && person.last_login_date && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginTop: '2px' }}>
                    Last login: {formatLastLogin(person.last_login_date)}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: 'var(--text-xs)', fontWeight: 600, background: person.can_login ? 'var(--color-success-50)' : 'var(--color-gray-100)', color: person.can_login ? 'var(--color-success-700)' : 'var(--color-gray-600)' }}>
                  {person.can_login ? 'Login' : 'No login'}
                </span>
                <Link to={`/personnel/${person.id}`} className="btn btn--secondary btn--sm">Edit</Link>
              </div>
            </div>
            {person.qualifications && person.qualifications.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'var(--space-2)' }}>
                {person.qualifications.map((q: any) => {
                  const expiry = q.expiry_date ? new Date(q.expiry_date) : null;
                  const diffDays = expiry ? Math.ceil((expiry.getTime() - Date.now()) / 86400000) : null;
                  const color = diffDays === null ? { bg: 'var(--color-primary-50)', text: 'var(--color-primary-700)' }
                    : diffDays <= 30 ? { bg: 'var(--color-danger-50)', text: 'var(--color-danger-700)' }
                    : diffDays <= 90 ? { bg: 'var(--color-warning-50)', text: 'var(--color-warning-600)' }
                    : { bg: 'var(--color-success-50)', text: 'var(--color-success-700)' };
                  return (
                    <span key={q.id} style={{ padding: '2px 6px', background: color.bg, color: color.text, borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                      {q.name}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
