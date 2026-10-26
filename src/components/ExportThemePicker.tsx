import { Check } from 'lucide-react';
import { themeChoices } from '../utils/exportThemes';
import type { Hymnal } from '../types';
import { useBackgrounds } from '../utils/backgroundStore';

interface Props {
  value: string | undefined;
  onChange: (id: string) => void;
  color: string;
  image?: string | null;
}

/** Elige el fondo que usarán el PDF y la imagen al exportar canciones de este cancionero. */
export default function ExportThemePicker({ value, onChange, color, image }: Props) {
  // Se arma un cancionero "de muestra" para que las opciones reflejen el color y la portada actuales
  const sample = { id: 'sample', name: '', description: '', language: '', icon: '', color, isCustom: true, image: image || undefined } as Hymnal;
  const { images } = useBackgrounds();
  const choices = themeChoices(sample, images);
  const current = value || 'hymnal';

  return (
    <div>
      <label className="text-xs font-bold mb-1 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Fondo para exportar</label>
      <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>Se usa en el PDF y en la imagen de las canciones de este cancionero (puedes cambiarlo al exportar).</p>
      <div className="flex flex-wrap gap-2">
        {choices.map(c => {
          const active = current === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              title={c.name}
              aria-label={c.name}
              className="relative w-11 h-11 rounded-xl transition-transform hover:scale-110 flex items-center justify-center"
              style={{ background: c.preview, border: `3px solid ${active ? 'var(--accent)' : 'var(--border-color)'}`, boxShadow: active ? '0 0 0 2px var(--accent-light)' : 'none' }}
            >
              {active && <Check size={16} color={c.id === 'light' || c.id === 'cream' ? '#111827' : 'white'} />}
            </button>
          );
        })}
      </div>
      <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--accent)' }}>{choices.find(c => c.id === current)?.name}</p>
    </div>
  );
}
