import { supabase } from './supabase';

/** Abre el inicio de sesión con Google y vuelve a esta misma dirección. Devuelve el mensaje de error si falla. */
export async function signInWithGoogle(): Promise<string | null> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return error ? error.message : null;
  } catch (e) {
    return e instanceof Error ? e.message : 'No se pudo iniciar sesión';
  }
}
