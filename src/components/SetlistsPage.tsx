import PageBack from './PageBack';
import { uid } from '../utils/listUtils';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronDown, Plus, Trash2, Copy, Share2, Play, Upload, Edit3, Check, X, Music, ArrowRight, FileText, Download, CheckSquare, RotateCcw } from 'lucide-react';
import { Song, Setlist } from '../types';
import { useApp } from '../context/AppContext';
import { useSongLibrary } from '../hooks/useSongLibrary';
import { exportAsPdf, exportAsTxt, exportAsWord } from '../utils/exportUtils';
import { exportAsImages } from '../utils/exportImage';
import {
  setlistToText, buildSetlistPackage, isSharePackage, resolvePackageSongs, packageToSetlistSongs,
  transposeSongCopy, transposedKey, formatSemitones, shareOrCopy, copyToClipboard, openWhatsApp,
  downloadFile, safeFileName, readJsonFile, formatDateShort,
} from '../utils/listUtils';
import SortableList from './SortableList';
import SongPicker from './SongPicker';
import ActionSheet, { SheetAction } from './ActionSheet';
import KebabMenu, { MenuItem } from './KebabMenu';
import ConfirmModal from './ConfirmModal';
import LyricPreview from './LyricPreview';
import { useListView } from '../hooks/useListView';
import { useLongPress } from '../hooks/useLongPress';

/** Elemento de una presentación: una canción o un momento de texto (solo en órdenes). */
export interface QueueItem {
  kind: 'song' | 'text';
  title: string;
  song?: Song;
  transposition: number;
  person?: string;
  ministry?: string;
  text?: string;
  minutes?: number;
  /** Hora de inicio calculada (HH:MM), si la orden tiene hora */
  time?: string;
}

type Notify = (message: string, type?: 'success' | 'error' | 'info') => void;

interface Props {
  /** Lista abierta (se guarda en App para no perderla al ver una letra) */
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  onSelectSong: (song: Song) => void;
  onPlayQueue: (items: QueueItem[], startIndex: number, label: string) => void;
  showNotification: Notify;
}

