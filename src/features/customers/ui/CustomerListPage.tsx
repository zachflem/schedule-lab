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
    <div className="container p-8">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 className="docket-page__title">Customers</h1>
        <Link to="/customers/new" className="btn btn--primary">Add Customer</Link>
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
              <th style={{ textAlign: 'left', padding: 'var(--space-3)' }}>Site Contact</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-3)' }}>Billing Contact</th>
              <th style={{ textAlign: 'center', padding: 'var(--space-3)' }}>Jobs</th>
              <th style={{ textAlign: 'right', padding: 'var(--space-3)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(customer => (
              <tr key={customer.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                <td style={{ padding: 'var(--space-3)', fontWeight: 600 }}>{customer.name}</td>
                <td style={{ padding: 'var(--space-3)', color: 'var(--color-gray-600)', fontSize: 'var(--text-sm)' }}>
                  {customer.site_contact_name ? (
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--color-gray-900)' }}>{customer.site_contact_name}</div>
                      <div>{customer.site_contact_email}</div>
                    </div>
                  ) : <span style={{ color: 'var(--color-gray-300)' }}>-</span>}
                </td>
                <td style={{ padding: 'var(--space-3)', color: 'var(--color-gray-600)', fontSize: 'var(--text-sm)' }}>
                  {customer.billing_contact_name ? (
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--color-gray-900)' }}>{customer.billing_contact_name}</div>
                      <div>{customer.billing_contact_email}</div>
                    </div>
                  ) : <span style={{ color: 'var(--color-gray-300)' }}>-</span>}
                </td>
                <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', gap: 'var(--space-2)' }}>
                    <span title="Enquiry/Quote" style={{ minWidth: '24px', padding: '2px 4px', borderRadius: '4px', background: 'var(--color-danger-50)', color: 'var(--color-danger-700)', fontSize: 'var(--text-xs)', fontWeight: 700, border: '1px solid var(--color-danger-100)' }}>{customer.enquiry_jobs || 0}</span>
                    <span title="Active Jobs" style={{ minWidth: '24px', padding: '2px 4px', borderRadius: '4px', background: 'var(--color-warning-50)', color: 'var(--color-warning-600)', fontSize: 'var(--text-xs)', fontWeight: 700, border: '1px solid var(--color-warning-100)' }}>{customer.active_jobs || 0}</span>
                    <span title="Closed Jobs" style={{ minWidth: '24px', padding: '2px 4px', borderRadius: '4px', background: 'var(--color-success-50)', color: 'var(--color-success-700)', fontSize: 'var(--text-xs)', fontWeight: 700, border: '1px solid var(--color-success-100)' }}>{customer.closed_jobs || 0}</span>
                  </div>
                </td>
                <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                  <Link to={`/customers/${customer.id}`} className="btn btn--secondary btn--sm">Edit</Link>
                </td>
              </tr>
            ))}
            {customers.length === 0 && !loading && (
              <tr>
                <td colSpan={5} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-gray-400)' }}>No customers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="list-card-view">
        {customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-gray-400)' }}>No customers found.</div>
        ) : customers.map(customer => (
          <div key={customer.id} className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-gray-900)' }}>{customer.name}</div>
                {customer.site_contact_name && (
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginTop: '2px' }}>{customer.site_contact_name}</div>
                )}
              </div>
              <Link to={`/customers/${customer.id}`} className="btn btn--secondary btn--sm">Edit</Link>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <span title="Enquiries" style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--color-danger-50)', color: 'var(--color-danger-700)', fontSize: 'var(--text-xs)', fontWeight: 700, border: '1px solid var(--color-danger-100)' }}>E: {customer.enquiry_jobs || 0}</span>
              <span title="Active" style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--color-warning-50)', color: 'var(--color-warning-600)', fontSize: 'var(--text-xs)', fontWeight: 700, border: '1px solid var(--color-warning-100)' }}>A: {customer.active_jobs || 0}</span>
              <span title="Closed" style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--color-success-50)', color: 'var(--color-success-700)', fontSize: 'var(--text-xs)', fontWeight: 700, border: '1px solid var(--color-success-100)' }}>C: {customer.closed_jobs || 0}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
