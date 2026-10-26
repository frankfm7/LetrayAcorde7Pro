# Cancionero7Pro — Cambios de la versión 2

## Cómo probarlo
```
npm install
npm run dev        # abre http://localhost:3000
npm run build      # versión final en /dist
```
Para el micrófono del afinador hace falta abrir la app con `https://` o desde `localhost`
(en Vercel/Netlify ya es https).

## Archivos nuevos
- `src/utils/search.ts` — motor de búsqueda (sin tildes, tolera errores, busca en letras de todos los idiomas, ordena por relevancia, resalta).
- `src/utils/listUtils.ts` — horarios, textos para compartir, archivos de lista/orden (.json), importar.
- `src/hooks/useSongLibrary.ts` — canciones y cancioneros ya combinados.
- `src/components/SearchPage.tsx`, `SetlistsPage.tsx`, `OrdersPage.tsx`, `ToolsPage.tsx`
- `src/components/Tuner.tsx` (reescrito), `CircleOfFifths.tsx` (interactivo)
- `src/components/SongPicker.tsx`, `AddToListModal.tsx`, `ActionSheet.tsx`, `SortableList.tsx`, `QueueBar.tsx`, `Highlight.tsx`

## Archivos modificados
- `src/App.tsx` — usa las pantallas nuevas, "Agregar a lista" en el menú ⋮ de cada canción, modo Presentar, barra inferior renovada.
- `src/context/AppContext.tsx` — actualizar/duplicar listas y órdenes; el estado guardado se combina con valores por defecto.
- `src/types.ts` — elementos de orden con tipo (canción/texto), responsable, minutos, transposición, hora de inicio y notas.
- `src/index.css` — estilos de botones, chips, tarjetas, modales (al final del archivo).

## Archivo eliminado
- `src/components/App.tsx` (copia duplicada que no se usaba).


---

# Versión 2.1 — correcciones

## Arreglado
- **Editar cancionero**: los cambios del cancionero predeterminado ("Mis Canciones") no se guardaban. Ahora se guardan y conservan su lugar.
- **Importar (TXT, Word, PDF, imagen)**: el texto se cortaba en cada guion y los archivos Word/PDF/imagen se leían dos veces, perdiendo el título y los saltos de línea. Reescrito: reconoce título, artista, tono, secciones (Verso/Coro/Estribillo/Puente…) y acordes (letras A–G y también Do–Si), y los alinea sobre la letra.
- **Imagen**: el recorte ya no cierra la ventana al terminar. Se prepara la foto (tamaño, contraste, sombras, fondo oscuro) antes del OCR y se conserva el espaciado de los acordes. Nuevo botón "Usar toda la imagen".
- **PDF**: se lee con su worker incluido en la app y se reconstruyen líneas y columnas.
- **Menú del cancionero → Importar**: antes decía "próximamente"; ahora abre la importación con ese cancionero seleccionado. **Exportar** ofrece todos los formatos.
- **Listas y Órdenes**: al ver una letra y volver, regresa DENTRO de la lista u orden.
- **Presentar orden**: recorre toda la orden (canciones y momentos como bienvenida, oración, predicación) con horas, y un menú para saltar a cualquier elemento.
- **Logo C7** de la pantalla de inicio: vuelve a entrar girando.

## Exportar
- TXT con acordes alineados (se puede volver a importar), Word y PDF en letra monoespaciada con acordes alineados.
- PDF e imagen con fondo elegible: Blanco, Papel, Oscuro, Violeta, Océano, Atardecer, Bosque, color del cancionero o su portada.
- El fondo por defecto de cada cancionero se elige en **Editar cancionero → Fondo para exportar**.
- La imagen (PNG) se dibuja directamente (ya no depende de capturar la pantalla): funciona para una o varias canciones, también desde Listas y Órdenes.