export default function SetlistsPage({ selectedId, onSelectId, onSelectSong, onPlayQueue, showNotification }: Props) {
  const { state, addSetlist, removeSetlist, duplicateSetlist, addMultipleCustomSongs } = useApp();
  const { songs, songsById, hymnals } = useSongLibrary();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const current = state.setlists.find(s => s.id === selectedId) || null;

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    const id = addSetlist(name);
    setNewName('');
    setShowCreate(false);
    onSelectId(id);
    showNotification('Lista creada', 'success');
  };

  const importList = async () => {
    const data = await readJsonFile();
    if (!data || !isSharePackage(data)) {
      showNotification('Ese archivo no es una lista de Letra&Acorde7Pro', 'error');
      return;
    }
    if (data.kind !== 'setlist') {
      showNotification('Ese archivo es una orden de evento. Impórtalo desde la sección Órdenes', 'info');
      return;
    }
    const target = hymnals.find(h => h.id === 'mis-canciones') || hymnals[0];
    const { songsToAdd, ids } = resolvePackageSongs(data.items, songs, target);
    if (songsToAdd.length > 0) addMultipleCustomSongs(songsToAdd);
    const id = addSetlist(data.name, packageToSetlistSongs(data, ids), data.notes || '');
    showNotification(`Lista "${data.name}" importada${songsToAdd.length ? ` (${songsToAdd.length} canciones nuevas)` : ''}`, 'success');
    onSelectId(id);
  };

  if (current) {
    return (
      <SetlistDetail
        setlist={current}
        songsById={songsById}
        onBack={() => onSelectId(null)}
        onOpen={onSelectId}
        onSelectSong={onSelectSong}
        onPlayQueue={onPlayQueue}
        showNotification={showNotification}
      />
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center"><PageBack />Listas de canciones</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Prepara el repertorio de tu grupo y compártelo</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={importList} className="btn btn-soft btn-sm" title="Importar lista desde archivo"><Download size={15} /> <span className="hidden sm:inline">Importar</span></button>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary"><Plus size={16} /> Nueva</button>
        </div>
      </div>

      {state.setlists.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-3xl border border-dashed" style={{ borderColor: 'var(--border-color)' }}>
          <Music size={48} className="mx-auto mb-3 opacity-40" />
          <h3 className="font-bold text-base mb-1">Aún no tienes listas</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Crea una lista con las canciones que van a tocar y compártela con todo el grupo.</p>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary"><Plus size={16} /> Crear mi primera lista</button>
        </div>
      ) : (
        <div className="space-y-2">
          {[...state.setlists].reverse().map(list => {
            const names = list.songs.map(s => songsById.get(s.songId)?.title).filter((t): t is string => !!t);
            const menu: MenuItem[] = [
              { label: 'Abrir lista', icon: <ArrowRight size={15} />, onClick: () => onSelectId(list.id) },
              { label: 'Duplicar', icon: <Copy size={15} />, onClick: () => { if (duplicateSetlist(list.id)) showNotification('Lista duplicada', 'success'); } },
              { label: 'Eliminar lista', icon: <Trash2 size={15} />, danger: true, separator: true, onClick: () => setConfirmDelete({ id: list.id, name: list.name }) },
            ];
            return (
              <div key={list.id} onClick={() => onSelectId(list.id)} className="flex items-center gap-3 p-3 rounded-2xl border cursor-pointer surface-hover" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}><Music size={20} /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm truncate">{list.name}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--accent)' }}>
                    {list.songs.length} canción{list.songs.length === 1 ? '' : 'es'}
                    {list.updatedAt ? <span style={{ color: 'var(--text-muted)' }}> · {formatDateShort(list.updatedAt.slice(0, 10))}</span> : null}
                  </div>
                  {names.length > 0 && <div className="text-xs truncate hidden sm:block" style={{ color: 'var(--text-muted)' }}>{names.slice(0, 4).join(' • ')}{names.length > 4 ? ` • +${names.length - 4}` : ''}</div>}
                </div>
                <KebabMenu items={menu} label="Opciones de la lista" small />
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-panel" style={{ display: 'block' }} onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-3">Nueva lista de canciones</h3>
            <input className="field mb-4" placeholder="Ej: Repertorio del sábado" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()} autoFocus />
            <div className="flex gap-2">
              <button className="btn btn-soft flex-1" onClick={() => setShowCreate(false)}>Cancelar</button>
              <button className="btn btn-primary flex-1" onClick={create} disabled={!newName.trim()}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="¿Eliminar esta lista?"
          message={`Se eliminará la lista "${confirmDelete.name}". Las canciones seguirán en tu cancionero.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { removeSetlist(confirmDelete.id); setConfirmDelete(null); showNotification('Lista eliminada', 'success'); }}
        />
      )}
    </div>
  );
}

/* ================================================================== */

interface DetailProps {
  setlist: Setlist;
  songsById: Map<string, Song>;
  onBack: () => void;
  onOpen: (id: string) => void;
  onSelectSong: (song: Song) => void;
  onPlayQueue: (items: QueueItem[], startIndex: number, label: string) => void;
  showNotification: Notify;
}

type Confirm = null | { kind: 'delete' } | { kind: 'clear' } | { kind: 'remove'; ids: string[] };

function SetlistDetail({ setlist, songsById, onBack, onOpen, onSelectSong, onPlayQueue, showNotification }: DetailProps) {
  const { updateSetlist, removeSetlist, duplicateSetlist } = useApp();
  const { hymnals } = useSongLibrary();
  const view = useListView();
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(setlist.name);
  const [showPicker, setShowPicker] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [noteOpen, setNoteOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const save = (patch: Partial<Setlist>) => updateSetlist({ ...setlist, ...patch, updatedAt: new Date().toISOString() });

  const longPress = useLongPress();
  const rows = useMemo(() => setlist.songs.map(s => ({ ...s, id: s.songId })), [setlist.songs]);
  const addedIds = useMemo(() => new Set(setlist.songs.map(s => s.songId)), [setlist.songs]);
  const allIds = setlist.songs.map(s => s.songId);

  const writeSongs = (list: Setlist['songs']) => save({ songs: list.map((r, i) => ({ songId: r.songId, transposition: r.transposition || 0, notes: r.notes || '', order: i, ...(r.free ? { free: true, title: r.title } : {}) })) });
  const reorder = (next: typeof rows) => writeSongs(next);

  const patchSong = (songId: string, patch: Partial<{ transposition: number; notes: string }>) =>
    save({ songs: setlist.songs.map(s => (s.songId === songId ? { ...s, ...patch } : s)) });

  const move = (songId: string, where: 'start' | 'end') => {
    const item = setlist.songs.find(s => s.songId === songId);
    if (!item) return;
    const rest = setlist.songs.filter(s => s.songId !== songId);
    writeSongs(where === 'start' ? [item, ...rest] : [...rest, item]);
  };

  const removeSongs = (ids: string[]) => {
    const set = new Set(ids);
    writeSongs(setlist.songs.filter(s => !set.has(s.songId)));
    view.exitSelect();
    showNotification(ids.length === 1 ? 'Canción quitada de la lista' : `${ids.length} canciones quitadas`, 'success');
  };

  const [showHelp, setShowHelp] = useState(false);
  const addFree = (title: string) => {
    save({ songs: [...setlist.songs, { songId: `free-${uid()}`, free: true, title, transposition: 0, notes: '', order: setlist.songs.length }] });
    setShowPicker(false);
    showNotification('Canción agregada a la lista', 'success');
  };

  const addSongs = (picked: Song[]) => {
    const fresh = picked.filter(p => !addedIds.has(p.id));
    if (fresh.length === 0) { setShowPicker(false); return; }
    save({ songs: [...setlist.songs, ...fresh.map((p, i) => ({ songId: p.id, transposition: 0, notes: '', order: setlist.songs.length + i }))] });
    setShowPicker(false);
    showNotification(`${fresh.length} canción${fresh.length === 1 ? '' : 'es'} agregada${fresh.length === 1 ? '' : 's'}`, 'success');
  };

  const commitName = () => {
    const n = nameDraft.trim();
    if (n && n !== setlist.name) save({ name: n });
    else setNameDraft(setlist.name);
    setRenaming(false);
  };

  const queue: QueueItem[] = [];
  setlist.songs.forEach(s => {
    const song = songsById.get(s.songId);
    if (song) queue.push({ kind: 'song', title: song.title, song, transposition: s.transposition || 0 });
    else if (s.free) queue.push({ kind: 'text', title: s.title || 'Nota', transposition: 0, text: s.notes });
  });

  const play = (start = 0) => {
    if (queue.length === 0) { showNotification('Agrega canciones para presentar la lista', 'info'); return; }
    onPlayQueue(queue, start, setlist.name);
  };
  const playFromSong = (songId: string) => {
    const idx = queue.findIndex(q => q.song?.id === songId);
    if (idx >= 0) onPlayQueue(queue, idx, setlist.name);
  };

  const text = () => setlistToText(setlist, songsById);

  const doShare = async () => {
    setShowShare(false);
    const r = await shareOrCopy(setlist.name, text());
    if (r === 'copied') showNotification('Lista copiada. Pégala en WhatsApp o donde quieras', 'success');
    else if (r === 'shared') showNotification('Lista compartida', 'success');
    else if (r === 'error') showNotification('No se pudo compartir', 'error');
  };

  const exportSongs = (fn: (songs: Song[]) => void | Promise<void>) => async () => {
    setShowExport(false);
    const list = setlist.songs
      .map(s => { const song = songsById.get(s.songId); return song ? transposeSongCopy(song, s.transposition || 0) : null; })
      .filter((s): s is Song => !!s);
    if (list.length === 0) { showNotification('La lista está vacía', 'info'); return; }
    try {
      await fn(list);
      showNotification('Archivo generado', 'success');
    } catch {
      showNotification('No se pudo exportar', 'error');
    }
  };

  const shareActions: SheetAction[] = [
    { icon: <Share2 size={20} />, label: 'Compartir…', description: 'Usa las apps de tu dispositivo (o copia el texto)', onClick: doShare },
    { icon: <Send />, label: 'Enviar por WhatsApp', description: 'Abre WhatsApp con la lista lista para enviar', onClick: () => { setShowShare(false); openWhatsApp(text()); } },
    { icon: <Copy size={20} />, label: 'Copiar texto', description: 'Copia la lista para pegarla donde quieras', onClick: async () => { setShowShare(false); showNotification((await copyToClipboard(text())) ? 'Lista copiada' : 'No se pudo copiar', 'success'); } },
    { icon: <Upload size={20} />, label: 'Archivo de lista (.json)', description: 'Con las letras incluidas. Tu grupo lo importa en su app', onClick: () => { setShowShare(false); downloadFile(`${safeFileName(setlist.name)}.json`, JSON.stringify(buildSetlistPackage(setlist, songsById), null, 2), 'application/json;charset=utf-8'); showNotification('Archivo de lista descargado', 'success'); } },
  ];

  const exportActions: SheetAction[] = [
    { icon: <FileText size={20} />, label: 'Resumen en texto (.txt)', description: 'Solo títulos, tonos y notas', onClick: () => { setShowExport(false); downloadFile(`${safeFileName(setlist.name)}.txt`, text()); showNotification('Archivo generado', 'success'); } },
    { icon: <FileText size={20} />, label: 'Letras en texto (.txt)', description: 'Con letras y acordes, en el orden de la lista', onClick: exportSongs(exportAsTxt) },
    { icon: <Upload size={20} />, label: 'Letras en PDF', description: 'Para imprimir', onClick: exportSongs(songs => exportAsPdf(songs, { hymnals })) },
    { icon: <Upload size={20} />, label: 'Letras en Word (.docx)', description: 'Documento editable', onClick: exportSongs(exportAsWord) },
    { icon: <Upload size={20} />, label: 'Letras como imágenes (PNG)', description: 'Una imagen por canción, con el fondo de su cancionero', onClick: exportSongs(songs => exportAsImages(songs, { hymnals }).then(() => undefined)) },
  ];

  const anyExpanded = view.expanded.size > 0;
  const masterMenu: MenuItem[] = [
    { label: view.selectMode ? 'Salir de la selección' : 'Seleccionar varias', icon: <CheckSquare size={15} />, onClick: () => (view.selectMode ? view.exitSelect() : view.startSelect()), disabled: setlist.songs.length === 0 },
    { label: view.showHandles ? 'Ocultar controles para mover' : 'Mostrar controles para mover', onClick: () => view.setShowHandles(!view.showHandles) },
    { label: anyExpanded ? 'Ocultar todas las letras' : 'Mostrar todas las letras', icon: <ChevronDown size={15} />, onClick: () => (anyExpanded ? view.collapseAll() : view.expandAll(allIds)), disabled: setlist.songs.length === 0 },
    { label: 'Compartir…', icon: <Share2 size={15} />, separator: true, disabled: setlist.songs.length === 0, onClick: () => setShowShare(true) },
    { label: 'Exportar…', icon: <Upload size={15} />, disabled: setlist.songs.length === 0, onClick: () => setShowExport(true) },
    { label: showHelp ? 'Ocultar indicaciones' : 'Ver indicaciones', onClick: () => setShowHelp(v => !v) },
    { label: 'Ordenar por título (A–Z)', separator: true, disabled: setlist.songs.length < 2, onClick: () => writeSongs([...setlist.songs].sort((a, b) => (songsById.get(a.songId)?.title || '').localeCompare(songsById.get(b.songId)?.title || '', 'es'))) },
    { label: 'Restablecer todos los tonos', icon: <RotateCcw size={15} />, disabled: !setlist.songs.some(s => s.transposition), onClick: () => save({ songs: setlist.songs.map(s => ({ ...s, transposition: 0 })) }) },
    { label: 'Cambiar nombre', icon: <Edit3 size={15} />, separator: true, onClick: () => { setNameDraft(setlist.name); setRenaming(true); } },
    { label: 'Duplicar lista', icon: <Copy size={15} />, onClick: () => { const id = duplicateSetlist(setlist.id); if (id) { showNotification('Lista duplicada', 'success'); onOpen(id); } } },
    { label: 'Vaciar lista', danger: true, separator: true, disabled: setlist.songs.length === 0, onClick: () => setConfirm({ kind: 'clear' }) },
    { label: 'Eliminar lista', icon: <Trash2 size={15} />, danger: true, onClick: () => setConfirm({ kind: 'delete' }) },
  ];

  const selectedIds = allIds.filter(id => view.selected.has(id));

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="icon-btn" aria-label="Volver a mis listas"><ChevronLeft size={20} /></button>
        <div className="flex-1 min-w-0">
          {renaming ? (
            <div className="flex items-center gap-2">
              <input className="field" style={{ padding: '.5rem .75rem' }} value={nameDraft} onChange={e => setNameDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setNameDraft(setlist.name); setRenaming(false); } }} autoFocus />
              <button onClick={commitName} className="icon-btn icon-btn-sm" aria-label="Guardar nombre"><Check size={16} /></button>
            </div>
          ) : (
            <button onClick={() => { setNameDraft(setlist.name); setRenaming(true); }} className="flex items-center gap-2 max-w-full text-left" title="Cambiar nombre">
              <h2 className="text-xl font-bold truncate">{setlist.name}</h2>
              <Edit3 size={14} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0" />
            </button>
          )}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{setlist.songs.length} canción{setlist.songs.length === 1 ? '' : 'es'}</p>
        </div>
        <KebabMenu items={masterMenu} label="Opciones de la lista" />
      </div>

      <div className="flex gap-2">
        <button onClick={() => setShowPicker(true)} className="btn btn-primary flex-1"><Plus size={16} /> Canción</button>
        <button onClick={() => play(0)} className="btn btn-gold flex-1" disabled={queue.length === 0}><Play size={15} /> Presentar</button>
      </div>

      {setlist.songs.length === 0 ? (
        <div className="text-center py-14 rounded-3xl border border-dashed" style={{ borderColor: 'var(--border-color)' }}>
          <Music size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Esta lista está vacía</p>
          <button onClick={() => setShowPicker(true)} className="btn btn-primary"><Plus size={16} /> Agregar canciones</button>
        </div>
      ) : (
        <>
          {(showHelp || view.selectMode) && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {view.selectMode ? 'Toca las canciones para seleccionarlas.' : `${view.showHandles ? 'Arrastra ⋮⋮ para cambiar el orden · ' : ''}toca ▾ para ver la letra aquí mismo · ⋮ para más opciones`}
          </p>}
          <SortableList
            items={rows}
            onReorder={reorder}
            renderItem={(item, index, handle, isDragging) => {
              const song = songsById.get(item.songId);
              const tone = transposedKey(song?.key, item.transposition);
              const isOpen = view.expanded.has(item.songId);
              const isSel = view.selected.has(item.songId);
              const rowMenu: MenuItem[] = [
                { label: 'Ver letra completa', icon: <FileText size={15} />, disabled: !song, onClick: () => song && onSelectSong(song) },
                { label: 'Presentar desde aquí', icon: <Play size={15} />, disabled: !song, onClick: () => playFromSong(item.songId) },
                { label: 'Subir tono (+1)', disabled: !song, onClick: () => patchSong(item.songId, { transposition: (item.transposition || 0) + 1 }) },
                { label: 'Bajar tono (−1)', disabled: !song, onClick: () => patchSong(item.songId, { transposition: (item.transposition || 0) - 1 }) },
                { label: 'Tono original', disabled: !item.transposition, onClick: () => patchSong(item.songId, { transposition: 0 }) },
                { label: item.notes ? 'Editar nota' : 'Agregar nota', icon: <Edit3 size={15} />, separator: true, onClick: () => setNoteOpen(item.songId) },
                { label: 'Mover al inicio', separator: true, disabled: index === 0, onClick: () => move(item.songId, 'start') },
                { label: 'Mover al final', disabled: index === rows.length - 1, onClick: () => move(item.songId, 'end') },
                { label: 'Seleccionar varias', icon: <CheckSquare size={15} />, onClick: () => view.startSelect(item.songId) },
                { label: 'Quitar de la lista', icon: <Trash2 size={15} />, danger: true, separator: true, onClick: () => removeSongs([item.songId]) },
              ];
              return (
                <div className="row-card p-2.5" data-dragging={isDragging} style={isSel ? { borderColor: 'var(--accent)', backgroundColor: 'var(--accent-light)' } : undefined}>
                  <div className="flex items-center gap-1.5">
                    {view.selectMode ? (
                      <button onClick={() => view.toggleSelect(item.songId)} className="w-7 h-9 flex items-center justify-center flex-shrink-0" aria-label={isSel ? 'Quitar selección' : 'Seleccionar'}>
                        <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: isSel ? 'var(--accent)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'white' }}>{isSel && <Check size={13} />}</span>
                      </button>
                    ) : view.showHandles ? handle : <span className="w-1 flex-shrink-0" />}
                    <span className="text-xs font-bold w-5 text-center flex-shrink-0" style={{ color: 'var(--accent)' }}>{index + 1}</span>
                    <button {...longPress(() => { if (!view.selectMode) view.startSelect(item.songId); })} onClick={() => (view.selectMode ? view.toggleSelect(item.songId) : song && onSelectSong(song))} className="flex-1 text-left min-w-0">
                      <div className="font-semibold text-sm truncate">{song?.title || (item.free ? `📝 ${item.title}` : 'Canción no encontrada')}</div>
                      <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{song ? <>{song.artist} · <b style={{ color: 'var(--accent)' }} translate="no">{tone || song.key}</b></> : (item.free ? (item.notes || 'Sin letra en el cancionero') : '')}{song && item.notes ? ` · 📝 ${item.notes}` : ''}</div>
                    </button>
                    {!view.selectMode && song && (
                      <button onClick={() => view.toggleExpanded(item.songId)} className="icon-btn icon-btn-sm" aria-label={isOpen ? 'Ocultar letra' : 'Ver letra aquí'} aria-expanded={isOpen} title={isOpen ? 'Ocultar letra' : 'Ver letra aquí'}>
                        <ChevronDown size={18} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                      </button>
                    )}
                    {!view.selectMode && <KebabMenu items={rowMenu} label="Opciones de la canción" small />}
                  </div>

                  {noteOpen === item.songId && (
                    <div className="mt-2 flex items-center gap-2">
                      <input className="field" style={{ padding: '.5rem .75rem', fontSize: '14px' }} placeholder="Nota (ej: entra el piano, solo en el coro…)" defaultValue={item.notes} onBlur={e => patchSong(item.songId, { notes: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); setNoteOpen(null); } }} autoFocus />
                      <button onClick={() => setNoteOpen(null)} className="icon-btn icon-btn-sm" aria-label="Cerrar nota"><X size={14} /></button>
                    </div>
                  )}

                  {isOpen && song && !view.selectMode && <LyricPreview song={song} transposition={item.transposition} />}
                </div>
              );
            }}
          />
        </>
      )}

      <div>
        <label className="text-xs font-bold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--text-muted)' }}>Notas de la lista</label>
        <textarea className="field" rows={2} placeholder="Ej: Ensayo el sábado a las 5 pm. Traer capo." defaultValue={setlist.notes} onBlur={e => { if (e.target.value !== setlist.notes) save({ notes: e.target.value }); }} />
      </div>

      {/* Barra de acciones al seleccionar varias */}
      {view.selectMode && (
        <div className="fixed left-0 right-0 z-40 px-3" style={{ bottom: '76px' }}>
          <div className="max-w-xl mx-auto rounded-2xl p-2.5 flex items-center gap-2 shadow-2xl" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--accent)' }}>
            <span className="text-sm font-bold px-2" style={{ color: 'var(--accent)' }}>{selectedIds.length} sel.</span>
            <button className="btn btn-soft btn-sm" onClick={() => (selectedIds.length === allIds.length ? view.selectAll([]) : view.selectAll(allIds))}>{selectedIds.length === allIds.length ? 'Ninguna' : 'Todas'}</button>
            <div className="flex-1" />
            <button className="btn btn-danger btn-sm" disabled={selectedIds.length === 0} onClick={() => setConfirm({ kind: 'remove', ids: selectedIds })}><Trash2 size={14} /> Quitar</button>
            <button className="btn btn-soft btn-sm" onClick={view.exitSelect}>Listo</button>
          </div>
        </div>
      )}

      {showPicker && <SongPicker title="Agregar canciones" addedIds={addedIds} onConfirm={addSongs} onAddExternal={addFree} onClose={() => setShowPicker(false)} />}
      {showShare && <ActionSheet title="Compartir lista" subtitle={setlist.name} actions={shareActions} onClose={() => setShowShare(false)} />}
      {showExport && <ActionSheet title="Exportar lista" subtitle="Las letras salen con los tonos de la lista" actions={exportActions} onClose={() => setShowExport(false)} />}

      {confirm && (
        <ConfirmModal
          title={confirm.kind === 'delete' ? '¿Eliminar esta lista?' : confirm.kind === 'clear' ? '¿Vaciar la lista?' : `¿Quitar ${confirm.ids.length} canción${confirm.ids.length === 1 ? '' : 'es'}?`}
          message={confirm.kind === 'delete'
            ? `Se eliminará la lista "${setlist.name}". Las canciones seguirán en tu cancionero.`
            : confirm.kind === 'clear'
            ? 'Se quitarán todas las canciones de esta lista (siguen en tu cancionero).'
            : 'Se quitarán de la lista (siguen en tu cancionero).'}
          confirmLabel={confirm.kind === 'delete' ? 'Eliminar' : 'Quitar'}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.kind === 'delete') { removeSetlist(setlist.id); showNotification('Lista eliminada', 'success'); onBack(); }
            else if (confirm.kind === 'clear') { writeSongs([]); view.exitSelect(); showNotification('Lista vaciada', 'success'); }
            else removeSongs(confirm.ids);
            setConfirm(null);
          }}
        />
      )}
    </div>
  );
}

function Send() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </svg>
  );
}
