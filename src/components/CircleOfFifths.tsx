import { useState } from 'react';

// Tonalidades mayores en orden de quintas (sentido horario desde arriba)
const MAJOR_ORDER = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db']);

const SEMITONE: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

const DEGREES: Array<{ roman: string; offset: number; quality: string }> = [
  { roman: 'I', offset: 0, quality: '' },
  { roman: 'ii', offset: 2, quality: 'm' },
  { roman: 'iii', offset: 4, quality: 'm' },
  { roman: 'IV', offset: 5, quality: '' },
  { roman: 'V', offset: 7, quality: '' },
  { roman: 'vi', offset: 9, quality: 'm' },
  { roman: 'vii°', offset: 11, quality: 'dim' },
];

function nameFor(semitone: number, useFlats: boolean): string {
  const i = ((semitone % 12) + 12) % 12;
  return useFlats ? FLAT_NAMES[i] : SHARP_NAMES[i];
}

export default function CircleOfFifths() {
  const [selected, setSelected] = useState('C');
  const useFlats = FLAT_KEYS.has(selected);
  const root = SEMITONE[selected];
  const idx = MAJOR_ORDER.indexOf(selected);
  const dominant = MAJOR_ORDER[(idx + 1) % 12];
  const subdominant = MAJOR_ORDER[(idx + 11) % 12];
  const relativeMinor = nameFor(root + 9, useFlats) + 'm';
  const chords = DEGREES.map(d => ({ ...d, chord: nameFor(root + d.offset, useFlats) + d.quality }));

  return (
    <div className="space-y-5" translate="no">
      <div className="text-center">
        <h3 className="text-lg font-bold mb-1">Círculo de Quintas</h3>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Toca una tonalidad para ver su relativa menor, sus vecinas y sus acordes</p>
      </div>

      <div className="relative w-full max-w-sm mx-auto aspect-square">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-28 h-28 rounded-full flex flex-col items-center justify-center text-center" style={{ backgroundColor: 'var(--accent)', color: 'white', boxShadow: '0 8px 24px color-mix(in srgb, var(--accent) 40%, transparent)' }}>
            <span className="text-2xl font-black leading-none">{selected}</span>
            <span className="text-[11px] opacity-90 mt-1">mayor</span>
            <span className="text-[11px] opacity-90">rel. {relativeMinor}</span>
          </div>
        </div>
        {MAJOR_ORDER.map((key, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x = 50 + 41 * Math.cos(angle);
          const y = 50 + 41 * Math.sin(angle);
          const isSel = key === selected;
          const isNeighbor = key === dominant || key === subdominant;
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              aria-label={`Tonalidad ${key}`}
              className="absolute w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold transition-all hover:scale-110"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: isSel ? 'var(--accent)' : isNeighbor ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                color: isSel ? 'white' : isNeighbor ? 'var(--accent)' : 'var(--text-primary)',
                border: `2px solid ${isSel || isNeighbor ? 'var(--accent)' : 'var(--border-color)'}`,
              }}
            >
              {key}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl p-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}><div style={{ color: 'var(--text-muted)' }}>Subdominante</div><div className="text-base font-bold">{subdominant}</div></div>
        <div className="rounded-xl p-2" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}><div>Tónica</div><div className="text-base font-bold">{selected}</div></div>
        <div className="rounded-xl p-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}><div style={{ color: 'var(--text-muted)' }}>Dominante</div><div className="text-base font-bold">{dominant}</div></div>
      </div>

      <div>
        <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Acordes de {selected} mayor</div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {chords.map(c => (
            <div key={c.roman} className="rounded-xl py-2 text-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>{c.roman}</div>
              <div className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{c.chord}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>Los acordes más usados en canciones de esta tonalidad suelen ser I, IV, V y vi.</p>
      </div>
    </div>
  );
}
