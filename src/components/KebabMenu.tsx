import { ReactNode, useState } from 'react';
import { MoreVertical } from 'lucide-react';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Línea separadora antes de este elemento */
  separator?: boolean;
}

interface Props {
  items: MenuItem[];
  label?: string;
  small?: boolean;
}

/** Botón de tres puntos (⋮) con un menú desplegable. */
export default function KebabMenu({ items, label = 'Más opciones', small }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`icon-btn ${small ? 'icon-btn-sm' : ''}`}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
      >
        <MoreVertical size={small ? 16 : 18} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 z-50 rounded-2xl overflow-hidden shadow-2xl"
            style={{ minWidth: '14rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
          >
            {items.map((it, i) => (
              <div key={i}>
                {it.separator && <div style={{ height: 1, backgroundColor: 'var(--border-color)' }} />}
                <button
                  type="button"
                  role="menuitem"
                  disabled={it.disabled}
                  onClick={() => { setOpen(false); it.onClick(); }}
                  className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 transition-colors disabled:opacity-40"
                  style={{ color: it.danger ? '#ef4444' : 'var(--text-primary)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = it.danger ? 'rgba(239,68,68,.1)' : 'var(--accent-light)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                >
                  {it.icon && <span className="flex-shrink-0 opacity-80">{it.icon}</span>}
                  <span>{it.label}</span>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
