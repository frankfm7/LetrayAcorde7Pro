import { useSyncExternalStore } from 'react';
import type { Hymnal } from '../types';

/** Imágenes de fondo que carga el usuario y cómo se usan. Se guardan aparte del resto de los datos. */

export interface BgImage {
  id: string;
  name: string;
  dataUrl: string;
}

export type SongBgMode = 'none' | 'app' | 'hymnal' | 'image';

export interface BgSettings {
  images: BgImage[];
  /** Fondo de la app (inicio, cancioneros, listas, órdenes…) */
  appImageId: string | null;
  /** Fondo de las letras */
  songMode: SongBgMode;
  songImageId: string | null;
  /** 0–90: cuánto se aclara/oscurece el fondo para que el texto se lea bien */
  overlay: number;
  /** 0–12 px de desenfoque */
  blur: number;
}

export const MAX_BG_IMAGES = 10;
const KEY = 'c7-backgrounds';

const DEFAULTS: BgSettings = { images: [], appImageId: null, songMode: 'app', songImageId: null, overlay: 55, blur: 0 };

function load(): BgSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed, images: Array.isArray(parsed?.images) ? parsed.images : [] };
  } catch {
    return DEFAULTS;
  }
}

let cache: BgSettings = load();
const listeners = new Set<() => void>();

export function getBackgrounds(): BgSettings {
  return cache;
}

export function subscribeBackgrounds(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Guarda los cambios. Devuelve false si el navegador no tiene espacio (y no cambia nada). */
export function saveBackgrounds(next: BgSettings): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return false;
  }
  cache = next;
  listeners.forEach(l => l());
  return true;
}

export function useBackgrounds(): BgSettings {
  return useSyncExternalStore(subscribeBackgrounds, getBackgrounds, getBackgrounds);
}

/* ------------------------- qué fondo se ve en cada pantalla ------------------------- */

export type ViewKind = 'app' | 'hymnal' | 'song';
export interface ViewBg { kind: ViewKind; hymnalId?: string }

let currentView: ViewBg = { kind: 'app' };
const viewListeners = new Set<() => void>();

export function setViewBackground(v: ViewBg): void {
  if (v.kind === currentView.kind && v.hymnalId === currentView.hymnalId) return;
  currentView = v;
  viewListeners.forEach(l => l());
}
export function useViewBackground(): ViewBg {
  return useSyncExternalStore(
    l => { viewListeners.add(l); return () => { viewListeners.delete(l); }; },
    () => currentView,
    () => currentView
  );
}

/** Elige la imagen de fondo según la pantalla, el cancionero y los ajustes. null = sin fondo. */
export function resolveBackgroundUrl(view: ViewBg, s: BgSettings, hymnal?: Hymnal): string | null {
  const byId = (id: string | null | undefined) => (id ? s.images.find(i => i.id === id)?.dataUrl || null : null);
  const app = byId(s.appImageId);
  if (view.kind === 'app') return app;
  if (view.kind === 'hymnal') return hymnal?.image && hymnal.bgList !== false ? hymnal.image : app;

  const pref = hymnal?.bgSong;
  if (pref && pref !== 'inherit') {
    if (pref === 'cover') return hymnal?.image || app;
    if (pref === 'none') return null;
    if (pref === 'app') return app;
    return byId(pref) || app;
  }
  switch (s.songMode) {
    case 'none': return null;
    case 'hymnal': return hymnal?.image || app;
    case 'image': return byId(s.songImageId) || app;
    default: return app;
  }
}
