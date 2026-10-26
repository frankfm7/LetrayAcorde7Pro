import PageBack from './PageBack';
import { useRef, useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { compressImageToDataUrl } from '../utils/imageUtils';
import { uid } from '../utils/listUtils';
import { useNotification } from './NotificationProvider';
import ConfirmModal from './ConfirmModal';
import { useBackgrounds, saveBackgrounds, MAX_BG_IMAGES, BgSettings, SongBgMode } from '../utils/backgroundStore';

/** Pantalla "Fondos": el usuario carga imágenes y elige dónde usarlas. */
export default function BackgroundsPage() {
  const s = useBackgrounds();
  const { showNotification } = useNotification();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const update = (patch: Partial<BgSettings>) => {
    if (!saveBackgrounds({ ...s, ...patch })) showNotification('No hay espacio para guardar. Quita alguna imagen.', 'error');
  };

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    let images = [...s.images];
    let added = 0;
    for (const file of Array.from(files)) {
      if (images.length >= MAX_BG_IMAGES) { showNotification(`Máximo ${MAX_BG_IMAGES} imágenes`, 'info'); break; }
      if (!file.type.startsWith('image/')) continue;
      try {
        const dataUrl = await compressImageToDataUrl(file, 1200, 0.78);
        images = [...images, { id: uid(), name: file.name.replace(/\.[^.]+$/, '').slice(0, 30) || 'Imagen', dataUrl }];
        added++;
      } catch {
        showNotification(`No se pudo cargar ${file.name}`, 'error');
      }
    }
    if (added > 0) {
      if (saveBackgrounds({ ...s, images })) showNotification(`${added} imagen${added > 1 ? 'es' : ''} agregada${added > 1 ? 's' : ''}`, 'success');
      else showNotification('No hay espacio para guardar tantas imágenes. Quita alguna e inténtalo de nuevo.', 'error');
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeImage = (id: string) => {
    update({
      images: s.images.filter(i => i.id !== id),
      appImageId: s.appImageId === id ? null : s.appImageId,
      songImageId: s.songImageId === id ? null : s.songImageId,
    });
    setToDelete(null);
  };

  const label = 'text-xs font-bold uppercase tracking-wide mb-2 block';
  const thumb = (id: string | null, active: boolean, onPick: () => void, name: string, url?: string) => (
    <button
      key={id || 'none'}
      onClick={onPick}
      className="relative rounded-xl overflow-hidden flex items-end justify-center transition-transform active:scale-95"
      style={{ width: '5.5rem', height: '4.2rem', border: `3px solid ${active ? 'var(--accent)' : 'var(--border-color)'}`, background: url ? `center / cover url("${url}")` : 'var(--bg-tertiary)' }}
      aria-label={name}
      title={name}
    >
      {active && <span className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent)', color: 'white' }}><Check size={12} /></span>}
      <span className="w-full text-[10px] font-bold px-1 py-0.5 truncate" style={{ backgroundColor: 'rgba(0,0,0,.55)', color: 'white' }}>{name}</span>
    </button>
  );

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-2xl font-bold flex items-center"><PageBack />Fondos de pantalla</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Carga tus imágenes y elige dónde usarlas. También sirven como fondo al exportar canciones como imagen.</p>
      </div>

      <section className="surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm">Mis imágenes ({s.images.length}/{MAX_BG_IMAGES})</span>
          <button className="btn btn-primary btn-sm" disabled={busy || s.images.length >= MAX_BG_IMAGES} onClick={() => fileRef.current?.click()}><Plus size={14} /> {busy ? 'Cargando…' : 'Agregar'}</button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
        </div>
        {s.images.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>Aún no cargaste imágenes. Las fotos se reducen solas para ocupar poco espacio.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {s.images.map(img => (
              <div key={img.id} className="relative">
                <div className="rounded-xl overflow-hidden" style={{ width: '5.5rem', height: '4.2rem', background: `center / cover url("${img.dataUrl}")`, border: '1px solid var(--border-color)' }} title={img.name} />
                <button onClick={() => setToDelete(img.id)} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center shadow" style={{ backgroundColor: '#ef4444', color: 'white' }} aria-label={`Eliminar ${img.name}`}><Trash2 size={12} /></button>
                <div className="text-[10px] mt-1 truncate" style={{ width: '5.5rem', color: 'var(--text-muted)' }}>{img.name}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="surface p-4 space-y-3">
        <span className={label} style={{ color: 'var(--text-muted)' }}>Fondo de la app (inicio, cancioneros, listas y órdenes)</span>
        <div className="flex flex-wrap gap-3">
          {thumb(null, s.appImageId === null, () => update({ appImageId: null }), 'Sin fondo')}
          {s.images.map(img => thumb(img.id, s.appImageId === img.id, () => update({ appImageId: img.id }), img.name, img.dataUrl))}
        </div>
      </section>

      <section className="surface p-4 space-y-3">
        <span className={label} style={{ color: 'var(--text-muted)' }}>Fondo al ver las letras</span>
        <select className="field" value={s.songMode} onChange={e => update({ songMode: e.target.value as SongBgMode })}>
          <option value="app">El mismo fondo de la app</option>
          <option value="hymnal">La portada de cada cancionero</option>
          <option value="image">Una imagen en especial</option>
          <option value="none">Sin fondo</option>
        </select>
        {s.songMode === 'image' && (
          <div className="flex flex-wrap gap-3">
            {s.images.length === 0 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Primero agrega una imagen arriba.</p>}
            {s.images.map(img => thumb(img.id, s.songImageId === img.id, () => update({ songImageId: img.id }), img.name, img.dataUrl))}
          </div>
        )}
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Cada cancionero puede tener su propio fondo: Editar cancionero → Fondos de pantalla.</p>
      </section>

      <section className="surface p-4 space-y-4">
        <span className={label} style={{ color: 'var(--text-muted)' }}>Legibilidad</span>
        <div>
          <div className="flex justify-between text-sm font-semibold mb-1"><span>Capa sobre la imagen</span><span style={{ color: 'var(--accent)' }}>{s.overlay}%</span></div>
          <input type="range" min={0} max={90} step={5} value={s.overlay} onChange={e => update({ overlay: Number(e.target.value) })} className="w-full accent-purple-600" aria-label="Capa sobre la imagen" />
          <div className="flex justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}><span>Imagen clara</span><span>Más texto legible</span></div>
        </div>
        <div>
          <div className="flex justify-between text-sm font-semibold mb-1"><span>Desenfoque</span><span style={{ color: 'var(--accent)' }}>{s.blur} px</span></div>
          <input type="range" min={0} max={12} step={1} value={s.blur} onChange={e => update({ blur: Number(e.target.value) })} className="w-full accent-purple-600" aria-label="Desenfoque" />
        </div>
      </section>

      {toDelete && (
        <ConfirmModal
          title="¿Eliminar esta imagen?"
          message="Se quitará de tus fondos. Los cancioneros que la usaban volverán al ajuste general."
          onCancel={() => setToDelete(null)}
          onConfirm={() => removeImage(toDelete)}
        />
      )}
    </div>
  );
}
