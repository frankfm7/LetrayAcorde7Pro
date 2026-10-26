interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmación propia (más segura y visible que la ventana del navegador) antes de borrar algo. */
export default function ConfirmModal({ title, message, confirmLabel = 'Eliminar', danger = true, onConfirm, onCancel }: Props) {
  return (
    <div className="modal-overlay" style={{ zIndex: 90 }} onClick={onCancel}>
      <div className="modal-panel" style={{ maxWidth: '24rem', display: 'block' }} onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>{message}</p>
        <div className="flex gap-2">
          <button className="btn btn-soft flex-1" onClick={onCancel} autoFocus>Cancelar</button>
          <button className={`btn flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`} style={danger ? { backgroundColor: '#ef4444', color: 'white' } : undefined} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
