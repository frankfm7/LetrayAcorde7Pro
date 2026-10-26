import { Hymnal, Song } from '../types';

export const hymnals: Hymnal[] = [
  {
    id: 'mis-canciones',
    name: 'Mis Canciones',
    description: 'Creaciones personales',
    language: 'Castellano',
    icon: '📖',
    color: '#f97316',
    isCustom: true,
    codePrefix: 'M',
  },
];

export const songs: Song[] = [
  {
    id: 'm1',
    title: 'Renuévame',
    artist: 'Marcos Witt',
    code: 'M1',
    number: 1,
    hymnalId: 'mis-canciones',
    key: 'D',
    timeSignature: '4/4',
    bpm: 68,
    language: 'Castellano',
    categories: ['Adoración'],
    sections: [],
    lyrics: `VERSO 1
//D                A
Renuévame, Señor Jesús
//Bm             F#m
Ya no quiero ser igual

CORO
//G              D
Porque todo lo que hay dentro de mí
//A              Bm
necesita ser cambiado, Señor`,
    notes: 'Canción de adoración',
  },
  {
    id: 'm2',
    title: 'Jach\'a Apu Dios',
    artist: 'Tradicional Andina',
    code: 'M2',
    number: 2,
    hymnalId: 'mis-canciones',
    key: 'Am',
    timeSignature: '4/4',
    bpm: 80,
    language: 'Castellano/Aymara',
    categories: ['Himno', 'Bilingüe'],
    sections: [],
    lyrics: `VERSO 1
//Am             Em
Gran Dios Padre, nuestro Creador
//Am             Em
Gran Dios Padre, nuestra Madre

CORO
//F              Am
Príncipe de los dioses
//F              Am
Muy poderoso dios`,
    lyricsByLanguage: {
      'Castellano': `VERSO 1
//Am             Em
Gran Dios Padre, nuestro Creador
//Am             Em
Gran Dios Padre, nuestra Madre

CORO
//F              Am
Príncipe de los dioses
//F              Am
Muy poderoso dios`,
      'Aymara': `VERSO 1
//Am             Em
Jach'a Apu Dios, jiwasan Tatana
//Am             Em
Jach'a Apu Dios, jiwasan Mamana

CORO
//F              Am
Jilïri Apunakana
//F              Am
Wali ch'ama Apunakana`
    },
    notes: 'Himno bilingüe Castellano/Aymara',
  },
];

export function generateSongCode(hymnal: Hymnal, number: number): string {
  const prefix = hymnal.codePrefix || hymnal.id.charAt(0).toUpperCase();
  return `${prefix}${number}`;
}

export function getNextSongNumber(hymnalId: string, songsList: Song[]): number {
  const hymnalSongs = songsList.filter(s => s.hymnalId === hymnalId);
  if (hymnalSongs.length === 0) return 1;
  const numbers = hymnalSongs.map(s => s.number || 0).filter(n => !isNaN(n));
  if (numbers.length === 0) return 1;
  return Math.max(...numbers) + 1;
}
