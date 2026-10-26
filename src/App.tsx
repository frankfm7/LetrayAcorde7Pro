import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { NotificationProvider, useNotification } from './components/NotificationProvider';
import { Song, Hymnal, Order, OrderItem } from './types';
import { songs as allSongs, hymnals, generateSongCode, getNextSongNumber } from './data/songs';
import { transposeLyrics, changeKey, transposeKey, parseKey, prefersFlats, semitonesBetween, KEY_OPTIONS_MAJOR, KEY_OPTIONS_MINOR } from './utils/chords';
import { generateSongShareText } from './utils/shareUtils';
import { Cloud, Maximize2, Minimize2, Moon, Sun, Menu, X, Home, Search, Star, ListMusic, Music, Settings, Download, Upload, Plus, Heart, ChevronLeft, ChevronRight, ChevronDown, Copy, Share2, Edit3, Trash2, RotateCcw, Play, Pause, ChevronUp, MoreVertical, Filter, CheckSquare, Square, ArrowRight, Image, Camera, Save, User } from 'lucide-react';
import SplashScreen from './components/SplashScreen';
import Metronome from './components/Metronome';
import Tuner from './components/Tuner';
import SongEditor from './components/SongEditor';
import AddHymnalModal from './components/AddHymnalModal';
import EditHymnalModal from './components/EditHymnalModal';
import ExportModal from './components/ExportModal';
import ToolsMenu from './components/ToolsMenu';
import ExportOptions from './components/ExportOptions';
import ImportModal from './components/ImportModal';
import ProfilePage from './components/ProfilePage';
import SongSelectorModal from './components/SongSelectorModal';
import MultiSongSelector from './components/MultiSongSelector';
import HymnalSelector from './components/HymnalSelector';
import SearchPage from './components/SearchPage';
import SetlistsPage, { QueueItem } from './components/SetlistsPage';
import OrdersPage from './components/OrdersPage';
import ToolsPage from './components/ToolsPage';
import AddToListModal from './components/AddToListModal';
import QueueBar from './components/QueueBar';
import TextSlide from './components/TextSlide';
import WebSearchPage from './components/WebSearchPage';
import PresentationOrderModal from './components/PresentationOrderModal';
import ChordDiagram from './components/ChordDiagram';
import LoginButton from './components/LoginButton';
import OfficialHymnalsPage from './pages/OfficialHymnalsPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { shareSongToCommunity } from './lib/communitySongs';
import { supabase } from './lib/supabase';
import PageBack, { BackContext } from './components/PageBack';
import BackgroundLayer from './components/BackgroundLayer';
import BackgroundsPage from './components/BackgroundsPage';
import { setViewBackground, useBackgrounds, resolveBackgroundUrl } from './utils/backgroundStore';
import {
  parseSections, defaultSequence, sanitizeSequence, clampInterval, hymnalLabel, SECTION_COLORS, DEFAULT_INTERVAL_SECONDS,
} from './utils/presentation';
import { transposeSongCopy } from './utils/listUtils';
import { mergeHymnals, mergeSongs } from './utils/hymnalUtils';
import { getHymnalInfo, songSortNumber } from './utils/hymnalInfo';
import { getDisplayCode } from './utils/search';

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}

