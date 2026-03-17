import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { DocketPage } from '@/features/docket/ui/DocketPage';
import { CustomerListPage } from '@/features/customers/ui/CustomerListPage';
import { CustomerFormPage } from '@/features/customers/ui/CustomerFormPage';
import { AssetListPage } from '@/features/assets/ui/AssetListPage';
import { AssetFormPage } from '@/features/assets/ui/AssetFormPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/docket" element={<DocketPage />} />
        <Route path="/customers" element={<CustomerListPage />} />
        <Route path="/customers/:id" element={<CustomerFormPage />} />
        <Route path="/assets" element={<AssetListPage />} />
        <Route path="/assets/:id" element={<AssetFormPage />} />
        <Route path="*" element={<Navigate to="/docket?jobId=j01" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
