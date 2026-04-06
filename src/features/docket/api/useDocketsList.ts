import { useState, useEffect, useCallback } from 'react';
import { api } from '@/shared/lib/api';

export interface DocketSummary {
  id: string;
  job_id: string;
  docket_status: string;
  date: string;
  customer_name: string;
  location?: string | null;
  job_brief?: string | null;
  asset_requirement?: string | null;
  scheduled_start?: string | null;
  dispatcher_notes?: string | null;
  submitted_by_name?: string | null;
  operator_hours?: number;
  machine_hours?: number;
  is_locked: boolean;
  updated_at: string;
}

export function useDocketsList(statusFilter = 'all') {
  const [dockets, setDockets] = useState<DocketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDockets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const data = await api.get<DocketSummary[]>(`/dockets${query}`);
      setDockets(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dockets');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchDockets();
  }, [fetchDockets]);

  return { dockets, loading, error, refresh: fetchDockets };
}
