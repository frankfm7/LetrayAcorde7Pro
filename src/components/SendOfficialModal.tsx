import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { Song } from '../types';
import { useNotification } from './NotificationProvider';
import { OfficialHymnal, OfficialSongInput, getOfficialHymnals, createOfficialHymnal, addOfficialSongsBulk } from '../lib/officialHymnals';

interface Props {
  songs: Song[];
  onClose: () => void;
  onDone?: () => void;
}

/** Convierte una canción de la app al formato de la base oficial (letra con acordes en `chords`). */
export function songToOfficialInput(song: Song): OfficialSongInput {
  const num = (/(\d+)/.exec(song.hymnalNumber || '') || [])[1] || (song.number !== undefined ? String(song.number) : '');
  const main = song.language.split('/')[0];
  return {
    number: num,
    title: song.title,
    artist: song.artist && song.artist !== 'Desconocido' ? song.artist : '',
    language: main || 'Castellano',
    chords: song.lyricsByLanguage?.[main] || song.lyrics,
  };
}

/** (Administrador) Sube las canciones elegidas a un cancionero oficial de Supabase, existente o nuevo. */
export default function SendOfficialModal({ songs, onClose, onDone }: Props) {
  const { showNotification } = useNotification();
  const [hymnals, setHymnals] = useState<OfficialHymnal[]>([]);
  const [target, setTarget] = useState<number | 'new' | ''>('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await getOfficialHymnals();
        if (!active) return;
        setHymnals(list);
        setTarget(list.length > 0 ? list[0].id : 'new');
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'No se pudieron cargar los cancioneros oficiales');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const send = async () => {
    if (target === '' || busy) return;
    setBusy(true);
    setError('');
    try {
      let hymnalId: number;
      if (target === 'new') {
        if (!newName.trim()) throw new Error('Escribe el nombre del nuevo cancionero');
        hymnalId = (await createOfficialHymnal(newName)).id;
      } else hymnalId = target;
      const n = await addOfficialSongsBulk(hymnalId, songs.map(songToOfficialInput));
      showNotification(`${n} canción${n === 1 ? '' : 'es'} enviada${n === 1 ? '' : 's'} a Cancioneros Oficiales`, 'success');
      onDone?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 80 }} onClick={() => { if (!busy) onClose(); }}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">Enviar a Cancioneros Oficiales</h3>
          <button onClick={onClose} disabled={busy} className="icon-btn icon-btn-sm" aria-label="Cerrar"><X size={16} /></button>
        </div>
        <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>{songs.length} canción{songs.length === 1 ? '' : 'es'} se subirán a la nube. Elige el cancionero oficial al que pertenecerán.</p>
        {loading ? (
          <p className="text-sm py-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}><Loader2 size={15} className="animate-spin" /> Cargando…</p>
        ) : (
          <div className="space-y-2">
            <select className="field" value={target} onChange={e => setTarget(e.target.value === 'new' ? 'new' : e.target.value === '' ? '' : Number(e.target.value))}>
              {hymnals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              <option value="new">➕ Crear un cancionero nuevo…</option>
            </select>
            {target === 'new' && <input className="field" autoFocus placeholder="Nombre del cancionero oficial" value={newName} onChange={e => setNewName(e.target.value)} />}
          </div>
        )}
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        <div className="flex gap-2 pt-3">
          <button className="btn btn-soft flex-1" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="btn btn-primary flex-1" onClick={send} disabled={busy || loading || target === ''}>{busy ? 'Enviando…' : 'Enviar'}</button>
        </div>
      </div>
    </div>
  );
}
