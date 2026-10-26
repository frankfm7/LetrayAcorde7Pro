import { ChevronLeft } from 'lucide-react';
import { Hymnal, Song } from '../types';
import ExportModal from './ExportModal';
import { useState } from 'react';

interface HymnalSelectorProps {
  hymnals: Hymnal[];
  songs: Song[];
  onClose: () => void;
}

export default function HymnalSelector({ hymnals, songs, onClose }: HymnalSelectorProps) {
  const [selectedHymnal, setSelectedHymnal] = useState<Hymnal | null>(null);

  if (selectedHymnal) {
    const hymnalSongs = songs.filter(s => s.hymnalId === selectedHymnal.id);
    return (
      <ExportModal
        songs={hymnalSongs}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div 
        className="w-full max-w-lg rounded-t-3xl p-6 pb-8 animate-slide-up max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--card-bg)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onClose} className="p-2 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <ChevronLeft size={20} />
          </button>
          <h3 className="text-xl font-bold">Seleccionar cancionero</h3>
        </div>

        <div className="space-y-2">
          {hymnals.map(hymnal => {
            const hymnalSongs = songs.filter(s => s.hymnalId === hymnal.id);
            return (
              <button
                key={hymnal.id}
                onClick={() => setSelectedHymnal(hymnal)}
                className="w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.02] flex items-center gap-3"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="text-3xl">{hymnal.icon}</div>
                <div className="flex-1">
                  <div className="font-semibold">{hymnal.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {hymnalSongs.length} canción{hymnalSongs.length !== 1 ? 'es' : ''}
                  </div>
                </div>
              </button>
            );
          })}
          {hymnals.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hay cancioneros disponibles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
