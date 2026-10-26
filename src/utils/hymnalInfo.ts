import type { Song, Hymnal } from '../types';

/**
 * Detalle del himnario y numeración propia de una canción. Si la canción no tiene los suyos, hereda los
 * del cancionero: un detalle para todas ("Himnario Bautista") y numeración automática que empieza donde
 * se indique (por defecto en 1).
 */
export function getHymnalInfo(song: Song, hymnal?: Hymnal): { detail: string; number: string } {
  const detail = (song.hymnalDetail || hymnal?.songDetail || '').trim();
  let number = (song.hymnalNumber || '').trim();
  if (hymnal?.hideOwnNumber) return { detail, number: '' };
  if (!number && hymnal?.autoNumber && song.number) {
    number = `N° ${song.number + ((hymnal.numberStart ?? 1) - 1)}`;
  }
  return { detail, number };
}

/** Copia de la canción con el detalle y la numeración ya completos (para exportar). */
export function withHymnalInfo(song: Song, hymnals: Hymnal[]): Song {
  const hymnal = hymnals.find(h => h.id === song.hymnalId);
  const { detail, number } = getHymnalInfo(song, hymnal);
  if (detail === (song.hymnalDetail || '') && number === (song.hymnalNumber || '')) return song;
  return { ...song, hymnalDetail: detail || undefined, hymnalNumber: number || undefined };
}
