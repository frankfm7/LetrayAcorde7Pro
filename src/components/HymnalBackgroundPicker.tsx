import { useBackgrounds } from '../utils/backgroundStore';

interface Props {
  bgList: boolean;
  bgSong: string;
  hasCover: boolean;
  onChange: (patch: { bgList?: boolean; bgSong?: string }) => void;
}

/** Fondo de pantalla de este cancionero: para su lista de canciones y para las letras. */
export default function HymnalBackgroundPicker({ bgList, bgSong, hasCover, onChange }: Props) {
  const { images } = useBackgrounds();
  return (
    <div className="space-y-3">
      <label className="text-xs font-bold block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Fondos de pantalla</label>
      <label className="flex items-start gap-3 text-sm cursor-pointer" style={{ opacity: hasCover ? 1 : 0.5 }}>
        <input type="checkbox" className="mt-1" checked={bgList && hasCover} disabled={!hasCover} onChange={e => onChange({ bgList: e.target.checked })} />
        <span>
          Usar la portada como fondo de la lista de canciones de este cancionero
          {!hasCover && <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>Primero agrega una imagen de portada.</span>}
        </span>
      </label>
      <div>
        <span className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Fondo al ver las letras</span>
        <select className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} value={bgSong} onChange={e => onChange({ bgSong: e.target.value })}>
          <option value="inherit">Usar el ajuste general (Menú+ → Fondos)</option>
          <option value="cover" disabled={!hasCover}>La portada de este cancionero</option>
          <option value="app">El mismo fondo de la app</option>
          <option value="none">Sin fondo</option>
          {images.map(img => <option key={img.id} value={img.id}>Mi imagen: {img.name}</option>)}
        </select>
      </div>
    </div>
  );
}
