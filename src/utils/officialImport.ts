import type { OfficialSongInput } from '../lib/officialHymnals';
import { parseSongsAsync } from './songParser';

/* Lee un archivo con muchas canciones (JSON, TXT o CSV) y las convierte al formato de los cancioneros oficiales. */

const norm = (k: string) => k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const ALIASES: Record<keyof OfficialSongInput | 'lyrics', string[]> = {
  title: ['title', 'titulo', 'nombre', 'cancion', 'name', 'song'],
  artist: ['artist', 'artista', 'autor', 'author', 'interprete'],
  number: ['number', 'numero', 'num', 'nro', 'n', 'no', 'hymnalnumber', 'numeracionpropia'],
  language: ['language', 'idioma', 'lang', 'lenguaje'],
  chords: ['chords', 'acordes', 'letraconacordes', 'lyricswithchords'],
  lyrics: ['lyrics', 'letra', 'texto', 'text'],
};

function pick(obj: Record<string, unknown>, field: keyof typeof ALIASES): string {
  const entries = Object.entries(obj).map(([k, v]) => [norm(k), v] as [string, unknown]);
  for (const alias of ALIASES[field]) {
    const hit = entries.find(([k]) => k === alias);
    if (hit && hit[1] !== null && hit[1] !== undefined && String(hit[1]).trim() !== '') return String(hit[1]);
  }
  return '';
}

function toInput(obj: Record<string, unknown>): OfficialSongInput | null {
  const title = pick(obj, 'title').trim();
  if (!title) return null;
  const chords = pick(obj, 'chords') || pick(obj, 'lyrics');
  const num = pick(obj, 'number').replace(/^n\s*[°º.]?\s*/i, '').trim();
  return { title, artist: pick(obj, 'artist').trim(), number: num, language: pick(obj, 'language').trim() || 'Castellano', chords: chords.replace(/\r\n?/g, '\n') };
}

/** CSV con comillas, saltos de línea dentro de comillas y separador coma, punto y coma o tabulador. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split('\n', 1)[0] || '';
  const delim = [';', '\t', ','].reduce((best, d) => (firstLine.split(d).length > firstLine.split(best).length ? d : best), ',');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"') { if (clean[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && clean[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(x => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some(x => x.trim() !== '')) rows.push(row);
  return rows;
}

export interface ImportResult {
  songs: OfficialSongInput[];
  /** Filas o bloques que no tenían título y se omitieron */
  skipped: number;
}

/** Lee el archivo y devuelve las canciones encontradas. Lanza un Error con el motivo si no se puede leer. */
export async function readSongsFile(file: File, onProgress?: (done: number, total: number) => void): Promise<ImportResult> {
  let text: string;
  try { text = await file.text(); }
  catch { throw new Error('No se pudo leer el archivo'); }
  if (!text.trim()) throw new Error('El archivo está vacío');
  const ext = (file.name.split('.').pop() || '').toLowerCase();

  try {
    if (ext === 'json' || /^\s*[\[{]/.test(text)) {
      const data = JSON.parse(text) as unknown;
      const list = Array.isArray(data) ? data : Array.isArray((data as { songs?: unknown }).songs) ? (data as { songs: unknown[] }).songs : null;
      if (!list) throw new Error('El JSON debe ser una lista de canciones (o un objeto con "songs")');
      const songs: OfficialSongInput[] = [];
      let skipped = 0;
      for (const item of list) {
        const s = item && typeof item === 'object' ? toInput(item as Record<string, unknown>) : null;
        if (s) songs.push(s); else skipped++;
      }
      return { songs, skipped };
    }

    if (ext === 'csv' || ext === 'tsv') {
      const rows = parseCsv(text);
      if (rows.length < 2) throw new Error('El CSV necesita una fila de encabezados (title, artist, lyrics, chords…) y al menos una canción');
      const head = rows[0];
      const songs: OfficialSongInput[] = [];
      let skipped = 0;
      for (const r of rows.slice(1)) {
        const obj: Record<string, unknown> = {};
        head.forEach((h, i) => { obj[h] = r[i] ?? ''; });
        const s = toInput(obj);
        if (s) songs.push(s); else skipped++;
      }
      return { songs, skipped };
    }

    // TXT: varias canciones separadas por ===== o con encabezados (Título:, Artista:…), con el mismo lector de la app
    const report = await parseSongsAsync(text, 'oficial', file.name, onProgress);
    if (report.songs.length === 0) throw new Error(report.lastError || 'No se encontraron canciones en el archivo');
    const parsed = report.songs;
    const songs: OfficialSongInput[] = parsed.map(p => ({
      title: p.title || 'Sin título',
      artist: p.artist && p.artist !== 'Desconocido' ? p.artist : '',
      number: (/(\d+)/.exec(p.hymnalNumber || '') || [])[1] || '',
      language: (p.language || 'Castellano').split('/')[0],
      chords: p.lyrics || '',
    }));
    return { songs, skipped: report.failed };
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : 'El archivo no tiene un formato válido');
  }
}
