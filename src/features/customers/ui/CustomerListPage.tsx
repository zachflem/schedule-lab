import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { api } from '@/shared/lib/api';
import type { Customer } from '@/shared/validation/schemas';
import { Spinner } from '@/shared/ui';

export function CustomerListPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const data = await api.get<Customer[]>('/customers');
        setCustomers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch customers');
      } finally {
        setLoading(false);
      }
    }
    fetchCustomers();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="container" style={{ padding: 'var(--space-8)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 className="docket-page__title">Customers</h1>
        <Link to="/customers/new" className="btn btn--primary">Add Customer</Link>
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
              <th style={{ textAlign: 'left', padding: 'var(--space-3)' }}>Email</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-3)' }}>Site Contact</th>
              <th style={{ textAlign: 'right', padding: 'var(--space-3)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(customer => (
              <tr key={customer.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                <td style={{ padding: 'var(--space-3)', fontWeight: 600 }}>{customer.name}</td>
                <td style={{ padding: 'var(--space-3)', color: 'var(--color-gray-600)' }}>{customer.email || '-'}</td>
                <td style={{ padding: 'var(--space-3)', color: 'var(--color-gray-600)' }}>
                  {customer.site_contact_name ? (
                    <div>
                      <div>{customer.site_contact_name}</div>
                      <div style={{ fontSize: 'var(--text-xs)' }}>{customer.site_contact_phone}</div>
                    </div>
                  ) : '-'}
                </td>
                <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                  <Link to={`/customers/${customer.id}`} className="btn btn--secondary btn--sm">Edit</Link>
                </td>
              </tr>
            ))}
            {customers.length === 0 && !loading && (
              <tr>
                <td colSpan={4} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
