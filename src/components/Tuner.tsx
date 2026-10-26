import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Afinaciones (notas MIDI, de la cuerda 6 a la 1)                    */
/* ------------------------------------------------------------------ */
interface Tuning {
  id: string;
  name: string;
  midi: number[];
}

const TUNINGS: Tuning[] = [
  { id: 'standard', name: 'Estándar (E A D G B E)', midi: [40, 45, 50, 55, 59, 64] },
  { id: 'dropd', name: 'Drop D (D A D G B E)', midi: [38, 45, 50, 55, 59, 64] },
  { id: 'halfdown', name: 'Medio tono abajo (Eb)', midi: [39, 44, 49, 54, 58, 63] },
  { id: 'fulldown', name: 'Un tono abajo (D)', midi: [38, 43, 48, 53, 57, 62] },
  { id: 'dadgad', name: 'DADGAD', midi: [38, 45, 50, 55, 57, 62] },
  { id: 'openg', name: 'Open G (D G D G B D)', midi: [38, 43, 50, 55, 59, 62] },
  { id: 'opend', name: 'Open D (D A D F# A D)', midi: [38, 45, 50, 54, 57, 62] },
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_ES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

const midiToFreq = (midi: number, a4: number) => a4 * Math.pow(2, (midi - 69) / 12);
const freqToMidi = (freq: number, a4: number) => 69 + 12 * Math.log2(freq / a4);
const noteName = (midi: number) => NOTE_NAMES[((midi % 12) + 12) % 12];
const noteNameEs = (midi: number) => NOTE_ES[((midi % 12) + 12) % 12];
const octaveOf = (midi: number) => Math.floor(midi / 12) - 1;

/* ------------------------------------------------------------------ */
/*  Detección de tono (autocorrelación normalizada, estilo McLeod)     */
/* ------------------------------------------------------------------ */
function detectPitch(buf: Float32Array, sampleRate: number): number | null {
  const n = buf.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < 0.01) return null; // casi silencio

  const minLag = Math.max(2, Math.floor(sampleRate / 1000));
  const maxLag = Math.min(Math.floor(sampleRate / 60), Math.floor(n / 2) - 1);
  const w = n - maxLag - 2;
  const nsdf = new Float32Array(maxLag + 2);

  for (let lag = minLag - 1; lag <= maxLag + 1 && lag < n - 1; lag++) {
    let acf = 0;
    let m = 0;
    for (let i = 0; i < w; i++) {
      const a = buf[i];
      const b = buf[i + lag];
      acf += a * b;
      m += a * a + b * b;
    }
    nsdf[lag] = m > 0 ? (2 * acf) / m : 0;
  }

  // Busca los picos positivos después del primer cruce por cero
  let lag = minLag;
  while (lag < maxLag && nsdf[lag] > 0) lag++;
  const peaks: number[] = [];
  while (lag < maxLag) {
    while (lag < maxLag && nsdf[lag] <= 0) lag++;
    let bestVal = -1;
    let bestPos = -1;
    while (lag < maxLag && nsdf[lag] > 0) {
      if (nsdf[lag] > bestVal) {
        bestVal = nsdf[lag];
        bestPos = lag;
      }
      lag++;
    }
    if (bestPos > 0) peaks.push(bestPos);
  }
  if (peaks.length === 0) return null;

  let maxVal = 0;
  for (const p of peaks) if (nsdf[p] > maxVal) maxVal = nsdf[p];
  if (maxVal < 0.55) return null; // señal poco clara (ruido)

  const threshold = maxVal * 0.9;
  const pos = peaks.find(p => nsdf[p] >= threshold);
  if (pos === undefined || pos < 1) return null;

  // Interpolación parabólica para mayor precisión
  const a = nsdf[pos - 1];
  const b = nsdf[pos];
  const c = nsdf[pos + 1];
  const denom = a - 2 * b + c;
  const shift = denom !== 0 ? (a - c) / (2 * denom) : 0;
  const period = pos + Math.max(-1, Math.min(1, shift));
  const freq = sampleRate / period;
  return freq > 55 && freq < 1100 ? freq : null;
}

