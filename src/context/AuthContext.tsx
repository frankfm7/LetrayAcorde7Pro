import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  /** true mientras se revisa si ya había una sesión iniciada */
  loading: boolean;
  /** true si el usuario tiene is_admin = true en la tabla `profiles` */
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextValue>({ user: null, session: null, loading: true, isAdmin: false });

/** Guarda al usuario de Google (Supabase) y avisa a toda la app cuando entra o sale. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .catch(() => undefined) // sin internet: la app sigue funcionando en local
      .finally(() => { if (active) setLoading(false); });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Rol de administrador: se lee de profiles.is_admin (si falla o no existe, no es admin)
  useEffect(() => {
    let active = true;
    if (!user) { setIsAdmin(false); return; }
    (async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
        if (active) setIsAdmin(!error && !!data?.is_admin);
      } catch {
        if (active) setIsAdmin(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  return <AuthContext.Provider value={{ user, session, loading, isAdmin }}>{children}</AuthContext.Provider>;
}

/** Usuario que inició sesión con Google (null si no hay sesión). */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
