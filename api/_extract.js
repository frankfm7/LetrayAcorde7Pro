// Lectura de letras y acordes desde una página web (se ejecuta en el SERVIDOR, no en el navegador).
// Por qué en el servidor: el navegador no deja leer el contenido de otras páginas (política CORS /
// "same-origin") y muchos sitios impiden mostrarse dentro de un iframe. El servidor sí puede pedir la
// página y devolver solo el texto de la canción.

const DEFAULT_ALLOWED = [
  'lacuerda.net',
  'cifraclub.com',
  'cifraclub.com.br',
  'e-chords.com',
  'ultimate-guitar.com',
  'letras.com',
  'letras.mus.br',
  'acordesweb.com',
  'musica.com',
  'genius.com',
  'azlyrics.com',
];

const MAX_BYTES = 3 * 1024 * 1024;
const TIMEOUT_MS = 12000;

function allowedHosts() {
  const extra = (process.env.SONG_ALLOWED_HOSTS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return [...DEFAULT_ALLOWED, ...extra];
}

export function isAllowedUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return { ok: false, reason: 'El enlace no es válido.' }; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { ok: false, reason: 'Solo se aceptan enlaces http o https.' };
  const host = u.hostname.toLowerCase();
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[)/.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    return { ok: false, reason: 'Ese enlace no está permitido.' };
  }
  const ok = allowedHosts().some(d => host === d || host.endsWith('.' + d));
  if (!ok) return { ok: false, reason: `Por ahora solo se pueden leer estos sitios: ${DEFAULT_ALLOWED.slice(0, 7).join(', ')}… Para otros, copia el texto y pégalo en la app.` };
  return { ok: true, url: u };
}

/* ------------------------------ HTML → texto ------------------------------ */

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', iexcl: '¡', iquest: '¿',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', Uuml: 'Ü',
  agrave: 'à', egrave: 'è', ograve: 'ò', acirc: 'â', ecirc: 'ê', ocirc: 'ô', ccedil: 'ç', atilde: 'ã', otilde: 'õ',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', ndash: '–', mdash: '—', hellip: '…', sharp: '#', flat: 'b',
};

export function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => (n in ENTITIES ? ENTITIES[n] : m));
}

/** Quita las etiquetas pero conserva EXACTAMENTE los espacios y saltos de línea (así los acordes siguen alineados). */
export function htmlToPreText(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+$/gm, '');
}

function stripTags(s) {
  return decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

const JUNK_LINE = /^(?:subir|bajar)\s+(?:de\s+)?tono|^transpor|^(?:ver|mostrar)\s+(?:acordes|diagramas)|^imprimir|^autoscroll|^tocar\b|^afinador|^copyright|^©|^publicidad|^advertisement/i;

function cleanContent(text) {
  const lines = text.split('\n').filter(l => !JUNK_LINE.test(l.trim()));
  return lines.join('\n').replace(/\n{4,}/g, '\n\n\n').replace(/^\n+/, '').replace(/\s+$/, '');
}

/* ------------------------------ Extracción ------------------------------ */

function allMatches(html, regex) {
  const out = [];
  let m;
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  while ((m = re.exec(html)) !== null) out.push(m);
  return out;
}

function fromUltimateGuitar(html) {
  const m = /class="js-store"[^>]*data-content="([^"]+)"/.exec(html) || /data-content="([^"]*tab_view[^"]*)"/.exec(html);
  if (!m) return null;
  try {
    const data = JSON.parse(decodeEntities(m[1]));
    const content = data?.store?.page?.data?.tab_view?.wiki_tab?.content;
    if (typeof content !== 'string') return null;
    const title = data?.store?.page?.data?.tab?.song_name;
    const artist = data?.store?.page?.data?.tab?.artist_name;
    const text = content
      .replace(/\[\/?ch\]/g, '')
      .replace(/\[\/?tab\]/g, '')
      .replace(/\r\n?/g, '\n');
    return { content: text, title, artist };
  } catch {
    return null;
  }
}

function fromPre(html) {
  const pres = allMatches(html, /<pre\b[^>]*>([\s\S]*?)<\/pre>/i).map(m => htmlToPreText(m[1]));
  if (pres.length === 0) return null;
  pres.sort((a, b) => b.length - a.length);
  return pres[0].replace(/\S/g, '').length > 0 && pres[0].trim().length > 25 ? { content: pres[0] } : null;
}

function fromLyricBlocks(html) {
  // Sitios de solo letra: párrafos dentro de un contenedor con clase "lyric", "letra", etc.
  const m = /<(div|article|section)\b[^>]*class="[^"]*(?:lyric-original|cnt-letra|lyrics|letra|song-text|lyric)[^"]*"[^>]*>([\s\S]*?)<\/\1>/i.exec(html);
  if (!m) return null;
  const inner = m[2];
  const paras = allMatches(inner, /<p\b[^>]*>([\s\S]*?)<\/p>/i).map(x => htmlToPreText(x[1]).trim()).filter(Boolean);
  const text = paras.length > 0 ? paras.join('\n\n') : htmlToPreText(inner).trim();
  return text.length > 40 ? { content: text } : null;
}

