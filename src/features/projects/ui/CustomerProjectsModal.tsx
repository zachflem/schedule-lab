import { useState, useEffect } from 'react';
import { useProjects, type ProjectWithMetadata } from '../api/useProjects';
import { ProjectEditModal } from './ProjectEditModal';
import { Spinner } from '@/shared/ui';
import type { Customer } from '@/shared/validation/schemas';

interface Props {
  customer: Customer;
  onClose: () => void;
}

export function CustomerProjectsModal({ customer, onClose }: Props) {
  const { projects, loading, error, loadProjects, createProject, updateProject, generateJobs } = useProjects();
  const [editingProject, setEditingProject] = useState<ProjectWithMetadata | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const reload = () => loadProjects({ customer_id: customer.id! });

  useEffect(() => { reload(); }, [customer.id]);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    let cls = 'badge--active';
    if (s === 'completed') cls = 'badge--completed';
    if (s === 'on hold') cls = 'badge--on-hold';
    if (s === 'cancelled') cls = 'badge--cancelled';
    return <span className={`badge ${cls}`}>{status}</span>;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '700px', width: '95%' }}>
        <div className="modal-header">
          <h2>Projects — {customer.name}</h2>
          <button className="btn-close" onClick={onClose} type="button">&times;</button>
        </div>

        <div className="modal-body" style={{ padding: 'var(--space-4)' }}>
          {loading ? <Spinner /> : error ? (
            <div style={{ color: 'var(--color-danger-700)', background: 'var(--color-danger-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
              {error}
            </div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-gray-400)' }}>
              No projects yet for this customer.
            </div>
          ) : (
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
                  <th style={{ textAlign: 'left', padding: 'var(--space-3)' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: 'var(--space-3)' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: 'var(--space-3)' }}>Period</th>
                  <th style={{ textAlign: 'center', padding: 'var(--space-3)' }}>Jobs</th>
                  <th style={{ textAlign: 'right', padding: 'var(--space-3)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                    <td style={{ padding: 'var(--space-3)' }}>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      {p.description && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>{p.description}</div>
                      )}
                    </td>
                    <td style={{ padding: 'var(--space-3)' }}>{getStatusBadge(p.status)}</td>
                    <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', whiteSpace: 'nowrap' }}>
                      {p.start_date} → {p.end_date || 'Ongoing'}
                    </td>
                    <td style={{ padding: 'var(--space-3)', textAlign: 'center', fontSize: 'var(--text-sm)' }}>
                      {p.job_count}
                    </td>
                    <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                        {p.template_count > 0 && (
                          <button
                            className="btn btn--sm btn--primary"
                            disabled={generatingId === p.id}
                            onClick={async () => {
                              if (!p.id) return;
                              setGeneratingId(p.id);
                              const res = await generateJobs(p.id);
                              setGeneratingId(null);
                              if (res.success) { alert(res.message); reload(); }
                              else alert('Error: ' + res.error);
                            }}
                          >
                            {generatingId === p.id ? '...' : 'Generate'}
                          </button>
                        )}
                        <button className="btn btn--sm btn--secondary" onClick={() => setEditingProject(p)}>
                          Settings
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-gray-200)', paddingTop: 'var(--space-4)' }}>
          <button className="btn btn--primary" onClick={() => setIsCreating(true)}>New Project</button>
          <button className="btn btn--secondary" onClick={onClose}>Close</button>
        </div>
      </div>

      {editingProject && (
        <ProjectEditModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onUpdate={async (id, data) => {
            const res = await updateProject(id, data);
            if (res.success) reload();
            return res;
          }}
        />
      )}

      {isCreating && (
        <ProjectEditModal
          mode="create"
          customerId={customer.id}
          onClose={() => setIsCreating(false)}
          onCreate={async (data) => {
            const res = await createProject(data);
            if (res.success) reload();
            return res;
          }}
        />
      )}
    </div>
  );
}
