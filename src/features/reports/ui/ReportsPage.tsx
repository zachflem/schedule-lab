import { useState } from 'react';
import { MaintenanceReportModal } from './MaintenanceReportModal';
import { CompliancePackModal } from './CompliancePackModal';
import { ProjectUtilisationModal } from './ProjectUtilisationModal';

type ActiveReport = 'maintenance' | 'compliance' | 'project' | null;

const REPORT_CARDS = [
  {
    id: 'maintenance' as const,
    title: 'Maintenance Report',
    description: 'Filter by date range and assets to view all maintenance activities, grouped by asset with selectable fields.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    id: 'compliance' as const,
    title: 'Compliance Pack',
    description: 'Generate a compliance document for a single asset, including selected compliance docs and maintenance records for a chosen date range.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
  {
    id: 'project' as const,
    title: 'Project Utilisation Report',
    description: 'Summary of all dockets completed for a specific project in a selected date range, including operator and machine hours.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    ),
  },
];

export function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ActiveReport>(null);

  return (
    <div className="container p-8">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 className="docket-page__title">Reports</h1>
        <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
          Generate and export operational reports
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 'var(--space-4)',
      }}>
        {REPORT_CARDS.map(report => (
          <div
            key={report.id}
            className="card"
            style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', overflow: 'visible' }}
          >
            <div style={{ color: 'var(--color-primary-600)' }}>
              {report.icon}
            </div>
            <div>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-gray-900)', marginBottom: 'var(--space-2)' }}>
                {report.title}
              </h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', lineHeight: 1.6 }}>
                {report.description}
              </p>
            </div>
            <button
              className="btn btn--primary"
              onClick={() => setActiveReport(report.id)}
              style={{ marginTop: 'auto' }}
            >
              Generate Report
            </button>
          </div>
        ))}
      </div>

      {activeReport === 'maintenance' && (
        <MaintenanceReportModal onClose={() => setActiveReport(null)} />
      )}
      {activeReport === 'compliance' && (
        <CompliancePackModal onClose={() => setActiveReport(null)} />
      )}
      {activeReport === 'project' && (
        <ProjectUtilisationModal onClose={() => setActiveReport(null)} />
      )}
    </div>
  );
}
