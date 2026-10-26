import { useState } from 'react';
import { ChevronLeft, Search, CheckSquare, Square } from 'lucide-react';
import { Song } from '../types';
import ExportModal from './ExportModal';

interface MultiSongSelectorProps {
  songs: Song[];
  onClose: () => void;
}

export default function MultiSongSelector({ songs, onClose }: MultiSongSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
  const [showExport, setShowExport] = useState(false);

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSong = (songId: string) => {
    if (selectedSongs.includes(songId)) {
      setSelectedSongs(selectedSongs.filter(id => id !== songId));
    } else {
      setSelectedSongs([...selectedSongs, songId]);
    }
  };

  const selectAll = () => {
    if (selectedSongs.length === filteredSongs.length) {
      setSelectedSongs([]);
    } else {
      setSelectedSongs(filteredSongs.map(s => s.id));
    }
  };

  if (showExport) {
    const songsToExport = songs.filter(s => selectedSongs.includes(s.id));
    return (
      <ExportModal
        songs={songsToExport}
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
          <h3 className="text-xl font-bold flex-1">Seleccionar canciones</h3>
          <button 
            onClick={selectAll}
            className="px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
          >
            {selectedSongs.length === filteredSongs.length ? 'Deseleccionar' : 'Seleccionar todo'}
          </button>
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

        <div className="space-y-2 mb-4">
          {filteredSongs.map(song => {
            const isSelected = selectedSongs.includes(song.id);
            return (
              <button
                key={song.id}
                onClick={() => toggleSong(song.id)}
                className="w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3"
                style={{ 
                  borderColor: isSelected ? 'var(--accent)' : 'var(--border-color)',
                  backgroundColor: isSelected ? 'var(--accent-light)' : 'var(--bg-secondary)'
                }}
              >
                {isSelected ? (
                  <CheckSquare size={20} style={{ color: 'var(--accent)' }} />
                ) : (
                  <Square size={20} style={{ color: 'var(--text-muted)' }} />
                )}
                <div className="flex-1">
                  <div className="font-semibold text-sm">{song.title}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{song.artist}</div>
                </div>
              </button>
            );
          })}
          {filteredSongs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No se encontraron canciones</p>
            </div>
          )}
        </div>

        {selectedSongs.length > 0 && (
          <button
            onClick={() => setShowExport(true)}
            className="w-full py-3 rounded-xl text-sm font-bold"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
          >
            Exportar {selectedSongs.length} canción{selectedSongs.length > 1 ? 'es' : ''}
          </button>
        )}
      </div>
    </div>
  );
}
