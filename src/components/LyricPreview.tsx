import { useMemo } from 'react';
import { Song } from '../types';
import { transposeLyrics } from '../utils/chords';
import { parseLyricRows } from '../utils/exportImage';

/** Vista previa de la letra (con acordes alineados) para mostrarla dentro de una lista u orden. */
export default function LyricPreview({ song, transposition = 0 }: { song: Song; transposition?: number }) {
  const rows = useMemo(() => {
    const lyrics = transposition ? transposeLyrics(song.lyrics || '', transposition) : song.lyrics || '';
    return parseLyricRows(lyrics);
  }, [song.lyrics, transposition]);

  if (rows.length === 0) {
    return <p className="text-xs italic px-1 py-2" style={{ color: 'var(--text-muted)' }}>Esta canción no tiene letra.</p>;
  }

  return (
    <div
      className="mt-2 rounded-xl p-3 overflow-auto"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', maxHeight: '20rem' }}
      translate="no"
    >
      <div style={{ fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre', width: 'max-content', minWidth: '100%' }}>
        {rows.map((r, i) => {
          if (r.type === 'blank') return <div key={i} style={{ height: '0.6em' }} />;
          if (r.type === 'section') return <div key={i} className="font-extrabold mt-1" style={{ color: 'var(--gold)', fontFamily: 'inherit' }}>{r.text}</div>;
          if (r.type === 'chords') return <div key={i} className="font-extrabold" style={{ color: 'var(--accent)', lineHeight: 1.25 }}>{r.text || ' '}</div>;
          return <div key={i} className="font-semibold">{r.text}</div>;
        })}
      </div>
    </div>
  );
}
