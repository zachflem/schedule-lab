export interface ResourceConflict {
  conflict_job_id: string;
  conflict_job_status: string;
  conflict_start_time: string;
  conflict_end_time: string;
  resource_type: 'Asset' | 'Personnel';
  resource_id: string;
  resource_name: string;
}

export async function checkResourceConflicts(
  db: D1Database,
  jobId: string,
  assetIds: string[],
  personnelIds: string[],
  startTime: string,
  endTime: string,
): Promise<ResourceConflict[]> {
  const conflicts: ResourceConflict[] = [];

  if (assetIds.length > 0) {
    const placeholders = assetIds.map(() => '?').join(',');
    const { results } = await db.prepare(`
      SELECT j.id as conflict_job_id, j.status_id as conflict_job_status,
             js.start_time as conflict_start_time, js.end_time as conflict_end_time,
             'Asset' as resource_type, a.id as resource_id, a.name as resource_name
      FROM job_resources jr
      JOIN job_schedules js ON jr.job_id = js.job_id
      JOIN jobs j ON jr.job_id = j.id
      JOIN assets a ON jr.asset_id = a.id
      WHERE jr.asset_id IN (${placeholders})
        AND jr.job_id != ?
        AND j.status_id NOT IN ('Cancelled', 'Completed', 'Invoiced')
        AND js.start_time < ?
        AND js.end_time > ?
    `).bind(...assetIds, jobId, endTime, startTime).all();
    conflicts.push(...(results as ResourceConflict[]));
  }

  if (personnelIds.length > 0) {
    const placeholders = personnelIds.map(() => '?').join(',');
    const { results } = await db.prepare(`
      SELECT j.id as conflict_job_id, j.status_id as conflict_job_status,
             js.start_time as conflict_start_time, js.end_time as conflict_end_time,
             'Personnel' as resource_type, p.id as resource_id, p.name as resource_name
      FROM job_resources jr
      JOIN job_schedules js ON jr.job_id = js.job_id
      JOIN jobs j ON jr.job_id = j.id
      JOIN personnel p ON jr.personnel_id = p.id
      WHERE jr.personnel_id IN (${placeholders})
        AND jr.job_id != ?
        AND j.status_id NOT IN ('Cancelled', 'Completed', 'Invoiced')
        AND js.start_time < ?
        AND js.end_time > ?
    `).bind(...personnelIds, jobId, endTime, startTime).all();
    conflicts.push(...(results as ResourceConflict[]));
  }

  return conflicts;
}
