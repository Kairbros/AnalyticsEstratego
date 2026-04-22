import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import RutaProtegida from './components/RutaProtegida';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import VendedorDashboard from './pages/vendedor/VendedorDashboard';
import ClienteDashboard from './pages/cliente/ClienteDashboard';
import { rutaInicioPorRol } from './lib/roles';

function RaizRedirect() {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;
  return <Navigate to={usuario ? rutaInicioPorRol(usuario.rol) : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RaizRedirect />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/admin/*"
            element={
              <RutaProtegida rolesPermitidos={['super_admin']}>
                <AdminDashboard />
              </RutaProtegida>
            }
          />
          <Route
            path="/vendedor/*"
            element={
              <RutaProtegida rolesPermitidos={['vendedor']}>
                <VendedorDashboard />
              </RutaProtegida>
            }
          />
          <Route
            path="/cliente/*"
            element={
              <RutaProtegida rolesPermitidos={['cliente']}>
                <ClienteDashboard />
              </RutaProtegida>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
