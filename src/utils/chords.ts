const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const NATURAL_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Todas las tonalidades que se pueden elegir (con sostenidos y bemoles, mayores y menores). */
export const KEY_OPTIONS_MAJOR = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export const KEY_OPTIONS_MINOR = ['Cm', 'C#m', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'];

/** Posición (0–11) de una nota: "C"→0, "Eb"→3, "D#"→3. null si no es una nota. */
export function noteIndex(note: string): number | null {
  const m = /^([A-G])([#b♯♭])?$/.exec(note.trim());
  if (!m) return null;
  const acc = m[2] === '#' || m[2] === '♯' ? 1 : m[2] === 'b' || m[2] === '♭' ? -1 : 0;
  return (((NATURAL_INDEX[m[1]] + acc) % 12) + 12) % 12;
}

export interface ParsedKey { root: number; minor: boolean; flat: boolean }

/** Lee una tonalidad ("Eb", "F#m", "Am") y dice si se escribe con bemoles. */
export function parseKey(key: string): ParsedKey | null {
  const m = /^([A-G][#b♯♭]?)(m|min|-)?$/.exec((key || '').trim());
  if (!m) return null;
  const root = noteIndex(m[1]);
  if (root === null) return null;
  return { root, minor: !!m[2], flat: m[1].includes('b') || m[1].includes('♭') };
}

/** Tonalidades que por costumbre se escriben con bemoles (F, Bb, Eb, Ab, Db y sus menores). */
const FLAT_MAJOR = new Set([5, 10, 3, 8, 1]);
const FLAT_MINOR = new Set([2, 7, 0, 5, 10, 3]);
export function prefersFlats(key: ParsedKey): boolean {
  return key.flat || (key.minor ? FLAT_MINOR.has(key.root) : FLAT_MAJOR.has(key.root));
}

/** Escribe una nota con la ortografía pedida. */
export function noteName(index: number, flats: boolean): string {
  const i = ((index % 12) + 12) % 12;
  return (flats ? NOTES_FLAT : NOTES_SHARP)[i];
}

/** Tonalidad escrita con la ortografía de la tonalidad dada. */
export function keyName(root: number, minor: boolean, flats: boolean): string {
  return noteName(root, flats) + (minor ? 'm' : '');
}

/** Tonalidad resultante de subir/bajar semitonos, respetando mayor/menor y bemoles/sostenidos. */
export function transposeKey(key: string, semitones: number): string {
  const p = parseKey(key);
  if (!p) return key;
  const root = (((p.root + semitones) % 12) + 12) % 12;
  const target = { root, minor: p.minor, flat: p.flat };
  return keyName(root, p.minor, prefersFlats(target));
}

/** Distancia en semitonos (-5…+6) para ir de una tonalidad a otra. */
export function semitonesBetween(from: string, to: string): number | null {
  const a = parseKey(from), b = parseKey(to);
  if (!a || !b) return null;
  let d = (b.root - a.root + 12) % 12;
  if (d > 6) d -= 12;
  return d;
}

const CHORD_RE = /^([A-G][#b]?)(.*)$/;

export function transposeChord(chord: string, semitones: number, flats?: boolean): string {
  if (semitones === 0) return chord;
  const [main, bass] = chord.split('/');
  const m = CHORD_RE.exec(main);
  if (!m) return chord;
  const idx = noteIndex(m[1]);
  if (idx === null) return chord;
  const useFlats = flats ?? m[1].includes('b');
  let out = noteName(idx + semitones, useFlats) + m[2];
  if (bass !== undefined) {
    const bi = noteIndex(bass);
    out += '/' + (bi === null ? bass : noteName(bi + semitones, useFlats));
  }
  return out;
}

const CHORD_TOKEN = /[A-G][#b]?[^\s/]*(?:\/[A-G][#b]?)?/g;

function mapChordLines(lyrics: string, fn: (chord: string) => string): string {
  return lyrics.split('\n').map(line => {
    if (!line.trim().startsWith('//')) return line;
    const at = line.indexOf('//');
    const body = line.slice(at + 2);
    // Se conservan las columnas: cada acorde se reescribe con el mismo largo cuando es posible
    let out = '';
    let last = 0;
    let carry = 0; // espacios que sobran (+) o faltan (−) por el cambio de largo
    CHORD_TOKEN.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CHORD_TOKEN.exec(body)) !== null) {
      let gap = body.slice(last, m.index);
      const next = fn(m[0]);
      // ajusta el espacio previo para que el siguiente acorde quede en su columna
      if (carry !== 0 && gap.length > 0) {
        const adj = Math.max(1, gap.length + carry);
        carry += gap.length - adj;
        gap = ' '.repeat(adj);
      }
      carry += m[0].length - next.length;
      out += gap + next;
      last = m.index + m[0].length;
    }
    out += body.slice(last);
    return line.slice(0, at) + '//' + out.replace(/\s+$/, '');
  }).join('\n');
}

export function transposeLyrics(lyrics: string, semitones: number, flats?: boolean): string {
  if (semitones === 0) return lyrics;
  return mapChordLines(lyrics, chord => transposeChord(chord, semitones, flats));
}

/* ------------------------------------------------------------------ */
/*  Cambio de modo: mayor ↔ menor                                      */
/* ------------------------------------------------------------------ */

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];
// Calidad de cada grado: M mayor, m menor, d disminuido
const MAJOR_QUALITY = ['M', 'm', 'm', 'M', 'M', 'm', 'd'];
const MINOR_QUALITY = ['m', 'd', 'M', 'm', 'M', 'M', 'M']; // el V se usa mayor (dominante), como en la menor armónica

/**
 * Convierte un acorde de una tonalidad mayor a su paralela menor (o al revés) conservando el grado:
 * I → i, IV → iv, V → V…  Los acordes que no pertenecen a la escala solo se trasladan.
 */
function convertChordMode(chord: string, from: ParsedKey, to: ParsedKey, flats: boolean): string {
  const [main, bass] = chord.split('/');
  const m = CHORD_RE.exec(main);
  if (!m) return chord;
  const rootIdx = noteIndex(m[1]);
  if (rootIdx === null) return chord;
  const fromScale = from.minor ? MINOR_SCALE : MAJOR_SCALE;
  const toScale = to.minor ? MINOR_SCALE : MAJOR_SCALE;
  const fromQ = from.minor ? MINOR_QUALITY : MAJOR_QUALITY;
  const toQ = to.minor ? MINOR_QUALITY : MAJOR_QUALITY;
  const degree = fromScale.indexOf((rootIdx - from.root + 12) % 12);
  const bassOut = bass !== undefined ? '/' + convertBass(bass, from, to, flats, fromScale, toScale) : '';

  // acorde fuera de la escala: solo se traslada a la nueva tónica
  if (degree === -1) return noteName((rootIdx - from.root + to.root + 12) % 12, flats) + m[2] + bassOut;

  const qm = /^(maj|M|min|m|dim|°|aug|\+)?(.*)$/.exec(m[2]) as RegExpExecArray;
  const word = qm[1] || '';
  const rest = qm[2];
  const written: 'M' | 'm' | 'd' | 'x' =
    word === 'm' || word === 'min' ? 'm' : word === 'dim' || word === '°' ? 'd' : word === 'aug' || word === '+' ? 'x' : 'M';
  const newRoot = noteName((to.root + toScale[degree]) % 12, flats);

  // solo se cambia la calidad si el acorde era el normal de su grado; los sus/add/5 no tienen tercera
  const vOfMinor = from.minor && degree === 4 && (written === 'm' || written === 'M');
  if (written === 'x' || (written !== fromQ[degree] && !vOfMinor) || /^(sus|add|5)/.test(rest)) return newRoot + m[2] + bassOut;
  const target = toQ[degree];
  const suffix = target === 'm' ? 'm' + rest : target === 'd' ? 'dim' + rest : rest;
  return newRoot + suffix + bassOut;
}

function convertBass(bass: string, from: ParsedKey, to: ParsedKey, flats: boolean, fromScale: number[], toScale: number[]): string {
  const bi = noteIndex(bass);
  if (bi === null) return bass;
  const degree = fromScale.indexOf((bi - from.root + 12) % 12);
  return noteName(degree === -1 ? (bi - from.root + to.root + 12) % 12 : (to.root + toScale[degree]) % 12, flats);
}

/**
 * Cambia la letra de una tonalidad a otra. Si cambia el modo (mayor ↔ menor) convierte también la calidad
 * de los acordes (modo "paralelo"). Con relative=true solo cambia el nombre de la tonalidad: la menor relativa
 * (Do mayor → La menor) usa los mismos acordes.
 */
export function changeKey(lyrics: string, fromKey: string, toKey: string, opts: { relative?: boolean } = {}): string {
  const from = parseKey(fromKey), to = parseKey(toKey);
  if (!from || !to) return lyrics;
  const flats = prefersFlats(to);
  if (from.minor === to.minor) {
    const semis = (to.root - from.root + 12) % 12;
    return semis === 0 ? lyrics : mapChordLines(lyrics, c => transposeChord(c, semis, flats));
  }
  if (opts.relative) return lyrics;
  return mapChordLines(lyrics, c => convertChordMode(c, from, to, flats));
}