function AppContent() {
  const { state, setTheme, updateCustomHymnal, removeCustomHymnal, removeCustomSong } = useApp();
  const { showNotification } = useNotification();
  const [showSplash, setShowSplash] = useState(true);
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedHymnal, setSelectedHymnal] = useState<Hymnal | null>(null);

  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [showEditHymnalModal, setShowEditHymnalModal] = useState(false);
  const [editingHymnal, setEditingHymnal] = useState<Hymnal | null>(null);
  const [showAddHymnalModal, setShowAddHymnalModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [addingSongToHymnal, setAddingSongToHymnal] = useState<Hymnal | null>(null);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showProfilePage, setShowProfilePage] = useState(false);
  const [showSongSelector, setShowSongSelector] = useState(false);
  const [showMultiSongSelector, setShowMultiSongSelector] = useState(false);
  const [showHymnalSelector, setShowHymnalSelector] = useState(false);
  const [songToAdd, setSongToAdd] = useState<Song | null>(null);
  const [queue, setQueue] = useState<{ items: QueueItem[]; index: number; label: string } | null>(null);
  // Lista y orden abiertas: viven aquí para que al ver una letra y volver se regrese DENTRO de la lista/orden
  const [openSetlistId, setOpenSetlistId] = useState<string | null>(null);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [importHymnalId, setImportHymnalId] = useState<string | undefined>(undefined);
  const [webQuery, setWebQuery] = useState('');
  // Pantalla completa (como "Presentar" en PowerPoint): sin encabezado ni menú, y con la pantalla completa del aparato
  const [immersive, setImmersive] = useState(false);
  const enterImmersive = useCallback(() => {
    setImmersive(true);
    try { document.documentElement.requestFullscreen?.().catch(() => undefined); } catch { /* sin API */ }
  }, []);
  const exitImmersive = useCallback(() => {
    setImmersive(false);
    try { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined); } catch { /* sin API */ }
  }, []);
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement) setImmersive(false); };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Regreso de Google: Supabase deja la sesión en la URL (#access_token… o ?code=…); se lee, se limpia la URL y se va al inicio
  useEffect(() => {
    const { hash, search } = window.location;
    if (!/access_token=|[?&]code=|error_description=/.test(hash + search)) return;
    supabase.auth.getSession().finally(() => {
      window.history.replaceState({}, document.title, window.location.pathname);
      setCurrentPage('home');
    });
  }, []);

  // Fondo de pantalla según lo que se esté viendo (app, lista de un cancionero o letra)
  useEffect(() => {
    if (selectedSong || queue) {
      const cur = queue ? queue.items[queue.index] : null;
      const song = cur ? cur.song : selectedSong;
      setViewBackground(song ? { kind: 'song', hymnalId: song.hymnalId } : { kind: 'app' });
    } else if (selectedHymnal) {
      setViewBackground({ kind: 'hymnal', hymnalId: selectedHymnal.id });
    } else {
      setViewBackground({ kind: 'app' });
    }
  }, [selectedSong, queue, selectedHymnal]);

  // Siempre se usa la versión más reciente de la canción (la editada), no una copia vieja
  const freshSong = (s: Song | null | undefined): Song | null => (s ? state.customSongs.find(c => c.id === s.id) || s : null);

  useEffect(() => {
    let last = 0;
    const onError = () => {
      if (Date.now() - last < 15000) return;
      last = Date.now();
      showNotification('No hay espacio para guardar los cambios en este dispositivo. Exporta tus datos y quita imágenes grandes.', 'error');
    };
    window.addEventListener('c7-storage-error', onError);
    return () => window.removeEventListener('c7-storage-error', onError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.className = state.preferences.theme;
  }, [state.preferences.theme]);

  const handleSelectSong = useCallback((song: Song) => { setQueue(null); setSelectedSong(song); }, []);
  const handlePlayQueue = useCallback((items: QueueItem[], startIndex: number, label: string) => {
    if (items.length === 0) return;
    const index = Math.max(0, Math.min(startIndex, items.length - 1));
    setQueue({ items, index, label });
    setSelectedSong(items[index].song || null);
    enterImmersive();
  }, [enterImmersive]);
  const goToQueueIndex = useCallback((index: number) => {
    if (!queue || index < 0 || index >= queue.items.length) return;
    setQueue({ ...queue, index });
    setSelectedSong(queue.items[index].song || null);
  }, [queue]);
  const handleSelectHymnal = useCallback((hymnal: Hymnal) => setSelectedHymnal(hymnal), []);
  const handleBack = useCallback(() => {
    if (selectedSong || queue) { setSelectedSong(null); setQueue(null); exitImmersive(); }
    else if (selectedHymnal) setSelectedHymnal(null);
    else setCurrentPage('home');
  }, [selectedSong, selectedHymnal, queue, exitImmersive]);

  // Pantallas que se abren encima de la página actual (perfil, exportar, importar…): al navegar se cierran todas
  const closeOverlays = () => {
    setShowToolsMenu(false); setShowProfilePage(false); setShowExportOptions(false); setShowSongSelector(false);
    setShowMultiSongSelector(false); setShowHymnalSelector(false); setShowImportModal(false);
  };
  const openTools = () => { closeOverlays(); setShowToolsMenu(true); };

  const handleNavigate = useCallback((page: string) => {
    // Tocar otra vez la pestaña Listas u Órdenes vuelve al listado
    if (page === currentPage) {
      if (page === 'setlists') setOpenSetlistId(null);
      if (page === 'orders') setOpenOrderId(null);
    }
    closeOverlays();
    setCurrentPage(page);
    setQueue(null);
    setSelectedSong(null);
    setSelectedHymnal(null);
    setEditingSong(null);
  }, [currentPage]);

  const handleExport = useCallback(() => {
    try {
      const data = JSON.stringify(state, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cancionero7pro-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('Respaldo exportado', 'success');
    } catch {
      showNotification('Error al exportar', 'error');
    }
  }, [state, showNotification]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.favorites && data.setlists) {
            localStorage.setItem('cancionero-ruah-state', JSON.stringify(data));
            showNotification('Respaldo restaurado', 'success');
            window.location.reload();
          } else showNotification('Archivo inválido', 'error');
        } catch {
          showNotification('Error al importar', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [showNotification]);

  const handleDeleteHymnal = useCallback((id: string) => {
    const songsToRemove = state.customSongs.filter(s => s.hymnalId === id);
    songsToRemove.forEach(song => {
      removeCustomSong(song.id);
    });
    removeCustomHymnal(id);
  }, [removeCustomHymnal, removeCustomSong, state.customSongs]);

  // ---- Botón "atrás" del celular: retrocede dentro de la app en vez de salir ----
  const canGoBackRef = useRef(false);
  const doBackRef = useRef<() => void>(() => undefined);
  canGoBackRef.current = !!(showToolsMenu || showProfilePage || showExportOptions || showSongSelector || showMultiSongSelector || showHymnalSelector || showImportModal
    || immersive || editingSong || selectedSong || queue || selectedHymnal || showEditHymnalModal || showAddHymnalModal || songToAdd || showExportModal || currentPage !== 'home');
  doBackRef.current = () => {
    // 1) ventanas abiertas dentro de una pantalla (la pantalla decide si cierra alguna)
    const ev = new CustomEvent('c7-back', { cancelable: true });
    if (!window.dispatchEvent(ev)) return;
    if (immersive) return exitImmersive();
    if (songToAdd) return setSongToAdd(null);
    if (showEditHymnalModal) { setShowEditHymnalModal(false); setEditingHymnal(null); return; }
    if (showAddHymnalModal) return setShowAddHymnalModal(false);
    if (showToolsMenu) return setShowToolsMenu(false);
    if (showProfilePage) return setShowProfilePage(false);
    if (showSongSelector) return setShowSongSelector(false);
    if (showMultiSongSelector) return setShowMultiSongSelector(false);
    if (showHymnalSelector) return setShowHymnalSelector(false);
    if (showExportOptions) return setShowExportOptions(false);
    if (showImportModal) return setShowImportModal(false);
    if (editingSong) return setEditingSong(null);
    if (selectedSong || queue) { setSelectedSong(null); setQueue(null); return; }
    if (selectedHymnal) return setSelectedHymnal(null);
    if (currentPage === 'setlists' && openSetlistId) return setOpenSetlistId(null);
    if (currentPage === 'orders' && openOrderId) return setOpenOrderId(null);
    if (currentPage !== 'home') setCurrentPage('home');
  };
  useEffect(() => {
    const onPop = () => {
      if (canGoBackRef.current) {
        doBackRef.current();
        history.pushState({ c7: 1 }, '');   // se vuelve a colocar la "guardia" para el siguiente atrás
      }
      // en Inicio sin nada abierto: el atrás normal sale de la app
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  // Cada vez que se entra a algo más profundo que Inicio hay una entrada de historial "guardia"
  const depthKey = [showToolsMenu, showProfilePage, showExportOptions, showSongSelector, showMultiSongSelector, showHymnalSelector, showImportModal, !!editingSong, !!selectedSong, !!queue, !!selectedHymnal, currentPage].join('|');
  useEffect(() => {
    if (canGoBackRef.current && history.state?.c7 !== 1) history.pushState({ c7: 1 }, '');
    else if (!canGoBackRef.current && history.state?.c7 === 1) history.back(); // ya en Inicio: se quita la guardia
  }, [depthKey]);

  if (showSplash) return <SplashScreen onComplete={() => setShowSplash(false)} />;

  if (showToolsMenu) {
    return (
      <Layout currentPage={currentPage} onNavigate={handleNavigate} onImport={handleImport} onExport={handleExport} onToolsClick={openTools}>
        <ToolsMenu 
          onClose={() => setShowToolsMenu(false)} 
          onNavigate={handleNavigate}
          onExportClick={() => {
            setShowToolsMenu(false);
            setShowExportOptions(true);
          }}
          onImportClick={() => {
            setShowToolsMenu(false);
            setImportHymnalId(undefined);
            setShowImportModal(true);
          }}
          onProfileClick={() => {
            setShowToolsMenu(false);
            setShowProfilePage(true);
          }}
        />
      </Layout>
    );
  }

  if (showProfilePage) {
    return (
      <Layout currentPage={currentPage} onNavigate={handleNavigate} onImport={handleImport} onExport={handleExport} onToolsClick={openTools}>
        <ProfilePage onBack={() => setShowProfilePage(false)} />
      </Layout>
    );
  }

  if (showExportOptions) {
    // Combinar himnarios evitando duplicados
    const customIds = new Set(state.customHymnals.map(h => h.id));
    const defaultNotEdited = hymnals.filter(h => !customIds.has(h.id));
    const allHymnals = mergeHymnals(hymnals, state.customHymnals);
    const allAvailableSongs = mergeSongs(allSongs, state.customSongs);
    
    return (
      <Layout currentPage={currentPage} onNavigate={handleNavigate} onImport={handleImport} onExport={handleExport} onToolsClick={openTools}>
        <ExportOptions
          onClose={() => setShowExportOptions(false)}
          songs={allAvailableSongs}
          hymnals={allHymnals}
          onExportSingle={() => {
            setShowExportOptions(false);
            setShowSongSelector(true);
          }}
          onExportMultiple={() => {
            setShowExportOptions(false);
            setShowMultiSongSelector(true);
          }}
          onExportHymnal={() => {
            setShowExportOptions(false);
            setShowHymnalSelector(true);
          }}
        />
      </Layout>
    );
  }

  if (showSongSelector) {
    const allAvailableSongs = mergeSongs(allSongs, state.customSongs);
    return (
      <Layout currentPage={currentPage} onNavigate={handleNavigate} onImport={handleImport} onExport={handleExport} onToolsClick={openTools}>
        <SongSelectorModal
          songs={allAvailableSongs}
          onClose={() => setShowSongSelector(false)}
        />
      </Layout>
    );
  }

  if (showMultiSongSelector) {
    const allAvailableSongs = mergeSongs(allSongs, state.customSongs);
    return (
      <Layout currentPage={currentPage} onNavigate={handleNavigate} onImport={handleImport} onExport={handleExport} onToolsClick={openTools}>
        <MultiSongSelector
          songs={allAvailableSongs}
          onClose={() => setShowMultiSongSelector(false)}
        />
      </Layout>
    );
  }

  if (showHymnalSelector) {
    // Combinar himnarios evitando duplicados
    const customIds = new Set(state.customHymnals.map(h => h.id));
    const defaultNotEdited = hymnals.filter(h => !customIds.has(h.id));
    const allHymnals = mergeHymnals(hymnals, state.customHymnals);
    const allAvailableSongs = mergeSongs(allSongs, state.customSongs);
    return (
      <Layout currentPage={currentPage} onNavigate={handleNavigate} onImport={handleImport} onExport={handleExport} onToolsClick={openTools}>
        <HymnalSelector
          hymnals={allHymnals}
          songs={allAvailableSongs}
          onClose={() => setShowHymnalSelector(false)}
        />
      </Layout>
    );
  }

  if (showImportModal) {
    // Combinar himnarios evitando duplicados (si un himnario predeterminado fue editado, usar la versión custom)
    const customIds = new Set(state.customHymnals.map(h => h.id));
    const defaultNotEdited = hymnals.filter(h => !customIds.has(h.id));
    const allHymnals = mergeHymnals(hymnals, state.customHymnals);
    
    return (
      <Layout currentPage={currentPage} onNavigate={handleNavigate} onImport={handleImport} onExport={handleExport} onToolsClick={openTools}>
        <ImportModal
          onClose={() => setShowImportModal(false)}
          hymnals={allHymnals}
          initialHymnalId={importHymnalId}
        />
      </Layout>
    );
  }

  if (editingSong) {
    return (
      <Layout currentPage={currentPage} onNavigate={handleNavigate} onImport={handleImport} onExport={handleExport} onToolsClick={openTools}>
        <SongEditor song={editingSong} onBack={() => setEditingSong(null)} />
      </Layout>
    );
  }

  if (selectedSong || queue) {
    const current = queue ? queue.items[queue.index] : null;
    const songShown = freshSong(current ? current.song : selectedSong);
    return (
      <Layout currentPage={currentPage} onNavigate={handleNavigate} onImport={handleImport} onExport={handleExport} onToolsClick={openTools} immersive={immersive}>
        {songShown ? (
          <SongView
            key={`${songShown.id}-${queue ? queue.index : 'solo'}`}
            song={songShown}
            initialTransposition={current ? current.transposition : 0}
            onBack={handleBack}
            onEdit={() => setEditingSong(songShown)}
            onAddToList={(song: Song) => setSongToAdd(song)}
            showNotification={showNotification}
            immersive={immersive}
            onToggleImmersive={() => (immersive ? exitImmersive() : enterImmersive())}
            autoStart={!!queue}
            extra={current ? { person: current.person, ministry: current.ministry } : undefined}
            onFinished={queue ? () => { if (queue.index < queue.items.length - 1) goToQueueIndex(queue.index + 1); else showNotification('Presentación terminada', 'success'); } : undefined}
          />
        ) : current ? (
          <TextSlide
            key={`slide-${queue ? queue.index : 0}`}
            item={current}
            next={queue ? queue.items[queue.index + 1] : undefined}
            position={queue ? `${queue.label} · ${queue.index + 1} de ${queue.items.length}` : ''}
            onExit={handleBack}
            immersive={immersive}
            onNext={queue && queue.index < queue.items.length - 1 ? () => goToQueueIndex(queue.index + 1) : undefined}
          />
        ) : null}
        {queue && (
          <QueueBar
            label={queue.label}
            index={queue.index}
            items={queue.items.map(q => ({ title: q.title, kind: q.kind, time: q.time }))}
            onJump={goToQueueIndex}
            onPrev={() => goToQueueIndex(queue.index - 1)}
            onNext={() => goToQueueIndex(queue.index + 1)}
            onClose={handleBack}
            compact={immersive}
          />
        )}
        {songToAdd && <AddToListModal song={songToAdd} onClose={() => setSongToAdd(null)} showNotification={showNotification} />}
      </Layout>
    );
  }

  if (addingSongToHymnal) {
    const nextNumber = getNextSongNumber(addingSongToHymnal.id, mergeSongs(allSongs, state.customSongs));
    const code = generateSongCode(addingSongToHymnal, nextNumber);
    const newSong: Song = {
      id: `new-${Date.now()}`,
      title: '',
      artist: '',
      code,
      number: nextNumber,
      hymnalId: addingSongToHymnal.id,
      key: 'C',
      timeSignature: '4/4',
      bpm: 120,
      language: addingSongToHymnal.language.split('/')[0],
      categories: [],
      sections: [],
      lyrics: '',
      notes: '',
    };
    return (
      <Layout currentPage={currentPage} onNavigate={handleNavigate} onImport={handleImport} onExport={handleExport} onToolsClick={openTools}>
        <SongEditor song={newSong} onBack={() => setAddingSongToHymnal(null)} />
      </Layout>
    );
  }

  if (selectedHymnal) {
    return (
      <Layout currentPage={currentPage} onNavigate={handleNavigate} onImport={handleImport} onExport={handleExport} onToolsClick={openTools}>
        <HymnalView hymnal={selectedHymnal} onSelectSong={handleSelectSong} onBack={handleBack} onEditHymnal={(h: Hymnal) => { setEditingHymnal(h); setShowEditHymnalModal(true); }} onAddSong={(h: Hymnal) => setAddingSongToHymnal(h)} onDeleteHymnal={handleDeleteHymnal} onImportClick={(h: Hymnal) => { setImportHymnalId(h.id); setShowImportModal(true); }} showNotification={showNotification} />
        {showEditHymnalModal && editingHymnal && (
          <EditHymnalModal hymnal={editingHymnal} onClose={() => { setShowEditHymnalModal(false); setEditingHymnal(null); }} onSave={(h) => { updateCustomHymnal(h); setSelectedHymnal(h); setShowEditHymnalModal(false); setEditingHymnal(null); showNotification('Cancionero actualizado', 'success'); }} />
        )}
      </Layout>
    );
  }

  // `hideBack`: la pantalla ya tiene su propio botón de volver (por ejemplo, dentro de una lista abierta)
  // El botón de volver (solo la flecha) lo dibuja cada página dentro de la línea de su título
  const withBack = (page: JSX.Element, hideBack = false) => (
    <BackContext.Provider value={hideBack ? null : () => setCurrentPage('home')}>{page}</BackContext.Provider>
  );


  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <HomePage onSelectSong={handleSelectSong} onSelectHymnal={handleSelectHymnal} onSearch={() => handleNavigate('search')} onAddHymnal={() => setShowAddHymnalModal(true)} />;
      case 'search': return withBack(<SearchPage onSelectSong={handleSelectSong} onAddToList={(song: Song) => setSongToAdd(song)} onSearchWeb={(q: string) => { setWebQuery(q); setCurrentPage('websearch'); }} />);
      case 'official': return withBack(<OfficialHymnalsPage onSelectSong={handleSelectSong} />);
      case 'backgrounds': return withBack(<BackgroundsPage />);
      case 'websearch': return withBack(<WebSearchPage key={webQuery} initialQuery={webQuery} onDone={() => setCurrentPage('home')} />);
      case 'favorites': return withBack(<FavoritesPage onSelectSong={handleSelectSong} />);
      case 'setlists': return withBack(<SetlistsPage selectedId={openSetlistId} onSelectId={setOpenSetlistId} onSelectSong={handleSelectSong} onPlayQueue={handlePlayQueue} showNotification={showNotification} />, !!openSetlistId);
      case 'orders': return withBack(<OrdersPage selectedId={openOrderId} onSelectId={setOpenOrderId} onSelectSong={handleSelectSong} onPlayQueue={handlePlayQueue} showNotification={showNotification} />, !!openOrderId);
      case 'tools': return withBack(<ToolsPage />);
      case 'profile': return <ProfilePage onBack={() => handleNavigate('home')} />;
      default: return <HomePage onSelectSong={handleSelectSong} onSelectHymnal={handleSelectHymnal} onSearch={() => handleNavigate('search')} onAddHymnal={() => setShowAddHymnalModal(true)} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate} onImport={handleImport} onExport={handleExport} onToolsClick={openTools}>
      {renderPage()}
      {showEditHymnalModal && editingHymnal && (
        <EditHymnalModal hymnal={editingHymnal} onClose={() => { setShowEditHymnalModal(false); setEditingHymnal(null); }} onSave={(h) => { updateCustomHymnal(h); setShowEditHymnalModal(false); setEditingHymnal(null); showNotification('Cancionero actualizado', 'success'); }} />
      )}
      {showAddHymnalModal && (
        <AddHymnalModal onClose={() => setShowAddHymnalModal(false)} />
      )}
      {songToAdd && <AddToListModal song={songToAdd} onClose={() => setSongToAdd(null)} showNotification={showNotification} />}
    </Layout>
  );
}

function Layout({ children, currentPage, onNavigate, onImport, onExport, onToolsClick, immersive }: any) {
  const { state, setTheme } = useApp();
  const userProfile = state.userProfile;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <BackgroundLayer />
      {!immersive && <header className="sticky top-0 z-30 backdrop-blur-xl border-b" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-primary) 85%, transparent)', borderColor: 'var(--border-color)' }}>
        <div className="max-w-6xl mx-auto px-4 h-11 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-[11px]" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>C<span className="gold-text-bright">7</span></div>
            <div>
              <h1 className="text-sm sm:text-base font-bold leading-none mb-0.5" style={{ color: 'var(--accent)' }}>Letra&amp;Acorde<span className="font-black gold-text">7Pro</span></h1>
              <p className="text-[9px] leading-none" style={{ color: 'var(--text-muted)' }}>Letras y Acordes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onNavigate('search')} className="p-1.5 rounded-lg hidden min-[400px]:block" style={{ backgroundColor: 'var(--bg-tertiary)' }}><Search size={16} /></button>
            <button onClick={() => setTheme(state.preferences.theme === 'dark' ? 'light' : 'dark')} className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>{state.preferences.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
            <LoginButton onOpenProfile={() => onNavigate('profile')} />
          </div>
        </div>
      </header>}
      <main className={`relative max-w-6xl mx-auto px-3 sm:px-4 pt-2 pb-2 overflow-y-auto ${immersive ? 'h-[100dvh]' : 'h-[calc(100dvh-2.75rem-3.25rem)]'}`}>{children}</main>
      {!immersive && <nav className="fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-primary) 90%, transparent)', borderColor: 'var(--border-color)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-6xl mx-auto flex px-1">
          {[{ id: 'home', label: 'Inicio', icon: Home }, { id: 'search', label: 'Buscar', icon: Search }, { id: 'favorites', label: 'Favoritos', icon: Heart }, { id: 'setlists', label: 'Listas', icon: ListMusic }, { id: 'orders', label: 'Órdenes', icon: Music }, { id: 'tools', label: 'Menú+', icon: Settings }].map(item => {
            const isActive = currentPage === item.id;
            return (
              <button key={item.id} onClick={() => item.id === 'tools' ? onToolsClick() : onNavigate(item.id)} className="relative flex-1 flex flex-col items-center py-1 px-1 transition-all active:scale-95" style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                <span className="flex items-center justify-center h-6 w-12 rounded-full transition-all" style={{ backgroundColor: isActive ? 'var(--accent-light)' : 'transparent' }}>
                  <item.icon size={17} strokeWidth={isActive ? 2.5 : 1.8} />
                </span>
                <span className="text-[10px] leading-tight font-semibold" style={{ opacity: isActive ? 1 : 0.8 }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>}
    </div>
  );
}

function HomePage({ onSelectSong, onSelectHymnal, onSearch, onAddHymnal }: any) {
  const { state } = useApp();
  const allAvailableSongs = useMemo(() => mergeSongs(allSongs, state.customSongs), [state.customSongs]);
  
  const allHymnals = useMemo(() => {
    const customIds = new Set(state.customHymnals.map(h => h.id));
    const defaultNotEdited = hymnals.filter(h => !customIds.has(h.id));
    return mergeHymnals(hymnals, state.customHymnals);
  }, [state.customHymnals]);

  const getDisplayCode = (song: any) => {
    const hymnal = allHymnals.find(h => h.id === song.hymnalId);
    if (!hymnal) return song.code;
    const prefix = hymnal.codePrefix || hymnal.id.charAt(0).toUpperCase();
    const number = song.number || song.code.match(/(\d+)$/)?.[1] || '1';
    return `${prefix}${number}`;
  };

  return (
    <div className="space-y-6 pb-4">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><span>📚</span> Cancioneros</h2>
          <button onClick={onAddHymnal} className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 card-shadow-md hover:card-shadow-lg transition-all" style={{ backgroundColor: 'var(--accent)', color: 'white' }}><Plus size={14} /> Nuevo</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {allHymnals.map((hymnal) => {
            const hymnalSongs = allAvailableSongs.filter(s => s.hymnalId === hymnal.id);
            const backgroundStyle = hymnal.image
              ? { backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${hymnal.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { background: `linear-gradient(135deg, ${hymnal.color}, ${hymnal.color}cc)` };
            return (
              <div key={hymnal.id} className="relative group">
                <div className="rounded-2xl relative overflow-hidden p-3 sm:p-5 flex flex-col justify-between text-left transition-all hover-lift active:scale-[0.97] w-full cursor-pointer" style={{ aspectRatio: '3/4', ...backgroundStyle, boxShadow: `0 8px 24px ${hymnal.color}44, 0 2px 8px rgba(0,0,0,0.1)` }} onClick={() => onSelectHymnal(hymnal)}>
                  <div><div className="text-3xl sm:text-4xl mb-2 sm:mb-3 drop-shadow-lg">{hymnal.icon}</div><div className="text-white font-bold text-sm sm:text-xl leading-tight mb-1 sm:mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}>{hymnal.name}</div></div>
                  <div><div className="text-white/95 text-xs sm:text-base font-semibold" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.9)' }}>{hymnalSongs.length} canciones</div><div className="text-white/80 text-[10px] sm:text-xs" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.9)' }}>{hymnal.language}</div></div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SongView({ song: initialSong, initialTransposition, onBack, onEdit, onAddToList, showNotification, immersive, onToggleImmersive, autoStart, extra, onFinished }: any) {
  const { state, toggleFavorite, isFavorite, setFontSize, setShowChords, setCapo, updateCustomSong } = useApp();
  const [transposition, setTransposition] = useState<number>(initialTransposition || 0);
  // Tonalidad elegida de otro modo (mayor ↔ menor): los acordes se convierten, no solo se trasladan
  const [modeKey, setModeKey] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(10);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [buttonOpacity, setButtonOpacity] = useState(40);
  const [currentLanguage, setCurrentLanguage] = useState<string>(initialSong.language.split('/')[0]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);
  const scrollPauseRef = useRef<boolean>(false);
  
  const [personalNotes, setPersonalNotes] = useState<{ note2: string; note3: string; note4: string }>(() => {
    const saved = localStorage.getItem(`song-notes-${initialSong.id}`);
    if (!saved) return { note2: '', note3: '', note4: '' };
    
    try {
      const parsed = JSON.parse(saved);
      const note2 = parseKey(parsed.note2 || '') ? parsed.note2 : '';
      const note3 = parseKey(parsed.note3 || '') ? parsed.note3 : '';
      const note4 = parseKey(parsed.note4 || '') ? parsed.note4 : '';
      
      if (parsed.note2 !== note2 || parsed.note3 !== note3 || parsed.note4 !== note4) {
        localStorage.setItem(`song-notes-${initialSong.id}`, JSON.stringify({ note2, note3, note4 }));
      }
      
      return { note2, note3, note4 };
    } catch {
      localStorage.removeItem(`song-notes-${initialSong.id}`);
      return { note2: '', note3: '', note4: '' };
    }
  });
  const [editingNote, setEditingNote] = useState<'note2' | 'note3' | 'note4' | null>(null);
  const longPressed = useRef(false);
  const pressTimer = useRef<number | null>(null);
  const [showOriginalNote, setShowOriginalNote] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => {
      setShowSpeedMenu(false);
      setShowActionsMenu(false);
    };
    if (showSpeedMenu || showActionsMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSpeedMenu, showActionsMenu]);

  const song = useMemo(() => {
    const customSong = state.customSongs.find(s => s.id === initialSong.id);
    return customSong || initialSong;
  }, [initialSong, state.customSongs]);
  const { preferences } = state;
  const bgSettings = useBackgrounds();
  const allHymnalsForSong = mergeHymnals(hymnals, state.customHymnals);
  const hymnalOfSong = allHymnalsForSong.find(h => h.id === song.hymnalId);
  const hymnalInfo = getHymnalInfo(song, hymnalOfSong);
  const songCode = getDisplayCode(song, allHymnalsForSong);
  const hasBgImage = !!resolveBackgroundUrl({ kind: 'song', hymnalId: song.hymnalId }, bgSettings, hymnalOfSong);

  const transposedLyrics = useMemo(() => {
    let lyrics = song.lyricsByLanguage?.[currentLanguage] || song.lyrics;
    const baseKey = modeKey || song.key;
    if (modeKey) lyrics = changeKey(lyrics, song.key, modeKey);
    const shift = transposition - (preferences.capo > 0 ? preferences.capo : 0);
    if (shift !== 0) {
      const target = parseKey(transposeKey(baseKey, shift));
      lyrics = transposeLyrics(lyrics, shift, target ? prefersFlats(target) : undefined);
    }
    return lyrics;
  }, [song.lyrics, song.lyricsByLanguage, song.key, modeKey, currentLanguage, transposition, preferences.capo]);

  const sections = useMemo(() => parseSections(transposedLyrics), [transposedLyrics]);

  const getSpeedMs = (velocidad: number): number => {
    if (velocidad <= 10) {
      const valores: Record<number, number> = {
        1: 120, 2: 100, 3: 85, 4: 70, 5: 60,
        6: 52, 7: 45, 8: 38, 9: 32, 10: 25
      };
      return valores[velocidad] || 25;
    }
    return Math.max(3, Math.round(25 * Math.pow(0.93, velocidad - 10)));
  };

  useEffect(() => {
    if (isAutoScrolling && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const ms = getSpeedMs(scrollSpeed);
      
      scrollIntervalRef.current = window.setInterval(() => { 
        if (!scrollPauseRef.current) {
          container.scrollTop += 1;
        }
      }, ms);
    } else { 
      if (scrollIntervalRef.current) { 
        clearInterval(scrollIntervalRef.current); 
        scrollIntervalRef.current = null; 
      } 
    }
    return () => { 
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [isAutoScrolling, scrollSpeed]);

  const scrollToSection = (sectionId: string) => {
    if (scrollContainerRef.current) {
      const element = scrollContainerRef.current.querySelector(`[data-section="${sectionId}"]`);
      if (element) {
        const container = scrollContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const elementRect = (element as HTMLElement).getBoundingClientRect();
        const relativeTop = elementRect.top - containerRect.top + container.scrollTop;
        
        if (isAutoScrolling) {
          scrollPauseRef.current = true;
          container.scrollTo({ top: relativeTop - 80, behavior: 'smooth' });
          
          setTimeout(() => {
            scrollPauseRef.current = false;
          }, 2000);
        } else {
          container.scrollTo({ top: relativeTop - 80, behavior: 'smooth' });
        }
      }
    }
  };

  // ---------- Modo presentación ----------
  const [isPresenting, setIsPresenting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [presentationOrder, setPresentationOrder] = useState<string[]>([]);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(DEFAULT_INTERVAL_SECONDS);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [presentTick, setPresentTick] = useState(0);
  const presentRef = useRef({ index: 0, length: 0 });
  presentRef.current = { index: currentSectionIndex, length: presentationOrder.length };
  const sectionsKey = sections.map(sec => sec.id).join('|');
  const activeStepRef = useRef<HTMLButtonElement | null>(null);

  // Los botones de arriba muestran TODA la secuencia de presentación (con las repeticiones), no solo las secciones
  const sequenceButtons = useMemo(() => {
    const byId = new Map(sections.map(sec => [sec.id, sec] as [string, (typeof sections)[number]]));
    const steps = presentationOrder.map((id, step) => ({ section: byId.get(id), step })).filter(x => !!x.section) as { section: (typeof sections)[number]; step: number }[];
    return steps.length > 0 ? steps : sections.map((section, step) => ({ section, step }));
  }, [sections, presentationOrder]);

  useEffect(() => {
    activeStepRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [currentSectionIndex, isPresenting]);

  // Orden guardado en la canción (o el que sale por defecto: V1, C, V2, C, V3…)
  useEffect(() => {
    const saved = song.presentationOrder;
    const valid = saved ? sanitizeSequence(saved.sections, sections) : [];
    setPresentationOrder(valid.length > 0 ? valid : defaultSequence(sections));
    setIntervalSeconds(saved ? clampInterval(saved.intervalSeconds) : DEFAULT_INTERVAL_SECONDS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.presentationOrder, sectionsKey]);

  useEffect(() => {
    setCurrentSectionIndex(i => Math.min(i, Math.max(0, presentationOrder.length - 1)));
  }, [presentationOrder.length]);

  // Al llegar desde una lista u orden, la canción arranca sola: título 4 s y luego sus secciones en orden
  useEffect(() => {
    if (autoStart && !autoStarted.current && presentationOrder.length > 0) { autoStarted.current = true; startPresentation(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, presentationOrder.length]);

  // Diapositiva de título de la canción (4 s o hasta tocar la pantalla)
  const [showTitle, setShowTitle] = useState(false);
  const endTitle = () => { setShowTitle(false); setPresentTick(t => t + 1); };
  useEffect(() => {
    if (!showTitle) return;
    const t = window.setTimeout(endTitle, 4000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTitle]);
  const autoStarted = useRef(false);

  const enteredByPlay = useRef(false);
  const stopPresentation = (finished = false) => {
    if (enteredByPlay.current && immersive) { onToggleImmersive?.(); }
    enteredByPlay.current = false;
    setIsPresenting(false);
    setIsPaused(false);
    setShowTitle(false);
    setCurrentSectionIndex(0);
    if (finished) { if (onFinished) onFinished(); else showNotification('Presentación terminada', 'success'); }
  };

  const startPresentation = () => {
    if (presentationOrder.length === 0) { showNotification('Esta canción no tiene secciones para presentar', 'info'); return; }
    setIsAutoScrolling(false);
    setShowSpeedMenu(false);
    setCurrentSectionIndex(0);
    setIsPaused(false);
    setPresentTick(t => t + 1);
    setShowTitle(true); // diapositiva de título antes de la primera sección
    setIsPresenting(true);
    if (!immersive && onToggleImmersive) { enteredByPlay.current = true; onToggleImmersive(); }
  };

  const goPrevSection = () => { setCurrentSectionIndex(i => Math.max(0, i - 1)); setPresentTick(t => t + 1); };
  const goNextSection = () => { setCurrentSectionIndex(i => Math.min(presentationOrder.length - 1, i + 1)); setPresentTick(t => t + 1); };
  const togglePause = () => { if (isPaused) setPresentTick(t => t + 1); setIsPaused(p => !p); };

  // Avance automático: cada "intervalSeconds" pasa a la siguiente sección; al llegar al final termina
  useEffect(() => {
    if (!isPresenting || isPaused || showTitle || presentationOrder.length === 0) return;
    const timer = window.setInterval(() => {
      const { index, length } = presentRef.current;
      if (index >= length - 1) stopPresentation(true);
      else setCurrentSectionIndex(index + 1);
    }, intervalSeconds * 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresenting, isPaused, showTitle, currentSectionIndex, intervalSeconds, presentationOrder.length, presentTick]);

  // La pantalla se desplaza sola para mostrar la sección activa
  useEffect(() => {
    if (!isPresenting) return;
    const id = presentationOrder[currentSectionIndex];
    if (id) scrollToSection(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresenting, currentSectionIndex]);

  // En celular, evita que la pantalla se apague mientras se presenta
  useEffect(() => {
    if (!isPresenting) return;
    let lock: { release: () => Promise<void> } | null = null;
    const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    if (wl) wl.request('screen').then(l => { lock = l; }).catch(() => undefined);
    return () => { if (lock) lock.release().catch(() => undefined); };
  }, [isPresenting]);

  const saveOrder = (sequence: string[], seconds: number) => {
    updateCustomSong({ ...song, presentationOrder: { sections: sequence, intervalSeconds: seconds } });
    setPresentationOrder(sequence);
    setIntervalSeconds(seconds);
    setShowOrderModal(false);
    showNotification('Orden de presentación guardado', 'success');
  };

  const savePersonalNote = (noteKey: 'note2' | 'note3' | 'note4', value: string) => {
    const updated = { ...personalNotes, [noteKey]: value };
    setPersonalNotes(updated);
    localStorage.setItem(`song-notes-${initialSong.id}`, JSON.stringify(updated));
    setEditingNote(null);
    showNotification('Nota guardada', 'success');
  };

  const copyLyrics = () => {
    const cleanLyrics = transposedLyrics.replace(/\/\/[^\n]*\n/g, '').replace(/\n{3,}/g, '\n\n').trim();
    navigator.clipboard.writeText(cleanLyrics);
    showNotification('Letra copiada', 'success');
  };

  const shareSong = () => {
    const text = generateSongShareText(song);
    if (navigator.share) {
      navigator.share({ title: song.title, text });
    } else {
      navigator.clipboard.writeText(text);
      showNotification('Copiado al portapapeles', 'success');
    }
  };

  const exportableSong = () => {
    const base = modeKey
      ? { ...song, key: modeKey, lyrics: changeKey(song.lyrics, song.key, modeKey), lyricsByLanguage: song.lyricsByLanguage && Object.fromEntries(Object.entries(song.lyricsByLanguage).map(([l, t]) => [l, changeKey(t as string, song.key, modeKey)])) }
      : song;
    return transposeSongCopy(base, transposition - (preferences.capo || 0));
  };
  const getCurrentKey = () => transposeKey(modeKey || song.key, transposition);
  const resetKey = () => { setModeKey(null); setTransposition(0); };

  const isValidKey = (k: string) => !!parseKey(k);
  const sameKey = (a: string, b: string) => {
    const x = parseKey(a), y = parseKey(b);
    return !!x && !!y && x.root === y.root && x.minor === y.minor;
  };

  const handleKeyChange = (targetKey: string) => {
    if (!isValidKey(targetKey)) return;

    if (editingNote === 'note2') {
      const updated = { ...personalNotes, note2: targetKey };
      setPersonalNotes(updated);
      localStorage.setItem(`song-notes-${initialSong.id}`, JSON.stringify(updated));
    } else if (editingNote === 'note3' || editingNote === 'note4') {
      const updated = { ...personalNotes, [editingNote]: targetKey };
      setPersonalNotes(updated);
      localStorage.setItem(`song-notes-${initialSong.id}`, JSON.stringify(updated));
    }

    const from = parseKey(song.key), to = parseKey(targetKey);
    if (from && to && from.minor !== to.minor) {
      setModeKey(targetKey);
      setTransposition(0);
      return;
    }
    setModeKey(null);
    const semitones = semitonesBetween(song.key, targetKey);
    if (semitones !== null) setTransposition(semitones);
  };

  const formatNote = (note: string): string => (note && isValidKey(note) ? note : '');

  const [chordInfo, setChordInfo] = useState<string | null>(null);

  // Subir la canción a la tabla community_songs de Supabase
  const { user: authUser } = useAuth();
  const [sharing, setSharing] = useState(false);
  const shareWithCommunity = async () => {
    if (sharing) return;
    if (!authUser) { showNotification('Inicia sesión para compartir con la comunidad', 'info'); return; }
    setSharing(true);
    try {
      await shareSongToCommunity(song, authUser.id, song.lyricsByLanguage?.[song.language.split('/')[0]] || song.lyrics);
      showNotification('¡Canción subida a la comunidad!', 'success');
    } catch (e) {
      showNotification(`No se pudo subir la canción: ${e instanceof Error ? e.message : 'error desconocido'}`, 'error');
    } finally {
      setSharing(false);
    }
  };

  // Botón atrás del celular: primero cierra la ventana que esté abierta en esta pantalla
  const openLayersRef = useRef<() => boolean>(() => false);
  openLayersRef.current = () => {
    if (chordInfo) { setChordInfo(null); return true; }
    if (showOrderModal) { setShowOrderModal(false); return true; }
    if (showExportModal) { setShowExportModal(false); return true; }
    if (editingNote) { setEditingNote(null); return true; }
    if (showConfig) { setShowConfig(false); return true; }
    if (showActionsMenu || showSpeedMenu) { setShowActionsMenu(false); setShowSpeedMenu(false); return true; }
    if (showTitle) { endTitle(); return true; }
    if (isPresenting) { stopPresentation(false); return true; }
    return false;
  };
  useEffect(() => {
    const h = (e: Event) => { if (openLayersRef.current()) e.preventDefault(); };
    window.addEventListener('c7-back', h);
    return () => window.removeEventListener('c7-back', h);
  }, []);
  // Cada acorde de la letra es un botón: con doble clic (o doble toque) se abre su diagrama de guitarra
  const renderChordTokens = (line: string) => {
    const parts: (string | JSX.Element)[] = [];
    const re = /[A-G][#b]?[^\s/]*(?:\/[A-G][#b]?)?/g;
    let last = 0, m: RegExpExecArray | null, n = 0;
    while ((m = re.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      const chord = m[0];
      parts.push(
        <span key={n++} onDoubleClick={e => { e.stopPropagation(); setChordInfo(chord); }} style={{ cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none' }} title="Doble clic: ver cómo se toca">{chord}</span>
      );
      last = m.index + chord.length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return parts;
  };

  const renderLyrics = () => {
    const lines = transposedLyrics.split('\n');
    const groups: { id: string | null; nodes: JSX.Element[] }[] = [{ id: null, nodes: [] }];
    const push = (el: JSX.Element) => { groups[groups.length - 1].nodes.push(el); };
    let sectionCursor = 0;
    let lineIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]; const trimmed = line.trim();
      if (trimmed === '') { push(<div key={lineIndex++} className="h-1.5" />); continue; }
      const sectionMatch = trimmed.match(/^(VERSO|CORO|PUENTE|INTRO|FINAL|PRE-CORO|PRE CORO|OUTRO|BRIDGE)\s*(\d*)/i);
      if (sectionMatch && !trimmed.includes('//')) {
        const type = sectionMatch[1].toUpperCase(); const num = sectionMatch[2] || '';
        const sectionId = sections[sectionCursor]?.id || `${type}${num}`.toLowerCase();
        sectionCursor++;
        groups.push({ id: sectionId, nodes: [] });
        const sectionColors: Record<string, string> = { 'VERSO': '#7c3aed', 'CORO': '#f59e0b', 'PUENTE': '#059669', 'INTRO': '#6366f1', 'FINAL': '#ef4444', 'PRE-CORO': '#ec4899', 'PRE CORO': '#ec4899', 'OUTRO': '#0891b2', 'BRIDGE': '#059669' };
        const color = sectionColors[type] || 'var(--accent)';
        push(<div key={lineIndex++} data-section={sectionId} className="mt-3 mb-1"><span className="text-xs font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md inline-block" style={{ color, backgroundColor: color + '20' }} translate="no">{trimmed}</span></div>);
        continue;
      }
      if (trimmed.startsWith('//')) {
        const chordLine = line.slice(line.indexOf('//') + 2).replace(/\s+$/, '');
        if (i + 1 < lines.length && lines[i + 1].trim() !== '' && !lines[i + 1].trim().startsWith('//')) {
          const lyricLine = lines[i + 1]; i++;
          push(<div key={lineIndex++} className="mb-1.5">{preferences.showChords && <div className="font-mono whitespace-pre" style={{ color: 'var(--accent)', fontWeight: 800, letterSpacing: '0.05em', fontSize: `${preferences.fontSize * 0.75}px`, lineHeight: 1.05, marginBottom: '-1px' }} translate="no">{renderChordTokens(chordLine)}</div>}<div className="font-lyrics whitespace-pre-wrap" style={{ fontSize: `${preferences.fontSize}px`, lineHeight: 1.2 }}>{lyricLine}</div></div>);
        } else { push(<div key={lineIndex++} className="mb-1">{preferences.showChords && <div className="font-mono whitespace-pre" style={{ color: 'var(--accent)', fontWeight: 800, fontSize: `${preferences.fontSize * 0.75}px`, lineHeight: 1.1 }} translate="no">{renderChordTokens(chordLine)}</div>}</div>); }
        continue;
      }
      push(<div key={lineIndex++} className="mb-1"><div className="font-lyrics whitespace-pre-wrap" style={{ fontSize: `${preferences.fontSize}px`, lineHeight: 1.25 }}>{line}</div></div>);
    }
    const activeId = isPresenting ? presentationOrder[currentSectionIndex] : null;
    return groups
      .filter(g => g.nodes.length > 0)
      .map((g, gi) => {
        const isActive = isPresenting && g.id !== null && g.id === activeId;
        const style: React.CSSProperties = {
          border: '2px solid transparent',
          borderRadius: '1rem',
          margin: '0 -0.5rem',
          padding: '0 0.5rem 0.125rem',
          transition: 'opacity .3s ease, background-color .3s ease, border-color .3s ease',
          ...(isPresenting ? (isActive ? { backgroundColor: 'var(--accent-light)', borderColor: 'var(--accent)', opacity: 1 } : { opacity: 0.5 }) : {}),
        };
        return <div key={`${g.id || 'inicio'}-${gi}`} data-section-block={g.id || 'inicio'} style={style}>{g.nodes}</div>;
      });
  };

  return (
    <div className="w-full mx-auto flex flex-col h-full -mb-2 sm:mb-0">
      <div className="flex-shrink-0 flex items-center gap-2 mb-1">
        <button onClick={onBack} className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}><ChevronLeft size={16} /></button>
        <h1 className="flex-1 text-sm sm:text-base font-bold truncate">
          {songCode && (
            <span className="mr-2 font-extrabold" style={{ color: 'var(--accent)' }} translate="no">{songCode}</span>
          )}
          {song.title}
        </h1>
        {song.lyricsByLanguage && Object.keys(song.lyricsByLanguage).length > 1 && (() => {
          const languages = Object.keys(song.lyricsByLanguage);
          const currentIndex = languages.indexOf(currentLanguage);
          const nextIndex = (currentIndex + 1) % languages.length;
          const nextLanguage = languages[nextIndex];
          
          return (
            <button
              onClick={() => setCurrentLanguage(nextLanguage)}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all hover:scale-105"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'white'
              }}
            >
              {nextLanguage}
            </button>
          );
        })()}
      </div>

      <div className="flex-shrink-0 flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs flex-nowrap overflow-x-auto flex-1 min-w-0 whitespace-nowrap" style={{ color: 'var(--text-muted)', scrollbarWidth: 'none' }}>
          {hymnalLabel(hymnalInfo.detail, hymnalInfo.number) && (
            <>
              <span className="truncate text-[11px]" style={{ color: 'var(--text-muted)', opacity: 0.85 }} translate="no">{hymnalLabel(hymnalInfo.detail, hymnalInfo.number)}</span>
              <span>•</span>
            </>
          )}
          <span className="truncate">{song.artist}</span>
          <span>•</span>
          <span className="font-bold" style={{ color: 'var(--accent)' }} translate="no">{song.key}</span>
          <span translate="no">{song.timeSignature}</span>
          <span translate="no">{song.bpm} BPM</span>
          <button
            onClick={resetKey}
            className="px-1.5 py-0.5 rounded text-xs font-medium transition-all hover:scale-105"
            style={{ 
              backgroundColor: transposition === 0 && !modeKey ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: transposition === 0 && !modeKey ? 'white' : 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }}
            title="Volver al tono original"
            translate="no"
          >
            {song.key}
          </button>
          {(['note2', 'note3', 'note4'] as const).map(slot => {
            const saved = formatNote(personalNotes[slot] || '');
            const active = !!saved && sameKey(getCurrentKey(), saved);
            return (
              <button
                key={slot}
                onClick={() => {
                  if (longPressed.current) { longPressed.current = false; return; }
                  // vacío (+): se elige el tono; si ya tiene uno, se aplica
                  if (!saved) setEditingNote(slot); else handleKeyChange(saved);
                }}
                onDoubleClick={() => setEditingNote(slot)}
                onPointerDown={() => { longPressed.current = false; if (saved) pressTimer.current = window.setTimeout(() => { longPressed.current = true; setEditingNote(slot); }, 600); }}
                onPointerUp={() => { if (pressTimer.current) window.clearTimeout(pressTimer.current); }}
                onPointerLeave={() => { if (pressTimer.current) window.clearTimeout(pressTimer.current); }}
                className="px-1.5 py-0.5 rounded text-xs font-medium transition-all hover:scale-105"
                style={{
                  backgroundColor: active ? 'var(--accent)' : saved ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                  color: active ? 'white' : saved ? 'var(--accent)' : 'var(--text-muted)',
                  border: '1px solid var(--border-color)', touchAction: 'manipulation',
                }}
                title={saved ? 'Clic: aplicar · doble clic o mantener: cambiar' : 'Clic: guardar un tono'}
                translate="no"
              >
                {saved || '+'}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onToggleImmersive} className="p-1.5 rounded-lg" style={{ backgroundColor: immersive ? 'var(--accent-light)' : 'var(--bg-tertiary)', color: immersive ? 'var(--accent)' : 'var(--text-primary)' }} aria-label={immersive ? 'Salir de pantalla completa' : 'Pantalla completa'} title={immersive ? 'Salir de pantalla completa' : 'Pantalla completa'}>{immersive ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
          <button onClick={() => toggleFavorite(song.id)} className="p-1.5 rounded-lg" style={{ color: isFavorite(song.id) ? 'var(--gold)' : 'var(--text-muted)' }}><Star size={16} fill={isFavorite(song.id) ? 'currentColor' : 'none'} /></button>
          <button onClick={() => setShowConfig(!showConfig)} className="p-1.5 rounded-lg" style={{ backgroundColor: showConfig ? 'var(--accent-light)' : 'var(--bg-tertiary)', color: showConfig ? 'var(--accent)' : 'var(--text-primary)' }}><Settings size={16} /></button>
          <div className="relative" data-menu>
            <button onClick={(e) => { e.stopPropagation(); setShowActionsMenu(!showActionsMenu); }} className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}><MoreVertical size={16} /></button>
            {showActionsMenu && (
              <div className="absolute right-0 top-full mt-2 w-60 rounded-xl shadow-lg overflow-hidden z-50" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                <button onClick={() => { onEdit(); setShowActionsMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:opacity-80" style={{ color: 'var(--text-primary)' }}><Edit3 size={14} /> Editar letra</button>
                <button onClick={() => { copyLyrics(); setShowActionsMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:opacity-80" style={{ color: 'var(--text-primary)' }}><Copy size={14} /> Copiar Letra</button>
                <button onClick={() => { shareSong(); setShowActionsMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:opacity-80" style={{ color: 'var(--text-primary)' }}><Share2 size={14} /> Compartir</button>
                {onAddToList && <button onClick={() => { onAddToList(song); setShowActionsMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:opacity-80" style={{ color: 'var(--text-primary)' }}><ListMusic size={14} /> Agregar a lista</button>}
                <button onClick={() => { shareWithCommunity(); setShowActionsMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:opacity-80" style={{ color: 'var(--text-primary)' }}><Cloud size={14} /> Compartir con la comunidad</button>
                <button onClick={() => { setShowExportModal(true); setShowActionsMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:opacity-80" style={{ color: 'var(--text-primary)' }}><Upload size={14} /> Exportar</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showOrderModal && (
        <PresentationOrderModal
          sections={sections}
          initialSequence={presentationOrder}
          initialInterval={intervalSeconds}
          onSave={saveOrder}
          onClose={() => setShowOrderModal(false)}
        />
      )}

      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setShowConfig(false)}>
          <div className="w-full max-w-md rounded-2xl border p-6 space-y-5" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }} onClick={e => e.stopPropagation()} translate="no">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold">Configuración</h3>
              <button onClick={() => setShowConfig(false)} className="p-1.5 rounded-lg hover:opacity-70" style={{ backgroundColor: 'var(--bg-tertiary)' }}><X size={18} /></button>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2"><span className="text-sm font-semibold">Transposición</span>{(transposition !== 0 || modeKey) && <button onClick={resetKey} className="text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}><RotateCcw size={12} /> Original</button>}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setTransposition(t => t - 1)} className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>−</button>
                <div className="flex-1 text-center"><span className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{transposition > 0 ? `+${transposition}` : transposition}</span><span className="text-xs block" style={{ color: 'var(--text-muted)' }}>semitonos</span></div>
                <button onClick={() => setTransposition(t => t + 1)} className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>+</button>
              </div>
            </div>
            <div><span className="text-sm font-semibold mb-2 block">Tamaño de Letra</span><div className="flex items-center gap-3"><span className="text-xs">A</span><input type="range" min="14" max="40" value={preferences.fontSize} onChange={e => setFontSize(Number(e.target.value))} className="flex-1 accent-purple-600" /><span className="text-xl font-bold">A</span><span className="text-xs w-10 text-right">{preferences.fontSize}px</span></div></div>
            <div className="flex items-center justify-between"><span className="text-sm font-semibold">Mostrar Acordes</span><button onClick={() => setShowChords(!preferences.showChords)} className="w-12 h-7 rounded-full transition-all relative" style={{ backgroundColor: preferences.showChords ? 'var(--accent)' : 'var(--bg-tertiary)' }}><div className="w-5 h-5 rounded-full bg-white absolute top-1 transition-all" style={{ left: preferences.showChords ? '26px' : '4px' }} /></button></div>
            <div><span className="text-sm font-semibold mb-2 block">Capo de Guitarra</span><div className="flex items-center gap-2"><button onClick={() => setCapo(Math.max(0, preferences.capo - 1))} className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>−</button><div className="flex-1 text-center"><span className="text-2xl font-bold">{preferences.capo > 0 ? `${preferences.capo}°` : '—'}</span><span className="text-xs block" style={{ color: 'var(--text-muted)' }}>traste</span></div><button onClick={() => setCapo(Math.min(12, preferences.capo + 1))} className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>+</button></div></div>
          </div>
        </div>
      )}

      {editingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setEditingNote(null)}>
          <div className="w-full max-w-sm rounded-2xl p-5" style={{ backgroundColor: 'var(--card-bg)' }} onClick={e => e.stopPropagation()} translate="no">
            <h3 className="font-bold text-lg mb-1">Mi tono guardado</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Tono actual: <strong style={{ color: 'var(--accent)' }}>{getCurrentKey()}</strong></p>
            
            <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>Mayores:</p>
            <div className="grid grid-cols-6 gap-2 mb-4">
              {KEY_OPTIONS_MAJOR.map(note => (
                <button
                  key={note}
                  onClick={() => { handleKeyChange(note); setEditingNote(null); }}
                  className="py-2 rounded-lg text-sm font-bold transition-all hover:scale-105"
                  style={{ 
                    backgroundColor: sameKey(getCurrentKey(), note) ? '#8b5cf6' : 'var(--bg-secondary)',
                    color: sameKey(getCurrentKey(), note) ? 'white' : 'var(--text-primary)',
                    border: `1px solid ${sameKey(getCurrentKey(), note) ? '#8b5cf6' : 'var(--border-color)'}`
                  }}
                  translate="no"
                >
                  {note}
                </button>
              ))}
            </div>

            <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>Menores:</p>
            <div className="grid grid-cols-6 gap-2 mb-4">
              {KEY_OPTIONS_MINOR.map(minorKey => {
                return (
                  <button
                    key={minorKey}
                    onClick={() => { handleKeyChange(minorKey); setEditingNote(null); }}
                    className="py-2 rounded-lg text-sm font-bold transition-all hover:scale-105"
                    style={{ 
                      backgroundColor: sameKey(getCurrentKey(), minorKey) ? '#8b5cf6' : 'var(--bg-secondary)',
                      color: sameKey(getCurrentKey(), minorKey) ? 'white' : 'var(--text-primary)',
                      border: `1px solid ${sameKey(getCurrentKey(), minorKey) ? '#8b5cf6' : 'var(--border-color)'}`
                    }}
                    translate="no"
                  >
                    {minorKey}
                  </button>
                );
              })}
            </div>

            {formatNote((personalNotes as Record<string, string>)[editingNote] || '') && (
              <button onClick={() => { const updated = { ...personalNotes, [editingNote]: '' }; setPersonalNotes(updated); localStorage.setItem(`song-notes-${initialSong.id}`, JSON.stringify(updated)); setEditingNote(null); }} className="w-full py-2.5 rounded-xl text-sm font-bold mt-2 text-red-500" style={{ backgroundColor: 'var(--bg-tertiary)' }}>Quitar este tono</button>
            )}
            <button onClick={() => setEditingNote(null)} className="w-full py-2.5 rounded-xl text-sm font-bold mt-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>Cancelar</button>
          </div>
        </div>
      )}

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto -mx-3 sm:mx-0 rounded-none sm:rounded-2xl border-y sm:border" style={{ backgroundColor: hasBgImage ? 'color-mix(in srgb, var(--card-bg) 90%, transparent)' : 'var(--card-bg)', backdropFilter: hasBgImage ? 'blur(8px)' : undefined, borderColor: 'var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
        {sections.length > 0 && (
          <div className="sticky top-0 z-20 py-1 px-2 border-b shadow-sm" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 overflow-x-auto flex-1 min-w-0">
                {sequenceButtons.map(({ section, step }) => {
                  const color = SECTION_COLORS[section.type] || 'var(--accent)';
                  const isActive = isPresenting && currentSectionIndex === step;
                  const isDone = isPresenting && step < currentSectionIndex;
                  return (
                    <button
                      key={step}
                      ref={isActive ? activeStepRef : undefined}
                      onClick={() => {
                        if (isPresenting) { setCurrentSectionIndex(step); setPresentTick(t => t + 1); return; }
                        scrollToSection(section.id);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                      style={{ backgroundColor: isActive ? color : color + '20', color: isActive ? 'white' : color, opacity: isDone ? 0.55 : 1 }}
                      title={`${step + 1}. ${section.name}`}
                      translate="no"
                    >
                      {section.label.replace(/·\d+$/, '')}
                    </button>
                  );
                })}
              </div>

              {!isPresenting ? (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setShowOrderModal(true)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                    title="Configurar Orden de Presentación"
                    aria-label="Configurar Orden"
                  >
                    <ListMusic size={14} />
                    <span className="sm:hidden">Orden</span>
                    <span className="hidden sm:inline">Configurar Orden</span>
                    {song.presentationOrder && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#22c55e' }} title="Orden guardado" />}
                  </button>
                  <button
                    onClick={startPresentation}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                    style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                    title="Iniciar presentación"
                    aria-label="Iniciar presentación"
                  >
                    <Play size={14} fill="currentColor" />
                    <span>Play</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-[11px] font-bold px-1 hidden sm:inline" style={{ color: 'var(--text-muted)' }} translate="no">{currentSectionIndex + 1}/{presentationOrder.length}</span>
                  <button onClick={goPrevSection} disabled={currentSectionIndex === 0} className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40" style={{ backgroundColor: 'var(--bg-tertiary)' }} aria-label="Sección anterior" title="Anterior"><ChevronLeft size={16} /></button>
                  <button onClick={togglePause} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }} aria-label={isPaused ? 'Reanudar' : 'Pausa'} title={isPaused ? 'Reanudar' : 'Pausa'}>
                    {isPaused ? <Play size={15} fill="currentColor" /> : <Pause size={15} fill="currentColor" />}
                  </button>
                  <button onClick={goNextSection} disabled={currentSectionIndex >= presentationOrder.length - 1} className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40" style={{ backgroundColor: 'var(--bg-tertiary)' }} aria-label="Sección siguiente" title="Siguiente"><ChevronRight size={16} /></button>
                  <button onClick={() => stopPresentation(false)} className="h-8 px-2.5 rounded-lg flex items-center justify-center gap-1 text-xs font-bold" style={{ backgroundColor: '#ef4444', color: 'white' }} aria-label="Detener" title="Detener">
                    <Square size={13} fill="currentColor" />
                    <span className="hidden sm:inline">Detener</span>
                  </button>
                </div>
              )}
            </div>

            {isPresenting && (
              <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <div
                  key={`${currentSectionIndex}-${presentTick}`}
                  className="h-full rounded-full"
                  style={{ backgroundColor: 'var(--accent)', animation: `c7-progress ${intervalSeconds}s linear forwards`, animationPlayState: isPaused ? 'paused' : 'running' }}
                />
              </div>
            )}
          </div>
        )}
        <div id="song-lyrics-container" className="lyrics-legible px-3 py-2 md:px-6 md:py-3" translate="no">{renderLyrics()}</div>
      </div>

      <div className={`fixed ${immersive ? 'bottom-4' : 'bottom-16'} right-4 z-30 flex flex-col items-center gap-2`}>
        <button 
          onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(!showSpeedMenu); }}
          className="text-lg font-bold transition-all hover:scale-110 active:scale-95"
          style={{ 
            color: 'white',
            textShadow: '0 0 10px rgba(0,0,0,0.8)'
          }}
        >
          {scrollSpeed}
        </button>
        
        {showSpeedMenu && (
          <div className="rounded-2xl p-4 mb-2 w-56" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }}>
            <div className="text-xs text-white/90 mb-3 text-center font-bold">CONTROL DE VELOCIDAD</div>
            
            <div className="text-center mb-3">
              <div className="text-3xl font-bold text-white">{scrollSpeed}</div>
              <div className="text-[10px] text-white/60">velocidad actual</div>
            </div>
            
            <div className="mb-3">
              <input 
                type="range" 
                min="1" 
                max="70" 
                step="1"
                value={scrollSpeed} 
                onChange={e => setScrollSpeed(Number(e.target.value))} 
                className="w-full accent-purple-400"
                style={{ opacity: 0.9 }}
              />
              <div className="flex justify-between text-[9px] text-white/50 mt-1">
                <span>Muy lento</span>
                <span>Muy rápido</span>
              </div>
            </div>
            
            <div className="border-t border-white/20 pt-3">
              <div className="text-[10px] text-white/60 mb-2">Opacidad del botón</div>
              <input 
                type="range" 
                min="10" 
                max="100" 
                step="5"
                value={buttonOpacity} 
                onChange={e => setButtonOpacity(Number(e.target.value))} 
                className="w-full accent-purple-400"
                style={{ opacity: 0.9 }}
              />
              <div className="flex justify-between text-[9px] text-white/50 mt-1">
                <span>Transparente</span>
                <span>Opaco</span>
              </div>
            </div>
          </div>
        )}
        
        <button 
          onClick={() => setIsAutoScrolling(!isAutoScrolling)}
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95" 
          style={{ 
            backgroundColor: isAutoScrolling 
              ? `rgba(239,68,68,${buttonOpacity / 100})`
              : `rgba(124,58,237,${buttonOpacity / 100})`,
            color: 'white', 
            backdropFilter: 'blur(10px)'
          }}
        >
          {isAutoScrolling ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
        </button>
      </div>

      {showTitle && (
        <div
          onClick={endTitle}
          className="fixed inset-0 z-[75] flex flex-col items-center justify-center text-center text-white px-6 cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 55%, #581c87 100%)' }}
          translate="no"
        >
          <div className="text-xs font-bold tracking-[0.3em] uppercase mb-6" style={{ color: '#fde68a' }}>{hymnalLabel(hymnalInfo.detail, hymnalInfo.number)}</div>
          <h1 className="font-black leading-tight mb-4" style={{ fontSize: 'clamp(2rem, 9vw, 4.5rem)', textShadow: '0 2px 12px rgba(0,0,0,.4)' }}>{song.title}</h1>
          {song.artist && song.artist !== 'Desconocido' && <p className="text-xl sm:text-2xl font-semibold opacity-90 mb-2">{song.artist}</p>}
          {extra?.person && <p className="text-lg font-semibold" style={{ color: '#fde68a' }}>Responsable: {extra.person}</p>}
          {extra?.ministry && <p className="text-lg font-semibold" style={{ color: '#fde68a' }}>Ministerio: {extra.ministry}</p>}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm sm:text-base font-bold">
            {song.key && <span className="px-4 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,.16)' }}>Tono {song.key}</span>}
            {song.timeSignature && <span className="px-4 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,.16)' }}>Compás {song.timeSignature}</span>}
            {song.bpm ? <span className="px-4 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,.16)' }}>{song.bpm} BPM</span> : null}
          </div>
          <p className="absolute bottom-6 text-xs opacity-60">Toca para continuar</p>
        </div>
      )}
      {chordInfo && <ChordDiagram chord={chordInfo} onClose={() => setChordInfo(null)} />}
      {showExportModal && (
        <ExportModal songs={[exportableSong()]} onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}

function HymnalView({ hymnal, onSelectSong, onBack, onEditHymnal, onAddSong, onDeleteHymnal, onImportClick, showNotification }: any) {
  const { state, toggleFavorite, isFavorite, addMultipleToFavorites, removeMultipleCustomSongs, updateCustomHymnal } = useApp();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);
  const [showHymnalMenu, setShowHymnalMenu] = useState(false);
  const [showHymnalExportModal, setShowHymnalExportModal] = useState(false);
  const [exportAll, setExportAll] = useState(false);

  const hymnalSongs = useMemo(() => {
    return mergeSongs(allSongs, state.customSongs).filter(s => s.hymnalId === hymnal.id)
      .sort((a, b) => songSortNumber(a, hymnal) - songSortNumber(b, hymnal) || a.title.localeCompare(b.title, 'es', { numeric: true }));
  }, [hymnal, state.customSongs]);

  const getDisplayCode = (song: any) => {
    const prefix = hymnal.codePrefix || hymnal.id.charAt(0).toUpperCase();
    const number = song.number || song.code.match(/(\d+)$/)?.[1] || '1';
    return `${prefix}${number}`;
  };

  useEffect(() => {
    if (!showSelectionMenu && !showHymnalMenu) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-selection-menu]') && !target.closest('[data-hymnal-menu]')) {
        setShowSelectionMenu(false);
        setShowHymnalMenu(false);
      }
    };
    
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showSelectionMenu, showHymnalMenu]);

  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectedSongs([]);
    }
    setSelectionMode(!selectionMode);
  };

  const toggleSongSelection = (songId: string) => {
    if (selectedSongs.includes(songId)) {
      setSelectedSongs(selectedSongs.filter(id => id !== songId));
    } else {
      setSelectedSongs([...selectedSongs, songId]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedSongs.length === hymnalSongs.length) {
      setSelectedSongs([]);
    } else {
      setSelectedSongs(hymnalSongs.map(s => s.id));
    }
  };

  const handleSelectionAction = (action: string) => {
    setShowSelectionMenu(false);
    const selectedSongsData = hymnalSongs.filter(s => selectedSongs.includes(s.id));

    switch (action) {
      case 'favorite':
        addMultipleToFavorites(selectedSongs.map(id => id));
        showNotification(`${selectedSongs.length} canciones marcadas como favoritas`, 'success');
        setSelectedSongs([]);
        break;
      case 'copy':
        const textToCopy = selectedSongsData.map(s => `${getDisplayCode(s)} - ${s.title}\n${s.artist}\n${s.lyrics}\n`).join('\n---\n\n');
        navigator.clipboard.writeText(textToCopy);
        showNotification(`${selectedSongs.length} canciones copiadas al portapapeles`, 'success');
        break;
      case 'send':
        showNotification('Función de enviar canciones (próximamente)', 'info');
        break;
      case 'delete':
        if (confirm(`¿Eliminar ${selectedSongs.length} canciones seleccionadas? Esta acción no se puede deshacer.`)) {
          removeMultipleCustomSongs(selectedSongs);
          showNotification(`${selectedSongs.length} canciones eliminadas`, 'success');
          setSelectedSongs([]);
        }
        break;
      case 'export':
        setShowHymnalExportModal(true);
        break;
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg card-shadow-sm hover:card-shadow-md transition-shadow" style={{ backgroundColor: 'var(--bg-tertiary)' }}><ChevronLeft size={20} /></button>
        {hymnal.image ? (
          <div className="w-14 h-14 rounded-2xl overflow-hidden card-shadow-lg">
            <img src={hymnal.image} alt={hymnal.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl card-shadow-lg" style={{ backgroundColor: hymnal.color + '20' }}>{hymnal.icon}</div>
        )}
        <div className="flex-1"><h2 className="text-lg font-bold">{hymnal.name}</h2><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{hymnalSongs.length} canciones • {hymnal.language}</p></div>
        <button onClick={() => onAddSong(hymnal)} className="p-2.5 rounded-xl card-shadow-md hover:card-shadow-lg transition-all" style={{ backgroundColor: 'var(--accent)', color: 'white' }}><Plus size={18} /></button>
        
        {hymnalSongs.length > 0 && (
          <button 
            onClick={toggleSelectionMode}
            className="p-2.5 rounded-xl card-shadow-sm hover:card-shadow-md transition-all" 
            style={{ backgroundColor: selectionMode ? 'var(--accent)' : 'var(--bg-tertiary)', color: selectionMode ? 'white' : 'var(--text-primary)' }}
            title={selectionMode ? 'Salir de selección' : 'Modo selección'}
          >
            {selectionMode ? <X size={18} /> : <CheckSquare size={18} />}
          </button>
        )}
        
        {selectionMode && (
          <button 
            onClick={toggleSelectAll}
            className="px-3 py-2 rounded-xl card-shadow-sm hover:card-shadow-md transition-all text-xs font-semibold" 
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            title={selectedSongs.length === hymnalSongs.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
          >
            {selectedSongs.length === hymnalSongs.length ? 'Deseleccionar' : 'Seleccionar todo'}
          </button>
        )}
        
        <div className="relative" data-hymnal-menu>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowHymnalMenu(!showHymnalMenu); }} 
            className="p-2.5 rounded-xl card-shadow-sm hover:card-shadow-md transition-all" 
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <MoreVertical size={18} />
          </button>
          {showHymnalMenu && (
            <div onClick={(e) => e.stopPropagation()} className="absolute top-full right-0 mt-1 w-56 rounded-xl card-shadow-lg overflow-hidden z-50" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
              <button onClick={() => { onEditHymnal(hymnal); setShowHymnalMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:opacity-80" style={{ color: 'var(--text-primary)' }}>
                <Edit3 size={14} /> Editar cancionero
              </button>
              <button onClick={() => {
                if (confirm(`¿Eliminar el cancionero "${hymnal.name}"? Esta acción no se puede deshacer.`)) {
                  onDeleteHymnal(hymnal.id);
                  showNotification('Cancionero eliminado', 'success');
                  onBack();
                }
                setShowHymnalMenu(false);
              }} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:opacity-80 text-red-500">
                <Trash2 size={14} /> Eliminar cancionero
              </button>
              <button onClick={() => { setShowHymnalMenu(false); onImportClick && onImportClick(hymnal); }} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:opacity-80" style={{ color: 'var(--text-primary)' }}>
                <Download size={14} /> Importar canciones
              </button>
              <button onClick={() => {
                if (hymnalSongs.length === 0) {
                  showNotification('No hay canciones para exportar', 'error');
                  return;
                }
                setExportAll(true);
                setShowHymnalExportModal(true);
                setShowHymnalMenu(false);
              }} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:opacity-80" style={{ color: 'var(--text-primary)' }}>
                <Upload size={14} /> Exportar cancionero
              </button>
              <button onClick={() => {
                const shareText = `Cancionero: ${hymnal.name}\n${hymnalSongs.length} canciones\n\n${hymnalSongs.map(s => `- ${s.title}`).join('\n')}`;
                if (navigator.share) {
                  navigator.share({ title: hymnal.name, text: shareText });
                } else {
                  navigator.clipboard.writeText(shareText);
                  showNotification('Información copiada', 'success');
                }
                setShowHymnalMenu(false);
              }} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:opacity-80" style={{ color: 'var(--text-primary)' }}>
                <Share2 size={14} /> Compartir
              </button>
            </div>
          )}
        </div>
        
        {selectionMode && (
          <div className="relative" data-selection-menu>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowSelectionMenu(!showSelectionMenu); }} 
              className="px-3 py-2 rounded-xl card-shadow-md hover:card-shadow-lg transition-all flex items-center gap-1.5" 
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              <span className="text-xs font-semibold">Más opciones</span>
              <ChevronDown size={14} />
            </button>
            {showSelectionMenu && (
              <div className="absolute top-full right-0 mt-1 w-48 rounded-xl card-shadow-lg overflow-hidden z-50" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                <button onClick={() => toggleSelectAll()} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:opacity-80" style={{ color: 'var(--text-primary)' }}>
                  <CheckSquare size={14} /> {selectedSongs.length === hymnalSongs.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </button>
                <div className="border-t" style={{ borderColor: 'var(--border-color)' }}></div>
                <button onClick={() => handleSelectionAction('favorite')} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:opacity-80" style={{ color: 'var(--text-primary)' }}>
                  <Star size={14} /> Marcar favorito
                </button>
                <button onClick={() => handleSelectionAction('copy')} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:opacity-80" style={{ color: 'var(--text-primary)' }}>
                  <Copy size={14} /> Copiar
                </button>
                <button onClick={() => handleSelectionAction('send')} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:opacity-80" style={{ color: 'var(--text-primary)' }}>
                  <Share2 size={14} /> Enviar
                </button>
                <button onClick={() => handleSelectionAction('delete')} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:opacity-80 text-red-500">
                  <Trash2 size={14} /> Eliminar
                </button>
                <button onClick={() => handleSelectionAction('export')} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:opacity-80" style={{ color: 'var(--text-primary)' }}>
                  <Upload size={14} /> Exportar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {selectionMode && (
        <div className="px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-between" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '2px solid var(--accent)' }}>
          <span>✓ {selectedSongs.length} canción{selectedSongs.length !== 1 ? 'es' : ''} seleccionada{selectedSongs.length !== 1 ? 's' : ''}</span>
          <span className="text-xs font-normal">Modo selección activo</span>
        </div>
      )}
      
      <div className="space-y-2">
        {hymnalSongs.map(song => {
          const isSelected = selectedSongs.includes(song.id);
          return (
            <div 
              key={song.id} 
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isSelected ? 'card-shadow-md' : 'card-shadow-sm hover:card-shadow-md hover-lift'}`} 
              style={{ 
                backgroundColor: isSelected ? 'var(--accent-light)' : 'var(--card-bg)', 
                borderColor: isSelected ? 'var(--accent)' : 'var(--border-color)',
                borderWidth: isSelected ? '2px' : '1px'
              }}
            >
              {selectionMode && (
                <input 
                  type="checkbox" 
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                    toggleSongSelection(song.id);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                  }}
                  className="w-5 h-5 rounded cursor-pointer accent-purple-600 flex-shrink-0"
                />
              )}
              <div className="flex-1 text-left cursor-pointer" onClick={() => selectionMode ? toggleSongSelection(song.id) : onSelectSong(song)}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent)' }}>{getDisplayCode(song)}</span>
                  <span className="font-bold text-sm">{song.title}</span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{song.artist} • {song.key} • {song.timeSignature} • {song.bpm} BPM</div>
              </div>
              {!selectionMode && (
                <button onClick={(e) => { e.stopPropagation(); toggleFavorite(song.id); }} className="p-2 rounded-lg flex-shrink-0" style={{ color: isFavorite(song.id) ? 'var(--gold)' : 'var(--text-muted)' }}><Star size={18} fill={isFavorite(song.id) ? 'currentColor' : 'none'} /></button>
              )}
            </div>
          );
        })}
        {hymnalSongs.length === 0 && <div className="text-center py-12"><Music size={40} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-3" /><p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hay canciones</p></div>}
      </div>
      
      {showHymnalExportModal && (
        <ExportModal 
          songs={exportAll ? hymnalSongs : hymnalSongs.filter(s => selectedSongs.includes(s.id))} 
          onClose={() => { setShowHymnalExportModal(false); setExportAll(false); }} 
        />
      )}
    </div>
  );
}

function FavoritesPage({ onSelectSong }: any) {
  const { state, toggleFavorite } = useApp();
  const favoriteSongs = useMemo(() => mergeSongs(allSongs, state.customSongs).filter(s => state.favorites.includes(s.id)), [state.favorites, state.customSongs]);
  // Combinar himnarios evitando duplicados
  const allHymnals = useMemo(() => {
    const customIds = new Set(state.customHymnals.map(h => h.id));
    const defaultNotEdited = hymnals.filter(h => !customIds.has(h.id));
    return mergeHymnals(hymnals, state.customHymnals);
  }, [state.customHymnals]);

  const getDisplayCode = (song: any) => {
    const hymnal = allHymnals.find(h => h.id === song.hymnalId);
    if (!hymnal) return song.code;
    const prefix = hymnal.codePrefix || hymnal.id.charAt(0).toUpperCase();
    const number = song.number || song.code.match(/(\d+)$/)?.[1] || '1';
    return `${prefix}${number}`;
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2"><PageBack /><span className="text-2xl">⭐</span><div><h2 className="text-lg font-bold">Mis Favoritos</h2><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{favoriteSongs.length} canciones</p></div></div>
      {favoriteSongs.length > 0 ? (
        <div className="space-y-2">
          {favoriteSongs.map(song => (
            <div key={song.id} className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01]" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
              <button onClick={() => onSelectSong(song)} className="flex-1 text-left">
                <div className="flex items-center gap-2"><span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent)' }}>{getDisplayCode(song)}</span><span className="font-bold text-sm">{song.title}</span></div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{song.artist} • {song.key} • {song.language}</div>
              </button>
              <button onClick={() => toggleFavorite(song.id)} className="p-2 rounded-lg" style={{ color: 'var(--gold)' }}><Star size={18} fill="currentColor" /></button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12"><Music size={40} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-3" /><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aún no tienes favoritos</p></div>
      )}
    </div>
  );
}
