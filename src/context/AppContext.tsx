import { parseKey } from '../utils/chords';
import React, { createContext, useContext, useMemo, useCallback, useEffect } from 'react';
import { AppState, Setlist, SetlistSong, Hymnal, Song, Order, UserProfile } from '../types';
import { uid } from '../utils/listUtils';

interface AppContextType {
  state: AppState;
  toggleFavorite: (songId: string) => void;
  isFavorite: (songId: string) => boolean;
  addSetlist: (name: string, songs?: SetlistSong[], notes?: string) => string;
  updateSetlist: (setlist: Setlist) => void;
  duplicateSetlist: (id: string) => string | null;
  removeSetlist: (id: string) => void;
  addSongToSetlist: (setlistId: string, song: SetlistSong) => void;
  removeSongFromSetlist: (setlistId: string, songId: string) => void;
  addOrder: (order: Order) => void;
  removeOrder: (id: string) => void;
  updateOrder: (order: Order) => void;
  duplicateOrder: (id: string) => string | null;
  setTheme: (theme: 'light' | 'dark') => void;
  setFontSize: (size: number) => void;
  setShowChords: (show: boolean) => void;
  setCapo: (capo: number) => void;
  addCustomHymnal: (hymnal: Hymnal) => void;
  removeCustomHymnal: (id: string) => void;
  updateCustomHymnal: (hymnal: Hymnal) => void;
  addCustomSong: (song: Song) => void;
  addMultipleCustomSongs: (songs: Song[]) => void;
  updateCustomSong: (song: Song) => void;
  removeCustomSong: (id: string) => void;
  removeMultipleCustomSongs: (ids: string[]) => void;
  addMultipleToFavorites: (ids: string[]) => void;
  updateUserProfile: (profile: UserProfile) => void;
}

