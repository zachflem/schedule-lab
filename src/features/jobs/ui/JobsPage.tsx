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
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  });
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

  const navigateWeek = (direction: number) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + (direction * 7));
    setStartDate(d);
  };

  const jumpToToday = () => {
    const d = new Date();
    const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
    setStartDate(new Date(new Date().setDate(diff)));
  };

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
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600">◀</button>
                    <button onClick={jumpToToday} className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary-600 hover:bg-white hover:shadow-sm rounded-md transition-all">Today</button>
                    <button onClick={() => navigateWeek(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600">▶</button>
                </div>
                
                <div className="h-6 w-px bg-gray-200"></div>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jump to:</span>
                    <input 
                        type="date" 
                        className="text-xs border-0 bg-transparent font-bold text-gray-700 cursor-pointer focus:ring-0" 
                        onChange={(e) => {
                            if (!e.target.value) return;
                            const d = new Date(e.target.value);
                            const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
                            setStartDate(new Date(d.setDate(diff)));
                        }}
                    />
                </div>
                
                <div className="h-6 w-px bg-gray-200"></div>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Asset Type:</span>
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
            resources={filteredResources}
            startDate={startDate}
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
