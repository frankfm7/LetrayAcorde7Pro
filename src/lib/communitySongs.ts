import { supabase } from './supabase';
import type { Song } from '../types';

/** Fila de la tabla `community_songs` de Supabase. */
export interface CommunitySongRow {
  id: string | number;
  title: string;
  artist?: string | null;
  /** Letra sola, sin acordes */
  lyrics?: string | null;
  /** Letra con los acordes (formato de la app: líneas "//Am  G" sobre la letra) */
  chords?: string | null;
  created_by?: string | null;
  created_at?: string | null;
}

/** Quita los comodines de LIKE del texto escrito para que se busque tal cual. */
const likeSafe = (text: string) => text.replace(/[\\%_]/g, m => `\\${m}`);

/** Busca canciones de la comunidad por título (sin distinguir mayúsculas). Lanza un Error con el motivo si falla. */
export async function searchCommunitySongs(text: string): Promise<CommunitySongRow[]> {
  const q = text.trim();
  if (!q) return [];
  try {
    const { data, error } = await supabase.from('community_songs').select('*').ilike('title', `%${likeSafe(q)}%`).limit(50);
    if (error) throw new Error(error.message);
    return (data || []) as CommunitySongRow[];
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : 'No se pudo consultar la nube');
  }
}

/** Letra sin las líneas de acordes. */
export const stripChords = (lyrics: string) => lyrics.split('\n').filter(l => !l.trim().startsWith('//')).join('\n').replace(/\n{3,}/g, '\n\n').trim();

/** Sube una canción a la comunidad. Lanza un Error con el motivo si falla. */
export async function shareSongToCommunity(song: Song, userId: string, lyricsWithChords?: string): Promise<void> {
  const withChords = lyricsWithChords ?? song.lyrics;
  try {
    const { error } = await supabase.from('community_songs').insert({
      title: song.title,
      artist: song.artist,
      lyrics: stripChords(withChords),
      chords: withChords,
      created_by: userId,
    });
    if (error) throw new Error(error.message);
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : 'No se pudo subir la canción');
  }
}

/** Convierte una fila de la nube en una canción de la app (para leerla o guardarla). */
export function communityRowToSong(row: CommunitySongRow, hymnalId: string): Song {
  return {
    id: `cloud-${row.id}`,
    title: row.title,
    artist: row.artist || 'Desconocido',
    code: 'NUBE',
    hymnalId,
    key: 'C',
    timeSignature: '4/4',
    bpm: 120,
    language: 'Castellano',
    categories: [],
    sections: [],
    lyrics: row.chords || row.lyrics || '',
    notes: 'De la comunidad',
  };
}
