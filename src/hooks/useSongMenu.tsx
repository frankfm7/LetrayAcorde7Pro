import { useCallback, useState } from 'react';
import { Edit3, Copy, Share2, Image as ImageIcon, UploadCloud, ListMusic, Music, Trash2, ArrowUpDown } from 'lucide-react';
import type { Song } from '../types';
import type { MenuItem } from '../components/KebabMenu';
import AddToListModal from '../components/AddToListModal';
import ConfirmModal from '../components/ConfirmModal';
import SendOfficialModal from '../components/SendOfficialModal';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useSongLibrary } from './useSongLibrary';
import { useNotification } from '../components/NotificationProvider';
import { generateSongShareText } from '../utils/shareUtils';
import { shareSongImages } from '../utils/exportImage';
import { copyToClipboard } from '../utils/listUtils';
import { transposeLyrics, transposeKey, parseKey, prefersFlats } from '../utils/chords';

export interface SongMenuContext {
  /** Editar la canción (solo cuando hay una sola seleccionada) */
  onEdit?: (song: Song) => void;
  /** Qué hace "Eliminar" (por defecto borra las canciones del cancionero) */
  onDelete?: (songs: Song[]) => void;
  deleteLabel?: string;
  deleteTitle?: string;
  deleteMessage?: string;
  /** Qué hace "Cambiar tono" (por defecto transpone la canción de forma permanente) */
  onTranspose?: (songs: Song[], semitones: number) => void;
  /** Opciones propias de la pantalla (antes de las comunes) */
  extra?: MenuItem[];
  /** Se llama después de una acción que termina la selección */
  afterAction?: () => void;
}

type Modal =
  | null
  | { kind: 'add'; tab: 'list' | 'order'; songs: Song[]; ctx: SongMenuContext }
  | { kind: 'transpose'; songs: Song[]; ctx: SongMenuContext }
  | { kind: 'official'; songs: Song[]; ctx: SongMenuContext }
  | { kind: 'delete'; songs: Song[]; ctx: SongMenuContext };

/**
 * Menú de 3 puntos que aparece SOLO en el modo selección (clic largo). Devuelve las opciones para las canciones
 * seleccionadas y las ventanas que esas opciones necesitan.
 */
