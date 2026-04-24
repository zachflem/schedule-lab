import { useState, useEffect, useMemo } from 'react';
import { useEnquiries } from '../api/useEnquiries';
import { Spinner, FilterModal, ErrorMessage } from '@/shared/ui';
import { EnquiryDetailsModal } from './EnquiryDetailsModal';
import { CreateEnquiryModal } from './CreateEnquiryModal';
import { formatRecordId } from '@/shared/lib/format';
import { ENQUIRY_TABLE_STATUSES } from '@/shared/validation/schemas';

type SortOption = 'date-desc' | 'date-asc' | 'customer' | 'requested-date';

export function EnquiriesPage() {
  const { enquiries, loading, error, loadEnquiries, updateEnquiryStatus, convertToJob } = useEnquiries();
  const [selectedEnquiry, setSelectedEnquiry] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([...ENQUIRY_TABLE_STATUSES].filter(s => s !== 'Converted'));
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');

  useEffect(() => {
    loadEnquiries({ status: selectedStatuses });
  }, [loadEnquiries, selectedStatuses]);

  const sortedEnquiries = useMemo(() => {
    return [...enquiries].sort((a: any, b: any) => {
      switch (sortBy) {
        case 'date-desc': return (b.created_at || '').localeCompare(a.created_at || '');
        case 'date-asc':  return (a.created_at || '').localeCompare(b.created_at || '');
        case 'customer':  return a.customer_name.localeCompare(b.customer_name);
        case 'requested-date': return (a.preferred_date || '').localeCompare(b.preferred_date || '');
        default: return 0;
      }
    });
  }, [enquiries, sortBy]);

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      'New': 'badge--new',
      'Reviewed': 'badge--info',
      'Clarification Requested': 'badge--warning',
      'Converted': 'badge--success',
    };
    return <span className={`badge ${classes[status] || ''}`}>{status}</span>;
  };

  if (loading && !enquiries.length) return <Spinner />;

  return (
    <div className="enquiries-page" style={{ padding: 'var(--space-4) var(--space-6)' }}>
      <div className="page-header mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Enquiries</h1>
          <p className="text-gray-500 text-sm">Manage incoming booking enquiries.</p>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => setShowCreateModal(true)}
        >
          New Enquiry
        </button>
      </div>

      <div className="filters mb-4" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <FilterModal
          title="Filter by Status"
          buttonLabel="Status Filter"
          options={ENQUIRY_TABLE_STATUSES.map(s => ({ value: s, label: s }))}
          selected={selectedStatuses}
          onToggle={toggleStatus}
          onSelectAll={() => setSelectedStatuses([...ENQUIRY_TABLE_STATUSES])}
          onClearAll={() => setSelectedStatuses([])}
        />
        <select
          className="form-input text-sm"
          style={{ width: 'auto' }}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
        >
          <option value="date-desc">Date (Newest First)</option>
          <option value="date-asc">Date (Oldest First)</option>
          <option value="customer">Customer</option>
          <option value="requested-date">Requested Date</option>
        </select>
        <button
          className="btn btn--secondary btn--sm"
          onClick={() => loadEnquiries({ status: selectedStatuses })}
        >
          Refresh
        </button>
      </div>

      {error && <ErrorMessage message={error} style={{ marginBottom: 'var(--space-4)' }} />}

      {/* Desktop table */}
      <div className="list-table-view data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer / Location</th>
              <th>Requested Date</th>
              <th>Site Contact</th>
              <th>Status</th>
              <th>Job Brief</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedEnquiries.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                  No enquiries found matching the filters.
                </td>
              </tr>
            ) : (
              sortedEnquiries.map(enquiry => (
                <tr key={enquiry.id}>
                  <td className="font-mono text-xs text-secondary">{formatRecordId(enquiry.id!, enquiry.status)}</td>
                  <td>
                    <div className="font-semibold">{enquiry.customer_name}</div>
                    <div className="text-xs text-secondary">{enquiry.location || '—'}</div>
                  </td>
                  <td className="text-sm">{enquiry.preferred_date || '—'}</td>
                  <td>
                    <div className="text-sm">{enquiry.site_contact_name}</div>
                    <div className="text-xs text-secondary">{enquiry.contact_email}</div>
                  </td>
                  <td>{getStatusBadge(enquiry.status)}</td>
                  <td className="text-sm truncate max-w-xs">{enquiry.job_brief || '—'}</td>
                  <td>
                    <button className="btn btn--secondary btn--sm" onClick={() => setSelectedEnquiry(enquiry)} disabled={enquiry.status === 'Converted'}>
                      {enquiry.status === 'Converted' ? 'Processed' : 'Process'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="list-card-view">
        {enquiries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-gray-500)' }}>No enquiries found matching the filters.</div>
        ) : enquiries.map(enquiry => (
          <div key={enquiry.id} className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-gray-900)' }}>{enquiry.customer_name}</div>
                {enquiry.location && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>{enquiry.location}</div>}
              </div>
              {getStatusBadge(enquiry.status)}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginBottom: 'var(--space-2)' }}>
              {enquiry.preferred_date && <span>{enquiry.preferred_date} · </span>}
              {enquiry.site_contact_name}
            </div>
            {enquiry.job_brief && (
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', marginBottom: 'var(--space-3)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {enquiry.job_brief}
              </div>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', justifyContent: 'space-between' }}>
              <select className="status-select text-xs form-input" style={{ flex: 1, padding: 'var(--space-1) var(--space-2)', fontSize: 'var(--text-xs)' }} value={enquiry.status} onChange={(e) => updateEnquiryStatus(enquiry.id!, e.target.value)} disabled={enquiry.status === 'Converted'}>
                {ENQUIRY_TABLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="btn btn--primary btn--sm" onClick={() => setSelectedEnquiry(enquiry)} disabled={enquiry.status === 'Converted'}>
                {enquiry.status === 'Converted' ? 'Processed' : 'Process'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedEnquiry && (
        <EnquiryDetailsModal 
          enquiry={selectedEnquiry} 
          onClose={() => setSelectedEnquiry(null)}
          onConvert={async (data) => {
            const res = await convertToJob(data);
            if (res.success) {
              loadEnquiries({ status: selectedStatuses });
            }
            return res;
          }}
        />
      )}

      {showCreateModal && (
        <CreateEnquiryModal 
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>

  );
}
