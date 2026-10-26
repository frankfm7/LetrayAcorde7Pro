import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface QueueBarItem {
  title: string;
  kind: 'song' | 'text';
  time?: string;
}

interface Props {
  label: string;
  index: number;
  items: QueueBarItem[];
  onJump: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  /** En pantalla completa no hay menú inferior: la barra baja */
  compact?: boolean;
}

/** Barra flotante para recorrer una lista u orden: anterior, siguiente y salto directo a cualquier elemento. */
export default function QueueBar({ label, index, items, onJump, onPrev, onNext, onClose, compact }: Props) {
  const [open, setOpen] = useState(false);
  const total = items.length;
  const next = items[index + 1];

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div
            className="absolute left-3 rounded-2xl shadow-2xl overflow-hidden"
            style={{ bottom: compact ? '70px' : '136px', width: 'min(20rem, calc(100% - 1.5rem))', maxHeight: '55vh', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide border-b" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>{label}</div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(55vh - 2.5rem)' }}>
              {items.map((it, i) => (
                <button
                  key={i}
                  onClick={() => { setOpen(false); onJump(i); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm"
                  style={{ backgroundColor: i === index ? 'var(--accent-light)' : 'transparent', color: i === index ? 'var(--accent)' : 'var(--text-primary)', fontWeight: i === index ? 700 : 500 }}
                >
                  <span className="w-11 text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{it.time || i + 1}</span>
                  <span>{it.kind === 'song' ? '🎵' : '🎤'}</span>
                  <span className="truncate">{it.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div
        className="fixed z-40 left-3 flex items-center gap-1.5 p-1.5 rounded-2xl shadow-xl backdrop-blur-xl"
        style={{ bottom: compact ? '16px' : '80px', backgroundColor: 'color-mix(in srgb, var(--card-bg) 92%, transparent)', border: '1px solid var(--border-color)', maxWidth: 'calc(100% - 5.5rem)' }}
      >
        <button onClick={onPrev} disabled={index <= 0} className="icon-btn icon-btn-sm" aria-label="Anterior"><ChevronLeft size={18} /></button>
        <button onClick={() => setOpen(o => !o)} className="px-1 min-w-0 text-center" style={{ maxWidth: '9.5rem' }} title="Ver todo el programa">
          <div className="text-[11px] font-bold truncate" style={{ color: 'var(--accent)' }}>{label} ▾</div>
          <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
            {index + 1} de {total}{next ? ` · Sigue: ${next.title}` : ' · Último'}
          </div>
        </button>
        <button onClick={onNext} disabled={index >= total - 1} className="icon-btn icon-btn-sm" style={{ backgroundColor: index < total - 1 ? 'var(--accent)' : undefined, color: index < total - 1 ? 'white' : undefined }} aria-label="Siguiente"><ChevronRight size={18} /></button>
        <button onClick={onClose} className="icon-btn icon-btn-sm" aria-label="Terminar presentación"><X size={14} /></button>
      </div>
    </>
  );
}
