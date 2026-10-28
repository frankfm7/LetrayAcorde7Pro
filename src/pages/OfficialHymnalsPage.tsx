import { useCallback, useEffect, useState } from 'react';
import { BookMarked, ChevronLeft, Edit3, Plus, Trash2, X, Loader2, Download, Upload, Languages, FolderInput, Check } from 'lucide-react';
import PageBack from '../components/PageBack';
import ConfirmModal from '../components/ConfirmModal';
import SelectionBar, { SelectionAction } from '../components/SelectionBar';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { useNotification } from '../components/NotificationProvider';
import { useLongPress } from '../hooks/useLongPress';
import { useSongLibrary } from '../hooks/useSongLibrary';
import { signInWithGoogle } from '../lib/auth';
import { readSongsFile } from '../utils/officialImport';
import { generateSongCode, getNextSongNumber, songs as defaultSongs } from '../data/songs';
import {
  OfficialHymnal, OfficialSong, OfficialSongInput,
  getOfficialHymnals, getOfficialSongs, createOfficialHymnal, renameOfficialHymnal, deleteOfficialHymnal,
  addOfficialSong, updateOfficialSong, deleteOfficialSong, officialToSong,
  addOfficialSongsBulk, updateOfficialSongsLanguage, moveOfficialSongs, deleteOfficialSongs,
} from '../lib/officialHymnals';
import type { Song } from '../types';

interface Props {
  onSelectSong: (song: Song) => void;
}

const emptyForm: OfficialSongInput = { number: '', title: '', artist: '', chords: '', language: 'Castellano' };
const LANGUAGES = ['Castellano', 'Aymara', 'Quechua', 'Inglés', 'Portugués'];

