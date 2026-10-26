import { useEffect, useRef, useState } from 'react';
import { X, Crop, Check } from 'lucide-react';

interface ImageCropperProps {
  imageFile: File;
  onCropComplete: (croppedImage: File) => void;
  onCancel: () => void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Permite dibujar un rectángulo sobre la foto para escanear solo la letra (mouse o dedo). */
export default function ImageCropper({ imageFile, onCropComplete, onCancel }: ImageCropperProps) {
  const [imageSrc, setImageSrc] = useState('');
  const [rect, setRect] = useState<Rect | null>(null);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Posición del puntero DENTRO de la imagen (no del contenedor), limitada a sus bordes
  const pointerPos = (e: React.PointerEvent<HTMLDivElement>) => {
    const img = imgRef.current;
    if (!img) return { x: 0, y: 0 };
    const b = img.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(b.width, e.clientX - b.left)),
      y: Math.max(0, Math.min(b.height, e.clientY - b.top)),
    };
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointerPos(e);
    startRef.current = p;
    setRect({ x: p.x, y: p.y, w: 0, h: 0 });
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = startRef.current;
    if (!s) return;
    const p = pointerPos(e);
    setRect({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
  };

  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    startRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ya liberado */ }
  };

  const toFile = (sx: number, sy: number, sw: number, sh: number, img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));
    const ctx = canvas.getContext('2d');
    if (!ctx) { setBusy(false); return; }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) { setBusy(false); return; }
      onCropComplete(new File([blob], `recorte_${imageFile.name.replace(/\.[^.]+$/, '')}.png`, { type: 'image/png' }));
    }, 'image/png');
  };

  const handleCrop = () => {
    const img = imgRef.current;
    if (!img || !rect || rect.w < 10 || rect.h < 10) return;
    setBusy(true);
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;
    toFile(rect.x * scaleX, rect.y * scaleY, rect.w * scaleX, rect.h * scaleY, img);
  };

  const handleFull = () => {
    const img = imgRef.current;
    if (!img) return;
    setBusy(true);
    toFile(0, 0, img.naturalWidth, img.naturalHeight, img);
  };

  const valid = !!rect && rect.w >= 10 && rect.h >= 10;

  return (
    <div className="modal-overlay" style={{ zIndex: 80, alignItems: 'center', padding: '1rem', backgroundColor: 'rgba(0,0,0,.8)' }} onClick={e => e.stopPropagation()}>
      <div className="modal-panel" style={{ maxWidth: '56rem', borderRadius: '1.25rem' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold flex items-center gap-2"><Crop size={22} style={{ color: 'var(--accent)' }} /> Seleccionar área de escaneo</h3>
          <button onClick={onCancel} className="icon-btn icon-btn-sm" aria-label="Cerrar"><X size={16} /></button>
        </div>
        <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
          Dibuja un rectángulo sobre la letra (con acordes si los tiene). Cuanto más ajustado, mejor se lee.
        </p>

        <div className="overflow-auto flex justify-center rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)', maxHeight: '55vh' }}>
          <div
            className="relative inline-block cursor-crosshair select-none"
            style={{ touchAction: 'none' }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            {imageSrc && (
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Imagen a escanear"
                draggable={false}
                className="block pointer-events-none select-none"
                style={{ maxWidth: '100%', maxHeight: '55vh', width: 'auto', height: 'auto' }}
              />
            )}
            {rect && rect.w > 0 && rect.h > 0 && (
              <div
                className="absolute pointer-events-none"
                style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, border: '2px solid var(--accent)', backgroundColor: 'color-mix(in srgb, var(--accent) 22%, transparent)', boxShadow: '0 0 0 9999px rgba(0,0,0,.35)' }}
              />
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-4">
          <button onClick={onCancel} className="btn btn-soft flex-1" disabled={busy}>Cancelar</button>
          <button onClick={handleFull} className="btn btn-soft flex-1" disabled={busy}>Usar toda la imagen</button>
          <button onClick={handleCrop} className="btn btn-primary flex-1" disabled={!valid || busy}><Check size={16} /> Escanear selección</button>
        </div>
      </div>
    </div>
  );
}