function titleFromHtml(html) {
  const og = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html);
  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const t = /<title>([\s\S]*?)<\/title>/i.exec(html);
  return stripTags((h1 && h1[1]) || (og && og[1]) || (t && t[1]) || '');
}

function cleanTitle(raw) {
  return raw
    .replace(/\s*[|\-–—]\s*(?:cifra club|cifraclub|lacuerda|la cuerda|e-chords|ultimate[- ]guitar|letras\.com|genius|azlyrics|musica\.com).*$/i, '')
    .replace(/\s*[-–—]\s*(?:acordes?|cifra|chords?|letra|tab|lyrics)\b.*$/i, '')
    .replace(/\s+(?:acordes?|chords?|cifra)$/i, '')
    .trim();
}

const prettySlug = s => decodeURIComponent(s).replace(/[-_+]+/g, ' ').replace(/\b\p{L}/gu, c => c.toUpperCase()).trim();

export function guessFromUrl(url) {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean).map(p => p.replace(/\.(shtml|html?|php)$/i, ''));
    const host = new URL(url).hostname;
    if (host.includes('e-chords') && parts.length >= 3) return { artist: prettySlug(parts[parts.length - 2]), title: prettySlug(parts[parts.length - 1]) };
    if (parts.length >= 2) return { artist: prettySlug(parts[parts.length - 2]), title: prettySlug(parts[parts.length - 1]) };
  } catch { /* sin pistas */ }
  return {};
}

export function extractFromHtml(html, url) {
  const found = fromUltimateGuitar(html) || fromPre(html) || fromLyricBlocks(html);
  if (!found) return null;
  const guess = guessFromUrl(url);
  let title = found.title || '';
  let artist = found.artist || '';
  if (!title) {
    const raw = cleanTitle(titleFromHtml(html));
    // "Canción - Artista" o "Artista - Canción": nos apoyamos en la URL para decidir
    const dash = raw.split(/\s+[-–—]\s+/);
    if (dash.length >= 2) {
      const g = (guess.title || '').toLowerCase();
      if (g && dash[1].toLowerCase().startsWith(g.slice(0, 5))) { artist = dash[0]; title = dash[1]; } else { title = dash[0]; artist = dash.slice(1).join(' - '); }
    } else title = raw;
  }
  title = title || guess.title || 'Sin título';
  artist = artist || guess.artist || '';
  const content = cleanContent(found.content);
  if (content.replace(/\s/g, '').length < 20) return null;
  return { title: title.trim(), artist: artist.trim(), content };
}

/* ------------------------------ Descarga segura ------------------------------ */

function decodeBytes(buf, contentType) {
  let charset = /charset=([\w-]+)/i.exec(contentType || '')?.[1];
  if (!charset) {
    const head = Buffer.from(buf.slice(0, 4096)).toString('latin1');
    charset = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1] || 'utf-8';
  }
  try { return new TextDecoder(charset.toLowerCase()).decode(buf); } catch { return new TextDecoder('utf-8').decode(buf); }
}

async function fetchPage(rawUrl) {
  let current = rawUrl;
  for (let hop = 0; hop < 4; hop++) {
    const check = isAllowedUrl(current);
    if (!check.ok) throw Object.assign(new Error(check.reason), { status: 400 });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(current, {
        redirect: 'manual',
        signal: ctrl.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Cancionero7Pro/2.2; uso personal)',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'es,en;q=0.8',
        },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        current = new URL(res.headers.get('location'), current).toString();
        continue;
      }
      if (!res.ok) throw Object.assign(new Error(`El sitio respondió con error ${res.status}. Puede que bloquee la lectura automática: copia el texto y pégalo en la app.`), { status: 502 });
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.length > MAX_BYTES) throw Object.assign(new Error('La página es demasiado grande.'), { status: 413 });
      return { html: decodeBytes(buf, res.headers.get('content-type')), url: current };
    } catch (e) {
      if (e.name === 'AbortError') throw Object.assign(new Error('El sitio tardó demasiado en responder.'), { status: 504 });
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw Object.assign(new Error('Demasiadas redirecciones.'), { status: 502 });
}

/** Punto de entrada común (Vercel y servidor de desarrollo). */
export async function handleSongRequest(rawUrl) {
  if (!rawUrl) return { status: 400, body: { error: 'Falta el enlace de la canción.' } };
  try {
    const page = await fetchPage(rawUrl);
    const song = extractFromHtml(page.html, page.url);
    if (!song) {
      return { status: 422, body: { error: 'No se encontró la letra en esa página. Copia el texto de la canción y pégalo en la app.' } };
    }
    return { status: 200, body: { ...song, source: new URL(page.url).hostname, url: page.url } };
  } catch (e) {
    return { status: e.status || 500, body: { error: e.message || 'No se pudo leer la página.' } };
  }
}
