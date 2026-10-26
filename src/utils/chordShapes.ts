import { noteIndex } from './chords';

/** Digitación de un acorde de guitarra. Cuerdas de grave (6ª) a aguda (1ª). */
export interface ChordShape {
  /** Fila pisada por cuerda: -1 = no se toca, 0 = al aire, 1… = fila (1 = la primera mostrada) */
  rows: number[];
  /** Número del traste de la fila 1 (1 = la cejuela no se indica) */
  base: number;
  /** Cejilla: de la cuerda `from` a `to` (índices 0–5) en la fila 1 */
  barre?: { from: number; to: number };
  label: string;
}

export interface ChordShapes {
  name: string;
  shapes: ChordShape[];
  /** Algo se simplificó (acorde con extensión rara o bajo distinto) */
  approx: boolean;
}

// Acordes abiertos (trastes absolutos; x = -1)
const OPEN: Record<string, number[]> = {
  C: [-1, 3, 2, 0, 1, 0], D: [-1, -1, 0, 2, 3, 2], E: [0, 2, 2, 1, 0, 0], G: [3, 2, 0, 0, 0, 3], A: [-1, 0, 2, 2, 2, 0],
  Am: [-1, 0, 2, 2, 1, 0], Dm: [-1, -1, 0, 2, 3, 1], Em: [0, 2, 2, 0, 0, 0],
  C7: [-1, 3, 2, 3, 1, 0], D7: [-1, -1, 0, 2, 1, 2], E7: [0, 2, 0, 1, 0, 0], G7: [3, 2, 0, 0, 0, 1], A7: [-1, 0, 2, 0, 2, 0], B7: [-1, 2, 1, 2, 0, 2],
  Am7: [-1, 0, 2, 0, 1, 0], Dm7: [-1, -1, 0, 2, 1, 1], Em7: [0, 2, 0, 0, 0, 0],
  Cmaj7: [-1, 3, 2, 0, 0, 0], Fmaj7: [-1, -1, 3, 2, 1, 0], Gmaj7: [3, 2, 0, 0, 0, 2], Amaj7: [-1, 0, 2, 1, 2, 0], Dmaj7: [-1, -1, 0, 2, 2, 2], Emaj7: [0, 2, 1, 1, 0, 0],
  Dsus4: [-1, -1, 0, 2, 3, 3], Asus4: [-1, 0, 2, 2, 3, 0], Esus4: [0, 2, 2, 2, 0, 0], Dsus2: [-1, -1, 0, 2, 3, 0], Asus2: [-1, 0, 2, 2, 0, 0],
  Cadd9: [-1, 3, 2, 0, 3, 0], Gadd9: [3, 0, 0, 2, 0, 3], Dadd9: [-1, -1, 0, 2, 3, 0], Aadd9: [-1, 0, 2, 4, 2, 0],
  'D/F#': [2, 0, 0, 2, 3, 2], 'G/B': [-1, 2, 0, 0, 3, 3], 'C/E': [0, 3, 2, 0, 1, 0], 'C/G': [3, 3, 2, 0, 1, 0], 'A/C#': [-1, 4, 2, 2, 2, 0], 'G/F#': [2, 2, 0, 0, 0, 3], 'Am/G': [3, 0, 2, 2, 1, 0], 'Em/B': [-1, 2, 2, 0, 0, 0], 'E/G#': [4, 2, 2, 1, 0, 0],
};

// Plantillas móviles: posición relativa a la cejilla (0 = cejilla). Raíz en la 6ª cuerda (forma de E) o en la 5ª (forma de A).
const E_SHAPES: Record<string, number[]> = {
  M: [0, 2, 2, 1, 0, 0], m: [0, 2, 2, 0, 0, 0], '7': [0, 2, 0, 1, 0, 0], m7: [0, 2, 0, 0, 0, 0], maj7: [0, 2, 1, 1, 0, 0],
  sus4: [0, 2, 2, 2, 0, 0], aug: [0, 3, 2, 1, 1, 0], '6': [0, 2, 2, 1, 2, 0], m6: [0, 2, 2, 0, 2, 0], '5': [0, 2, 2, -1, -1, -1],
  '7sus4': [0, 2, 0, 2, 0, 0], maj9: [0, 2, 1, 1, 0, 2], m9: [0, 2, 0, 0, 0, 2],
};
const A_SHAPES: Record<string, number[]> = {
  M: [-1, 0, 2, 2, 2, 0], m: [-1, 0, 2, 2, 1, 0], '7': [-1, 0, 2, 0, 2, 0], m7: [-1, 0, 2, 0, 1, 0], maj7: [-1, 0, 2, 1, 2, 0],
  sus4: [-1, 0, 2, 2, 3, 0], sus2: [-1, 0, 2, 2, 0, 0], dim: [-1, 0, 1, 2, 1, -1], aug: [-1, 0, 3, 2, 2, -1], '6': [-1, 0, 2, 2, 2, 2], m6: [-1, 0, 2, 2, 1, 2],
  '5': [-1, 0, 2, 2, -1, -1], add9: [-1, 0, 2, 4, 2, 0], '9': [-1, 0, 2, 1, 2, 2],
  '7sus4': [-1, 0, 2, 0, 3, 0], dim7: [-1, 0, 1, 2, 1, 2], m7b5: [-1, 0, 1, 0, 1, -1],
};

