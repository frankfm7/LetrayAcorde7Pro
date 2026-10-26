import { X, Music, CheckSquare, BookOpen } from 'lucide-react';
import { Song, Hymnal } from '../types';

interface ExportOptionsProps {
  onClose: () => void;
  songs: Song[];
  hymnals: Hymnal[];
  onExportSingle: () => void;
  onExportMultiple: () => void;
  onExportHymnal: () => void;
}

export default function ExportOptions({ onClose, songs, hymnals, onExportSingle, onExportMultiple, onExportHymnal }: ExportOptionsProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div 
        className="w-full max-w-lg rounded-t-3xl p-6 pb-8 animate-slide-up"
        style={{ backgroundColor: 'var(--card-bg)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">¿Qué quieres exportar?</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:opacity-70" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={onExportSingle}
            className="w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.02] flex items-center gap-4"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
              <Music size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Exportar una canción</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Selecciona una canción específica</div>
            </div>
          </button>

          <button
            onClick={onExportMultiple}
            className="w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.02] flex items-center gap-4"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
              <CheckSquare size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Selección múltiple</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Exporta varias canciones a la vez</div>
            </div>
          </button>

          <button
            onClick={onExportHymnal}
            className="w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.02] flex items-center gap-4"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
              <BookOpen size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Exportar cancionero completo</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Todas las canciones de un cancionero</div>
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
