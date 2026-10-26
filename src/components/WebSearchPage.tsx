import PageBack from './PageBack';
import { useState } from 'react';
import { Search, ExternalLink, ClipboardPaste, Download } from 'lucide-react';
import { Song } from '../types';
import { useSongLibrary } from '../hooks/useSongLibrary';
import { parseSongsAsync } from '../utils/songParser';
import { WEB_SITES, buildSearchUrl, fetchSongFromUrl, webSongToText } from '../utils/webSong';
import ParsedSongsReview from './ParsedSongsReview';

interface Props {
  initialQuery?: string;
  onDone: () => void;
}

/** Busca letras y acordes en internet y las importa al cancionero. */
export default function WebSearchPage({ initialQuery = '', onDone }: Props) {
  const { hymnals } = useSongLibrary();
  const [query, setQuery] = useState(initialQuery);
  const [url, setUrl] = useState('');
  const [pasted, setPasted] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Partial<Song>[]>([]);
  const [source, setSource] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [hymnalId, setHymnalId] = useState(() => hymnals.find(h => h.id === 'mis-canciones')?.id || hymnals[0]?.id || '');

  const open = (siteId?: string) => {
    if (!query.trim()) { setError('Escribe el nombre de la canción o del artista.'); return; }
    setError(null);
    const site = WEB_SITES.find(s => s.id === siteId);
    window.open(buildSearchUrl(query, site), '_blank', 'noopener');
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {
      setError('No se pudo leer el portapapeles. Mantén presionado el campo y elige "Pegar".');
    }
  };

  const analyze = async (text: string, label: string, src: string, srcUrl = '') => {
    const report = await parseSongsAsync(text, hymnalId, label);
    if (report.songs.length === 0) throw new Error(report.lastError || 'No se pudo reconocer una canción en ese texto.');
    setPreviews(report.songs);
    setSource(src);
    setSourceUrl(srcUrl);
  };

  const fetchFromLink = async () => {
    if (!url.trim()) { setError('Pega el enlace de la canción.'); return; }
    setError(null);
    setPreviews([]);
    setLoading(true);
    try {
      const song = await fetchSongFromUrl(url);
      await analyze(webSongToText(song), 'la web', song.source, song.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer la página.');
    } finally {
      setLoading(false);
    }
  };

  const analyzePasted = async () => {
    setError(null);
    setPreviews([]);
    setLoading(true);
    try {
      await analyze(pasted, 'texto pegado', 'texto pegado');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo analizar el texto.');
    } finally {
      setLoading(false);
    }
  };

  const label = 'text-xs font-bold uppercase tracking-wide mb-2 block';
  const step = (n: number) => (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-extrabold mr-2" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>{n}</span>
  );

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-2xl font-bold flex items-center"><PageBack />Buscar en la web</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Encuentra letras y acordes en internet y guárdalos en tu cancionero con un toque.</p>
      </div>

      {/* Paso 1 */}
      <section className="surface p-4 space-y-3">
        <div className="font-bold text-sm flex items-center">{step(1)} Busca la canción</div>
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input className="field" style={{ paddingLeft: '2.5rem' }} placeholder="Canción o artista…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && open()} />
        </div>
        <div className="flex flex-wrap gap-2">
          {WEB_SITES.map(s => (
            <button key={s.id} className="chip" onClick={() => open(s.id)} title={s.note}>{s.name} <ExternalLink size={12} /></button>
          ))}
          <button className="chip" data-active="true" onClick={() => open()}>Toda la web <ExternalLink size={12} /></button>
        </div>
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Se abre en una pestaña nueva. Entra a la canción que quieras y copia su enlace.</p>
      </section>

      {/* Paso 2 */}
      <section className="surface p-4 space-y-3">
        <div className="font-bold text-sm flex items-center">{step(2)} Pega el enlace de la canción</div>
        <div className="flex gap-2">
          <input className="field" inputMode="url" placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchFromLink()} />
          <button className="icon-btn" style={{ width: '3rem', height: '3rem' }} onClick={pasteFromClipboard} aria-label="Pegar enlace del portapapeles" title="Pegar del portapapeles"><ClipboardPaste size={18} /></button>
        </div>
        <button className="btn btn-primary btn-block" disabled={loading || !url.trim()} onClick={fetchFromLink}>
          <Download size={16} /> {loading ? 'Leyendo la página…' : 'Traer canción'}
        </button>
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Funciona con LaCuerda, Cifra Club, E-Chords, Ultimate Guitar y Letras.com. La app lee solo el texto de la canción y conserva los acordes alineados.</p>
      </section>

      {/* Alternativa: texto copiado */}
      <section className="surface p-4 space-y-3">
        <button className="w-full text-left font-bold text-sm flex items-center justify-between" onClick={() => setShowPaste(v => !v)}>
          <span>¿Prefieres copiar y pegar el texto?</span>
          <span style={{ color: 'var(--accent)' }}>{showPaste ? 'Ocultar' : 'Mostrar'}</span>
        </button>
        {showPaste && (
          <>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Funciona con cualquier página: copia la letra con sus acordes y pégala aquí. Se detectan título, acordes y secciones.</p>
            <textarea className="field font-mono" style={{ fontSize: '13px' }} rows={8} placeholder={'Título de la canción\nArtista\n\n   G        D\nLetra con acordes encima…'} value={pasted} onChange={e => setPasted(e.target.value)} spellCheck={false} />
            <button className="btn btn-soft btn-block" disabled={loading || pasted.trim().length < 10} onClick={analyzePasted}>{loading ? 'Analizando…' : 'Analizar texto'}</button>
          </>
        )}
      </section>

      {error && (
        <div className="p-4 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', color: '#ef4444' }}>{error}</div>
      )}

      {previews.length > 0 && (
        <section className="surface p-4 space-y-3">
          <div className="font-bold text-sm flex items-center">{step(3)} Revisa e importa</div>
          <div>
            <label className={label} style={{ color: 'var(--text-muted)' }}>Guardar en el cancionero</label>
            <select className="field" value={hymnalId} onChange={e => setHymnalId(e.target.value)}>
              {hymnals.map(h => <option key={h.id} value={h.id}>{h.icon} {h.name}</option>)}
            </select>
          </div>
          <ParsedSongsReview
            previews={previews}
            onChange={setPreviews}
            hymnal={hymnals.find(h => h.id === hymnalId)}
            label={source}
            extraNote={sourceUrl ? `Fuente: ${sourceUrl}` : undefined}
            onDone={() => { setPreviews([]); setUrl(''); setPasted(''); onDone(); }}
          />
        </section>
      )}

      <p className="text-[11px] text-center px-4" style={{ color: 'var(--text-muted)' }}>
        Las letras y los acordes pertenecen a sus autores y a cada sitio. Úsalos para tu práctica personal y respeta los términos de cada página.
      </p>
    </div>
  );
}