const defaultState: AppState = {
  favorites: [],
  setlists: [],
  orders: [],
  preferences: { theme: 'dark', fontSize: 18, showChords: true, capo: 0 },
  personalNotes: {},
  customHymnals: [],
  customSongs: [],
  userProfile: undefined,
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('cancionero-ruah-state');
      if (!saved) return defaultState;
      const parsed = JSON.parse(saved);
      // Se combina con los valores por defecto para que respaldos o versiones anteriores no rompan la app
      return {
        ...defaultState,
        ...parsed,
        preferences: { ...defaultState.preferences, ...(parsed.preferences || {}) },
      } as AppState;
    } catch {
      return defaultState;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('cancionero-ruah-state', JSON.stringify(state));
    } catch (error) {
      // Memoria del navegador llena: se avisa para que no se pierdan cambios sin darse cuenta
      console.error('No se pudo guardar el estado:', error);
      window.dispatchEvent(new Event('c7-storage-error'));
    }
  }, [state]);

  // Limpieza automática de datos corruptos y duplicados al cargar
  useEffect(() => {
    const isValid = (n: string) => !!parseKey(n);
    
    const keys = Object.keys(localStorage);
    const noteKeys = keys.filter(key => key.startsWith('song-notes-'));
    
    noteKeys.forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        const note2Valid = !data.note2 || isValid(data.note2);
        const note3Valid = !data.note3 || isValid(data.note3);
        
        if (!note2Valid || !note3Valid) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    });

    // Limpiar canciones y himnarios duplicados
    const stateData = localStorage.getItem('cancionero-ruah-state');
    if (stateData) {
      try {
        const parsed = JSON.parse(stateData);
        let needsUpdate = false;
        
        // Limpiar canciones duplicadas
        if (parsed.customSongs && Array.isArray(parsed.customSongs)) {
          const uniqueSongs = parsed.customSongs.filter((song: any, index: number, self: any[]) =>
            index === self.findIndex((s: any) => s.id === song.id)
          );
          
          if (uniqueSongs.length !== parsed.customSongs.length) {
            console.log(`Eliminadas ${parsed.customSongs.length - uniqueSongs.length} canciones duplicadas`);
            parsed.customSongs = uniqueSongs;
            needsUpdate = true;
          }
        }
        
        // Limpiar himnarios duplicados
        if (parsed.customHymnals && Array.isArray(parsed.customHymnals)) {
          const uniqueHymnals = parsed.customHymnals.filter((hymnal: any, index: number, self: any[]) =>
            index === self.findIndex((h: any) => h.id === hymnal.id)
          );
          
          if (uniqueHymnals.length !== parsed.customHymnals.length) {
            console.log(`Eliminados ${parsed.customHymnals.length - uniqueHymnals.length} himnarios duplicados`);
            parsed.customHymnals = uniqueHymnals;
            needsUpdate = true;
          }
        }
        
        if (needsUpdate) {
          localStorage.setItem('cancionero-ruah-state', JSON.stringify(parsed));
        }
      } catch (error) {
        console.error('Error al limpiar duplicados:', error);
      }
    }
  }, []);

  const toggleFavorite = useCallback((songId: string) => {
    setState(prev => ({
      ...prev,
      favorites: prev.favorites.includes(songId) ? prev.favorites.filter(id => id !== songId) : [...prev.favorites, songId],
    }));
  }, []);

  const isFavorite = useCallback((songId: string) => state.favorites.includes(songId), [state.favorites]);

  const addSetlist = useCallback((name: string, songs: SetlistSong[] = [], notes = '') => {
    const id = uid();
    const now = new Date().toISOString();
    const newSetlist: Setlist = { id, name, songs, createdAt: now, updatedAt: now, notes };
    setState(prev => ({ ...prev, setlists: [...prev.setlists, newSetlist] }));
    return id;
  }, []);

  const updateSetlist = useCallback((setlist: Setlist) => {
    setState(prev => ({ ...prev, setlists: prev.setlists.map(s => s.id === setlist.id ? setlist : s) }));
  }, []);

  const duplicateSetlist = useCallback((id: string) => {
    const original = state.setlists.find(s => s.id === id);
    if (!original) return null;
    const newId = uid();
    const now = new Date().toISOString();
    const copy: Setlist = { ...original, id: newId, name: `${original.name} (copia)`, songs: original.songs.map(s => ({ ...s })), createdAt: now, updatedAt: now };
    setState(prev => ({ ...prev, setlists: [...prev.setlists, copy] }));
    return newId;
  }, [state.setlists]);

  const removeSetlist = useCallback((id: string) => {
    setState(prev => ({ ...prev, setlists: prev.setlists.filter(s => s.id !== id) }));
  }, []);

  const addSongToSetlist = useCallback((setlistId: string, song: SetlistSong) => {
    setState(prev => ({ ...prev, setlists: prev.setlists.map(s => s.id === setlistId ? { ...s, songs: [...s.songs, song], updatedAt: new Date().toISOString() } : s) }));
  }, []);

  const removeSongFromSetlist = useCallback((setlistId: string, songId: string) => {
    setState(prev => ({ ...prev, setlists: prev.setlists.map(s => s.id === setlistId ? { ...s, songs: s.songs.filter(song => song.songId !== songId), updatedAt: new Date().toISOString() } : s) }));
  }, []);

  const addOrder = useCallback((order: Order) => {
    setState(prev => ({ ...prev, orders: [...prev.orders, order] }));
  }, []);

  const removeOrder = useCallback((id: string) => {
    setState(prev => ({ ...prev, orders: prev.orders.filter(o => o.id !== id) }));
  }, []);

  const updateOrder = useCallback((order: Order) => {
    setState(prev => ({ ...prev, orders: prev.orders.map(o => o.id === order.id ? order : o) }));
  }, []);

  const duplicateOrder = useCallback((id: string) => {
    const original = state.orders.find(o => o.id === id);
    if (!original) return null;
    const newId = uid();
    const copy: Order = { ...original, id: newId, name: `${original.name} (copia)`, items: original.items.map(it => ({ ...it, id: uid() })) };
    setState(prev => ({ ...prev, orders: [...prev.orders, copy] }));
    return newId;
  }, [state.orders]);

  const setTheme = useCallback((theme: 'light' | 'dark') => {
    setState(prev => ({ ...prev, preferences: { ...prev.preferences, theme } }));
  }, []);

  const setFontSize = useCallback((fontSize: number) => {
    setState(prev => ({ ...prev, preferences: { ...prev.preferences, fontSize } }));
  }, []);

  const setShowChords = useCallback((showChords: boolean) => {
    setState(prev => ({ ...prev, preferences: { ...prev.preferences, showChords } }));
  }, []);

  const setCapo = useCallback((capo: number) => {
    setState(prev => ({ ...prev, preferences: { ...prev.preferences, capo } }));
  }, []);

  const addCustomHymnal = useCallback((hymnal: Hymnal) => {
    setState(prev => ({ ...prev, customHymnals: [...prev.customHymnals, hymnal] }));
  }, []);

  const removeCustomHymnal = useCallback((id: string) => {
    setState(prev => ({ ...prev, customHymnals: prev.customHymnals.filter(h => h.id !== id) }));
  }, []);

  const updateCustomHymnal = useCallback((hymnal: Hymnal) => {
    setState(prev => {
      // Si el cancionero ya está en la lista del usuario se actualiza; si es uno predeterminado
      // (como "Mis Canciones") se guarda una copia editada que reemplaza al original.
      const exists = prev.customHymnals.some(h => h.id === hymnal.id);
      const customHymnals = exists
        ? prev.customHymnals.map(h => (h.id === hymnal.id ? hymnal : h))
        : [...prev.customHymnals, hymnal];
      return { ...prev, customHymnals };
    });
  }, []);

  const addCustomSong = useCallback((song: Song) => {
    setState(prev => {
      const exists = prev.customSongs.some(s => s.id === song.id);
      if (exists) {
        const newCustomSongs = prev.customSongs.map(s => s.id === song.id ? song : s);
        return { ...prev, customSongs: newCustomSongs };
      }
      return { ...prev, customSongs: [...prev.customSongs, song] };
    });
  }, []);

  const addMultipleCustomSongs = useCallback((songs: Song[]) => {
    setState(prev => {
      const existingIds = new Set(prev.customSongs.map(s => s.id));
      const newSongs = songs.filter(s => !existingIds.has(s.id));
      return { ...prev, customSongs: [...prev.customSongs, ...newSongs] };
    });
  }, []);

  const updateCustomSong = useCallback((song: Song) => {
    setState(prev => {
      // Si es una canción predeterminada (que no está en la lista del usuario) se guarda una copia
      // editada con el mismo id, que reemplaza a la original.
      const exists = prev.customSongs.some(s => s.id === song.id);
      const newCustomSongs = exists ? prev.customSongs.map(s => (s.id === song.id ? song : s)) : [...prev.customSongs, song];
      return { ...prev, customSongs: newCustomSongs };
    });
  }, []);

  const removeCustomSong = useCallback((id: string) => {
    setState(prev => ({ ...prev, customSongs: prev.customSongs.filter(s => s.id !== id) }));
  }, []);

  const removeMultipleCustomSongs = useCallback((ids: string[]) => {
    setState(prev => ({ ...prev, customSongs: prev.customSongs.filter(s => !ids.includes(s.id)) }));
  }, []);

  const addMultipleToFavorites = useCallback((ids: string[]) => {
    setState(prev => {
      const newFavs = [...new Set([...prev.favorites, ...ids])];
      return { ...prev, favorites: newFavs };
    });
  }, []);

  const updateUserProfile = useCallback((profile: UserProfile) => {
    setState(prev => ({ ...prev, userProfile: profile }));
    localStorage.setItem('userProfile', JSON.stringify(profile));
  }, []);

  const value = useMemo(() => ({
    state, toggleFavorite, isFavorite, addSetlist, updateSetlist, duplicateSetlist, removeSetlist, addSongToSetlist, removeSongFromSetlist,
    addOrder, removeOrder, updateOrder, duplicateOrder, setTheme, setFontSize, setShowChords, setCapo,
    addCustomHymnal, removeCustomHymnal, updateCustomHymnal, addCustomSong, addMultipleCustomSongs,
    updateCustomSong, removeCustomSong, removeMultipleCustomSongs, addMultipleToFavorites, updateUserProfile,
  }), [state, toggleFavorite, isFavorite, addSetlist, updateSetlist, duplicateSetlist, removeSetlist, addSongToSetlist, removeSongFromSetlist,
    addOrder, removeOrder, updateOrder, duplicateOrder, setTheme, setFontSize, setShowChords, setCapo,
    addCustomHymnal, removeCustomHymnal, updateCustomHymnal, addCustomSong, addMultipleCustomSongs,
    updateCustomSong, removeCustomSong, removeMultipleCustomSongs, addMultipleToFavorites, updateUserProfile]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
