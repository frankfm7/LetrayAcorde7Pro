import PageBack from './PageBack';
import { sortSongsNatural } from '../utils/hymnalInfo';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Search, Star, X, ListMusic, Cloud, Download, Loader2 } from 'lucide-react';
import { Song } from '../types';
import { useApp } from '../context/AppContext';
import { useSongLibrary } from '../hooks/useSongLibrary';
import { searchSongs, getLyricSnippet, SearchResult } from '../utils/search';
import Highlight from './Highlight';
import { useAuth } from '../context/AuthContext';
import { useNotification } from './NotificationProvider';
import { signInWithGoogle } from '../lib/auth';
import { searchCommunitySongs, communityRowToSong, CommunitySongRow } from '../lib/communitySongs';
import { generateSongCode, getNextSongNumber, songs as defaultSongs } from '../data/songs';
import { uid } from '../utils/listUtils';

interface Props {
  onSelectSong: (song: Song) => void;
  onAddToList?: (song: Song) => void;
  /** Abre el buscador web con este texto */
  onSearchWeb?: (query: string) => void;
}

const RECENT_KEY = 'c7-recent-searches';
const PAGE = 40;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x: unknown) => typeof x === 'string').slice(0, 6) : [];
  } catch {
    return [];
  }
}

const FIELD_LABEL: Record<string, string> = {
  title: 'título',
  artist: 'artista',
  code: 'código',
  lyrics: 'letra',
  categories: 'categoría',
};

