import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useJobs, type JobWithResources } from '../api/useJobs';
import { UnscheduledBucket } from './UnscheduledBucket';
import { GanttChart } from './GanttChart';
import { JobTable } from './JobTable';
import { JobEditModal } from './JobEditModal';
import { Spinner } from '@/shared/ui';
import { JOB_ONLY_STATUSES, type JobStatus } from '@/shared/validation/schemas';
import { api } from '@/shared/lib/api';
import { useState, useMemo } from 'react';

export function JobsPage() {
  const { jobs, loading, error, loadJobs, updateJob, updateJobSchedule } = useJobs();
  const location = useLocation();
  const isScheduleView = location.pathname === '/schedule';
  
  const [selectedStatuses, setSelectedStatuses] = useState<JobStatus[]>(JOB_ONLY_STATUSES);
  const [editingJob, setEditingJob] = useState<JobWithResources | null>(null);
  const [resources, setResources] = useState<{ assets: any[], personnel: any[] }>({ assets: [], personnel: [] });

  useEffect(() => {
    loadJobs({ status: selectedStatuses, include: 'resources' });
    
    // Fetch all resources for Gantt rows
    async function fetchResources() {
      try {
        const [assets, personnel] = await Promise.all([
          api.get<any[]>('/assets'),
          api.get<any[]>('/personnel')
        ]);
        setResources({ assets, personnel });
      } catch (err) {
        console.error('Failed to fetch resources', err);
      }
    }
    fetchResources();
  }, [loadJobs, selectedStatuses]);

  const toggleStatus = (status: JobStatus) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => selectedStatuses.includes(j.status_id as JobStatus));
  }, [jobs, selectedStatuses]);

  if (loading && !jobs.length) return <Spinner />;

  return (
    <div className="container jobs-page p-8">
      <div className="page-header mb-8">
        <h1 className="text-2xl font-bold">{isScheduleView ? 'Project Schedule' : 'Jobs Management'}</h1>
        <p className="text-gray-500 text-sm">
          {isScheduleView 
            ? 'Visualize and manage timelines for all jobs.' 
            : 'List and manage all jobs in the system.'}
        </p>
      </div>

      {error && <div className="alert alert--danger mb-6">{error}</div>}

      <div className="filters mb-6 flex flex-wrap gap-2">
        <span className="text-sm font-semibold self-center mr-2">Filter Status:</span>
        {JOB_ONLY_STATUSES.map(status => (
          <button
            key={status}
            onClick={() => toggleStatus(status)}
            className={`btn btn--sm ${selectedStatuses.includes(status) ? 'btn--primary' : 'btn--secondary'}`}
            style={{ borderRadius: '20px', padding: '2px 12px', fontSize: '12px' }}
          >
            {status}
          </button>
        ))}
      </div>

      {isScheduleView ? (
        <>
          <UnscheduledBucket 
            jobs={filteredJobs} 
            onSelectJob={(job) => {
              setEditingJob(job);
            }} 
          />

          <div className="mb-4 flex justify-between items-center">
              <h2 className="text-lg font-bold">Gantt Timeline</h2>
              <div className="flex gap-2 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-primary-100 border-l-2 border-primary-600"></span> Scheduled</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-100 border-l-2 border-gray-400"></span> Confirmed</span>
              </div>
          </div>

          <GanttChart 
            jobs={filteredJobs} 
            resources={resources}
            onScheduleUpdate={(jobId, start, end) => {
              updateJobSchedule(jobId, start, end);
            }} 
          />
        </>
      ) : (
        <JobTable 
          jobs={filteredJobs} 
          loading={loading} 
          onEdit={(job) => setEditingJob(job)}
        />
      )}

      {editingJob && (
        <JobEditModal 
          job={editingJob}
          onClose={() => setEditingJob(null)}
          onSave={async (id, data) => {
            const res = await updateJob(id, data);
            if (res.success) {
               // Load jobs again with current filters to ensure consistency
               loadJobs({ status: selectedStatuses });
            }
            return res;
          }}
        />
      )}
    </div>
  );
}
