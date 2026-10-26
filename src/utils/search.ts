import { Song, Hymnal } from '../types';

/** Quita tildes/diacríticos (á → a, ñ → n). */
export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normaliza texto para buscar: minúsculas, sin tildes, sin apóstrofes
 * (Jach'a → jacha) y sin signos de puntuación.
 */
export function normalizeText(s: string): string {
  return stripDiacritics(s || '')
    .toLowerCase()
    .replace(/['’‘`´ʼ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Código visible de una canción (prefijo del cancionero + número). */
export function getDisplayCode(song: Song, hymnals: Hymnal[]): string {
  const hymnal = hymnals.find(h => h.id === song.hymnalId);
  if (!hymnal) return song.code;
  const prefix = hymnal.codePrefix || hymnal.id.charAt(0).toUpperCase();
  const number = song.number || song.code.match(/(\d+)$/)?.[1] || '1';
  return `${prefix}${number}`;
}

/** Letra sin las líneas de acordes (las que empiezan con //), de todos los idiomas. */
export function lyricsText(song: Song): string {
  const parts: string[] = [song.lyrics || ''];
  if (song.lyricsByLanguage) {
    for (const v of Object.values(song.lyricsByLanguage)) parts.push(v || '');
  }
  return parts
    .join('\n')
    .split('\n')
    .filter(l => !l.trim().startsWith('//'))
    .join('\n');
}

type Field = 'title' | 'artist' | 'code' | 'lyrics' | 'categories';

export interface SearchResult {
  song: Song;
  score: number;
  fields: Field[];
}

interface SongIndex {
  title: string;
  artist: string;
  code: string;
  lyrics: string;
  categories: string;
}

const indexCache = new WeakMap<Song, SongIndex>();

function getIndex(song: Song): SongIndex {
  let idx = indexCache.get(song);
  if (!idx) {
    idx = {
      title: normalizeText(song.title),
      artist: normalizeText(song.artist),
      code: normalizeText(song.code),
      lyrics: normalizeText(lyricsText(song)),
      categories: normalizeText([...(song.categories || []), song.hymnalDetail || '', song.hymnalNumber || ''].join(' ')),
    };
    indexCache.set(song, idx);
  }
  return idx;
}

function distance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev: number[] = [];
  for (let j = 0; j <= n; j++) prev.push(j);
  for (let i = 1; i <= m; i++) {
    const cur: number[] = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost));
    }
    prev = cur;
  }
  return prev[n];
}

/** Coincidencia aproximada (tolera 1–2 letras equivocadas). */
function fuzzyIn(token: string, text: string): boolean {
  if (token.length < 4) return false;
  const max = token.length >= 8 ? 2 : 1;
  for (const w of text.split(' ')) {
    if (w.length < 3) continue;
    if (Math.abs(w.length - token.length) <= max && distance(token, w) <= max) return true;
    if (w.length > token.length && distance(token, w.slice(0, token.length)) <= max) return true;
  }
  return false;
}

function scoreToken(idx: SongIndex, t: string): { score: number; field: Field | null } {
  const short = t.length < 2;
  const cands: Array<[number, Field]> = [];

  if (idx.code === t) cands.push([100, 'code']);
  else if (!short && idx.code.includes(t)) cands.push([25, 'code']);

  if (idx.title === t) cands.push([90, 'title']);
  else if (idx.title.startsWith(t)) cands.push([60, 'title']);
  else if (idx.title.includes(' ' + t)) cands.push([45, 'title']);
  else if (!short && idx.title.includes(t)) cands.push([30, 'title']);

  if (idx.artist.startsWith(t) || idx.artist.includes(' ' + t)) cands.push([22, 'artist']);
  else if (!short && idx.artist.includes(t)) cands.push([16, 'artist']);

  if (!short && idx.categories.includes(t)) cands.push([10, 'categories']);
  if (!short && idx.lyrics.includes(t)) cands.push([8, 'lyrics']);

  if (cands.length === 0) {
    if (fuzzyIn(t, idx.title)) cands.push([14, 'title']);
    else if (fuzzyIn(t, idx.artist)) cands.push([9, 'artist']);
  }

  let best = 0;
  let field: Field | null = null;
  for (const [score, f] of cands) {
    if (score > best) {
      best = score;
      field = f;
    }
  }
  return { score: best, field };
}

