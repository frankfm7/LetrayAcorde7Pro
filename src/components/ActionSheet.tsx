import { ReactNode } from 'react';
import { X } from 'lucide-react';

export interface SheetAction {
  icon: ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  danger?: boolean;
}

interface Props {
  title: string;
  subtitle?: string;
  actions: SheetAction[];
  onClose: () => void;
}

/** Hoja inferior con una lista de acciones (compartir, exportar, etc.). */
export default function ActionSheet({ title, subtitle, actions, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="text-lg font-bold truncate">{title}</h3>
            {subtitle && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className="icon-btn icon-btn-sm" aria-label="Cerrar"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto space-y-2 pb-2">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={a.onClick}
              className="w-full flex items-center gap-3 p-3 rounded-2xl text-left surface-hover"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: a.danger ? '#ef4444' : 'var(--text-primary)' }}
            >
              <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: a.danger ? 'rgba(239,68,68,.12)' : 'var(--accent-light)', color: a.danger ? '#ef4444' : 'var(--accent)' }}>{a.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{a.label}</span>
                {a.description && <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>{a.description}</span>}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
