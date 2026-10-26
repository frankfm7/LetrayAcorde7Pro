import { useState } from 'react';
import { X, Check, Image as ImageIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNotification } from './NotificationProvider';
import ExportThemePicker from './ExportThemePicker';
import HymnalBackgroundPicker from './HymnalBackgroundPicker';
import HymnalDefaultsPicker from './HymnalDefaultsPicker';
import { compressImageToDataUrl } from '../utils/imageUtils';

const ICONS = ['🎵', '🎶', '🎸', '🎹', '🥁', '🎺', '🎻', '🎤', '⛪', '🏔️', '🌿', '✍️', '📖', '🕊️', '⭐', '🌟', '🎼', '🎯', '❤️', '🔥', '🌊', '🌙', '☀️', '🌈', '🦋', '🌺', '🍀', '🏆', '💎', '🎭'];
const COLORS = ['#a855f7', '#7c3aed', '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#d946ef', '#8b5cf6'];
const DEFAULT_LANGUAGES = ['Castellano', 'Aymara', 'Quechua', 'Inglés', 'Portugués', 'Francés', 'Italiano', 'Alemán'];

interface AddHymnalModalProps {
  onClose: () => void;
}

export default function AddHymnalModal({ onClose }: AddHymnalModalProps) {
  const { addCustomHymnal } = useApp();
  const { showNotification } = useNotification();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['Castellano']);
  const [icon, setIcon] = useState('🎵');
  const [color, setColor] = useState('#a855f7');
  const [codePrefix, setCodePrefix] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [exportTheme, setExportTheme] = useState<string | undefined>(undefined);
  const [bgList, setBgList] = useState(true);
  const [songDetail, setSongDetail] = useState('');
  const [autoNumber, setAutoNumber] = useState(false);
  const [hideNumber, setHideNumber] = useState(false);
  const [numberStart, setNumberStart] = useState(1);
  const [bgSong, setBgSong] = useState('inherit');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showNotification('La imagen es muy grande. Máximo 5MB', 'error');
      return;
    }

    compressImageToDataUrl(file).then(setCoverImage).catch(() => showNotification('No se pudo cargar la imagen', 'error'));
  };

  const handleSave = () => {
    if (!name.trim()) {
      showNotification('El nombre es obligatorio', 'error');
      return;
    }

    const prefix = codePrefix.trim() || name.trim().charAt(0).toUpperCase();
    
    const newHymnal = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      language: selectedLanguages.join('/'),
      icon,
      color,
      isCustom: true,
      codePrefix: prefix,
      image: coverImage || undefined,
      exportTheme: exportTheme === 'image' && !coverImage ? 'hymnal' : exportTheme,
      bgList: coverImage ? bgList : false,
      songDetail: songDetail.trim() || undefined,
      autoNumber: autoNumber || undefined,
      numberStart: autoNumber ? numberStart : undefined,
      hideOwnNumber: hideNumber || undefined,
      bgSong: bgSong === 'cover' && !coverImage ? 'inherit' : bgSong,
    };

    addCustomHymnal(newHymnal);
    showNotification('Cancionero creado exitosamente', 'success');
    onClose();
  };

  const toggleLanguage = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      if (selectedLanguages.length > 1) {
        setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
      }
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-xl">Crear Nuevo Cancionero</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:opacity-70" style={{ backgroundColor: 'var(--bg-tertiary)' }}><X size={20} /></button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-xs font-bold mb-2 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Nombre *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Mi repertorio favorito"
                   className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} autoFocus />
          </div>

          <div>
            <label className="text-xs font-bold mb-2 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción breve del cancionero..."
                      className="w-full p-3 rounded-xl border text-sm resize-none" rows={2} style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
          </div>

          <div>
            <label className="text-xs font-bold mb-2 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Idiomas</label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_LANGUAGES.map(lang => (
                <button key={lang} onClick={() => toggleLanguage(lang)}
                        className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          backgroundColor: selectedLanguages.includes(lang) ? 'var(--accent)' : 'var(--bg-tertiary)',
                          color: selectedLanguages.includes(lang) ? 'white' : 'var(--text-primary)',
                          border: selectedLanguages.includes(lang) ? '2px solid var(--accent)' : '2px solid transparent'
                        }}>
                  {selectedLanguages.includes(lang) && <Check size={12} className="inline mr-1" />}
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold mb-2 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Prefijo del Código</label>
            <input type="text" value={codePrefix} onChange={e => setCodePrefix(e.target.value.toUpperCase())} maxLength={3} placeholder="Ej: HA, AL, M"
                   className="w-full p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Se usará para identificar las canciones (ej: {codePrefix || name.charAt(0).toUpperCase() || 'X'}1, {codePrefix || name.charAt(0).toUpperCase() || 'X'}2...)</p>
          </div>

          <div>
            <label className="text-xs font-bold mb-2 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Icono</label>
            <div className="grid grid-cols-10 gap-2">
              {ICONS.map(i => (
                <button key={i} onClick={() => setIcon(i)}
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all hover:scale-110"
                        style={{ backgroundColor: icon === i ? 'var(--accent-light)' : 'var(--bg-tertiary)', border: icon === i ? '2px solid var(--accent)' : '2px solid transparent' }}>
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold mb-2 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Color</label>
            <div className="grid grid-cols-8 gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                        className="w-10 h-10 rounded-xl transition-all hover:scale-110 flex items-center justify-center"
                        style={{ backgroundColor: c, border: color === c ? '3px solid white' : '3px solid transparent', boxShadow: color === c ? `0 0 0 2px ${c}` : 'none' }}>
                  {color === c && <Check size={18} color="white" />}
                </button>
              ))}
            </div>
          </div>

          <HymnalDefaultsPicker detail={songDetail} autoNumber={autoNumber} start={numberStart} hideNumber={hideNumber} onChange={p => { if (p.hideNumber !== undefined) setHideNumber(p.hideNumber); if (p.detail !== undefined) setSongDetail(p.detail); if (p.autoNumber !== undefined) setAutoNumber(p.autoNumber); if (p.start !== undefined) setNumberStart(p.start); }} />

          <ExportThemePicker value={exportTheme} onChange={setExportTheme} color={color} image={coverImage} />

          <HymnalBackgroundPicker bgList={bgList} bgSong={bgSong} hasCover={!!coverImage} onChange={p => { if (p.bgList !== undefined) setBgList(p.bgList); if (p.bgSong !== undefined) setBgSong(p.bgSong); }} />

          <div>
            <label className="text-xs font-bold mb-2 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Imagen de Portada (Opcional)</label>
            {coverImage ? (
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg overflow-hidden">
                  <img src={coverImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Imagen cargada</p>
                  <button onClick={() => setCoverImage(null)} className="text-xs text-red-500 font-semibold mt-1">Eliminar imagen</button>
                </div>
                <label className="px-3 py-2 rounded-lg text-xs font-bold cursor-pointer" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  Cambiar
                </label>
              </div>
            ) : (
              <label className="cursor-pointer">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <div className="rounded-xl border-2 border-dashed p-4 text-center transition-all hover:border-opacity-70" style={{ borderColor: 'var(--border-color)' }}>
                  <ImageIcon size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-xs font-medium">Click para subir imagen</p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Se usará como fondo del cancionero</p>
                </div>
              </label>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-bold" style={{ backgroundColor: 'var(--bg-tertiary)' }}>Cancelar</button>
            <button onClick={handleSave} disabled={!name.trim()} className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-50" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>Crear Cancionero</button>
          </div>
        </div>
      </div>
    </div>
  );
}
