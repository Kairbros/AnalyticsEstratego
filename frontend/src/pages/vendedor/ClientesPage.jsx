import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import {
  listarClientes,
  crearCliente,
  regenerarPasswordCliente,
} from '../../services/clientes.service';
import { solicitarDemoWebhook } from '../../services/vendedores.service';

const formInicial = {
  email: '',
  nombre: '',
  empresa: '',
  telefono: '',
  industria: '',
  notas: '',
};

const PREFIJOS = [
  { codigo: '57', etiqueta: '🇨🇴', length: 10 },
  { codigo: '34', etiqueta: '🇪🇸', length: 9 },
  { codigo: '52', etiqueta: '🇲🇽', length: 10 },
  { codigo: '1', etiqueta: '🇺🇸', length: 10 },
  { codigo: '58', etiqueta: '🇻🇪', length: 10 },
  { codigo: '593', etiqueta: '🇪🇨', length: 9 },
  { codigo: '51', etiqueta: '🇵🇪', length: 9 },
  { codigo: '56', etiqueta: '🇨🇱', length: 9 },
  { codigo: '54', etiqueta: '🇦🇷', length: 10 },
];

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  const [form, setForm] = useState(formInicial);
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [credencial, setCredencial] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [regenerandoId, setRegenerandoId] = useState(null);

  // States for Demo request
  const [mostrarModalDemo, setMostrarModalDemo] = useState(false);
  const [demoForm, setDemoForm] = useState({ nombre: '', telefono: '' });
  const [prefijoSeleccionado, setPrefijoSeleccionado] = useState('57');
  const [enviandoDemo, setEnviandoDemo] = useState(false);
  const [mensajeDemo, setMensajeDemo] = useState('');
  const [estadoDemo, setEstadoDemo] = useState(null); // null | 'success' | 'error'

  const prefijoObj = PREFIJOS.find((p) => p.codigo === prefijoSeleccionado) || PREFIJOS[0];
  const esTelefonoValido = demoForm.telefono.length === prefijoObj.length;

  async function handleDemoSubmit(e) {
    e.preventDefault();
    if (!esTelefonoValido) return;
    setEnviandoDemo(true);
    setMensajeDemo('');
    setEstadoDemo(null);
    try {
      const cleanedTelefono = prefijoSeleccionado + demoForm.telefono.replace(/\D/g, '');
      await solicitarDemoWebhook(cleanedTelefono);
      setEstadoDemo('success');
      setMensajeDemo('Debes esperar unos minutos.');
    } catch (err) {
      setEstadoDemo('error');
      let errorDetails = '';
      if (err.response) {
        errorDetails = err.response.data?.error || err.response.data?.message || `HTTP ${err.response.status}: ${err.response.statusText}`;
      } else {
        errorDetails = err.message || 'Error de conexión';
      }
      setMensajeDemo(`No se pudo procesar la solicitud: ${errorDetails}`);
    } finally {
      setEnviandoDemo(false);
    }
  }

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
          <div>
            <button
              onClick={() => setMostrarModalDemo(true)}
              className="bg-gradient-to-r from-estratego-gold to-yellow-500 hover:from-estratego-gold-hover hover:to-yellow-400 text-estratego-ink font-semibold rounded-xl px-5 py-2.5 text-sm transition-all shadow-glow hover:scale-[1.02] flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
              </svg>
              <span>Solicitar Demo</span>
            </button>
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

      {/* Modal de Solicitar Demo */}
      {mostrarModalDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-md border border-estratego-border bg-estratego-surface shadow-glow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-bold text-slate-100 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-estratego-gold">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                </svg>
                Solicitar Demo
              </h3>
              <button
                type="button"
                onClick={() => {
                  setMostrarModalDemo(false);
                  setDemoForm({ nombre: '', telefono: '' });
                  setMensajeDemo('');
                }}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {estadoDemo ? (
              <div className="space-y-4 py-4 text-center">
                {estadoDemo === 'success' ? (
                  <div className="mx-auto w-12 h-12 rounded-full bg-estratego-success/10 flex items-center justify-center text-estratego-success">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </div>
                ) : (
                  <div className="mx-auto w-12 h-12 rounded-full bg-estratego-danger/10 flex items-center justify-center text-estratego-danger">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}

                <p className="text-sm text-slate-300 px-2">{mensajeDemo}</p>

                <div className="flex gap-3 pt-2">
                  {estadoDemo === 'error' && (
                    <button
                      type="button"
                      onClick={() => {
                        setEstadoDemo(null);
                        setMensajeDemo('');
                      }}
                      className="w-1/2 btn-ghost py-2 text-sm"
                    >
                      Corregir
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarModalDemo(false);
                      setDemoForm({ nombre: '', telefono: '' });
                      setMensajeDemo('');
                      setEstadoDemo(null);
                    }}
                    className={`${estadoDemo === 'error' ? 'w-1/2' : 'w-full'} btn-gold py-2 text-sm`}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4">
                <p className="text-xs text-slate-400">
                  Ingresa los datos de contacto para solicitar la demostración del sistema.
                </p>

                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-300 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    name="nombre"
                    value={demoForm.nombre}
                    onChange={(e) => setDemoForm(f => ({ ...f, nombre: e.target.value }))}
                    required
                    className="input"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-300 mb-1">Número de Teléfono *</label>
                  <div className="flex gap-2">
                    <select
                      value={prefijoSeleccionado}
                      onChange={(e) => {
                        setPrefijoSeleccionado(e.target.value);
                        setDemoForm((f) => ({ ...f, telefono: '' }));
                      }}
                      className="input w-1/3 min-w-[125px]"
                    >
                      {PREFIJOS.map((p) => (
                        <option key={p.codigo} value={p.codigo}>
                          {p.etiqueta}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      name="telefono"
                      value={demoForm.telefono}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, ''); // Solo números
                        setDemoForm((f) => ({ ...f, telefono: val }));
                      }}
                      required
                      className="input w-2/3"
                      placeholder={`Ej. ${prefijoObj.length === 10 ? '3001234567' : '600123456'}`}
                    />
                  </div>
                  {demoForm.telefono && !esTelefonoValido && (
                    <span className="text-[11px] text-estratego-danger mt-1">
                      El número debe tener exactamente {prefijoObj.length} dígitos (actual: {demoForm.telefono.length}).
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarModalDemo(false);
                      setDemoForm({ nombre: '', telefono: '' });
                      setEstadoDemo(null);
                    }}
                    className="w-1/2 btn-ghost py-2 text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviandoDemo || !esTelefonoValido || !demoForm.nombre.trim()}
                    className="w-1/2 btn-gold py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {enviandoDemo ? 'Enviando…' : 'Solicitar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
