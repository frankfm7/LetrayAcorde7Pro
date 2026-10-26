import { useState } from 'react';
import { ChevronLeft, Save, Trash2, Plus, X } from 'lucide-react';
import { Song } from '../types';
import { useApp } from '../context/AppContext';
import { useNotification } from './NotificationProvider';
import { hymnals } from '../data/songs';
import { changeKey, parseKey, KEY_OPTIONS_MAJOR, KEY_OPTIONS_MINOR } from '../utils/chords';
import { normalizeHymnalNumber, parseSections, defaultSequence, sanitizeSequence, clampInterval, DEFAULT_INTERVAL_SECONDS, SECTION_COLORS } from '../utils/presentation';
import PresentationOrderModal from './PresentationOrderModal';

interface SongEditorProps {
  song: Song;
  onBack: () => void;
}

export default function SongEditor({ song: songProp, onBack }: SongEditorProps) {
  const { state, updateCustomSong, removeCustomSong } = useApp();
  // Si la canción ya se editó antes, se parte de la versión guardada y no de una copia vieja
  const [song] = useState<Song>(() => state.customSongs.find(s => s.id === songProp.id) || songProp);
  const { showNotification } = useNotification();
  
  const [presentationOrder, setPresentationOrder] = useState<{ sections: string[]; intervalSeconds: number } | undefined>(song.presentationOrder);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [hymnalDetail, setHymnalDetail] = useState(song.hymnalDetail || '');
  const [hymnalNumber, setHymnalNumber] = useState(song.hymnalNumber || '');
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [key, setKey] = useState(song.key);
  const [timeSignature, setTimeSignature] = useState(song.timeSignature);
  const [bpm, setBpm] = useState(song.bpm);
  const [language, setLanguage] = useState(song.language.split('/')[0]);
  const [categories, setCategories] = useState<string[]>(song.categories);
  const [lyrics, setLyrics] = useState(song.lyrics);
  const [lyricsByLanguage, setLyricsByLanguage] = useState<Record<string, string>>(song.lyricsByLanguage || {});
  const [activeLanguageTab, setActiveLanguageTab] = useState<string>(song.language.split('/')[0]);
  const [notes, setNotes] = useState(song.notes);
  const [hymnalId, setHymnalId] = useState(song.hymnalId);
  const [modeChange, setModeChange] = useState<'parallel' | 'relative'>('parallel');
  const [showAddLanguageModal, setShowAddLanguageModal] = useState(false);
  const [newLanguageName, setNewLanguageName] = useState('');

  const originalKey = song.key;
  const parsedOriginal = parseKey(originalKey);
  const parsedNew = parseKey(key);
  const modeChanged = !!parsedOriginal && !!parsedNew && parsedOriginal.minor !== parsedNew.minor;

  // Orden de presentación: se calcula con la letra del idioma principal
  const primaryLyrics = activeLanguageTab === language ? lyrics : (lyricsByLanguage[language] || song.lyrics);
  const orderSections = parseSections(primaryLyrics);
  const savedValid = presentationOrder ? sanitizeSequence(presentationOrder.sections, orderSections) : [];
  const effectiveSequence = savedValid.length > 0 ? savedValid : defaultSequence(orderSections);
  const effectiveInterval = presentationOrder ? clampInterval(presentationOrder.intervalSeconds) : DEFAULT_INTERVAL_SECONDS;
  const sectionById = new Map(orderSections.map(sec => [sec.id, sec] as [string, (typeof orderSections)[number]]));
  const allLanguages = [language, ...Object.keys(lyricsByLanguage).filter(l => l !== language)];

  const handleSave = () => {
    if (!title.trim()) {
      showNotification('El título es obligatorio', 'error');
      return;
    }

    let finalLyrics = lyrics;
    const finalLyricsByLanguage = { ...lyricsByLanguage };

    // Siempre guardar la letra actual en el idioma activo
    finalLyricsByLanguage[activeLanguageTab] = lyrics;
    
    // Asegurar que el idioma principal esté en lyricsByLanguage
    if (!finalLyricsByLanguage[language]) {
      finalLyricsByLanguage[language] = lyrics;
    }
    
    // Si hay múltiples idiomas, usar la letra del idioma principal como principal
    if (Object.keys(finalLyricsByLanguage).length > 1) {
      finalLyrics = finalLyricsByLanguage[language] || lyrics;
    }

    // Si cambió la tonalidad, los acordes se convierten: misma modalidad = se trasladan; mayor ↔ menor = se convierten al nuevo modo
    const from = parseKey(originalKey), to = parseKey(key);
    if (from && to && (from.root !== to.root || from.minor !== to.minor)) {
      const opts = { relative: from.minor !== to.minor && modeChange === 'relative' };
      finalLyrics = changeKey(finalLyrics, originalKey, key, opts);
      Object.keys(finalLyricsByLanguage).forEach(lang => {
        finalLyricsByLanguage[lang] = changeKey(finalLyricsByLanguage[lang], originalKey, key, opts);
      });
    }

    const allLanguagesFinal = [language, ...Object.keys(finalLyricsByLanguage).filter(l => l !== language)];
    const languageString = allLanguagesFinal.length > 1 ? allLanguagesFinal.join('/') : language;

    const updatedSong: Song = {
      ...song,
      title: title.trim(),
      artist: artist.trim() || 'Desconocido',
      key,
      timeSignature,
      bpm,
      language: languageString,
      categories,
      lyrics: finalLyrics,
      lyricsByLanguage: Object.keys(finalLyricsByLanguage).length > 0 ? finalLyricsByLanguage : undefined,
      notes,
      hymnalId,
      hymnalDetail: hymnalDetail.trim() || undefined,
      hymnalNumber: normalizeHymnalNumber(hymnalNumber) || undefined,
      presentationOrder: presentationOrder && presentationOrder.sections.length > 0 ? presentationOrder : undefined,
    };
    updateCustomSong(updatedSong);
    showNotification('Canción guardada', 'success');
    onBack();
  };

  const handleAddLanguage = () => {
    if (!newLanguageName.trim()) {
      showNotification('El nombre del idioma es obligatorio', 'error');
      return;
    }
    if (allLanguages.includes(newLanguageName.trim())) {
      showNotification('Este idioma ya existe', 'error');
      return;
    }
    
    const updatedLyricsByLanguage = { ...lyricsByLanguage };
    // Guardar la letra actual en el idioma activo
    updatedLyricsByLanguage[activeLanguageTab] = lyrics;
    // Asegurar que el idioma principal también esté guardado
    if (!updatedLyricsByLanguage[language]) {
      updatedLyricsByLanguage[language] = lyrics;
    }
    // Agregar el nuevo idioma con letra vacía
    updatedLyricsByLanguage[newLanguageName.trim()] = '';
    
    setLyricsByLanguage(updatedLyricsByLanguage);
    setActiveLanguageTab(newLanguageName.trim());
    setLyrics('');
    setNewLanguageName('');
    setShowAddLanguageModal(false);
    showNotification('Idioma agregado', 'success');
  };

  const handleAddLanguageWithPreset = (presetLang: string) => {
    if (allLanguages.includes(presetLang)) {
      showNotification('Este idioma ya existe', 'error');
      return;
    }
    
    const updatedLyricsByLanguage = { ...lyricsByLanguage };
    // Guardar la letra actual en el idioma activo
    updatedLyricsByLanguage[activeLanguageTab] = lyrics;
    // Asegurar que el idioma principal también esté guardado
    if (!updatedLyricsByLanguage[language]) {
      updatedLyricsByLanguage[language] = lyrics;
    }
    // Agregar el nuevo idioma con letra vacía
    updatedLyricsByLanguage[presetLang] = '';
    
    setLyricsByLanguage(updatedLyricsByLanguage);
    setActiveLanguageTab(presetLang);
    setLyrics('');
    setNewLanguageName('');
    setShowAddLanguageModal(false);
    showNotification(`Idioma ${presetLang} agregado`, 'success');
  };

  const handleLanguageTabChange = (lang: string) => {
    // Guardar la letra actual antes de cambiar
    const updatedLyricsByLanguage = { ...lyricsByLanguage };
    updatedLyricsByLanguage[activeLanguageTab] = lyrics;
    setLyricsByLanguage(updatedLyricsByLanguage);
    
    // Cambiar al nuevo idioma
    setActiveLanguageTab(lang);
    setLyrics(updatedLyricsByLanguage[lang] || '');
  };

  const handleRemoveLanguage = (lang: string) => {
    if (lang === language) {
      showNotification('No puedes eliminar el idioma principal', 'error');
      return;
    }
    if (confirm(`¿Eliminar el idioma "${lang}"?`)) {
      const updatedLyricsByLanguage = { ...lyricsByLanguage };
      delete updatedLyricsByLanguage[lang];
      setLyricsByLanguage(updatedLyricsByLanguage);
      setActiveLanguageTab(language);
      setLyrics(updatedLyricsByLanguage[language] || lyrics);
      showNotification('Idioma eliminado', 'success');
    }
  };

  const handleDelete = () => {
    if (confirm(`¿Estás seguro de eliminar "${title}"? Esta acción no se puede deshacer.`)) {
      removeCustomSong(song.id);
      showNotification('Canción eliminada', 'success');
      onBack();
    }
  };

  // Combinar himnarios evitando duplicados
  const customIds = new Set(state.customHymnals.map(h => h.id));
  const defaultNotEdited = hymnals.filter(h => !customIds.has(h.id));
  const allHymnals = [...defaultNotEdited, ...state.customHymnals];

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">Editor de letras</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{song.code}</p>
        </div>
        <button onClick={handleDelete} className="p-2 rounded-xl text-red-500" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <Trash2 size={20} />
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold mb-1.5 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Detalle de Cancionero</label>
            <input type="text" value={hymnalDetail} onChange={e => setHymnalDetail(e.target.value)} placeholder="Ej: Himno Cala, Himnario Verde" maxLength={60}
                   className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="text-xs font-bold mb-1.5 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Numeración Propia</label>
            <input type="text" value={hymnalNumber} onChange={e => setHymnalNumber(e.target.value)} onBlur={() => setHymnalNumber(normalizeHymnalNumber(hymnalNumber))} placeholder="Ej: N° 75" maxLength={30}
                   className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold mb-1.5 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Título *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                   className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="text-xs font-bold mb-1.5 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Artista</label>
            <input type="text" value={artist} onChange={e => setArtist(e.target.value)}
                   className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold mb-1.5 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Tonalidad</label>
            <select value={key} onChange={e => setKey(e.target.value)}
                    className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
              {![...KEY_OPTIONS_MAJOR, ...KEY_OPTIONS_MINOR].includes(key) && <option value={key}>{key}</option>}
              <optgroup label="Mayores">
                {KEY_OPTIONS_MAJOR.map(k => <option key={k} value={k}>{k}</option>)}
              </optgroup>
              <optgroup label="Menores">
                {KEY_OPTIONS_MINOR.map(k => <option key={k} value={k}>{k}</option>)}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold mb-1.5 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Compás</label>
            <select value={timeSignature} onChange={e => setTimeSignature(e.target.value)}
                    className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
              <option>4/4</option><option>3/4</option><option>6/8</option><option>2/4</option><option>2/2</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold mb-1.5 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>BPM</label>
            <input type="number" value={bpm} onChange={e => setBpm(Number(e.target.value))} min="40" max="240"
                   className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
          </div>
        </div>

        {key !== originalKey && parsedOriginal && parsedNew && (
          <div className="rounded-xl p-3 border text-xs space-y-2" style={{ backgroundColor: 'var(--accent-light)', borderColor: 'var(--accent)', color: 'var(--text-primary)' }}>
            <div><strong>Tonalidad: {originalKey} → {key}.</strong> Al guardar, los acordes de la letra se {modeChanged ? 'convierten' : 'trasladan'} a la nueva tonalidad.</div>
            {modeChanged && (
              <div className="space-y-1.5">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" className="mt-0.5" checked={modeChange === 'parallel'} onChange={() => setModeChange('parallel')} />
                  <span><strong>Convertir los acordes a {parsedNew.minor ? 'menor' : 'mayor'}</strong> (I → i, IV → iv…). Ej.: {parsedNew.minor ? 'C  F  G → Cm  Fm  G' : 'Cm  Fm  G → C  F  G'}</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" className="mt-0.5" checked={modeChange === 'relative'} onChange={() => setModeChange('relative')} />
                  <span><strong>Solo cambiar el nombre de la tonalidad</strong>, sin tocar los acordes (relativa: Do mayor ↔ La menor).</span>
                </label>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="text-xs font-bold mb-1.5 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Cancionero</label>
          <select value={hymnalId} onChange={e => setHymnalId(e.target.value)}
                  className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
            {allHymnals.map(h => (
              <option key={h.id} value={h.id}>{h.icon} {h.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold mb-1.5 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Idioma Principal</label>
          <div className="flex gap-2">
            <select 
              value={language} 
              onChange={e => setLanguage(e.target.value)}
              className="flex-1 p-3 rounded-xl border text-sm" 
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              <option value="Castellano">Castellano</option>
              <option value="Aymara">Aymara</option>
              <option value="Quechua">Quechua</option>
              <option value="Inglés">Inglés</option>
              <option value="Otro">Otro (especificar abajo)</option>
            </select>
            <button
              onClick={() => setShowAddLanguageModal(true)}
              className="px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Agregar idioma</span>
            </button>
          </div>
          {language === 'Otro' && (
            <input 
              type="text" 
              placeholder="Especificar idioma..."
              className="w-full p-3 rounded-xl border text-sm mt-2" 
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              onBlur={e => {
                if (e.target.value.trim()) {
                  setLanguage(e.target.value.trim());
                }
              }}
            />
          )}
        </div>

        <div>
          <label className="text-xs font-bold mb-1.5 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Letra y Acordes</label>
          
          {/* Pestañas de idiomas si hay múltiples */}
          {allLanguages.length > 1 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {allLanguages.map(lang => (
                <div key={lang} className="flex items-center gap-1">
                  <button
                    onClick={() => handleLanguageTabChange(lang)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{
                      backgroundColor: activeLanguageTab === lang ? 'var(--accent)' : 'var(--bg-tertiary)',
                      color: activeLanguageTab === lang ? 'white' : 'var(--text-primary)',
                      border: activeLanguageTab === lang ? '2px solid var(--accent)' : '2px solid transparent'
                    }}
                  >
                    {lang}
                  </button>
                  {lang !== language && (
                    <button
                      onClick={() => handleRemoveLanguage(lang)}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20"
                      title="Eliminar idioma"
                    >
                      <X size={12} className="text-red-500" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <textarea
            value={lyrics}
            onChange={e => setLyrics(e.target.value)}
            rows={15}
            className="w-full p-3 rounded-xl border text-sm font-mono"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            placeholder={`VERSO 1\n//G            Em          C          D\nLetra de la canción\n//G            Em          C          D\ncon acordes arriba`}
          />
          {allLanguages.length > 1 && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Editando: <strong>{activeLanguageTab}</strong> {activeLanguageTab === language && '(Idioma principal)'}
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-bold mb-1.5 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Orden de presentación</label>
          <div className="rounded-xl p-3 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            {orderSections.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Escribe títulos de sección en la letra (VERSO 1, CORO, PUENTE…) para poder configurar cómo se presenta la canción.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5 mb-2" translate="no">
                  {effectiveSequence.map((id, i) => {
                    const sec = sectionById.get(id);
                    if (!sec) return null;
                    const color = SECTION_COLORS[sec.type] || 'var(--accent)';
                    return <span key={`${id}-${i}`} className="px-2.5 py-1 rounded-lg text-xs font-extrabold" style={{ backgroundColor: color + '22', color }}>{sec.label}</span>;
                  })}
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                  {presentationOrder ? `Orden guardado · ${effectiveInterval} s por sección` : `Orden por defecto · ${effectiveInterval} s por sección`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setShowOrderModal(true)} className="px-3 py-2 rounded-lg text-xs font-bold" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>Configurar orden</button>
                  {presentationOrder && (
                    <button type="button" onClick={() => setPresentationOrder(undefined)} className="px-3 py-2 rounded-lg text-xs font-bold" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>Usar el orden por defecto</button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold mb-1.5 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Notas adicionales</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                    className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
        </div>

        <button onClick={handleSave} disabled={!title.trim()} className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
          <Save size={16} /> Guardar Cambios
        </button>
      </div>

      {/* Modal para agregar nuevo idioma */}
      {showAddLanguageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setShowAddLanguageModal(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 space-y-4" style={{ backgroundColor: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg">Agregar Idioma</h3>
            
            {/* Idiomas predefinidos comunes */}
            <div>
              <label className="text-xs font-bold mb-2 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Idiomas comunes</label>
              <div className="flex flex-wrap gap-2">
                {['Aymara', 'Quechua', 'Inglés', 'Portugués', 'Francés', 'Italiano', 'Alemán'].map(lang => {
                  const isAlreadyAdded = allLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      onClick={() => {
                        if (!isAlreadyAdded) {
                          setNewLanguageName(lang);
                          setTimeout(() => {
                            handleAddLanguageWithPreset(lang);
                          }, 0);
                        }
                      }}
                      disabled={isAlreadyAdded}
                      className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        backgroundColor: isAlreadyAdded ? 'var(--bg-tertiary)' : 'var(--accent-light)',
                        color: isAlreadyAdded ? 'var(--text-muted)' : 'var(--accent)',
                        border: '2px solid var(--border-color)',
                        opacity: isAlreadyAdded ? 0.5 : 1,
                        cursor: isAlreadyAdded ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isAlreadyAdded ? `${lang} ✓` : lang}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Opción de idioma personalizado */}
            <div>
              <label className="text-xs font-bold mb-2 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>O escribe un idioma personalizado</label>
              <input
                type="text"
                value={newLanguageName}
                onChange={e => setNewLanguageName(e.target.value)}
                placeholder="Ej: Guaraní, Mapudungun, etc."
                className="w-full p-3 rounded-xl border text-sm"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAddLanguageModal(false);
                  setNewLanguageName('');
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAddLanguage}
                disabled={!newLanguageName.trim()}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
      {showOrderModal && (
        <PresentationOrderModal
          sections={orderSections}
          initialSequence={effectiveSequence}
          initialInterval={effectiveInterval}
          onSave={(sequence, seconds) => { setPresentationOrder({ sections: sequence, intervalSeconds: seconds }); setShowOrderModal(false); }}
          onClose={() => setShowOrderModal(false)}
        />
      )}
    </div>
  );
}
