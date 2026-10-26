import PageBack from './PageBack';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronDown, Plus, Trash2, Copy, Share2, Play, Upload, Edit3, X, Music, ArrowRight, FileText, Download, Check, CheckSquare } from 'lucide-react';
import { Song, Order, OrderItem } from '../types';
import { useApp } from '../context/AppContext';
import { useSongLibrary } from '../hooks/useSongLibrary';
import { exportAsPdf, exportAsTxt, exportAsWord } from '../utils/exportUtils';
import { exportAsImages } from '../utils/exportImage';
import {
  uid, isSongItem, newSongItem, newTextItem, orderSchedule, itemMinutes, formatDuration, formatDateEs, formatDateShort,
  orderToText, buildOrderPackage, isSharePackage, resolvePackageSongs, packageToOrderItems, transposeSongCopy,
  transposedKey, formatSemitones, shareOrCopy, copyToClipboard, openWhatsApp, downloadFile, safeFileName, readJsonFile,
} from '../utils/listUtils';
import SortableList from './SortableList';
import SongPicker from './SongPicker';
import ActionSheet, { SheetAction } from './ActionSheet';
import KebabMenu, { MenuItem } from './KebabMenu';
import ConfirmModal from './ConfirmModal';
import LyricPreview from './LyricPreview';
import { useListView } from '../hooks/useListView';
import type { QueueItem } from './SetlistsPage';

type Notify = (message: string, type?: 'success' | 'error' | 'info') => void;

interface Props {
  /** Orden abierta (se guarda en App para no perderla al ver una letra) */
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  onSelectSong: (song: Song) => void;
  onPlayQueue: (items: QueueItem[], startIndex: number, label: string) => void;
  showNotification: Notify;
}

const ORDER_TYPES = ['Evento', 'Reunión', 'Ensayo', 'Concierto', 'Celebración', 'Otro'];

const TEXT_TEMPLATES: Array<{ title: string; minutes: number }> = [
  { title: 'Bienvenida', minutes: 3 },
  { title: 'Apertura', minutes: 2 },
  { title: 'Presentación', minutes: 3 },
  { title: 'Anuncios', minutes: 3 },
  { title: 'Lectura', minutes: 3 },
  { title: 'Mensaje', minutes: 20 },
  { title: 'Testimonio', minutes: 5 },
  { title: 'Agradecimientos', minutes: 2 },
  { title: 'Receso', minutes: 10 },
  { title: 'Cierre', minutes: 2 },
];

const today = () => new Date().toISOString().split('T')[0];

