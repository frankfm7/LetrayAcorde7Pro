import { Song } from '../types';

export function generateSongShareText(song: Song): string {
  let text = `${song.title}\n`;
  if (song.artist && song.artist !== 'Desconocido') text += `${song.artist}\n`;
  text += `\nTonalidad: ${song.key}\nCompás: ${song.timeSignature}\nBPM: ${song.bpm}\n\n`;
  if (song.lyricsByLanguage && Object.keys(song.lyricsByLanguage).length > 1) {
    Object.entries(song.lyricsByLanguage).forEach(([lang, lyrics], i) => {
      if (i > 0) text += `\n${'='.repeat(40)}\n\n`;
      text += `[${lang}]\n\n${lyrics}\n`;
    });
  } else {
    text += song.lyrics;
  }
  return text.trim();
}
