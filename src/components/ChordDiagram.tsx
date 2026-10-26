import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getChordShapes, getUkuleleShapes, getCharangoShapes, getPianoNotes, ChordShape } from '../utils/chordShapes';
import { noteName } from '../utils/chords';
import { playStrings, playPiano } from '../utils/chordSound';
import { Volume2 } from 'lucide-react';

type Instrument = 'guitar' | 'ukulele' | 'charango' | 'piano';
export const GUITAR = ['E', 'A', 'D', 'G', 'B', 'e'];
export const UKULELE = ['G', 'C', 'E', 'A'];
export const CHARANGO = ['G', 'C', 'E', 'A', 'E'];

export function Diagram({ shape, strings }: { shape: ChordShape; strings: string[] }) {
  const STRINGS = strings;
  const n = strings.length - 1;
  const W = 150, H = 170, left = 28, right = 14, top = 32, bottom = 14;
  const sx = (W - left - right) / n;
  const rows = 5;
  const sy = (H - top - bottom) / rows;
  const x = (i: number) => left + i * sx;
  const y = (r: number) => top + (r - 0.5) * sy;
  const ink = 'var(--text-primary)';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 220 }} role="img" aria-label="Diagrama de acorde de guitarra">
      {/* cejuela o número de traste inicial */}
      {shape.base === 1
        ? <rect x={left - 1} y={top - 3} width={W - left - right + 2} height={4} rx={1} fill={ink} />
        : <text x={4} y={y(1) + 4} fontSize={11} fontWeight={700} fill="var(--accent)">{shape.base}ª</text>}
      {Array.from({ length: rows + 1 }, (_, r) => <line key={r} x1={left} x2={W - right} y1={top + r * sy} y2={top + r * sy} stroke="var(--text-muted)" strokeWidth={1} />)}
      {STRINGS.map((_, i) => <line key={i} x1={x(i)} x2={x(i)} y1={top} y2={top + rows * sy} stroke="var(--text-muted)" strokeWidth={1.2} />)}
      {shape.barre && shape.barre.to > shape.barre.from && (
        <rect x={x(shape.barre.from) - 6} y={y(1) - 6} width={x(shape.barre.to) - x(shape.barre.from) + 12} height={12} rx={6} fill="var(--accent)" />
      )}
      {shape.rows.map((r, i) => {
        if (r === -1) return <text key={i} x={x(i)} y={top - 9} fontSize={12} textAnchor="middle" fill="var(--text-muted)">×</text>;
        if (r === 0) return <circle key={i} cx={x(i)} cy={top - 12} r={4} fill="none" stroke={ink} strokeWidth={1.5} />;
        const inBarre = shape.barre && r === 1 && i >= shape.barre.from && i <= shape.barre.to;
        return inBarre ? null : <circle key={i} cx={x(i)} cy={y(r)} r={6.5} fill="var(--accent)" />;
      })}
      {STRINGS.map((s, i) => <text key={i} x={x(i)} y={H - 1} fontSize={8} textAnchor="middle" fill="var(--text-muted)">{s}</text>)}
    </svg>
  );
}

const WHITE = [0, 2, 4, 5, 7, 9, 11];
const BLACK: Array<[number, number]> = [[1, 0.65], [3, 1.65], [6, 3.65], [8, 4.65], [10, 5.65]];

export function Piano({ notes, bass, flats }: { notes: number[]; bass: number | null; flats: boolean }) {
  const kw = 20, kh = 80, octaves = 2;
  const W = kw * 7 * octaves;
  const on = (pc: number) => notes.includes(pc) || pc === bass;
  return (
    <svg viewBox={`0 0 ${W} ${kh + 22}`} width="100%" style={{ maxWidth: 300 }} role="img" aria-label="Acorde en el piano">
      {Array.from({ length: 7 * octaves }, (_, i) => {
        const pc = WHITE[i % 7];
        return (
          <g key={i}>
            <rect x={i * kw} y={0} width={kw} height={kh} fill={on(pc) ? 'var(--accent)' : '#fff'} stroke="#334155" strokeWidth={1} />
            {on(pc) && i < 7 && <text x={i * kw + kw / 2} y={kh + 14} fontSize={9} textAnchor="middle" fill="var(--text-primary)" fontWeight={700}>{noteName(pc, flats)}</text>}
          </g>
        );
      })}
      {Array.from({ length: octaves }, (_, o) => BLACK.map(([pc, pos]) => (
        <g key={`${o}-${pc}`}>
          <rect x={(o * 7 + pos) * kw + kw * 0.12} y={0} width={kw * 0.76} height={kh * 0.6} fill={on(pc) ? 'var(--accent)' : '#111827'} stroke="#000" strokeWidth={0.5} />
          {on(pc) && o === 0 && <text x={(o * 7 + pos) * kw + kw / 2 + kw * 0.12 - kw * 0.12} y={kh + 14} fontSize={9} textAnchor="middle" fill="var(--text-primary)" fontWeight={700}>{noteName(pc, flats)}</text>}
        </g>
      )))}
    </svg>
  );
}

