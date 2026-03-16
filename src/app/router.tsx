import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { DocketPage } from '@/features/docket/ui/DocketPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/docket" element={<DocketPage />} />
        <Route path="*" element={<Navigate to="/docket?jobId=j01" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
