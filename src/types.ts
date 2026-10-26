export interface Song {
  id: string;
  title: string;
  artist: string;
  code: string;
  number?: number;
  hymnalId: string;
  key: string;
  timeSignature: string;
  bpm: number;
  language: string;
  categories: string[];
  sections: SongSection[];
  lyrics: string;
  notes: string;
  lyricsByLanguage?: Record<string, string>;
  /** Detalle del himnario o cancionero físico, por ejemplo "Himno Cala" o "Himnario Verde" (opcional) */
  hymnalDetail?: string;
  /** Numeración propia dentro de ese himnario, por ejemplo "N° 75" (opcional) */
  hymnalNumber?: string;
  /** Orden de presentación de las secciones (ids de sección, se pueden repetir) y segundos por sección */
  presentationOrder?: { sections: string[]; intervalSeconds: number };
}

export interface SongSection {
  type: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'pre-chorus';
  label: string;
  lines: string[];
}

export interface Hymnal {
  id: string;
  name: string;
  description: string;
  language: string;
  icon: string;
  color: string;
  isCustom: boolean;
  image?: string;
  codePrefix?: string;
  /** Fondo por defecto al exportar canciones de este cancionero (PDF e imagen) */
  exportTheme?: string;
  /** Detalle del himnario que se aplica a todas sus canciones (ej. "Himnario Bautista") */
  songDetail?: string;
  /** Numera las canciones automáticamente (N° 1, N° 2…) */
  autoNumber?: boolean;
  /** Ocultar la numeración propia de TODAS las canciones de este cancionero (la automática y la escrita a mano) */
  hideOwnNumber?: boolean;
  /** Primer número de la numeración automática (por defecto 1) */
  numberStart?: number;
  /** Usar la portada como fondo de la lista de canciones (activado por defecto si hay portada) */
  bgList?: boolean;
  /** Fondo de las letras: 'inherit' (ajuste general), 'cover', 'app', 'none' o el id de una imagen propia */
  bgSong?: string;
}

export interface Setlist {
  id: string;
  name: string;
  songs: SetlistSong[];
  createdAt: string;
  updatedAt: string;
  notes: string;
}

export interface SetlistSong {
  songId: string;
  /** Elemento escrito a mano (nota o canción que no está en los cancioneros); su songId empieza con "free-" */
  free?: boolean;
  title?: string;
  transposition: number;
  notes: string;
  order: number;
}

export interface OrderItem {
  id: string;
  title: string;
  /** 'song' = canción del cancionero, 'text' = momento libre (bienvenida, intervención, cierre...) */
  kind?: 'song' | 'text';
  songId?: string;
  key?: string;
  duration?: string;
  /** Detalle o nota del elemento (para elementos de texto: qué se dice o se hace) */
  text?: string;
  /** Responsable (quién habla, dirige, ora...) */
  person?: string;
  /** Ministerio o grupo que lo presenta (se muestra en la diapositiva de título) */
  ministry?: string;
  /** Duración estimada en minutos */
  minutes?: number;
  /** Semitonos de transposición para canciones */
  transposition?: number;
}

export interface Order {
  id: string;
  name: string;
  type: string;
  date: string;
  items: OrderItem[];
  /** Hora de inicio HH:MM */
  time?: string;
  notes?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  fontSize: number;
  showChords: boolean;
  capo: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  favorites: string[];
  setlists: Setlist[];
  orders: Order[];
  preferences: UserPreferences;
  personalNotes: Record<string, string>;
  customHymnals: Hymnal[];
  customSongs: Song[];
  userProfile?: UserProfile;
}
