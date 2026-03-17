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
                  {person.qualifications && person.qualifications.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {person.qualifications.map((q: any) => (
                        <span key={q.id} style={{ 
                          padding: '2px 6px', 
                          background: 'var(--color-blue-50)', 
                          color: 'var(--color-blue-700)', 
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 600
                        }}>
                          {q.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                   /* Handle qualification_names from the initial list view query if qualifications array is not yet present */
                   (person as any).qualification_names ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {(person as any).qualification_names.split(',').map((name: string, i: number) => (
                        <span key={i} style={{ 
                          padding: '2px 6px', 
                          background: 'var(--color-blue-50)', 
                          color: 'var(--color-blue-700)', 
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 600
                        }}>
                          {name}
                        </span>
                      ))}
                    </div>
                   ) : <span style={{ color: 'var(--color-gray-300)' }}>No qualifications</span>
                  )}
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
