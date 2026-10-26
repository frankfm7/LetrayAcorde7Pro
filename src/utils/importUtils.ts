import { Song } from '../types';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
// El "worker" de PDF se empaqueta con la app (no depende de internet ni de una versión en CDN)
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker } from 'tesseract.js';
import { cleanOcrText, PAGE_BREAK } from './songParser';

export { parseSongFromText, parseMultipleSongsFromText, parseSongsAsync, splitMultipleSongs, splitSongsSmart } from './songParser';
export type { ParseReport } from './songParser';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type ProgressCallback = (message: string, fraction?: number) => void;

/* ------------------------------------------------------------------ */
/*  Texto plano                                                        */
/* ------------------------------------------------------------------ */
export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(String(e.target?.result ?? ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsText(file);
  });
}

/* ------------------------------------------------------------------ */
/*  Word (.docx): se lee por párrafos para conservar los saltos de línea */
/* ------------------------------------------------------------------ */
export async function extractTextFromWord(file: File, onProgress?: ProgressCallback): Promise<string> {
  onProgress?.('Abriendo el documento Word…', 0.05);
  const arrayBuffer = await file.arrayBuffer();
  // Las imágenes incrustadas se ignoran: en documentos grandes harían la lectura lentísima
  const mm = mammoth as unknown as { images?: { imgElement: (fn: () => Promise<{ src: string }>) => unknown } };
  const options = {
    ignoreEmptyParagraphs: false,
    styleMap: ["br[type='page'] => hr"],
    convertImage: mm.images ? mm.images.imgElement(() => Promise.resolve({ src: '' })) : undefined,
  };
  const result = await mammoth.convertToHtml({ arrayBuffer }, options as never);
  onProgress?.('Ordenando el texto…', 0.5);
  await new Promise(r => setTimeout(r, 0));

  const doc = new DOMParser().parseFromString(result.value, 'text/html');
  const lines: string[] = [];
  let counter = 0;

  const walk = (el: Element) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'hr') { lines.push(PAGE_BREAK); return; }
    if (tag === 'p' || /^h[1-6]$/.test(tag) || tag === 'li') {
      // un párrafo puede traer saltos de línea (<br>) o de página (<hr>) adentro
      const hasHr = el.querySelector('hr') !== null;
      let content = '';
      el.childNodes.forEach(node => {
        if (node.nodeType === 3) content += node.textContent || '';
        else if (node.nodeType === 1) {
          const child = node as Element;
          const t = child.tagName.toLowerCase();
          if (t === 'br') content += '\n';
          else if (t === 'hr') content += '\n' + PAGE_BREAK + '\n';
          else content += child.textContent || '';
        }
      });
      void hasHr;
      content.split('\n').forEach(l => lines.push(l));
      return;
    }
    if (tag === 'table') {
      el.querySelectorAll('tr').forEach(tr => {
        lines.push(Array.from(tr.querySelectorAll('td,th')).map(td => (td.textContent || '').trim()).join('    '));
      });
      return;
    }
    Array.from(el.children).forEach(walk);
  };
  Array.from(doc.body.children).forEach(child => { walk(child); counter++; });
  void counter;

  const text = lines.join('\n');
  if (text.replace(/\s/g, '').length === 0) {
    const raw = await mammoth.extractRawText({ arrayBuffer });
    return raw.value;
  }
  return text;
}

/* ------------------------------------------------------------------ */
/*  PDF: se reconstruyen las líneas y las columnas (para alinear acordes) */
/* ------------------------------------------------------------------ */
interface PdfItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function extractTextFromPdf(file: File, onProgress?: ProgressCallback): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    onProgress?.(`Leyendo página ${p} de ${pdf.numPages}…`, p / pdf.numPages);
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items: PdfItem[] = [];
    for (const it of content.items as Array<{ str?: string; transform?: number[]; width?: number; height?: number }>) {
      if (typeof it.str !== 'string' || !it.transform) continue;
      items.push({ str: it.str, x: it.transform[4], y: it.transform[5], width: it.width || 0, height: it.height || Math.abs(it.transform[3]) || 10 });
    }
    pages.push(pdfItemsToText(items));
    if (p % 4 === 0) await new Promise(r => setTimeout(r, 0)); // deja respirar a la pantalla
  }
  return joinPdfPages(pages);
}

