import { useState, useEffect } from 'react';
import { useEnquiries, type Lead } from '../api/useEnquiries';
import { Spinner } from '@/shared/ui';
import { EnquiryDetailsModal } from './EnquiryDetailsModal';
import { formatRecordId } from '@/shared/lib/format';
import { ENQUIRY_PAGE_JOB_STATUSES, ENQUIRY_TABLE_STATUSES, type JobStatus } from '@/shared/validation/schemas';

export function EnquiriesPage() {
  const { leads, loading, error, loadLeads, updateEnquiryStatus, updateJobStatus, convertToJob } = useEnquiries();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  const [selectedEnquiryStatuses, setSelectedEnquiryStatuses] = useState<string[]>([...ENQUIRY_TABLE_STATUSES].filter(s => s !== 'Converted'));
  const [selectedJobStatuses, setSelectedJobStatuses] = useState<JobStatus[]>([...ENQUIRY_PAGE_JOB_STATUSES]);

  useEffect(() => {
    loadLeads({ 
      enquiryStatuses: selectedEnquiryStatuses, 
      jobStatuses: selectedJobStatuses 
    });
  }, [loadLeads, selectedEnquiryStatuses, selectedJobStatuses]);

  const toggleEnquiryStatus = (status: string) => {
    setSelectedEnquiryStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const toggleJobStatus = (status: JobStatus) => {
    setSelectedJobStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const getStatusBadge = (status: string, source: 'enquiry' | 'job') => {
    if (source === 'job') {
      const classes: Record<string, string> = {
        'Enquiry': 'badge--active',
        'Quote': 'badge--info',
        'Quote Sent': 'badge--warning',
        'Quote Accepted': 'badge--success',
      };
      return <span className={`badge ${classes[status] || ''}`}>{status}</span>;
    }

    const classes: Record<string, string> = {
      'New': 'badge--new',
      'Reviewed': 'badge--info',
      'Clarification Requested': 'badge--warning',
      'Converted': 'badge--success',
    };
    return <span className={`badge ${classes[status] || ''}`}>{status}</span>;
  };

  if (loading && !leads.length) return <Spinner />;

  return (
    <div className="container enquiries-page p-8">
      <div className="page-header mb-8">
        <h1 className="text-2xl font-bold">Enquiries & Leads</h1>
        <p className="text-gray-500 text-sm">Manage incoming enquiries and early-stage quotes.</p>
      </div>

      <div className="filters mb-6 flex flex-wrap gap-4 items-center bg-gray-50 p-4 rounded-lg">
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 w-full mb-1">Enquiry Status:</span>
          {ENQUIRY_TABLE_STATUSES.map(status => (
            <button
              key={status}
              onClick={() => toggleEnquiryStatus(status)}
              className={`btn btn--sm ${selectedEnquiryStatuses.includes(status) ? 'btn--primary' : 'btn--secondary'}`}
              style={{ borderRadius: '20px', padding: '2px 12px', fontSize: '11px' }}
            >
              {status}
            </button>
          ))}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 w-full mb-1">Job/Quote Status:</span>
          {ENQUIRY_PAGE_JOB_STATUSES.map(status => (
            <button
              key={status}
              onClick={() => toggleJobStatus(status)}
              className={`btn btn--sm ${selectedJobStatuses.includes(status) ? 'btn--primary' : 'btn--secondary'}`}
              style={{ borderRadius: '20px', padding: '2px 12px', fontSize: '11px' }}
            >
              {status}
            </button>
          ))}
        </div>

        <button 
          className="btn btn--secondary btn--sm ml-auto" 
          onClick={() => loadLeads({ enquiryStatuses: selectedEnquiryStatuses, jobStatuses: selectedJobStatuses })}
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
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                  No enquiries or leads found matching the filters.
                </td>
              </tr>
            ) : (
              leads.map(lead => (
                <tr key={`${lead.source}-${lead.id}`}>
                  <td className="font-mono text-xs text-secondary">
                    {formatRecordId(lead.id, lead.status)}
                  </td>
                  <td>
                    <div className="font-semibold">{lead.customer_name}</div>
                    <div className="text-xs text-secondary">{lead.location || '—'}</div>
                  </td>
                  <td className="text-sm">{lead.preferred_date || '—'}</td>
                  <td>
                    <div className="text-sm">{lead.site_contact_name}</div>
                    <div className="text-xs text-secondary">{lead.contact_email}</div>
                  </td>
                  <td>{getStatusBadge(lead.status, lead.source)}</td>
                  <td className="text-sm truncate max-w-xs">{lead.job_brief || '—'}</td>
                  <td>
                    <div className="flex gap-2">
                      {lead.source === 'enquiry' ? (
                        <>
                          <button 
                            className="btn btn--secondary btn--sm"
                            onClick={() => setSelectedLead(lead)}
                            disabled={lead.status === 'Converted'}
                          >
                            {lead.status === 'Converted' ? 'Processed' : 'Process'}
                          </button>
                          <select
                            className="form-input text-xs"
                            style={{ width: 'auto', padding: 'var(--space-1) var(--space-2)' }}
                            value={lead.status}
                            onChange={(e) => updateEnquiryStatus(lead.id, e.target.value)}
                            disabled={lead.status === 'Converted'}
                          >
                            {ENQUIRY_TABLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </>
                      ) : (
                        <select
                          className="form-input text-xs"
                          style={{ width: 'auto', padding: 'var(--space-1) var(--space-2)' }}
                          value={lead.status}
                          onChange={(e) => updateJobStatus(lead.id, e.target.value as JobStatus)}
                        >
                          {ENQUIRY_PAGE_JOB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedLead && selectedLead.source === 'enquiry' && (
        <EnquiryDetailsModal 
          enquiry={selectedLead.raw as any} 
          onClose={() => setSelectedLead(null)}
          onConvert={async (data) => {
            const res = await convertToJob(data);
            if (res.success) {
              loadLeads({ enquiryStatuses: selectedEnquiryStatuses, jobStatuses: selectedJobStatuses });
            }
            return res;
          }}
        />
      )}
    </div>
  );
}
