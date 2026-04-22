import { Routes, Route, Navigate } from 'react-router-dom';
import ClienteListado from './ClienteListado';
import ClienteDiagnosticoVista from './ClienteDiagnosticoVista';

export default function ClienteDashboard() {
  return (
    <Routes>
      <Route index element={<ClienteListado />} />
      <Route path="diagnosticos/:id" element={<ClienteDiagnosticoVista />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