const normalizeEdge = (l: string) => l.trim().toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ');

/** Une las páginas marcando cada salto de página y quitando encabezados, pies y números de página repetidos. */
function joinPdfPages(pages: string[]): string {
  const split = pages.map(p => p.split('\n'));
  const edgeCount = new Map<string, number>();
  const edges = (lines: string[]) => {
    const nb = lines.map((l, i) => ({ l, i })).filter(x => x.l.trim() !== '');
    const out: number[] = [];
    if (nb.length > 0) out.push(nb[0].i);
    if (nb.length > 1) out.push(nb[nb.length - 1].i);
    return out;
  };
  split.forEach(lines => {
    new Set(edges(lines).map(i => normalizeEdge(lines[i]))).forEach(k => edgeCount.set(k, (edgeCount.get(k) || 0) + 1));
  });
  const threshold = Math.max(3, Math.floor(pages.length * 0.5));
  const cleaned = split.map(lines => {
    const drop = new Set<number>();
    edges(lines).forEach(i => {
      const key = normalizeEdge(lines[i]);
      const isPageNumber = /^[-–—\s]*(?:p[aá]g(?:ina)?\.?\s*)?#\s*(?:de\s*#)?[-–—\s]*$/.test(key);
      if (isPageNumber || ((edgeCount.get(key) || 0) >= threshold && pages.length >= 3)) drop.add(i);
    });
    return lines.filter((_, i) => !drop.has(i)).join('\n');
  });
  return cleaned.join('\n' + PAGE_BREAK + '\n');
}

function median(values: number[], fallback: number): number {
  if (values.length === 0) return fallback;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function pdfItemsToText(items: PdfItem[]): string {
  const real = items.filter(i => i.str.trim().length > 0 || i.str.length > 0);
  if (real.length === 0) return '';

  // Ancho típico de un carácter (para convertir distancias en espacios)
  const charW = median(
    real.filter(i => i.str.trim().length >= 2 && i.width > 0).map(i => i.width / i.str.length),
    5
  );
  const lineTol = median(real.map(i => i.height), 10) * 0.5;

  // Agrupar por línea (misma altura aproximada), de arriba hacia abajo
  const sorted = [...real].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: PdfItem[][] = [];
  for (const it of sorted) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row[0].y - it.y) <= lineTol) row.push(it);
    else rows.push([it]);
  }

  const minX = Math.min(...real.map(i => i.x));
  const typicalGap = median(rows.slice(1).map((r, i) => rows[i][0].y - r[0].y).filter(g => g > 0), 12);

  const out: string[] = [];
  let prevY: number | null = null;
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    let line = '';
    let cursorX = minX;
    for (const it of row) {
      const gap = it.x - cursorX;
      let spaces = Math.round(gap / charW);
      if (line.length > 0 && spaces < 1 && gap > charW * 0.2) spaces = 1;
      if (spaces > 0) line += ' '.repeat(Math.min(spaces, 120));
      line += it.str;
      cursorX = it.x + it.width;
    }
    if (prevY !== null && prevY - row[0].y > typicalGap * 1.7) out.push(''); // espacio grande = línea en blanco
    out.push(line.replace(/\s+$/, ''));
    prevY = row[0].y;
  }
  return out.join('\n');
}

/* ------------------------------------------------------------------ */
/*  Imagen (OCR): se prepara la foto para leerla mejor                 */
/* ------------------------------------------------------------------ */
function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo abrir la imagen')); };
    img.src = url;
  });
}

/**
 * Escala la imagen a un tamaño ideal, la pasa a escala de grises, estira el contraste,
 * corrige fondos oscuros y aplica un umbral adaptable (funciona con fotos con sombras).
 */
