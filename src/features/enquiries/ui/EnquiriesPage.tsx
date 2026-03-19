import { useState, useEffect } from 'react';
import { useEnquiries } from '../api/useEnquiries';
import { Spinner } from '@/shared/ui';
import { EnquiryDetailsModal } from './EnquiryDetailsModal';
import type { Enquiry } from '@/shared/validation/schemas';
import { formatRecordId } from '@/shared/lib/format';

export function EnquiriesPage() {
  const { enquiries, loading, error, loadEnquiries, updateEnquiryStatus, convertToJob } = useEnquiries();
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);

  useEffect(() => {
    loadEnquiries();
  }, [loadEnquiries]);

  const getStatusBadge = (status: string) => {
    const classes = {
      'New': 'badge--new',
      'Reviewed': 'badge--info',
      'Clarification Requested': 'badge--warning',
      'Converted': 'badge--success',
    };
    return <span className={`badge ${(classes as any)[status] || ''}`}>{status}</span>;
  };

  if (loading && !enquiries.length) return <Spinner />;

  return (
    <div className="container enquiries-page">
      <div className="page-header">
        <h1>Enquiries Management</h1>
        <button className="btn btn--secondary" onClick={() => loadEnquiries()}>Refresh</button>
      </div>

      {error && <div className="alert alert--danger">{error}</div>}

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Preferred Date</th>
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
                  No enquiries found.
                </td>
              </tr>
            ) : (
              enquiries.map(enquiry => (
                <tr key={enquiry.id}>
                  <td className="font-mono text-xs text-secondary">{formatRecordId(enquiry.id, 'Enquiry')}</td>
                  <td>
                    <div className="font-semibold">{enquiry.customer_name}</div>
                    <div className="text-xs text-secondary">{enquiry.location}</div>
                  </td>
                  <td>{enquiry.preferred_date || '—'}</td>
                  <td>
                    <div className="text-sm">{enquiry.site_contact_name}</div>
                    <div className="text-xs text-secondary">{enquiry.contact_email}</div>
                  </td>
                  <td>{getStatusBadge(enquiry.status)}</td>
                  <td className="text-sm truncate max-w-xs">{enquiry.job_brief}</td>
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
                        className="form-input text-xs"
                        style={{ width: 'auto', padding: 'var(--space-1) var(--space-2)' }}
                        value={enquiry.status}
                        onChange={(e) => enquiry.id && updateEnquiryStatus(enquiry.id, e.target.value)}
                        disabled={enquiry.status === 'Converted'}
                      >
                        <option value="New">New</option>
                        <option value="Reviewed">Review</option>
                        <option value="Clarification Requested">Clarify</option>
                        <option value="Converted">Convert</option>
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
          onConvert={convertToJob}
        />
      )}
    </div>
  );
}
