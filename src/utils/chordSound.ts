import type { ChordShape } from './chordShapes';
import { TUNINGS } from './chordShapes';

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** Cuerda pulsada (Karplus–Strong): suena parecido a una cuerda real de guitarra/ukulele. */
function pluck(ac: AudioContext, midi: number, when: number, dur = 2.2, gain = 0.28) {
  const sr = ac.sampleRate;
  const f = freq(midi);
  const period = Math.max(2, Math.round(sr / f));
  const n = Math.floor(sr * dur);
  const buf = ac.createBuffer(1, n, sr);
  const data = buf.getChannelData(0);
  const line = new Float32Array(period);
  for (let i = 0; i < period; i++) line[i] = Math.random() * 2 - 1;
  let p = 0;
  for (let i = 0; i < n; i++) {
    const cur = line[p];
    const next = line[(p + 1) % period];
    data[i] = cur;
    line[p] = (cur + next) * 0.5 * 0.9965;
    p = (p + 1) % period;
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.0008, when + dur);
  src.connect(g).connect(ac.destination);
  src.start(when);
}

/** Tecla de piano sencilla. */
function key(ac: AudioContext, midi: number, when: number, dur = 1.6, gain = 0.2) {
  const o1 = ac.createOscillator(); const o2 = ac.createOscillator();
  o1.type = 'triangle'; o2.type = 'sine';
  o1.frequency.value = freq(midi); o2.frequency.value = freq(midi) * 2;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0005, when + dur);
  o1.connect(g); o2.connect(g); g.connect(ac.destination);
  o1.start(when); o2.start(when); o1.stop(when + dur + 0.05); o2.stop(when + dur + 0.05);
}

/** Toca un acorde de cuerdas rasgueando de la cuerda grave a la aguda. */
export function playStrings(shape: ChordShape, instrument: 'guitar' | 'ukulele' | 'charango') {
  const ac = audio();
  if (!ac) return;
  const tuning = TUNINGS[instrument];
  const t0 = ac.currentTime + 0.03;
  let k = 0;
  shape.rows.forEach((r, i) => {
    if (r < 0 || i >= tuning.length) return;
    const fret = r === 0 ? 0 : shape.base + r - 1;
    pluck(ac, tuning[i] + fret, t0 + k * 0.045);
    k++;
  });
}

/** Toca las notas de un acorde en el piano (raíz en la octava central). */
export function playPiano(notes: number[], bass: number | null) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + 0.03;
  const base = 48;
  let prev = -1;
  if (bass !== null) { key(ac, 36 + bass, t0); }
  notes.forEach((pc, i) => {
    let m = base + pc;
    while (m <= prev) m += 12;
    prev = m;
    key(ac, m, t0 + i * 0.03);
  });
}