const INSTRUMENTS: Array<{ id: Instrument; label: string }> = [
  { id: 'guitar', label: '🎸 Guitarra' },
  { id: 'ukulele', label: 'Ukulele' },
  { id: 'charango', label: 'Charango' },
  { id: 'piano', label: '🎹 Piano' },
];

/** Ventana con el acorde para guitarra, ukulele o piano (se abre con doble clic sobre el acorde de la letra). */
export default function ChordDiagram({ chord, onClose }: { chord: string; onClose: () => void }) {
  const [instrument, setInstrument] = useState<Instrument>(() => {
    try { const v = localStorage.getItem('c7-chord-instrument'); return v === 'ukulele' || v === 'charango' || v === 'piano' ? v : 'guitar'; } catch { return 'guitar'; }
  });
  const choose = (i: Instrument) => { setInstrument(i); try { localStorage.setItem('c7-chord-instrument', i); } catch { /* */ } };
  const data = instrument === 'guitar' ? getChordShapes(chord) : instrument === 'ukulele' ? getUkuleleShapes(chord) : instrument === 'charango' ? getCharangoShapes(chord) : null;
  const piano = instrument === 'piano' ? getPianoNotes(chord) : null;
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [chord, instrument]);
  const count = data?.shapes.length || 0;
  const flats = /b/.test(chord.slice(0, 2));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div className="w-full max-w-xs rounded-2xl p-4" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', boxShadow: '0 20px 50px rgba(0,0,0,.4)' }} onClick={e => e.stopPropagation()} translate="no">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-black" style={{ color: 'var(--accent)' }}>{chord}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }} aria-label="Cerrar"><X size={16} /></button>
        </div>
        <div className="flex gap-1 p-1 rounded-xl mb-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          {INSTRUMENTS.map(i => (
            <button key={i.id} onClick={() => choose(i.id)} className="flex-1 py-1.5 rounded-lg text-[11px] font-bold" style={{ backgroundColor: instrument === i.id ? 'var(--card-bg)' : 'transparent', color: instrument === i.id ? 'var(--accent)' : 'var(--text-muted)' }}>{i.label}</button>
          ))}
        </div>
        {piano ? (
          <>
            <div className="flex justify-center"><Piano notes={piano.notes} bass={piano.bass} flats={flats} /></div>
            <p className="text-center text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Notas: {piano.notes.map(n => noteName(n, flats)).join(' · ')}{piano.bass !== null ? ` · bajo ${noteName(piano.bass, flats)}` : ''}</p>
            {piano.approx && <p className="text-[11px] text-center mt-1" style={{ color: 'var(--text-muted)' }}>Acorde simplificado (sin la extensión indicada).</p>}
          </>
        ) : data ? (
          <>
            <div className="flex justify-center"><Diagram shape={data.shapes[Math.min(idx, count - 1)]} strings={instrument === 'ukulele' ? UKULELE : instrument === 'charango' ? CHARANGO : GUITAR} /></div>
            <div className="text-center text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{data.shapes[Math.min(idx, count - 1)].label}</div>
            {count > 1 && (
              <div className="flex items-center justify-center gap-3 mt-2">
                <button onClick={() => setIdx(i => (i - 1 + count) % count)} className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }} aria-label="Posición anterior"><ChevronLeft size={16} /></button>
                <div className="flex gap-1.5">{data.shapes.map((_, i) => <span key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: i === idx ? 'var(--accent)' : 'var(--border-color)' }} />)}</div>
                <button onClick={() => setIdx(i => (i + 1) % count)} className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }} aria-label="Posición siguiente"><ChevronRight size={16} /></button>
              </div>
            )}
            {data.approx && <p className="text-[11px] text-center mt-2" style={{ color: 'var(--text-muted)' }}>Digitación simplificada (sin la extensión o el bajo indicado).</p>}
          </>
        ) : <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>No tengo el diagrama de este acorde para este instrumento.</p>}
        {(piano || data) && (
          <button className="btn btn-soft btn-block btn-sm mt-3" onClick={() => {
            if (piano) playPiano(piano.notes, piano.bass);
            else if (data && instrument !== 'piano') playStrings(data.shapes[Math.min(idx, count - 1)], instrument);
          }}><Volume2 size={15} /> Escuchar</button>
        )}
      </div>
    </div>
  );
}
