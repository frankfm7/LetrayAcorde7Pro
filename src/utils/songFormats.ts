import type { Song } from '../types';

/**
 * Convierte los formatos de otras aplicaciones (OpenSong, OpenLP/OpenLyrics, EasiSlides, ChordPro,
 * SongBeamer, SongSelect, Holyrics y JSON en general) al texto con datos que entiende el analizador
 * de canciones. Así todos los formatos pasan por el mismo reconocimiento de título, artista, tono,
 * idioma, categoría, himnario, numeración y orden de presentación.
 */

export type SongFormat = 'opensong' | 'openlyrics' | 'easislides' | 'chordpro' | 'songbeamer' | 'usr' | 'json' | 'text';

export const FORMAT_NAMES: Record<SongFormat, string> = {
  opensong: 'OpenSong', openlyrics: 'OpenLP / OpenLyrics', easislides: 'EasiSlides', chordpro: 'ChordPro',
  songbeamer: 'SongBeamer', usr: 'SongSelect (USR)', json: 'JSON', text: 'texto',
};

const SEP = '\n=====\n';

function parseXml(text: string): Document | null {
  try {
    const doc = new DOMParser().parseFromString(text.replace(/^\uFEFF/, ''), 'application/xml');
    return doc.querySelector('parsererror') ? null : doc;
  } catch {
    return null;
  }
}