/** Cancioneros oficiales: los crea y edita solo el administrador; cualquier usuario con sesión los puede leer y descargar. */
export default function OfficialHymnalsPage({ onSelectSong }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { state, addMultipleCustomSongs } = useApp();
  const { hymnals: myHymnals } = useSongLibrary();
  const { showNotification } = useNotification();
  const longPress = useLongPress();

  // ¿Es administrador? Se consulta aquí mismo en la tabla `profiles` (columna is_admin)
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleError, setRoleError] = useState('');
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [adminSlow, setAdminSlow] = useState(false);
  const [adminTry, setAdminTry] = useState(0);

  const [hymnals, setHymnals] = useState<OfficialHymnal[]>([]);
  const [selected, setSelected] = useState<OfficialHymnal | null>(null);
  const [songs, setSongs] = useState<OfficialSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // selección múltiple
  const [selectMode, setSelectMode] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);

  const [hymnalModal, setHymnalModal] = useState<null | { id?: number; name: string }>(null);
  const [songModal, setSongModal] = useState<null | { id?: number; form: OfficialSongInput }>(null);
  const [confirm, setConfirm] = useState<null | { kind: 'hymnal'; item: OfficialHymnal } | { kind: 'song'; item: OfficialSong } | { kind: 'many' }>(null);
  const [busy, setBusy] = useState(false);

  // importación (administrador)
  const [importOpen, setImportOpen] = useState(false);
  const [importTarget, setImportTarget] = useState<number | ''>('');
  const [importPlan, setImportPlan] = useState<{ fileName: string; songs: OfficialSongInput[]; skipped: number } | null>(null);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [importError, setImportError] = useState('');

  // edición por lotes (administrador)
  const [batchModal, setBatchModal] = useState<null | 'language' | 'move'>(null);
  const [batchLanguage, setBatchLanguage] = useState('Castellano');
  const [batchTarget, setBatchTarget] = useState<number | ''>('');

  const [downloading, setDownloading] = useState(false);

  console.log('User ID:', user?.id); // temporal, para depurar

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
    const checkAdmin = async () => {
      if (!user?.id) { setIsAdmin(false); setRoleError(''); return; }
      setCheckingAdmin(true);
      setAdminSlow(false);
      setRoleError('');
      try {
        const { data, error: err } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
        if (!active) return;
        if (err) {
          console.error('Error al verificar admin:', err.message);
          setIsAdmin(false);
          setRoleError(err.message);
        } else if (data) {
          setIsAdmin(data.is_admin === true);
        } else {
          console.log('No se encontró perfil para user.id:', user.id);
          setIsAdmin(false);
          setRoleError('No se encontró tu perfil (si la fila existe en Supabase, falta la regla RLS que permita leerla)');
        }
      } catch (e) {
        console.error('Error:', e);
        if (active) setRoleError(e instanceof Error ? e.message : 'No se pudo verificar el rol');
      } finally {
        if (active) setCheckingAdmin(false);
      }
    };
    void checkAdmin();
    const slow = window.setTimeout(() => { if (active) setAdminSlow(true); }, 3000);
    return () => { active = false; window.clearTimeout(slow); };
  }, [user, adminTry]);

  useEffect(() => { if (user) void loadHymnals(); }, [user, loadHymnals]);
  useEffect(() => { setSelectMode(false); setPicked([]); if (selected) void loadSongs(selected); else setSongs([]); }, [selected, loadSongs]);

  // botón atrás del celular: primero sale de la selección y luego vuelve a la lista de cancioneros
  useEffect(() => {
    if (!selected && !selectMode) return;
    const h = (e: Event) => { e.preventDefault(); if (selectMode) { setSelectMode(false); setPicked([]); } else setSelected(null); };
    window.addEventListener('c7-back', h);
    return () => window.removeEventListener('c7-back', h);
  }, [selected, selectMode]);

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
    }, m.id ? 'Cancionero actualizado' : 'Cancionero creado');
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
      else if (c.kind === 'song') { await deleteOfficialSong(c.item.id); setConfirm(null); if (selected) await loadSongs(selected); }
      else { await deleteOfficialSongs(picked); setConfirm(null); setSelectMode(false); setPicked([]); if (selected) await loadSongs(selected); }
    }, c.kind === 'hymnal' ? 'Cancionero borrado' : c.kind === 'many' ? 'Canciones borradas' : 'Canción borrada');
  };

  /* ---------- selección ---------- */
  const togglePick = (id: number) => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));
  const startSelect = (id: number) => { if (!selectMode) { setSelectMode(true); setPicked([id]); } };

  /* ---------- descargar al aparato (localStorage) ---------- */
  const saveToDevice = async (list: OfficialSong[], hymnalName: string) => {
    if (list.length === 0) { showNotification('No hay canciones para guardar', 'info'); return; }
    const target = myHymnals.find(h => h.id === 'mis-canciones') || myHymnals[0];
    if (!target) { showNotification('No se encontró tu cancionero "Mis Canciones"', 'error'); return; }
    try {
      const have = new Set(state.customSongs.map(s => s.id));
      const fresh = list.filter(s => !have.has(`official-${s.id}`));
      let n = getNextSongNumber(target.id, [...defaultSongs, ...state.customSongs]);
      const created: Song[] = fresh.map(s => {
        const base = officialToSong(s, hymnalName, target.id);
        const song = { ...base, number: n, code: generateSongCode(target, n), notes: `Descargada del cancionero oficial: ${hymnalName}` };
        n++;
        return song;
      });
      if (created.length > 0) addMultipleCustomSongs(created);
      showNotification(
        created.length === 0 ? 'Ya tenías todas estas canciones en "Mis Canciones"'
          : `${created.length} canción${created.length === 1 ? '' : 'es'} guardada${created.length === 1 ? '' : 's'} en "Mis Canciones"${fresh.length < list.length ? ` (${list.length - fresh.length} ya estaban)` : ''}`,
        created.length === 0 ? 'info' : 'success',
      );
    } catch (e) {
      showNotification(`No se pudieron guardar: ${e instanceof Error ? e.message : 'error'}`, 'error');
    }
  };

  const downloadAll = async () => {
    if (!selected || downloading) return;
    setDownloading(true);
    try {
      // se vuelve a pedir la lista completa para tener todas las canciones al día
      const all = await getOfficialSongs(selected.id);
      await saveToDevice(all, selected.name);
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'No se pudo descargar el cancionero', 'error');
    } finally {
      setDownloading(false);
    }
  };

  /* ---------- importación ---------- */
  const openImport = () => { setImportOpen(true); setImportTarget(selected?.id ?? ''); setImportPlan(null); setImportProgress(null); setImportError(''); };

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    setImportError('');
    setImportPlan(null);
    try {
      const r = await readSongsFile(file);
      if (r.songs.length === 0) throw new Error('No se encontró ninguna canción con título en el archivo');
      setImportPlan({ fileName: file.name, songs: r.songs, skipped: r.skipped });
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'No se pudo leer el archivo');
    }
  };

  const runImport = async () => {
    if (!importPlan || importTarget === '') return;
    setBusy(true);
    setImportError('');
    setImportProgress({ done: 0, total: importPlan.songs.length });
    try {
      const n = await addOfficialSongsBulk(Number(importTarget), importPlan.songs, (done, total) => setImportProgress({ done, total }));
      showNotification(`${n} canciones importadas`, 'success');
      setImportOpen(false);
      setImportPlan(null);
      if (selected && selected.id === Number(importTarget)) await loadSongs(selected);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'No se pudo importar');
      if (selected) await loadSongs(selected);
    } finally {
      setBusy(false);
    }
  };

  const applyBatch = () => {
    if (!batchModal || picked.length === 0) return;
    void run(async () => {
      if (batchModal === 'language') await updateOfficialSongsLanguage(picked, batchLanguage);
      else if (batchTarget !== '') await moveOfficialSongs(picked, Number(batchTarget));
      setBatchModal(null);
      setSelectMode(false);
      setPicked([]);
      if (selected) await loadSongs(selected);
    }, batchModal === 'language' ? 'Idioma actualizado' : 'Canciones movidas');
  };

  const field = 'field';

  if (authLoading) return <p className="text-sm py-10 text-center" style={{ color: 'var(--text-muted)' }}>Cargando…</p>;

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold flex items-center"><PageBack />Cancioneros Oficiales</h1>
        <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--border-color)' }}>
          <p className="font-bold mb-3" style={{ color: 'var(--accent)' }}>Inicia sesión para ver los cancioneros oficiales</p>
          <button onClick={async () => { const err = await signInWithGoogle(); if (err) showNotification(err, 'error'); }} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700">Iniciar sesión con Google</button>
        </div>
      </div>
    );
  }

  const pickedSongs = songs.filter(s => picked.includes(s.id));
  const selectionActions: SelectionAction[] = [
    { label: 'Guardar en mi aparato', icon: <Download size={14} />, onClick: () => { if (selected) void saveToDevice(pickedSongs, selected.name).then(() => { setSelectMode(false); setPicked([]); }); } },
    ...(isAdmin ? [
      { label: 'Cambiar idioma', icon: <Languages size={14} />, onClick: () => setBatchModal('language') },
      { label: 'Mover a otro cancionero', icon: <FolderInput size={14} />, onClick: () => { setBatchTarget(''); setBatchModal('move'); } },
      { label: 'Eliminar', icon: <Trash2 size={14} />, danger: true, onClick: () => setConfirm({ kind: 'many' }) },
    ] : []),
  ];

  return (
    <div className="space-y-4 pb-6">
      {selectMode && selected && (
        <SelectionBar
          count={picked.length}
          total={songs.length}
          onCancel={() => { setSelectMode(false); setPicked([]); }}
          onToggleAll={() => setPicked(picked.length === songs.length ? [] : songs.map(s => s.id))}
          actions={selectionActions}
        />
      )}

      {/* Encabezado */}
      <div className="flex items-center gap-2">
        {selected ? (
          <button onClick={() => setSelected(null)} className="icon-btn" aria-label="Volver a los cancioneros"><ChevronLeft size={20} /></button>
        ) : null}
        <h1 className="text-2xl font-bold flex items-center flex-1 min-w-0 truncate">
          {!selected && <PageBack />}
          <span className="truncate">{selected ? selected.name : 'Cancioneros Oficiales'}</span>
        </h1>
        {isAdmin && !selected && <button onClick={() => setHymnalModal({ name: '' })} className="btn btn-primary btn-sm"><Plus size={15} /> Nuevo cancionero</button>}
        {isAdmin && selected && <button onClick={() => setSongModal({ form: { ...emptyForm } })} className="btn btn-primary btn-sm"><Plus size={15} /> Agregar canción</button>}
      </div>

      {isAdmin && (
        <button onClick={openImport} className="btn btn-gold btn-block" style={{ padding: '0.9rem 1rem', fontSize: '1rem' }}><Upload size={18} /> Importar a la base de datos</button>
      )}

      {selected && (
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadAll} disabled={downloading || loading} className="btn btn-primary btn-sm">{downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Descargar cancionero completo</button>
          {isAdmin && <button onClick={() => setHymnalModal({ id: selected.id, name: selected.name })} className="btn btn-soft btn-sm"><Edit3 size={14} /> Renombrar cancionero</button>}
          {isAdmin && <button onClick={() => setConfirm({ kind: 'hymnal', item: selected })} className="btn btn-soft btn-sm" style={{ color: '#ef4444' }}><Trash2 size={14} /> Borrar cancionero</button>}
        </div>
      )}
      {!isAdmin && !checkingAdmin && !roleError && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Solo lectura: estos cancioneros los mantiene el administrador. Mantén presionada una canción para seleccionar varias.</p>}
      {isAdmin && selected && !selectMode && songs.length > 0 && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Mantén presionada una canción para seleccionar varias y editarlas por lotes.</p>}
      {checkingAdmin && (
        <p className="text-xs flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={13} className="animate-spin" /> Verificando…
          {adminSlow && <button onClick={() => setAdminTry(n => n + 1)} className="btn btn-soft btn-sm">Reintentar</button>}
        </p>
      )}
      {!checkingAdmin && roleError && (
        <p className="text-xs text-red-500 flex items-center gap-2 flex-wrap">
          <span>No se pudo comprobar si eres administrador: {roleError}</span>
          <button onClick={() => setAdminTry(n => n + 1)} className="btn btn-soft btn-sm">Reintentar</button>
        </p>
      )}

      {error && <p className="text-sm text-red-500">No se pudo cargar: {error}</p>}
      {loading && <p className="text-sm py-6 flex items-center justify-center gap-2" style={{ color: 'var(--text-muted)' }}><Loader2 size={16} className="animate-spin" /> Cargando…</p>}

      {/* Lista de cancioneros */}
      {!selected && !loading && (
        hymnals.length === 0 && !error ? (
          <div className="text-center py-12 rounded-3xl border border-dashed" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
            <BookMarked size={36} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aún no hay cancioneros oficiales.</p>
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

      {/* Canciones del cancionero */}
      {selected && !loading && (
        songs.length === 0 && !error ? (
          <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>Este cancionero todavía no tiene canciones.</p>
        ) : (
          <div className="space-y-2">
            {songs.map(s => {
              const isPicked = picked.includes(s.id);
              return (
                <div
                  key={s.id}
                  {...longPress(() => startSelect(s.id))}
                  className="flex items-center gap-2 p-3 rounded-2xl border"
                  style={{ backgroundColor: isPicked ? 'var(--accent-light)' : 'var(--card-bg)', borderColor: isPicked ? 'var(--accent)' : 'var(--border-color)', boxShadow: 'var(--card-shadow)', WebkitTouchCallout: 'none', userSelect: 'none' }}
                >
                  {selectMode && (
                    <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isPicked ? 'var(--accent)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'white' }}>{isPicked && <Check size={14} />}</span>
                  )}
                  <button onClick={() => (selectMode ? togglePick(s.id) : onSelectSong(officialToSong(s, selected.name)))} className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      {s.number && <span className="badge" translate="no">N° {s.number}</span>}
                      <span className="font-bold text-sm truncate">{s.title}</span>
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{[s.artist, s.language && s.language !== 'Castellano' ? s.language : ''].filter(Boolean).join(' • ')}</div>
                  </button>
                  {isAdmin && !selectMode && (
                    <>
                      <button onClick={() => setSongModal({ id: s.id, form: { number: s.number || '', title: s.title, artist: s.artist || '', chords: s.chords || s.lyrics || '', language: s.language || 'Castellano' } })} className="icon-btn icon-btn-sm" aria-label="Editar" title="Editar"><Edit3 size={15} /></button>
                      <button onClick={() => setConfirm({ kind: 'song', item: s })} className="icon-btn icon-btn-sm icon-btn-danger" aria-label="Borrar" title="Borrar"><Trash2 size={15} /></button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Nuevo / renombrar cancionero */}
      {hymnalModal && (
        <div className="modal-overlay" onClick={() => setHymnalModal(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">{hymnalModal.id ? 'Renombrar cancionero' : 'Nuevo cancionero oficial'}</h3>
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

      {/* Importar a la base de datos (administrador) */}
      {importOpen && isAdmin && (
        <div className="modal-overlay" onClick={() => { if (!busy) setImportOpen(false); }}>
          <div className="modal-panel" style={{ maxHeight: '92dvh' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">Importar a la base de datos</h3>
              <button onClick={() => setImportOpen(false)} disabled={busy} className="icon-btn icon-btn-sm" aria-label="Cerrar"><X size={16} /></button>
            </div>
            <div className="space-y-3 overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Cancionero de destino</label>
                <select className={field} value={importTarget} onChange={e => setImportTarget(e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">— Elige un cancionero —</option>
                  {hymnals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>

              <button
                disabled={importTarget === ''}
                onClick={() => { const h = hymnals.find(x => x.id === Number(importTarget)); if (h) { setSelected(h); setImportOpen(false); setSongModal({ form: { ...emptyForm } }); } }}
                className="w-full text-left p-4 rounded-2xl border disabled:opacity-50" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="font-bold">A · Importar una canción</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Agrega una sola canción al cancionero elegido (se escribe en un formulario).</div>
              </button>

              <div className="p-4 rounded-2xl border" style={{ borderColor: 'var(--accent)', backgroundColor: 'var(--bg-secondary)' }}>
                <div className="font-bold">B · Importar cancionero completo</div>
                <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Sube un archivo con muchas canciones (título, artista, letra y acordes). Se guardan todas de una vez, sin límite de cantidad.</div>
                <label className={`btn btn-soft btn-block ${importTarget === '' ? 'opacity-50 pointer-events-none' : ''}`} style={{ cursor: 'pointer' }}>
                  <Upload size={16} /> {importPlan ? 'Elegir otro archivo' : 'Elegir archivo (.json, .txt o .csv)'}
                  <input type="file" accept=".json,.txt,.csv,.tsv,text/plain,application/json,text/csv" className="hidden" disabled={busy} onChange={e => { void onPickFile(e.target.files?.[0]); e.target.value = ''; }} />
                </label>
                {importPlan && (
                  <div className="mt-3 text-sm">
                    <div className="font-semibold">📄 {importPlan.fileName}</div>
                    <div style={{ color: 'var(--accent)' }}>Se encontraron <b>{importPlan.songs.length}</b> canciones{importPlan.skipped > 0 ? ` (${importPlan.skipped} filas sin título omitidas)` : ''}.</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Ej.: {importPlan.songs.slice(0, 3).map(s => `${s.number ? s.number + '. ' : ''}${s.title}`).join(' · ')}</div>
                    <button className="btn btn-primary btn-block mt-3" disabled={busy || importTarget === ''} onClick={runImport}>
                      {busy ? <><Loader2 size={15} className="animate-spin" /> Importando {importProgress ? `${importProgress.done}/${importProgress.total}` : '…'}</> : `Importar ${importPlan.songs.length} canciones`}
                    </button>
                    {importProgress && (
                      <div className="h-2 rounded-full overflow-hidden mt-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <div className="h-full" style={{ width: `${Math.round((importProgress.done / importProgress.total) * 100)}%`, backgroundColor: 'var(--accent)', transition: 'width .2s' }} />
                      </div>
                    )}
                  </div>
                )}
                <p className="text-[11px] mt-3" style={{ color: 'var(--text-muted)' }}>
                  JSON: lista de objetos con title, artist, lyrics, chords, number, language · CSV: primera fila con esos nombres · TXT: canciones separadas por ===== con “Título:”, “Artista:”…
                </p>
              </div>
              {importError && <p className="text-sm text-red-500">{importError}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Edición por lotes: idioma / mover */}
      {batchModal && (
        <div className="modal-overlay" onClick={() => setBatchModal(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">{batchModal === 'language' ? `Cambiar idioma a ${picked.length} canciones` : `Mover ${picked.length} canciones`}</h3>
              <button onClick={() => setBatchModal(null)} className="icon-btn icon-btn-sm" aria-label="Cerrar"><X size={16} /></button>
            </div>
            {batchModal === 'language' ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">{LANGUAGES.map(l => <button key={l} className="chip" data-active={batchLanguage === l} onClick={() => setBatchLanguage(l)}>{l}</button>)}</div>
                <input className={field} placeholder="O escribe otro idioma" value={batchLanguage} onChange={e => setBatchLanguage(e.target.value)} />
              </div>
            ) : (
              <select className={field} value={batchTarget} onChange={e => setBatchTarget(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">— Cancionero de destino —</option>
                {hymnals.filter(h => h.id !== selected?.id).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            )}
            <div className="flex gap-2 pt-3">
              <button className="btn btn-soft flex-1" onClick={() => setBatchModal(null)}>Cancelar</button>
              <button className="btn btn-primary flex-1" disabled={busy || (batchModal === 'language' ? !batchLanguage.trim() : batchTarget === '')} onClick={applyBatch}>{busy ? 'Aplicando…' : 'Aplicar'}</button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmModal
          title={confirm.kind === 'hymnal' ? '¿Borrar este cancionero?' : confirm.kind === 'many' ? `¿Borrar ${picked.length} canciones?` : '¿Borrar esta canción?'}
          message={confirm.kind === 'hymnal' ? `Se borrará “${confirm.item.name}” con todas sus canciones para todos los usuarios.` : confirm.kind === 'many' ? 'Se borrarán para todos los usuarios. No se puede deshacer.' : `Se borrará “${confirm.item.title}” para todos los usuarios.`}
          confirmLabel="Borrar"
          onCancel={() => setConfirm(null)}
          onConfirm={doDelete}
        />
      )}
    </div>
  );
}
