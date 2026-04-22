import { useAuth } from '../context/AuthContext';
import { ETIQUETA_ROL } from '../lib/roles';

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col gap-[3px]">
        <span className="block h-[3px] w-8 rounded-full bg-estratego-gold" />
        <span className="block h-[3px] w-6 rounded-full bg-estratego-gold/80" />
        <span className="block h-[3px] w-7 rounded-full bg-estratego-gold/90" />
        <span className="block h-[3px] w-5 rounded-full bg-estratego-gold/70" />
      </div>
      <div className="font-display font-semibold text-slate-100 tracking-tight text-lg">
        Analytics<span className="text-estratego-gold">Estratego</span>
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  const { usuario, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 backdrop-blur bg-estratego-ink/80 border-b border-estratego-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-4">
            {usuario && (
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-100 leading-tight">
                  {usuario.nombre}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-estratego-gold/80">
                  {ETIQUETA_ROL[usuario.rol]}
                </p>
              </div>
            )}
            <button
              onClick={logout}
              className="text-xs text-slate-400 hover:text-estratego-gold transition-colors border border-estratego-border rounded-lg px-3 py-1.5"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
