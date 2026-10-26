import { useMemo, useState } from 'react';
import { X, ChevronLeft, FileText, FileJson, File, Image, FileDown } from 'lucide-react';
import { Song } from '../types';
import { exportAsTxt, exportAsJson, exportAsWord, exportAsPdf } from '../utils/exportUtils';
import { exportAsImages, resolveImageColors, ImageStyle, DEFAULT_IMAGE_STYLE } from '../utils/exportImage';
import { resolveTheme, themeChoices } from '../utils/exportThemes';
import { useSongLibrary } from '../hooks/useSongLibrary';
import { useNotification } from './NotificationProvider';
import { useBackgrounds } from '../utils/backgroundStore';
import { withHymnalInfo } from '../utils/hymnalInfo';

interface ExportModalProps {
  songs: Song[];
  onClose: () => void;
  /** Ya no se usa (la imagen se dibuja directamente); se mantiene para no romper llamadas antiguas */
  songElementId?: string;
}

type Format = 'txt' | 'word' | 'pdf' | 'image' | 'json';

export default function ExportModal({ songs, onClose }: ExportModalProps) {
  const { showNotification } = useNotification();
  const { hymnals } = useSongLibrary();
  const [busy, setBusy] = useState<Format | null>(null);
  const [themeId, setThemeId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'image' | 'pdf'>('list');
  const [style, setStyle] = useState<ImageStyle>(() => {
    try { return { ...DEFAULT_IMAGE_STYLE, ...JSON.parse(localStorage.getItem('c7-image-style') || '{}') }; } catch { return { ...DEFAULT_IMAGE_STYLE }; }
  });
  const updateStyle = (patch: ImageStyle) => setStyle(prev => {
    const next = { ...prev, ...patch };
    try { localStorage.setItem('c7-image-style', JSON.stringify(next)); } catch { /* sin almacenamiento */ }
    return next;
  });

  const hymnal = useMemo(() => hymnals.find(h => h.id === songs[0]?.hymnalId), [hymnals, songs]);
  const { images: userImages } = useBackgrounds();
  const choices = useMemo(() => themeChoices(hymnal, userImages), [hymnal, userImages]);
  // Sin elegir nada: PDF en blanco (para imprimir) e imagen con el fondo del cancionero
  const effective = (fmt: Format) => themeId ?? hymnal?.exportTheme ?? (fmt === 'image' ? 'hymnal' : 'light');
  const previewTheme = resolveTheme(effective('image'), hymnal);
  const plural = songs.length > 1;
  const oc = style.outlineColor || 'auto';
  const outlineCss = oc === 'auto' ? (/^(#fff|#ffffff|rgba?\(255)/i.test(previewTheme.text) ? '#000' : '#fff') : oc === 'black' ? '#000' : oc === 'white' ? '#fff' : oc;
  const ow = Math.max(1, (style.outlineWidth ?? 0.2) * 8);
  const previewOutline: React.CSSProperties | undefined = view === 'image' && style.textOutline !== false
    ? { textShadow: [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]].map(([dx, dy]) => `${dx * ow}px ${dy * ow}px 0 ${outlineCss}`).join(',') }
    : undefined;
  const pv: ImageStyle = view === 'image' ? style : DEFAULT_IMAGE_STYLE;
  const pc = view === 'image'
    ? resolveImageColors(previewTheme, style)
    : { text: previewTheme.text, chord: previewTheme.chord, section: previewTheme.section, muted: previewTheme.muted, title: previewTheme.text, panel: previewTheme.card };

  const handleExport = async (format: Format) => {
    if (busy) return;
    setBusy(format);
    try {
      const full = songs.map(s => withHymnalInfo(s, hymnals));
      switch (format) {
        case 'txt': exportAsTxt(full); break;
        case 'json': exportAsJson(songs); break;
        case 'word': await exportAsWord(full); break;
        case 'pdf': exportAsPdf(full, { themeId: effective('pdf'), hymnals }); break;
        case 'image': await exportAsImages(full, { themeId: effective('image'), hymnals, style }); break;
      }
      const names: Record<Format, string> = { txt: 'TXT', json: 'JSON', word: 'Word', pdf: 'PDF', image: 'imagen' };
      showNotification(`${songs.length} canción${plural ? 'es' : ''} exportada${plural ? 's' : ''} como ${names[format]}`, 'success');
      onClose();
    } catch (error) {
      showNotification('Error al exportar: ' + (error as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const options: Array<{ id: Format; icon: JSX.Element; title: string; desc: string }> = [
    { id: 'txt', icon: <FileText size={22} />, title: '📄 Archivo de texto (.txt)', desc: 'Letra con acordes alineados, en texto plano' },
    { id: 'word', icon: <File size={22} />, title: '📝 Archivo de Word (.docx)', desc: 'Documento Word editable' },
    { id: 'pdf', icon: <FileDown size={22} />, title: '📕 Archivo PDF', desc: 'Para imprimir o compartir, con el fondo elegido' },
    { id: 'image', icon: <Image size={22} />, title: '🖼️ Imagen (PNG)', desc: plural ? 'Una imagen por canción, con el fondo elegido' : 'Captura bonita de la canción con el fondo elegido' },
    { id: 'json', icon: <FileJson size={22} />, title: '📦 Documento JSON', desc: 'Datos completos para volver a importar' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ overflowY: 'auto', display: 'block' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg">{view === 'image' ? 'Exportar como imagen' : view === 'pdf' ? 'Exportar como PDF' : `Exportar canción${plural ? 'es' : ''}`}</h3>
          <button onClick={onClose} className="icon-btn icon-btn-sm" aria-label="Cerrar"><X size={16} /></button>
        </div>
        {plural && <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>{songs.length} canciones seleccionadas</p>}

        {view !== 'list' && (
          <>
            <button onClick={() => setView('list')} className="mb-2 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5" style={{ backgroundColor: 'var(--bg-tertiary)' }}><ChevronLeft size={14} /> Volver a los formatos</button>
        {/* Fondo */}
        <div className="mt-3 mb-4">
          <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Fondo</div>
          <div
            className="rounded-2xl p-4 mb-3 relative"
            style={{
              background: previewTheme.image ? `center / cover url("${previewTheme.image}")` : previewTheme.colors.length > 1 ? `linear-gradient(135deg, ${previewTheme.colors[0]}, ${previewTheme.colors[1]})` : previewTheme.colors[0],
              border: '1px solid var(--border-color)',
            }}
          >
            <div className="absolute inset-0 rounded-2xl" style={{ backgroundColor: `rgba(0,0,0,${view === 'image' ? (pv.bgDim ?? 0.1) : 0})` }} />
            <div className="relative p-3">
              <div className="absolute rounded-xl" style={{ inset: 0, backgroundColor: pc.panel, opacity: pv.panelOpacity ?? 1, filter: `blur(${(pv.panelFeather ?? 0) / 3}px)` }} />
              <div className="relative" style={previewOutline}>
                <div className="text-sm font-extrabold" style={{ color: pc.title }}>{songs[0]?.title || 'Canción'}</div>
                <div className="text-[10px] font-semibold" style={{ color: pc.muted }}>Artista • Tono G</div>
                <div className="text-[10px] font-black uppercase mt-1" style={{ color: pc.section }}>Verso 1</div>
                <div className="font-mono text-xs font-bold" style={{ color: pc.chord }} translate="no">G        D</div>
                <div className="font-mono text-xs font-semibold" style={{ color: pc.text }}>Letra de ejemplo</div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {choices.map(c => {
              const active = themeId !== null ? themeId === c.id : false;
              return (
                <button
                  key={c.id}
                  onClick={() => setThemeId(c.id)}
                  title={c.name}
                  aria-label={c.name}
                  className="relative w-11 h-11 rounded-xl transition-transform hover:scale-110"
                  style={{ background: c.preview, border: `3px solid ${active ? 'var(--accent)' : 'var(--border-color)'}`, boxShadow: active ? '0 0 0 2px var(--accent-light)' : 'none' }}
                />
              );
            })}
          </div>
          <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
            {themeId === null ? 'Automático: PDF en blanco para imprimir e imagen con el color del cancionero. ' : ''}
            El fondo por defecto se cambia desde “Editar cancionero”.
          </p>
        </div>

        {/* Personalizar la imagen */}
        {view === 'image' && <div className="mb-4 rounded-2xl border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <div className="p-3 text-sm font-bold">🎨 Personalizar imagen (recuadro y colores)</div>
          {true && (
            <div className="px-3 pb-3 space-y-3">
              <div>
                <div className="text-xs font-semibold mb-1">Recuadro y letras</div>
                <div className="flex gap-1.5">
                  {([['auto', 'Automático'], ['dark', 'Recuadro oscuro'], ['light', 'Recuadro claro']] as const).map(([id, label]) => (
                    <button key={id} type="button" className="chip flex-1" data-active={(style.panelTone || 'auto') === id} onClick={() => updateStyle({ panelTone: id })}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl p-2.5" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer mb-2">
                  <input type="checkbox" checked={style.textOutline !== false} onChange={e => updateStyle({ textOutline: e.target.checked })} />
                  Contorno en las letras
                </label>
                {style.textOutline !== false && (
                  <>
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {([['auto', 'Automático (contrario a la letra)'], ['black', 'Negro'], ['white', 'Blanco']] as const).map(([id, label]) => (
                        <button key={id} type="button" className="chip" data-active={(style.outlineColor || 'auto') === id} onClick={() => updateStyle({ outlineColor: id })}>{label}</button>
                      ))}
                      <label className="chip flex items-center gap-1.5 cursor-pointer" data-active={/^#/.test(style.outlineColor || '')}>
                        Otro color
                        <input type="color" value={/^#[0-9a-f]{6}$/i.test(style.outlineColor || '') ? style.outlineColor : '#ff0000'} onChange={e => updateStyle({ outlineColor: e.target.value })} className="w-6 h-6 p-0 border-0 rounded cursor-pointer" aria-label="Color del contorno" />
                      </label>
                    </div>
                    <label className="block text-xs font-semibold">
                      Grosor del contorno: {Math.round((style.outlineWidth ?? 0.2) * 100)}
                      <input type="range" min={0.05} max={0.35} step={0.01} value={style.outlineWidth ?? 0.2} onChange={e => updateStyle({ outlineWidth: Number(e.target.value) })} className="w-full accent-purple-600" />
                    </label>
                  </>
                )}
              </div>
              <label className="block text-xs font-semibold">
                Oscuridad de la imagen de fondo: {Math.round((style.bgDim ?? 0.1) * 100)}%
                <input type="range" min={0} max={0.6} step={0.05} value={style.bgDim ?? 0.1} onChange={e => updateStyle({ bgDim: Number(e.target.value) })} className="w-full accent-purple-600" />
              </label>
              <label className="block text-xs font-semibold">
                Intensidad del recuadro: {Math.round((style.panelOpacity ?? 1) * 100)}%{(style.panelOpacity ?? 1) === 0 ? ' (sin recuadro)' : ''}
                <input type="range" min={0} max={1} step={0.05} value={style.panelOpacity ?? 1} onChange={e => updateStyle({ panelOpacity: Number(e.target.value) })} className="w-full accent-purple-600" />
              </label>
              <label className="block text-xs font-semibold">
                Difuminado de los bordes: {style.panelFeather ?? 0}
                <input type="range" min={0} max={40} step={1} value={style.panelFeather ?? 0} onChange={e => updateStyle({ panelFeather: Number(e.target.value) })} className="w-full accent-purple-600" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([['panelColor', 'Recuadro', '#080814'], ['titleColor', 'Título', pc.title], ['infoColor', 'Artista y datos', pc.muted], ['sectionColor', 'Verso / Coro', pc.section], ['chordColor', 'Acordes', pc.chord], ['textColor', 'Letra', pc.text]] as Array<[keyof ImageStyle, string, string]>).map(([k, label, fallback]) => {
                  const value = style[k] as string | undefined;
                  const hex = value || (/^#[0-9a-f]{6}$/i.test(fallback) ? fallback : '#ffffff');
                  return (
                    <div key={k} className="flex items-center gap-2 text-xs font-semibold">
                      <input type="color" value={hex} onChange={e => updateStyle({ [k]: e.target.value } as ImageStyle)} className="w-9 h-9 rounded-lg border-0 p-0 cursor-pointer" aria-label={label} />
                      <span className="flex-1">{label}</span>
                      {value && <button type="button" onClick={() => updateStyle({ [k]: undefined } as ImageStyle)} className="text-[11px]" style={{ color: 'var(--accent)' }}>Auto</button>}
                    </div>
                  );
                })}
              </div>
              <button type="button" className="btn btn-soft btn-sm" onClick={() => { setStyle({ ...DEFAULT_IMAGE_STYLE }); try { localStorage.removeItem('c7-image-style'); } catch { /* */ } }}>Restablecer estilo</button>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Solo afecta a la imagen (PNG). Se recuerda para la próxima vez.</p>
            </div>
          )}
        </div>}

            <button onClick={() => handleExport(view)} disabled={busy !== null} className="btn btn-primary btn-block">{busy ? 'Generando…' : view === 'image' ? 'Exportar imagen (PNG)' : 'Exportar PDF'}</button>
          </>
        )}
        {view === 'list' && (
        <div className="space-y-2">
          {options.map(o => (
            <button
              key={o.id}
              onClick={() => (o.id === 'image' || o.id === 'pdf' ? setView(o.id) : handleExport(o.id))}
              disabled={busy !== null}
              className="w-full p-4 rounded-2xl border text-left transition-all hover:scale-[1.01] disabled:opacity-60"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
            >
              <div className="flex items-center gap-3">
                <span style={{ color: 'var(--accent)' }}>{o.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{o.title}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{busy === o.id ? 'Generando…' : o.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
        )}

        <button onClick={onClose} className="btn btn-soft btn-block mt-4">Cancelar</button>
      </div>
    </div>
  );
}
