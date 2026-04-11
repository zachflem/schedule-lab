import { useState, useEffect, useCallback } from 'react';
import { api } from '@/shared/lib/api';
import type { Customer } from '@/shared/validation/schemas';
import { Spinner } from '@/shared/ui';
import { CustomerEditModal } from './CustomerEditModal';

function ContactCell({ customer }: { customer: Customer }) {
  const contacts = customer.contacts ?? [];
  if (contacts.length === 0) return <span style={{ color: 'var(--color-gray-300)' }}>-</span>;

  const first = contacts[0];
  const extra = contacts.length - 1;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span style={{ fontWeight: 500, color: 'var(--color-gray-900)' }}>{first.name}</span>
        {first.role && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', background: 'var(--color-gray-100)', padding: '1px 6px', borderRadius: '999px' }}>
            {first.role}
          </span>
        )}
        {extra > 0 && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', fontWeight: 600 }}>
            +{extra} more
          </span>
        )}
      </div>
      {first.email && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>{first.email}</div>}
      {first.phone && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>{first.phone}</div>}
    </div>
  );
}

export function CustomerListPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // null = closed, 'new' = create, string UUID = edit
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      const data = await api.get<Customer[]>('/customers');
      setCustomers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSaved = () => {
    setEditingId(null);
    fetchCustomers();
  };

  if (loading) return <Spinner />;

  return (
    <div className="container p-8">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 className="docket-page__title">Customers</h1>
        <button className="btn btn--primary" onClick={() => setEditingId('new')}>Add Customer</button>
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
              <th style={{ textAlign: 'left', padding: 'var(--space-3)' }}>Primary Contact</th>
              <th style={{ textAlign: 'center', padding: 'var(--space-3)' }}>Jobs</th>
              <th style={{ textAlign: 'right', padding: 'var(--space-3)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(customer => (
              <tr key={customer.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                <td style={{ padding: 'var(--space-3)', fontWeight: 600 }}>{customer.name}</td>
                <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                  <ContactCell customer={customer} />
                </td>
                <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', gap: 'var(--space-2)' }}>
                    <span title="Enquiry/Quote" style={{ minWidth: '24px', padding: '2px 4px', borderRadius: '4px', background: 'var(--color-danger-50)', color: 'var(--color-danger-700)', fontSize: 'var(--text-xs)', fontWeight: 700, border: '1px solid var(--color-danger-100)' }}>{customer.enquiry_jobs || 0}</span>
                    <span title="Active Jobs" style={{ minWidth: '24px', padding: '2px 4px', borderRadius: '4px', background: 'var(--color-warning-50)', color: 'var(--color-warning-600)', fontSize: 'var(--text-xs)', fontWeight: 700, border: '1px solid var(--color-warning-100)' }}>{customer.active_jobs || 0}</span>
                    <span title="Closed Jobs" style={{ minWidth: '24px', padding: '2px 4px', borderRadius: '4px', background: 'var(--color-success-50)', color: 'var(--color-success-700)', fontSize: 'var(--text-xs)', fontWeight: 700, border: '1px solid var(--color-success-100)' }}>{customer.closed_jobs || 0}</span>
                  </div>
                </td>
                <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                  <button className="btn btn--secondary btn--sm" onClick={() => setEditingId(customer.id!)}>Edit</button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-gray-400)' }}>No customers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="list-card-view">
        {customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-gray-400)' }}>No customers found.</div>
        ) : customers.map(customer => {
          const contacts = customer.contacts ?? [];
          const first = contacts[0];
          return (
            <div key={customer.id} className="card" style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-gray-900)' }}>{customer.name}</div>
                  {first && (
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginTop: '2px' }}>
                      {first.name}{first.role ? ` · ${first.role}` : ''}
                      {contacts.length > 1 && <span style={{ color: 'var(--color-primary-600)', fontWeight: 600 }}> +{contacts.length - 1}</span>}
                    </div>
                  )}
                </div>
                <button className="btn btn--secondary btn--sm" onClick={() => setEditingId(customer.id!)}>Edit</button>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <span title="Enquiries" style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--color-danger-50)', color: 'var(--color-danger-700)', fontSize: 'var(--text-xs)', fontWeight: 700, border: '1px solid var(--color-danger-100)' }}>E: {customer.enquiry_jobs || 0}</span>
                <span title="Active" style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--color-warning-50)', color: 'var(--color-warning-600)', fontSize: 'var(--text-xs)', fontWeight: 700, border: '1px solid var(--color-warning-100)' }}>A: {customer.active_jobs || 0}</span>
                <span title="Closed" style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--color-success-50)', color: 'var(--color-success-700)', fontSize: 'var(--text-xs)', fontWeight: 700, border: '1px solid var(--color-success-100)' }}>C: {customer.closed_jobs || 0}</span>
              </div>
            </div>
          );
        })}
      </div>

      {editingId !== null && (
        <CustomerEditModal
          customerId={editingId === 'new' ? null : editingId}
          onClose={() => setEditingId(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
