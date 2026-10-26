import { Song, Setlist, SetlistSong, Order, OrderItem, Hymnal } from '../types';
import { transposeChord, transposeLyrics } from './chords';
import { normalizeText } from './search';
import { generateSongCode, getNextSongNumber } from '../data/songs';

/** Identificador único (funciona también sin HTTPS). */
export function uid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    /* continúa con el respaldo */
  }
  return 'id-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/* ---------------------------------------------------------------- */
/*  Elementos de orden                                               */
/* ---------------------------------------------------------------- */

export function isSongItem(item: OrderItem): boolean {
  return item.kind ? item.kind === 'song' : !!item.songId;
}

export function newSongItem(song: Song, transposition = 0): OrderItem {
  return { id: uid(), kind: 'song', title: song.title, songId: song.id, key: song.key, transposition, minutes: 4 };
}

export function newTextItem(title: string, extra: Partial<OrderItem> = {}): OrderItem {
  return { id: uid(), kind: 'text', title, ...extra };
}

export function transposedKey(key: string | undefined, semitones: number | undefined): string {
  if (!key) return '';
  if (!semitones) return key;
  return transposeChord(key, semitones);
}

export function formatSemitones(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

/** Copia de la canción con acordes y tono transpuestos (para exportar). */
export function transposeSongCopy(song: Song, semitones: number): Song {
  if (!semitones) return song;
  const copy: Song = {
    ...song,
    key: transposeChord(song.key, semitones),
    lyrics: transposeLyrics(song.lyrics, semitones),
  };
  if (song.lyricsByLanguage) {
    const by: Record<string, string> = {};
    for (const [lang, text] of Object.entries(song.lyricsByLanguage)) by[lang] = transposeLyrics(text, semitones);
    copy.lyricsByLanguage = by;
  }
  return copy;
}

/* ---------------------------------------------------------------- */
/*  Horarios                                                         */
/* ---------------------------------------------------------------- */

export function parseTime(t?: string): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

export function formatClock(total: number): string {
  const t = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function itemMinutes(item: OrderItem): number {
  if (typeof item.minutes === 'number' && !isNaN(item.minutes)) return Math.max(0, item.minutes);
  return isSongItem(item) ? 4 : 0;
}

/** Hora de inicio de cada elemento, duración total y hora de fin (si hay hora de inicio). */
export function orderSchedule(order: Order): { starts: (string | null)[]; totalMinutes: number; end: string | null } {
  const start = parseTime(order.time);
  let acc = 0;
  const starts: (string | null)[] = [];
  for (const item of order.items) {
    starts.push(start === null ? null : formatClock(start + acc));
    acc += itemMinutes(item);
  }
  return { starts, totalMinutes: acc, end: start === null ? null : formatClock(start + acc) };
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatDateEs(date?: string): string {
  if (!date) return '';
  const d = new Date(date + 'T12:00:00');
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatDateShort(date?: string): string {
  if (!date) return '';
  const d = new Date(date + 'T12:00:00');
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ---------------------------------------------------------------- */
/*  Texto para compartir                                             */
/* ---------------------------------------------------------------- */

export function setlistToText(setlist: Setlist, songsById: Map<string, Song>): string {
  const lines: string[] = [`🎵 ${setlist.name}`, `${setlist.songs.length} canción${setlist.songs.length === 1 ? '' : 'es'}`, ''];
  setlist.songs.forEach((item, i) => {
    const song = songsById.get(item.songId);
    if (!song && item.free) { lines.push(`${i + 1}. ${item.title || 'Nota'}${item.notes ? ` — ${item.notes}` : ''}`); return; }
    if (!song) return;
    const tone = transposedKey(song.key, item.transposition);
    const shift = item.transposition ? ` (${formatSemitones(item.transposition)})` : '';
    lines.push(`${i + 1}. ${song.title}${song.artist && song.artist !== 'Desconocido' ? ` — ${song.artist}` : ''}`);
    lines.push(`   Tono: ${tone}${shift}${item.notes ? ` · ${item.notes}` : ''}`);
  });
  if (setlist.notes && setlist.notes.trim()) lines.push('', `📝 ${setlist.notes.trim()}`);
  return lines.join('\n');
}

export function orderToText(order: Order, songsById: Map<string, Song>): string {
  const sched = orderSchedule(order);
  const head = [order.type, formatDateEs(order.date), order.time ? `${order.time} h` : ''].filter(Boolean).join(' · ');
  const lines: string[] = [`📋 ${order.name}`, head, ''];
  order.items.forEach((item, i) => {
    const time = sched.starts[i] ? `${sched.starts[i]}  ` : '';
    if (isSongItem(item)) {
      const song = item.songId ? songsById.get(item.songId) : undefined;
      const tone = transposedKey(song?.key || item.key, item.transposition);
      lines.push(`${time}${i + 1}. 🎵 ${item.title}${tone ? ` (${tone})` : ''}${item.person ? ` — ${item.person}` : ''}`);
    } else {
      lines.push(`${time}${i + 1}. 🎤 ${item.title}${item.person ? ` — ${item.person}` : ''}`);
    }
    if (item.text && item.text.trim()) lines.push(`      ${item.text.trim().replace(/\n/g, '\n      ')}`);
  });
  if (sched.totalMinutes > 0) {
    lines.push('', `⏱ Duración total: ${formatDuration(sched.totalMinutes)}${sched.end ? ` (termina ${sched.end})` : ''}`);
  }
  if (order.notes && order.notes.trim()) lines.push('', `📝 ${order.notes.trim()}`);
  return lines.join('\n');
}

/* ---------------------------------------------------------------- */
/*  Paquetes para compartir como archivo (.json)                     */
/* ---------------------------------------------------------------- */

export interface PackageItem {
  kind: 'song' | 'text';
  title: string;
  song?: Song;
  transposition?: number;
  notes?: string;
  text?: string;
  person?: string;
  minutes?: number;
}

export interface SharePackage {
  app: 'cancionero7pro';
  version: 1;
  kind: 'setlist' | 'order';
  name: string;
  type?: string;
  date?: string;
  time?: string;
  notes?: string;
  items: PackageItem[];
}

export function buildSetlistPackage(setlist: Setlist, songsById: Map<string, Song>): SharePackage {
  const items: PackageItem[] = [];
  for (const it of setlist.songs) {
    const song = songsById.get(it.songId);
    if (!song) { if (it.free) items.push({ kind: 'text', title: it.title || 'Nota', text: it.notes || '' }); continue; }
    items.push({ kind: 'song', title: song.title, song, transposition: it.transposition || 0, notes: it.notes || '' });
  }
  return { app: 'cancionero7pro', version: 1, kind: 'setlist', name: setlist.name, notes: setlist.notes || '', items };
}

export function buildOrderPackage(order: Order, songsById: Map<string, Song>): SharePackage {
  const items: PackageItem[] = order.items.map(it => {
    if (isSongItem(it)) {
      const song = it.songId ? songsById.get(it.songId) : undefined;
      return { kind: 'song' as const, title: it.title, song, transposition: it.transposition || 0, text: it.text, person: it.person, minutes: it.minutes };
    }
    return { kind: 'text' as const, title: it.title, text: it.text, person: it.person, minutes: it.minutes };
  });
  return { app: 'cancionero7pro', version: 1, kind: 'order', name: order.name, type: order.type, date: order.date, time: order.time, notes: order.notes, items };
}

export function isSharePackage(x: unknown): x is SharePackage {
  if (!x || typeof x !== 'object') return false;
  const p = x as Partial<SharePackage>;
  return p.app === 'cancionero7pro' && (p.kind === 'setlist' || p.kind === 'order') && typeof p.name === 'string' && Array.isArray(p.items);
}

/**
 * Prepara las canciones de un paquete importado: reutiliza las que ya existen (mismo título y artista)
 * y crea copias nuevas de las demás dentro del cancionero indicado.
 */
export function resolvePackageSongs(
  items: PackageItem[],
  existing: Song[],
  target: Hymnal
): { songsToAdd: Song[]; ids: (string | undefined)[] } {
  const byKey = new Map<string, string>();
  existing.forEach(s => byKey.set(normalizeText(s.title) + '|' + normalizeText(s.artist || ''), s.id));

  const songsToAdd: Song[] = [];
  const ids: (string | undefined)[] = [];

  for (const item of items) {
    const s = item.song;
    if (item.kind !== 'song' || !s || typeof s.title !== 'string') {
      ids.push(undefined);
      continue;
    }
    const key = normalizeText(s.title) + '|' + normalizeText(s.artist || '');
    const found = byKey.get(key);
    if (found) {
      ids.push(found);
      continue;
    }
    const number = getNextSongNumber(target.id, [...existing, ...songsToAdd]);
    const created: Song = {
      ...s,
      id: uid(),
      hymnalId: target.id,
      number,
      code: generateSongCode(target, number),
      artist: s.artist || '',
      key: s.key || 'C',
      timeSignature: s.timeSignature || '4/4',
      bpm: s.bpm || 100,
      language: s.language || 'Castellano',
      categories: s.categories || [],
      sections: s.sections || [],
      lyrics: s.lyrics || '',
      notes: s.notes || '',
    };
    songsToAdd.push(created);
    byKey.set(key, created.id);
    ids.push(created.id);
  }
  return { songsToAdd, ids };
}

export function packageToSetlistSongs(pkg: SharePackage, ids: (string | undefined)[]): SetlistSong[] {
  const out: SetlistSong[] = [];
  const seen = new Set<string>();
  pkg.items.forEach((item, i) => {
    const id = ids[i];
    if (item.kind !== 'song' || !id || seen.has(id)) return;
    seen.add(id);
    out.push({ songId: id, transposition: item.transposition || 0, notes: item.notes || '', order: out.length });
  });
  return out;
}

export function packageToOrderItems(pkg: SharePackage, ids: (string | undefined)[]): OrderItem[] {
  return pkg.items.map((item, i) => {
    const id = ids[i];
    if (item.kind === 'song' && id) {
      return {
        id: uid(),
        kind: 'song' as const,
        title: item.title,
        songId: id,
        key: item.song?.key,
        transposition: item.transposition || 0,
        text: item.text,
        person: item.person,
        minutes: item.minutes,
      };
    }
    return { id: uid(), kind: 'text' as const, title: item.title, text: item.text, person: item.person, minutes: item.minutes };
  });
}

/* ---------------------------------------------------------------- */
/*  Archivos, portapapeles y compartir                               */
/* ---------------------------------------------------------------- */

export function safeFileName(name: string): string {
  return (name || 'lista').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) || 'lista';
}

export function downloadFile(filename: string, content: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* intenta el método antiguo */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export async function shareOrCopy(title: string, text: string): Promise<'shared' | 'copied' | 'cancelled' | 'error'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  return (await copyToClipboard(text)) ? 'copied' : 'error';
}

export function openWhatsApp(text: string): void {
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
}

export function readJsonFile(accept = '.json'): Promise<unknown | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(JSON.parse(String(reader.result)));
        } catch {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}
