import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useJobs, type JobWithResources } from '../api/useJobs';
import { UnscheduledBucket } from './UnscheduledBucket';
import { CalendarView } from './CalendarView';
import { JobTable } from './JobTable';
import { JobEditModal } from './JobEditModal';
import { NewJobModal } from './NewJobModal';
import { Spinner, FilterModal } from '@/shared/ui';
import { JOB_ONLY_STATUSES, type JobStatus } from '@/shared/validation/schemas';
import { api } from '@/shared/lib/api';
import { useState, useMemo } from 'react';
import { useAuth } from '@/shared/lib/auth';

export function JobsPage() {
  const { user } = useAuth();
  const isAdminOrDispatcher = user?.role === 'admin' || user?.role === 'dispatcher';
  const { jobs, loading, error, loadJobs, createJob, updateJob, updateJobSchedule, removeJobSchedule, applyToFutureJobs } = useJobs();
  const location = useLocation();
  const isScheduleView = location.pathname === '/schedule';
  
  const [selectedStatuses, setSelectedStatuses] = useState<JobStatus[]>(JOB_ONLY_STATUSES);
  const [editingJob, setEditingJob] = useState<JobWithResources | null>(null);
  const [resources, setResources] = useState<{ assets: any[], personnel: any[] }>({ assets: [], personnel: [] });
  const [selectedAssetType, setSelectedAssetType] = useState<string>('All');
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [bucketCollapsed, setBucketCollapsed] = useState(false);

  useEffect(() => {
    loadJobs({ status: selectedStatuses, include: 'resources' });
    
    // Fetch all resources for Gantt rows if admin/dispatcher
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
    if (isAdminOrDispatcher) {
      fetchResources();
    }
  }, [loadJobs, selectedStatuses, isAdminOrDispatcher]);


  const assetTypes = useMemo(() => {
    const types = resources.assets.map(a => a.asset_type_name || 'Other');
    return ['All', ...Array.from(new Set(types))].sort();
  }, [resources.assets]);

  const filteredResources = useMemo(() => {
    if (selectedAssetType === 'All') return resources;
    return {
      ...resources,
      assets: resources.assets.filter(a => a.asset_type_name === selectedAssetType)
    };
  }, [resources, selectedAssetType]);

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
    <div
      className="container-fluid jobs-page p-6"
      style={isScheduleView ? { height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' } : undefined}
    >
      <div className={`page-header ${isScheduleView ? 'mb-4' : 'mb-6'} shrink-0`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {isScheduleView ? 'Schedule' : 'Jobs'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isScheduleView
              ? 'Manage asset timelines and personnel allocations.'
              : 'List and manage all jobs in the system.'}
          </p>
        </div>
        {!isScheduleView && isAdminOrDispatcher && (
          <button className="btn btn--primary" onClick={() => setShowNewJobModal(true)}>
            + New Job
          </button>
        )}
      </div>

      {error && <div className="alert alert--danger mb-6">{error}</div>}

      <div className={`filters ${isScheduleView ? 'mb-4' : 'mb-6'} shrink-0`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <FilterModal
          title="Filter by Status"
          buttonLabel="Status Filter"
          options={JOB_ONLY_STATUSES.map(s => ({ value: s, label: s }))}
          selected={selectedStatuses}
          onToggle={(value) => toggleStatus(value as JobStatus)}
          onSelectAll={() => setSelectedStatuses([...JOB_ONLY_STATUSES])}
          onClearAll={() => setSelectedStatuses([])}
        />
        {isScheduleView && isAdminOrDispatcher && (
          <select
            className="form-input"
            value={selectedAssetType}
            onChange={(e) => setSelectedAssetType(e.target.value)}
            style={{ width: 'auto' }}
          >
            {assetTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {isScheduleView ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
          {isAdminOrDispatcher && (
            <UnscheduledBucket
              jobs={filteredJobs}
              collapsed={bucketCollapsed}
              onToggleCollapse={() => setBucketCollapsed(c => !c)}
              onSelectJob={(job) => setEditingJob(job)}
              onUnschedule={(jobId) => removeJobSchedule(jobId)}
            />
          )}

          <div className="mb-2 flex justify-between items-center shrink-0">
            <h2 className="text-lg font-bold text-gray-900">
              {isAdminOrDispatcher ? 'Daily Schedule' : 'My Schedule'}
            </h2>
            <div className="flex gap-3 text-[10px] text-gray-500 font-medium items-center">
              {([
                ['Job Booked', '#3b82f6'],
                ['Allocated', '#f59e0b'],
                ['Job Scheduled', '#8b5cf6'],
                ['Site Docket', '#ec4899'],
              ] as const).map(([label, color]) => (
                <span key={label} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ borderLeft: `3px solid ${color}`, background: `${color}18` }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative', flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
            <CalendarView
              jobs={filteredJobs}
              resources={filteredResources}
              onScheduleUpdate={isAdminOrDispatcher ? (jobId, start, end) => {
                updateJobSchedule(jobId, start, end);
              } : undefined}
            />
          </div>
        </div>
      ) : (
        <JobTable 
          jobs={filteredJobs} 
          loading={loading} 
          onEdit={(job) => setEditingJob(job)}
        />
      )}

      {showNewJobModal && (
        <NewJobModal
          onClose={() => setShowNewJobModal(false)}
          onCreate={async (data) => {
            const res = await createJob(data);
            if (res.success) {
              loadJobs({ status: selectedStatuses, include: 'resources' });
            }
            return res;
          }}
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
               loadJobs({ status: selectedStatuses, include: 'resources' });
            }
            return res;
          }}
          onApplyToFuture={async (projectId, data) => {
            const res = await applyToFutureJobs(projectId, data);
            if (res.success) {
              loadJobs({ status: selectedStatuses, include: 'resources' });
            }
            return res;
          }}
        />
      )}
    </div>
  );
}
