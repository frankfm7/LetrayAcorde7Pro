import { useRef, useCallback } from 'react';

/**
 * Clic largo (mantener presionado ~0.5 s) para activar la selección múltiple.
 * Uso:  const lp = useLongPress();   <div {...lp(() => empezarSeleccion(id))} onClick={...}>
 * El clic que llega justo al soltar el dedo se ignora (no abre la canción por error).
 */
export function useLongPress(ms = 500) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const cancel = useCallback(() => {
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
  }, []);

  return useCallback((onLong: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => {
      fired.current = false;
      origin.current = { x: e.clientX, y: e.clientY };
      cancel();
      timer.current = window.setTimeout(() => {
        fired.current = true;
        timer.current = null;
        try { navigator.vibrate?.(15); } catch { /* sin vibración */ }
        onLong();
      }, ms);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (origin.current && Math.hypot(e.clientX - origin.current.x, e.clientY - origin.current.y) > 10) cancel(); // es un desplazamiento
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: React.MouseEvent) => { if (fired.current) e.preventDefault(); },
    onClickCapture: (e: React.MouseEvent) => {
      if (fired.current) { fired.current = false; e.stopPropagation(); e.preventDefault(); }
    },
    style: { WebkitTouchCallout: 'none', userSelect: 'none' } as React.CSSProperties,
  }), [ms, cancel]);
}