export default function OrdersPage({ selectedId, onSelectId, onSelectSong, onPlayQueue, showNotification }: Props) {
  const { state, addOrder, removeOrder, duplicateOrder, addMultipleCustomSongs } = useApp();
  const { songs, songsById, hymnals } = useSongLibrary();
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const current = state.orders.find(o => o.id === selectedId) || null;

  const sortedOrders = useMemo(
    () => [...state.orders].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [state.orders]
  );

  const importOrder = async () => {
    const data = await readJsonFile();
    if (!data || !isSharePackage(data)) {
      showNotification('Ese archivo no es una orden de Letra&Acorde7Pro', 'error');
      return;
    }
    if (data.kind !== 'order') {
      showNotification('Ese archivo es una lista de canciones. Impórtalo desde la sección Listas', 'info');
      return;
    }
    const target = hymnals.find(h => h.id === 'mis-canciones') || hymnals[0];
    const { songsToAdd, ids } = resolvePackageSongs(data.items, songs, target);
    if (songsToAdd.length > 0) addMultipleCustomSongs(songsToAdd);
    const order: Order = {
      id: uid(),
      name: data.name,
      type: data.type || 'Evento',
      date: data.date || today(),
      time: data.time,
      notes: data.notes,
      items: packageToOrderItems(data, ids),
    };
    addOrder(order);
    onSelectId(order.id);
    showNotification(`Orden "${data.name}" importada${songsToAdd.length ? ` (${songsToAdd.length} canciones nuevas)` : ''}`, 'success');
  };

  if (current) {
    return (
      <OrderDetail
        order={current}
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
          <h1 className="text-2xl font-bold flex items-center"><PageBack />Órdenes de evento</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>El programa completo: canciones, intervenciones, horarios y responsables</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={importOrder} className="btn btn-soft btn-sm" title="Importar orden desde archivo"><Download size={15} /> <span className="hidden sm:inline">Importar</span></button>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary"><Plus size={16} /> Nueva</button>
        </div>
      </div>

      {sortedOrders.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-3xl border border-dashed" style={{ borderColor: 'var(--border-color)' }}>
          <Music size={48} className="mx-auto mb-3 opacity-40" />
          <h3 className="font-bold text-base mb-1">Aún no hay órdenes de evento</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Arma el programa de tu evento: quién habla, qué canción sigue y a qué hora.</p>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary"><Plus size={16} /> Crear mi primera orden</button>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedOrders.map(order => {
            const sched = orderSchedule(order);
            const menu: MenuItem[] = [
              { label: 'Abrir orden', icon: <ArrowRight size={15} />, onClick: () => onSelectId(order.id) },
              { label: 'Duplicar', icon: <Copy size={15} />, onClick: () => { if (duplicateOrder(order.id)) showNotification('Orden duplicada', 'success'); } },
              { label: 'Eliminar orden', icon: <Trash2 size={15} />, danger: true, separator: true, onClick: () => setConfirmDelete({ id: order.id, name: order.name }) },
            ];
            return (
              <div key={order.id} onClick={() => onSelectId(order.id)} className="flex items-center gap-3 p-3 rounded-2xl border cursor-pointer surface-hover" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
                <div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-center" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                  <span className="text-[10px] font-bold leading-none uppercase">{order.date ? new Date(order.date + 'T12:00:00').toLocaleDateString('es', { month: 'short' }) : ''}</span>
                  <span className="text-base font-extrabold leading-none">{order.date ? new Date(order.date + 'T12:00:00').getDate() : '–'}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm truncate">{order.name}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{[order.type, order.time, `${order.items.length} elemento${order.items.length === 1 ? '' : 's'}`, sched.totalMinutes > 0 ? formatDuration(sched.totalMinutes) : ''].filter(Boolean).join(' · ')}</div>
                  {order.items.length > 0 && <div className="text-xs truncate hidden sm:block" style={{ color: 'var(--text-muted)' }}>{order.items.slice(0, 4).map(i => `${isSongItem(i) ? '🎵' : '🎤'} ${i.title}`).join('  ')}</div>}
                </div>
                <KebabMenu items={menu} label="Opciones de la orden" small />
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <OrderMetaModal
          title="Nueva orden de evento"
          confirmLabel="Crear"
          initial={{ name: '', type: 'Evento', date: today(), time: '', notes: '' }}
          onClose={() => setShowCreate(false)}
          onSave={meta => {
            const order: Order = { id: uid(), name: meta.name, type: meta.type, date: meta.date, time: meta.time || undefined, notes: meta.notes || undefined, items: [] };
            addOrder(order);
            setShowCreate(false);
            onSelectId(order.id);
            showNotification('Orden creada', 'success');
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="¿Eliminar esta orden?"
          message={`Se eliminará la orden "${confirmDelete.name}". Las canciones seguirán en tu cancionero.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { removeOrder(confirmDelete.id); setConfirmDelete(null); showNotification('Orden eliminada', 'success'); }}
        />
      )}
    </div>
  );
}

/* ================================================================== */

interface Meta {
  name: string;
  type: string;
  date: string;
  time: string;
  notes: string;
}

function OrderMetaModal({ title, confirmLabel, initial, onSave, onClose }: { title: string; confirmLabel: string; initial: Meta; onSave: (m: Meta) => void; onClose: () => void }) {
  const [meta, setMeta] = useState<Meta>(initial);
  const set = (patch: Partial<Meta>) => setMeta(m => ({ ...m, ...patch }));
  const label = 'text-xs font-semibold mb-1 block';
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="icon-btn icon-btn-sm" aria-label="Cerrar"><X size={16} /></button>
        </div>
        <div className="space-y-3 overflow-y-auto pb-1">
          <div><label className={label} style={{ color: 'var(--text-muted)' }}>Nombre</label><input className="field" placeholder="Ej: Concierto de aniversario" value={meta.name} onChange={e => set({ name: e.target.value })} autoFocus /></div>
          <div><label className={label} style={{ color: 'var(--text-muted)' }}>Tipo</label>
            <select className="field" value={meta.type} onChange={e => set({ type: e.target.value })}>
              {Array.from(new Set([...ORDER_TYPES, meta.type])).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label} style={{ color: 'var(--text-muted)' }}>Fecha</label><input type="date" className="field" value={meta.date} onChange={e => set({ date: e.target.value })} /></div>
            <div><label className={label} style={{ color: 'var(--text-muted)' }}>Hora de inicio</label><input type="time" className="field" value={meta.time} onChange={e => set({ time: e.target.value })} /></div>
          </div>
          <div><label className={label} style={{ color: 'var(--text-muted)' }}>Notas</label><textarea className="field" rows={2} placeholder="Lugar, vestimenta, recordatorios…" value={meta.notes} onChange={e => set({ notes: e.target.value })} /></div>
        </div>
        <div className="flex gap-2 pt-3">
          <button className="btn btn-soft flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary flex-1" disabled={!meta.name.trim()} onClick={() => onSave({ ...meta, name: meta.name.trim() })}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */

interface ItemEditorProps {
  item: OrderItem;
  isNew?: boolean;
  onChangeSong?: () => void;
  onSave: (patch: Partial<OrderItem>) => void;
  onClose: () => void;
}

function ItemEditor({ item, isNew, onChangeSong, onSave, onClose }: ItemEditorProps) {
  const song = isSongItem(item);
  // canción enlazada al cancionero (con letra) o canción escrita a mano que no está en ningún cancionero
  const linked = song && !!item.songId;
  const [title, setTitle] = useState(item.title);
  const [person, setPerson] = useState(item.person || '');
  const [minutes, setMinutes] = useState(item.minutes !== undefined ? String(item.minutes) : '');
  const [text, setText] = useState(item.text || '');
  const [transposition, setTransposition] = useState(item.transposition || 0);
  const label = 'text-xs font-semibold mb-1 block';

  const submit = () => {
    const m = minutes.trim() === '' ? undefined : Math.max(0, Math.min(600, Math.round(Number(minutes)) || 0));
    onSave({
      title: linked ? item.title : title.trim(),
      person: person.trim() || undefined,
      minutes: m,
      text: text.trim() || undefined,
      transposition: linked ? transposition : undefined,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">{isNew ? 'Agregar momento' : song ? 'Editar canción' : 'Editar momento'}</h3>
          <button onClick={onClose} className="icon-btn icon-btn-sm" aria-label="Cerrar"><X size={16} /></button>
        </div>

        <div className="space-y-3 overflow-y-auto pb-1">
          {isNew && (
            <div className="flex flex-wrap gap-2">
              {TEXT_TEMPLATES.map(t => (
                <button key={t.title} className="chip" data-active={title === t.title} onClick={() => { setTitle(t.title); setMinutes(String(t.minutes)); }}>{t.title}</button>
              ))}
            </div>
          )}

          {!linked && (
            <div><label className={label} style={{ color: 'var(--text-muted)' }}>Título</label><input className="field" placeholder="Ej: Palabras de bienvenida" value={title} onChange={e => setTitle(e.target.value)} autoFocus={!!isNew} /></div>
          )}
          {linked && (
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold flex-1 min-w-0 truncate">🎵 {item.title}</div>
              {onChangeSong && <button type="button" className="btn btn-soft btn-sm" onClick={onChangeSong}>Cambiar canción</button>}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><label className={label} style={{ color: 'var(--text-muted)' }}>{song ? 'Dirige / canta' : 'Responsable'}</label><input className="field" placeholder="Nombre" value={person} onChange={e => setPerson(e.target.value)} /></div>
            <div><label className={label} style={{ color: 'var(--text-muted)' }}>Minutos</label><input className="field" inputMode="numeric" placeholder={song ? '4' : '0'} value={minutes} onChange={e => setMinutes(e.target.value.replace(/[^0-9]/g, ''))} /></div>
          </div>

          {linked && (
            <div>
              <label className={label} style={{ color: 'var(--text-muted)' }}>Transposición</label>
              <div className="flex items-center gap-2">
                <button className="icon-btn" onClick={() => setTransposition(t => t - 1)} aria-label="Bajar un semitono">−</button>
                <div className="flex-1 text-center">
                  <span className="text-xl font-bold" style={{ color: 'var(--accent)' }} translate="no">{transposedKey(item.key, transposition) || '—'}</span>
                  <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>{transposition === 0 ? 'tono original' : `${formatSemitones(transposition)} semitonos`}</span>
                </div>
                <button className="icon-btn" onClick={() => setTransposition(t => t + 1)} aria-label="Subir un semitono">+</button>
              </div>
            </div>
          )}

          <div><label className={label} style={{ color: 'var(--text-muted)' }}>{song ? 'Notas' : 'Detalle'}</label><textarea className="field" rows={3} placeholder={song ? 'Ej: empieza solo el piano' : 'Ej: Leer el programa del día'} value={text} onChange={e => setText(e.target.value)} /></div>
        </div>

        <div className="flex gap-2 pt-3">
          <button className="btn btn-soft flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary flex-1" disabled={!linked && !title.trim()} onClick={submit}>{isNew ? 'Agregar' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */

interface DetailProps {
  order: Order;
  songsById: Map<string, Song>;
  onBack: () => void;
  onOpen: (id: string) => void;
  onSelectSong: (song: Song) => void;
  onPlayQueue: (items: QueueItem[], startIndex: number, label: string) => void;
  showNotification: Notify;
}

type Confirm = null | { kind: 'delete' } | { kind: 'clear' } | { kind: 'remove'; ids: string[] };

function OrderDetail({ order, songsById, onBack, onOpen, onSelectSong, onPlayQueue, showNotification }: DetailProps) {
  const { updateOrder, removeOrder, duplicateOrder } = useApp();
  const { hymnals } = useSongLibrary();
  const view = useListView();
  const [showPicker, setShowPicker] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [newText, setNewText] = useState<OrderItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showMeta, setShowMeta] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const save = (patch: Partial<Order>) => updateOrder({ ...order, ...patch });
  const sched = useMemo(() => orderSchedule(order), [order]);
  const editing = order.items.find(i => i.id === editingId) || null;
  const allIds = order.items.map(i => i.id);
  const songItemIds = order.items.filter(i => isSongItem(i) && i.songId && songsById.has(i.songId)).map(i => i.id);

  const patchItem = (id: string, patch: Partial<OrderItem>) => save({ items: order.items.map(i => (i.id === id ? { ...i, ...patch } : i)) });

  const removeItems = (ids: string[]) => {
    const set = new Set(ids);
    save({ items: order.items.filter(i => !set.has(i.id)) });
    view.exitSelect();
    showNotification(ids.length === 1 ? 'Elemento quitado de la orden' : `${ids.length} elementos quitados`, 'success');
  };

  const move = (id: string, where: 'start' | 'end') => {
    const item = order.items.find(i => i.id === id);
    if (!item) return;
    const rest = order.items.filter(i => i.id !== id);
    save({ items: where === 'start' ? [item, ...rest] : [...rest, item] });
  };

  const duplicateItem = (id: string) => {
    const idx = order.items.findIndex(i => i.id === id);
    if (idx < 0) return;
    const copy = { ...order.items[idx], id: uid() };
    const items = [...order.items];
    items.splice(idx + 1, 0, copy);
    save({ items });
  };

  const addExternal = (title: string) => {
    save({ items: [...order.items, { id: uid(), title, kind: 'song' as const }] });
    setShowPicker(false);
    showNotification('Canción agregada a la orden', 'success');
  };

  const addSongs = (picked: Song[]) => {
    save({ items: [...order.items, ...picked.map(s => newSongItem(s))] });
    setShowPicker(false);
    showNotification(`${picked.length} canción${picked.length === 1 ? '' : 'es'} agregada${picked.length === 1 ? '' : 's'}`, 'success');
  };

  // La presentación recorre TODA la orden: canciones y momentos (bienvenida, intervenciones, cierre…)
  const queue: QueueItem[] = [];
  const queueIndexById = new Map<string, number>();
  order.items.forEach((it, i) => {
    const time = sched.starts[i] || undefined;
    if (isSongItem(it)) {
      const song = it.songId ? songsById.get(it.songId) : undefined;
      if (!song) {
        // canción escrita a mano (sin letra): se muestra como una pantalla de texto
        queueIndexById.set(it.id, queue.length);
        queue.push({ kind: 'text', title: `🎵 ${it.title}`, transposition: 0, person: it.person, text: it.text, minutes: it.minutes, time });
        return;
      }
      queueIndexById.set(it.id, queue.length);
      queue.push({ kind: 'song', title: it.title, song, transposition: it.transposition || 0, person: it.person, text: it.text, minutes: it.minutes, time });
    } else {
      queueIndexById.set(it.id, queue.length);
      queue.push({ kind: 'text', title: it.title, transposition: 0, person: it.person, text: it.text, minutes: it.minutes, time });
    }
  });
  const songCount = queue.filter(q => q.kind === 'song').length;

  const play = () => {
    if (queue.length === 0) { showNotification('Agrega elementos para presentar la orden', 'info'); return; }
    onPlayQueue(queue, 0, order.name);
  };
  const playFrom = (item: OrderItem) => {
    const idx = queueIndexById.get(item.id);
    if (idx !== undefined) onPlayQueue(queue, idx, order.name);
  };

  const text = () => orderToText(order, songsById);

  const doShare = async () => {
    setShowShare(false);
    const r = await shareOrCopy(order.name, text());
    if (r === 'copied') showNotification('Orden copiada. Pégala en WhatsApp o donde quieras', 'success');
    else if (r === 'shared') showNotification('Orden compartida', 'success');
    else if (r === 'error') showNotification('No se pudo compartir', 'error');
  };

  const exportSongs = (fn: (songs: Song[]) => void | Promise<void>) => async () => {
    setShowExport(false);
    const list = queue.filter(q => q.song).map(q => transposeSongCopy(q.song as Song, q.transposition));
    if (list.length === 0) { showNotification('La orden no tiene canciones', 'info'); return; }
    try {
      await fn(list);
      showNotification('Archivo generado', 'success');
    } catch {
      showNotification('No se pudo exportar', 'error');
    }
  };

  const shareActions: SheetAction[] = [
    { icon: <Share2 size={20} />, label: 'Compartir…', description: 'Usa las apps de tu dispositivo (o copia el texto)', onClick: doShare },
    { icon: <SendIcon />, label: 'Enviar por WhatsApp', description: 'Abre WhatsApp con el programa listo para enviar', onClick: () => { setShowShare(false); openWhatsApp(text()); } },
    { icon: <Copy size={20} />, label: 'Copiar texto', description: 'Copia el programa para pegarlo donde quieras', onClick: async () => { setShowShare(false); showNotification((await copyToClipboard(text())) ? 'Orden copiada' : 'No se pudo copiar', 'success'); } },
    { icon: <Upload size={20} />, label: 'Archivo de orden (.json)', description: 'Con las letras incluidas. Tu equipo lo importa en su app', onClick: () => { setShowShare(false); downloadFile(`${safeFileName(order.name)}.json`, JSON.stringify(buildOrderPackage(order, songsById), null, 2), 'application/json;charset=utf-8'); showNotification('Archivo de orden descargado', 'success'); } },
  ];

  const exportActions: SheetAction[] = [
    { icon: <FileText size={20} />, label: 'Programa en texto (.txt)', description: 'Horarios, responsables y canciones', onClick: () => { setShowExport(false); downloadFile(`${safeFileName(order.name)}.txt`, text()); showNotification('Archivo generado', 'success'); } },
    { icon: <FileText size={20} />, label: 'Letras en texto (.txt)', description: 'Solo las canciones, en orden, con acordes', onClick: exportSongs(exportAsTxt) },
    { icon: <Upload size={20} />, label: 'Letras en PDF', description: 'Para imprimir', onClick: exportSongs(songs => exportAsPdf(songs, { hymnals })) },
    { icon: <Upload size={20} />, label: 'Letras en Word (.docx)', description: 'Documento editable', onClick: exportSongs(exportAsWord) },
    { icon: <Upload size={20} />, label: 'Letras como imágenes (PNG)', description: 'Una imagen por canción, con el fondo de su cancionero', onClick: exportSongs(songs => exportAsImages(songs, { hymnals }).then(() => undefined)) },
  ];

  const anyExpanded = view.expanded.size > 0;
  const masterMenu: MenuItem[] = [
    { label: view.selectMode ? 'Salir de la selección' : 'Seleccionar varios', icon: <CheckSquare size={15} />, onClick: () => (view.selectMode ? view.exitSelect() : view.startSelect()), disabled: order.items.length === 0 },
    { label: view.showHandles ? 'Ocultar controles para mover' : 'Mostrar controles para mover', onClick: () => view.setShowHandles(!view.showHandles) },
    { label: anyExpanded ? 'Ocultar todas las letras' : 'Mostrar todas las letras', icon: <ChevronDown size={15} />, onClick: () => (anyExpanded ? view.collapseAll() : view.expandAll(songItemIds)), disabled: songItemIds.length === 0 },
    { label: 'Compartir…', icon: <Share2 size={15} />, separator: true, disabled: order.items.length === 0, onClick: () => setShowShare(true) },
    { label: 'Exportar…', icon: <Upload size={15} />, disabled: order.items.length === 0, onClick: () => setShowExport(true) },
    { label: showHelp ? 'Ocultar indicaciones y resumen' : 'Ver indicaciones y resumen', onClick: () => setShowHelp(v => !v) },
    { label: 'Editar datos de la orden', icon: <Edit3 size={15} />, separator: true, onClick: () => setShowMeta(true) },
    { label: 'Duplicar orden', icon: <Copy size={15} />, onClick: () => { const id = duplicateOrder(order.id); if (id) { showNotification('Orden duplicada', 'success'); onOpen(id); } } },
    { label: 'Vaciar orden', danger: true, separator: true, disabled: order.items.length === 0, onClick: () => setConfirm({ kind: 'clear' }) },
    { label: 'Eliminar orden', icon: <Trash2 size={15} />, danger: true, onClick: () => setConfirm({ kind: 'delete' }) },
  ];

  const selectedIds = allIds.filter(id => view.selected.has(id));

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="icon-btn" aria-label="Volver a mis órdenes"><ChevronLeft size={20} /></button>
        <button onClick={() => setShowMeta(true)} className="flex-1 min-w-0 text-left" title="Editar datos de la orden">
          <div className="flex items-center gap-2"><h2 className="text-xl font-bold truncate">{order.name}</h2><Edit3 size={14} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0" /></div>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{[order.type, formatDateEs(order.date), order.time ? `${order.time} h` : ''].filter(Boolean).join(' • ')}</p>
        </button>
        <KebabMenu items={masterMenu} label="Opciones de la orden" />
      </div>

      <div className="flex gap-2">
        <button onClick={() => setShowPicker(true)} className="btn btn-primary flex-1"><Plus size={16} /> Canción</button>
        <button onClick={() => setNewText(newTextItem(''))} className="btn btn-soft flex-1"><Plus size={16} /> Texto</button>
        <button onClick={play} className="btn btn-gold flex-1" disabled={queue.length === 0}><Play size={15} /> Presentar</button>
      </div>

      {order.items.length > 0 && showHelp && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold px-1" style={{ color: 'var(--text-muted)' }}>
          <span>{order.items.length} elementos</span>
          <span>{songCount} canciones</span>
          {sched.totalMinutes > 0 && <span>⏱ {formatDuration(sched.totalMinutes)}</span>}
          {sched.end && <span>Termina ~{sched.end}</span>}
          {!order.time && <button onClick={() => setShowMeta(true)} style={{ color: 'var(--accent)' }}>+ Poner hora de inicio</button>}
        </div>
      )}

      {order.items.length === 0 ? (
        <div className="text-center py-14 rounded-3xl border border-dashed" style={{ borderColor: 'var(--border-color)' }}>
          <Music size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>El programa está vacío. Agrega canciones y momentos.</p>
          <div className="flex justify-center gap-2 flex-wrap">
            <button onClick={() => setShowPicker(true)} className="btn btn-primary"><Plus size={16} /> Canción</button>
            <button onClick={() => setNewText(newTextItem(''))} className="btn btn-soft"><Plus size={16} /> Momento</button>
          </div>
        </div>
      ) : (
        <>
          {(showHelp || view.selectMode) && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {view.selectMode ? 'Toca los elementos para seleccionarlos.' : `${view.showHandles ? 'Arrastra ⋮⋮ para cambiar el orden · ' : ''}toca una fila para editarla · ▾ muestra la letra · las horas se calculan solas`}
          </p>}
          <SortableList
            items={order.items}
            onReorder={items => save({ items })}
            renderItem={(item, index, handle, isDragging) => {
              const isSong = isSongItem(item);
              const song = isSong && item.songId ? songsById.get(item.songId) : undefined;
              const tone = transposedKey(song?.key || item.key, item.transposition);
              const mins = itemMinutes(item);
              const isOpen = view.expanded.has(item.id);
              const isSel = view.selected.has(item.id);
              const rowMenu: MenuItem[] = [
                { label: 'Editar', icon: <Edit3 size={15} />, onClick: () => setEditingId(item.id) },
                ...(isSong ? [{ label: 'Cambiar canción', icon: <Music size={15} />, onClick: () => setChangingId(item.id) }] : []),
                { label: 'Presentar desde aquí', icon: <Play size={15} />, disabled: !queueIndexById.has(item.id), onClick: () => playFrom(item) },
                { label: 'Ver letra completa', icon: <FileText size={15} />, disabled: !song, onClick: () => song && onSelectSong(song) },
                { label: 'Duplicar elemento', icon: <Copy size={15} />, onClick: () => duplicateItem(item.id) },
                { label: 'Mover al inicio', separator: true, disabled: index === 0, onClick: () => move(item.id, 'start') },
                { label: 'Mover al final', disabled: index === order.items.length - 1, onClick: () => move(item.id, 'end') },
                { label: 'Seleccionar varios', icon: <CheckSquare size={15} />, onClick: () => view.startSelect(item.id) },
                { label: 'Quitar de la orden', icon: <Trash2 size={15} />, danger: true, separator: true, onClick: () => removeItems([item.id]) },
              ];
              return (
                <div className="row-card p-2.5" data-dragging={isDragging} style={{ borderLeft: `4px solid ${isSong ? 'var(--accent)' : 'var(--gold)'}`, ...(isSel ? { borderColor: 'var(--accent)', backgroundColor: 'var(--accent-light)' } : {}) }}>
                  <div className="flex items-center gap-1.5">
                    {view.selectMode ? (
                      <button onClick={() => view.toggleSelect(item.id)} className="w-7 h-9 flex items-center justify-center flex-shrink-0" aria-label={isSel ? 'Quitar selección' : 'Seleccionar'}>
                        <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: isSel ? 'var(--accent)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'white' }}>{isSel && <Check size={13} />}</span>
                      </button>
                    ) : view.showHandles ? handle : <span className="w-1 flex-shrink-0" />}
                    <span className="w-4 text-center text-[10px] font-bold flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{index + 1}</span>
                    <button onClick={() => (view.selectMode ? view.toggleSelect(item.id) : setEditingId(item.id))} className="flex-1 text-left min-w-0">
                      <div className="font-semibold text-sm truncate">{isSong ? '🎵' : '🎤'} {item.title}</div>
                      <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {[sched.starts[index] ? `${sched.starts[index]}${mins > 0 ? ` · ${mins} min` : ''}` : (mins > 0 ? `${mins} min` : ''), item.person, isSong && tone ? `Tono ${tone}${item.transposition ? ` (${formatSemitones(item.transposition)})` : ''}` : '', item.text ? item.text.split('\n')[0] : ''].filter(Boolean).join(' · ') || (isSong ? song?.artist : 'Toca para agregar responsable o detalle')}
                      </div>
                    </button>
                    {!view.selectMode && song && (
                      <button onClick={() => view.toggleExpanded(item.id)} className="icon-btn icon-btn-sm" aria-label={isOpen ? 'Ocultar letra' : 'Ver letra aquí'} aria-expanded={isOpen} title={isOpen ? 'Ocultar letra' : 'Ver letra aquí'}>
                        <ChevronDown size={18} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                      </button>
                    )}
                    {!view.selectMode && <KebabMenu items={rowMenu} label="Opciones del elemento" small />}
                  </div>
                  {isOpen && song && !view.selectMode && <LyricPreview song={song} transposition={item.transposition} />}
                </div>
              );
            }}
          />
        </>
      )}

      {order.notes && (
        <div className="rounded-2xl p-3 text-sm" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>📝 {order.notes}</div>
      )}

      {view.selectMode && (
        <div className="fixed left-0 right-0 z-40 px-3" style={{ bottom: '76px' }}>
          <div className="max-w-xl mx-auto rounded-2xl p-2.5 flex items-center gap-2 shadow-2xl" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--accent)' }}>
            <span className="text-sm font-bold px-2" style={{ color: 'var(--accent)' }}>{selectedIds.length} sel.</span>
            <button className="btn btn-soft btn-sm" onClick={() => (selectedIds.length === allIds.length ? view.selectAll([]) : view.selectAll(allIds))}>{selectedIds.length === allIds.length ? 'Ninguno' : 'Todos'}</button>
            <div className="flex-1" />
            <button className="btn btn-danger btn-sm" disabled={selectedIds.length === 0} onClick={() => setConfirm({ kind: 'remove', ids: selectedIds })}><Trash2 size={14} /> Quitar</button>
            <button className="btn btn-soft btn-sm" onClick={view.exitSelect}>Listo</button>
          </div>
        </div>
      )}

      {showPicker && <SongPicker title="Agregar canciones" addedIds={new Set<string>()} onConfirm={addSongs} onAddExternal={addExternal} onClose={() => setShowPicker(false)} />}
      {changingId && (
        <SongPicker
          title="Cambiar canción"
          multi={false}
          onConfirm={([picked]) => {
            if (picked) patchItem(changingId, { songId: picked.id, title: picked.title, key: picked.key, transposition: 0 });
            setChangingId(null);
          }}
          onAddExternal={t => { patchItem(changingId, { songId: undefined, title: t, key: undefined, transposition: 0 }); setChangingId(null); }}
          onClose={() => setChangingId(null)}
        />
      )}
      {newText && (
        <ItemEditor
          item={newText}
          isNew
          onClose={() => setNewText(null)}
          onSave={patch => { save({ items: [...order.items, { ...newText, ...patch }] }); setNewText(null); showNotification('Momento agregado', 'success'); }}
        />
      )}
      {editing && (
        <ItemEditor
          item={editing}
          onChangeSong={isSongItem(editing) ? () => { setEditingId(null); setChangingId(editing.id); } : undefined}
          onClose={() => setEditingId(null)}
          onSave={patch => { patchItem(editing.id, patch); setEditingId(null); }}
        />
      )}
      {showMeta && (
        <OrderMetaModal
          title="Datos de la orden"
          confirmLabel="Guardar"
          initial={{ name: order.name, type: order.type, date: order.date, time: order.time || '', notes: order.notes || '' }}
          onClose={() => setShowMeta(false)}
          onSave={meta => { save({ name: meta.name, type: meta.type, date: meta.date, time: meta.time || undefined, notes: meta.notes || undefined }); setShowMeta(false); }}
        />
      )}
      {showShare && <ActionSheet title="Compartir orden" subtitle={order.name} actions={shareActions} onClose={() => setShowShare(false)} />}
      {showExport && <ActionSheet title="Exportar orden" subtitle="Las letras salen con los tonos de la orden" actions={exportActions} onClose={() => setShowExport(false)} />}

      {confirm && (
        <ConfirmModal
          title={confirm.kind === 'delete' ? '¿Eliminar esta orden?' : confirm.kind === 'clear' ? '¿Vaciar la orden?' : `¿Quitar ${confirm.ids.length} elemento${confirm.ids.length === 1 ? '' : 's'}?`}
          message={confirm.kind === 'delete'
            ? `Se eliminará la orden "${order.name}". Las canciones seguirán en tu cancionero.`
            : confirm.kind === 'clear'
            ? 'Se quitarán todos los elementos de esta orden.'
            : 'Se quitarán de la orden (las canciones siguen en tu cancionero).'}
          confirmLabel={confirm.kind === 'delete' ? 'Eliminar' : 'Quitar'}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.kind === 'delete') { removeOrder(order.id); showNotification('Orden eliminada', 'success'); onBack(); }
            else if (confirm.kind === 'clear') { save({ items: [] }); view.exitSelect(); showNotification('Orden vaciada', 'success'); }
            else removeItems(confirm.ids);
            setConfirm(null);
          }}
        />
      )}
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </svg>
  );
}
