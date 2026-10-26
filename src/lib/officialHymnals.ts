import { supabase } from './supabase';
import { stripChords } from './communitySongs';
import type { Song } from '../types';

/** Fila de `official_hymnals`. */
export interface OfficialHymnal {
  id: number;
  name: string;
  is_locked?: boolean | null;
  created_by?: string | null;
}

/** Fila de `official_songs`. */
export interface OfficialSong {
  id: number;
  hymnal_id: number;
  number?: string | null;
  title: string;
  artist?: string | null;
  lyrics?: string | null;
  chords?: string | null;
  language?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  /** Solo en las búsquedas: cancionero al que pertenece */
  official_hymnals?: { name: string } | null;
}

/** Datos que se escriben al crear o editar una canción oficial. `chords` es la letra con acordes (formato de la app). */
export interface OfficialSongInput {
  number?: string;
  title: string;
  artist?: string;
  /** Letra con acordes; la letra sola se calcula sola */
  chords: string;
  language?: string;
}

const fail = (e: unknown, fallback: string): never => {
  throw new Error(e instanceof Error ? e.message : fallback);
};

/** Ordena como número natural: 1, 2, 10 (no 1, 10, 2); sin número, al final. */
export function sortOfficialSongs<T extends { number?: string | null; title: string }>(songs: T[]): T[] {
  return [...songs].sort((a, b) => {
    const na = /\d+/.exec(a.number || ''); const nb = /\d+/.exec(b.number || '');
    return (na ? Number(na[0]) : Infinity) - (nb ? Number(nb[0]) : Infinity) || a.title.localeCompare(b.title, 'es', { numeric: true });
  });
}

/** Todos los himnarios oficiales. */
export async function getOfficialHymnals(): Promise<OfficialHymnal[]> {
  try {
    const { data, error } = await supabase.from('official_hymnals').select('*').order('name', { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as OfficialHymnal[];
  } catch (e) { return fail(e, 'No se pudieron cargar los himnarios oficiales'); }
}

/** Todas las canciones de un himnario, ordenadas por número. */
export async function getOfficialSongs(hymnalId: number): Promise<OfficialSong[]> {
  try {
    const { data, error } = await supabase.from('official_songs').select('*').eq('hymnal_id', hymnalId).limit(2000);
    if (error) throw new Error(error.message);
    return sortOfficialSongs((data || []) as OfficialSong[]);
  } catch (e) { return fail(e, 'No se pudieron cargar las canciones'); }
}

/** Crea un himnario oficial (solo administrador: lo exigen las reglas RLS). */
export async function createOfficialHymnal(name: string): Promise<OfficialHymnal> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('official_hymnals').insert({ name: name.trim(), created_by: auth.user?.id }).select().single();
    if (error) throw new Error(error.message);
    return data as OfficialHymnal;
  } catch (e) { return fail(e, 'No se pudo crear el himnario'); }
}

/** Cambia el nombre de un himnario oficial (solo administrador). */
export async function renameOfficialHymnal(id: number, name: string): Promise<void> {
  try {
    const { error } = await supabase.from('official_hymnals').update({ name: name.trim() }).eq('id', id);
    if (error) throw new Error(error.message);
  } catch (e) { fail(e, 'No se pudo cambiar el nombre'); }
}

/** Borra un himnario oficial y todas sus canciones (solo administrador). */
export async function deleteOfficialHymnal(id: number): Promise<void> {
  try {
    const { error } = await supabase.from('official_hymnals').delete().eq('id', id);
    if (error) throw new Error(error.message);
  } catch (e) { fail(e, 'No se pudo borrar el himnario'); }
}

const toRow = (d: OfficialSongInput) => ({
  number: d.number?.trim() || null,
  title: d.title.trim(),
  artist: d.artist?.trim() || null,
  lyrics: stripChords(d.chords),
  chords: d.chords,
  language: d.language?.trim() || 'Castellano',
});

/** Agrega una canción a un himnario oficial (solo administrador). */
export async function addOfficialSong(hymnalId: number, songData: OfficialSongInput): Promise<OfficialSong> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('official_songs').insert({ ...toRow(songData), hymnal_id: hymnalId, created_by: auth.user?.id }).select().single();
    if (error) throw new Error(error.message);
    return data as OfficialSong;
  } catch (e) { return fail(e, 'No se pudo agregar la canción'); }
}

/** Edita una canción oficial (solo administrador). */
export async function updateOfficialSong(songId: number, songData: OfficialSongInput): Promise<OfficialSong> {
  try {
    const { data, error } = await supabase.from('official_songs').update(toRow(songData)).eq('id', songId).select().single();
    if (error) throw new Error(error.message);
    return data as OfficialSong;
  } catch (e) { return fail(e, 'No se pudo guardar la canción'); }
}

/** Borra una canción oficial (solo administrador). */
export async function deleteOfficialSong(songId: number): Promise<void> {
  try {
    const { error } = await supabase.from('official_songs').delete().eq('id', songId);
    if (error) throw new Error(error.message);
  } catch (e) { fail(e, 'No se pudo borrar la canción'); }
}

/** Busca en todas las canciones oficiales por título, artista o número. */
export async function searchOfficialSongs(text: string): Promise<OfficialSong[]> {
  const q = text.trim();
  if (!q) return [];
  try {
    // se quitan los caracteres que rompen el filtro .or() de PostgREST y los comodines de LIKE
    const safe = q.replace(/[,()*\\%_]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!safe) return [];
    const parts = [`title.ilike.%${safe}%`, `artist.ilike.%${safe}%`];
    if (/^\d+$/.test(safe)) parts.push(`number.eq.${safe}`);
    const { data, error } = await supabase.from('official_songs').select('*, official_hymnals(name)').or(parts.join(',')).limit(60);
    if (error) throw new Error(error.message);
    return sortOfficialSongs((data || []) as OfficialSong[]);
  } catch (e) { return fail(e, 'No se pudo buscar en los himnarios oficiales'); }
}

/** Convierte una canción oficial en una canción de la app (para leerla o guardarla). */
export function officialToSong(row: OfficialSong, hymnalName: string, hymnalId = 'mis-canciones'): Song {
  const num = (row.number || '').trim();
  return {
    id: `official-${row.id}`,
    title: row.title,
    artist: row.artist || 'Desconocido',
    code: 'OFICIAL',
    hymnalId,
    key: 'C',
    timeSignature: '4/4',
    bpm: 120,
    language: row.language || 'Castellano',
    categories: [],
    sections: [],
    lyrics: row.chords || row.lyrics || '',
    notes: `Himnario oficial: ${hymnalName}`,
    hymnalDetail: hymnalName,
    hymnalNumber: num ? `N° ${num}` : undefined,
  };
}
