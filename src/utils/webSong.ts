/** Utilidades del buscador web de canciones. */

export interface WebSite {
  id: string;
  name: string;
  /** Dominio para buscar con "site:" */
  domain: string;
  note: string;
}

export const WEB_SITES: WebSite[] = [
  { id: 'lacuerda', name: 'LaCuerda', domain: 'lacuerda.net', note: 'Acordes en español' },
  { id: 'cifraclub', name: 'Cifra Club', domain: 'cifraclub.com', note: 'Acordes en español y portugués' },
  { id: 'echords', name: 'E-Chords', domain: 'e-chords.com', note: 'Acordes y tablaturas' },
  { id: 'ug', name: 'Ultimate Guitar', domain: 'tabs.ultimate-guitar.com', note: 'Acordes en inglés' },
  { id: 'letras', name: 'Letras.com', domain: 'letras.com', note: 'Solo letras' },
];

/** Enlace de búsqueda (en una pestaña nueva) restringido a un sitio, o a toda la web. */
export function buildSearchUrl(query: string, site?: WebSite): string {
  const q = query.trim();
  const terms = site ? `${q} ${site.id === 'letras' ? 'letra' : 'acordes'} site:${site.domain}` : `${q} letra y acordes`;
  return `https://www.google.com/search?q=${encodeURIComponent(terms)}`;
}

export interface WebSongResult {
  title: string;
  artist: string;
  content: string;
  source: string;
  url: string;
}

const API_BASE = (import.meta.env.VITE_SONG_API as string | undefined) || '';

/** Pide al servidor que lea la página y devuelva solo la letra con sus acordes. */
export async function fetchSongFromUrl(url: string): Promise<WebSongResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/song?url=${encodeURIComponent(url.trim())}`);
  } catch {
    throw new Error('No hay conexión con el servicio de lectura. Revisa tu internet o usa la opción de pegar el texto.');
  }
  const type = res.headers.get('content-type') || '';
  if (!type.includes('application/json')) {
    throw new Error('El servicio de lectura de páginas no está disponible en esta instalación (hace falta publicar la app en Vercel o usar npm run dev). Mientras tanto, pega el texto copiado.');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'No se pudo leer la página.');
  return data as WebSongResult;
}

/** Texto en el formato que entiende el analizador de canciones. */
export function webSongToText(song: WebSongResult): string {
  return `${song.title}\n${song.artist}\n\n${song.content}`;
}
