import { useState } from 'react';
import { LogIn, LogOut, User as UserIcon, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Props {
  /** Abre el perfil local de la app (se mantiene disponible desde el menú del usuario) */
  onOpenProfile?: () => void;
}

/** Botón de Google: "Iniciar sesión" si no hay usuario; foto y nombre (con menú para cerrar sesión) si ya entró. */
export default function LoginButton({ onOpenProfile }: Props) {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const signIn = async () => {
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    // Si todo sale bien el navegador se va a Google; solo volvemos aquí si hubo un error
    if (err) { setError(err.message); setBusy(false); }
  };

  const signOut = async () => {
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
    setOpen(false);
  };

  if (loading) {
    return <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}><Loader2 size={16} className="animate-spin" /></div>;
  }

  if (!user) {
    return (
      <div className="relative">
        <button
          onClick={signIn}
          disabled={busy}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 transition disabled:opacity-60"
          title="Iniciar sesión con Google"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
          <span className="whitespace-nowrap">Iniciar sesión</span>
        </button>
        {error && <div className="absolute right-0 top-full mt-1 w-56 rounded-lg p-2 text-[11px] bg-red-600 text-white z-50">{error}</div>}
      </div>
    );
  }

  const meta = (user.user_metadata || {}) as Record<string, string | undefined>;
  const name = meta.full_name || meta.name || user.email || 'Usuario';
  const photo = meta.avatar_url || meta.picture;

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:opacity-80" style={{ backgroundColor: 'var(--bg-tertiary)' }} aria-haspopup="menu" aria-expanded={open}>
        <span className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
          {photo ? <img src={photo} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <UserIcon size={14} style={{ color: 'var(--accent)' }} />}
        </span>
        <span className="text-xs font-semibold hidden sm:block max-w-[8rem] truncate" style={{ color: 'var(--text-primary)' }}>{name}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl p-3 z-50 shadow-2xl" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-light)' }}>
                {photo ? <img src={photo} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <UserIcon size={22} style={{ color: 'var(--accent)' }} />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold truncate">{name}</span>
                <span className="block text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</span>
              </span>
            </div>
            {onOpenProfile && (
              <button onClick={() => { setOpen(false); onOpenProfile(); }} className="w-full text-left px-3 py-2 rounded-lg text-sm mb-1" style={{ backgroundColor: 'var(--bg-tertiary)' }}>Ver perfil</button>
            )}
            <button onClick={signOut} disabled={busy} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-60">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />} Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}
