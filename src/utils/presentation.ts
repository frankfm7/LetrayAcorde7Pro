/** Lógica del modo presentación: secciones de una canción y orden por defecto. */

export interface SectionInfo {
  /** Identificador único dentro de la canción (si un título se repite, se le agrega -2, -3…) */
  id: string;
  /** Texto corto del botón: V1, C, V2, PC, P… */
  label: string;
  /** Tipo en mayúsculas: VERSO, CORO, PUENTE… */
  type: string;
  /** Título tal como está escrito en la letra */
  name: string;
}

export const SECTION_REGEX = /^(VERSO|CORO|PUENTE|INTRO|FINAL|PRE-CORO|PRE CORO|OUTRO|BRIDGE)\s*(\d*)/i;

export const SECTION_COLORS: Record<string, string> = {
  VERSO: '#7c3aed', CORO: '#f59e0b', PUENTE: '#059669', INTRO: '#6366f1', FINAL: '#ef4444',
  'PRE-CORO': '#ec4899', 'PRE CORO': '#ec4899', OUTRO: '#0891b2', BRIDGE: '#059669',
};

const LETTER: Record<string, string> = {
  VERSO: 'V', CORO: 'C', PUENTE: 'P', INTRO: 'I', FINAL: 'F', 'PRE-CORO': 'PC', 'PRE CORO': 'PC', OUTRO: 'O', BRIDGE: 'B',
};

/** Lee los títulos de sección de una letra (VERSO 1, CORO, PUENTE…). No copia ni duplica ninguna sección. */
export function parseSections(lyrics: string): SectionInfo[] {
  const seen = new Map<string, number>();
  const out: SectionInfo[] = [];
  for (const line of lyrics.split('\n')) {
    const trimmed = line.trim();
    const m = trimmed.match(SECTION_REGEX);
    if (!m || trimmed.includes('//')) continue;
    const type = m[1].toUpperCase();
    const num = m[2] || '';
    const base = `${type}${num}`.toLowerCase();
    const occurrence = (seen.get(base) || 0) + 1;
    seen.set(base, occurrence);
    out.push({
      id: occurrence === 1 ? base : `${base}-${occurrence}`,
      label: `${LETTER[type] || type.charAt(0)}${num}${occurrence > 1 ? `·${occurrence}` : ''}`,
      type,
      name: trimmed,
    });
  }
  return out;
}

const isPre = (s: SectionInfo) => s.type === 'PRE-CORO' || s.type === 'PRE CORO';

/** Secuencia por defecto: V1, C, V2, C, V3, C… (con intro, pre-coros, puentes y final si existen). */
export function defaultSequence(sections: SectionInfo[]): string[] {
  const verses = sections.filter(s => s.type === 'VERSO');
  const choruses = sections.filter(s => s.type === 'CORO');
  if (verses.length === 0 || choruses.length === 0) return sections.map(s => s.id);

  const pres = sections.filter(isPre);
  const firstVerse = sections.indexOf(verses[0]);
  const seq: string[] = [];

  sections.slice(0, firstVerse).forEach(s => {
    if (s.type !== 'CORO' && !isPre(s)) seq.push(s.id);
  });
  verses.forEach((v, i) => {
    seq.push(v.id);
    if (pres.length > 0) seq.push(pres[Math.min(i, pres.length - 1)].id);
    seq.push(choruses[Math.min(i, choruses.length - 1)].id);
  });
  const lastChorus = choruses[choruses.length - 1];
  sections.forEach((s, idx) => {
    if (idx <= firstVerse || s.type === 'VERSO' || s.type === 'CORO' || isPre(s)) return;
    seq.push(s.id);
    if (s.type === 'PUENTE' || s.type === 'BRIDGE') seq.push(lastChorus.id);
  });
  return seq;
}

/** Quita de una secuencia guardada las secciones que ya no existen en la letra. */
export function sanitizeSequence(sequence: string[], sections: SectionInfo[]): string[] {
  const valid = new Set(sections.map(s => s.id));
  return sequence.filter(id => valid.has(id));
}

export const DEFAULT_INTERVAL_SECONDS = 8;
export const MIN_INTERVAL_SECONDS = 1;
export const MAX_INTERVAL_SECONDS = 50;

export function clampInterval(n: number | undefined): number {
  if (typeof n !== 'number' || isNaN(n)) return DEFAULT_INTERVAL_SECONDS;
  return Math.max(MIN_INTERVAL_SECONDS, Math.min(MAX_INTERVAL_SECONDS, Math.round(n)));
}

/** "N° 075" → "N° 75" (sin ceros a la izquierda). */
export function normalizeHymnalNumber(value: string): string {
  return value.trim().replace(/(^|\D)0+(\d)/g, '$1$2');
}

