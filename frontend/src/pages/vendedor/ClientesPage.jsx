import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import {
  listarClientes,
  crearCliente,
  regenerarPasswordCliente,
} from '../../services/clientes.service';
import useLeadConnector from '../../hooks/useLeadConnector';

const formInicial = {
  email: '',
  nombre: '',
  empresa: '',
  telefono: '',
  industria: '',
  notas: '',
};

export default function ClientesPage() {
  useLeadConnector();

  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  const [form, setForm] = useState(formInicial);
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [credencial, setCredencial] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [regenerandoId, setRegenerandoId] = useState(null);


  async function cargar() {
    setCargando(true);
    setErrorCarga('');
    try {
      const data = await listarClientes();
      setClientes(data);
    } catch (err) {
      setErrorCarga(err.response?.data?.error || 'No se pudieron cargar los clientes');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorForm('');
    setCredencial(null);
    setCopiado(false);
    setEnviando(true);
    try {
      const { usuario, passwordTemporal } = await crearCliente({
        email: form.email.trim(),
        nombre: form.nombre.trim(),
        empresa: form.empresa.trim(),
        telefono: form.telefono.trim(),
        industria: form.industria.trim(),
        notas: form.notas.trim(),
      });
      setCredencial({ email: usuario.email, passwordTemporal, tipo: 'creado' });
      setForm(formInicial);
      await cargar();
    } catch (err) {
      setErrorForm(err.response?.data?.error || 'No se pudo crear el cliente');
    } finally {
      setEnviando(false);
    }
  }

  async function handleRegenerar(cliente) {
    const ok = window.confirm(
      `¿Regenerar la contraseña de ${cliente.nombre} (${cliente.email})?\nLa contraseña actual dejará de funcionar inmediatamente.`,
    );
    if (!ok) return;
    setErrorForm('');
    setCredencial(null);
    setCopiado(false);
    setRegenerandoId(cliente.id);
    try {
      const { usuario, passwordTemporal } = await regenerarPasswordCliente(cliente.id);
      setCredencial({ email: usuario.email, passwordTemporal, tipo: 'regenerado' });
    } catch (err) {
      setErrorForm(err.response?.data?.error || 'No se pudo regenerar la contraseña');
    } finally {
      setRegenerandoId(null);
    }
  }

  async function copiarPassword() {
    if (!credencial) return;
    try {
      await navigator.clipboard.writeText(credencial.passwordTemporal);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-estratego-border pb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-100">Panel de Vendedor</h1>
            <p className="text-sm text-slate-400">Gestiona tus clientes y realiza diagnósticos.</p>
          </div>
        </div>

        <section className="card">
          <h2 className="font-display text-xl font-semibold mb-1 text-slate-100">Registrar cliente</h2>
          <p className="text-sm text-slate-400 mb-4">
            La contraseña se genera automáticamente y solo se muestra una vez.
          </p>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-300 mb-1">Email *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="input"
                placeholder="cliente@empresa.com"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-300 mb-1">Nombre *</label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                required
                minLength={1}
                maxLength={200}
                className="input"
                placeholder="Nombre del contacto"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-300 mb-1">Empresa</label>
              <input
                type="text"
                name="empresa"
                value={form.empresa}
                onChange={handleChange}
                maxLength={200}
                className="input"
                placeholder="Nombre de la empresa"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-300 mb-1">Teléfono</label>
              <input
                type="text"
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                maxLength={50}
                className="input"
                placeholder="+57 300 000 0000"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-300 mb-1">Industria</label>
              <input
                type="text"
                name="industria"
                value={form.industria}
                onChange={handleChange}
                maxLength={100}
                className="input"
                placeholder="Ej. retail, SaaS, servicios"
              />
            </div>
            <div className="flex flex-col md:col-span-3">
              <label className="text-xs font-medium text-slate-300 mb-1">Notas</label>
              <textarea
                name="notas"
                value={form.notas}
                onChange={handleChange}
                rows={2}
                className="input"
                placeholder="Información adicional del cliente"
              />
            </div>

            <div className="md:col-span-3 flex items-center gap-3">
              <button
                type="submit"
                disabled={enviando}
                className="btn-gold"
              >
                {enviando ? 'Creando…' : 'Registrar cliente'}
              </button>
              {errorForm && <span className="text-sm text-estratego-danger">{errorForm}</span>}
            </div>
          </form>

          {credencial && (
            <div className="mt-5 border border-estratego-accent/40 bg-estratego-accent/10 rounded-xl p-4">
              <p className="text-sm font-medium text-estratego-gold">
                {credencial.tipo === 'regenerado'
                  ? 'Contraseña regenerada. Cópiala ahora — no se volverá a mostrar.'
                  : 'Cliente creado. Guarda estas credenciales ahora — no se volverán a mostrar.'}
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-2 text-sm">
                <div>
                  <span className="text-slate-400">Email:</span>{' '}
                  <span className="font-mono">{credencial.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Contraseña temporal:</span>
                  <span className="font-mono font-semibold">{credencial.passwordTemporal}</span>
                  <button
                    type="button"
                    onClick={copiarPassword}
                    className="text-xs border border-estratego-border rounded px-2 py-0.5 hover:bg-white/5"
                  >
                    {copiado ? 'Copiado ✓' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-slate-100">Mis clientes</h2>
            <button
              onClick={cargar}
              className="text-sm text-slate-300 hover:text-estratego-gold"
              disabled={cargando}
            >
              {cargando ? 'Actualizando…' : 'Refrescar'}
            </button>
          </div>

          {errorCarga && <p className="text-sm text-estratego-danger mb-3">{errorCarga}</p>}

          {!cargando && clientes.length === 0 && !errorCarga && (
            <p className="text-sm text-slate-400">Aún no has registrado clientes.</p>
          )}

          {clientes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-estratego-border">
                    <th className="py-2 pr-4 font-medium">Nombre</th>
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 pr-4 font-medium">Empresa</th>
                    <th className="py-2 pr-4 font-medium">Industria</th>
                    <th className="py-2 pr-4 font-medium">Creado</th>
                    <th className="py-2 pr-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c) => (
                    <tr key={c.id} className="border-b border-estratego-border/50">
                      <td className="py-2 pr-4">
                        <Link
                          to={`clientes/${c.id}`}
                          className="text-estratego-gold hover:underline font-medium"
                        >
                          {c.nombre}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">{c.email}</td>
                      <td className="py-2 pr-4">{c.empresa || '—'}</td>
                      <td className="py-2 pr-4">{c.industria || '—'}</td>
                      <td className="py-2 pr-4 text-slate-400">
                        {new Date(c.creado_en).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Link
                            to={`clientes/${c.id}`}
                            className="text-xs border border-estratego-border rounded px-2 py-1 hover:bg-white/5"
                          >
                            Abrir
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleRegenerar(c)}
                            disabled={regenerandoId === c.id}
                            className="text-xs border border-estratego-border rounded px-2 py-1 hover:bg-white/5 disabled:opacity-60"
                          >
                            {regenerandoId === c.id ? 'Regenerando…' : 'Regenerar contraseña'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
