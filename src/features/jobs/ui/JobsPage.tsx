import { useEffect } from 'react';
import { useJobs } from '../api/useJobs';
import { UnscheduledBucket } from './UnscheduledBucket';
import { GanttChart } from './GanttChart';
import { Spinner } from '@/shared/ui';

export function JobsPage() {
  const { jobs, loading, error, loadJobs, updateJobSchedule } = useJobs();

  useEffect(() => {
    loadJobs({ include: 'resources' });
  }, [loadJobs]);

  if (loading && !jobs.length) return <Spinner />;

  return (
    <div className="container jobs-page p-8">
      <div className="page-header mb-8">
        <h1 className="text-2xl font-bold">Jobs & Scheduling</h1>
        <p className="text-gray-500 text-sm">Schedule jobs and manage resource allocations.</p>
      </div>

      {error && <div className="alert alert--danger mb-6">{error}</div>}

      <UnscheduledBucket 
        jobs={jobs} 
        onSelectJob={(job) => {
          // Future: open modal to edit or manually schedule
          console.log('Selected job', job);
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
        jobs={jobs} 
        onScheduleUpdate={(jobId, start, end) => {
          updateJobSchedule(jobId, start, end);
        }} 
      />
    </div>
  );
}
