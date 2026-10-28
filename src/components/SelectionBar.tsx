import { ReactNode } from 'react';
import { X } from 'lucide-react';

export interface SelectionAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface Props {
  count: number;
  total: number;
  onCancel: () => void;
  onToggleAll: () => void;
  actions: SelectionAction[];
}

/** Barra superior del modo selección: X para cancelar, contador y acciones para lo seleccionado. */
export default function SelectionBar({ count, total, onCancel, onToggleAll, actions }: Props) {
  return (
    <div className="sticky top-0 z-30 -mx-3 sm:mx-0 px-3 py-2 shadow-md sm:rounded-xl" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,.18)' }} aria-label="Cancelar selección" title="Cancelar selección"><X size={18} /></button>
        <div className="flex-1 min-w-0 font-bold text-sm truncate">{count} seleccionado{count === 1 ? '' : 's'}</div>
        <button onClick={onToggleAll} className="px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,.18)' }}>{count === total ? 'Ninguno' : 'Todos'}</button>
      </div>
      {actions.length > 0 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {actions.map(a => (
            <button
              key={a.label}
              onClick={a.onClick}
              disabled={a.disabled || count === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex-shrink-0 disabled:opacity-40"
              style={{ backgroundColor: a.danger ? '#ef4444' : 'rgba(255,255,255,.2)', color: 'white' }}
            >
              {a.icon}{a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
