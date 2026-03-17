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
                
                {/* Site Contact */}
                <td style={{ padding: 'var(--space-3)', color: 'var(--color-gray-600)', fontSize: 'var(--text-sm)' }}>
                  {customer.site_contact_name ? (
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--color-gray-900)' }}>{customer.site_contact_name}</div>
                      <div>{customer.site_contact_email}</div>
                    </div>
                  ) : <span style={{ color: 'var(--color-gray-300)' }}>-</span>}
                </td>

                {/* Billing Contact */}
                <td style={{ padding: 'var(--space-3)', color: 'var(--color-gray-600)', fontSize: 'var(--text-sm)' }}>
                  {customer.billing_contact_name ? (
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--color-gray-900)' }}>{customer.billing_contact_name}</div>
                      <div>{customer.billing_contact_email}</div>
                    </div>
                  ) : <span style={{ color: 'var(--color-gray-300)' }}>-</span>}
                </td>

                {/* Jobs Summary */}
                <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', gap: 'var(--space-2)' }}>
                    <span title="Enquiry/Quote" style={{ 
                      minWidth: '24px',
                      padding: '2px 4px', 
                      borderRadius: '4px', 
                      background: 'var(--color-red-50, #fef2f2)', 
                      color: 'var(--color-red-700, #b91c1c)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 700,
                      border: '1px solid var(--color-red-100, #fee2e2)'
                    }}>
                      {customer.enquiry_jobs || 0}
                    </span>
                    <span title="Active Jobs" style={{ 
                      minWidth: '24px',
                      padding: '2px 4px', 
                      borderRadius: '4px', 
                      background: 'var(--color-orange-50, #fff7ed)', 
                      color: 'var(--color-orange-700, #c2410c)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 700,
                      border: '1px solid var(--color-orange-100, #ffedd5)'
                    }}>
                      {customer.active_jobs || 0}
                    </span>
                    <span title="Closed Jobs" style={{ 
                      minWidth: '24px',
                      padding: '2px 4px', 
                      borderRadius: '4px', 
                      background: 'var(--color-green-50, #f0fdf4)', 
                      color: 'var(--color-green-700, #15803d)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 700,
                      border: '1px solid var(--color-green-100, #dcfce7)'
                    }}>
                      {customer.closed_jobs || 0}
                    </span>
                  </div>
                </td>

                <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                  <Link to={`/customers/${customer.id}`} className="button button-sm" style={{ background: 'var(--color-white)', border: '1px solid var(--color-gray-200)' }}>
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {customers.length === 0 && !loading && (
              <tr>
                <td colSpan={5} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-gray-400)' }}>
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
