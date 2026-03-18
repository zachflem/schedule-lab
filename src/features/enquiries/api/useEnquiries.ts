import { useState, useCallback } from 'react';
import { api } from '@/shared/lib/api';
import type { Enquiry, AssetType } from '@/shared/validation/schemas';

export function useEnquiries() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEnquiries = useCallback(async (trashed = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Enquiry[]>(`/enquiries?trashed=${trashed}`);
      setEnquiries(data);
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
      setEnquiries(prev => prev.map(e => e.id === id ? { ...e, status: status as any } : e));
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
  };

  const convertToJob = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.post('/jobs/convert', data);
      await loadEnquiries(); // Refresh list to show 'Converted' status
      return { success: true, data: resp };
    } catch (err: any) {
      setError(err.message || 'Failed to convert enquiry');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    enquiries,
    assetTypes,
    loading,
    error,
    loadEnquiries,
    loadAssetTypes,
    submitEnquiry,
    updateEnquiryStatus,
    convertToJob,
  };
}
