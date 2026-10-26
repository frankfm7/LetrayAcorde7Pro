import { useState } from 'react';
import { ChevronLeft, Search } from 'lucide-react';
import { Song } from '../types';
import ExportModal from './ExportModal';

interface SongSelectorModalProps {
  songs: Song[];
  onClose: () => void;
}

export default function SongSelectorModal({ songs, onClose }: SongSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedSong) {
    return (
      <ExportModal
        songs={[selectedSong]}
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
          <h3 className="text-xl font-bold">Seleccionar canción</h3>
        </div>

        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar canción..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          {filteredSongs.map(song => (
            <button
              key={song.id}
              onClick={() => setSelectedSong(song)}
              className="w-full p-3 rounded-xl border text-left transition-all hover:scale-[1.02]"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
            >
              <div className="font-semibold text-sm">{song.title}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{song.artist}</div>
            </button>
          ))}
          {filteredSongs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No se encontraron canciones</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
