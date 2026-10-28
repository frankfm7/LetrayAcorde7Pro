import { Song } from '../types';

/** Quita el "//" de las líneas de acordes: quedan alineadas sobre la letra. */
const withChords = (lyrics: string) =>
  lyrics.split('\n').map(l => (l.trim().startsWith('//') ? l.slice(l.indexOf('//') + 2).replace(/\s+$/, '') : l)).join('\n');

/** Texto para compartir con TODO: título, artista, datos, letra completa con acordes (y cada idioma) y notas. */
export function generateSongShareText(song: Song): string {
  let text = `${song.title}\n`;
  if (song.artist && song.artist !== 'Desconocido') text += `${song.artist}\n`;
  const detail = [song.hymnalDetail, song.hymnalNumber].filter(Boolean).join(' ');
  if (detail) text += `${detail}\n`;
  text += `\nTonalidad: ${song.key}  ·  Compás: ${song.timeSignature}  ·  ${song.bpm} BPM\n\n`;
  if (song.lyricsByLanguage && Object.keys(song.lyricsByLanguage).length > 1) {
    Object.entries(song.lyricsByLanguage).forEach(([lang, lyrics], i) => {
      if (i > 0) text += `\n${'='.repeat(40)}\n\n`;
      text += `[${lang}]\n\n${withChords(lyrics)}\n`;
    });
  } else {
    text += withChords(song.lyrics);
  }
  const notes = (song.notes || '').trim();
  if (notes) text += `\n\nNotas: ${notes}`;
  return text.trim();
}
