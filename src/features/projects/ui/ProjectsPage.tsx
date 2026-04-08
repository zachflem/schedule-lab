import { useEffect, useState } from 'react';
import { useProjects, type ProjectWithMetadata } from '../api/useProjects';
import { ProjectEditModal } from './ProjectEditModal';
import { Spinner } from '@/shared/ui';
import { useAuth } from '@/shared/lib/auth';

export function ProjectsPage() {
  const { user } = useAuth();
  const isAdminOrDispatcher = user?.role === 'admin' || user?.role === 'dispatcher';
  const { projects, loading, error, loadProjects, createProject, updateProject, generateJobs } = useProjects();
  const [editingProject, setEditingProject] = useState<ProjectWithMetadata | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    let badgeClass = 'badge--active';
    if (s === 'completed') badgeClass = 'badge--completed';
    if (s === 'on hold') badgeClass = 'badge--on-hold';
    if (s === 'cancelled') badgeClass = 'badge--cancelled';
    return <span className={`badge ${badgeClass}`}>{status}</span>;
  };

  return (
    <div className="projects-page py-6">
      <div className="page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading">Recurring Projects</h1>
          <p className="text-gray-500 text-sm">Parent engagements and recurrence management</p>
        </div>
        
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search projects or customers..."
            className="form-input"
            value={searchTerm}
            style={{ minWidth: '300px' }}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {isAdminOrDispatcher && (
            <button className="btn btn--primary flex items-center gap-2" onClick={() => setIsCreating(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '18px', height: '18px' }}>
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Project
            </button>
          )}
        </div>
      </div>

      {loading ? <Spinner /> : error ? (
        <div className="error-state p-8 text-center text-red-600 bg-red-50 rounded-lg border border-red-100">
          <p>⚠️ {error}</p>
          <button className="btn btn--secondary mt-4" onClick={() => loadProjects()}>Retry</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Recurrence</th>
                <th>Jobs</th>
                <th>Period</th>
                {isAdminOrDispatcher && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="font-bold">{p.name}</div>
                    <div className="text-xs text-secondary truncate max-w-xs">{p.description}</div>
                  </td>
                  <td>{p.customer_name}</td>
                  <td>{getStatusBadge(p.status)}</td>
                  <td>
                    <div className="flex items-center gap-1 text-sm">
                      {p.recurrence_type === 'none' ? (
                        <span className="text-gray-400">One-off</span>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                          </svg>
                          <span className="font-medium text-primary">
                            {p.recurrence_type === 'weekdays' ? 'Weekly' : 'Interval'}
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold">
                      {p.job_count} job{p.job_count !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="text-sm">
                    {p.start_date} → {p.end_date || 'Ongoing'}
                  </td>
                  {isAdminOrDispatcher && (
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        {p.recurrence_type !== 'none' && (
                          <button 
                            className="btn btn--sm btn--primary" 
                            disabled={generatingId === p.id}
                            onClick={async () => {
                              if (!p.id) return;
                              setGeneratingId(p.id);
                              const res = await generateJobs(p.id);
                              setGeneratingId(null);
                              if (res.success) {
                                alert(res.message);
                                loadProjects();
                              } else {
                                alert('Error: ' + res.error);
                              }
                            }}
                          >
                            {generatingId === p.id ? '...' : 'Generate Jobs'}
                          </button>
                        )}
                        <button 
                          className="btn btn--sm btn--secondary" 
                          onClick={() => setEditingProject(p)}
                        >
                          Settings
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={isAdminOrDispatcher ? 7 : 6} className="text-center py-12 text-gray-400">
                    No matching projects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingProject && (
        <ProjectEditModal 
          project={editingProject} 
          onClose={() => setEditingProject(null)} 
          onUpdate={updateProject}
        />
      )}

      {isCreating && (
        <ProjectEditModal 
          mode="create"
          onClose={() => setIsCreating(false)} 
          onCreate={createProject}
        />
      )}
    </div>
  );
}
