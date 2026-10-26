import type { Song } from '../types';
import { parseSections, orderToLabels } from './presentation';

/** Quita el "//" de las líneas de acordes (quedan alineadas sobre la letra, listas para volver a importar). */
export const plainChords = (lyrics: string): string =>
  lyrics.split('\n').map(l => (l.trim().startsWith('//') ? l.slice(l.indexOf('//') + 2).replace(/\s+$/, '') : l)).join('\n');

/**
 * Canción en texto con todos sus datos (título, artista, himnario, numeración, tono, compás, BPM,
 * idioma, categoría y orden de presentación) para que al importarla se rellene todo automáticamente.
 */
export function songToTxt(song: Song): string {
  const head: string[] = [
    `Título: ${song.title}`,
    `Artista: ${song.artist}`,
  ];
  if (song.hymnalDetail) head.push(`Detalle de Cancionero: ${song.hymnalDetail}`);
  if (song.hymnalNumber) head.push(`Numeración propia: ${song.hymnalNumber}`);
  head.push(`Tonalidad: ${song.key}`, `Compás: ${song.timeSignature}`, `BPM: ${song.bpm}`);
  if (song.language) head.push(`Idioma: ${song.language}`);
  if (song.categories && song.categories.length > 0) head.push(`Categoría: ${song.categories.join(', ')}`);
  if (song.presentationOrder && song.presentationOrder.sections.length > 0) {
    const labels = orderToLabels(song.presentationOrder.sections, parseSections(song.lyrics));
    if (labels) {
      head.push(`Orden: ${labels}`);
      head.push(`Tiempo por sección: ${song.presentationOrder.intervalSeconds}`);
    }
  }

  let body = song.lyrics;
  if (song.lyricsByLanguage && Object.keys(song.lyricsByLanguage).length > 1) {
    body = Object.entries(song.lyricsByLanguage).map(([lang, lyrics]) => `=== ${lang.toUpperCase()} ===\n\n${lyrics}`).join('\n\n');
  }
  return `${head.join('\n')}\n\n${plainChords(body)}`;
}

export const TXT_SEPARATOR = '='.repeat(50);
