import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { DocketPage } from '@/features/docket/ui/DocketPage';
import { CustomerListPage } from '@/features/customers/ui/CustomerListPage';
import { CustomerFormPage } from '@/features/customers/ui/CustomerFormPage';
import { AssetListPage } from '@/features/assets/ui/AssetListPage';
import { AssetFormPage } from '@/features/assets/ui/AssetFormPage';
import { PersonnelListPage } from '@/features/personnel/ui/PersonnelListPage';
import { PersonnelFormPage } from '@/features/personnel/ui/PersonnelFormPage';
import { SettingsPage } from '@/features/settings/ui/SettingsPage';
import { PublicEnquiryPage } from '@/features/enquiries/ui/PublicEnquiryPage';
import { EnquiriesPage } from '@/features/enquiries/ui/EnquiriesPage';
import { JobsPage } from '@/features/jobs/ui/JobsPage';
import { Layout } from '@/widgets/layout/Layout';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/docket" element={<DocketPage />} />
          <Route path="/customers" element={<CustomerListPage />} />
          <Route path="/customers/:id" element={<CustomerFormPage />} />
          <Route path="/assets" element={<AssetListPage />} />
          <Route path="/assets/:id" element={<AssetFormPage />} />
          <Route path="/personnel" element={<PersonnelListPage />} />
          <Route path="/personnel/:id" element={<PersonnelFormPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/enquiries" element={<EnquiriesPage />} />
          <Route path="/enquiry" element={<PublicEnquiryPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/" element={<Navigate to="/docket?jobId=j01" replace />} />
          <Route path="*" element={<Navigate to="/docket?jobId=j01" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
