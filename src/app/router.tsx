import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { DocketsPage } from '@/features/docket/ui/DocketsPage';
import { DocketPage } from '@/features/docket/ui/DocketPage';
import { CustomerListPage } from '@/features/customers/ui/CustomerListPage';
import { AssetListPage } from '@/features/assets/ui/AssetListPage';
import { PersonnelListPage } from '@/features/personnel/ui/PersonnelListPage';
import { TasksPage } from '@/features/tasks/ui/TasksPage';
import { SettingsPage } from '@/features/settings/ui/SettingsPage';
import { PublicEnquiryPage } from '@/features/enquiries/ui/PublicEnquiryPage';
import { EnquiriesPage } from '@/features/enquiries/ui/EnquiriesPage';
import { JobsPage } from '@/features/jobs/ui/JobsPage';
import { DocsPage } from '@/features/docs/ui/DocsPage';
import { DashboardPage } from '@/features/dashboard/ui/DashboardPage';
import { ProjectsPage } from '@/features/projects/ui/ProjectsPage';
import { UnauthorizedPage } from '@/features/auth/ui/UnauthorizedPage';
import { Layout } from '@/widgets/layout/Layout';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dockets" element={<DocketsPage />} />
          <Route path="/docket" element={<DocketPage />} />
          <Route path="/customers" element={<CustomerListPage />} />
          <Route path="/assets" element={<AssetListPage />} />
          <Route path="/personnel" element={<PersonnelListPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/enquiries" element={<EnquiriesPage />} />
          <Route path="/enquiry" element={<PublicEnquiryPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/schedule" element={<JobsPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
