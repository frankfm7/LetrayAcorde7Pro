import { useState } from 'react';
import { Trash2, Edit3, Check } from 'lucide-react';
import { Hymnal, Song } from '../types';
import { useApp } from '../context/AppContext';
import { useNotification } from './NotificationProvider';
import { songs as defaultSongs, generateSongCode, getNextSongNumber } from '../data/songs';
import { uid } from '../utils/listUtils';
import { hymnalLabel, parseSections, orderToLabels } from '../utils/presentation';

import { KEY_OPTIONS_MAJOR, KEY_OPTIONS_MINOR } from '../utils/chords';
const KEYS = [...KEY_OPTIONS_MAJOR, ...KEY_OPTIONS_MINOR];
const PAGE = 25;

interface Props {
  previews: Partial<Song>[];
  onChange: (songs: Partial<Song>[]) => void;
  hymnal: Hymnal | undefined;
  /** De dónde vienen (archivo, imagen, página web…) */
  label: string;
  /** Texto que se agrega a las notas de cada canción importada (por ejemplo, la fuente) */
  extraNote?: string;
  onDone: () => void;
}

/** Revisa y corrige las canciones detectadas antes de guardarlas en un cancionero. Sirve para listas muy largas. */
export default function ParsedSongsReview({ previews, onChange, hymnal, label, extraNote, onDone }: Props) {
  const { addCustomSong, addMultipleCustomSongs, state } = useApp();
  const { showNotification } = useNotification();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [importing, setImporting] = useState(false);

  const update = (index: number, patch: Partial<Song>) => onChange(previews.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  const many = previews.length > 8;

  const handleImport = async () => {
    if (previews.length === 0) return;
    if (!hymnal) { showNotification('Elige un cancionero', 'error'); return; }
    setImporting(true);
    await new Promise(r => setTimeout(r, 30)); // deja pintar el aviso de "guardando"
    try {
      const created: Song[] = [];
      let nextNumber = getNextSongNumber(hymnal.id, [...defaultSongs, ...state.customSongs]);
      previews.forEach(p => {
        created.push({
          ...p,
          id: uid(),
          title: (p.title || '').trim() || 'Sin título',
          artist: (p.artist || '').trim() || 'Desconocido',
          number: nextNumber,
          code: generateSongCode(hymnal, nextNumber),
          hymnalId: hymnal.id,
          key: p.key || 'C',
          timeSignature: p.timeSignature || '4/4',
          bpm: p.bpm || 120,
          language: p.language || hymnal.language.split('/')[0] || 'Castellano',
          categories: p.categories || [],
          sections: p.sections || [],
          lyrics: p.lyrics || '',
          notes: [p.notes, extraNote].filter(Boolean).join(' · '),
        } as Song);
        nextNumber++;
      });
      if (created.length === 1) addCustomSong(created[0]);
      else addMultipleCustomSongs(created);
      showNotification(`${created.length} canción${created.length > 1 ? 'es' : ''} importada${created.length > 1 ? 's' : ''} a "${hymnal.name}"`, 'success');
      onDone();
    } catch {
      showNotification('No se pudo guardar. Prueba con menos canciones a la vez', 'error');
      setImporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
          {previews.length} canción{previews.length > 1 ? 'es' : ''} detectada{previews.length > 1 ? 's' : ''} ({label}). Revisa lo que haga falta antes de importar.
        </p>
      </div>

      {previews.slice(0, limit).map((preview, index) => {
        const editing = editingIndex === index;
        return (
          <div key={index} className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid ${editing ? 'var(--accent)' : 'var(--border-color)'}` }}>
            <div className="flex items-center gap-2">
              <span className="badge" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>#{index + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm truncate">{preview.title}</div>
                <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{preview.artist} · <span translate="no">Tono {preview.key} · {preview.timeSignature} · {preview.bpm} BPM</span></div>
                <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                  {[hymnalLabel(preview.hymnalDetail, preview.hymnalNumber), preview.language, (preview.categories || []).join(', ')].filter(Boolean).join(' · ')}
                  {preview.presentationOrder && preview.lyrics ? ` · Orden: ${orderToLabels(preview.presentationOrder.sections, parseSections(preview.lyrics))}` : ''}
                </div>
              </div>
              <button onClick={() => setEditingIndex(editing ? null : index)} className="icon-btn icon-btn-sm" aria-label={editing ? 'Terminar edición' : 'Editar'}>{editing ? <Check size={14} /> : <Edit3 size={14} />}</button>
              <button onClick={() => { onChange(previews.filter((_, i) => i !== index)); setEditingIndex(null); }} className="icon-btn icon-btn-sm icon-btn-danger" aria-label="Quitar de la importación"><Trash2 size={14} /></button>
            </div>

            {editing ? (
              <div className="space-y-2 mt-3">
                <input className="field" placeholder="Título" value={preview.title || ''} onChange={e => update(index, { title: e.target.value })} />
                <div className="grid grid-cols-3 gap-2">
                  <input className="field col-span-2" placeholder="Artista" value={preview.artist || ''} onChange={e => update(index, { artist: e.target.value })} />
                  <select className="field" value={preview.key || 'C'} onChange={e => update(index, { key: e.target.value })}>
                    {Array.from(new Set([...KEYS, preview.key || 'C'])).map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input className="field" placeholder="Detalle de Cancionero (ej: Himno Cala)" value={preview.hymnalDetail || ''} onChange={e => update(index, { hymnalDetail: e.target.value || undefined })} />
                  <input className="field" placeholder="Numeración propia (ej: N° 75)" value={preview.hymnalNumber || ''} onChange={e => update(index, { hymnalNumber: e.target.value || undefined })} />
                  <input className="field" placeholder="Idioma" value={preview.language || ''} onChange={e => update(index, { language: e.target.value })} />
                  <input className="field" placeholder="Categorías (separadas por coma)" value={(preview.categories || []).join(', ')} onChange={e => update(index, { categories: e.target.value.split(',').map(c => c.trim()).filter(Boolean) })} />
                </div>
                <textarea className="field font-mono" style={{ fontSize: '13px' }} rows={10} value={preview.lyrics || ''} onChange={e => update(index, { lyrics: e.target.value })} spellCheck={false} />
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Las líneas de acordes empiezan con // y se alinean sobre la letra.</p>
              </div>
            ) : !many ? (
              <div className="text-xs p-2 rounded-lg max-h-28 overflow-auto mt-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <pre className="font-mono text-[11px] whitespace-pre" translate="no">{(preview.lyrics || '').split('\n').slice(0, 8).join('\n')}{(preview.lyrics || '').split('\n').length > 8 ? '\n…' : ''}</pre>
              </div>
            ) : null}
          </div>
        );
      })}

      {previews.length > limit && (
        <button className="btn btn-soft btn-block" onClick={() => setLimit(l => l + PAGE)}>Mostrar más ({previews.length - limit} restantes)</button>
      )}

      <button onClick={handleImport} disabled={importing || previews.length === 0} className="btn btn-primary btn-block" style={{ padding: '.9rem' }}>
        {importing ? 'Guardando…' : <><Check size={16} /> Importar {previews.length} canción{previews.length > 1 ? 'es' : ''}</>}
      </button>
    </div>
  );
}