export function useSongMenu() {
  const { removeMultipleCustomSongs, updateCustomSong } = useApp();
  const { isAdmin } = useAuth();
  const { hymnals } = useSongLibrary();
  const { showNotification } = useNotification();
  const [modal, setModal] = useState<Modal>(null);
  const [semis, setSemis] = useState(0);

  const buildMenu = useCallback((songs: Song[], ctx: SongMenuContext = {}): MenuItem[] => {
    const one = songs.length === 1;
    const none = songs.length === 0;
    const text = () => songs.map(generateSongShareText).join(`\n\n${'─'.repeat(24)}\n\n`);
    const items: MenuItem[] = [...(ctx.extra || [])];
    const std: MenuItem[] = [
      { label: 'Editar canción', icon: <Edit3 size={15} />, disabled: !one || !ctx.onEdit, onClick: () => { if (one && ctx.onEdit) ctx.onEdit(songs[0]); } },
      { label: 'Copiar letra y acordes', icon: <Copy size={15} />, disabled: none, onClick: async () => { showNotification((await copyToClipboard(text())) ? 'Letra y acordes copiados' : 'No se pudo copiar', 'success'); } },
      { label: 'Compartir como texto', icon: <Share2 size={15} />, disabled: none, onClick: async () => {
        try {
          if (navigator.share) await navigator.share({ title: one ? songs[0].title : `${songs.length} canciones`, text: text() });
          else showNotification((await copyToClipboard(text())) ? 'Texto copiado para compartir' : 'No se pudo copiar', 'success');
        } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) showNotification('No se pudo compartir', 'error'); }
      } },
      { label: 'Compartir como imagen', icon: <ImageIcon size={15} />, disabled: none, onClick: async () => {
        try {
          const r = await shareSongImages(songs, hymnals);
          if (r === 'downloaded') showNotification(one ? 'Imagen generada' : `${songs.length} imágenes generadas`, 'success');
        } catch (e) { showNotification(`No se pudo crear la imagen: ${e instanceof Error ? e.message : 'error'}`, 'error'); }
      } },
      ...(isAdmin ? [{ label: 'Enviar a la base oficial', icon: <UploadCloud size={15} />, disabled: none, onClick: () => setModal({ kind: 'official', songs, ctx }) }] : []),
      { label: 'Agregar a lista', icon: <ListMusic size={15} />, separator: true, disabled: none, onClick: () => setModal({ kind: 'add', tab: 'list', songs, ctx }) },
      { label: 'Agregar a orden', icon: <Music size={15} />, disabled: none, onClick: () => setModal({ kind: 'add', tab: 'order', songs, ctx }) },
      { label: 'Cambiar tono / transponer', icon: <ArrowUpDown size={15} />, disabled: none, onClick: () => { setSemis(0); setModal({ kind: 'transpose', songs, ctx }); } },
      { label: ctx.deleteLabel || 'Eliminar', icon: <Trash2 size={15} />, danger: true, separator: true, disabled: none, onClick: () => setModal({ kind: 'delete', songs, ctx }) },
    ];
    return [...items, ...std];
  }, [hymnals, isAdmin, showNotification]);

  const defaultTranspose = (songs: Song[], n: number) => {
    songs.forEach(s => {
      const target = parseKey(transposeKey(s.key, n));
      const flats = target ? prefersFlats(target) : undefined;
      updateCustomSong({
        ...s,
        key: transposeKey(s.key, n),
        lyrics: transposeLyrics(s.lyrics, n, flats),
        lyricsByLanguage: s.lyricsByLanguage ? Object.fromEntries(Object.entries(s.lyricsByLanguage).map(([l, t]) => [l, transposeLyrics(t, n, flats)])) : undefined,
      });
    });
  };

  const modals = (() => {
    if (!modal) return null;
    const close = () => setModal(null);
    if (modal.kind === 'add') {
      return <AddToListModal songs={modal.songs} initialTab={modal.tab} onClose={() => { close(); modal.ctx.afterAction?.(); }} showNotification={showNotification} />;
    }
    if (modal.kind === 'official') {
      return <SendOfficialModal songs={modal.songs} onClose={close} onDone={modal.ctx.afterAction} />;
    }
    if (modal.kind === 'delete') {
      const n = modal.songs.length;
      return (
        <ConfirmModal
          title={modal.ctx.deleteTitle || `¿Eliminar ${n} canción${n === 1 ? '' : 'es'}?`}
          message={modal.ctx.deleteMessage || 'Se quitarán de tu cancionero. Esta acción no se puede deshacer.'}
          confirmLabel="Eliminar"
          onCancel={close}
          onConfirm={() => {
            if (modal.ctx.onDelete) modal.ctx.onDelete(modal.songs);
            else { removeMultipleCustomSongs(modal.songs.map(s => s.id)); showNotification(`${n} canción${n === 1 ? '' : 'es'} eliminada${n === 1 ? '' : 's'}`, 'success'); }
            close();
            modal.ctx.afterAction?.();
          }}
        />
      );
    }
    // transponer
    const first = modal.songs[0];
    return (
      <div className="modal-overlay" style={{ zIndex: 80 }} onClick={close}>
        <div className="modal-panel" style={{ maxWidth: '22rem', display: 'block' }} onClick={e => e.stopPropagation()}>
          <h3 className="font-bold text-lg mb-1">Cambiar tono</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{modal.songs.length === 1 ? first.title : `${modal.songs.length} canciones`} · se sube o baja por semitonos</p>
          <div className="flex items-center gap-3 mb-2">
            <button className="icon-btn" onClick={() => setSemis(v => v - 1)} aria-label="Bajar un semitono">−</button>
            <div className="flex-1 text-center">
              <div className="text-3xl font-black" style={{ color: 'var(--accent)' }} translate="no">{modal.songs.length === 1 ? transposeKey(first.key, semis) : (semis > 0 ? `+${semis}` : semis)}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{semis === 0 ? 'tono actual' : `${semis > 0 ? '+' : ''}${semis} semitonos`}</div>
            </div>
            <button className="icon-btn" onClick={() => setSemis(v => v + 1)} aria-label="Subir un semitono">+</button>
          </div>
          <div className="flex gap-2 pt-3">
            <button className="btn btn-soft flex-1" onClick={close}>Cancelar</button>
            <button className="btn btn-primary flex-1" disabled={semis === 0} onClick={() => {
              (modal.ctx.onTranspose || defaultTranspose)(modal.songs, semis);
              showNotification('Tono cambiado', 'success');
              close();
              modal.ctx.afterAction?.();
            }}>Aplicar</button>
          </div>
        </div>
      </div>
    );
  })();

  return { buildMenu, modals };
}