/** Averigua en qué formato está un archivo mirando su nombre y su contenido. */
export function detectFormat(fileName: string, text: string): SongFormat {
  const name = fileName.toLowerCase();
  const head = text.replace(/^\uFEFF/, '').trimStart().slice(0, 4000);
  if (name.endsWith('.json') || /^[\[{]/.test(head) && (name.endsWith('.json') || /"(title|titulo|lyrics|letra)"/i.test(head))) return 'json';
  if (head.startsWith('<')) {
    if (/<easislides/i.test(head) || /<Item\b/.test(head) && /<Title1/i.test(head)) return 'easislides';
    if (/<song\b[^>]*openlyrics|<properties>|<titles>/i.test(head)) return 'openlyrics';
    if (/<song\b/i.test(head) && /<lyrics>/i.test(head)) return 'opensong';
    if (/<song\b/i.test(head)) return 'openlyrics';
  }
  if (/^\s*#\s*(LangCount|Title|Version)\s*=/im.test(head)) return 'songbeamer';
  if (/^\s*Title\s*=.*\n[\s\S]*\bWords\s*=/im.test(head) || name.endsWith('.usr')) return 'usr';
  if (/^\s*\{\s*(title|t|subtitle|st|artist|key|start_of_\w+|sov|soc)\b/im.test(head) || /\.(cho|chordpro|chopro|crd|pro)$/.test(name)) return 'chordpro';
  return 'text';
}

/* ------------------------------- OpenSong ------------------------------- */

const tag = (el: Element, name: string): string => (el.getElementsByTagName(name)[0]?.textContent || '').trim();

function opensongToText(doc: Document): string {
  const song = doc.documentElement;
  const out: string[] = [];
  const add = (label: string, v: string) => { if (v) out.push(`${label}: ${v}`); };
  add('Título', tag(song, 'title'));
  add('Artista', tag(song, 'author'));
  add('Orden', tag(song, 'presentation'));
  add('Tono', tag(song, 'key'));
  add('BPM', tag(song, 'tempo'));
  add('Compás', tag(song, 'time_sig'));
  add('Capo', tag(song, 'capo'));
  add('Categoría', tag(song, 'theme').replace(/;/g, ','));
  const hymn = tag(song, 'hymn_number');
  if (hymn) add('Numeración propia', hymn);
  out.push('');
  const lyrics = (song.getElementsByTagName('lyrics')[0]?.textContent || '').replace(/\r\n?/g, '\n');
  lyrics.split('\n').forEach(line => {
    if (line.startsWith(';')) return;                 // comentario
    if (/^\s*-{3,}\s*$/.test(line)) { out.push(''); return; }   // salto de diapositiva
    out.push(line.replace(/\|\|?\s*$/, '').replace(/^_/, ' '));
  });
  return out.join('\n');
}

/* ----------------------------- OpenLP / OpenLyrics ----------------------------- */

const VERSE_NAMES: Record<string, string> = { v: 'VERSO', c: 'CORO', b: 'PUENTE', p: 'PRE-CORO', i: 'INTRO', e: 'FINAL', o: 'OUTRO' };

function verseHeader(name: string): string {
  const m = /^([a-z])(\d*)/i.exec(name.trim());
  if (!m) return name.toUpperCase();
  const type = VERSE_NAMES[m[1].toLowerCase()] || name.toUpperCase();
  return `${type}${m[2] && type === 'VERSO' ? ' ' + m[2] : ''}`;
}

/** Convierte el contenido de <lines> en pares (acordes, letra) respetando la posición de cada acorde. */
function openLyricsLines(el: Element): string[] {
  const out: string[] = [];
  let lyric = '';
  let chords = '';
  const flush = () => {
    if (chords.trim()) out.push('//' + chords.replace(/\s+$/, ''));
    out.push(lyric.trim() === '' && !chords.trim() ? '' : lyric);
    lyric = '';
    chords = '';
  };
  const walk = (node: Node) => {
    node.childNodes.forEach(child => {
      if (child.nodeType === 3) { lyric += (child.textContent || '').replace(/\s*\n\s*/g, ' '); return; }
      if (child.nodeType !== 1) return;
      const e = child as Element;
      const n = e.tagName.toLowerCase();
      if (n === 'br') { flush(); return; }
      if (n === 'chord') {
        const name = e.getAttribute('name') || e.getAttribute('root') || '';
        if (chords.length < lyric.length) chords += ' '.repeat(lyric.length - chords.length);
        else if (chords.length > 0 && !chords.endsWith(' ')) chords += ' ';
        chords += name;
        return;
      }
      if (n === 'comment') return;
      walk(e);
    });
  };
  walk(el);
  if (lyric || chords) flush();
  return out;
}

function openLyricsToText(doc: Document): string {
  const song = doc.documentElement;
  const out: string[] = [];
  const add = (label: string, v: string) => { if (v) out.push(`${label}: ${v}`); };
  const titles = Array.from(song.getElementsByTagName('title')).map(t => (t.textContent || '').trim()).filter(Boolean);
  add('Título', titles[0] || '');
  add('Artista', Array.from(song.getElementsByTagName('author')).map(a => (a.textContent || '').trim()).filter(Boolean).join(', '));
  add('Orden', tag(song, 'verseOrder'));
  add('Tono', tag(song, 'key'));
  add('BPM', tag(song, 'tempo'));
  add('Compás', tag(song, 'timeSignature') || tag(song, 'time_sig'));
  add('Categoría', Array.from(song.getElementsByTagName('theme')).map(t => (t.textContent || '').trim()).filter(Boolean).join(', '));
  const book = song.getElementsByTagName('songbook')[0];
  if (book) {
    add('Detalle de Cancionero', book.getAttribute('name') || '');
    add('Numeración propia', book.getAttribute('entry') || '');
  }
  out.push('');
  Array.from(song.getElementsByTagName('verse')).forEach(v => {
    const name = v.getAttribute('name') || (v.getAttribute('type') ? `${v.getAttribute('type')}${v.getAttribute('label') || ''}` : '');
    if (name) out.push(verseHeader(name));
    const linesEl = v.getElementsByTagName('lines')[0];
    if (linesEl) out.push(...openLyricsLines(linesEl));
    else out.push(...(v.textContent || '').trim().split('\n').map(l => l.trim()));
    out.push('');
  });
  return out.join('\n');
}

/* ------------------------------- EasiSlides ------------------------------- */

function easislidesToText(doc: Document): string {
  const items = Array.from(doc.getElementsByTagName('Item'));
  const blocks = (items.length > 0 ? items : [doc.documentElement]).map(item => {
    const out: string[] = [];
    const add = (label: string, v: string) => { if (v) out.push(`${label}: ${v}`); };
    add('Título', tag(item, 'Title1') || tag(item, 'Title'));
    add('Artista', tag(item, 'Writer') || tag(item, 'Author'));
    add('Orden', tag(item, 'Sequence') || tag(item, 'VerseOrder'));
    add('Categoría', tag(item, 'Keywords').replace(/;/g, ','));
    const num = tag(item, 'SongNumber') || tag(item, 'Number');
    if (num) add('Numeración propia', num);
    add('Tono', tag(item, 'Key'));
    out.push('');
    out.push((item.getElementsByTagName('Contents')[0]?.textContent || tag(item, 'Lyrics')).replace(/\r\n?/g, '\n'));
    return out.join('\n');
  });
  return blocks.join(SEP);
}

/* --------------------------------- ChordPro --------------------------------- */

function chordProLine(line: string): string[] {
  if (!/\[[^\]]+\]/.test(line)) return [line];
  let lyric = '';
  let chords = '';
  const re = /\[([^\]]+)\]|([^\[]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m[1] !== undefined) {
      if (chords.length < lyric.length) chords += ' '.repeat(lyric.length - chords.length);
      else if (chords.length > 0) chords += ' ';
      chords += m[1];
    } else lyric += m[2];
  }
  const out: string[] = [];
  if (chords.trim()) out.push('//' + chords.replace(/\s+$/, ''));
  if (lyric.trim()) out.push(lyric);
  return out;
}

function chordProToText(text: string): string {
  const head: string[] = [];
  const body: string[] = [];
  const fieldMap: Record<string, string> = {
    title: 'Título', t: 'Título', subtitle: 'Artista', st: 'Artista', artist: 'Artista', composer: 'Artista', author: 'Artista',
    key: 'Tono', tempo: 'BPM', time: 'Compás', capo: 'Capo', language: 'Idioma', lang: 'Idioma',
    category: 'Categoría', tag: 'Categoría', songbook: 'Detalle de Cancionero',
  };
  const sectionFor = (kind: string, label: string): string => {
    if (label) return label;
    return kind === 'chorus' ? 'CORO' : kind === 'bridge' ? 'PUENTE' : kind === 'verse' ? 'VERSO' : kind.toUpperCase();
  };
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const dir = /^\s*\{\s*([a-z_]+)\s*(?::\s*|\s+)?(.*?)\s*\}\s*$/i.exec(line);
    if (dir) {
      const name = dir[1].toLowerCase();
      const value = dir[2];
      if (fieldMap[name] && value) { head.push(`${fieldMap[name]}: ${value}`); continue; }
      if (name === 'meta') {
        const mm = /^(\w+)\s+(.*)$/.exec(value);
        if (mm && fieldMap[mm[1].toLowerCase()]) head.push(`${fieldMap[mm[1].toLowerCase()]}: ${mm[2]}`);
        continue;
      }
      if (name === 'comment' || name === 'c' || name === 'comment_italic' || name === 'ci') { body.push('', value); continue; }
      const start = /^(?:start_of_|so)(verse|chorus|bridge|v|c|b)$/.exec(name);
      if (start) {
        const kind = start[1] === 'v' ? 'verse' : start[1] === 'c' ? 'chorus' : start[1] === 'b' ? 'bridge' : start[1];
        body.push('', sectionFor(kind, value));
        continue;
      }
      continue; // cualquier otra directiva se ignora
    }
    if (line.trim().startsWith('#')) continue; // comentario de ChordPro
    body.push(...chordProLine(line));
  }
  return [...head, '', ...body].join('\n');
}

/* --------------------------- SongBeamer y SongSelect --------------------------- */

function songBeamerToText(text: string): string {
  const head: string[] = [];
  const body: string[] = [];
  const map: Record<string, string> = { title: 'Título', author: 'Artista', composer: 'Artista', key: 'Tono', bpm: 'BPM', tempo: 'BPM', verseorder: 'Orden', category: 'Categoría', themes: 'Categoría', lang: 'Idioma', language: 'Idioma' };
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const m = /^#\s*([A-Za-z]+)\s*=\s*(.*)$/.exec(raw);
    if (m) { const f = map[m[1].toLowerCase()]; if (f && m[2].trim()) head.push(`${f}: ${m[2].trim()}`); continue; }
    if (/^\s*-{3,}\s*$/.test(raw)) { body.push(''); continue; }
    body.push(raw);
  }
  return [...head, '', ...body].join('\n');
}

