import type { Hymnal } from '../types';
import { getBackgrounds, BgImage } from './backgroundStore';

export interface ExportTheme {
  id: string;
  name: string;
  /** Colores del fondo (1 = sólido, 2 = degradado diagonal) */
  colors: string[];
  /** Panel translúcido detrás de la letra */
  card: string;
  text: string;
  chord: string;
  section: string;
  muted: string;
}

export const EXPORT_THEMES: ExportTheme[] = [
  { id: 'light', name: 'Blanco', colors: ['#ffffff'], card: '#f8fafc', text: '#0f172a', chord: '#7c3aed', section: '#d97706', muted: '#64748b' },
  { id: 'cream', name: 'Papel', colors: ['#fdf6e3', '#f5e6c4'], card: 'rgba(255,255,255,0.55)', text: '#3b2f1e', chord: '#9a3412', section: '#b45309', muted: '#8a7a62' },
  { id: 'dark', name: 'Oscuro', colors: ['#0a0a1a', '#1e1b4b'], card: 'rgba(255,255,255,0.06)', text: '#f1f5f9', chord: '#a78bfa', section: '#fbbf24', muted: '#94a3b8' },
  { id: 'purple', name: 'Violeta', colors: ['#667eea', '#764ba2'], card: 'rgba(255,255,255,0.14)', text: '#ffffff', chord: '#fde68a', section: '#fcd34d', muted: 'rgba(255,255,255,0.75)' },
  { id: 'ocean', name: 'Océano', colors: ['#0ea5e9', '#1e3a8a'], card: 'rgba(255,255,255,0.14)', text: '#ffffff', chord: '#fde68a', section: '#a5f3fc', muted: 'rgba(255,255,255,0.75)' },
  { id: 'sunset', name: 'Atardecer', colors: ['#f97316', '#be185d'], card: 'rgba(255,255,255,0.14)', text: '#ffffff', chord: '#fef3c7', section: '#fde68a', muted: 'rgba(255,255,255,0.8)' },
  { id: 'forest', name: 'Bosque', colors: ['#10b981', '#064e3b'], card: 'rgba(255,255,255,0.14)', text: '#ffffff', chord: '#fde68a', section: '#bbf7d0', muted: 'rgba(255,255,255,0.78)' },
];

/** Opciones que dependen del cancionero */
export const HYMNAL_THEME_ID = 'hymnal';
export const IMAGE_THEME_ID = 'image';

export function darken(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const f = 1 - amount;
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

export interface ResolvedTheme extends ExportTheme {
  /** Foto de portada del cancionero (solo en el tema "image") */
  image?: string;
}

/** Convierte el id elegido en un tema completo (los temas "hymnal" e "image" usan los datos del cancionero). */
export function resolveTheme(themeId: string | undefined, hymnal?: Hymnal, userImages?: BgImage[]): ResolvedTheme {
  const id = themeId || HYMNAL_THEME_ID;
  const fixed = EXPORT_THEMES.find(t => t.id === id);
  if (fixed) return fixed;

  const base = hymnal?.color || '#7c3aed';
  const hymnalTheme: ResolvedTheme = {
    id: HYMNAL_THEME_ID,
    name: 'Color del cancionero',
    colors: [base, darken(base, 0.45)],
    card: 'rgba(0,0,0,0.18)',
    text: '#ffffff',
    chord: '#fde68a',
    section: '#ffffff',
    muted: 'rgba(255,255,255,0.8)',
  };
  // Imagen propia cargada en Menú+ → Fondos de pantalla ("bg:<id>")
  if (id.startsWith('bg:')) {
    const img = (userImages ?? getBackgrounds().images).find(i => i.id === id.slice(3));
    if (img) return { ...hymnalTheme, id, name: img.name, card: 'rgba(0,0,0,0.4)', image: img.dataUrl };
  }
  if (id === IMAGE_THEME_ID && hymnal?.image) {
    return { ...hymnalTheme, id: IMAGE_THEME_ID, name: 'Portada del cancionero', card: 'rgba(0,0,0,0.38)', image: hymnal.image };
  }
  return hymnalTheme;
}

export interface ThemeChoice {
  id: string;
  name: string;
  /** Muestra para la vista previa (fondo CSS) */
  preview: string;
}

/** Lista de opciones para mostrar en pantalla (incluye las que dependen del cancionero). */
export function themeChoices(hymnal?: Hymnal, userImages?: BgImage[]): ThemeChoice[] {
  const out: ThemeChoice[] = EXPORT_THEMES.map(t => ({
    id: t.id,
    name: t.name,
    preview: t.colors.length > 1 ? `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})` : t.colors[0],
  }));
  const h = resolveTheme(HYMNAL_THEME_ID, hymnal);
  out.push({ id: HYMNAL_THEME_ID, name: 'Color del cancionero', preview: `linear-gradient(135deg, ${h.colors[0]}, ${h.colors[1]})` });
  if (hymnal?.image) out.push({ id: IMAGE_THEME_ID, name: 'Portada', preview: `center / cover url("${hymnal.image}")` });
  (userImages ?? getBackgrounds().images).forEach(img => out.push({ id: `bg:${img.id}`, name: `Imagen: ${img.name}`, preview: `center / cover url("${img.dataUrl}")` }));
  return out;
}