export default function SearchPage({ onSelectSong, onAddToList, onSearchWeb }: Props) {
  const { toggleFavorite, isFavorite, addCustomSong, state } = useApp();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  // Buscar en la nube (tabla community_songs de Supabase)
  const [cloud, setCloud] = useState(false);
  const [cloudRows, setCloudRows] = useState<CommunitySongRow[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState('');
  const { songs, hymnals, getCode } = useSongLibrary();
  const [query, setQuery] = useState('');
  const [hymnalId, setHymnalId] = useState('all');
  const [limit, setLimit] = useState(PAGE);
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const deferred = useDeferredValue(query);

  const pool = useMemo(() => (hymnalId === 'all' ? songs : songs.filter(s => s.hymnalId === hymnalId)), [songs, hymnalId]);

  const results = useMemo<SearchResult[]>(() => {
    if (!deferred.trim()) {
      return sortSongsNatural(pool, hymnals).map(song => ({ song, score: 0, fields: [] }));
    }
    return searchSongs(pool, deferred);
  }, [pool, deferred, hymnals]);

  useEffect(() => {
    if (!cloud || !user) return;
    const q = query.trim();
    if (!q) { setCloudRows([]); setCloudError(''); return; }
    let active = true;
    setCloudLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const rows = await searchCommunitySongs(q);
        if (active) { setCloudRows(rows); setCloudError(''); }
      } catch (e) {
        if (active) { setCloudRows([]); setCloudError(e instanceof Error ? e.message : 'No se pudo consultar la nube'); }
      } finally {
        if (active) setCloudLoading(false);
      }
    }, 400);
    return () => { active = false; window.clearTimeout(t); };
  }, [cloud, user, query]);

  const saveCloudSong = (row: CommunitySongRow) => {
    const hymnal = hymnals.find(h => h.id === 'mis-canciones') || hymnals[0];
    if (!hymnal) return;
    const number = getNextSongNumber(hymnal.id, [...defaultSongs, ...state.customSongs]);
    const base = communityRowToSong(row, hymnal.id);
    addCustomSong({ ...base, id: uid(), number, code: generateSongCode(hymnal, number), notes: 'Descargada de la comunidad' });
    showNotification('Canción guardada en tu cancionero', 'success');
  };

  // Guarda la búsqueda reciente cuando el usuario deja de escribir un momento
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || results.length === 0) return;
    const t = window.setTimeout(() => {
      setRecent(prev => {
        const next = [q, ...prev.filter(r => r.toLowerCase() !== q.toLowerCase())].slice(0, 6);
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* sin espacio */ }
        return next;
      });
    }, 1200);
    return () => window.clearTimeout(t);
  }, [query, results.length]);

  const clearRecent = () => {
    setRecent([]);
    try { localStorage.removeItem(RECENT_KEY); } catch { /* nada */ }
  };

  const searching = deferred.trim().length > 0;
  const visible = results.slice(0, limit);

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h2 className="text-2xl font-bold mb-1 flex items-center"><PageBack />Buscar</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Por título, artista, código o cualquier parte de la letra</p>
      </div>

      <div className="relative">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setLimit(PAGE); }}
          placeholder="Buscar canciones…"
          className="field"
          style={{ paddingLeft: '3rem', paddingRight: query ? '3rem' : undefined, paddingTop: '1rem', paddingBottom: '1rem', borderRadius: '1.1rem', fontWeight: 500, boxShadow: 'var(--card-shadow)' }}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 icon-btn icon-btn-sm" aria-label="Limpiar búsqueda"><X size={16} /></button>
        )}
      </div>

      <div className="inline-flex p-1 rounded-xl gap-1" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <button onClick={() => setCloud(false)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: !cloud ? 'var(--card-bg)' : 'transparent', color: !cloud ? 'var(--accent)' : 'var(--text-muted)' }}>Mis canciones</button>
        <button onClick={() => setCloud(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5" style={{ backgroundColor: cloud ? 'var(--card-bg)' : 'transparent', color: cloud ? 'var(--accent)' : 'var(--text-muted)' }}><Cloud size={13} /> Buscar en la Nube</button>
      </div>

      {cloud && (
        <div className="space-y-2">
          {!user ? (
            <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--border-color)' }}>
              <p className="text-sm font-bold mb-3" style={{ color: 'var(--accent)' }}>Inicia sesión para buscar en la nube</p>
              <button onClick={async () => { const err = await signInWithGoogle(); if (err) showNotification(err, 'error'); }} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700">Iniciar sesión con Google</button>
            </div>
          ) : !query.trim() ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Escribe el título de la canción para buscarla en la comunidad.</p>
          ) : cloudLoading ? (
            <p className="text-sm text-center py-8 flex items-center justify-center gap-2" style={{ color: 'var(--text-muted)' }}><Loader2 size={16} className="animate-spin" /> Buscando en la nube…</p>
          ) : cloudError ? (
            <p className="text-sm text-center py-6 text-red-500">No se pudo buscar: {cloudError}</p>
          ) : cloudRows.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No hay canciones de la comunidad con “{query.trim()}”.</p>
          ) : (
            <>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>{cloudRows.length} en la nube</div>
              {cloudRows.map(row => (
                <div key={String(row.id)} className="flex items-center gap-2 p-3 rounded-2xl border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
                  <button onClick={() => onSelectSong(communityRowToSong(row, hymnals[0]?.id || 'mis-canciones'))} className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-0.5"><span className="badge">☁️ Nube</span><span className="font-bold text-sm truncate"><Highlight text={row.title} query={query} /></span></div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{row.artist || 'Desconocido'}</div>
                  </button>
                  <button onClick={() => saveCloudSong(row)} className="icon-btn" aria-label="Guardar en mi cancionero" title="Guardar en mi cancionero"><Download size={18} /></button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      <div className={cloud ? 'hidden' : 'space-y-4'}>
      {hymnals.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button className="chip" data-active={hymnalId === 'all'} onClick={() => { setHymnalId('all'); setLimit(PAGE); }}>Todos</button>
          {hymnals.map(h => (
            <button key={h.id} className="chip" data-active={hymnalId === h.id} onClick={() => { setHymnalId(h.id); setLimit(PAGE); }}>{h.icon} {h.name}</button>
          ))}
        </div>
      )}

      {onSearchWeb && (
        <button onClick={() => onSearchWeb(query)} className="w-full text-left rounded-2xl p-3 flex items-center gap-3 surface-hover" style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--border-color)' }}>
          <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent)', color: 'white' }}><Search size={18} /></span>
          <span className="min-w-0">
            <span className="block text-sm font-bold" style={{ color: 'var(--accent)' }}>¿No la encuentras? Búscala en la web</span>
            <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>LaCuerda, Cifra Club y más, con importación directa</span>
          </span>
        </button>
      )}

      {!searching && recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Búsquedas recientes</span>
            <button onClick={clearRecent} className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Borrar</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map(r => <button key={r} className="chip" onClick={() => setQuery(r)}>{r}</button>)}
          </div>
        </div>
      )}

      <div>
        <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
          {searching ? `${results.length} resultado${results.length !== 1 ? 's' : ''}` : `${results.length} canción${results.length !== 1 ? 'es' : ''} · orden alfabético`}
        </div>

        {searching && results.length === 0 && (
          <div className="text-center py-12 rounded-3xl border border-dashed" style={{ borderColor: 'var(--border-color)' }}>
            <Search size={36} className="mx-auto mb-3 opacity-40" />
            <p className="font-semibold text-sm mb-1">Sin resultados para “{query}”</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Prueba con menos palabras o revisa el cancionero seleccionado.</p>
            {onSearchWeb && <button className="btn btn-primary" onClick={() => onSearchWeb(query)}><Search size={16} /> Buscarla en la web</button>}
          </div>
        )}

        <div className="space-y-2">
          {visible.map(({ song, fields }) => {
            const snippet = searching && fields.includes('lyrics') && !fields.includes('title') ? getLyricSnippet(song, deferred) : null;
            const matchedIn = searching ? fields.filter(f => f !== 'title').map(f => FIELD_LABEL[f]).filter(Boolean) : [];
            return (
              <div key={song.id} className="flex items-center gap-2 p-3 rounded-2xl border surface-hover" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
                <button onClick={() => onSelectSong(song)} className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="badge" translate="no">{getCode(song)}</span>
                    <span className="font-bold text-sm truncate"><Highlight text={song.title} query={deferred} /></span>
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    <Highlight text={song.artist} query={deferred} /> • <span translate="no">{song.key} • {song.timeSignature} • {song.bpm} BPM</span>
                  </div>
                  {snippet && (
                    <div className="text-xs italic mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>“<Highlight text={snippet} query={deferred} />”</div>
                  )}
                  {matchedIn.length > 0 && !snippet && (
                    <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Coincide en: {matchedIn.join(', ')}</div>
                  )}
                </button>
                {onAddToList && (
                  <button onClick={() => onAddToList(song)} className="icon-btn" aria-label="Agregar a lista u orden" title="Agregar a lista u orden"><ListMusic size={18} /></button>
                )}
                <button
                  onClick={() => toggleFavorite(song.id)}
                  className="icon-btn"
                  aria-label="Favorito"
                  style={{ color: isFavorite(song.id) ? 'var(--gold)' : 'var(--text-muted)' }}
                >
                  <Star size={18} fill={isFavorite(song.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
            );
          })}
        </div>

        {results.length > limit && (
          <button className="btn btn-soft btn-block mt-3" onClick={() => setLimit(l => l + PAGE)}>Mostrar más ({results.length - limit})</button>
        )}
      </div>
      </div>
    </div>
  );
}
