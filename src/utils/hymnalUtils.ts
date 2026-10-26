import type { Hymnal, Song } from '../types';

/**
 * Une los cancioneros predeterminados con los del usuario.
 * Si un cancionero predeterminado fue editado, se usa la versión editada y conserva su lugar en la lista.
 */
export function mergeHymnals(base: Hymnal[], custom: Hymnal[]): Hymnal[] {
  const customById = new Map(custom.map(h => [h.id, h] as [string, Hymnal]));
  const baseIds = new Set(base.map(h => h.id));
  return [...base.map(h => customById.get(h.id) || h), ...custom.filter(h => !baseIds.has(h.id))];
}

/**
 * Une las canciones predeterminadas con las del usuario. Si una canción predeterminada fue editada
 * (se guarda una copia con el mismo id), se usa la copia y no se repite.
 */
export function mergeSongs(base: Song[], custom: Song[]): Song[] {
  const customById = new Map(custom.map(s => [s.id, s] as [string, Song]));
  const baseIds = new Set(base.map(s => s.id));
  return [...base.map(s => customById.get(s.id) || s), ...custom.filter(s => !baseIds.has(s.id))];
}