function usrToText(text: string): string {
  const kv: Record<string, string> = {};
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const m = /^\s*([A-Za-z]+)\s*=\s*(.*)$/.exec(raw);
    if (m) kv[m[1].toLowerCase()] = m[2].trim();
  }
  const head: string[] = [];
  if (kv.title) head.push(`Título: ${kv.title}`);
  if (kv.author) head.push(`Artista: ${kv.author}`);
  if (kv.themes) head.push(`Categoría: ${kv.themes.replace(/\//g, ', ')}`);
  if (kv.keys) head.push(`Tono: ${kv.keys}`);
  const words = (kv.words || '').replace(/\/t/g, '\n').replace(/\/n/g, '\n\n');
  return [...head, '', words].join('\n');
}

/* ------------------------------- JSON (Holyrics y otros) ------------------------------- */

const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
const pick = (o: Record<string, unknown>, names: string[]): unknown => {
  const map = new Map(Object.keys(o).map(k => [norm(k), k] as [string, string]));
  for (const n of names) {
    const real = map.get(norm(n));
    if (real !== undefined && o[real] !== null && o[real] !== undefined && o[real] !== '') return o[real];
  }
  return undefined;
};
const asText = (v: unknown): string => {
  if (v === undefined || v === null) return '';
  if (Array.isArray(v)) return v.map(asText).filter(Boolean).join(', ');
  if (typeof v === 'object') return '';
  return String(v).trim();
};

