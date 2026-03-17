import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { api } from '@/shared/lib/api';
import type { Personnel } from '@/shared/validation/schemas';
import { Spinner } from '@/shared/ui';

export function PersonnelListPage() {
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
    <div className="container" style={{ padding: 'var(--space-8)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 className="docket-page__title">Personnel & Operators</h1>
        <Link to="/personnel/new" className="btn btn--primary">Add Person</Link>
      </div>

      {error && (
        <div style={{ padding: 'var(--space-4)', background: 'var(--color-danger-50)', color: 'var(--color-danger-700)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
          {error}
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
              <th style={{ textAlign: 'left', padding: 'var(--space-3)' }}>Name</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-3)' }}>Contact</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-3)' }}>Qualifications</th>
              <th style={{ textAlign: 'center', padding: 'var(--space-3)' }}>Can Login</th>
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
                        const today = new Date();
                        const diffDays = expiry ? Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

                        let color = { bg: 'var(--color-blue-50)', text: 'var(--color-blue-700)' };
                        if (diffDays !== null) {
                          if (diffDays <= 30) {
                            color = { bg: 'var(--color-danger-50)', text: 'var(--color-danger-700)' };
                          } else if (diffDays <= 90) {
                            color = { bg: 'var(--color-warning-50)', text: 'var(--color-warning-600)' };
                          } else {
                            color = { bg: 'var(--color-success-50)', text: 'var(--color-success-700)' };
                          }
                        }

                        return (
                          <span key={q.id} title={expiry ? `Expires: ${expiry.toLocaleDateString()}` : undefined} style={{ 
                            padding: '2px 6px', 
                            background: color.bg, 
                            color: color.text, 
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            border: `1px solid ${color.text}20`
                          }}>
                            {q.name}
                            {expiry && <span style={{ opacity: 0.6, fontSize: '8px' }}>({q.expiry_date})</span>}
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ color: 'var(--color-gray-300)' }}>No qualifications</span>
                    )}
                  </div>
                </td>

                <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                  <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: '12px', 
                    fontSize: 'var(--text-xs)', 
                    fontWeight: 600,
                    background: person.can_login ? 'var(--color-green-100)' : 'var(--color-gray-100)',
                    color: person.can_login ? 'var(--color-green-700)' : 'var(--color-gray-600)'
                  }}>
                    {person.can_login ? 'Yes' : 'No'}
                  </span>
                </td>

                <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                  <Link to={`/personnel/${person.id}`} className="button button-sm" style={{ background: 'var(--color-white)', border: '1px solid var(--color-gray-200)' }}>
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {personnel.length === 0 && !loading && (
              <tr>
                <td colSpan={5} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                  No personnel records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
