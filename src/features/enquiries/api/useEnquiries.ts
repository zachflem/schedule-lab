import { useState, useCallback } from 'react';
import { api } from '@/shared/lib/api';
import type { Enquiry, JobStatus, AssetType } from '@/shared/validation/schemas';
import type { JobWithResources } from '../../jobs/api/useJobs';

export interface Lead {
  id: string;
  source: 'enquiry' | 'job';
  customer_name: string;
  location?: string | null;
  preferred_date?: string | null;
  site_contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  status: string;
  job_brief?: string | null;
  enquiry_type?: 'Job' | 'Project';
  raw: Enquiry | JobWithResources;
}

export function useEnquiries() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLeads = useCallback(async (filters: { 
    enquiryStatuses?: string[], 
    jobStatuses?: JobStatus[],
    trashed?: boolean 
  } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const qpEnquiries = new URLSearchParams();
      if (filters.enquiryStatuses?.length) {
        filters.enquiryStatuses.forEach(s => qpEnquiries.append('status', s));
      }
      if (filters.trashed) qpEnquiries.append('trashed', 'true');

      const qpJobs = new URLSearchParams();
      if (filters.jobStatuses?.length) {
        filters.jobStatuses.forEach(s => qpJobs.append('status', s));
      }

      const [enquiryData, jobData] = await Promise.all([
        api.get<Enquiry[]>(`/enquiries?${qpEnquiries.toString()}`),
        filters.jobStatuses?.length 
          ? api.get<JobWithResources[]>(`/jobs?${qpJobs.toString()}`)
          : Promise.resolve([])
      ]);

      const normalizedEnquiries: Lead[] = enquiryData.map(e => ({
        id: e.id!,
        source: 'enquiry',
        customer_name: e.customer_name,
        location: e.location,
        preferred_date: e.preferred_date,
        site_contact_name: e.site_contact_name,
        contact_email: e.contact_email,
        contact_phone: e.contact_phone,
        status: e.status,
        job_brief: e.job_brief,
        enquiry_type: e.enquiry_type,
        raw: e
      }));

      const normalizedJobs: Lead[] = jobData.map(j => ({
        id: j.id!,
        source: 'job',
        customer_name: j.customer_name,
        location: j.location,
        preferred_date: j.start_time ? new Date(j.start_time).toLocaleDateString() : null,
        site_contact_name: j.site_contact_name,
        contact_email: j.site_contact_email,
        contact_phone: j.site_contact_phone,
        status: j.status_id as string,
        job_brief: j.job_brief,
        enquiry_type: (j as any).enquiry_type || 'Job',
        raw: j
      }));

      setLeads([...normalizedEnquiries, ...normalizedJobs].sort((a, b) => {
        const dateA = (a.raw as any).created_at || '';
        const dateB = (b.raw as any).created_at || '';
        return dateB.localeCompare(dateA);
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAssetTypes = useCallback(async () => {
    try {
      const data = await api.get<AssetType[]>('/asset-types');
      setAssetTypes(data);
    } catch (err: any) {
      console.error('Failed to load asset types', err);
    }
  }, []);

  const submitEnquiry = async (data: Partial<Enquiry>) => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/enquiries', data);
      return { success: true };
    } catch (err: any) {
      setError(err.message || 'Failed to submit enquiry');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateEnquiryStatus = async (id: string, status: string) => {
    try {
      await api.put(`/enquiries/${id}`, { status });
      setLeads(prev => prev.map(l => 
        (l.source === 'enquiry' && l.id === id) ? { ...l, status } : l
      ));
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
  };

  const updateJobStatus = async (id: string, status: JobStatus) => {
    try {
      await api.put(`/jobs/${id}`, { status_id: status });
      setLeads(prev => prev.map(l => 
        (l.source === 'job' && l.id === id) ? { ...l, status } : l
      ));
    } catch (err: any) {
      setError(err.message || 'Failed to update job status');
    }
  };

  const convertToJob = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.post('/jobs/convert', data);
      return { success: true, data: resp };
    } catch (err: any) {
      setError(err.message || 'Failed to convert enquiry');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    leads,
    assetTypes,
    loading,
    error,
    loadLeads,
    loadAssetTypes,
    submitEnquiry,
    updateEnquiryStatus,
    updateJobStatus,
    convertToJob,
  };
}
