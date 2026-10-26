import { useCallback, useEffect, useState } from 'react';
import { BookMarked, ChevronLeft, Edit3, Plus, Trash2, X, Loader2 } from 'lucide-react';
import PageBack from '../components/PageBack';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useNotification } from '../components/NotificationProvider';
import { signInWithGoogle } from '../lib/auth';
import {
  OfficialHymnal, OfficialSong, OfficialSongInput,
  getOfficialHymnals, getOfficialSongs, createOfficialHymnal, renameOfficialHymnal, deleteOfficialHymnal,
  addOfficialSong, updateOfficialSong, deleteOfficialSong, officialToSong,
} from '../lib/officialHymnals';
import type { Song } from '../types';

interface Props {
  onSelectSong: (song: Song) => void;
}

const emptyForm: OfficialSongInput = { number: '', title: '', artist: '', chords: '', language: 'Castellano' };

/** Himnarios oficiales: los crea y edita solo el administrador; cualquier usuario con sesión los puede leer. */
export default function OfficialHymnalsPage({ onSelectSong }: Props) {
  const { user, loading: authLoading } = useAuth();
  // ¿Es administrador? Se consulta aquí mismo en la tabla `profiles` (columna is_admin)
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleError, setRoleError] = useState('');
  const { showNotification } = useNotification();

  const [hymnals, setHymnals] = useState<OfficialHymnal[]>([]);
  const [selected, setSelected] = useState<OfficialHymnal | null>(null);
  const [songs, setSongs] = useState<OfficialSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [hymnalModal, setHymnalModal] = useState<null | { id?: number; name: string }>(null);
  const [songModal, setSongModal] = useState<null | { id?: number; form: OfficialSongInput }>(null);
  const [confirm, setConfirm] = useState<null | { kind: 'hymnal'; item: OfficialHymnal } | { kind: 'song'; item: OfficialSong }>(null);
  const [busy, setBusy] = useState(false);

  const loadHymnals = useCallback(async () => {
    setLoading(true);
    try { setHymnals(await getOfficialHymnals()); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Error al cargar'); }
    finally { setLoading(false); }
  }, []);

  const loadSongs = useCallback(async (h: OfficialHymnal) => {
    setLoading(true);
    try { setSongs(await getOfficialSongs(h.id)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Error al cargar'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    if (!user) { setIsAdmin(false); setRoleError(''); return; }
    (async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
        if (!active) return;
        if (error) { setIsAdmin(false); setRoleError(error.message); return; }
        setIsAdmin(data?.is_admin === true);
        setRoleError(data ? '' : 'No existe una fila en profiles para tu usuario');
      } catch (e) {
        if (active) { setIsAdmin(false); setRoleError(e instanceof Error ? e.message : 'No se pudo verificar el rol'); }
      }
    })();
    return () => { active = false; };
  }, [user]);

  useEffect(() => { if (user) void loadHymnals(); }, [user, loadHymnals]);
  useEffect(() => { if (selected) void loadSongs(selected); else setSongs([]); }, [selected, loadSongs]);

  // botón atrás del celular: de las canciones vuelve a la lista de himnarios
  useEffect(() => {
    if (!selected) return;
    const h = (e: Event) => { e.preventDefault(); setSelected(null); };
    window.addEventListener('c7-back', h);
    return () => window.removeEventListener('c7-back', h);
  }, [selected]);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try { await fn(); showNotification(ok, 'success'); }
    catch (e) { showNotification(e instanceof Error ? e.message : 'Ocurrió un error', 'error'); }
    finally { setBusy(false); }
  };

  const saveHymnal = () => {
    const m = hymnalModal;
    if (!m || !m.name.trim()) return;
    void run(async () => {
      if (m.id) await renameOfficialHymnal(m.id, m.name); else await createOfficialHymnal(m.name);
      setHymnalModal(null);
      await loadHymnals();
      if (m.id && selected?.id === m.id) setSelected({ ...selected, name: m.name.trim() });
    }, m.id ? 'Himnario actualizado' : 'Himnario creado');
  };

  const saveSong = () => {
    const m = songModal;
    if (!m || !selected || !m.form.title.trim()) return;
    void run(async () => {
      if (m.id) await updateOfficialSong(m.id, m.form); else await addOfficialSong(selected.id, m.form);
      setSongModal(null);
      await loadSongs(selected);
    }, m.id ? 'Canción actualizada' : 'Canción agregada');
  };

  const doDelete = () => {
    const c = confirm;
    if (!c) return;
    void run(async () => {
      if (c.kind === 'hymnal') { await deleteOfficialHymnal(c.item.id); if (selected?.id === c.item.id) setSelected(null); setConfirm(null); await loadHymnals(); }
      else { await deleteOfficialSong(c.item.id); setConfirm(null); if (selected) await loadSongs(selected); }
    }, c.kind === 'hymnal' ? 'Himnario borrado' : 'Canción borrada');
  };

  const field = 'field';

  if (authLoading) return <p className="text-sm py-10 text-center" style={{ color: 'var(--text-muted)' }}>Cargando…</p>;

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold flex items-center"><PageBack />Himnarios Oficiales</h1>
        <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--border-color)' }}>
          <p className="font-bold mb-3" style={{ color: 'var(--accent)' }}>Inicia sesión para ver los himnarios oficiales</p>
          <button onClick={async () => { const err = await signInWithGoogle(); if (err) showNotification(err, 'error'); }} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700">Iniciar sesión con Google</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Encabezado */}
      <div className="flex items-center gap-2">
        {selected ? (
          <button onClick={() => setSelected(null)} className="icon-btn" aria-label="Volver a los himnarios"><ChevronLeft size={20} /></button>
        ) : null}
        <h1 className="text-2xl font-bold flex items-center flex-1 min-w-0 truncate">
          {!selected && <PageBack />}
          <span className="truncate">{selected ? selected.name : 'Himnarios Oficiales'}</span>
        </h1>
        {isAdmin && !selected && <button onClick={() => setHymnalModal({ name: '' })} className="btn btn-primary btn-sm"><Plus size={15} /> Nuevo himnario</button>}
        {isAdmin && selected && <button onClick={() => setSongModal({ form: { ...emptyForm } })} className="btn btn-primary btn-sm"><Plus size={15} /> Agregar canción</button>}
      </div>
      {isAdmin && selected && (
        <div className="flex gap-2">
          <button onClick={() => setHymnalModal({ id: selected.id, name: selected.name })} className="btn btn-soft btn-sm"><Edit3 size={14} /> Renombrar himnario</button>
          <button onClick={() => setConfirm({ kind: 'hymnal', item: selected })} className="btn btn-soft btn-sm" style={{ color: '#ef4444' }}><Trash2 size={14} /> Borrar himnario</button>
        </div>
      )}
      {!isAdmin && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Solo lectura: estos himnarios los mantiene el administrador.</p>}
      {roleError && <p className="text-xs text-red-500">No se pudo comprobar si eres administrador: {roleError}</p>}

      {error && <p className="text-sm text-red-500">No se pudo cargar: {error}</p>}
      {loading && <p className="text-sm py-6 flex items-center justify-center gap-2" style={{ color: 'var(--text-muted)' }}><Loader2 size={16} className="animate-spin" /> Cargando…</p>}

      {/* Lista de himnarios */}
      {!selected && !loading && (
        hymnals.length === 0 && !error ? (
          <div className="text-center py-12 rounded-3xl border border-dashed" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
            <BookMarked size={36} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aún no hay himnarios oficiales.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {hymnals.map(h => (
              <button key={h.id} onClick={() => setSelected(h)} className="w-full text-left p-4 rounded-2xl border flex items-center gap-3 surface-hover" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
                <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}><BookMarked size={22} /></span>
                <span className="font-bold flex-1 min-w-0 truncate">{h.name}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Ver ›</span>
              </button>
            ))}
          </div>
        )
      )}

      {/* Canciones del himnario */}
      {selected && !loading && (
        songs.length === 0 && !error ? (
          <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>Este himnario todavía no tiene canciones.</p>
        ) : (
          <div className="space-y-2">
            {songs.map(s => (
              <div key={s.id} className="flex items-center gap-2 p-3 rounded-2xl border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
                <button onClick={() => onSelectSong(officialToSong(s, selected.name))} className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    {s.number && <span className="badge" translate="no">N° {s.number}</span>}
                    <span className="font-bold text-sm truncate">{s.title}</span>
                  </div>
                  {s.artist && <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{s.artist}</div>}
                </button>
                {isAdmin && (
                  <>
                    <button onClick={() => setSongModal({ id: s.id, form: { number: s.number || '', title: s.title, artist: s.artist || '', chords: s.chords || s.lyrics || '', language: s.language || 'Castellano' } })} className="icon-btn icon-btn-sm" aria-label="Editar" title="Editar"><Edit3 size={15} /></button>
                    <button onClick={() => setConfirm({ kind: 'song', item: s })} className="icon-btn icon-btn-sm icon-btn-danger" aria-label="Borrar" title="Borrar"><Trash2 size={15} /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Nuevo / renombrar himnario */}
      {hymnalModal && (
        <div className="modal-overlay" onClick={() => setHymnalModal(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">{hymnalModal.id ? 'Renombrar himnario' : 'Nuevo himnario oficial'}</h3>
              <button onClick={() => setHymnalModal(null)} className="icon-btn icon-btn-sm" aria-label="Cerrar"><X size={16} /></button>
            </div>
            <input className={field} autoFocus placeholder="Ej: Himnario Bautista" value={hymnalModal.name} onChange={e => setHymnalModal({ ...hymnalModal, name: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') saveHymnal(); }} />
            <div className="flex gap-2 pt-3">
              <button className="btn btn-soft flex-1" onClick={() => setHymnalModal(null)}>Cancelar</button>
              <button className="btn btn-primary flex-1" disabled={busy || !hymnalModal.name.trim()} onClick={saveHymnal}>{busy ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Agregar / editar canción */}
      {songModal && (
        <div className="modal-overlay" onClick={() => setSongModal(null)}>
          <div className="modal-panel" style={{ maxHeight: '92dvh' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">{songModal.id ? 'Editar canción' : 'Agregar canción'}</h3>
              <button onClick={() => setSongModal(null)} className="icon-btn icon-btn-sm" aria-label="Cerrar"><X size={16} /></button>
            </div>
            <div className="space-y-3 overflow-y-auto pr-1">
              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-xs font-semibold mb-1 block">Número</label><input className={field} inputMode="numeric" placeholder="75" value={songModal.form.number} onChange={e => setSongModal({ ...songModal, form: { ...songModal.form, number: e.target.value } })} /></div>
                <div className="col-span-2"><label className="text-xs font-semibold mb-1 block">Título *</label><input className={field} value={songModal.form.title} onChange={e => setSongModal({ ...songModal, form: { ...songModal.form, title: e.target.value } })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs font-semibold mb-1 block">Artista</label><input className={field} value={songModal.form.artist} onChange={e => setSongModal({ ...songModal, form: { ...songModal.form, artist: e.target.value } })} /></div>
                <div><label className="text-xs font-semibold mb-1 block">Idioma</label><input className={field} value={songModal.form.language} onChange={e => setSongModal({ ...songModal, form: { ...songModal.form, language: e.target.value } })} /></div>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">Letra con acordes</label>
                <textarea className={`${field} font-mono`} rows={12} placeholder={'VERSO 1\n//D        A\nLetra de la canción'} value={songModal.form.chords} onChange={e => setSongModal({ ...songModal, form: { ...songModal.form, chords: e.target.value } })} />
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Los acordes van en una línea que empieza con // sobre la letra. La letra sola se guarda aparte automáticamente.</p>
              </div>
            </div>
            <div className="flex gap-2 pt-3">
              <button className="btn btn-soft flex-1" onClick={() => setSongModal(null)}>Cancelar</button>
              <button className="btn btn-primary flex-1" disabled={busy || !songModal.form.title.trim()} onClick={saveSong}>{busy ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmModal
          title={confirm.kind === 'hymnal' ? '¿Borrar este himnario?' : '¿Borrar esta canción?'}
          message={confirm.kind === 'hymnal' ? `Se borrará “${confirm.item.name}” con todas sus canciones para todos los usuarios.` : `Se borrará “${confirm.item.title}” para todos los usuarios.`}
          confirmLabel="Borrar"
          onCancel={() => setConfirm(null)}
          onConfirm={doDelete}
        />
      )}
    </div>
  );
}
