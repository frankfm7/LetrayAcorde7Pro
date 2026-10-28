interface Props {
  detail: string;
  autoNumber: boolean;
  start: number;
  hideNumber?: boolean;
  onChange: (patch: { detail?: string; autoNumber?: boolean; start?: number; hideNumber?: boolean }) => void;
}

/** Detalle y numeración que se aplican a todas las canciones de este cancionero. */
export default function HymnalDefaultsPicker({ detail, autoNumber, start, hideNumber = false, onChange }: Props) {
  const field = 'w-full p-3 rounded-xl border text-sm';
  const style = { backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' };
  return (
    <div className="space-y-3">
      <label className="text-xs font-bold block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Detalle y numeración del cancionero</label>
      <div>
        <span className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Detalle para todas las canciones</span>
        <input type="text" className={field} style={style} maxLength={60} value={detail} onChange={e => onChange({ detail: e.target.value })} placeholder="Ej: Himnario Bautista, Himno Cala" />
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Se muestra junto al artista de cada canción que no tenga su propio detalle.</p>
      </div>
      <label className="flex items-start gap-3 text-sm cursor-pointer">
        <input type="checkbox" className="mt-1" checked={autoNumber} onChange={e => onChange({ autoNumber: e.target.checked })} />
        <span>
          Numerar las canciones automáticamente (N° 1, N° 2…)
          <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>Es la numeración propia: se muestra antes del título. Una canción con su propio número conserva el suyo.</span>
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm cursor-pointer">
        <input type="checkbox" className="mt-1" checked={!hideNumber} onChange={e => onChange({ hideNumber: !e.target.checked })} />
        <span>
          Mostrar la numeración propia de las canciones
          <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>Si lo desactivas, ninguna canción de este cancionero muestra su número propio (ni el automático ni el que trae el archivo importado).</span>
        </span>
      </label>
      {autoNumber && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">Empezar desde el</span>
          <input type="number" min={0} max={9999} className={field} style={{ ...style, width: '6rem' }} value={start} onChange={e => onChange({ start: Math.max(0, Math.min(9999, Math.round(Number(e.target.value) || 0))) })} />
        </div>
      )}
    </div>
  );
}
