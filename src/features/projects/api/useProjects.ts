import { useState, useCallback } from 'react';
import { api } from '@/shared/lib/api';
import type { Project, ProjectJobTemplate } from '@/shared/validation/schemas';

export interface ProjectWithMetadata extends Project {
  customer_name: string;
  job_count: number;
  template_count: number;
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectWithMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async (params?: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<ProjectWithMetadata[]>('/projects', params);
      setProjects(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = async (data: Project) => {
    try {
      const res = await api.post<{ id: string }>('/projects', data);
      await loadProjects();
      return { success: true, id: res.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updateProject = async (id: string, data: Partial<Project>) => {
    try {
      await api.put(`/projects/${id}`, data);
      await loadProjects(); // Refresh after update
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await api.delete(`/projects/${id}`);
      setProjects(prev => prev.filter(p => p.id !== id));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const generateJobs = async (id: string) => {
    try {
      const res = await api.post<{ count: number; message: string }>(`/projects/${id}/generate-jobs`, {});
      return { success: true, count: res.count, message: res.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const getTemplates = async (projectId: string) => {
    try {
      const data = await api.get<ProjectJobTemplate[]>(`/projects/${projectId}/templates`);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const createTemplate = async (projectId: string, data: Partial<ProjectJobTemplate>) => {
    try {
      const res = await api.post<{ id: string }>(`/projects/${projectId}/templates`, data);
      return { success: true, id: res.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    projects,
    loading,
    error,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    generateJobs,
    getTemplates,
    createTemplate,
  };
}
