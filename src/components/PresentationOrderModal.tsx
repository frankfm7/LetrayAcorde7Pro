import { useState } from 'react';
import { X, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import {
  SectionInfo, SECTION_COLORS, defaultSequence,
  MIN_INTERVAL_SECONDS, MAX_INTERVAL_SECONDS, clampInterval,
} from '../utils/presentation';

interface Props {
  sections: SectionInfo[];
  initialSequence: string[];
  initialInterval: number;
  onSave: (sequence: string[], intervalSeconds: number) => void;
  onClose: () => void;
}

/** Ventana para elegir en qué orden se presentan las secciones de la canción y cuánto dura cada una. */
export default function PresentationOrderModal({ sections, initialSequence, initialInterval, onSave, onClose }: Props) {
  const [sequence, setSequence] = useState<string[]>(initialSequence);
  const [interval, setIntervalValue] = useState<number>(clampInterval(initialInterval));

  const byId = new Map(sections.map(s => [s.id, s] as [string, SectionInfo]));
  const colorOf = (s: SectionInfo) => SECTION_COLORS[s.type] || 'var(--accent)';

  const add = (id: string) => setSequence(seq => [...seq, id]);
  const remove = (index: number) => setSequence(seq => seq.filter((_, i) => i !== index));
  const move = (index: number, delta: number) =>
    setSequence(seq => {
      const target = index + delta;
      if (target < 0 || target >= seq.length) return seq;
      const next = [...seq];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const summary = sequence.map(id => byId.get(id)?.label || '?').join(' → ');

  return (
    <div className="modal-overlay" style={{ zIndex: 70 }} onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: '34rem', maxHeight: '92dvh' }} onClick={e => e.stopPropagation()} translate="no">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-lg font-bold">Configurar Orden de Presentación</h3>
          <button onClick={onClose} className="icon-btn icon-btn-sm" aria-label="Cerrar"><X size={16} /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1">
          {/* 1. Secciones disponibles */}
          <section>
            <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>1. Secciones de la canción</div>
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Toca una sección para agregarla al final de la secuencia. Puedes repetirla las veces que quieras.</p>
            <div className="flex flex-wrap gap-2">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => add(s.id)}
                  title={`Agregar ${s.name}`}
                  className="px-3.5 py-2 rounded-xl text-sm font-extrabold transition-transform active:scale-95 hover:scale-105"
                  style={{ backgroundColor: colorOf(s) + '22', color: colorOf(s), border: `1px solid ${colorOf(s)}55`, minWidth: '2.75rem' }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          {/* 2. Secuencia */}
          <section>
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>2. Secuencia de presentación</div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{sequence.length} paso{sequence.length === 1 ? '' : 's'}</span>
            </div>
            {sequence.length === 0 ? (
              <div className="rounded-xl p-4 text-center text-sm" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
                La secuencia está vacía. Toca las secciones de arriba o usa “Reiniciar a secuencia por defecto”.
              </div>
            ) : (
              <>
                <p className="text-xs mb-2 font-semibold" style={{ color: 'var(--accent)' }}>{summary}</p>
                <div className="space-y-1.5" style={{ maxHeight: '15rem', overflowY: 'auto' }}>
                  {sequence.map((id, i) => {
                    const s = byId.get(id);
                    if (!s) return null;
                    return (
                      <div key={`${id}-${i}`} className="flex items-center gap-2 p-1.5 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                        <span className="w-6 text-center text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold" style={{ backgroundColor: colorOf(s) + '22', color: colorOf(s) }}>{s.label}</span>
                        <span className="flex-1 min-w-0 text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{s.name}</span>
                        <button onClick={() => move(i, -1)} disabled={i === 0} className="icon-btn icon-btn-sm" aria-label="Subir"><ChevronUp size={16} /></button>
                        <button onClick={() => move(i, 1)} disabled={i === sequence.length - 1} className="icon-btn icon-btn-sm" aria-label="Bajar"><ChevronDown size={16} /></button>
                        <button onClick={() => remove(i)} className="icon-btn icon-btn-sm icon-btn-danger" aria-label="Quitar de la secuencia"><X size={16} /></button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* 3. Tiempo */}
          <section>
            <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>3. Tiempo por sección (segundos)</div>
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <div className="text-center mb-2">
                <span className="text-3xl font-black" style={{ color: 'var(--accent)' }}>{interval}</span>
                <span className="text-sm font-semibold ml-1" style={{ color: 'var(--text-muted)' }}>s</span>
              </div>
              <input
                type="range"
                min={MIN_INTERVAL_SECONDS}
                max={MAX_INTERVAL_SECONDS}
                step={1}
                value={interval}
                onChange={e => setIntervalValue(Number(e.target.value))}
                className="w-full accent-purple-600"
                aria-label="Tiempo por sección en segundos"
              />
              <div className="flex justify-between text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                <span>1 s · muy rápido</span>
                <span>50 s · muy lento</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {[3, 5, 8, 12, 20, 30, 40, 50].map(v => (
                  <button key={v} type="button" className="chip" data-active={interval === v} onClick={() => setIntervalValue(v)}>{v} s</button>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* 4. Acciones */}
        <div className="pt-3 mt-3 border-t space-y-2" style={{ borderColor: 'var(--border-color)' }}>
          <button className="btn btn-soft btn-block btn-sm" onClick={() => setSequence(defaultSequence(sections))}>
            <RotateCcw size={14} /> Reiniciar a secuencia por defecto
          </button>
          <div className="flex gap-2">
            <button className="btn btn-soft flex-1" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary flex-1" disabled={sequence.length === 0} onClick={() => onSave(sequence, interval)}>Guardar Orden</button>
          </div>
        </div>
      </div>
    </div>
  );
}