## Archivos nuevos
`utils/songParser.ts`, `utils/exportThemes.ts`, `utils/exportImage.ts`, `utils/hymnalUtils.ts`, `components/TextSlide.tsx`, `components/ExportThemePicker.tsx`, `vite-env.d.ts`

---

# Versión 2.2

## Listas y Órdenes
- Títulos: **Listas de canciones** y **Órdenes de evento**. Textos neutros (sin "culto", "alabanza", "predicación"): tipos Evento, Reunión, Ensayo, Concierto, Celebración, Otro; momentos Bienvenida, Apertura, Presentación, Anuncios, Lectura, Mensaje, Testimonio, Agradecimientos, Receso, Cierre.
- Cada lista/orden tiene un menú ⋮ (Abrir, Duplicar, Eliminar). Eliminar pide confirmación.
- Dentro de una lista/orden, menú ⋮ maestro: seleccionar varias, mostrar/ocultar controles para mover, mostrar/ocultar todas las letras, ordenar A–Z, restablecer tonos, renombrar, duplicar, vaciar, eliminar.
- Cada canción tiene menú ⋮ (ver letra, presentar desde aquí, nota, mover al inicio/final, quitar) y una flecha ▾ que despliega la letra con acordes ahí mismo.
- Selección múltiple con barra de acciones (Todas/Ninguna, Quitar).

## Importar archivos grandes
- Un documento con cientos de canciones se separa solo (títulos numerados, títulos seguidos de "VERSO 1" o "Tono:", títulos en mayúsculas, o una canción por página). Los índices (lista de títulos con páginas) se omiten.
- Word: las imágenes se ignoran y se respetan los saltos de página. PDF: se quitan encabezados y números de página repetidos.
- La pantalla ya no se congela: hay barra de avance y se puede cerrar para cancelar. La revisión muestra 25 canciones a la vez.
- Se corrigió una expresión que podía bloquear el análisis con ciertos textos.

## Buscar en la web (Menú+ → Buscar en la web, y desde Buscar)
- Paso 1: buscas la canción y se abre LaCuerda, Cifra Club, E-Chords, Ultimate Guitar, Letras.com o toda la web.
- Paso 2: pegas el enlace y "Traer canción". Un servidor (`api/song.js`) lee la página y devuelve solo la letra con los acordes alineados. Luego se revisa e importa al cancionero elegido.
- Alternativa: pegar el texto copiado (funciona con cualquier página).
- Requiere publicar en Vercel (la carpeta `api/` se activa sola) o usar `npm run dev`. Variables opcionales: `SONG_ALLOWED_HOSTS` (sitios extra, separados por comas, en el servidor) y `VITE_SONG_API` (dirección del servidor si la API está en otro lugar).


---

# Versión 2.3

## Nuevos campos de la canción
- Detalle de Cancionero (ej. Himno Cala) y Numeración Propia (ej. N° 75, se quitan los ceros a la izquierda). Se editan en Editar Canción, antes del Título, y se muestran en la línea del artista de la vista de canción. También se pueden buscar y salen en la cabecera del PDF y de la imagen.

## Orden de presentación
- En la barra de secciones (V1, C, V2…): botones Configurar Orden y Play. Durante la presentación: anterior, pausa/reanudar, siguiente y Detener, con barra de avance.
- La secuencia se guarda en la canción (presentationOrder: sections e intervalSeconds). No se copian secciones: solo se cambia cuál está activa. Las demás se atenúan al 50 %.

## Arreglos relacionados
- Editar una canción predeterminada (por ejemplo M1 o M2) no se guardaba; ahora sí y no se repite en las listas.
- Los acordes conservan su sangría al mostrarse, así quedan sobre la palabra correcta.
- Los ids de sección ahora son únicos aunque un título (por ejemplo CORO) se repita.

## Archivos nuevos
utils/presentation.ts, components/PresentationOrderModal.tsx

---

# Versión 2.4

