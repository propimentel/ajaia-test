import { Navigate, Route, Routes } from 'react-router-dom';
import { DocumentsPage } from '@/pages/DocumentsPage';
import { DocumentEditPage } from '@/pages/DocumentEditPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/documents" replace />} />
      <Route path="/documents" element={<DocumentsPage />} />
      <Route path="/documents/:id" element={<DocumentEditPage />} />
      <Route path="*" element={<Navigate to="/documents" replace />} />
    </Routes>
  );
}