function lyricsFromJson(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    return v.map(part => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object') {
        const o = part as Record<string, unknown>;
        const name = asText(pick(o, ['name', 'title', 'label', 'type', 'section']));
        const body = lyricsFromJson(pick(o, ['text', 'lyrics', 'content', 'lines', 'letra']));
        return `${name ? name + '\n' : ''}${body}`;
      }
      return '';
    }).join('\n\n');
  }
  return '';
}

/** ¿Es un objeto con el formato propio de esta app? (se importa tal cual, con todo lo que trae) */
export function isNativeSong(o: unknown): o is Song {
  if (!o || typeof o !== 'object') return false;
  const s = o as Record<string, unknown>;
  return typeof s.title === 'string' && typeof s.lyrics === 'string' && ('hymnalId' in s || 'timeSignature' in s);
}

function collectJsonSongs(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.filter((d): d is Record<string, unknown> => !!d && typeof d === 'object');
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    for (const k of ['songs', 'data', 'items', 'results', 'musicas', 'canciones']) {
      const v = pick(o, [k]);
      if (Array.isArray(v)) return collectJsonSongs(v);
    }
    return [o];
  }
  return [];
}

export function jsonToText(data: unknown): string {
  const songs = collectJsonSongs(data);
  const blocks = songs.map(o => {
    const out: string[] = [];
    const add = (label: string, v: unknown) => { const t = asText(v); if (t) out.push(`${label}: ${t}`); };
    add('Título', pick(o, ['title', 'titulo', 'name', 'nome', 'songtitle', 'songname']));
    add('Artista', pick(o, ['artist', 'artista', 'author', 'autor', 'composer', 'writer', 'singer']));
    add('Tono', pick(o, ['key', 'tone', 'tom', 'tonalidad', 'tonalidade']));
    add('BPM', pick(o, ['bpm', 'tempo']));
    add('Compás', pick(o, ['timesignature', 'timesig', 'time', 'compas', 'meter']));
    add('Idioma', pick(o, ['language', 'idioma', 'lang']));
    add('Categoría', pick(o, ['categories', 'category', 'categoria', 'group', 'tags', 'theme', 'folder']));
    add('Detalle de Cancionero', pick(o, ['hymnaldetail', 'songbook', 'hymnal', 'book', 'himnario', 'cancionero', 'collection']));
    add('Numeración propia', pick(o, ['hymnalnumber', 'number', 'numero', 'hymnnumber', 'entry', 'num']));
    add('Orden', pick(o, ['order', 'sequence', 'verseorder', 'presentation', 'arrangement']));
    out.push('');
    out.push(lyricsFromJson(pick(o, ['lyrics', 'letra', 'text', 'texto', 'content', 'body', 'words', 'lyric', 'slides', 'sections', 'verses'])));
    return out.join('\n');
  });
  return blocks.join(SEP);
}

/* ------------------------------- Punto de entrada ------------------------------- */

export interface ConvertResult {
  format: SongFormat;
  /** Texto listo para el analizador (varias canciones separadas por =====) */
  text: string;
}

/** Detecta el formato y devuelve el texto equivalente. Para texto normal, devuelve el mismo texto. */
export function convertToText(fileName: string, content: string): ConvertResult {
  const format = detectFormat(fileName, content);
  try {
    switch (format) {
      case 'opensong': { const d = parseXml(content); if (d) return { format, text: opensongToText(d) }; break; }
      case 'openlyrics': { const d = parseXml(content); if (d) return { format, text: openLyricsToText(d) }; break; }
      case 'easislides': { const d = parseXml(content); if (d) return { format, text: easislidesToText(d) }; break; }
      case 'chordpro': return { format, text: chordProToText(content) };
      case 'songbeamer': return { format, text: songBeamerToText(content) };
      case 'usr': return { format, text: usrToText(content) };
      case 'json': return { format, text: jsonToText(JSON.parse(content)) };
      default: break;
    }
  } catch {
    /* si falla la conversión se intenta como texto normal */
  }
  return { format: 'text', text: content };
}
