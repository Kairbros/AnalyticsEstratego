import { Fragment, useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import {
  listarVendedores,
  crearVendedor,
  regenerarPasswordVendedor,
  listarClientesDeVendedor,
} from '../../services/vendedores.service';

export default function AdminDashboard() {
  const [vendedores, setVendedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  const [form, setForm] = useState({ email: '', nombre: '', telefono: '' });
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [credencial, setCredencial] = useState(null); // { email, passwordTemporal, tipo: 'creado' | 'regenerado' }
  const [copiado, setCopiado] = useState(false);
  const [regenerandoId, setRegenerandoId] = useState(null);
  const [expandidoId, setExpandidoId] = useState(null);
  const [clientesPorVendedor, setClientesPorVendedor] = useState({}); // { [vendedorId]: { cargando, error, clientes } }

  async function cargar() {
    setCargando(true);
    setErrorCarga('');
    try {
      const data = await listarVendedores();
      setVendedores(data);
    } catch (err) {
      setErrorCarga(err.response?.data?.error || 'No se pudieron cargar los vendedores');
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
      const { usuario, passwordTemporal } = await crearVendedor({
        email: form.email.trim(),
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || null,
      });
      setCredencial({ email: usuario.email, passwordTemporal, tipo: 'creado' });
      setForm({ email: '', nombre: '', telefono: '' });
      await cargar();
    } catch (err) {
      setErrorForm(err.response?.data?.error || 'No se pudo crear el vendedor');
    } finally {
      setEnviando(false);
    }
  }

  async function handleRegenerar(vendedor) {
    const ok = window.confirm(
      `¿Regenerar la contraseña de ${vendedor.nombre} (${vendedor.email})?\nLa contraseña actual dejará de funcionar inmediatamente.`,
    );
    if (!ok) return;
    setErrorForm('');
    setCredencial(null);
    setCopiado(false);
    setRegenerandoId(vendedor.id);
    try {
      const { usuario, passwordTemporal } = await regenerarPasswordVendedor(vendedor.id);
      setCredencial({ email: usuario.email, passwordTemporal, tipo: 'regenerado' });
    } catch (err) {
      setErrorForm(err.response?.data?.error || 'No se pudo regenerar la contraseña');
    } finally {
      setRegenerandoId(null);
    }
  }

  async function toggleExpandir(vendedor) {
    if (expandidoId === vendedor.id) {
      setExpandidoId(null);
      return;
    }
    setExpandidoId(vendedor.id);
    if (clientesPorVendedor[vendedor.id]?.clientes) return; // ya cargado
    setClientesPorVendedor((prev) => ({
      ...prev,
      [vendedor.id]: { cargando: true, error: '', clientes: null },
    }));
    try {
      const clientes = await listarClientesDeVendedor(vendedor.id);
      setClientesPorVendedor((prev) => ({
        ...prev,
        [vendedor.id]: { cargando: false, error: '', clientes },
      }));
    } catch (err) {
      setClientesPorVendedor((prev) => ({
        ...prev,
        [vendedor.id]: {
          cargando: false,
          error: err.response?.data?.error || 'No se pudieron cargar los clientes',
          clientes: null,
        },
      }));
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
        <section className="card">
          <h2 className="font-display text-xl font-semibold mb-1 text-slate-100">Crear vendedor</h2>
          <p className="text-sm text-slate-400 mb-4">
            La contraseña se genera automáticamente y solo se muestra una vez.
          </p>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="input"
                placeholder="vendedor@empresa.com"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-300 mb-1">Nombre</label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                required
                minLength={1}
                maxLength={200}
                className="input"
                placeholder="Nombre completo"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-300 mb-1">Teléfono (opcional)</label>
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

            <div className="md:col-span-3 flex items-center gap-3">
              <button
                type="submit"
                disabled={enviando}
                className="btn-gold"
              >
                {enviando ? 'Creando…' : 'Crear vendedor'}
              </button>
              {errorForm && <span className="text-sm text-estratego-danger">{errorForm}</span>}
            </div>
          </form>

          {credencial && (
            <div className="mt-5 border border-estratego-accent/40 bg-estratego-accent/10 rounded-xl p-4">
              <p className="text-sm font-medium text-estratego-gold">
                {credencial.tipo === 'regenerado'
                  ? 'Contraseña regenerada. Cópiala ahora — no se volverá a mostrar.'
                  : 'Vendedor creado. Guarda estas credenciales ahora — no se volverán a mostrar.'}
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
            <h2 className="font-display text-xl font-semibold text-slate-100">Vendedores</h2>
            <button
              onClick={cargar}
              className="text-sm text-slate-300 hover:text-estratego-gold"
              disabled={cargando}
            >
              {cargando ? 'Actualizando…' : 'Refrescar'}
            </button>
          </div>

          {errorCarga && <p className="text-sm text-estratego-danger mb-3">{errorCarga}</p>}

          {!cargando && vendedores.length === 0 && !errorCarga && (
            <p className="text-sm text-slate-400">Aún no hay vendedores registrados.</p>
          )}

          {vendedores.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-estratego-border">
                    <th className="py-2 pr-4 font-medium">Nombre</th>
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 pr-4 font-medium">Teléfono</th>
                    <th className="py-2 pr-4 font-medium">Estado</th>
                    <th className="py-2 pr-4 font-medium">Creado</th>
                    <th className="py-2 pr-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {vendedores.map((v) => {
                    const abierto = expandidoId === v.id;
                    const info = clientesPorVendedor[v.id];
                    return (
                      <Fragment key={v.id}>
                        <tr className="border-b border-estratego-border/50">
                          <td className="py-2 pr-4">{v.nombre}</td>
                          <td className="py-2 pr-4 font-mono text-xs">{v.email}</td>
                          <td className="py-2 pr-4">{v.telefono || '—'}</td>
                          <td className="py-2 pr-4">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                v.activo
                                  ? 'bg-estratego-success/15 text-estratego-success'
                                  : 'bg-estratego-border text-slate-400'
                              }`}
                            >
                              {v.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-slate-400">
                            {new Date(v.creado_en).toLocaleDateString()}
                          </td>
                          <td className="py-2 pr-4 text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => toggleExpandir(v)}
                                className="text-xs border border-estratego-border rounded px-2 py-1 hover:bg-white/5"
                              >
                                {abierto ? 'Ocultar clientes' : 'Ver clientes'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRegenerar(v)}
                                disabled={regenerandoId === v.id}
                                className="text-xs border border-estratego-border rounded px-2 py-1 hover:bg-white/5 disabled:opacity-60"
                              >
                                {regenerandoId === v.id ? 'Regenerando…' : 'Regenerar contraseña'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {abierto && (
                          <tr className="bg-white/5">
                            <td colSpan={6} className="px-4 py-3">
                              {info?.cargando && (
                                <p className="text-xs text-slate-400">Cargando clientes…</p>
                              )}
                              {info?.error && (
                                <p className="text-xs text-estratego-danger">{info.error}</p>
                              )}
                              {info?.clientes && info.clientes.length === 0 && (
                                <p className="text-xs text-slate-400">
                                  Este vendedor aún no tiene clientes asignados.
                                </p>
                              )}
                              {info?.clientes && info.clientes.length > 0 && (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-left text-slate-400 border-b border-estratego-border">
                                        <th className="py-1.5 pr-4 font-medium">Nombre</th>
                                        <th className="py-1.5 pr-4 font-medium">Email</th>
                                        <th className="py-1.5 pr-4 font-medium">Empresa</th>
                                        <th className="py-1.5 pr-4 font-medium">Industria</th>
                                        <th className="py-1.5 pr-4 font-medium">Creado</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {info.clientes.map((c) => (
                                        <tr key={c.id} className="border-b border-estratego-border/50 last:border-0">
                                          <td className="py-1.5 pr-4">{c.nombre}</td>
                                          <td className="py-1.5 pr-4 font-mono">{c.email}</td>
                                          <td className="py-1.5 pr-4">{c.empresa || '—'}</td>
                                          <td className="py-1.5 pr-4">{c.industria || '—'}</td>
                                          <td className="py-1.5 pr-4 text-slate-400">
                                            {new Date(c.creado_en).toLocaleDateString()}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
