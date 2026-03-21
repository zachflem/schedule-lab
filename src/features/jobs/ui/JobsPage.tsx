import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useJobs, type JobWithResources } from '../api/useJobs';
import { UnscheduledBucket } from './UnscheduledBucket';
import { CalendarView } from './CalendarView';
import { JobTable } from './JobTable';
import { JobEditModal } from './JobEditModal';
import { Spinner } from '@/shared/ui';
import { JOB_ONLY_STATUSES, type JobStatus } from '@/shared/validation/schemas';
import { api } from '@/shared/lib/api';
import { useState, useMemo } from 'react';

export function JobsPage() {
  const { jobs, loading, error, loadJobs, updateJob, updateJobSchedule, removeJobSchedule } = useJobs();
  const location = useLocation();
  const isScheduleView = location.pathname === '/schedule';
  
  const [selectedStatuses, setSelectedStatuses] = useState<JobStatus[]>(JOB_ONLY_STATUSES);
  const [editingJob, setEditingJob] = useState<JobWithResources | null>(null);
  const [resources, setResources] = useState<{ assets: any[], personnel: any[] }>({ assets: [], personnel: [] });
  const [selectedAssetType, setSelectedAssetType] = useState<string>('All');

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
    <div className="container-fluid jobs-page p-6">
      <div className="page-header mb-6 flex justify-between items-end">
        <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{isScheduleView ? 'Project Schedule' : 'Jobs Management'}</h1>
            <p className="text-gray-500 text-sm">
            {isScheduleView 
                ? 'Manage asset timelines and personnel allocations.' 
                : 'List and manage all jobs in the system.'}
            </p>
        </div>

        {isScheduleView && (
            <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Asset Filter:</span>
                    <select 
                        className="text-xs border-0 bg-transparent font-bold text-primary-600 cursor-pointer focus:ring-0"
                        value={selectedAssetType}
                        onChange={(e) => setSelectedAssetType(e.target.value)}
                    >
                        {assetTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>
        )}
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
            onUnschedule={(jobId) => {
              removeJobSchedule(jobId);
            }}
          />

          <div className="mb-4 flex justify-between items-center">
              <h2 className="text-lg font-bold">Gantt Timeline</h2>
              <div className="flex gap-2 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-primary-100 border-l-2 border-primary-600"></span> Scheduled</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-100 border-l-2 border-gray-400"></span> Confirmed</span>
              </div>
          </div>

          <CalendarView 
            jobs={filteredJobs} 
            resources={filteredResources}
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
