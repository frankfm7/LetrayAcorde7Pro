import { ChevronLeft } from 'lucide-react';
import { QueueItem } from './SetlistsPage';

interface Props {
  item: QueueItem;
  next?: QueueItem;
  position: string;
  onExit: () => void;
  immersive?: boolean;
  /** Al tocar la pantalla se pasa al siguiente elemento */
  onNext?: () => void;
}

/** Pantalla grande para los momentos de una orden que no son canciones (bienvenida, intervenciones, cierre…). */
export default function TextSlide({ item, next, position, onExit, immersive, onNext }: Props) {
  return (
    <div className={`${immersive ? 'min-h-[calc(100dvh-1rem)]' : 'min-h-[calc(100dvh-8rem)]'} flex flex-col`}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onExit} className="icon-btn" aria-label="Terminar presentación"><ChevronLeft size={20} /></button>
        <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{position}</div>
      </div>

      <div
        onClick={onNext}
        className="flex-1 rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center text-center text-white shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        {item.time && <div className="text-sm font-bold px-3 py-1 rounded-full mb-4" style={{ backgroundColor: 'rgba(255,255,255,.2)' }} translate="no">{item.time}{item.minutes ? ` · ${item.minutes} min` : ''}</div>}
        {!item.time && item.minutes ? <div className="text-sm font-bold px-3 py-1 rounded-full mb-4" style={{ backgroundColor: 'rgba(255,255,255,.2)' }}>{item.minutes} min</div> : null}
        <div className="text-5xl mb-3">🎤</div>
        <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-3">{item.title}</h2>
        {item.person && <p className="text-xl sm:text-2xl font-semibold" style={{ color: '#fde68a' }}>{item.person}</p>}
        {item.text && <p className="mt-6 text-lg sm:text-xl max-w-2xl whitespace-pre-wrap opacity-95">{item.text}</p>}
      </div>

      {next && (
        <div className="mt-4 rounded-2xl p-3 text-sm flex items-center gap-2" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Sigue</span>
          <span>{next.kind === 'song' ? '🎵' : '🎤'}</span>
          <span className="font-semibold truncate">{next.title}</span>
          {next.time && <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{next.time}</span>}
        </div>
      )}
    </div>
  );
}
