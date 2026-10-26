import { useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { songs as baseSongs, hymnals as baseHymnals } from '../data/songs';
import { Song, Hymnal } from '../types';
import { getDisplayCode } from '../utils/search';
import { mergeHymnals, mergeSongs } from '../utils/hymnalUtils';

/** Todas las canciones y cancioneros (predeterminados + los del usuario), ya combinados. */
export function useSongLibrary() {
  const { state } = useApp();

  const songs = useMemo<Song[]>(() => mergeSongs(baseSongs, state.customSongs), [state.customSongs]);

  const songsById = useMemo(() => {
    const map = new Map<string, Song>();
    songs.forEach(s => map.set(s.id, s));
    return map;
  }, [songs]);

  const hymnals = useMemo<Hymnal[]>(() => mergeHymnals(baseHymnals, state.customHymnals), [state.customHymnals]);

  const getCode = useCallback((song: Song) => getDisplayCode(song, hymnals), [hymnals]);

  return { songs, songsById, hymnals, getCode };
}