## Cambios que no se guardaban (corregido)
- Causa principal: al abrir "Editar" desde una canción, el editor recibía una copia vieja de la canción (la que se había abierto al principio) y no la última guardada. Los campos aparecían vacíos o con datos anteriores y, al guardar, se pisaban los cambios nuevos, incluido el orden de presentación. Ahora el editor y la vista siempre parten de la última versión.
- Causa secundaria: las imágenes de portada (hasta 5 MB) llenaban la memoria del navegador y, cuando se llenaba, dejaban de guardarse TODOS los cambios sin avisar. Ahora las imágenes se reducen automáticamente al cargarlas (portadas y foto de perfil) y, si aun así no hay espacio, la app avisa con un mensaje.

## Presentación
- Tiempo por sección de 1 a 50 segundos, con atajos (3, 5, 8, 12, 20, 30, 40 y 50 s).
- Un punto verde en el botón Configurar Orden indica que la canción ya tiene un orden guardado (con su tiempo). Se guarda por canción y se conserva al cerrar la app.

## Archivos
Nuevo: utils/imageUtils.ts. Modificados: App.tsx, components/SongEditor.tsx, AddHymnalModal.tsx, EditHymnalModal.tsx, ProfilePage.tsx, PresentationOrderModal.tsx, context/AppContext.tsx, utils/presentation.ts.

---

# Versión 2.5

## Importar: reconoce todos los datos
- Líneas con etiqueta (en cualquier orden): Título, Artista, Detalle de Cancionero / Himnario / Cancionero, Numeración propia / Himno / Número (acepta "número uno", "N° 075"), Tonalidad / Tono / Nota, Compás, BPM, Idioma, Categoría / Tema, Capo, Orden / Presentación / Secuencia y Tiempo por sección.
- Si no hay idioma escrito, se detecta por la letra (castellano, inglés, portugués, francés, italiano, y algo de quechua y aymara).
- Orden de presentación: "V1, C, V2, C, V3, C" (también "Verso 1, Coro…", "[V1] [C]", "1 C 2 C") se guarda en la canción automáticamente.
- Acordes: además de "//" ahora se acepta "." al inicio de la línea (formato OpenSong) y acordes sueltos A–G o Do–Si sobre la letra.
- Secciones: VERSO 1, V1, [V1], (V1), V1:, [C], C:, [B], [P], [I], [E], [Coro], Chorus, Estribillo, Verse, Bridge…
- Varias canciones en un archivo se separan solas cuando cada una empieza con su bloque de datos.
- Formatos de otras apps: OpenSong (.xml o sin extensión), OpenLP / OpenLyrics (.xml, con acordes), EasiSlides (.xml), ChordPro (.cho .chordpro .crd .pro), SongBeamer (.sng), SongSelect (.usr), JSON de Holyrics y similares, JSON de esta app, además de TXT, Word, PDF e imágenes.
- La revisión previa muestra lo reconocido (himnario, numeración, idioma, categorías, orden) y permite corregirlo.

## Exportar TXT reimportable
- El TXT incluye todos los datos (título, artista, himnario, numeración, tono, compás, BPM, idioma, categoría, orden y tiempo) y al importarlo se llena todo solo.

## Editor de canción
- Nueva sección "Orden de presentación": muestra la secuencia (V1, C, V2…), permite configurarla o volver al orden por defecto, y se guarda con la canción.

## Fondos de pantalla (Menú+ → Fondos de pantalla)
- Carga hasta 10 imágenes (se reducen solas). Elige fondo para la app y para las letras, con ajuste de capa y desenfoque para que se lea bien.
- Cada cancionero (Editar cancionero → Fondos de pantalla): usar su portada como fondo de su lista de canciones y elegir el fondo de sus letras.
- Esas imágenes también se pueden usar como fondo al exportar PDF e imagen.

## Pantallas
- La letra ya usa el mismo ancho que el resto de pantallas en computadora (antes se veía más angosta).
- Listas de canciones y Órdenes de evento se muestran como filas largas.

