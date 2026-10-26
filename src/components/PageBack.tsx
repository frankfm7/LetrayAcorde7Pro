import { createContext, useContext } from 'react';
import { ChevronLeft } from 'lucide-react';

/** Acción de "volver" de la página actual (null = no mostrar el botón, por ejemplo en Inicio). */
export const BackContext = createContext<(() => void) | null>(null);

/** Botón pequeño (solo la flecha) que se pone en la misma línea del título de la página. */
export default function PageBack() {
  const onBack = useContext(BackContext);
  if (!onBack) return null;
  return (
    <button onClick={onBack} className="inline-flex items-center justify-center rounded-lg flex-shrink-0 align-middle mr-2" style={{ width: '1.9rem', height: '1.9rem', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} aria-label="Volver" title="Volver">
      <ChevronLeft size={18} />
    </button>
  );
}
