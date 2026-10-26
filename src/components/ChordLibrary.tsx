import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import { Diagram, Piano, GUITAR, UKULELE, CHARANGO } from './ChordDiagram';
import { getChordShapes, getUkuleleShapesFor, getCharangoShapes, getPianoNotes, ChordShapes } from '../utils/chordShapes';
import { playStrings, playPiano } from '../utils/chordSound';
import { noteName } from '../utils/chords';

type Instrument = 'guitar' | 'ukulele' | 'charango' | 'piano';

const QUALITIES: Array<{ id: string; label: string; suffix: string }> = [
  { id: 'M', label: 'mayor', suffix: '' },
  { id: 'm', label: 'menor', suffix: 'm' },
  { id: '5', label: '5', suffix: '5' },
  { id: '6', label: '6', suffix: '6' },
  { id: 'm6', label: 'm6', suffix: 'm6' },
  { id: '7', label: '7', suffix: '7' },
  { id: 'maj7', label: 'maj7', suffix: 'maj7' },
  { id: 'm7', label: 'm7', suffix: 'm7' },
  { id: '7sus4', label: '7sus4', suffix: '7sus4' },
  { id: 'sus4', label: 'sus4', suffix: 'sus4' },
  { id: 'sus2', label: 'sus2', suffix: 'sus2' },
  { id: 'add9', label: 'add9', suffix: 'add9' },
  { id: '9', label: '9', suffix: '9' },
  { id: 'm9', label: 'm9', suffix: 'm9' },
  { id: 'maj9', label: 'maj9', suffix: 'maj9' },
  { id: 'dim', label: 'dim', suffix: 'dim' },
  { id: 'dim7', label: 'dim7', suffix: 'dim7' },
  { id: 'm7b5', label: 'm7b5', suffix: 'm7b5' },
  { id: 'aug', label: 'aug', suffix: 'aug' },
];

const ROOTS_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ROOTS_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const INSTRUMENTS: Array<{ id: Instrument; label: string }> = [
  { id: 'guitar', label: '🎸 Guitarra' }, { id: 'ukulele', label: 'Ukulele' }, { id: 'charango', label: 'Charango' }, { id: 'piano', label: '🎹 Piano' },
];

/** Biblioteca de acordes: eliges la nota y el tipo (mayor, menor, 7, maj7, sus…) y ves cómo se toca, con sonido. */
export default function ChordLibrary() {
  const [flats, setFlats] = useState(false);
  const [root, setRoot] = useState(0);
  const [quality, setQuality] = useState('M');
  const [instrument, setInstrument] = useState<Instrument>(() => {
    try { const v = localStorage.getItem('c7-chord-instrument'); return v === 'ukulele' || v === 'charango' || v === 'piano' ? v : 'guitar'; } catch { return 'guitar'; }
  });
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [root, quality, instrument]);
  const pick = (i: Instrument) => { setInstrument(i); try { localStorage.setItem('c7-chord-instrument', i); } catch { /* */ } };

  const suffix = QUALITIES.find(q => q.id === quality)?.suffix ?? '';
  const name = noteName(root, flats) + suffix;

  const data: ChordShapes | null = useMemo(() => {
    if (instrument === 'guitar') return getChordShapes(name);
    if (instrument === 'ukulele') return getUkuleleShapesFor(root, quality, name);
    if (instrument === 'charango') return getCharangoShapes(name);
    return null;
  }, [instrument, name, root, quality]);
  const piano = instrument === 'piano' ? getPianoNotes(name) : null;
  const count = data?.shapes.length || 0;
  const shape = data ? data.shapes[Math.min(idx, count - 1)] : null;

  const play = () => {
    if (piano) playPiano(piano.notes, piano.bass);
    else if (shape && instrument !== 'piano') playStrings(shape, instrument);
  };

  const chip = (active: boolean): React.CSSProperties => ({
    backgroundColor: active ? 'var(--accent)' : 'var(--bg-tertiary)', color: active ? 'white' : 'var(--text-primary)',
  });

  return (
    <div className="space-y-4" translate="no">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Biblioteca de acordes</h2>
        <button className="chip" data-active={flats} onClick={() => setFlats(f => !f)} title="Cambiar entre sostenidos (#) y bemoles (♭)">{flats ? '♭ bemoles' : '♯ sostenidos'}</button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(flats ? ROOTS_FLAT : ROOTS_SHARP).map((n, i) => (
          <button key={n} onClick={() => setRoot(i)} className="px-3.5 py-2 rounded-xl text-base font-black flex-shrink-0" style={chip(root === i)}>{n}</button>
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {QUALITIES.map(q => (
          <button key={q.id} onClick={() => setQuality(q.id)} className="px-3 py-1.5 rounded-xl text-sm font-bold flex-shrink-0" style={chip(quality === q.id)}>{q.label}</button>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        {INSTRUMENTS.map(i => (
          <button key={i.id} onClick={() => pick(i.id)} className="flex-1 py-1.5 rounded-lg text-[11px] font-bold" style={{ backgroundColor: instrument === i.id ? 'var(--card-bg)' : 'transparent', color: instrument === i.id ? 'var(--accent)' : 'var(--text-muted)' }}>{i.label}</button>
        ))}
      </div>

      <div className="text-center">
        <div className="text-4xl font-black" style={{ color: 'var(--accent)' }}>{name}</div>
        {piano && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Notas: {piano.notes.map(n => noteName(n, flats)).join(' · ')}</div>}
      </div>

      <div className="flex justify-center min-h-[12rem]">
        {piano ? <Piano notes={piano.notes} bass={piano.bass} flats={flats} />
          : shape ? <Diagram shape={shape} strings={instrument === 'ukulele' ? UKULELE : instrument === 'charango' ? CHARANGO : GUITAR} />
          : <p className="text-sm py-10" style={{ color: 'var(--text-muted)' }}>No tengo la digitación de este acorde en este instrumento.</p>}
      </div>
      {shape && <div className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>{shape.label}</div>}

      <div className="flex items-center justify-center gap-4">
        {count > 1 && <button onClick={() => setIdx(i => (i - 1 + count) % count)} className="icon-btn" aria-label="Posición anterior"><ChevronLeft size={18} /></button>}
        <button onClick={play} disabled={!shape && !piano} className="btn btn-primary"><Volume2 size={16} /> Escuchar</button>
        {count > 1 && <button onClick={() => setIdx(i => (i + 1) % count)} className="icon-btn" aria-label="Posición siguiente"><ChevronRight size={18} /></button>}
      </div>
      {count > 1 && <div className="flex justify-center gap-1.5">{data!.shapes.map((_, i) => <span key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: i === idx ? 'var(--accent)' : 'var(--border-color)' }} />)}</div>}
    </div>
  );
}
