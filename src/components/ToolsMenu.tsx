import { X, User, Download, Upload, Wrench, Search, BookMarked } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ToolsMenuProps {
  onClose: () => void;
  onNavigate: (page: string) => void;
  onExportClick: () => void;
  onImportClick: () => void;
  onProfileClick: () => void;
}

export default function ToolsMenu({ onClose, onNavigate, onExportClick, onImportClick, onProfileClick }: ToolsMenuProps) {
  const { user } = useAuth();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div 
        className="w-full max-w-lg rounded-t-3xl p-6 pb-8 animate-slide-up overflow-y-auto"
        style={{ backgroundColor: 'var(--card-bg)', maxHeight: '88vh', overscrollBehavior: 'contain' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Herramientas</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:opacity-70" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              onClose();
              onProfileClick();
            }}
            className="w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.02] flex items-center gap-4"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
              <User size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Ver perfil</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Información de tu cuenta</div>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onExportClick();
            }}
            className="w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.02] flex items-center gap-4"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
              <Upload size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Exportar</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Exportar canciones y datos</div>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onImportClick();
            }}
            className="w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.02] flex items-center gap-4"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
              <Download size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Importar</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Importar canciones desde archivos</div>
            </div>
          </button>

          {user && (
            <button
              onClick={() => {
                onClose();
                onNavigate('official');
              }}
              className="w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.02] flex items-center gap-4"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
                <BookMarked size={24} style={{ color: 'var(--accent)' }} />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Cancioneros Oficiales</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Cancioneros de la comunidad, solo lectura</div>
              </div>
            </button>
          )}

          <button
            onClick={() => {
              onClose();
              onNavigate('backgrounds');
            }}
            className="w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.02] flex items-center gap-4"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: 'var(--accent-light)' }}>🖼️</div>
            <div className="flex-1">
              <div className="font-semibold">Fondos de pantalla</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Imágenes para la app y las letras</div>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onNavigate('websearch');
            }}
            className="w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.02] flex items-center gap-4"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
              <Search size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Buscar en la web</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Letras y acordes de internet</div>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onNavigate('tools');
            }}
            className="w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.02] flex items-center gap-4"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
              <Wrench size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Más herramientas</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Metrónomo, afinador y más</div>
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 mt-6 rounded-xl text-sm font-bold"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