function classify(suffix: string): { q: string; exact: boolean } {
  const s = suffix.replace(/°/g, 'dim').replace(/\+/g, 'aug').replace(/^min/, 'm').replace(/^M(?!aj)/, 'maj');
  if (s === '' || s === 'maj') return { q: 'M', exact: true };
  if (s === 'm' || s === '-') return { q: 'm', exact: true };
  if (['7', 'm7', 'maj7', 'sus4', 'sus2', 'dim', 'aug', '6', 'm6', '5', 'add9', '9', '7sus4', 'maj9', 'm9', 'dim7', 'm7b5'].includes(s)) return { q: s, exact: true };
  if (s === 'sus') return { q: 'sus4', exact: true };
  if (s === 'ø' || s === 'm7-5') return { q: 'm7b5', exact: true };
  if (s === 'M9') return { q: 'maj9', exact: true };
  if (/^m(9|11|13)/.test(s)) return { q: 'm7', exact: false };
  if (/^(maj9|maj13|M9)/.test(s)) return { q: 'maj7', exact: false };
  if (/^(7|9|11|13)/.test(s)) return { q: '7', exact: false };
  if (/^m/.test(s)) return { q: 'm', exact: false };
  if (/^(sus|add)/.test(s)) return { q: s.startsWith('sus2') ? 'sus2' : s.startsWith('sus') ? 'sus4' : 'add9', exact: false };
  return { q: 'M', exact: false };
}

function fromTemplate(t: number[], fret: number, label: string): ChordShape | null {
  const pressed = t.map(v => (v < 0 ? -1 : v + 1));
  const zeros = t.map((v, i) => (v === 0 ? i : -1)).filter(i => i >= 0);
  const top = Math.max(...pressed);
  if (fret + top - 1 > 15) return null;
  return { rows: pressed, base: fret, barre: zeros.length >= 2 ? { from: zeros[0], to: zeros[zeros.length - 1] } : undefined, label };
}

function fromOpen(frets: number[], label: string): ChordShape {
  const max = Math.max(...frets);
  if (max <= 4) return { rows: frets, base: 1, label };
  const min = Math.min(...frets.filter(f => f > 0));
  return { rows: frets.map(f => (f > 0 ? f - min + 1 : f)), base: min, label };
}

