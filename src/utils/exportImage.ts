import type { Song, Hymnal } from '../types';
import { resolveTheme, ResolvedTheme } from './exportThemes';

const W = 1080;
const PAD = 64;
const MONO = '"Roboto Mono", "SF Mono", Menlo, Consolas, "Liberation Mono", "Courier New", monospace';
const SANS = 'Montserrat, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

const SECTION_RE = /^(VERSO|CORO|PUENTE|INTRO|FINAL|PRE-CORO|PRE CORO|OUTRO|BRIDGE|INTERLUDIO|CODA)\s*\d{0,2}\s*:?$/i;

export type LyricRow =
  | { type: 'section'; text: string }
  | { type: 'chords'; text: string }
  | { type: 'lyric'; text: string }
  | { type: 'blank' };

export function parseLyricRows(lyrics: string): LyricRow[] {
  const rows: LyricRow[] = [];
  for (const raw of lyrics.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/\s+$/, '').replace(/♯/g, '#').replace(/♭/g, 'b');
    const trimmed = line.trim();
    if (trimmed === '') {
      if (rows.length > 0 && rows[rows.length - 1].type !== 'blank') rows.push({ type: 'blank' });
    } else if (trimmed.startsWith('//')) {
      rows.push({ type: 'chords', text: line.slice(line.indexOf('//') + 2) });
    } else if (SECTION_RE.test(trimmed)) {
      rows.push({ type: 'section', text: trimmed.toUpperCase() });
    } else {
      rows.push({ type: 'lyric', text: line });
    }
  }
  while (rows.length > 0 && rows[rows.length - 1].type === 'blank') rows.pop();
  return rows;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Texto con contorno (negro si la letra es clara, blanco si es oscura) para que se lea sobre cualquier foto. */
function outlinedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fill: string, size: number, outline: { color: string; width: number } | null) {
  if (outline) {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.lineWidth = Math.max(3, size * outline.width);
    ctx.strokeStyle = outline.color === 'auto' ? (isBright(fill) ? '#000000' : '#ffffff') : outline.color === 'black' ? '#000000' : outline.color === 'white' ? '#ffffff' : outline.color;
    ctx.strokeText(text, x, y);
    ctx.restore();
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

async function paintBackground(ctx: CanvasRenderingContext2D, theme: ResolvedTheme, w: number, h: number, dim = 0.1) {
  if (theme.image) {
    const img = await loadImage(theme.image);
    if (img) {
      const s = Math.max(w / img.width, h / img.height);
      const dw = img.width * s;
      const dh = img.height * s;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      ctx.fillStyle = `rgba(0,0,0,${dim})`;
      ctx.fillRect(0, 0, w, h);
      return;
    }
  }
  if (theme.colors.length > 1) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, theme.colors[0]);
    g.addColorStop(1, theme.colors[1]);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = theme.colors[0];
  }
  ctx.fillRect(0, 0, w, h);
  // detalles suaves para que el fondo no se vea plano
  if (theme.colors.length > 1) {
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.arc(w * 0.92, h * 0.04, 260, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath(); ctx.arc(w * 0.05, h * 0.97, 320, 0, Math.PI * 2); ctx.fill();
  }
}

/** Ajustes de estilo de la imagen (todo es opcional: lo que falta sale del tema elegido). */
export interface ImageStyle {
  /** Intensidad del recuadro detrás de la letra: 0 = sin recuadro, 1 = normal */
  panelOpacity?: number;
  /** Recuadro y letras: 'auto' (según el fondo), 'dark' (recuadro oscuro, letras claras) o 'light' (recuadro claro, letras oscuras) */
  panelTone?: 'auto' | 'dark' | 'light';
  /** Color del contorno: 'auto' (contrario a la letra), 'black', 'white' o un color #rrggbb */
  outlineColor?: string;
  /** Grosor del contorno (0.05–0.35 del tamaño de la letra) */
  outlineWidth?: number;
  /** Contorno alrededor de las letras (negro sobre letra clara, blanco sobre letra oscura). Activado por defecto */
  textOutline?: boolean;
  /** Oscurecimiento de la foto/fondo detrás del recuadro (0–0.6). Menos = imagen más clara */
  bgDim?: number;
  /** Difuminado de los bordes del recuadro, en píxeles (0 = bordes nítidos) */
  panelFeather?: number;
  panelColor?: string;
  titleColor?: string;
  infoColor?: string;
  sectionColor?: string;
  chordColor?: string;
  textColor?: string;
}

export const DEFAULT_IMAGE_STYLE: Required<Pick<ImageStyle, 'panelOpacity' | 'panelFeather' | 'bgDim' | 'outlineWidth'>> = { panelOpacity: 1, panelFeather: 14, bgDim: 0.1, outlineWidth: 0.2 };

const isBright = (css: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(css.trim());
  if (m) { const n = parseInt(m[1], 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150; }
  return /rgba?\(\s*255/.test(css);
};

/** Colores finales de la imagen según el tema y los ajustes (los usa también la vista previa). */
export function resolveImageColors(base: ResolvedTheme, style: ImageStyle = {}) {
  const tone = style.panelTone || 'auto';
  const darkPanel = tone === 'dark' || (tone === 'auto' && isBright(base.text));
  const preset = tone === 'auto'
    ? { text: base.text, chord: base.chord, section: base.section, muted: base.muted }
    : tone === 'dark'
      ? { text: '#ffffff', chord: '#fde68a', section: '#ffffff', muted: 'rgba(255,255,255,0.8)' }
      : { text: '#0f172a', chord: '#6d28d9', section: '#b45309', muted: '#475569' };
  const panel = style.panelColor || (darkPanel ? 'rgba(8,8,20,0.68)' : tone === 'light' ? 'rgba(255,255,255,0.86)' : base.card);
  return {
    text: style.textColor || preset.text,
    chord: style.chordColor || preset.chord,
    section: style.sectionColor || preset.section,
    muted: style.infoColor || preset.muted,
    title: style.titleColor || style.textColor || preset.text,
    panel,
  };
}

export interface SongImageOptions {
  themeId?: string;
  hymnal?: Hymnal;
  style?: ImageStyle;
}

/** Dibuja la canción (con acordes alineados) sobre un fondo bonito y devuelve un PNG. */
export async function renderSongImage(song: Song, opts: SongImageOptions = {}): Promise<Blob> {
  // las fuentes deben estar cargadas antes de medir y dibujar (si no, el texto sale con otra letra)
  try {
    await Promise.all(['500', '700', '800', '900'].map(w => document.fonts.load(`${w} 40px Montserrat`)).concat(document.fonts.load('700 30px "Roboto Mono"')));
  } catch { /* se usa la letra del sistema */ }
  const base = resolveTheme(opts.themeId, opts.hymnal);
  const st = { ...DEFAULT_IMAGE_STYLE, ...(opts.style || {}) };
  const colors = resolveImageColors(base, opts.style);
  const theme: ResolvedTheme = { ...base, text: colors.text, chord: colors.chord, section: colors.section, muted: colors.muted };
  const titleColor = colors.title;
  const outline = st.textOutline !== false ? { color: st.outlineColor || 'auto', width: st.outlineWidth ?? 0.2 } : null;
  const rows = parseLyricRows(song.lyrics || '');
  if (rows.length === 0) throw new Error('La canción no tiene letra');

  const outerPad = 36;
  const innerPad = 44;
  const contentW = W - (outerPad + innerPad) * 2;

  // Igual que en el visor de la app: letra en Montserrat extra negrita y acordes en monoespaciada un poco más chica
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) throw new Error('Tu navegador no permite crear la imagen');
  const lyricFont = (size: number) => `800 ${size}px ${SANS}`;
  const chordFont = (size: number) => `700 ${Math.round(size * 0.85)}px ${MONO}`;
  const fits = (size: number) => rows.every(r => {
    if (r.type === 'lyric') { probe.font = lyricFont(size); return probe.measureText(r.text).width <= contentW; }
    if (r.type === 'chords') { probe.font = chordFont(size); return probe.measureText(r.text).width <= contentW; }
    return true;
  });
  let fs = 36;
  while (fs > 16 && !fits(fs)) fs -= 1;

  const lyricH = Math.round(fs * 1.45);
  const chordH = Math.round(fs * 1.0);
  const sectionH = Math.round(fs * 1.9);
  const blankH = Math.round(fs * 0.7);

  // Título (puede ocupar varias líneas)
  probe.font = `800 58px ${SANS}`;
  const titleLines = wrapText(probe, song.title, contentW);
  const titleH = titleLines.length * 70;
  const infoParts = [[song.hymnalDetail, song.hymnalNumber].filter(Boolean).join(' '), song.artist && song.artist !== 'Desconocido' ? song.artist : '', song.key ? `Tono ${song.key}` : '', song.timeSignature, song.bpm ? `${song.bpm} BPM` : ''].filter(Boolean);
  const headerH = 40 + titleH + 46 + 30;

  let bodyH = 0;
  rows.forEach(r => {
    bodyH += r.type === 'chords' ? chordH : r.type === 'lyric' ? lyricH : r.type === 'section' ? sectionH : blankH;
  });

  const footerH = 74;
  const height = Math.min(15000, outerPad + innerPad + headerH + bodyH + innerPad + footerH);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tu navegador no permite crear la imagen');

  await paintBackground(ctx, theme, W, height, st.bgDim);

  // Panel
  const panelH = height - outerPad - footerH + 18;
  if (st.panelOpacity > 0) {
    const feather = Math.max(0, st.panelFeather);
    ctx.save();
    if (feather > 0) ctx.filter = `blur(${feather}px)`;
    ctx.globalAlpha = Math.min(1, st.panelOpacity);
    roundRect(ctx, outerPad + feather * 0.6, outerPad + feather * 0.6, W - outerPad * 2 - feather * 1.2, panelH - outerPad - feather * 1.2, 40);
    ctx.fillStyle = colors.panel;
    ctx.fill();
    // con intensidad mayor que la del tema se repite una vez más para que el recuadro se note más
    if (st.panelOpacity > 1) { ctx.globalAlpha = Math.min(1, st.panelOpacity - 1); ctx.fill(); }
    ctx.restore();
  }

  let y = outerPad + innerPad + 40;
  const x = outerPad + innerPad;

  // Título
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = titleColor;
  ctx.font = `800 58px ${SANS}`;
  titleLines.forEach(l => { outlinedText(ctx, l, x, y, titleColor, 58, outline); y += 70; });
  y -= 12;

  // Datos
  ctx.font = `700 27px ${SANS}`;
  ctx.fillStyle = theme.muted;
  outlinedText(ctx, infoParts.join('  •  '), x, y + 24, theme.muted, 27, outline);
  y += 46;
  ctx.fillStyle = theme.chord;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(x, y + 6, 90, 5);
  ctx.globalAlpha = 1;
  y += 30;

  // Cuerpo
  rows.forEach(r => {
    if (r.type === 'blank') { y += blankH; return; }
    if (r.type === 'section') {
      ctx.font = `900 ${Math.round(fs * 0.8)}px ${SANS}`;
      const tw = ctx.measureText(r.text).width;
      ctx.fillStyle = theme.section;
      ctx.globalAlpha = 0.2;
      roundRect(ctx, x - 12, y + Math.round(fs * 0.15), tw + 24, Math.round(fs * 1.15), 12);
      ctx.fill();
      ctx.globalAlpha = 1;
      outlinedText(ctx, r.text, x, y + Math.round(fs * 1.0), theme.section, fs * 0.8, outline);
      y += sectionH;
      return;
    }
    if (r.type === 'chords') {
      ctx.font = chordFont(fs);
      outlinedText(ctx, r.text, x, y + Math.round(fs * 0.8), theme.chord, fs * 0.85, outline);
      y += chordH;
      return;
    }
    ctx.font = lyricFont(fs);
    outlinedText(ctx, r.text, x, y + Math.round(fs * 1.0), theme.text, fs, outline);
    y += lyricH;
  });

  // Pie
  const fy = height - 30;
  ctx.font = `700 24px ${SANS}`;
  ctx.fillStyle = theme.text;
  ctx.globalAlpha = 0.9;
  ctx.textAlign = 'left';
  ctx.fillText('Letra&Acorde7Pro', outerPad + 8, fy);
  ctx.textAlign = 'right';
  ctx.font = `600 22px ${SANS}`;
  const right = [opts.hymnal ? `${opts.hymnal.icon} ${opts.hymnal.name}` : '', song.code].filter(Boolean).join('  ·  ');
  ctx.fillText(right, W - outerPad - 8, fy);
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;

  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('No se pudo crear la imagen'))), 'image/png');
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Estilo guardado desde la ventana de exportar (se usa también al exportar desde Listas y Órdenes). */
function savedStyle(): ImageStyle | undefined {
  try { return JSON.parse(localStorage.getItem('c7-image-style') || 'null') || undefined; } catch { return undefined; }
}

const safeName = (s: string) => (s || 'cancion').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) || 'cancion';

/** Exporta una imagen PNG por canción (cada una con el fondo elegido o el del cancionero). */
export async function exportAsImages(songs: Song[], opts: { themeId?: string; hymnals?: Hymnal[]; style?: ImageStyle } = {}): Promise<number> {
  let done = 0;
  for (const song of songs) {
    const hymnal = opts.hymnals?.find(h => h.id === song.hymnalId);
    const themeId = opts.themeId || hymnal?.exportTheme || 'hymnal';
    const blob = await renderSongImage(song, { themeId, hymnal, style: opts.style ?? savedStyle() });
    downloadBlob(blob, `${safeName(song.title)}.png`);
    done++;
    if (songs.length > 1) await new Promise(r => setTimeout(r, 450)); // evita que el navegador bloquee varias descargas
  }
  return done;
}
