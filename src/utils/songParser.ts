import type { Song } from '../types';
import { parseSections, parseOrderTokens, resolveOrderTokens, clampInterval, normalizeHymnalNumber, DEFAULT_INTERVAL_SECONDS } from './presentation';

/* ------------------------------------------------------------------ */
/*  Reconocimiento de acordes                                          */
/* ------------------------------------------------------------------ */

const LETTER_CHORD = /^[A-G](?:#|b)?(?:maj|min|dim|aug|sus|add|m|M|\+|°|ø|-|\d+|[#b]\d+)*(?:\/[A-G](?:#|b)?)?$/;
const SOLFEGE_CHORD = /^(Do|Re|Mi|Fa|Sol|La|Si)(#|b)?((?:maj|min|dim|aug|sus|add|m|M|\+|°|-|\d+)*)(?:\/(Do|Re|Mi|Fa|Sol|La|Si)(#|b)?)?$/;
const NEUTRAL = /^(?:[|\/\\\-–—.:·•]+|\(?[xX]\d+\)?|N\.?C\.?|%)$/;
const SOLFEGE_TO_LETTER: Record<string, string> = { Do: 'C', Re: 'D', Mi: 'E', Fa: 'F', Sol: 'G', La: 'A', Si: 'B' };

function cleanToken(tok: string): string {
  return tok
    .replace(/♯/g, '#')
    .replace(/♭/g, 'b')
    .replace(/^[(\[{]+/, '')
    .replace(/[)\]},;]+$/, '');
}

function solfegeToLetter(tok: string): string | null {
  const m = SOLFEGE_CHORD.exec(tok);
  if (!m) return null;
  let out = SOLFEGE_TO_LETTER[m[1]] + (m[2] || '') + (m[3] || '');
  if (m[4]) out += '/' + SOLFEGE_TO_LETTER[m[4]] + (m[5] || '');
  return out;
}

export interface ChordLineInfo {
  isChord: boolean;
  /** La misma línea con los acordes escritos con letras (conserva las columnas) */
  converted: string;
  firstChord?: string;
}

/** Dice si una línea contiene solo acordes (letras A–G o notas Do–Si) y la normaliza. */
export function analyzeChordLine(line: string): ChordLineInfo {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 140) return { isChord: false, converted: line };

  const tokens: Array<{ start: number; end: number; raw: string; chord?: string; solfege: boolean }> = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  let letters = 0;
  let solfeges = 0;
  let neutrals = 0;
  let modifiers = 0;

  while ((m = re.exec(line)) !== null) {
    const raw = m[0];
    const tok = cleanToken(raw);
    if (tok.length > 14) return { isChord: false, converted: line }; // un acorde nunca es tan largo
    if (tok === '' || NEUTRAL.test(tok)) {
      neutrals++;
      continue;
    }
    if (LETTER_CHORD.test(tok)) {
      letters++;
      if (tok.length > 1) modifiers++;
      tokens.push({ start: m.index, end: m.index + raw.length, raw, chord: tok, solfege: false });
      continue;
    }
    const sol = solfegeToLetter(tok);
    if (sol) {
      solfeges++;
      if (/[#bm\d+°-]|maj|min|dim|aug|sus|add/.test(tok.replace(/^(Do|Re|Mi|Fa|Sol|La|Si)/, ''))) modifiers++;
      tokens.push({ start: m.index, end: m.index + raw.length, raw, chord: sol, solfege: true });
      continue;
    }
    return { isChord: false, converted: line }; // hay una palabra normal
  }

  const total = letters + solfeges;
  if (total === 0) return { isChord: false, converted: line };
  // "A" suelta es casi seguro la preposición, no un acorde
  if (total === 1 && neutrals === 0 && tokens[0].chord === 'A' && !tokens[0].solfege) return { isChord: false, converted: line };
  // Las notas Do–Si también son palabras (Si, La, Mi…): se exige evidencia clara
  if (letters === 0 && !((solfeges >= 2 && modifiers >= 1) || solfeges >= 4)) return { isChord: false, converted: line };
  if (letters + solfeges >= 1 && solfeges > 0 && letters > 0 && modifiers === 0 && total < 3) return { isChord: false, converted: line };

  let out = line;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (!t.solfege) {
      // solo arreglamos símbolos raros (♯, ♭) manteniendo el largo
      const fixed = t.raw.replace(/♯/g, '#').replace(/♭/g, 'b');
      out = out.slice(0, t.start) + fixed + out.slice(t.end);
    } else {
      const lead = t.raw.match(/^[(\[{]+/)?.[0] || '';
      const trail = t.raw.match(/[)\]},;]+$/)?.[0] || '';
      const conv = (lead + (t.chord as string) + trail).padEnd(t.raw.length, ' ');
      out = out.slice(0, t.start) + conv + out.slice(t.end);
    }
  }
  return { isChord: true, converted: out, firstChord: tokens[0].chord };
}

/* ------------------------------------------------------------------ */
/*  Secciones                                                          */
/* ------------------------------------------------------------------ */

const SECTION_WORDS =
  'VERSO|VERSE|ESTROFA|CORO|ESTRIBILLO|CHORUS|REFR[ÁA]N|PUENTE|BRIDGE|INTRO(?:DUCCI[ÓO]N)?|FINAL|PRE[- ]?CORO|PRE[- ]?CHORUS|OUTRO|INTERLUDIO|CODA|INSTRUMENTAL';
const SECTION_LINE = new RegExp(`^\\s*[\\[(]?\\s*(${SECTION_WORDS})\\s*(\\d{0,2})\\s*[\\])]?\\s*:?\\s*(?:\\(?[xX]\\d+\\)?)?\\s*$`, 'i');
const SECTION_INLINE = new RegExp(`^\\s*(${SECTION_WORDS})\\s*(\\d{0,2})\\s*:\\s*(\\S.*)$`, 'i');

function normalizeSectionName(name: string): string {
  const n = name.toUpperCase().replace(/Á/g, 'A').replace(/Ó/g, 'O');
  if (n === 'ESTRIBILLO' || n === 'CHORUS' || n === 'REFRAN') return 'CORO';
  if (n === 'VERSE' || n === 'ESTROFA') return 'VERSO';
  if (n === 'BRIDGE') return 'PUENTE';
  if (n.startsWith('INTRO')) return 'INTRO';
  if (/^PRE[- ]?(CORO|CHORUS)$/.test(n)) return 'PRE-CORO';
  return n;
}

const SHORT_TYPES: Record<string, string> = { V: 'VERSO', S: 'VERSO', C: 'CORO', B: 'PUENTE', P: 'PRE-CORO', PC: 'PRE-CORO', I: 'INTRO', E: 'FINAL', T: 'FINAL', F: 'FINAL', O: 'OUTRO' };
// [C]  (V1)  [PC2]  → siempre son secciones
const SHORT_BRACKET = /^\s*[\[(]\s*(PC|[VSCBPIETFO])\s*(\d{1,2})?\s*[\])]\s*:?\s*$/i;
// C:  V1:  B:
const SHORT_COLON = /^\s*(PC|[VSCBPIETFO])\s*(\d{1,2})?\s*:\s*$/i;
// V1  P2  I  (solo letras que NO son acordes: así "C" o "B1" siguen siendo acordes)
const SHORT_BARE = /^\s*(PC|[VSPITO])\s*(\d{1,2})\s*$/i;

const BRACKET_NUMBER = /^\s*[\[(]\s*(\d{1,2})\s*[\])]\s*:?\s*$/;

export function parseSectionLine(line: string): string | null {
  const m = SECTION_LINE.exec(line);
  if (m) return `${normalizeSectionName(m[1])}${m[2] ? ' ' + m[2] : ''}`;
  const num = BRACKET_NUMBER.exec(line);
  if (num) return `VERSO ${num[1]}`;
  const short = SHORT_BRACKET.exec(line) || SHORT_COLON.exec(line) || SHORT_BARE.exec(line);
  if (short) {
    const type = SHORT_TYPES[short[1].toUpperCase()];
    if (type) return `${type}${short[2] ? ' ' + short[2] : ''}`;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Marcadores de idioma  ====== Aymara ======                         */
/* ------------------------------------------------------------------ */

const LANG_MARKER = /^\s*[=\-_*~#<>«»]{2,}\s*([\p{L}][\p{L} ]{1,24}?)\s*(?:[=\-_*~#<>«»]{2,})?\s*$/u;
const KNOWN_LANGS: Record<string, string> = {
  castellano: 'Castellano', espanol: 'Castellano', spanish: 'Castellano',
  ingles: 'Inglés', english: 'Inglés', portugues: 'Portugués', portuguese: 'Portugués',
  frances: 'Francés', french: 'Francés', italiano: 'Italiano', italian: 'Italiano', aleman: 'Alemán', german: 'Alemán',
  aymara: 'Aymara', quechua: 'Quechua', quichua: 'Quechua', guarani: 'Guaraní',
};

/**
 * Línea que separa los idiomas de una canción: "=== AYMARA ===", "==========aymara==========", "--- Quechua ---".
 * Acepta cualquier cantidad de signos, mayúsculas o minúsculas. Devuelve el nombre del idioma o null.
 */
export function parseLanguageMarker(line: string): string | null {
  const t = line.trim();
  if (t.length < 4 || t.length > 80) return null;
  const m = LANG_MARKER.exec(t);
  if (!m) return null;
  const name = m[1].trim();
  if (SECTION_LINE.test(name) || parseSectionLine(name)) return null;
  const known = KNOWN_LANGS[stripAccents(name).toLowerCase()];
  if (known) return known;
  // idioma poco común: solo si está encerrado entre signos por ambos lados
  const both = /^[=\-_*~#<>«»]{2,}.*[=\-_*~#<>«»]{2,}$/.test(t);
  if (!both || name.split(' ').length > 2) return null;
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

/* ------------------------------------------------------------------ */
/*  Tono                                                               */
/* ------------------------------------------------------------------ */

const SOLFEGE_NOTE: Record<string, string> = { do: 'C', re: 'D', mi: 'E', fa: 'F', sol: 'G', la: 'A', si: 'B' };

/**
 * Lee una tonalidad escrita de cualquier forma ("Eb", "D#m", "Mi bemol", "Re menor", "La mayor") y la devuelve
 * con la misma ortografía (un Mi bemol sigue siendo "Eb", no "D#").
 */
export function normalizeKey(raw: string): string | null {
  let t = cleanToken(raw.trim()).replace(/\s+/g, ' ');
  if (!t) return null;
  const words = stripAccents(t).toLowerCase();
  // notas escritas con nombre: "mi bemol menor", "re# menor", "sol mayor"
  const sm = /^(do|re|mi|fa|sol|la|si)\s*(#|b|sostenido|bemol)?\s*(menor|minor|min|m|mayor|major|maj)?\b/.exec(words);
  if (sm && (sm[2] || sm[3] || /^(do|re|mi|fa|sol|la|si)$/.test(words) || words.length <= 5)) {
    const acc = sm[2] === 'sostenido' ? '#' : sm[2] === 'bemol' ? 'b' : sm[2] || '';
    const minor = sm[3] === 'menor' || sm[3] === 'minor' || sm[3] === 'min' || sm[3] === 'm';
    const letter = SOLFEGE_NOTE[sm[1]];
    // "Mi" y "La" sueltos pueden ser palabras, pero aquí el campo ya es una tonalidad
    return letter + acc + (minor ? 'm' : '');
  }
  const m = /^([A-G])\s*(#|b|♯|♭)?\s*(m(?!aj)|min|minor|menor|-)?/.exec(t);
  if (!m) return null;
  const letter = m[1];
  const acc = m[2] === '♯' ? '#' : m[2] === '♭' ? 'b' : (m[2] || '');
  return letter + acc + (m[3] ? 'm' : '');
}

/* ------------------------------------------------------------------ */
/*  Limpieza de texto reconocido por OCR                               */
/* ------------------------------------------------------------------ */

export function cleanOcrText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[‘’´`]/g, "'")
    .replace(/[“”]/g, '"')
    .split('\n')
    .map(line => {
      let l = line.replace(/\s+$/, '');
      const body = l.trim();
      if (body.length > 3) {
        l = l.replace(/^(\s*)[|¦\[\]{}~_•·]+\s*/, '$1').replace(/\s*[|¦\[\]{}~_•·]+$/, '');
      }
      return l;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

/* ------------------------------------------------------------------ */
/*  Separar varias canciones                                           */
/* ------------------------------------------------------------------ */

const SEPARATOR_LINE = /^\s*([=\-_*~#])\1{2,}\s*$/;
export const PAGE_BREAK = '\f';

/** Divide por separadores escritos a propósito (===== , ----- , *****), siempre solos en su línea. */
export function splitMultipleSongs(text: string): string[] {
  const parts: string[] = [];
  let current: string[] = [];
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (SEPARATOR_LINE.test(line)) {
      parts.push(current.join('\n'));
      current = [];
    } else {
      current.push(line);
    }
  }
  parts.push(current.join('\n'));
  return parts.filter(p => p.trim().replace(/\f/g, '').length > 0);
}

type LineKind = 'blank' | 'section' | 'chord' | 'meta' | 'text';

function isDotChordLine(line: string): boolean {
  const t = line.trimStart();
  return t.startsWith('.') && !t.startsWith('..') && analyzeChordLine(t.slice(1)).isChord;
}

function classifyLine(line: string): LineKind {
  const t = line.trim();
  if (t === '' || t === PAGE_BREAK || parseLanguageMarker(t)) return 'blank';
  if (parseSectionLine(t)) return 'section';
  if (t.startsWith('//') || analyzeChordLine(line).isChord || isDotChordLine(line)) return 'chord';
  if (parseKeyValue(line) || META_CAPO.test(line)) return 'meta';
  return 'text';
}

const NUMBERED_TITLE = /^\s*(?:n[oº°.]*\s*)?\d{1,4}\s*[.)\-–:]\s+\S/i;
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

function isUpperTitle(t: string): boolean {
  const letters = t.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
  if (letters.length < 3) return false;
  const upper = letters.replace(/[^A-ZÁÉÍÓÚÜÑ]/g, '').length;
  return upper / letters.length >= 0.85;
}

/** Líneas que parecen un índice (título .... página) */
function looksLikeIndex(lines: string[], kinds: LineKind[]): boolean {
  const real = lines.map((l, i) => ({ l: l.trim(), k: kinds[i] })).filter(x => x.k !== 'blank');
  if (real.length < 6) return false;
  if (real.some(x => x.k === 'chord' || x.k === 'section')) return false;
  const short = real.filter(x => x.l.length <= 70).length / real.length;
  const indexy = real.filter(x => /(?:\.{2,}|\s{2,}|\s)\d{1,4}$/.test(x.l) || /^\d{1,4}\s*[.)\-–]?\s+\S/.test(x.l)).length / real.length;
  return short >= 0.9 && indexy >= 0.6;
}

export interface SmartSplit {
  chunks: string[];
  /** Bloques descartados por ser un índice o tabla de contenido */
  skippedIndexes: number;
}

/**
 * Separa un documento con muchas canciones. Primero usa los separadores escritos (=====);
 * si no hay, busca el patrón que se repite (títulos numerados, títulos seguidos de "VERSO 1" o
 * de "Tono:", títulos en mayúsculas, o una canción por página) y descarta índices.
 */
export function splitSongsSmart(text: string): SmartSplit {
  const explicit = splitMultipleSongs(text);
  const chunks: string[] = [];
  let skippedIndexes = 0;
  for (const part of explicit) {
    const r = autoSplit(part);
    chunks.push(...r.chunks);
    skippedIndexes += r.skippedIndexes;
  }
  return { chunks, skippedIndexes };
}

function autoSplit(part: string): SmartSplit {
  const lines = part.replace(/\r\n?/g, '\n').split('\n');
  const nonBlank = lines.filter(l => l.trim() !== '' && l.trim() !== PAGE_BREAK).length;
  const kinds = lines.map(classifyLine);
  const n = lines.length;

  // M: cada canción empieza con un bloque de datos (Título:, Artista:, Himnario:…), aunque haya líneas en blanco entre ellos
  const mStarts: number[] = [];
  const prevNonBlank = (i: number): number => { let j = i - 1; while (j >= 0 && kinds[j] === 'blank') j--; return j; };
  for (let i = 0; i < n; i++) {
    const startsText = kinds[i] === 'text' && (i === 0 || kinds[i - 1] === 'blank');
    if (!(kinds[i] === 'meta' || startsText)) continue;
    const pj = prevNonBlank(i);
    if (kinds[i] === 'meta' && pj >= 0 && kinds[pj] === 'meta') continue; // continúa el mismo bloque
    let metaCount = 0;
    let hasTitle = false;
    let j = i;
    let guard = 0;
    while (j < n && guard < 40) {
      if (kinds[j] === 'meta') {
        metaCount++;
        if (parseKeyValue(lines[j])?.field === 'title') hasTitle = true;
      } else if (kinds[j] === 'section' || kinds[j] === 'chord') break;
      else if (kinds[j] === 'text' && j !== i) break;
      j++;
      guard++;
    }
    if (kinds[i] === 'meta' && (metaCount >= 2 || hasTitle)) mStarts.push(i);
    else if (startsText && metaCount >= 2) mStarts.push(i);
  }
  if (mStarts.length < 2 && nonBlank < 24) return { chunks: [part.replace(/\f/g, '')], skippedIndexes: 0 };
  const nextNonBlank = (i: number): number => { let j = i + 1; while (j < n && kinds[j] === 'blank') j++; return j; };
  const afterPageBreak = new Set<number>();
  lines.forEach((l, i) => { if (l.includes(PAGE_BREAK) || l.trim() === PAGE_BREAK) afterPageBreak.add(i + (l.trim() === PAGE_BREAK ? 1 : 0)); });

  const prevBlank = (i: number) => i === 0 || kinds[i - 1] === 'blank';

  // Candidatos agrupados por tipo de señal
  const classes: Record<'A' | 'B' | 'C' | 'E' | 'P' | 'D', number[]> = { A: [], B: [], C: [], E: [], P: [], D: [] };

  for (let i = 0; i < n; i++) {
    if (kinds[i] !== 'text') continue;
    const t = lines[i].replace(/\f/g, '').trim();
    if (t.length < 2 || t.length > 70 || wordCount(t) > 9 || /[,;]$/.test(t) || /^\d{1,2}[.)]?$/.test(t)) continue;
    if (!prevBlank(i)) continue;
    const j = nextNonBlank(i);
    if (j >= n) continue;
    const kj = kinds[j];

    if (NUMBERED_TITLE.test(t)) classes.B.push(i);
    if (isUpperTitle(t)) classes.C.push(i);

    // A: título seguido de "Tono:..." o de un VERSO/INTRO inicial (VERSO 2 no abre una canción)
    if (kj === 'meta') classes.A.push(i);
    else if (kj === 'section') {
      const sec = parseSectionLine(lines[j].trim()) || '';
      if (/^(INTRO|VERSO(?: 1)?|PRE-CORO)$/.test(sec) || sec === 'CORO') classes.A.push(i);
    }

    // E: título + artista, y luego sección/acordes/meta
    if (kj === 'text') {
      const cand = lines[j].trim();
      const k2 = nextNonBlank(j);
      if (cand.length >= 3 && cand.length <= 45 && wordCount(cand) <= 6 && !/[.,;:!?¡¿]$/.test(cand) && k2 < n && (kinds[k2] === 'section' || kinds[k2] === 'chord' || kinds[k2] === 'meta')) classes.E.push(i);
    }

    // P: primera línea de una página, seguida de acordes/sección/datos
    if (afterPageBreak.has(i) && (kj === 'chord' || kj === 'section' || kj === 'meta' || kj === 'text')) classes.P.push(i);

    // D: título directamente seguido de acordes
    if (kj === 'chord' && t.length <= 45) classes.D.push(i);
  }

  const pageCount = afterPageBreak.size;
  let picked: number[] = mStarts.length >= 2 ? mStarts : [];
  let bestScore = 0;
  if (picked.length === 0) (['A', 'B', 'E', 'C'] as const).forEach(c => {
    if (classes[c].length >= 3 && classes[c].length > bestScore) { picked = classes[c]; bestScore = classes[c].length; }
  });
  if (picked.length === 0 && pageCount >= 3 && classes.P.length >= Math.max(3, Math.floor(pageCount * 0.5))) picked = classes.P;
  if (picked.length === 0 && classes.D.length >= 5 && nonBlank / classes.D.length >= 4) picked = classes.D;
  if (picked.length < 2) return { chunks: [part.replace(/\f/g, '')], skippedIndexes: 0 };

  // Construir los bloques
  const starts = [...picked].sort((a, b) => a - b);
  const raw: string[] = [];
  if (starts[0] > 0) raw.push(lines.slice(0, starts[0]).join('\n'));
  starts.forEach((st, idx) => raw.push(lines.slice(st, idx + 1 < starts.length ? starts[idx + 1] : n).join('\n')));

  const out: string[] = [];
  let skippedIndexes = 0;
  raw.forEach((block, idx) => {
    const bl = block.replace(/\f/g, '').split('\n');
    const bk = bl.map(classifyLine);
    const count = bl.filter((_, i) => bk[i] !== 'blank').length;
    if (count === 0) return;
    if (looksLikeIndex(bl, bk)) { skippedIndexes++; return; }
    const hasMusic = bk.some(k => k === 'chord' || k === 'section');
    if (idx === 0 && starts[0] > 0 && !hasMusic) return; // texto suelto antes de la primera canción
    if (count < 3 && !hasMusic && out.length > 0) { out[out.length - 1] += '\n' + bl.join('\n'); return; } // falso título: se une a la anterior
    out.push(bl.join('\n'));
  });
  return { chunks: out.length > 0 ? out : [part.replace(/\f/g, '')], skippedIndexes };
}

/* ------------------------------------------------------------------ */
/*  Analizar una canción                                               */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Datos con etiqueta (Título:, Artista:, Himnario:, Orden:…)         */
/* ------------------------------------------------------------------ */

type MetaField = 'title' | 'artist' | 'key' | 'bpm' | 'time' | 'capo' | 'language' | 'categories' | 'hymnalDetail' | 'hymnalNumber' | 'order' | 'interval';

const FIELD_TABLE: Array<[MetaField, string[]]> = [
  ['title', ['titulo', 'title', 'cancion', 'nombre', 'song', 'nombre de la cancion']],
  ['artist', ['artista', 'autor', 'interprete', 'cantante', 'compositor', 'by', 'por', 'author', 'artist', 'writer', 'letra y musica', 'musica y letra', 'letra', 'musica']],
  ['key', ['tono', 'tonalidad', 'nota', 'key', 'tom', 'clave']],
  ['bpm', ['bpm', 'tempo', 'pulsos']],
  ['time', ['compas', 'time', 'time signature', 'metrica']],
  ['capo', ['capo', 'cejilla']],
  ['language', ['idioma', 'idiomas', 'lenguaje', 'lengua', 'language', 'lang', 'idioma principal']],
  ['categories', ['categoria', 'categorias', 'tema', 'temas', 'genero', 'tags', 'category', 'categories', 'theme']],
  ['hymnalDetail', ['detalle de cancionero', 'detalle del cancionero', 'detalle', 'cancionero', 'himnario', 'songbook', 'hymnal', 'libro', 'book']],
  ['hymnalNumber', ['numeracion propia', 'numeracion', 'numero', 'nro', 'n°', 'nº', 'himno', 'number', 'hymn number', 'entry', 'numero de himno']],
  ['order', ['orden', 'orden de presentacion', 'presentacion', 'secuencia', 'sequence', 'presentation', 'verse order']],
  ['interval', ['tiempo por seccion', 'segundos por seccion', 'intervalo', 'seconds', 'interval', 'tiempo']],
];

const normAlias = (s: string) => stripAccents(s).toLowerCase().replace(/\.$/, '').replace(/\s+/g, ' ').trim();
function stripAccents(s: string): string { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

const ALIAS_MAP = new Map<string, MetaField>();
FIELD_TABLE.forEach(([field, aliases]) => aliases.forEach(a => ALIAS_MAP.set(normAlias(a), field)));

const META_CAPO = /^\s*capo\s*[:=]?\s*(?:traste\s*)?(\d{1,2})/i;
const KV_RE = /^[\s*•·>#_\-–—]*([^:=：\n/]{2,40}?)\s*[:=：]\s*(.*)$/;

// Etiquetas que se aceptan aunque falte el ":" ("Título A Dios el Padre", "Compás 4/4"), con una prueba del valor
const LOOSE_FIELDS: Array<[string, MetaField, (v: string) => boolean]> = [
  ['orden de presentacion', 'order', v => v.length > 0],
  ['tiempo por seccion', 'interval', v => /^\d{1,2}\b/.test(v)],
  ['detalle de cancionero', 'hymnalDetail', v => v.length > 0],
  ['numeracion propia', 'hymnalNumber', v => parseHymnalNumber(v) !== null],
  ['cancionero', 'hymnalDetail', v => v.length > 0],
  ['categorias', 'categories', v => v.length > 0],
  ['categoria', 'categories', v => v.length > 0],
  ['tonalidad', 'key', v => normalizeKey(v) !== null],
  ['numero', 'hymnalNumber', v => parseHymnalNumber(v) !== null],
  ['artista', 'artist', v => v.length > 0],
  ['idiomas', 'language', v => v.length > 0],
  ['idioma', 'language', v => v.length > 0],
  ['compas', 'time', v => /^\d{1,2}\s*\/\s*\d{1,2}/.test(v)],
  ['titulo', 'title', v => v.length > 0],
  ['bpm', 'bpm', v => /^\d{2,3}\b/.test(v)],
];

const AMBIGUOUS_EMPTY = new Set(['by', 'por', 'nota', 'letra', 'musica', 'tema', 'temas', 'libro', 'book', 'tempo', 'time', 'nombre', 'song', 'cancion', 'tom', 'clave', 'himno', 'entry', 'tiempo', 'lang', 'key', 'presentacion', 'number', 'pulsos']);

export interface KeyValue { field: MetaField; value: string; alias: string }

function parseLooseKeyValue(line: string): KeyValue | null {
  const t = line.replace(/^[\s*•·>#_\-–—]+/, '').trim();
  if (t.length > 110 || t.includes('//')) return null;
  const norm = stripAccents(t).toLowerCase();
  for (const [label, field, ok] of LOOSE_FIELDS) {
    if (!norm.startsWith(label)) continue;
    const after = t.slice(label.length);
    if (after && !/^[\s\-–—]/.test(after)) continue;
    const value = after.replace(/^[\s\-–—]+/, '').trim();
    if (value && ok(value)) return { field, value, alias: label };
  }
  return null;
}

/** Reconoce una línea "Etiqueta: valor" de las que se usan para describir una canción. */
export function parseKeyValue(line: string): KeyValue | null {
  const t = line.trim();
  if (t.startsWith('//') || t.startsWith('.') || t.length > 160) return null;
  line = line.replace(/\*\*|__/g, '');
  const m = KV_RE.exec(line);
  if (!m) return parseLooseKeyValue(line);
  const alias = normAlias(m[1]);
  const field = ALIAS_MAP.get(alias);
  if (!field) return null;
  const value = m[2].trim();
  // campo sin valor ("Artista:"): se reconoce como dato vacío, salvo etiquetas que también son palabras comunes
  if (value === '') return AMBIGUOUS_EMPTY.has(alias) ? null : { field, value, alias };
  if (field === 'bpm' && !/^\d{2,3}\b/.test(value)) return null;
  if (field === 'interval' && !/^\d{1,2}\b/.test(value)) return null;
  if (field === 'time' && !/\d{1,2}\s*\/\s*\d{1,2}/.test(value)) return null;
  if (field === 'capo' && !/\d/.test(value)) return null;
  return { field, value, alias };
}

const NUM_WORDS: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintiun: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900,
};

/** "treinta y cinco" → 35 (null si no son números en palabras). */
export function spanishNumberToInt(text: string): number | null {
  const words = stripAccents(text).toLowerCase().split(/[\s-]+/).filter(w => w && w !== 'y');
  if (words.length === 0) return null;
  let total = 0;
  for (const w of words) {
    if (!(w in NUM_WORDS)) return null;
    total += NUM_WORDS[w];
  }
  return total;
}

/** "número uno", "N° 075", "1", "Himno 12" → "N° 1", "N° 75"… */
export function parseHymnalNumber(value: string): string | null {
  let v = value.trim().replace(/^(?:numero|número|nro\.?|n\.?\s*[º°ᵒo]\.?|no\.?|num\.?|himno|#)\s*[:.#-]?\s*/i, '').trim();
  if (!v) return null;
  const digits = /^(\d{1,4})([A-Za-z]?)$/.exec(v);
  if (digits) return normalizeHymnalNumber(`N° ${digits[1]}${digits[2]}`);
  const words = spanishNumberToInt(v);
  if (words !== null) return `N° ${words}`;
  if (/\d/.test(v)) return normalizeHymnalNumber(`N° ${v}`);
  return null;
}

const LANG_MAP: Record<string, string> = {
  castellano: 'Castellano', espanol: 'Castellano', spanish: 'Castellano', es: 'Castellano',
  ingles: 'Inglés', english: 'Inglés', en: 'Inglés',
  portugues: 'Portugués', portuguese: 'Portugués', pt: 'Portugués',
  frances: 'Francés', french: 'Francés', fr: 'Francés',
  italiano: 'Italiano', italian: 'Italiano', it: 'Italiano',
  aleman: 'Alemán', german: 'Alemán', de: 'Alemán',
  aymara: 'Aymara', quechua: 'Quechua', quichua: 'Quechua', guarani: 'Guaraní',
};

export function normalizeLanguage(value: string): string {
  const parts = value.split(/[\/,;+&]|\sy\s/i).map(p => p.trim()).filter(Boolean);
  const mapped = parts.map(p => LANG_MAP[stripAccents(p).toLowerCase()] || p.charAt(0).toUpperCase() + p.slice(1));
  return Array.from(new Set(mapped)).join('/') || 'Castellano';
}

const STOPWORDS: Record<string, string[]> = {
  Castellano: ['el', 'los', 'las', 'señor', 'dios', 'eres', 'tu', 'mi', 'y', 'en', 'con', 'para', 'por', 'tus', 'mis', 'que', 'una', 'del', 'te', 'se', 'su', 'es'],
  'Inglés': ['the', 'and', 'you', 'of', 'to', 'my', 'is', 'your', 'with', 'lord', 'god', 'we', 'our', 'in', 'for', 'are', 'all', 'me', 'be'],
  'Portugués': ['você', 'não', 'senhor', 'deus', 'meu', 'minha', 'ao', 'com', 'uma', 'é', 'está', 'seu', 'sua', 'nós', 'em', 'os', 'as', 'tu'],
  'Francés': ['le', 'les', 'des', 'est', 'vous', 'je', 'nous', 'seigneur', 'dieu', 'pas', 'dans', 'avec', 'mon', 'ton', 'sur'],
  Italiano: ['il', 'gli', 'che', 'signore', 'dio', 'sei', 'tuo', 'mio', 'non', 'è', 'ma', 'con', 'per', 'nel'],
  Quechua: ['diosniy', 'taytay', 'munakuyki', 'kawsay', 'kausay', 'ñuqa', 'sunqu', 'sonqoy', 'qamqa', 'diosninchis', 'jesucristo', 'kuyakuyki'],
  Aymara: ['jesusaru', 'tatitu', 'jach', 'jaya', 'nayra', 'uraqi', 'kullaka', 'markasa', 'jumaru', 'tatay'],
};

/** Adivina el idioma de la letra contando palabras muy típicas de cada idioma (null si no está claro). */
export function detectLanguage(lyrics: string): string | null {
  const words = lyrics.toLowerCase().split(/[^\p{L}'’]+/u).filter(Boolean).map(w => w.replace(/['’]/g, ''));
  if (words.length < 6) return null;
  const sets = Object.entries(STOPWORDS).map(([lang, list]) => [lang, new Set(list.map(w => w.replace(/['’]/g, '')))] as [string, Set<string>]);
  const scores = sets.map(([lang, set]) => ({ lang, score: words.reduce((n, w) => n + (set.has(w) ? 1 : 0), 0) }));
  scores.sort((a, b) => b.score - a.score);
  const [best, second] = scores;
  const native = best.lang === 'Quechua' || best.lang === 'Aymara';
  if (native && best.score >= 2) return best.lang;
  if (best.score < 3) return null;
  if (second && second.score > 0 && best.score < second.score * 1.3) return null;
  return best.lang;
}

const leading = (s: string) => (s.match(/^ */) as RegExpMatchArray)[0].length;
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const HYMNAL_WORDS: Record<string, string> = { himnario: 'Himnario', hymnal: 'Hymnal' };

interface Meta {
  title?: string;
  artist?: string;
  key?: string | null;
  bpm?: number;
  time?: string;
  capo?: number;
  language?: string;
  categories?: string[];
  hymnalDetail?: string;
  hymnalNumber?: string;
  orderTokens?: string[];
  interval?: number;
}

function applyMeta(meta: Meta, kv: KeyValue): void {
  const v = kv.value;
  if (v === '') return;
  switch (kv.field) {
    case 'title': if (!meta.title) meta.title = v.replace(/^["'“«]+|["'”»]+$/g, ''); break;
    case 'artist': if (!meta.artist) meta.artist = v; break;
    case 'key': meta.key = normalizeKey(v); break;
    case 'bpm': meta.bpm = Number(/^\d{2,3}/.exec(v)?.[0]); break;
    case 'time': meta.time = (/(\d{1,2})\s*\/\s*(\d{1,2})/.exec(v) || []).slice(1, 3).join('/'); break;
    case 'capo': meta.capo = Number(/\d{1,2}/.exec(v)?.[0]); break;
    case 'language': meta.language = normalizeLanguage(v); break;
    case 'categories': meta.categories = Array.from(new Set(v.split(/[,;|]/).map(c => capitalize(c.trim())).filter(Boolean))); break;
    case 'hymnalDetail': {
      const word = HYMNAL_WORDS[kv.alias];
      meta.hymnalDetail = word && !normAlias(v).startsWith(kv.alias) ? `${word} ${v}` : v;
      break;
    }
    case 'hymnalNumber': { const n = parseHymnalNumber(v); if (n) meta.hymnalNumber = n; break; }
    case 'order': meta.orderTokens = parseOrderTokens(v); break;
    case 'interval': meta.interval = Number(/\d{1,2}/.exec(v)?.[0]); break;
  }
}

export function parseSongFromText(text: string, hymnalId: string, sourceLabel = 'archivo'): Partial<Song> {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\t/g, '    ')
    .split('\n')
    .map(l => l.replace(/\s+$/, ''));

  if (lines.every(l => l.trim() === '')) {
    throw new Error('El archivo está vacío o no se pudo extraer texto');
  }

  // --- encabezado: datos con etiqueta (Título:, Artista:, Himnario:, Orden:…) ---
  const meta: Meta = {};
  const consumed = new Set<number>();
  let plainSeen = 0;
  for (let i = 0; i < lines.length && i < 90; i++) {
    const l = lines[i];
    if (l.trim() === '') continue;
    const kv = parseKeyValue(l);
    if (kv) { applyMeta(meta, kv); consumed.add(i); continue; }
    const mc = META_CAPO.exec(l);
    if (mc) { meta.capo = Number(mc[1]); consumed.add(i); continue; }
    if (parseLanguageMarker(l)) break;
    const kind = classifyLine(l);
    if (kind === 'section' || kind === 'chord') break;
    plainSeen++;
    if (plainSeen > 3) break;
  }

  let title = meta.title || '';
  let artist = meta.artist || '';
  const isBodyLine = (l: string) => l.trim() === '' || parseSectionLine(l) !== null || analyzeChordLine(l).isChord || l.trim().startsWith('//') || isDotChordLine(l);

  // --- sin título con etiqueta: la primera línea de texto es el título ---
  let idx = 0;
  while (idx < lines.length && (lines[idx].trim() === '' || consumed.has(idx))) idx++;
  if (!title && idx < lines.length && !isBodyLine(lines[idx]) && !SECTION_INLINE.test(lines[idx])) {
    title = lines[idx].trim().replace(/^#+\s*/, '').replace(/^(?:n[oº°.]*\s*)?\d{1,4}\s*[.)\-–:]\s+(?=\S)/i, '').replace(/^["']|["']$/g, '');
    consumed.add(idx);
    const dash = /^(.{2,60}?)\s+[-–—]\s+(.{2,45})$/.exec(title);
    if (dash && !artist && dash[2].split(/\s+/).length <= 5) {
      title = dash[1].trim();
      artist = dash[2].trim();
    }
    if (!artist) {
      let k = idx + 1;
      while (k < lines.length && consumed.has(k)) k++;
      if (k < lines.length && lines[k].trim() !== '') {
        const cand = lines[k].trim();
        let nk = k + 1;
        while (nk < lines.length && consumed.has(nk)) nk++;
        const next = lines[nk];
        const nextIsBody = next === undefined || isBodyLine(next);
        const okShape = cand.length >= 3 && cand.length <= 45 && cand.split(/\s+/).length <= 6 && !/[.,;:!?¡¿]$/.test(cand);
        if (!isBodyLine(lines[k]) && !SECTION_INLINE.test(lines[k]) && okShape && nextIsBody) {
          artist = cand;
          consumed.add(k);
        }
      }
    }
  }

  // --- cuerpo (uno o varios idiomas separados por "==== Aymara ====") ---
  const pushChordLine = (body: string[], i: number, converted: string) => {
    let content = converted;
    const j = i + 1;
    if (j < lines.length && lines[j].trim() !== '' && classifyLine(lines[j]) === 'text') {
      const cut = Math.min(leading(lines[j]), leading(content));
      content = content.slice(cut);
    }
    body.push('//' + content);
  };

  const buildBody = (start: number, end: number): { lyrics: string; firstChord?: string } => {
    const body: string[] = [];
    const pushBlank = () => { if (body.length > 0 && body[body.length - 1] !== '') body.push(''); };
    let firstChord: string | undefined;

    for (let i = start; i < end; i++) {
      if (consumed.has(i)) continue;
      const raw = lines[i];
      const trimmed = raw.trim();

      if (trimmed === '') { pushBlank(); continue; }

      const verseNum = /^(\d{1,2})[.)]?$/.exec(trimmed);
      if (verseNum && Number(verseNum[1]) <= 20) {
        pushBlank();
        body.push(`VERSO ${verseNum[1]}`);
        continue;
      }

      const sec = parseSectionLine(trimmed);
      if (sec) { pushBlank(); body.push(sec); continue; }

      const inline = SECTION_INLINE.exec(trimmed);
      if (inline) {
        pushBlank();
        body.push(`${normalizeSectionName(inline[1])}${inline[2] ? ' ' + inline[2] : ''}`);
        body.push(inline[3].trim());
        continue;
      }

      // acordes ya en el formato de la app (//Am  G)
      if (trimmed.startsWith('//')) {
        const content = raw.slice(raw.indexOf('//') + 2);
        const info = analyzeChordLine(content);
        if (!firstChord) firstChord = info.firstChord;
        body.push('//' + (info.isChord ? info.converted : content));
        continue;
      }

      // acordes marcados con un punto al inicio (formato OpenSong): ".G   D"
      if (isDotChordLine(raw)) {
        const content = raw.slice(raw.indexOf('.') + 1);
        const info = analyzeChordLine(content);
        if (!firstChord) firstChord = info.firstChord;
        pushChordLine(body, i, info.converted);
        continue;
      }

      const info = analyzeChordLine(raw);
      if (info.isChord) {
        if (!firstChord) firstChord = info.firstChord;
        pushChordLine(body, i, info.converted);
        continue;
      }

      body.push(trimmed);
    }

    while (body.length > 0 && body[0] === '') body.shift();
    while (body.length > 0 && body[body.length - 1] === '') body.pop();
    if (body.filter(l => l !== '').length > 320) {
      throw new Error('Parece que hay muchas canciones juntas en un solo bloque. Sepáralas con una línea de ===== o usa archivos más pequeños.');
    }
    return { lyrics: body.join('\n'), firstChord };
  };

  // Bloques por idioma: lo que va antes del primer marcador es el idioma principal
  const headerLangs = meta.language ? meta.language.split('/') : [];
  const blocks: Array<{ lang: string | null; start: number; end: number }> = [];
  {
    let cur = { lang: null as string | null, start: 0 };
    for (let i = 0; i < lines.length; i++) {
      const marker = consumed.has(i) ? null : parseLanguageMarker(lines[i]);
      if (!marker) continue;
      blocks.push({ ...cur, end: i });
      cur = { lang: marker, start: i + 1 };
    }
    blocks.push({ ...cur, end: lines.length });
  }
  const built = blocks
    .map(bl => ({ lang: bl.lang, ...buildBody(bl.start, bl.end) }))
    .filter(bl => bl.lyrics.replace(/\s/g, '').length > 0);

  const primary = built[0];
  const lyrics = primary ? primary.lyrics : '';
  const firstChord = built.map(bl => bl.firstChord).find(Boolean);

  if (lyrics.replace(/\s/g, '').length < 10) {
    throw new Error('No se pudo extraer suficiente texto. Asegúrate de que el archivo o la imagen sea claro y contenga la canción completa.');
  }

  const key = meta.key || (firstChord ? normalizeKey(firstChord) : null) || 'C';
  const plainOf = (text: string) => text.split('\n').filter(l => !l.startsWith('//')).join('\n');
  let language = meta.language || detectLanguage(plainOf(lyrics)) || 'Castellano';
  let lyricsByLanguage: Record<string, string> | undefined;
  if (built.length > 1) {
    // nombre del idioma de cada bloque: el marcador, o el que dice el encabezado, o el detectado
    const names: string[] = [];
    built.forEach((bl, idx) => {
      let name = bl.lang || (idx === 0 ? (headerLangs[0] || detectLanguage(plainOf(bl.lyrics)) || 'Castellano') : '');
      if (!name) name = headerLangs.find(h => !names.includes(h)) || `Idioma ${idx + 1}`;
      if (names.includes(name)) name = `${name} ${idx + 1}`;
      names.push(name);
    });
    lyricsByLanguage = {};
    built.forEach((bl, idx) => { lyricsByLanguage![names[idx]] = bl.lyrics; });
    language = names.join('/');
  } else if (built[0].lang && !meta.language) {
    language = built[0].lang;
  }

  const result: Partial<Song> = {
    title: title || 'Sin título',
    artist: artist || 'Desconocido',
    key,
    timeSignature: meta.time || '4/4',
    bpm: meta.bpm && meta.bpm >= 30 && meta.bpm <= 300 ? meta.bpm : 120,
    language,
    categories: meta.categories || [],
    sections: [],
    lyrics,
    ...(lyricsByLanguage ? { lyricsByLanguage } : {}),
    notes: `Importado desde ${sourceLabel}${meta.capo ? ` · Capo en traste ${meta.capo}` : ''}`,
    hymnalId,
  };
  if (meta.hymnalDetail) result.hymnalDetail = meta.hymnalDetail;
  if (meta.hymnalNumber) result.hymnalNumber = meta.hymnalNumber;

  // orden de presentación escrito en el archivo
  if (meta.orderTokens && meta.orderTokens.length > 0) {
    const ids = resolveOrderTokens(meta.orderTokens, parseSections(lyrics));
    if (ids.length > 0) {
      result.presentationOrder = { sections: ids, intervalSeconds: meta.interval ? clampInterval(meta.interval) : DEFAULT_INTERVAL_SECONDS };
    }
  }
  return result;
}

export interface ParseReport {
  songs: Partial<Song>[];
  /** Bloques que no se pudieron leer como canción */
  failed: number;
  /** Índices o tablas de contenido descartados */
  skippedIndexes: number;
  lastError?: string;
}

/**
 * Analiza un texto con una o varias canciones. Para documentos grandes cede el control al navegador
 * cada cierto tiempo (la pantalla no se congela) e informa el avance.
 */
export async function parseSongsAsync(
  text: string,
  hymnalId: string,
  sourceLabel = 'archivo',
  onProgress?: (done: number, total: number) => void,
  isCancelled?: () => boolean
): Promise<ParseReport> {
  await new Promise(r => setTimeout(r, 0));
  const { chunks, skippedIndexes } = splitSongsSmart(text);
  const songs: Partial<Song>[] = [];
  let failed = 0;
  let lastError: string | undefined;

  for (let i = 0; i < chunks.length; i++) {
    if (isCancelled?.()) break;
    try {
      songs.push(parseSongFromText(chunks[i], hymnalId, sourceLabel));
    } catch (e) {
      failed++;
      lastError = e instanceof Error ? e.message : 'Error al leer una canción';
    }
    if (i % 15 === 14) {
      onProgress?.(i + 1, chunks.length);
      await new Promise(r => setTimeout(r, 0));
    }
  }
  onProgress?.(chunks.length, chunks.length);
  return { songs, failed, skippedIndexes, lastError };
}

/** Versión simple (sin progreso). Lanza error si no se encuentra ninguna canción. */
export function parseMultipleSongsFromText(text: string, hymnalId: string, sourceLabel = 'archivo'): Partial<Song>[] {
  const { chunks } = splitSongsSmart(text);
  if (chunks.length === 0) throw new Error('No se encontraron canciones en el archivo');
  const songs: Partial<Song>[] = [];
  let lastError: Error | null = null;
  for (const chunk of chunks) {
    try {
      songs.push(parseSongFromText(chunk, hymnalId, sourceLabel));
    } catch (e) {
      lastError = e instanceof Error ? e : new Error('Error al leer una canción');
    }
  }
  if (songs.length === 0) throw lastError || new Error('No se pudo leer ninguna canción');
  return songs;
}
