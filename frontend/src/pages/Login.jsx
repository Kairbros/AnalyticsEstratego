import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { rutaInicioPorRol } from '../lib/roles';

export default function Login() {
  const { login, usuario } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) {
    return <Navigate to={rutaInicioPorRol(usuario.rol)} replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const user = await login(email, password);
      navigate(rutaInicioPorRol(user.rol), { replace: true });
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al iniciar sesión');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm card space-y-5 shadow-glow"
      >
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex flex-col gap-[3px]">
              <span className="block h-[3px] w-10 rounded-full bg-estratego-gold" />
              <span className="block h-[3px] w-7 rounded-full bg-estratego-gold/80" />
              <span className="block h-[3px] w-9 rounded-full bg-estratego-gold/90" />
              <span className="block h-[3px] w-6 rounded-full bg-estratego-gold/70" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-semibold text-estratego-gold">
            AnalyticsEstratego
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Aquí se viene a dominar
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">
            Correo
          </label>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="tucorreo@empresa.com"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">
            Contraseña
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="bg-estratego-danger/10 border border-estratego-danger/30 text-estratego-danger p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button type="submit" disabled={enviando} className="btn-gold w-full py-2.5">
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
