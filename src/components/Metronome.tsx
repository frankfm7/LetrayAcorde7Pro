import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Square, Volume2 } from 'lucide-react';

export default function Metronome() {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [timeSignature, setTimeSignature] = useState(4);
  const intervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioContextRef.current;
  }, []);

  const playSound = useCallback(() => {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = currentBeat === 0 ? 1200 : 800;
    oscillator.type = 'square';
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }, [currentBeat, getAudioContext]);

  const start = useCallback(() => {
    if (isPlaying) return;
    setIsPlaying(true);
    setCurrentBeat(0);
    playSound();
    intervalRef.current = window.setInterval(() => {
      setCurrentBeat(prev => (prev + 1) % timeSignature);
      playSound();
    }, 60000 / bpm);
  }, [bpm, isPlaying, timeSignature, playSound]);

  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setIsPlaying(false);
    setCurrentBeat(0);
  }, []);

  useEffect(() => {
    if (isPlaying) { stop(); setTimeout(start, 50); }
  }, [bpm, timeSignature]);

  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, []);

  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const handleTap = () => {
    const now = Date.now();
    const newTaps = [...tapTimes.filter(t => now - t < 3000), now];
    setTapTimes(newTaps);
    if (newTaps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTaps.length; i++) intervals.push(newTaps[i] - newTaps[i - 1]);
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const detectedBpm = Math.round(60000 / avgInterval);
      if (detectedBpm >= 40 && detectedBpm <= 200) setBpm(detectedBpm);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-bold mb-1">Metrónomo</h3>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Control preciso del tempo</p>
      </div>
      <div className="text-center">
        <div className="text-6xl font-bold font-mono" style={{ color: 'var(--accent)' }} translate="no">{bpm}</div>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }} translate="no">BPM</div>
      </div>
      <div className="flex justify-center gap-3">
        {Array.from({ length: timeSignature }).map((_, i) => (
          <div key={i} className={`metro-dot ${isPlaying && currentBeat === i ? 'active' : ''}`} style={{ backgroundColor: isPlaying && currentBeat === i ? 'var(--gold)' : i === 0 ? 'var(--accent)' : 'var(--bg-tertiary)', opacity: isPlaying && currentBeat === i ? 1 : 0.5 }} />
        ))}
      </div>
      <input type="range" min="40" max="200" value={bpm} onChange={e => setBpm(Number(e.target.value))} className="w-full accent-purple-600" />
      <div className="flex justify-center gap-4">
        <button onClick={() => setBpm(b => Math.max(40, b - 5))} className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold" style={{ backgroundColor: 'var(--bg-tertiary)' }} translate="no">-5</button>
        <button onClick={() => setBpm(b => Math.max(40, b - 1))} className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold" style={{ backgroundColor: 'var(--bg-tertiary)' }} translate="no">-1</button>
        <button onClick={() => setBpm(b => Math.min(200, b + 1))} className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold" style={{ backgroundColor: 'var(--bg-tertiary)' }} translate="no">+1</button>
        <button onClick={() => setBpm(b => Math.min(200, b + 5))} className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold" style={{ backgroundColor: 'var(--bg-tertiary)' }} translate="no">+5</button>
      </div>
      <div className="flex justify-center">
        <button onClick={isPlaying ? stop : start} className="w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95" style={{ backgroundColor: isPlaying ? '#ef4444' : 'var(--accent)', color: 'white', boxShadow: `0 4px 20px ${isPlaying ? 'rgba(239,68,68,0.4)' : 'rgba(124,58,237,0.4)'}` }}>
          {isPlaying ? <Square size={28} /> : <Play size={28} className="ml-1" />}
        </button>
      </div>
      <div className="text-center">
        <button onClick={handleTap} className="px-6 py-3 rounded-xl text-sm font-medium transition-all active:scale-95" style={{ backgroundColor: 'var(--bg-tertiary)' }}>👆 Tap Tempo</button>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Presiona al ritmo para detectar el BPM</p>
      </div>
      <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Compás:</span>
          <div className="flex gap-1">
            {[3, 4, 5, 6, 7].map(ts => (
              <button key={ts} onClick={() => setTimeSignature(ts)} className="w-8 h-8 rounded-lg text-xs font-bold transition-colors" style={{ backgroundColor: timeSignature === ts ? 'var(--accent)' : 'var(--bg-tertiary)', color: timeSignature === ts ? 'white' : 'var(--text-primary)' }} translate="no">{ts}/4</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