## Archivos nuevos
utils/songFormats.ts, utils/songText.ts, utils/backgroundStore.ts, components/BackgroundLayer.tsx, BackgroundsPage.tsx, HymnalBackgroundPicker.tsx

---

# Versión 2.6

- Importar: "Cancionero: Himnario Bautista" se guarda tal cual como detalle; "Número: N° 1" (y variantes N°, Nº, N.º, No., #, "número uno") se reconoce como numeración propia. Funciona también cuando cada dato está en un párrafo separado (Word) y con varias canciones seguidas.
- Cancionero (Crear/Editar): "Detalle y numeración del himnario": un detalle para todas las canciones (ej. Himnario Bautista) y numeración automática N° 1, N° 2… desde el número que elijas. Las canciones con su propio detalle o número conservan los suyos. También se usa al exportar.
- Vista de canción: en la fila del título aparece primero el código y la numeración (M1 · N° 1) y luego el título; debajo, junto al artista, el detalle y la numeración.
- La portada del cancionero ahora es el fondo de su lista de canciones por defecto (se puede desactivar en Editar cancionero → Fondos de pantalla).
- Menú inferior (Menú+): se puede desplazar y el fondo vuelve a verse difuminado en lugar de oscuro. Las demás ventanas también.
- Logo: el 7 del cuadrado C7 y "7Pro" en dorado metálico (pantalla de inicio y cabecera).

---

# Versión 2.7

- **Título**: ahora solo muestra el código del cancionero (S1, B1…). La numeración propia ya sale debajo (con el detalle) y no se repite. Cada cancionero tiene la casilla "Mostrar la numeración propia" (Editar cancionero) y se respeta en todas partes.
- **Barra de secciones** (V1, C, V2…): muestra TODA la secuencia de "Configurar Orden", con repeticiones; durante el Play resalta el paso actual y al tocar un paso salta a él.
- **Ventana Configurar Orden**: ya no la tapan el encabezado ni el menú inferior (se arregló el nivel de capas de todas las ventanas flotantes).
- **Tonalidad**: acepta bemoles (Eb, Bb…) y mayor↔menor. Al cambiar de modo en el editor se elige entre convertir los acordes (I→i, IV→iv, V queda mayor) o solo cambiar el nombre (relativa).
- **Menús**: "Editar cancionero", "Eliminar cancionero", "Importar canciones", "Exportar cancionero", "Editor de letras", "Editar letra". Íconos de importar/exportar corregidos (importar = flecha hacia adentro).
- **Importar**: conserva Eb (ya no D#); reconoce "Mi bemol", "Re menor"; acepta etiquetas sin ":" (Título A Dios…, Compás 3/4, Número uno); reconoce dos idiomas con marcadores `==== Aymara ====` (cualquier cantidad de signos, mayúsculas o minúsculas) y los separa.
- Botón de tono vacío: ahora muestra "+".
- **Pantalla**: encabezado, menú inferior y cabecera de la canción más bajos; interlineado de la letra compacto (acorde pegado a su letra) sin cambiar el tamaño de la letra.

---

# Versión 2.8

- **Importar**: los campos sin valor ("Artista:") ahora se reconocen como vacíos. Antes rompían el reconocimiento del bloque (salía "Sin título" y "bloques no se pudieron leer").
- **Tono mayor↔menor** también desde los botones de tono de la letra (convierte los acordes); la exportación respeta ese cambio.
- Nombre de la app: **Letra&Acorde7Pro**.

---

# Versión 2.9

- **Menú+**: al entrar a Perfil, Exportar, Importar, etc. y volver a tocar una opción del menú inferior, ahora se sale de esa pantalla (antes se quedaba atrapado).
- Botón **Volver** en Fondos de pantalla, Buscar en la web y Más herramientas.
- **Diagramas de guitarra**: doble clic (o doble toque) sobre un acorde de la letra abre su digitación, con varias posiciones (abierta y cejilla) y flechas para cambiar. Sigue el tono mostrado.
- **Imagen (PNG)**: en Exportar → "Personalizar imagen": intensidad y difuminado de bordes del recuadro, y colores de recuadro, título, artista/datos, Verso/Coro, acordes y letra. Se recuerda y también se aplica al exportar desde Listas y Órdenes.

---

# Versión 2.10

- **Mis tonos (+)**: tocar un "+" vacío abre directo el selector; el botón ✎ permite cambiar un tono ya guardado, y el selector tiene "Quitar este tono".
- **Diagrama de acordes**: selector de instrumento (Guitarra, Ukulele, Piano); se recuerda el último usado.
- **Exportar**: Imagen (PNG) y PDF abren su propia ventana (fondo, y para la imagen todo el personalizado) con su botón de exportar. TXT, Word y JSON exportan directo.
- **Volver** en Buscar, Favoritos, Listas y Órdenes (no en Inicio; dentro de una lista abierta se usa el volver propio).

---

# Versión 2.11

- Botón **volver** (solo la flecha) en la misma línea del título en Buscar, Favoritos, Listas, Órdenes, Herramientas, Fondos y Buscar en la web.
- Mis tonos: el ✎ se reemplazó por un **tercer botón +** con las mismas funciones (clic vacío = guardar tono; clic = aplicar; doble clic o mantener = cambiar / quitar).
- Diagrama de acordes: se agregó **Charango** (G C E A E).
- Imagen PNG: recuadro **oscuro por defecto** con letras claras (o claro), opción Automático/Recuadro oscuro/Recuadro claro, y control de **oscuridad de la imagen de fondo** (menos = más clara).

---

# Versión 2.12

- **Botón atrás del celular**: retrocede dentro de la app (cierra ventanas, vuelve de la letra al cancionero, de Listas/Órdenes a Inicio…) y solo sale de la app estando en Inicio.
- **Listas**: botón "Nota o canción externa" para agregar elementos que no están en los cancioneros (título + detalle). Se ven en la lista, en el texto compartido y en la presentación.
- **Órdenes**: "Nota o canción" con casilla "Es una canción que no está en mis cancioneros".
- **Legibilidad**: letra y acordes más gruesos y con contorno en pantalla (sobre fotos de fondo); panel de la letra más opaco con fondo.
- **Imagen PNG**: contorno en todas las letras (negro sobre letra clara / blanco sobre oscura, se puede desactivar), letra más gruesa, recuadro más oscuro por defecto.

---

# Versión 2.13

- **Por qué en el celular se veía igual y flaco**: la app pedía las fuentes Montserrat/Inter pero nunca las cargaba; cada aparato usaba su letra del sistema (por eso PC y celular se veían distintos). Ahora las fuentes vienen incluidas en la app (Montserrat y Roboto Mono): se ve igual en celular y PC.
- **Letra del visor**: extra negrita (800), acordes en negrita, títulos de sección en 900, con contorno sólido contrario al tema (negro sobre letra clara / blanco en tema claro).
- **Imagen PNG**: usa las mismas fuentes y el mismo estilo que el visor (letra extra negrita + acordes), esperando a que carguen las fuentes antes de dibujar. Contorno configurable: automático (contrario a la letra), negro, blanco u otro color, y su grosor.
- **Listas y Órdenes**: la opción "Agregar una canción que no está en mis cancioneros" está dentro de la ventana "Agregar canciones". Los botones de Órdenes vuelven a "Momento / texto" y "Momento".

---

# Versión 2.14

- Pantalla de bienvenida: el título se ajusta al ancho del celular.
- Buscador y lista del cancionero: mismo tamaño y grosor (negrita, más pequeño).
- Letra: la tarjeta ocupa el ancho completo en el celular (sin márgenes laterales).
- **PWA instalable**: `public/manifest.json`, `public/sw.js`, íconos (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`), etiquetas en `index.html` y registro del service worker en `src/main.tsx` (solo en la versión publicada).

---

# Versión 2.15

- **Listas y Órdenes**: barra superior en una sola línea (Canción · Texto · Presentar); Compartir y Exportar están en el menú ⋮; las indicaciones/resumen se ven solo con "Ver indicaciones" en el ⋮. En listas, el tono y la nota salieron de la fila (se cambian desde el ⋮ de cada canción: subir/bajar tono, tono original, nota) y el tono se ve junto al artista.
- **Órdenes**: la hora de cada elemento ahora es chica y va debajo del título; "Cambiar canción" en el ⋮ de cada canción y dentro de su editor.
- **Agregar canciones**: "Agregar una canción que no está en mis cancioneros" arriba, justo después de buscar; filtro ⭐ Favoritos; las canciones salen en orden (por cancionero y número 1, 2, 3…). Lo mismo en la lista de cada cancionero.
- **Presentar a pantalla completa** (Listas y Órdenes, y el botón Play de una letra): sin encabezado ni menú, con la pantalla completa del aparato. Botón ⛶ en la letra para entrar/salir. El botón atrás del celular sale de la pantalla completa primero.
- **Herramientas → Acordes**: biblioteca de acordes (19 tipos: mayor, menor, 5, 6, m6, 7, maj7, m7, 7sus4, sus4, sus2, add9, 9, m9, maj9, dim, dim7, m7b5, aug) para guitarra, ukulele, charango y piano, con varias posiciones y sonido. El diagrama de la letra también tiene "Escuchar".

---

# Versión 2.16

- **Diapositiva de título** antes de cada canción en la presentación (4 s o al tocar): título, artista, responsable, ministerio, tono/compás/BPM y numeración propia. Las canciones de una lista/orden arrancan solas (título → secciones → siguiente elemento); los textos se muestran directo y avanzan al tocar la pantalla. Campo nuevo "Ministerio" en el editor de elementos de la orden.
- **Buscador**: al elegir "Todos" o un cancionero, las canciones salen en orden natural (numeración propia o número de orden: 1, 2, 3 … 10, 11). Misma lógica en "Agregar canciones" y en la lista de cada cancionero.

---

# Versión 2.17

- **Login con Google (Supabase)**: `src/lib/supabase.ts`, `src/context/AuthContext.tsx` (AuthProvider + useAuth), `src/components/LoginButton.tsx`; el botón del encabezado ahora es "Iniciar sesión" (o foto + nombre, con menú: perfil y cerrar sesión). Todo lo local (localStorage) sigue igual. Dependencia nueva: `@supabase/supabase-js`.

---

# Versión 2.18

- **Perfil** con los datos reales de Google (nombre, correo, foto); sin sesión: "Inicia sesión para ver tu perfil" + botón.
- **Botón de login**: siempre dice "Iniciar sesión".
- **Buscar en la Nube** (tabla `community_songs`): pestaña en Buscar; abre o guarda la canción en tu cancionero.
- **Compartir con la comunidad**: opción en el ⋮ de la letra; inserta title, artist, lyrics, chords y created_by (= user.id).
- Archivos nuevos: `src/lib/auth.ts`, `src/lib/communitySongs.ts`.

Tabla esperada en Supabase (ajústala si la tuya difiere):
```sql
create table community_songs (
  id bigint generated always as identity primary key,
  title text not null, artist text, lyrics text, chords text,
  created_by uuid references auth.users(id), created_at timestamptz default now()
);
alter table community_songs enable row level security;
create policy "leer" on community_songs for select to authenticated using (true);
create policy "subir" on community_songs for insert to authenticated with check (auth.uid() = created_by);
```

---

# Versión 2.19

- **Himnarios Oficiales**: `src/lib/officialHymnals.ts`, `src/pages/OfficialHymnalsPage.tsx`, acceso en Menú+ (solo con sesión), tercera pestaña en Buscar. `AuthContext` ahora expone `isAdmin` (lee `profiles.is_admin`). SQL de `official_songs` y sus reglas RLS en `supabase_official_songs.sql`.
