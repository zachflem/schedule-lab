import { useState, useEffect } from 'react';
import { useEnquiries } from '../api/useEnquiries';
import { Spinner, FilterModal } from '@/shared/ui';
import { EnquiryDetailsModal } from './EnquiryDetailsModal';
import { CreateEnquiryModal } from './CreateEnquiryModal';
import { formatRecordId } from '@/shared/lib/format';
import { ENQUIRY_TABLE_STATUSES } from '@/shared/validation/schemas';

export function EnquiriesPage() {
  const { enquiries, loading, error, loadEnquiries, updateEnquiryStatus, convertToJob } = useEnquiries();
  const [selectedEnquiry, setSelectedEnquiry] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([...ENQUIRY_TABLE_STATUSES].filter(s => s !== 'Converted'));

  useEffect(() => {
    loadEnquiries({ status: selectedStatuses });
  }, [loadEnquiries, selectedStatuses]);

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
    <div className="container enquiries-page p-8">
      <div className="page-header mb-8 flex justify-between items-start">
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

      <div className="filters mb-6" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <FilterModal
          title="Filter by Status"
          buttonLabel="Status Filter"
          options={ENQUIRY_TABLE_STATUSES.map(s => ({ value: s, label: s }))}
          selected={selectedStatuses}
          onToggle={toggleStatus}
          onSelectAll={() => setSelectedStatuses([...ENQUIRY_TABLE_STATUSES])}
          onClearAll={() => setSelectedStatuses([])}
        />
        <button
          className="btn btn--secondary btn--sm"
          onClick={() => loadEnquiries({ status: selectedStatuses })}
        >
          Refresh
        </button>
      </div>

      {error && <div className="alert alert--danger mb-6">{error}</div>}

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer / Location</th>
              <th>Date</th>
              <th>Site Contact</th>
              <th>Status</th>
              <th>Job Brief</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {enquiries.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                  No enquiries found matching the filters.
                </td>
              </tr>
            ) : (
              enquiries.map(enquiry => (
                <tr key={enquiry.id}>
                  <td className="font-mono text-xs text-secondary">
                    {formatRecordId(enquiry.id!, enquiry.status)}
                  </td>
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
                    <div className="flex gap-2">
                      <button 
                        className="btn btn--secondary btn--sm"
                        onClick={() => setSelectedEnquiry(enquiry)}
                        disabled={enquiry.status === 'Converted'}
                      >
                        {enquiry.status === 'Converted' ? 'Processed' : 'Process'}
                      </button>
                      <select
                        className="status-select text-xs"
                        style={{ width: 'auto', padding: 'var(--space-1) var(--space-2)' }}
                        value={enquiry.status}
                        onChange={(e) => updateEnquiryStatus(enquiry.id!, e.target.value)}
                        disabled={enquiry.status === 'Converted'}
                      >
                        {ENQUIRY_TABLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
