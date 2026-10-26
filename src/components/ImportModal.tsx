import { useEffect, useRef, useState } from 'react';
import { X, Download, Plus } from 'lucide-react';
import { Hymnal, Song } from '../types';
import {
  readTextFile, extractTextFromWord, extractTextFromPdf, extractTextFromImage, parseSongsAsync,
} from '../utils/importUtils';
import { convertToText, jsonToText, isNativeSong, FORMAT_NAMES } from '../utils/songFormats';
import AddHymnalModal from './AddHymnalModal';
import ImageCropper from './ImageCropper';
import ParsedSongsReview from './ParsedSongsReview';

interface ImportModalProps {
  onClose: () => void;
  hymnals: Hymnal[];
  /** Cancionero que aparece seleccionado al abrir (por ejemplo, desde el menú de un cancionero) */
  initialHymnalId?: string;
}

const IMAGE_RE = /\.(jpe?g|png|webp|bmp)$/i;

export default function ImportModal({ onClose, hymnals, initialHymnalId }: ImportModalProps) {
  const [previews, setPreviews] = useState<Partial<Song>[]>([]);
  const [fileLabel, setFileLabel] = useState('archivo');
  const [selectedHymnalId, setSelectedHymnalId] = useState<string>(
    initialHymnalId && hymnals.some(h => h.id === initialHymnalId) ? initialHymnalId : hymnals[0]?.id || ''
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ message: string; fraction?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [showAddHymnalModal, setShowAddHymnalModal] = useState(false);
  const [imageFileToCrop, setImageFileToCrop] = useState<File | null>(null);
  const cancelRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const knownHymnalIds = useRef(new Set(hymnals.map(h => h.id)));

  // Si se crea un cancionero nuevo desde aquí, se selecciona solo
  useEffect(() => {
    const fresh = hymnals.find(h => !knownHymnalIds.current.has(h.id));
    if (fresh) setSelectedHymnalId(fresh.id);
    knownHymnalIds.current = new Set(hymnals.map(h => h.id));
  }, [hymnals]);

  useEffect(() => () => { cancelRef.current++; }, []);

  const reset = () => {
    setPreviews([]);
    setError(null);
    setWarning(null);
  };

  const finish = (songs: Partial<Song>[], label: string, notes: string[] = []) => {
    setPreviews(songs);
    setFileLabel(label);
    setWarning(notes.length > 0 ? notes.join(' ') : null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // permite elegir el mismo archivo otra vez
    if (files.length === 0) return;
    reset();

    const images = files.filter(f => IMAGE_RE.test(f.name) || f.type.startsWith('image/'));
    if (images.length > 0) {
      if (files.length > 1) setWarning('Las imágenes se importan de una en una: se usará la primera.');
      setImageFileToCrop(images[0]);
      return;
    }

    const run = ++cancelRef.current;
    const cancelled = () => cancelRef.current !== run;
    setIsProcessing(true);
    const all: Partial<Song>[] = [];
    const notes: string[] = [];
    let lastError = '';
    let failedFiles = 0;

    for (const file of files) {
      if (cancelled()) return;
      const name = file.name.toLowerCase();
      try {
        setProgress({ message: `Leyendo ${file.name}…` });
        await new Promise(r => setTimeout(r, 20));
        let text = '';
        let label = 'archivo de texto';
        if (name.endsWith('.docx')) { label = 'Word'; text = await extractTextFromWord(file, (m, f) => setProgress({ message: m, fraction: f })); }
        else if (name.endsWith('.pdf')) { label = 'PDF'; text = await extractTextFromPdf(file, (m, f) => setProgress({ message: m, fraction: f })); }
        else if (name.endsWith('.doc')) throw new Error('El formato .doc (Word antiguo) no se puede leer. Guárdalo como .docx desde Word e inténtalo de nuevo.');
        else {
          // Texto, JSON y formatos de otras apps (OpenSong, OpenLP, EasiSlides, ChordPro, SongBeamer…)
          const raw = await readTextFile(file);
          if (/\u0000/.test(raw.slice(0, 2000))) throw new Error('Ese archivo no es de texto. Formatos que se pueden importar: TXT, Word, PDF, JSON, XML (OpenSong, OpenLP, EasiSlides), ChordPro, SongBeamer e imágenes.');
          if (name.endsWith('.json')) {
            let data: unknown;
            try { data = JSON.parse(raw); } catch { throw new Error('El archivo JSON no es válido'); }
            const list: unknown[] = Array.isArray(data) ? data : (data && typeof data === 'object' && Array.isArray((data as { songs?: unknown[] }).songs) ? (data as { songs: unknown[] }).songs : [data]);
            if (list.length > 0 && list.every(isNativeSong)) {
              // archivo creado por esta app: se importa tal cual (con orden de presentación, himnario, etc.)
              all.push(...list.map(s => ({ ...(s as object) } as Partial<Song>)));
              continue;
            }
            text = jsonToText(data);
            label = 'JSON';
          } else {
            const converted = convertToText(file.name, raw);
            text = converted.text;
            label = converted.format === 'text' ? 'archivo de texto' : FORMAT_NAMES[converted.format];
          }
        }

        const report = await parseSongsAsync(text, selectedHymnalId, label, (done, total) =>
          setProgress({ message: `Analizando canciones… ${done} de ${total}`, fraction: total ? done / total : undefined }), cancelled);
        if (cancelled()) return;
        all.push(...report.songs);
        if (report.skippedIndexes > 0) notes.push(`Se omitió ${report.skippedIndexes} índice${report.skippedIndexes > 1 ? 's' : ''} (lista de títulos).`);
        if (report.failed > 0) notes.push(`${report.failed} bloque${report.failed > 1 ? 's' : ''} no se pudo${report.failed > 1 ? 'ieron' : ''} leer como canción.`);
        if (report.songs.length === 0 && report.lastError) lastError = report.lastError;
      } catch (err) {
        failedFiles++;
        lastError = err instanceof Error ? err.message : 'Error al procesar el archivo';
        console.error('Error al importar', file.name, err);
      }
    }

    if (cancelled()) return;
    setProgress(null);
    setIsProcessing(false);
    if (failedFiles > 0 && files.length > 1) notes.push(`${failedFiles} archivo${failedFiles > 1 ? 's' : ''} no se pudo${failedFiles > 1 ? 'ieron' : ''} leer.`);
    if (all.length === 0) {
      setError(lastError || 'No se encontraron canciones en el archivo');
      return;
    }
    finish(all, files.length === 1 ? files[0].name : `${files.length} archivos`, notes);
  };

  const handleImageCropped = async (cropped: File) => {
    setImageFileToCrop(null);
    reset();
    const run = ++cancelRef.current;
    setIsProcessing(true);
    try {
      const text = await extractTextFromImage(cropped, (message, fraction) => setProgress({ message, fraction }));
      const report = await parseSongsAsync(text, selectedHymnalId, 'imagen');
      if (cancelRef.current !== run) return;
      if (report.songs.length === 0) throw new Error(report.lastError || 'No se pudo leer la canción de la imagen');
      finish(report.songs, 'imagen');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la imagen');
    } finally {
      setProgress(null);
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" style={{ zIndex: 50 }} onClick={onClose}>
        <div className="modal-panel" style={{ maxWidth: '40rem', overflowY: 'auto', display: 'block' }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-bold">Importar canciones</h3>
            <button onClick={onClose} className="icon-btn icon-btn-sm" aria-label="Cerrar"><X size={16} /></button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold mb-2 block uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Importar a cancionero</label>
              <div className="flex gap-2">
                <select value={selectedHymnalId} onChange={e => setSelectedHymnalId(e.target.value)} className="field flex-1" style={{ fontSize: '14px' }}>
                  {hymnals.map(h => <option key={h.id} value={h.id}>{h.icon} {h.name}</option>)}
                </select>
                <button onClick={() => setShowAddHymnalModal(true)} className="btn btn-primary"><Plus size={16} /> <span className="hidden sm:inline">Nuevo</span></button>
              </div>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="*/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full rounded-2xl border-2 border-dashed p-6 text-center transition-all hover:opacity-80"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                <Download size={32} className="mx-auto mb-2" style={{ color: 'var(--accent)' }} />
                <p className="text-sm font-semibold">Toca para elegir un archivo o una foto</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>TXT, Word, PDF, JSON, imagen y formatos de otras apps: OpenSong, OpenLP, EasiSlides, ChordPro, SongBeamer</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>💡 Para varias canciones en un archivo, sepáralas con una línea de ===== o -----</p>
              </button>
            </div>

            {isProcessing && (
              <div className="text-center py-3">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>{progress?.message || 'Procesando…'}</p>
                {progress?.fraction !== undefined && (
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden mx-auto max-w-xs" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(progress.fraction * 100)}%`, backgroundColor: 'var(--accent)' }} />
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)' }}>
                <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
              </div>
            )}
            {warning && (
              <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(245,158,11,.12)', color: 'var(--gold)' }}>{warning}</div>
            )}

            {previews.length > 0 && !isProcessing && (
              <ParsedSongsReview
                previews={previews}
                onChange={setPreviews}
                hymnal={hymnals.find(h => h.id === selectedHymnalId)}
                label={fileLabel}
                onDone={onClose}
              />
            )}
          </div>

          <button onClick={onClose} className="btn btn-soft btn-block mt-4">Cancelar</button>
        </div>
      </div>

      {/* Ventanas hijas FUERA del fondo oscuro: así un clic dentro de ellas no cierra la importación */}
      {showAddHymnalModal && <AddHymnalModal onClose={() => setShowAddHymnalModal(false)} />}
      {imageFileToCrop && (
        <ImageCropper imageFile={imageFileToCrop} onCropComplete={handleImageCropped} onCancel={() => setImageFileToCrop(null)} />
      )}
    </>
  );
}