/** Línea corta que se muestra junto al artista: "Himno Cala N° 75". */
export function hymnalLabel(detail?: string, number?: string): string {
  return [detail, number].map(v => (v || '').trim()).filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ */
/*  Orden escrito en texto (V1 C V2 C, "Verso 1, Coro"...)             */
/* ------------------------------------------------------------------ */

const WORD_TYPES: Record<string, string> = {
  VERSO: 'VERSO', VERSE: 'VERSO', ESTROFA: 'VERSO',
  CORO: 'CORO', CHORUS: 'CORO', ESTRIBILLO: 'CORO', REFRAN: 'CORO',
  PUENTE: 'PUENTE', BRIDGE: 'PUENTE',
  'PRE-CORO': 'PRE-CORO', 'PRE CORO': 'PRE-CORO', PRECORO: 'PRE-CORO', 'PRE-CHORUS': 'PRE-CORO', PRECHORUS: 'PRE-CORO',
  INTRO: 'INTRO', INTRODUCCION: 'INTRO', FINAL: 'FINAL', ENDING: 'FINAL', OUTRO: 'OUTRO', CODA: 'FINAL', TAG: 'FINAL',
};
const SHORT_TYPES: Record<string, string> = { V: 'VERSO', S: 'VERSO', C: 'CORO', B: 'PUENTE', P: 'PRE-CORO', PC: 'PRE-CORO', I: 'INTRO', E: 'FINAL', T: 'FINAL', F: 'FINAL', O: 'OUTRO' };

const ORDER_TOKEN = /(?:\b(VERSO|VERSE|ESTROFA|CORO|CHORUS|ESTRIBILLO|REFR[ÁA]N|PUENTE|BRIDGE|PRE[- ]?CORO|PRE[- ]?CHORUS|INTRO(?:DUCCI[ÓO]N)?|FINAL|ENDING|OUTRO|CODA|TAG)\b\s*(\d{1,2})?)|(?:\b(PC|[VSCBPIETFO])\s*(\d{1,2})?(?![\p{L}\d]))|(?:(?<![\p{L}\d])(\d{1,2})(?![\p{L}\d]))/giu;

/** "V1 C V2 C", "Verso 1, Coro, Verso 2" → ["VERSO 1", "CORO", "VERSO 2", "CORO"]. */
export function parseOrderTokens(text: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(ORDER_TOKEN.source, ORDER_TOKEN.flags);
  while ((m = re.exec(text)) !== null) {
    let type: string | undefined;
    let num = '';
    if (m[1]) {
      type = WORD_TYPES[m[1].toUpperCase().replace(/Á/g, 'A').replace(/Ó/g, 'O').replace(/\s+/g, ' ')] || WORD_TYPES[m[1].toUpperCase().replace(/[\s-]/g, '')];
      num = m[2] || '';
    } else if (m[3]) {
      type = SHORT_TYPES[m[3].toUpperCase()];
      num = m[4] || '';
    } else if (m[5]) {
      type = 'VERSO';
      num = m[5];
    }
    if (type) out.push(num ? `${type} ${num}` : type);
  }
  return out;
}

/** Convierte las etiquetas del orden en ids de las secciones que existen en la letra (sin copiar nada). */
export function resolveOrderTokens(tokens: string[], sections: SectionInfo[]): string[] {
  const out: string[] = [];
  for (const tok of tokens) {
    const m = /^(.+?)\s*(\d{1,2})?$/.exec(tok.trim());
    if (!m) continue;
    const type = m[1].toUpperCase();
    const num = m[2] || '';
    const exact = sections.find(s => s.id === `${type}${num}`.toLowerCase());
    if (exact) { out.push(exact.id); continue; }
    if (!num) {
      const first = sections.find(s => s.type === type || (type === 'PRE-CORO' && isPre(s)) || (type === 'PUENTE' && s.type === 'BRIDGE'));
      if (first) { out.push(first.id); continue; }
    }
    // "CORO 2" cuando la canción solo tiene "CORO": se usa el primero de ese tipo
    const sameType = sections.find(s => s.type === type);
    if (sameType && type === 'CORO') out.push(sameType.id);
  }
  return out;
}

/** Texto para guardar el orden en un archivo: "V1, C, V2, C". */
export function orderToLabels(ids: string[], sections: SectionInfo[]): string {
  const byId = new Map(sections.map(s => [s.id, s] as [string, SectionInfo]));
  return ids.map(id => byId.get(id)?.label.replace(/·\d+$/, '') || '').filter(Boolean).join(', ');
}
