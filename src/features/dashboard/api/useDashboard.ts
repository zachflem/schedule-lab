import { useState, useCallback } from 'react';
import { api } from '@/shared/lib/api';

export interface DashboardData {
  jobStatusCounts: { status_id: string; count: number }[];
  enquiryStatusCounts: { status: string; count: number }[];
  newEnquiries: {
    id: string;
    customer_name: string;
    contact_email: string;
    job_brief: string | null;
    location: string | null;
    preferred_date: string | null;
    enquiry_type: string;
    status: string;
    created_at: string;
  }[];
  upcomingJobs: {
    id: string;
    status_id: string;
    location: string | null;
    job_brief: string | null;
    customer_name: string;
    start_time: string | null;
    end_time: string | null;
  }[];
  activeJobs: {
    id: string;
    status_id: string;
    location: string | null;
    job_brief: string | null;
    customer_name: string;
    updated_at: string;
  }[];
  openTasks?: {
    id: string;
    title: string;
    description: string | null;
    created_at: string;
    created_by_name: string | null;
    assignees?: { id: string; name: string }[];
  }[];
  maintenanceStats?: {
    tasksThisMonth: number;
    breakdownsThisMonth: number;
    assetsNeedingService: {
      id: string;
      name: string;
      service_interval_type: 'hours' | 'odometer';
      current_machine_hours: number;
      current_odometer: number;
      last_service_meter_reading: number;
      service_interval_value: number;
      remaining: number;
    }[];
  };
  // Operator specific
  assignedJobs?: {
    id: string;
    status_id: string;
    location: string | null;
    job_brief: string | null;
    customer_name: string;
    start_time: string | null;
    end_time: string | null;
  }[];
  operatorDockets?: {
    id: string;
    job_id: string;
    docket_status: string;
    date: string;
    dispatcher_notes: string | null;
    location: string | null;
    job_brief: string | null;
    customer_name: string;
  }[];
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<DashboardData>('/dashboard');
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, load };
}
