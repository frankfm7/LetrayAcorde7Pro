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

/** Número con el que se ordena una canción dentro de su cancionero: la numeración propia ("N° 75") o, si no tiene, su número de orden. */
export function songSortNumber(song: Song, hymnal?: Hymnal): number {
  const own = /(\d+)/.exec(song.hymnalNumber || '');
  if (own) return Number(own[1]);
  if (song.number !== undefined) return song.number + (hymnal?.autoNumber ? (hymnal.numberStart ?? 1) - 1 : 0);
  const fromCode = /(\d+)\s*$/.exec(song.code || '');
  return fromCode ? Number(fromCode[1]) : Infinity;
}

/** Orden natural: por cancionero y, dentro de cada uno, 1, 2, 3 … 10, 11 (nunca 1, 10, 11, 2). */
export function sortSongsNatural(songs: Song[], hymnals: Hymnal[]): Song[] {
  const rank = new Map(hymnals.map((h, i) => [h.id, i] as [string, number]));
  const byId = new Map(hymnals.map(h => [h.id, h] as [string, Hymnal]));
  return [...songs].sort((a, b) =>
    (rank.get(a.hymnalId) ?? 999) - (rank.get(b.hymnalId) ?? 999)
    || songSortNumber(a, byId.get(a.hymnalId)) - songSortNumber(b, byId.get(b.hymnalId))
    || a.title.localeCompare(b.title, 'es', { numeric: true }));
}
