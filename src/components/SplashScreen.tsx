import { useState, useEffect } from 'react';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [showContent, setShowContent] = useState(false);
  useEffect(() => {
    const t1 = window.setTimeout(() => setShowContent(true), 300);
    const t2 = window.setTimeout(() => onComplete(), 2500);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="text-center">
        {showContent && (
          <div className="mb-8 animate-spin-once">
            <div className="w-32 h-32 mx-auto rounded-3xl flex items-center justify-center text-white text-5xl font-black shadow-2xl" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(20px)' }}>
              C<span className="gold-text-bright">7</span>
            </div>
          </div>
        )}
        {showContent && (
          <div className="animate-fade-in">
            <h1 className="font-black text-white mb-2" style={{ fontSize: 'clamp(1.6rem, 8.5vw, 3rem)', lineHeight: 1.1, whiteSpace: 'nowrap' }}>Letra&amp;Acorde<span className="gold-text-bright">7Pro</span></h1>
            <p className="text-white/80 text-sm sm:text-lg px-4">Gestión Profesional de Letras y Acordes</p>
          </div>
        )}
        {showContent && (
          <div className="mt-12 flex justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        )}
      </div>
    </div>
  );
}
