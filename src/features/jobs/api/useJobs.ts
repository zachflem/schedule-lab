import { useState, useCallback } from 'react';
import { api } from '@/shared/lib/api';
import type { Job } from '@/shared/validation/schemas';

export interface JobWithResources extends Job {
  customer_name: string;
  project_name?: string;
  project_id?: string;
  start_time?: string;
  end_time?: string;
  resources?: any[];
}

export function useJobs() {
  const [jobs, setJobs] = useState<JobWithResources[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async (params?: Record<string, string | string[]>) => {
    setLoading(true);
    setError(null);
    try {
      // Handle array params for status
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v));
          } else {
            queryParams.append(key, value);
          }
        });
      }
      
      const data = await api.get<JobWithResources[]>(`/jobs?${queryParams.toString()}`);
      setJobs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateJob = async (id: string, data: Partial<Job>) => {
    try {
      await api.put(`/jobs/${id}`, data);
      await loadJobs({ include: 'resources' }); // Refresh all with resources
      return { success: true };
    } catch (err: any) {
      setError(err.message || 'Failed to update job');
      return { success: false, error: err.message };
    }
  };

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

  const applyToFutureJobs = async (projectId: string, data: any) => {
    try {
      const result = await api.put(`/projects/${projectId}/future-jobs`, data) as any;
      await loadJobs(); // Refresh after bulk update
      return { success: true, updated: result?.updated ?? 0 };
    } catch (err: any) {
      setError(err.message || 'Failed to update future jobs');
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
    updateJob,
    updateJobSchedule,
    removeJobSchedule,
    applyToFutureJobs,
  };
}
