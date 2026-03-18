import { useState, useCallback } from 'react';
import { api } from '@/shared/lib/api';
import type { Job } from '@/shared/validation/schemas';

export interface JobWithResources extends Job {
  customer_name: string;
  project_name?: string;
  start_time?: string;
  end_time?: string;
  resources?: any[];
}

export function useJobs() {
  const [jobs, setJobs] = useState<JobWithResources[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async (params?: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<JobWithResources[]>('/jobs', params);
      setJobs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateJobSchedule = async (id: string, startTime: string, endTime: string) => {
    try {
      await api.put(`/jobs/${id}/schedule`, { start_time: startTime, end_time: endTime });
      setJobs(prev => prev.map(j => 
        j.id === id ? { ...j, start_time: startTime, end_time: endTime, status_id: 'Job Scheduled' as any } : j
      ));
      return { success: true };
    } catch (err: any) {
      setError(err.message || 'Failed to update schedule');
      return { success: false, error: err.message };
    }
  };

  const removeJobSchedule = async (id: string) => {
    try {
      await api.delete(`/jobs/${id}/schedule`);
      setJobs(prev => prev.map(j => 
        j.id === id ? { ...j, start_time: undefined, end_time: undefined, status_id: 'Job Booked' as any } : j
      ));
      return { success: true };
    } catch (err: any) {
      setError(err.message || 'Failed to remove schedule');
      return { success: false, error: err.message };
    }
  };

  return {
    jobs,
    loading,
    error,
    loadJobs,
    updateJobSchedule,
    removeJobSchedule,
  };
}