/** Digitaciones de guitarra para un acorde ("Am", "F#m7", "D/F#"…). null si no es un acorde. */
export function getChordShapes(chord: string): ChordShapes | null {
  const m = /^([A-G][#b]?)([^/\s]*)(?:\/([A-G][#b]?))?$/.exec(chord.trim());
  if (!m) return null;
  const root = noteIndex(m[1]);
  if (root === null) return null;
  const { q, exact } = classify(m[2]);
  let approx = !exact || !!m[3];
  const shapes: ChordShape[] = [];
  const key = m[1] + m[2];
  const pick = (name: string) => OPEN[name];

  // abiertos (se prueban con la ortografía escrita y con el sostenido/bemol equivalente)
  const openKey = [chord.trim(), key].find(k => OPEN[k]);
  if (openKey) shapes.push(fromOpen(pick(openKey), 'Posición abierta'));
  else if (q && !m[3] && OPEN[m[1] + (q === 'M' ? '' : q)]) shapes.push(fromOpen(OPEN[m[1] + (q === 'M' ? '' : q)], 'Posición abierta'));
  else if (m[3] && OPEN[m[1] + (q === 'M' ? '' : q)]) shapes.push(fromOpen(OPEN[m[1] + (q === 'M' ? '' : q)], 'Posición abierta'));

  const eTemplate = E_SHAPES[q];
  if (eTemplate) {
    const f = (root - 4 + 12) % 12 || 12;
    const sh = fromTemplate(eTemplate, f, 'Forma de Mi (cejilla)');
    if (sh && f <= 12) shapes.push(sh);
  }
  const aTemplate = A_SHAPES[q];
  if (aTemplate) {
    const f = (root - 9 + 12) % 12 || 12;
    const sh = fromTemplate(aTemplate, f, 'Forma de La (cejilla)');
    if (sh && f <= 12) shapes.push(sh);
  }
  // sin plantilla propia (p. ej. sus2 en forma de Mi): se deja lo que haya
  const unique = shapes.filter((s, i) => shapes.findIndex(o => o.base === s.base && o.rows.join() === s.rows.join()) === i);
  unique.sort((a, b) => a.base - b.base);
  if (unique.length === 0) return null;
  if (m[3] && !OPEN[chord.trim()]) approx = true;
  return { name: chord.trim(), shapes: unique, approx };
}

/* ------------------------------------------------------------------ */
/*  Ukulele (G C E A) y piano                                          */
/* ------------------------------------------------------------------ */

const UKE_OPEN: Record<string, number[]> = {
  C: [0, 0, 0, 3], Cm: [0, 3, 3, 3], C7: [0, 0, 0, 1], Cmaj7: [0, 0, 0, 2],
  D: [2, 2, 2, 0], Dm: [2, 2, 1, 0], D7: [2, 2, 2, 3], Dm7: [2, 2, 1, 3],
  E: [4, 4, 4, 2], Em: [0, 4, 3, 2], E7: [1, 2, 0, 2],
  F: [2, 0, 1, 0], Fm: [1, 0, 1, 3], F7: [2, 3, 1, 0],
  G: [0, 2, 3, 2], Gm: [0, 2, 3, 1], G7: [0, 2, 1, 2],
  A: [2, 1, 0, 0], Am: [2, 0, 0, 0], A7: [0, 1, 0, 0], Am7: [0, 0, 0, 0],
  B: [4, 3, 2, 2], Bm: [4, 2, 2, 2], B7: [2, 3, 2, 2],
};
// Plantillas móviles (posiciones relativas a d = traste de la raíz en la 3ª cuerda, o f = traste de la raíz en la 2ª)
const UKE_D: Record<string, number[]> = { M: [0, 0, 0, -2], m: [0, 0, -1, -2], '7': [0, -2, 0, -2], m7: [0, 0, -1, 1], maj7: [0, 0, 0, 2] };

function ukeShape(frets: number[], label: string): ChordShape | null {
  const max = Math.max(...frets);
  if (max > 12) return null;
  if (max <= 4) return { rows: frets, base: 1, label };
  const min = Math.min(...frets.filter(f => f > 0));
  return { rows: frets.map(f => (f > 0 ? f - min + 1 : f)), base: min, label };
}

export function getUkuleleShapes(chord: string): ChordShapes | null {
  const m = /^([A-G][#b]?)([^/\s]*)(?:\/[A-G][#b]?)?$/.exec(chord.trim());
  if (!m) return null;
  const root = noteIndex(m[1]);
  if (root === null) return null;
  const { q, exact } = classify(m[2]);
  const shapes: ChordShape[] = [];
  const name = (q === 'M' ? '' : q);
  const openKey = [m[1] + name, m[1] + m[2]].find(k => UKE_OPEN[k]);
  if (openKey) { const s = ukeShape(UKE_OPEN[openKey], 'Posición abierta'); if (s) shapes.push(s); }
  const t = UKE_D[q];
  if (t) {
    const d = root === 0 ? 12 : root;
    if (d >= 2) {
      const s = ukeShape(t.map(v => d + v), 'Posición alta');
      if (s) shapes.push(s);
    }
  }
  let unique = shapes.filter((s, i) => shapes.findIndex(o => o.base === s.base && o.rows.join() === s.rows.join()) === i);
  if (unique.length < 2 && !chord.includes('/')) {
    for (const sh of searchUkulele(root, q)) if (!unique.some(o => o.base === sh.base && o.rows.join() === sh.rows.join())) unique.push(sh);
    unique.sort((a, b) => a.base - b.base);
  }
  if (unique.length === 0) return null;
  return { name: chord.trim(), shapes: unique, approx: !exact || chord.includes('/') };
}

const PIANO_INTERVALS: Record<string, number[]> = {
  M: [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], sus4: [0, 5, 7], sus2: [0, 2, 7],
  dim: [0, 3, 6], aug: [0, 4, 8], '6': [0, 4, 7, 9], m6: [0, 3, 7, 9], '5': [0, 7], add9: [0, 4, 7, 14], '9': [0, 4, 7, 10, 14],
  '7sus4': [0, 5, 7, 10], maj9: [0, 4, 7, 11, 14], m9: [0, 3, 7, 10, 14], dim7: [0, 3, 6, 9], m7b5: [0, 3, 6, 10],
};

/** Notas (0–11, con la raíz primero) y nombre de cada una, para dibujar el acorde en el piano. */
export function getPianoNotes(chord: string): { notes: number[]; bass: number | null; approx: boolean } | null {
  const m = /^([A-G][#b]?)([^/\s]*)(?:\/([A-G][#b]?))?$/.exec(chord.trim());
  if (!m) return null;
  const root = noteIndex(m[1]);
  if (root === null) return null;
  const { q, exact } = classify(m[2]);
  const iv = PIANO_INTERVALS[q] || PIANO_INTERVALS.M;
  return { notes: iv.map(i => (root + i) % 12), bass: m[3] ? noteIndex(m[3]) : null, approx: !exact };
}

/** Charango (G C E A E): como el ukulele, con la 5ª cuerda doble igual a la E de la 3ª. */
export function getCharangoShapes(chord: string): ChordShapes | null {
  const u = getUkuleleShapes(chord);
  if (!u) return null;
  return { ...u, shapes: u.shapes.map(sh => ({ ...sh, rows: [...sh.rows, sh.rows[2]] })) };
}

/** Intervalos (semitonos desde la raíz) de cada tipo de acorde. */
export function chordIntervals(quality: string): number[] {
  return PIANO_INTERVALS[quality] || PIANO_INTERVALS.M;
}

// Afinaciones en notas MIDI (de la cuerda más grave a la más aguda)
export const TUNINGS = {
  guitar: [40, 45, 50, 55, 59, 64],
  ukulele: [67, 60, 64, 69],
  charango: [67, 72, 76, 69, 76],
} as const;

/** Busca digitaciones de ukulele para cualquier tipo de acorde probando todas las posiciones (cuando no hay una forma conocida). */
function searchUkulele(root: number, quality: string, max = 3): ChordShape[] {
  const pcs = new Set(chordIntervals(quality).map(i => (root + i) % 12));
  const open = TUNINGS.ukulele;
  const found: { frets: number[]; score: number }[] = [];
  const frets = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  for (const a of frets) for (const b of frets) for (const c of frets) for (const d of frets) {
    const f = [a, b, c, d];
    const played = f.map((fr, i) => (fr < 0 ? null : (open[i] + fr) % 12));
    if (played.filter(n => n !== null).length < 3) continue;
    const got = new Set(played.filter((n): n is number => n !== null));
    if (![...pcs].every(p => got.has(p))) continue;
    if ([...got].some(n => !pcs.has(n))) continue;
    const pressed = f.filter(fr => fr > 0);
    const span = pressed.length ? Math.max(...pressed) - Math.min(...pressed) : 0;
    if (span > 3 || f.includes(-1)) continue;
    const maxFret = Math.max(...f);
    found.push({ frets: f, score: maxFret * 3 + span + pressed.length });
  }
  found.sort((x, y) => x.score - y.score);
  return found.slice(0, max).map((x, i) => ukeShape(x.frets, i === 0 ? 'Posición recomendada' : 'Otra posición')).filter((s): s is ChordShape => !!s);
}

export function getUkuleleShapesFor(root: number, quality: string, name: string): ChordShapes | null {
  const base = getUkuleleShapes(name);
  const shapes = [...(base?.shapes || [])];
  if (shapes.length < 2) {
    for (const sh of searchUkulele(root, quality)) {
      if (!shapes.some(o => o.base === sh.base && o.rows.join() === sh.rows.join())) shapes.push(sh);
    }
  }
  shapes.sort((a, b) => a.base - b.base);
  return shapes.length ? { name, shapes, approx: false } : null;
}
