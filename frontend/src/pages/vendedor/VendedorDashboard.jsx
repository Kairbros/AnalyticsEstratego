import { Routes, Route, Navigate } from 'react-router-dom';
import ClientesPage from './ClientesPage';
import ClienteDetalle from './ClienteDetalle';
import DiagnosticoEditor from './DiagnosticoEditor';

export default function VendedorDashboard() {
  return (
    <Routes>
      <Route index element={<ClientesPage />} />
      <Route path="clientes/:id" element={<ClienteDetalle />} />
      <Route path="diagnosticos/:id" element={<DiagnosticoEditor />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