export async function preprocessImageForOcr(blob: Blob): Promise<HTMLCanvasElement> {
  const img = await loadImage(blob);
  const w0 = img.naturalWidth;
  const h0 = img.naturalHeight;
  // Entre ~1800 y ~2600 px en el lado mayor: suficiente detalle sin gastar memoria
  const longSide = Math.max(w0, h0);
  const target = longSide < 1800 ? 1800 : longSide > 2600 ? 2600 : longSide;
  const scale = target / longSide;
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Tu navegador no permite procesar imágenes');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const n = w * h;
  const gray = new Uint8ClampedArray(n);
  const hist = new Uint32Array(256);
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    const g = Math.round(0.299 * px[j] + 0.587 * px[j + 1] + 0.114 * px[j + 2]);
    gray[i] = g;
    hist[g]++;
  }

  // Estirar contraste entre los percentiles 1% y 99%
  const pct = (p: number) => { let acc = 0; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * p) return v; } return 255; };
  const lo = pct(0.01);
  const hi = Math.max(lo + 1, pct(0.99));
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(255, ((gray[i] - lo) * 255) / (hi - lo)));
    gray[i] = v;
    sum += v;
  }
  // Fondo oscuro con letras claras → se invierte
  if (sum / n < 105) for (let i = 0; i < n; i++) gray[i] = 255 - gray[i];

  // Umbral adaptable con imagen integral (promedio local)
  const win = Math.max(15, Math.round(Math.min(w, h) / 14)) | 1;
  const half = win >> 1;
  const stride = w + 1;
  const integral = new Uint32Array(stride * (h + 1));
  for (let y = 1; y <= h; y++) {
    let rowSum = 0;
    for (let x = 1; x <= w; x++) {
      rowSum += gray[(y - 1) * w + (x - 1)];
      integral[y * stride + x] = integral[(y - 1) * stride + x] + rowSum;
    }
  }
  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - half);
    const y2 = Math.min(h - 1, y + half);
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - half);
      const x2 = Math.min(w - 1, x + half);
      const area = (x2 - x1 + 1) * (y2 - y1 + 1);
      const s = integral[(y2 + 1) * stride + (x2 + 1)] - integral[y1 * stride + (x2 + 1)] - integral[(y2 + 1) * stride + x1] + integral[y1 * stride + x1];
      const mean = s / area;
      const v = gray[y * w + x] < mean * 0.9 ? 0 : 255;
      const j = (y * w + x) * 4;
      px[j] = px[j + 1] = px[j + 2] = v;
      px[j + 3] = 255;
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

export async function extractTextFromImage(imageFile: Blob, onProgress?: ProgressCallback): Promise<string> {
  onProgress?.('Preparando la imagen…', 0.05);
  const canvas = await preprocessImageForOcr(imageFile);

  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  try {
    onProgress?.('Cargando el lector de texto (la primera vez tarda un poco)…', 0.1);
    worker = await createWorker('spa+eng', 1, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') onProgress?.('Leyendo letras y acordes…', 0.2 + m.progress * 0.8);
      },
    });
    // Bloque de texto uniforme + conservar los espacios entre palabras (para alinear acordes)
    await worker.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' } as never);
    const result = await worker.recognize(canvas);
    const text = cleanOcrText(result.data.text || '');
    if (text.replace(/\s/g, '').length < 10) {
      throw new Error('No se detectó texto. Prueba con una foto más nítida, bien iluminada y recorta solo la letra.');
    }
    return text;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('No se detectó')) throw error;
    console.error('Error en OCR:', error);
    throw new Error('No se pudo leer la imagen. Revisa tu conexión a internet (el lector se descarga la primera vez) y que la imagen sea clara.');
  } finally {
    if (worker) await worker.terminate().catch(() => undefined);
  }
}

/* ------------------------------------------------------------------ */
/*  JSON                                                               */
/* ------------------------------------------------------------------ */
export async function importFromJson(file: File): Promise<Partial<Song>[]> {
  const text = await readTextFile(file);
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('El archivo JSON no es válido');
  }
  const list = Array.isArray(data) ? data : [data];
  const songs = list.filter((d): d is Partial<Song> => !!d && typeof d === 'object' && typeof (d as Song).title === 'string' && typeof (d as Song).lyrics === 'string');
  if (songs.length === 0) {
    throw new Error('El archivo JSON no tiene canciones con el formato correcto (se necesita título y letra)');
  }
  return songs;
}
