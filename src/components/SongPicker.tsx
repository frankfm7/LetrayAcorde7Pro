import { useDeferredValue, useMemo, useState } from 'react';
import { Search, X, Check } from 'lucide-react';
import { Song } from '../types';
import { useSongLibrary } from '../hooks/useSongLibrary';
import { useApp } from '../context/AppContext';
import { sortSongsNatural } from '../utils/hymnalInfo';
import { searchSongs, getLyricSnippet, SearchResult } from '../utils/search';
import Highlight from './Highlight';

interface Props {
  title: string;
  /** Canciones que ya están en la lista (se muestran marcadas y no se pueden elegir). */
  addedIds?: Set<string>;
  /** true = elegir varias y confirmar; false = al tocar una se confirma de inmediato. */
  multi?: boolean;
  onConfirm: (songs: Song[]) => void;
  /** Si se da, aparece la opción de agregar una canción que no está en ningún cancionero (solo con su título) */
  onAddExternal?: (title: string) => void;
  onClose: () => void;
}

const PAGE = 60;

export default function SongPicker({ title, addedIds, multi = true, onConfirm, onAddExternal, onClose }: Props) {
  const { songs, hymnals, getCode } = useSongLibrary();
  const { state } = useApp();
  const [query, setQuery] = useState('');
  const [hymnalId, setHymnalId] = useState('all');
  const [picked, setPicked] = useState<string[]>([]);
  const [limit, setLimit] = useState(PAGE);
  const deferred = useDeferredValue(query);
  const [externalMode, setExternalMode] = useState(false);
  const [externalTitle, setExternalTitle] = useState('');

  const pool = useMemo(() => {
    if (hymnalId === 'fav') return songs.filter(s => state.favorites.includes(s.id));
    return hymnalId === 'all' ? songs : songs.filter(s => s.hymnalId === hymnalId);
  }, [songs, hymnalId, state.favorites]);
  // Orden del cancionero: primero por cancionero y luego por número (1, 2, 3…); sin número, por título
  const ordered = useMemo(() => sortSongsNatural(pool, hymnals), [pool, hymnals]);

  const results = useMemo<SearchResult[]>(() => {
    if (!deferred.trim()) {
      return ordered.map(song => ({ song, score: 0, fields: [] }));
    }
    return searchSongs(pool, deferred);
  }, [pool, ordered, deferred]);

  const toggle = (song: Song) => {
    if (addedIds?.has(song.id)) return;
    if (!multi) {
      onConfirm([song]);
      return;
    }
    setPicked(p => (p.includes(song.id) ? p.filter(id => id !== song.id) : [...p, song.id]));
  };

  const confirm = () => {
    const chosen = picked.map(id => songs.find(s => s.id === id)).filter((s): s is Song => !!s);
    onConfirm(chosen);
  };

  const visible = results.slice(0, limit);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ maxHeight: '92vh', height: '85vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="icon-btn icon-btn-sm" aria-label="Cerrar"><X size={16} /></button>
        </div>

        <div className="relative mb-3">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            className="field"
            style={{ paddingLeft: '2.5rem', paddingRight: query ? '2.5rem' : undefined }}
            placeholder="Buscar por título, artista, código o letra…"
            value={query}
            onChange={e => { setQuery(e.target.value); setLimit(PAGE); }}
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 icon-btn icon-btn-sm" aria-label="Limpiar"><X size={14} /></button>
          )}
        </div>

        {onAddExternal && (
          <div className="mb-2">
            {!externalMode ? (
              <button className="btn btn-soft btn-block btn-sm" onClick={() => { setExternalMode(true); setExternalTitle(query.trim()); }}>
                ➕ Agregar una canción que no está en mis cancioneros
              </button>
            ) : (
              <div className="flex gap-2">
                <input className="field" autoFocus placeholder="Título de la canción" value={externalTitle} onChange={e => setExternalTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && externalTitle.trim()) onAddExternal(externalTitle.trim()); }} />
                <button className="btn btn-primary" disabled={!externalTitle.trim()} onClick={() => onAddExternal(externalTitle.trim())}>Agregar</button>
                <button className="icon-btn" onClick={() => setExternalMode(false)} aria-label="Cancelar"><X size={16} /></button>
              </div>
            )}
          </div>
        )}

        {(hymnals.length > 1 || state.favorites.length > 0) && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-1">
            <button className="chip" data-active={hymnalId === 'fav'} onClick={() => { setHymnalId('fav'); setLimit(PAGE); }}>⭐ Favoritos</button>
            <button className="chip" data-active={hymnalId === 'all'} onClick={() => { setHymnalId('all'); setLimit(PAGE); }}>Todos</button>
            {hymnals.map(h => (
              <button key={h.id} className="chip" data-active={hymnalId === h.id} onClick={() => { setHymnalId(h.id); setLimit(PAGE); }}>{h.icon} {h.name}</button>
            ))}
          </div>
        )}

        <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
          {results.length} canción{results.length === 1 ? '' : 'es'}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
          {visible.length === 0 && (
            <div className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>No se encontraron canciones</div>
          )}
          {visible.map(({ song, fields }) => {
            const already = addedIds?.has(song.id) ?? false;
            const selected = picked.includes(song.id);
            const snippet = deferred.trim() && fields.length > 0 && !fields.includes('title') ? getLyricSnippet(song, deferred, 70) : null;
            return (
              <button
                key={song.id}
                onClick={() => toggle(song)}
                disabled={already}
                className="w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-all"
                style={{
                  backgroundColor: selected ? 'var(--accent-light)' : 'var(--bg-secondary)',
                  border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-color)'}`,
                  opacity: already ? 0.5 : 1,
                }}
              >
                <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: selected || already ? 'var(--accent)' : 'var(--bg-tertiary)', color: 'white' }}>
                  {(selected || already) && <Check size={14} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="badge" translate="no">{getCode(song)}</span>
                    <span className="font-semibold text-sm truncate"><Highlight text={song.title} query={deferred} /></span>
                  </span>
                  <span className="block text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    <Highlight text={song.artist} query={deferred} /> • <span translate="no">{song.key}</span>{already ? ' • ya agregada' : ''}
                  </span>
                  {snippet && (
                    <span className="block text-xs italic truncate" style={{ color: 'var(--text-secondary)' }}>“<Highlight text={snippet} query={deferred} />”</span>
                  )}
                </span>
              </button>
            );
          })}
          {results.length > limit && (
            <button className="btn btn-soft btn-block" onClick={() => setLimit(l => l + PAGE)}>Mostrar más ({results.length - limit})</button>
          )}
        </div>

        {multi && (
          <div className="pt-3 flex gap-2">
            <button className="btn btn-soft flex-1" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary flex-1" disabled={picked.length === 0} onClick={confirm}>
              Agregar{picked.length > 0 ? ` (${picked.length})` : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