/**
 * Busca canciones por título, artista, código, categoría y letra (en todos los idiomas).
 * Ignora tildes y mayúsculas, tolera pequeños errores de escritura y ordena por relevancia.
 */
export function searchSongs(songs: Song[], query: string, opts: { limit?: number } = {}): SearchResult[] {
  const q = normalizeText(query);
  if (!q) return [];
  const tokens = q.split(' ');
  const results: SearchResult[] = [];

  for (const song of songs) {
    const idx = getIndex(song);
    let total = 0;
    const fields = new Set<Field>();
    let ok = true;

    for (const t of tokens) {
      const { score, field } = scoreToken(idx, t);
      if (score === 0) {
        ok = false;
        break;
      }
      total += score;
      if (field) fields.add(field);
    }
    if (!ok) continue;

    if (tokens.length > 1) {
      if (idx.title.includes(q)) total += 40;
      else if (idx.lyrics.includes(q)) {
        total += 20;
        fields.add('lyrics');
      }
    }
    results.push({ song, score: total, fields: Array.from(fields) });
  }

  results.sort((a, b) => b.score - a.score || a.song.title.localeCompare(b.song.title, 'es'));
  return opts.limit ? results.slice(0, opts.limit) : results;
}

/** Línea de la letra donde aparece lo buscado (para mostrar como vista previa). */
export function getLyricSnippet(song: Song, query: string, maxLen = 90): string | null {
  const q = normalizeText(query);
  if (!q) return null;
  const tokens = q.split(' ');
  const lines = lyricsText(song)
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let fallback: string | null = null;
  for (const line of lines) {
    const n = normalizeText(line);
    if (n.includes(q)) return truncate(line, maxLen);
    if (!fallback && tokens.every(t => n.includes(t))) fallback = line;
  }
  if (fallback) return truncate(fallback, maxLen);
  const longest = tokens.reduce((a, b) => (b.length > a.length ? b : a), '');
  for (const line of lines) {
    if (normalizeText(line).includes(longest)) return truncate(line, maxLen);
  }
  return null;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

/** Divide un texto en segmentos resaltando lo buscado (sin importar tildes ni mayúsculas). */
export function highlightSegments(text: string, query: string): Array<{ text: string; hit: boolean }> {
  let tokens = normalizeText(query).split(' ').filter(t => t.length > 0);
  const longer = tokens.filter(t => t.length >= 2);
  if (longer.length > 0) tokens = longer;
  if (!text || tokens.length === 0) return [{ text, hit: false }];

  let norm = '';
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/['’‘`´ʼ]/.test(ch)) continue;
    let n = stripDiacritics(ch).toLowerCase();
    if (n === '') continue;
    if (n.length > 1) n = n.charAt(0);
    if (!/[\p{L}\p{N}]/u.test(n)) n = ' ';
    norm += n;
    map.push(i);
  }

  const ranges: Array<[number, number]> = [];
  for (const t of tokens) {
    let pos = norm.indexOf(t);
    while (pos !== -1) {
      ranges.push([map[pos], map[pos + t.length - 1] + 1]);
      pos = norm.indexOf(t, pos + t.length);
    }
  }
  if (ranges.length === 0) return [{ text, hit: false }];

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }

  const out: Array<{ text: string; hit: boolean }> = [];
  let cursor = 0;
  for (const [s, e] of merged) {
    if (s > cursor) out.push({ text: text.slice(cursor, s), hit: false });
    out.push({ text: text.slice(s, e), hit: true });
    cursor = e;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), hit: false });
  return out;
}