/* ------------------------------------------------------------------ */
/*  Aguja                                                              */
/* ------------------------------------------------------------------ */
const CX = 150;
const CY = 150;

function polar(angleDeg: number, r: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.sin(a), y: CY - r * Math.cos(a) };
}

function arcPath(a1: number, a2: number, r: number) {
  const p1 = polar(a1, r);
  const p2 = polar(a2, r);
  return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
}

const DEG_PER_CENT = 1.4; // ±50 centésimas = ±70°

function Gauge({ cents, active }: { cents: number; active: boolean }) {
  const clamped = Math.max(-50, Math.min(50, cents));
  const inTune = active && Math.abs(cents) <= 5;
  const near = active && Math.abs(cents) <= 15;
  const color = !active ? 'var(--text-muted)' : inTune ? '#22c55e' : near ? '#f59e0b' : '#ef4444';
  const ticks = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];

  return (
    <svg viewBox="0 0 300 175" className="w-full max-w-sm mx-auto" role="img" aria-label="Indicador de afinación">
      <path d={arcPath(-70, 70, 118)} fill="none" stroke="var(--bg-tertiary)" strokeWidth="14" strokeLinecap="round" />
      <path d={arcPath(-5 * DEG_PER_CENT, 5 * DEG_PER_CENT, 118)} fill="none" stroke="#22c55e" strokeOpacity={inTune ? 1 : 0.45} strokeWidth="14" />
      {ticks.map(t => {
        const ang = t * DEG_PER_CENT;
        const p1 = polar(ang, t === 0 ? 96 : 102);
        const p2 = polar(ang, 108);
        const lab = polar(ang, 86);
        return (
          <g key={t}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="var(--text-muted)" strokeWidth={t === 0 ? 3 : 1.5} />
            {t % 20 === 0 && (
              <text x={lab.x} y={lab.y + 3} textAnchor="middle" fontSize="10" fill="var(--text-muted)">{t}</text>
            )}
          </g>
        );
      })}
      <g className="tuner-needle" style={{ transform: `rotate(${(clamped * DEG_PER_CENT).toFixed(1)}deg)`, transformOrigin: `${CX}px ${CY}px` }}>
        <line x1={CX} y1={CY} x2={CX} y2={CY - 104} stroke={color} strokeWidth="4" strokeLinecap="round" />
      </g>
      <circle cx={CX} cy={CY} r="9" fill={color} />
      <text x="30" y="170" fontSize="11" fill="var(--text-muted)">♭ bajo</text>
      <text x="270" y="170" fontSize="11" fill="var(--text-muted)" textAnchor="end">alto ♯</text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Componente                                                         */
/* ------------------------------------------------------------------ */
interface Reading {
  freq: number;
  midi: number; // nota objetivo
  cents: number;
  stringIndex: number | null;
}

type Mode = 'auto' | 'chromatic';

const A4_KEY = 'c7-tuner-a4';
const TUNING_KEY = 'c7-tuner-tuning';

function loadNumber(key: string, fallback: number): number {
  try {
    const v = Number(localStorage.getItem(key));
    return v >= 415 && v <= 466 ? v : fallback;
  } catch {
    return fallback;
  }
}

export default function Tuner() {
  const [tuningId, setTuningId] = useState<string>(() => {
    try { return localStorage.getItem(TUNING_KEY) || 'standard'; } catch { return 'standard'; }
  });
  const [a4, setA4] = useState<number>(() => loadNumber(A4_KEY, 440));
  const [mode, setMode] = useState<Mode>('auto');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);

  const tuning = useMemo(() => TUNINGS.find(t => t.id === tuningId) || TUNINGS[0], [tuningId]);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const toneTimeoutRef = useRef<number | null>(null);
  const historyRef = useRef<number[]>([]);
  const lastHeardRef = useRef(0);
  // Valores actuales para el ciclo de detección (evita datos viejos dentro del intervalo)
  const settingsRef = useRef({ a4, mode, midi: tuning.midi });
  settingsRef.current = { a4, mode, midi: tuning.midi };

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new Ctor();
    }
    return ctxRef.current;
  }, []);

  const stopTone = useCallback(() => {
    if (toneTimeoutRef.current !== null) {
      window.clearTimeout(toneTimeoutRef.current);
      toneTimeoutRef.current = null;
    }
    if (oscRef.current) {
      try { oscRef.current.stop(); } catch { /* ya detenido */ }
      oscRef.current = null;
    }
    setPlayingIdx(null);
  }, []);

  const stopListening = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch { /* nada */ }
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    historyRef.current = [];
    setListening(false);
    setReading(null);
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    stopTone();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Tu navegador no permite usar el micrófono aquí. Abre la app con https:// o desde localhost.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const ctx = getCtx();
      if (ctx.state === 'suspended') await ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      source.connect(analyser);
      streamRef.current = stream;
      sourceRef.current = source;
      const buf = new Float32Array(analyser.fftSize);
      const sampleRate = ctx.sampleRate;

      timerRef.current = window.setInterval(() => {
        analyser.getFloatTimeDomainData(buf);
        const f = detectPitch(buf, sampleRate);
        const now = Date.now();
        if (f === null) {
          if (now - lastHeardRef.current > 900) {
            historyRef.current = [];
            setReading(null);
          }
          return;
        }
        lastHeardRef.current = now;
        const hist = historyRef.current;
        hist.push(f);
        if (hist.length > 5) hist.shift();
        const sorted = [...hist].sort((x, y) => x - y);
        const freq = sorted[Math.floor(sorted.length / 2)]; // mediana: evita saltos

        const { a4: ref, mode: m, midi: strings } = settingsRef.current;
        const midiFloat = freqToMidi(freq, ref);
        let target = Math.round(midiFloat);
        let stringIndex: number | null = null;
        if (m === 'auto') {
          let best = Infinity;
          strings.forEach((sm, i) => {
            const d = Math.abs(midiFloat - sm);
            if (d < best) { best = d; stringIndex = i; target = sm; }
          });
        }
        setReading({ freq, midi: target, cents: (midiFloat - target) * 100, stringIndex });
      }, 80);

      setListening(true);
    } catch (e) {
      const name = e instanceof DOMException ? e.name : '';
      setError(
        name === 'NotAllowedError'
          ? 'Permiso del micrófono denegado. Actívalo en los ajustes del navegador y vuelve a intentar.'
          : name === 'NotFoundError'
          ? 'No se encontró ningún micrófono.'
          : 'No se pudo iniciar el micrófono.'
      );
    }
  }, [getCtx, stopTone]);

  // Tono de referencia (para afinar de oído)
  const playTone = useCallback(async (idx: number) => {
    if (playingIdx === idx) { stopTone(); return; }
    stopTone();
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') await ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = midiToFreq(tuning.midi[idx], a4);
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(t + 3);
      oscRef.current = osc;
      setPlayingIdx(idx);
      toneTimeoutRef.current = window.setTimeout(() => { oscRef.current = null; setPlayingIdx(null); }, 3000);
    } catch {
      setError('No se pudo reproducir el tono.');
    }
  }, [a4, getCtx, playingIdx, stopTone, tuning.midi]);

  // Limpieza al salir de la pantalla
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      if (toneTimeoutRef.current !== null) window.clearTimeout(toneTimeoutRef.current);
      if (oscRef.current) { try { oscRef.current.stop(); } catch { /* nada */ } }
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (ctxRef.current) { ctxRef.current.close().catch(() => undefined); ctxRef.current = null; }
    };
  }, []);

  const changeTuning = (id: string) => {
    setTuningId(id);
    try { localStorage.setItem(TUNING_KEY, id); } catch { /* nada */ }
  };
  const changeA4 = (v: number) => {
    const next = Math.max(415, Math.min(466, v));
    setA4(next);
    try { localStorage.setItem(A4_KEY, String(next)); } catch { /* nada */ }
  };

  const cents = reading ? reading.cents : 0;
  const inTune = !!reading && Math.abs(cents) <= 5;
  const statusColor = !reading ? 'var(--text-muted)' : inTune ? '#22c55e' : Math.abs(cents) <= 15 ? '#f59e0b' : '#ef4444';
  const hint = !reading
    ? listening ? 'Toca una cuerda…' : 'Pulsa “Activar micrófono” y toca una cuerda'
    : inTune ? '¡Afinada!' : cents < 0 ? 'Muy baja → aprieta la clavija (sube)' : 'Muy alta → afloja la clavija (baja)';

  return (
    <div className="space-y-5" translate="no">
      <div className="text-center">
        <h3 className="text-lg font-bold">Afinador de guitarra</h3>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Escucha tu guitarra con el micrófono y te dice qué tan afinada está cada cuerda</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Afinación</label>
          <select className="field" value={tuningId} onChange={e => changeTuning(e.target.value)}>
            {TUNINGS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Frecuencia de La (A4)</label>
          <div className="flex items-center gap-2">
            <button className="icon-btn" onClick={() => changeA4(a4 - 1)} aria-label="Bajar A4">−</button>
            <div className="flex-1 text-center font-bold text-lg" style={{ color: 'var(--accent)' }}>{a4} Hz</div>
            <button className="icon-btn" onClick={() => changeA4(a4 + 1)} aria-label="Subir A4">+</button>
            {a4 !== 440 && <button className="chip" onClick={() => changeA4(440)}>440</button>}
          </div>
        </div>
      </div>

      <div className="flex gap-2 p-1 rounded-2xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        {([['auto', 'Cuerda automática'], ['chromatic', 'Cromático']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setMode(id)} className="flex-1 py-2 rounded-xl text-xs font-bold transition-all" style={{ backgroundColor: mode === id ? 'var(--card-bg)' : 'transparent', color: mode === id ? 'var(--accent)' : 'var(--text-muted)', boxShadow: mode === id ? 'var(--card-shadow)' : 'none' }}>{label}</button>
        ))}
      </div>

      <div className="rounded-3xl p-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <Gauge cents={cents} active={!!reading} />
        <div className="text-center -mt-2">
          <div className="flex items-baseline justify-center gap-1" style={{ color: statusColor }}>
            <span className="text-6xl font-black leading-none">{reading ? noteName(reading.midi) : '–'}</span>
            {reading && <span className="text-xl font-bold">{octaveOf(reading.midi)}</span>}
          </div>
          <div className="text-sm font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>
            {reading ? `${noteNameEs(reading.midi)} · ${reading.freq.toFixed(1)} Hz · ${cents > 0 ? '+' : ''}${cents.toFixed(0)} centésimas` : ' '}
          </div>
          <div className="text-sm font-bold mt-2 min-h-[1.25rem]" style={{ color: statusColor }}>{hint}</div>
        </div>
      </div>

      <div className="flex justify-center">
        {listening ? (
          <button className="btn btn-danger" onClick={stopListening}>⏹ Detener micrófono</button>
        ) : (
          <button className="btn btn-primary" onClick={startListening}>🎤 Activar micrófono</button>
        )}
      </div>

      {error && (
        <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', color: '#ef4444' }}>{error}</div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Cuerdas</span>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Toca una para oír su tono de referencia</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {tuning.midi.map((m, i) => {
            const detected = reading?.stringIndex === i;
            const playing = playingIdx === i;
            return (
              <button
                key={i}
                onClick={() => playTone(i)}
                className="rounded-2xl p-3 text-center transition-all"
                style={{
                  backgroundColor: detected ? 'color-mix(in srgb, ' + statusColor + ' 18%, var(--card-bg))' : playing ? 'var(--accent-light)' : 'var(--card-bg)',
                  border: `2px solid ${detected ? statusColor : playing ? 'var(--accent)' : 'var(--border-color)'}`,
                }}
              >
                <div className="text-2xl font-black">{noteName(m)}<span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{octaveOf(m)}</span></div>
                <div className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>{noteNameEs(m)}</div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{6 - i}ª · {midiToFreq(m, a4).toFixed(1)} Hz</div>
                {playing && <div className="text-[10px] font-bold" style={{ color: 'var(--accent)' }}>🔊 sonando</div>}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
        Consejo: afina en un lugar silencioso, toca una cuerda a la vez y deja que suene unos segundos.
      </p>
    </div>
  );
}
