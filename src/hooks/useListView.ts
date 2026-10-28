import { useCallback, useState } from 'react';

const HANDLES_KEY = 'c7-show-handles';

/** Estado de pantalla compartido por Listas y Órdenes: selección múltiple, letras desplegadas y controles de orden. */
export function useListView() {
  const [showHandles, setShowHandlesState] = useState<boolean>(() => {
    try { return localStorage.getItem(HANDLES_KEY) !== '0'; } catch { return true; }
  });
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const setShowHandles = useCallback((v: boolean) => {
    setShowHandlesState(v);
    try { localStorage.setItem(HANDLES_KEY, v ? '1' : '0'); } catch { /* sin espacio */ }
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      if (next.size === 0) setSelectMode(false);   // se deseleccionó la última: se cierra la selección
      return next;
    });
  }, []);

  // La selección solo se cierra al llegar a 0 elementos o con la X
  // Clic largo: abre la selección (o agrega esa canción si ya está abierta)
  const startSelect = useCallback((firstId?: string) => {
    setSelectMode(true);
    setSelected(prev => (firstId ? new Set([...prev, firstId]) : prev));
  }, []);

  const exitSelect = useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
  }, []);

  const selectAll = useCallback((ids: string[]) => setSelected(new Set(ids)), []);

  const toggleExpanded = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback((ids: string[]) => setExpanded(new Set(ids)), []);
  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  return { showHandles, setShowHandles, selectMode, selected, expanded, toggleSelect, startSelect, exitSelect, selectAll, toggleExpanded, expandAll, collapseAll };
}
