# 📋 INFORME COMPLETO - CANCIONERO7PRO

## 🎨 DISEÑO VISUAL Y SISTEMA DE TEMAS

### Paleta de Colores
**Tema Claro:**
- Fondo principal: `#ffffff` (blanco)
- Fondo secundario: `#f8fafc` (gris muy claro)
- Fondo terciario: `#f1f5f9` (gris claro)
- Texto principal: `#0f172a` (gris oscuro)
- Texto secundario: `#334155` (gris medio)
- Texto muted: `#64748b` (gris claro)
- Bordes: `#e2e8f0` (gris muy claro)
- Color acento: `#7c3aed` (púrpura/violeta)
- Color acento claro: `#ede9fe` (púrpura muy claro)
- Color dorado: `#f59e0b` (ámbar)
- Color dorado claro: `#fef3c7` (ámbar muy claro)

**Tema Oscuro:**
- Fondo principal: `#0a0a1a` (negro azulado)
- Fondo secundario: `#111827` (gris muy oscuro)
- Fondo terciario: `#1f2937` (gris oscuro)
- Texto principal: `#f9fafb` (blanco)
- Texto secundario: `#d1d5db` (gris claro)
- Texto muted: `#6b7280` (gris medio)
- Bordes: `#1f2937` (gris oscuro)
- Color acento: `#a78bfa` (púrpura claro)
- Color acento claro: `#1e1b4b` (púrpura muy oscuro)
- Color dorado: `#fbbf24` (ámbar brillante)
- Color dorado claro: `#451a03` (ámbar oscuro)

### Tipografía
- **Fuente principal:** Inter, system-ui, sans-serif
- **Fuente para letras:** Montserrat, Inter, system-ui, sans-serif
- **Tamaño base:** 16px
- **Interlineado:** 1.6
- **Botones:** 14px
- **Inputs:** 16px

### Efectos Visuales
- **Transiciones:** 0.2s ease en background-color y border-color
- **Hover lift:** translateY(-2px) con sombra aumentada
- **Fade in:** opacity 0→1, translateY 10px→0 en 0.3s
- **Backdrop blur:** blur(20px) para efectos de vidrio
- **Sombras:** 
  - Card: 0 4px 12px rgba(0,0,0,0.08)
  - Hover: 0 12px 24px rgba(0,0,0,0.12)

---

## 🖥️ PANTALLAS Y COMPONENTES

### 1. SPLASH SCREEN (SplashScreen.tsx)
**Descripción:** Pantalla de carga inicial con animación

**Elementos Visuales:**
- **Fondo:** Gradiente linear de `#667eea` (azul púrpura) a `#764ba2` (púrpura oscuro)
- **Logo C7:** 
  - Tamaño: 128x128px (w-32 h-32)
  - Forma: Redondeado 24px (rounded-3xl)
  - Fondo: rgba(255,255,255,0.2) con backdrop blur
  - Texto: "C7" en blanco, 48px, font-black
  - Animación: Rotación única de 360° en 1 segundo
- **Título:** "Cancionero7Pro"
  - Tamaño: 48px (text-5xl)
  - Color: Blanco
  - "7Pro" en color dorado `#fbbf24`
- **Subtítulo:** "Gestión Profesional de Letras y Acordes"
  - Tamaño: 18px (text-lg)
  - Color: Blanco con 80% opacidad
- **Indicadores de carga:** 3 puntos animados
  - Tamaño: 8x8px
  - Color: Blanco con 60% opacidad
  - Animación: Bounce con delays de 0s, 0.2s, 0.4s

**Duración:** 2.5 segundos antes de mostrar la app principal

---

### 2. LAYOUT PRINCIPAL (App.tsx - Layout)
**Descripción:** Estructura base de todas las pantallas

#### HEADER (Barra Superior)
**Posición:** Sticky top, z-index 30
**Altura:** 64px (h-16)
**Fondo:** Color primario con 85% opacidad + backdrop blur

**Elementos:**
- **Logo (izquierda):**
  - Caja: 32x32px, redondeado 8px
  - Fondo: Gradiente `#7c3aed` → `#a855f7`
  - Texto: "C7" en blanco, 12px, font-bold
- **Título (centro-izquierda):**
  - "Cancionero7Pro" en color acento, 16-18px, font-bold
  - "7Pro" en font-black
  - Subtítulo: "Letras y Acordes" en texto muted, 9-10px
- **Botones (derecha):**
  - **Búsqueda:** Icono Search, 18px, fondo terciario, padding 10px
  - **Tema:** Icono Sun/Moon, 18px, fondo terciario, padding 10px
  - **Perfil:** 
    - Avatar circular 28x28px con fondo acento claro
    - Nombre del usuario (oculto en móvil, visible en desktop)
    - Padding: 6px 12px, fondo terciario

#### NAVEGACIÓN INFERIOR (Bottom Nav)
**Posición:** Fixed bottom, z-index 30
**Altura:** 60px (py-3)
**Fondo:** Color primario con 90% opacidad + backdrop blur

**6 Botones de Navegación:**
1. **Inicio** (Home icon)
2. **Buscar** (Search icon)
3. **Favoritos** (Heart icon)
4. **Listas** (ListMusic icon)
5. **Órdenes** (Music icon)
6. **Menú+** (Settings icon) - Abre menú de herramientas

**Estados:**
- **Activo:** Color acento, escala 105%, grosor de icono 2.5, barra superior de 2px
- **Inactivo:** Texto muted, opacidad 60%, grosor de icono 1.5

---

### 3. PÁGINA DE INICIO (HomePage)
**Descripción:** Vista principal con grid de cancioneros

**Estructura:**
- **Título de sección:** "📚 Cancioneros" (20px, font-bold)
- **Botón "Nuevo":** 
  - Fondo: Color acento
  - Texto: Blanco, 12px, font-bold
  - Icono: Plus, 14px
  - Padding: 8px 16px
  - Sombra: card-shadow-md

**Grid de Cancioneros:**
- **Responsive:**
  - Móvil: 2 columnas
  - Tablet: 3 columnas
  - Desktop: 4-5 columnas
- **Gap:** 12-16px

**Tarjeta de Cancionero:**
- **Aspect Ratio:** 3:4
- **Fondo:** 
  - Con imagen: Gradiente oscuro sobre imagen
  - Sin imagen: Gradiente del color del cancionero
- **Padding:** 12-20px
- **Bordes:** Redondeados 16px
- **Sombra:** 0 8px 24px con color del cancionero al 27%
- **Hover:** Efecto lift (translateY -2px)
- **Active:** Escala 97%

**Contenido de Tarjeta:**
- **Icono:** 48-64px, con drop-shadow
- **Nombre:** 14-20px, blanco, font-bold, text-shadow
- **Cantidad:** 12-16px, blanco 95% opacidad
- **Idiomas:** 10-12px, blanco 80% opacidad

---

### 4. VISTA DE CANCIÓN (SongView)
**Descripción:** Pantalla completa para visualizar y cantar una canción

#### HEADER DE CANCIÓN
**Fila 1 (Título):**
- **Botón volver:** ChevronLeft, 16px, fondo terciario, padding 6px
- **Título:** 14-16px, font-bold, truncate
- **Botón de idioma** (si hay múltiples):
  - Fondo: Color acento
  - Texto: Blanco, 12px, font-semibold
  - Padding: 4px 12px
  - Bordes: Redondeados 8px
  - Muestra el siguiente idioma disponible

**Fila 2 (Información):**
- **Artista:** Texto muted, truncate
- **Separador:** "•"
- **Tono:** Color acento, font-bold
- **Compás:** Texto muted
- **BPM:** Texto muted
- **Botón tono original:**
  - Activo: Fondo acento, texto blanco
  - Inactivo: Fondo terciario, texto primario
  - Borde: 1px solid border-color
  - Padding: 2px 6px
- **Botones de notas personales (2):**
  - Muestran la nota guardada o "—"
  - Doble clic para editar
  - Clic para aplicar transposición
  - Colores dinámicos según estado

**Botones de acción (derecha):**
- **Favorito:** Star icon, 16px, color dorado si activo
- **Configuración:** Settings icon, 16px
- **Menú:** MoreVertical icon, 16px

#### ÁREA DE LETRA
**Contenedor:**
- Fondo: Color card-bg
- Bordes: 1px solid border-color
- Bordes redondeados: 16px
- Sombra: card-shadow
- Padding: 20-32px
- Scroll: Vertical con overflow-y-auto

**Navegación de Secciones (sticky top):**
- **Posición:** Sticky, top 0, z-index 20
- **Fondo:** Color card-bg con border-bottom
- **Padding:** 8px 12px
- **Botones de sección:**
  - Padding: 6px 12px
  - Bordes: Redondeados 8px
  - Texto: 12px, font-bold, uppercase
  - Colores por sección:
    - VERSO: `#7c3aed` (púrpura)
    - CORO: `#f59e0b` (ámbar)
    - PUENTE: `#059669` (verde)
    - INTRO: `#6366f1` (índigo)
    - FINAL: `#ef4444` (rojo)
    - PRE-CORO: `#ec4899` (rosa)
    - OUTRO: `#0891b2` (cian)
    - BRIDGE: `#059669` (verde)

**Formato de Letra:**
- **Acordes:**
  - Color: Acento
  - Font-weight: 800
  - Font-family: Montserrat/monospace
  - Tamaño: 75% del tamaño de letra
  - Letter-spacing: 0.05em
  - Whitespace: pre
- **Letra:**
  - Font-family: Montserrat
  - Tamaño: Configurado por usuario (14-40px)
  - Line-height: 2
  - Letter-spacing: 0.02em
  - Font-weight: 700
  - Whitespace: pre-wrap

**Secciones:**
- **Título de sección:**
  - Padding: 6px 12px
  - Bordes: Redondeados 8px
  - Texto: 14px, font-black, uppercase, tracking-widest
  - Color: Según tipo de sección
  - Fondo: Color de sección al 12.5% de opacidad
  - Margen: 32px arriba, 12px abajo

#### CONTROLES DE AUTO-SCROLL
**Posición:** Fixed bottom-right, z-index 30

**Botón de velocidad:**
- **Tamaño:** 48x48px
- **Forma:** Circular
- **Fondo:** rgba(124,58,237, buttonOpacity/100)
- **Texto:** Número de velocidad, 18px, font-bold, blanco
- **Efecto:** Backdrop blur 10px
- **Hover:** Scale 110%

**Menú de velocidad (popup):**
- **Ancho:** 224px
- **Fondo:** rgba(0,0,0,0.6) con backdrop blur
- **Bordes:** Redondeados 16px
- **Padding:** 16px

**Contenido del menú:**
- **Título:** "CONTROL DE VELOCIDAD" (12px, blanco 90%)
- **Velocidad actual:** 48px, font-bold, blanco
- **Slider:**
  - Rango: 1-70
  - Paso: 1
  - Color: Púrpura
  - Labels: "Muy lento" - "Muy rápido"
- **Control de opacidad:**
  - Rango: 10-100%
  - Paso: 5
  - Labels: "Transparente" - "Opaco"

**Botón play/pause:**
- **Tamaño:** 48x48px
- **Forma:** Circular
- **Fondo:** 
  - Play: rgba(124,58,237, buttonOpacity/100)
  - Pause: rgba(239,68,68, buttonOpacity/100)
- **Icono:** Play/Pause, 20px, blanco
- **Efecto:** Backdrop blur 10px

#### MODAL DE CONFIGURACIÓN
**Overlay:** rgba(0,0,0,0.6)

**Contenedor:**
- **Ancho máximo:** 448px
- **Fondo:** Color card-bg
- **Bordes:** 1px solid border-color, redondeados 16px
- **Padding:** 24px

**Controles:**
1. **Transposición:**
   - Botones -/+ (40x40px, fondo terciario)
   - Valor central: 24px, font-bold, color acento
   - Label: "semitonos" (12px, texto muted)
   - Botón "Original" si hay transposición

2. **Tamaño de letra:**
   - Slider: 14-40px
   - Labels: "A" pequeño y "A" grande
   - Valor actual: 12px, texto right

3. **Mostrar acordes:**
   - Toggle switch: 48x28px
   - Activo: Color acento
   - Inactivo: Fondo terciario
   - Círculo: 20x20px, blanco

4. **Capo de guitarra:**
   - Botones -/+ (40x40px, fondo terciario)
   - Valor central: 24px, font-bold
   - Label: "traste" (12px, texto muted)

---

### 5. EDITOR DE CANCIONES (SongEditor.tsx)
**Descripción:** Pantalla para crear/editar canciones

**Header:**
- **Botón volver:** ChevronLeft, 20px, fondo terciario
- **Título:** "Editar Canción" (20px, font-bold)
- **Código:** Texto muted, 12px
- **Botón eliminar:** Trash2, 20px, color rojo, fondo terciario

**Formulario:**
- **Grid de 2 columnas:**
  - Título (requerido)
  - Artista

- **Grid de 3 columnas:**
  - Tonalidad (select con 22 opciones)
  - Compás (select: 4/4, 3/4, 6/8, 2/4, 2/2)
  - BPM (input number: 40-240)

- **Cancionero:** Select con lista de cancioneros

- **Idioma Principal:**
  - Select con opciones: Castellano, Aymara, Quechua, Inglés, Otro
  - Botón "Agregar idioma" (fondo acento, texto blanco)
  - Input personalizado si se selecciona "Otro"

- **Pestañas de idiomas** (si hay múltiples):
  - Botones con color acento si activo
  - Botón X para eliminar idiomas adicionales

- **Letra y Acordes:**
  - Textarea: 15 rows, font-mono
  - Placeholder con ejemplo de formato
  - Label inferior: "Editando: [idioma] (Idioma principal)"

- **Notas adicionales:** Textarea, 3 rows

- **Botón guardar:**
  - Ancho completo
  - Fondo: Color acento
  - Texto: Blanco, 14px, font-bold
  - Icono: Save, 16px
  - Disabled: Opacidad 50%

#### MODAL DE AGREGAR IDIOMA
**Overlay:** rgba(0,0,0,0.6)

**Contenedor:**
- **Ancho máximo:** 384px
- **Fondo:** Color card-bg
- **Bordes:** Redondeados 16px
- **Padding:** 20px

**Contenido:**
- **Título:** "Agregar Idioma" (18px, font-bold)
- **Idiomas comunes:**
  - Grid de botones: Aymara, Quechua, Inglés, Portugués, Francés, Italiano, Alemán
  - Cada botón: Padding 8px 12px, bordes redondeados 8px
  - Activo: Fondo acento claro, texto acento
  - Deshabilitado: Opacidad 50%, cursor not-allowed
- **Input personalizado:**
  - Placeholder: "Especificar idioma..."
  - Padding: 12px
  - Bordes: Redondeados 12px
- **Botones:**
  - Cancelar: Fondo terciario
  - Agregar: Fondo acento, texto blanco

---

### 6. MODAL DE CREAR CANCIONERO (AddHymnalModal.tsx)
**Descripción:** Formulario para crear nuevo cancionero

**Overlay:** rgba(0,0,0,0.6)

**Contenedor:**
- **Ancho máximo:** 512px
- **Alto máximo:** 90vh
- **Fondo:** Color card-bg
- **Bordes:** Redondeados 16px
- **Padding:** 24px
- **Scroll:** Vertical si excede altura

**Header:**
- **Título:** "Crear Nuevo Cancionero" (20px, font-bold)
- **Botón cerrar:** X, 20px, fondo terciario

**Formulario:**
1. **Nombre (requerido):**
   - Input text
   - Placeholder: "Ej: Cancionero de Alabanza"
   - Padding: 12px
   - Bordes: Redondeados 12px

2. **Descripción:**
   - Textarea: 2 rows
   - Placeholder: "Descripción breve del cancionero..."
   - Padding: 12px

3. **Idiomas:**
   - Grid de botones: 8 idiomas predefinidos
   - Cada botón: Padding 8px 12px
   - Seleccionado: Fondo acento, texto blanco, borde acento
   - No seleccionado: Fondo terciario, texto primario
   - Icono Check si está seleccionado

4. **Prefijo del Código:**
   - Input text, maxLength: 3
   - Placeholder: "Ej: HA, AL, M"
   - Auto-conversión a mayúsculas
   - Texto explicativo: "Se usará para identificar las canciones"

5. **Icono:**
   - Grid: 10 columnas, 30 iconos
   - Cada botón: 40x40px, redondeado 8px
   - Seleccionado: Fondo acento claro, borde acento
   - Iconos: 🎵🎶🎸🎹🥁🎺🎻🎤⛪🏔️🌿✍️📖🕊️⭐🌟🎼🎯❤️🔥🌊🌙☀️🌈🦋🌺🍀🏆💎🎭

6. **Color:**
   - Grid: 8 columnas, 16 colores
   - Cada botón: 40x40px, redondeado 12px
   - Seleccionado: Borde blanco 3px, sombra del color
   - Icono Check si está seleccionado
   - Colores: Púrpuras, azules, verdes, amarillos, rojos, rosas

7. **Imagen de Portada:**
   - **Con imagen:**
     - Preview: 64x64px, redondeado 8px
     - Botón "Eliminar imagen": Texto rojo, 12px
     - Botón "Cambiar": Fondo terciario, padding 8px 12px
   - **Sin imagen:**
     - Área punteada: Borde 2px dashed
     - Icono: Image, 24px
     - Texto: "Click para subir imagen"
     - Subtexto: "Se usará como fondo del cancionero"

8. **Botones de acción:**
   - Cancelar: Fondo terciario, ancho 50%
   - Crear Cancionero: Fondo acento, texto blanco, ancho 50%

---

### 7. MODAL DE EDITAR CANCIONERO (EditHymnalModal.tsx)
**Descripción:** Formulario para editar cancionero existente

**Diferencias con AddHymnalModal:**
- **Título:** "Editar Cancionero"
- **Vista previa interactiva:**
  - Tamaño: 100% ancho, 192px alto
  - **Con imagen:**
    - Imagen de fondo con object-cover
    - Gradiente oscuro inferior
    - Icono + nombre + info en parte inferior
    - Botones al hacer hover:
      - "Cambiar": Fondo negro 50%, icono Image
      - "Borrar": Fondo rojo 80%, icono X
    - En móvil: Botones siempre visibles
  - **Sin imagen:**
    - Fondo: Color seleccionado del cancionero
    - Icono centrado: 48px
    - Nombre: Blanco, font-bold, text-shadow
    - Botón "Agregar imagen": Fondo blanco 20%, padding 12px 24px
- **Actualización de prefijos:** Si cambia el prefijo, actualiza todos los códigos de canciones

---

### 8. VISTA DE CANCIONERO (HymnalView)
**Descripción:** Lista de canciones de un cancionero específico

**Header:**
- **Botón volver:** ChevronLeft, 20px, fondo terciario
- **Imagen/Icono del cancionero:**
  - Con imagen: 56x56px, redondeado 16px, object-cover
  - Sin imagen: 56x56px, fondo color 12.5% opacidad, icono 48px
- **Información:**
  - Nombre: 18px, font-bold
  - Cantidad + idiomas: 12px, texto muted
- **Botón agregar canción:** Plus, 18px, fondo acento, texto blanco
- **Botón modo selección:** CheckSquare/X, 18px
- **Botón menú:** MoreVertical, 18px, fondo terciario

**Modo Selección:**
- **Botón "Seleccionar todo/Deseleccionar":**
  - Fondo: Color acento si activo, terciario si inactivo
  - Texto: Blanco si activo, primario si inactivo
  - Padding: 8px 12px
  - Bordes: Redondeados 12px

**Menú de 3 puntos (⋮):**
- **Ancho:** 192px
- **Fondo:** Color card-bg
- **Bordes:** 1px solid border-color, redondeados 12px
- **Opciones:**
  1. Editar (Edit3 icon)
  2. Eliminar (Trash2 icon, texto rojo)
  3. Importar (Upload icon)
  4. Exportar (Download icon)
  5. Compartir (Share2 icon)

**Menú "Más opciones" (selección múltiple):**
- **Botón:** Texto "Más opciones" + ChevronDown
- **Fondo:** Color acento
- **Texto:** Blanco, 12px, font-semibold
- **Opciones:**
  1. Seleccionar todo / Deseleccionar todo
  2. Marcar favorito (Star icon)
  3. Copiar (Copy icon)
  4. Enviar (Share2 icon)
  5. Eliminar (Trash2 icon, texto rojo)
  6. Exportar (Download icon)

**Indicador de selección:**
- **Fondo:** Color acento claro
- **Borde:** 2px solid acento
- **Texto:** Color acento, 14px, font-semibold
- **Contenido:** "✓ X canciones seleccionadas" + "Modo selección activo"

**Lista de canciones:**
- **Cada canción:**
  - Padding: 12px
  - Bordes: Redondeados 12px
  - **Seleccionada:**
    - Fondo: Color acento claro
    - Borde: 2px solid acento
    - Sombra: card-shadow-md
  - **No seleccionada:**
    - Fondo: Color card-bg
    - Borde: 1px solid border-color
    - Sombra: card-shadow-sm
    - Hover: card-shadow-md + lift effect
  - **Checkbox** (modo selección):
    - Tamaño: 20x20px
    - Color: Púrpura cuando activo
  - **Contenido:**
    - Código: Fondo terciario, texto acento, font-mono, 12px
    - Título: 14px, font-medium
    - Info: 12px, texto muted (artista, tono, compás, BPM)
  - **Botón favorito** (no modo selección):
    - Star icon, 18px
    - Color dorado si activo, texto muted si inactivo

---

### 9. PÁGINA DE BÚSQUEDA (SearchPage)
**Descripción:** Búsqueda de canciones con filtros

**Header:**
- **Título:** "Buscar" (24px, font-bold)
- **Subtítulo:** "Busca por título, artista, código o letra" (14px, texto muted)

**Barra de búsqueda:**
- **Icono:** Search, 20px, texto muted
- **Input:**
  - Padding: 16px, padding-left: 48px
  - Placeholder: "Buscar canciones..."
  - Fondo: Color card-bg
  - Bordes: 1px solid border-color, redondeados 16px
  - Texto: 16px, font-medium
  - Sombra: card-shadow
- **Botón limpiar:** X, 16px, fondo terciario (si hay texto)

**Resultados:**
- **Contador:** "X resultados" (14px, font-semibold, texto muted)
- **Lista de canciones:**
  - Padding: 16px
  - Bordes: Redondeados 16px
  - Fondo: Color card-bg
  - Hover: Scale 101%
  - **Contenido:**
    - Código: Fondo acento claro, texto acento, font-bold, 12px
    - Título: 16px, font-bold
    - Info: 14px, texto muted
  - **Botón favorito:** Star, 20px

---

### 10. PÁGINA DE FAVORITOS (FavoritesPage)
**Descripción:** Lista de canciones marcadas como favoritas

**Header:**
- **Icono:** ⭐ (32px)
- **Título:** "Mis Favoritos" (18px, font-bold)
- **Contador:** "X canciones" (12px, texto muted)

**Lista de canciones:**
- **Mismo formato que HymnalView pero sin modo selección**
- **Botón favorito siempre visible** (color dorado)

**Estado vacío:**
- **Icono:** Music, 40px, texto muted
- **Texto:** "Aún no tienes favoritos" (14px, texto muted)
- **Padding:** 48px vertical

---

### 11. PÁGINA DE LISTAS (SetlistsPage)
**Descripción:** Gestión de listas de reproducción

**Header:**
- **Título:** "Listas" (24px, font-bold)
- **Subtítulo:** "Organiza tus canciones" (12px, texto muted)
- **Botón "Nueva":** Plus, 16px, fondo acento, texto blanco

**Grid de listas:**
- **Responsive:** 1-2 columnas
- **Gap:** 16px

**Tarjeta de lista:**
- **Padding:** 20px
- **Bordes:** Redondeados 16px
- **Fondo:** Color card-bg
- **Sombra:** card-shadow
- **Hover:** Scale 101%
- **Contenido:**
  - Nombre: 16px, font-bold
  - Cantidad: 12px, font-semibold, color acento
  - Preview de 3 canciones: 12px, texto muted
  - Footer: "Ver lista" + ArrowRight, 12px, font-bold, color acento
- **Botón eliminar:** Trash2, 16px, color rojo

**Estado vacío:**
- **Icono:** Music, 48px, opacidad 40%
- **Texto:** "No tienes listas" (16px, font-bold)

**Vista de lista detallada:**
- **Header:**
  - Botón volver: ChevronLeft, 20px
  - Nombre: 20px, font-bold
  - Cantidad: 12px, texto muted
- **Lista de canciones:**
  - Número de orden: 12px, font-bold, color acento
  - Título: 14px, font-semibold
  - Info: 12px, texto muted
  - Botón eliminar: Trash2, 16px, color rojo

**Modal de crear lista:**
- **Overlay:** rgba(0,0,0,0.6)
- **Contenedor:** 384px ancho, padding 20px
- **Título:** "Nueva Lista" (18px, font-bold)
- **Input:** Nombre de la lista
- **Botones:** Cancelar / Crear

---

### 12. PÁGINA DE ÓRDENES (OrdersPage)
**Descripción:** Gestión de órdenes de culto/reuniones

**Estructura similar a SetlistsPage pero con:**
- **Tipos de orden:** Culto, Reunión de Jóvenes, Ensayo, Especial
- **Fecha:** Formato YYYY-MM-DD
- **Items con tonalidad:** Cada canción muestra su tono

---

### 13. PÁGINA DE HERRAMIENTAS (ToolsPage)
**Descripción:** Herramientas musicales (Metrónomo, Afinador, Círculo de Quintas)

**Header:**
- **Título:** "Herramientas" (24px, font-bold)
- **Subtítulo:** "Metrónomo, afinador y teoría musical" (12px, texto muted)

**Tabs:**
- **3 pestañas:** Metrónomo, Afinador, Círculo
- **Activa:** Fondo card-bg, texto acento, sombra
- **Inactiva:** Fondo transparente, texto muted

**Contenedor:**
- **Bordes:** Redondeados 24px
- **Padding:** 16-24px
- **Fondo:** Color card-bg
- **Sombra:** card-shadow

#### METRÓNOMO
**Visualización BPM:**
- **Número:** 96px, font-bold, font-mono, color acento
- **Label:** "BPM" (14px, texto muted)

**Indicadores de beat:**
- **Cantidad:** Según compás (3-7)
- **Tamaño:** 16x16px
- **Forma:** Circular
- **Activo:** Color dorado, escala 150%, sombra dorada
- **Inactivo:** Color acento (primer beat) o terciario

**Slider de BPM:**
- **Rango:** 40-200
- **Color:** Púrpura
- **Ancho:** 100%

**Botones de ajuste:**
- **4 botones:** -5, -1, +1, +5
- **Tamaño:** 48x48px
- **Fondo:** Color terciario
- **Texto:** 18px, font-bold

**Botón play/pause:**
- **Tamaño:** 80x80px
- **Forma:** Circular
- **Play:** Fondo acento, sombra púrpura
- **Pause:** Fondo rojo, sombra roja
- **Icono:** 28px, blanco

**Tap Tempo:**
- **Botón:** "👆 Tap Tempo"
- **Fondo:** Color terciario
- **Padding:** 12px 24px
- **Texto:** 14px, font-medium
- **Subtexto:** "Presiona al ritmo para detectar el BPM"

**Selector de compás:**
- **5 botones:** 3/4, 4/4, 5/4, 6/8, 7/8
- **Tamaño:** 32x32px
- **Activo:** Fondo acento, texto blanco
- **Inactivo:** Fondo terciario, texto primario

#### AFINADOR
**Visualización de nota:**
- **Nota:** 64px, font-bold, color acento
- **Frecuencia:** 14px, texto muted
- **Animación:** Pulse cuando está sonando

**Grid de cuerdas:**
- **6 cuerdas:** Mi, La, Re, Sol, Si, Mi
- **Layout:** 2 columnas
- **Gap:** 12px

**Botón de cuerda:**
- **Padding:** 16px
- **Bordes:** Redondeados 12px
- **Fondo:** Color card-bg
- **Activo:** Fondo acento claro, borde acento
- **Contenido:**
  - Nota: 32px, font-bold
  - Info: "Cuerda Xª • Nombre" (12px, texto muted)
  - Frecuencia: "XX.XX Hz" (12px, font-mono, texto muted)

**Botón detener:**
- **Fondo:** Rojo `#ef4444`
- **Texto:** Blanco, 14px
- **Icono:** ⏹

#### CÍRCULO DE QUINTAS
**Visualización:**
- **Círculo central:** 96x96px, fondo acento, texto blanco
- **12 tonalidades:** Distribuidas en círculo
- **Botones:** 40x40px, circulares
- **Fondo:** Color terciario
- **Borde:** 2px solid border-color

**Grid de tonalidades:**
- **8 tonalidades:** 4 columnas
- **Botones:** Padding 8px, bordes redondeados 8px
- **Fondo:** Color terciario

---

### 14. MENÚ DE HERRAMIENTAS (ToolsMenu.tsx)
**Descripción:** Bottom sheet con opciones rápidas

**Overlay:** rgba(0,0,0,0.6)

**Contenedor:**
- **Ancho máximo:** 512px
- **Fondo:** Color card-bg
- **Bordes:** Redondeados 24px arriba
- **Padding:** 24px, padding-bottom 32px
- **Animación:** Slide-up

**Header:**
- **Título:** "Herramientas" (20px, font-bold)
- **Botón cerrar:** X, 20px, fondo terciario

**Opciones (4 botones):**
1. **Ver perfil:**
   - Icono: User, 24px, color acento
   - Fondo icono: Color acento claro
   - Título: "Ver perfil" (14px, font-semibold)
   - Descripción: "Información de tu cuenta" (12px, texto muted)

2. **Exportar:**
   - Icono: Download, 24px, color acento
   - Título: "Exportar"
   - Descripción: "Exportar canciones y datos"

3. **Importar:**
   - Icono: Upload, 24px, color acento
   - Título: "Importar"
   - Descripción: "Importar canciones desde archivos"

4. **Más herramientas:**
   - Icono: Wrench, 24px, color acento
   - Título: "Más herramientas"
   - Descripción: "Metrónomo, afinador y más"

**Estilo de botones:**
- **Padding:** 16px
- **Bordes:** Redondeados 12px
- **Fondo:** Color bg-secondary
- **Hover:** Scale 102%
- **Layout:** Flex con gap 16px

**Botón cancelar:**
- **Ancho completo**
- **Padding:** 12px
- **Fondo:** Color terciario
- **Texto:** 14px, font-bold
- **Margen superior:** 24px

---

### 15. MODAL DE EXPORTACIÓN (ExportModal.tsx)
**Descripción:** Selección de formato de exportación

**Overlay:** rgba(0,0,0,0.6)

**Contenedor:**
- **Ancho máximo:** 448px
- **Fondo:** Color card-bg
- **Bordes:** Redondeados 16px
- **Padding:** 24px
- **Espaciado:** 16px entre elementos

**Header:**
- **Título:** "Exportar canción/canciones" (18px, font-bold)
- **Botón cerrar:** X, 20px, fondo terciario
- **Contador:** "X canciones seleccionadas" (14px, texto muted)

**Opciones de exportación (5 botones):**
1. **Archivo de texto (.txt):**
   - Icono: FileText, 24px, color acento
   - Título: "📄 Archivo de texto (.txt)" (14px, font-semibold)
   - Descripción: "Letra con acordes en texto plano" (12px, texto muted)

2. **Archivo de Word (.docx):**
   - Icono: File, 24px, color acento
   - Título: "📝 Archivo de Word (.docx)"
   - Descripción: "Documento Word editable"

3. **Archivo PDF:**
   - Icono: FileDown, 24px, color acento
   - Título: "📕 Archivo PDF"
   - Descripción: "Documento PDF para imprimir"

4. **Documento JSON:**
   - Icono: FileJson, 24px, color acento
   - Título: "📦 Documento JSON"
   - Descripción: "Datos completos para reimportar"

5. **Captura de imagen:**
   - Icono: Image, 24px, color acento
   - Título: "🖼️ Captura de imagen"
   - Descripción: "Captura PNG de la canción" o "Solo disponible para una canción"
   - Disabled: Opacidad 40%, cursor not-allowed

**Estilo de botones:**
- **Padding:** 16px
- **Bordes:** 1px solid border-color, redondeados 12px
- **Fondo:** Color bg-secondary
- **Hover:** Scale 102%
- **Layout:** Flex con gap 12px

**Botón cancelar:**
- **Ancho completo**
- **Padding:** 12px
- **Fondo:** Color terciario
- **Texto:** 14px, font-bold

---

### 16. OPCIONES DE EXPORTACIÓN (ExportOptions.tsx)
**Descripción:** Selección de qué exportar

**Overlay:** rgba(0,0,0,0.6)

**Contenedor:**
- **Ancho máximo:** 512px
- **Fondo:** Color card-bg
- **Bordes:** Redondeados 24px arriba
- **Padding:** 24px, padding-bottom 32px
- **Animación:** Slide-up

**Header:**
- **Título:** "¿Qué quieres exportar?" (20px, font-bold)
- **Botón cerrar:** X, 20px, fondo terciario

**Opciones (3 botones):**
1. **Exportar una canción:**
   - Icono: Music, 24px, color acento
   - Título: "Exportar una canción"
   - Descripción: "Selecciona una canción específica"

2. **Selección múltiple:**
   - Icono: CheckSquare, 24px, color acento
   - Título: "Selección múltiple"
   - Descripción: "Exporta varias canciones a la vez"

3. **Exportar cancionero completo:**
   - Icono: BookOpen, 24px, color acento
   - Título: "Exportar cancionero completo"
   - Descripción: "Todas las canciones de un cancionero"

**Estilo de botones:** Igual que ExportModal

---

### 17. MODAL DE IMPORTACIÓN (ImportModal.tsx)
**Descripción:** Importar canciones desde archivos

**Overlay:** rgba(0,0,0,0.6)

**Contenedor:**
- **Ancho máximo:** 672px (max-w-2xl)
- **Alto máximo:** 90vh
- **Fondo:** Color card-bg
- **Bordes:** Redondeados 24px arriba
- **Padding:** 24px, padding-bottom 32px
- **Animación:** Slide-up
- **Scroll:** Vertical si excede altura

**Header:**
- **Título:** "Importar canciones" (20px, font-bold)
- **Botón cerrar:** X, 20px, fondo terciario

**Selector de cancionero:**
- **Label:** "Importar a cancionero" (12px, font-bold, uppercase)
- **Layout:** Flex con gap 8px
- **Select:**
  - Flex: 1
  - Padding: 12px
  - Bordes: Redondeados 12px
  - Fondo: Color bg-secondary
- **Botón "Nuevo":**
  - Icono: Plus, 16px
  - Texto: "Nuevo" (oculto en móvil)
  - Fondo: Color acento
  - Texto: Blanco
  - Padding: 12px 16px

**Selector de archivo:**
- **Label:** Cursor pointer
- **Input:** Hidden, accept=".txt,.docx,.pdf,.json,.jpg,.jpeg,.png"
- **Área de drop:**
  - Borde: 2px dashed border-color
  - Padding: 24px
  - Texto centrado
  - Icono: Upload, 32px, texto muted
  - Texto principal: "Haz clic para seleccionar un archivo" (14px, font-medium)
  - Texto secundario: "Formatos: TXT, Word, PDF, JSON, Imagen (JPG/PNG)" (12px, texto muted)
  - Texto ayuda: "💡 Separa canciones con ===== o -----" (12px, texto muted)

**Estado de procesamiento:**
- **Spinner:** 32x32px, borde púrpura, animación spin
- **Texto:** "Procesando archivo..." (14px, texto muted)

**Error:**
- **Fondo:** rgba(239, 68, 68, 0.1)
- **Borde:** 1px solid rgba(239, 68, 68, 0.3)
- **Texto:** Color rojo, 14px

**Previews de canciones:**
- **Header:**
  - Título: "X canciones detectadas" (14px, font-bold)
  - Botón "Cambiar archivo": Fondo terciario, texto muted, 12px
- **Cada canción:**
  - Padding: 16px
  - Bordes: Redondeados 12px
  - Fondo: Color bg-secondary
  - **Modo preview:**
    - Badge: "#X" (fondo acento, texto blanco, 12px)
    - Título: 18px, font-bold
    - Artista: 14px, texto muted
    - Info: "Tono: X | Compás: X/X | BPM: X" (12px, texto muted)
    - Badge de idioma bilingüe: Fondo acento claro, texto acento
    - Preview de letra: 10px, font-mono, max-height 80px, scroll
  - **Modo edición:**
    - Badge: "Editando #X" (fondo acento, texto blanco)
    - Botón "Cancelar": Fondo terciario, 12px
    - Inputs: Título, Artista, Tono, Letra (textarea 8 rows)
    - Indicador bilingüe si aplica
  - **Botones de acción:**
    - Editar: Edit3, 14px, fondo terciario
    - Eliminar: Trash2, 14px, color rojo, fondo terciario

**Botón importar:**
- **Ancho completo**
- **Padding:** 12px
- **Fondo:** Color acento
- **Texto:** Blanco, 14px, font-bold
- **Icono:** Check, 16px
- **Texto:** "Importar X canción/es"

**Botón cancelar:**
- **Ancho completo**
- **Padding:** 12px
- **Fondo:** Color terciario
- **Texto:** 14px, font-bold
- **Margen superior:** 16px

---

### 18. SELECTOR DE IMAGEN (ImageCropper.tsx)
**Descripción:** Herramienta para recortar imágenes antes de OCR

**Overlay:** rgba(0,0,0,0.8)

**Contenedor:**
- **Ancho máximo:** 896px (max-w-4xl)
- **Fondo:** Color card-bg
- **Bordes:** Redondeados 16px
- **Padding:** 24px
- **Espaciado:** 16px entre elementos

**Header:**
- **Título:** "Seleccionar área de escaneo" (20px, font-bold)
- **Icono:** Crop, 24px, color acento
- **Botón cerrar:** X, 20px, fondo terciario

**Instrucciones:**
- **Texto:** "Dibuja un rectángulo sobre el área que contiene la letra de la canción" (14px, texto muted)

**Área de imagen:**
- **Contenedor:**
  - Borde: 2px solid border-color
  - Bordes: Redondeados 8px
  - Overflow: Hidden
  - Cursor: Crosshair
  - Max-height: 500px
  - Touch-action: none
  - User-select: none
- **Imagen:**
  - Ancho: 100%
  - Max-height: 500px
  - Object-fit: contain
  - Pointer-events: none
  - Draggable: false

**Rectángulo de selección:**
- **Posición:** Absolute
- **Borde:** 2px solid acento
- **Fondo:** Púrpura 20% opacidad
- **Pointer-events:** none
- **4 esquinas:** 8x8px, fondo púrpura

**Canvas oculto:** Para procesamiento de imagen

**Botones de acción:**
- **Layout:** Flex con gap 12px
- **Cancelar:**
  - Ancho: 50%
  - Padding: 12px
  - Fondo: Color terciario
  - Texto: 14px, font-bold
- **Procesar y extraer letra:**
  - Ancho: 50%
  - Padding: 12px
  - Fondo: Color acento
  - Texto: Blanco, 14px, font-bold
  - Icono: Check, 18px
  - Disabled: Opacidad 50%, cursor not-allowed (si área < 10px)

---

### 19. PÁGINA DE PERFIL (ProfilePage.tsx)
**Descripción:** Gestión de perfil de usuario

**Header:**
- **Layout:** Flex, justify-between
- **Izquierda:**
  - Botón volver: ChevronLeft, 20px, fondo terciario
  - Título: "Mi Perfil" (20px, font-bold)
- **Derecha:**
  - Botón "Iniciar sesión":
    - Icono: User, 14px
    - Texto: "Iniciar sesión" (12px, font-bold)
    - Fondo: Color acento
    - Texto: Blanco
    - Padding: 8px 12px
    - Bordes: Redondeados 12px

**Tarjeta de perfil editable:**
- **Padding:** 24px
- **Bordes:** Redondeados 16px
- **Fondo:** Color card-bg
- **Sombra:** card-shadow-md
- **Borde:** 1px solid border-color
- **Margen inferior:** 24px

**Sección de foto:**
- **Layout:** Flex con gap 16px
- **Avatar:**
  - Tamaño: 80x80px
  - Forma: Circular
  - Overflow: Hidden
  - Fondo: Color acento claro
  - Imagen: Object-cover si existe
  - Icono: User, 40px, color acento si no hay imagen
- **Botón cámara:**
  - Posición: Absolute, bottom-right
  - Tamaño: 24x24px (padding 6px)
  - Forma: Circular
  - Fondo: Color acento
  - Icono: Camera, 14px, blanco
- **Botón "Cambiar foto":**
  - Texto: Color acento, 12px, font-semibold

**Campos editables:**
1. **Nombre (requerido):**
   - Label: "Nombre *" (12px, font-bold, uppercase)
   - Input: Max-length 50, padding 12px
   - Placeholder: "Tu nombre"

2. **Correo electrónico:**
   - Label: Icono Mail + "Correo electrónico"
   - Input: Type email, padding 12px
   - Placeholder: "tu@email.com"
   - Nota: Icono Lock + "Se usará para sincronización futura" (12px, texto muted)

3. **Número de teléfono:**
   - Label: Icono Phone + "Número de teléfono (opcional)"
   - Input: Type tel, padding 12px
   - Placeholder: "+1 234 567 8900"
   - Nota: Icono Lock + "Se usará para sincronización futura"

4. **Miembro desde:**
   - Layout: Flex con gap 12px
   - Icono: Calendar, 18px, texto muted
   - Label: "Miembro desde" (12px, texto muted)
   - Valor: Fecha formateada (14px, font-medium)

**Botones de acción:**
- **Layout:** Flex con gap 12px
- **Margen superior:** 24px
- **Cancelar:**
  - Ancho: 50%
  - Padding: 12px
  - Fondo: Color terciario
  - Texto: 14px, font-bold
- **Guardar cambios:**
  - Ancho: 50%
  - Padding: 12px
  - Fondo: Color acento
  - Texto: Blanco, 14px, font-bold

**Tarjeta de estadísticas:**
- **Padding:** 24px
- **Bordes:** Redondeados 16px
- **Fondo:** Color card-bg
- **Sombra:** card-shadow-md
- **Margen inferior:** 24px

**Header:**
- **Título:** "Mis Estadísticas" (18px, font-bold)
- **Margen inferior:** 16px

**Grid de estadísticas:**
- **Layout:** 2 columnas
- **Gap:** 16px

**Cada estadística:**
- **Padding:** 16px
- **Bordes:** Redondeados 12px
- **Fondo:** Color bg-secondary
- **Texto centrado**
- **Icono:** 24px, color acento/dorado
- **Valor:** 32px, font-bold
- **Label:** 12px, texto muted

**4 estadísticas:**
1. **Canciones:** Icono Music, color acento
2. **Favoritos:** Icono Star, color dorado
3. **Cancioneros:** Icono Music, color acento
4. **Listas:** Icono ListMusic, color acento

**Tarjeta de información:**
- **Padding:** 24px
- **Bordes:** Redondeados 16px
- **Fondo:** Color card-bg
- **Sombra:** card-shadow-md

**Header:**
- **Título:** "Acerca de Cancionero7Pro" (18px, font-bold)
- **Margen inferior:** 16px

**Información:**
- **Espaciado:** 8px entre elementos
- **Texto:** 14px, texto muted
- **Contenido:**
  - Versión: "1.0 Premium"
  - Desarrollado por: "Cancionero7Pro Team"
  - Descripción: "Gestión profesional de letras y acordes para músicos y cantantes"
  - Copyright: "© 2026 Cancionero7Pro. Todos los derechos reservados." (12px)

---

### 20. MODAL DE LOGIN (LoginModal.tsx)
**Descripción:** Modal informativo sobre sincronización en la nube

**Overlay:** rgba(0,0,0,0.6)

**Contenedor:**
- **Ancho máximo:** 448px
- **Fondo:** Color card-bg
- **Bordes:** Redondeados 16px
- **Padding:** 24px
- **Espaciado:** 16px entre elementos

**Header:**
- **Título:** "Sincronización en la nube" (18px, font-bold)
- **Botón cerrar:** X, 20px, fondo terciario

**Contenido central:**
- **Padding:** 16px vertical
- **Texto centrado**

**Icono de Google:**
- **Tamaño:** 64x64px
- **Forma:** Circular
- **Fondo:** Color acento claro
- **SVG:** Logo de Google con 4 colores

**Texto principal:**
- **Tamaño:** 14px
- **Color:** Texto primario
- **Margen inferior:** 16px
- **Contenido:** "Próximamente podrás iniciar sesión con tu cuenta de Google para sincronizar tus canciones entre dispositivos y nunca perder tu biblioteca."

**Nota informativa:**
- **Padding:** 12px
- **Bordes:** Redondeados 12px
- **Fondo:** Color acento claro
- **Texto:** Color acento, 12px
- **Contenido:** "💡 Mientras tanto, tu perfil se guarda localmente en tu dispositivo"

**Botón "Entendido":**
- **Ancho completo**
- **Padding:** 12px
- **Fondo:** Color acento
- **Texto:** Blanco, 14px, font-bold

---

### 21. SELECTOR DE CANCIÓN (SongSelectorModal.tsx)
**Descripción:** Seleccionar una canción para exportar

**Overlay:** rgba(0,0,0,0.6)

**Contenedor:**
- **Ancho máximo:** 512px
- **Alto máximo:** 90vh
- **Fondo:** Color card-bg
- **Bordes:** Redondeados 24px arriba
- **Padding:** 24px, padding-bottom 32px
- **Animación:** Slide-up
- **Scroll:** Vertical si excede altura

**Header:**
- **Layout:** Flex con gap 12px
- **Botón volver:** ChevronLeft, 20px, fondo terciario
- **Título:** "Seleccionar canción" (20px, font-bold)

**Barra de búsqueda:**
- **Icono:** Search, 18px, texto muted
- **Input:**
  - Padding: 12px, padding-left: 40px
  - Placeholder: "Buscar canción..."
  - Fondo: Color bg-secondary
  - Bordes: Redondeados 12px
  - Texto: 14px

**Lista de canciones:**
- **Espaciado:** 8px entre elementos
- **Cada canción:**
  - **Botón:**
    - Ancho completo
    - Padding: 12px
    - Bordes: Redondeados 12px
    - Fondo: Color bg-secondary
    - Texto: Izquierda
    - Hover: Scale 102%
  - **Contenido:**
    - Título: 14px, font-semibold
    - Artista: 12px, texto muted

**Estado vacío:**
- **Padding:** 32px vertical
- **Texto centrado:** "No se encontraron canciones" (14px, texto muted)

---

### 22. SELECTOR MÚLTIPLE (MultiSongSelector.tsx)
**Descripción:** Seleccionar múltiples canciones para exportar

**Overlay:** rgba(0,0,0,0.6)

**Contenedor:**
- **Ancho máximo:** 512px
- **Alto máximo:** 90vh
- **Fondo:** Color card-bg
- **Bordes:** Redondeados 24px arriba
- **Padding:** 24px, padding-bottom 32px
- **Animación:** Slide-up
- **Scroll:** Vertical si excede altura

**Header:**
- **Layout:** Flex con gap 12px
- **Botón volver:** ChevronLeft, 20px, fondo terciario
- **Título:** "Seleccionar canciones" (20px, font-bold, flex-1)
- **Botón "Seleccionar todo/Deseleccionar":**
  - Padding: 6px 12px
  - Bordes: Redondeados 8px
  - Fondo: Color acento
  - Texto: Blanco, 12px, font-bold

**Barra de búsqueda:** Igual que SongSelectorModal

**Lista de canciones:**
- **Espaciado:** 8px entre elementos
- **Margen inferior:** 16px
- **Cada canción:**
  - **Botón:**
    - Ancho completo
    - Padding: 12px
    - Bordes: Redondeados 12px
    - Layout: Flex con gap 12px
    - **Seleccionada:**
      - Borde: 1px solid acento
      - Fondo: Color acento claro
    - **No seleccionada:**
      - Borde: 1px solid border-color
      - Fondo: Color bg-secondary
  - **Checkbox:**
    - Seleccionado: CheckSquare, 20px, color acento
    - No seleccionado: Square, 20px, texto muted
  - **Contenido:**
    - Título: 14px, font-semibold
    - Artista: 12px, texto muted

**Botón exportar:**
- **Ancho completo**
- **Padding:** 12px
- **Fondo:** Color acento
- **Texto:** Blanco, 14px, font-bold
- **Texto:** "Exportar X canción/es"
- **Visible:** Solo si hay canciones seleccionadas

---

### 23. SELECTOR DE CANCIONERO (HymnalSelector.tsx)
**Descripción:** Seleccionar un cancionero para exportar

**Overlay:** rgba(0,0,0,0.6)

**Contenedor:**
- **Ancho máximo:** 512px
- **Alto máximo:** 90vh
- **Fondo:** Color card-bg
- **Bordes:** Redondeados 24px arriba
- **Padding:** 24px, padding-bottom 32px
- **Animación:** Slide-up
- **Scroll:** Vertical si excede altura

**Header:**
- **Layout:** Flex con gap 12px
- **Botón volver:** ChevronLeft, 20px, fondo terciario
- **Título:** "Seleccionar cancionero" (20px, font-bold)

**Lista de cancioneros:**
- **Espaciado:** 8px entre elementos
- **Cada cancionero:**
  - **Botón:**
    - Ancho completo
    - Padding: 16px
    - Bordes: Redondeados 12px
    - Fondo: Color bg-secondary
    - Layout: Flex con gap 12px
    - Hover: Scale 102%
  - **Icono:** 48px
  - **Contenido:**
    - Nombre: 14px, font-semibold
    - Cantidad: "X canción/es" (12px, texto muted)

**Estado vacío:**
- **Padding:** 32px vertical
- **Texto centrado:** "No hay cancioneros disponibles" (14px, texto muted)

---

### 24. PROVEEDOR DE NOTIFICACIONES (NotificationProvider.tsx)
**Descripción:** Sistema de notificaciones toast

**Contenedor de notificaciones:**
- **Posición:** Fixed, top-right
- **Top:** 16px
- **Right:** 16px
- **Z-index:** 200
- **Layout:** Flex, column, gap 8px

**Cada notificación:**
- **Padding:** 12px 16px
- **Bordes:** Redondeados 8px
- **Sombra:** shadow-lg
- **Texto:** Blanco, font-medium
- **Animación:** Fade-in
- **Duración:** 3 segundos antes de desaparecer

**Colores por tipo:**
- **Success:** Verde `#22c55e` (bg-green-500)
- **Error:** Rojo `#ef4444` (bg-red-500)
- **Info:** Azul `#3b82f6` (bg-blue-500)

---

## 🎵 DATOS INICIALES

### Cancionero por Defecto
**ID:** `mis-canciones`
**Nombre:** "Mis Canciones"
**Descripción:** "Creaciones personales"
**Idioma:** "Castellano"
**Icono:** 📖
**Color:** `#f97316` (naranja)
**Prefijo:** "M"

### Canciones Iniciales

**1. Renuévame**
- **Código:** M1
- **Artista:** Marcos Witt
- **Tono:** D
- **Compás:** 4/4
- **BPM:** 68
- **Idioma:** Castellano
- **Categorías:** Adoración
- **Letra:** Verso 1 + Coro con acordes

**2. Jach'a Apu Dios**
- **Código:** M2
- **Artista:** Tradicional Andina
- **Tono:** Am
- **Compás:** 4/4
- **BPM:** 80
- **Idioma:** Castellano/Aymara
- **Categorías:** Himno, Bilingüe
- **Letra bilingüe:**
  - Castellano: Verso 1 + Coro
  - Aymara: Verso 1 + Coro

---

## 📱 RESPONSIVE DESIGN

### Breakpoints
- **Móvil:** < 640px
- **Tablet:** 640px - 1024px
- **Desktop:** > 1024px

### Adaptaciones
- **Grid de cancioneros:**
  - Móvil: 2 columnas
  - Tablet: 3 columnas
  - Desktop: 4-5 columnas
- **Tamaños de texto:**
  - Móvil: text-sm (14px)
  - Desktop: text-lg (18px)
- **Padding:**
  - Móvil: p-3 (12px)
  - Desktop: p-5 (20px)
- **Botones:**
  - Móvil: Iconos más pequeños, texto oculto
  - Desktop: Iconos + texto visible

---

## 🎨 ANIMACIONES

### Definidas en CSS
1. **fadeIn:**
   - From: opacity 0, translateY 10px
   - To: opacity 1, translateY 0
   - Duración: 0.3s ease-out

2. **spinOnce:**
   - From: rotate 0deg
   - To: rotate 360deg
   - Duración: 1s linear
   - Iteraciones: 1

3. **slideUp:**
   - From: translateY 100%, opacity 0
   - To: translateY 0, opacity 1
   - Duración: 0.3s ease-out

### Transiciones
- **Background-color:** 0.2s ease
- **Border-color:** 0.2s ease
- **Transform:** 0.2s ease
- **Box-shadow:** 0.2s ease

---

## 🔧 FUNCIONALIDADES TÉCNICAS

### LocalStorage
- **cancionero-ruah-state:** Estado completo de la app
- **userProfile:** Datos del perfil de usuario
- **song-notes-{id}:** Notas personales por canción

### Protección contra traducción
- **HTML:** `lang="es" translate="no"`
- **Meta tag:** `name="google" content="notranslate"`
- **Elementos musicales:** `translate="no"` en notas, acordes, BPM

### Validaciones
- **Email:** Regex estándar
- **Teléfono:** Solo números, +, -, espacios, paréntesis
- **Nombre:** Mínimo 2 caracteres
- **Imagen:** Máximo 5MB

### Formatos de exportación
- **TXT:** Texto plano con acordes
- **JSON:** Datos completos estructurados
- **Word (.docx):** Documento editable con formato
- **PDF:** Documento para imprimir
- **Imagen (PNG):** Captura de la vista actual

### Formatos de importación
- **TXT:** Texto plano
- **Word (.docx):** Extracción con mammoth
- **PDF:** Extracción con pdfjs-dist
- **JSON:** Datos estructurados
- **Imagen (JPG/PNG):** OCR con tesseract.js

---

## 📊 ESTADÍSTICAS DEL PROYECTO

### Archivos
- **Componentes:** 18 archivos
- **Utilidades:** 4 archivos
- **Tipos:** 1 archivo
- **Datos:** 1 archivo
- **Estilos:** 1 archivo
- **Total:** 25 archivos TypeScript/TSX

### Tamaño del Build
- **Total:** 2,090.11 kB
- **Gzipped:** 618.76 kB
- **Módulos:** 1990

### Dependencias Principales
- **React:** Framework UI
- **TypeScript:** Tipado estático
- **Tailwind CSS:** Estilos
- **Lucide React:** Iconos
- **Mammoth:** Extracción de Word
- **PDF.js:** Extracción de PDF
- **Tesseract.js:** OCR
- **docx:** Generación de Word
- **jsPDF:** Generación de PDF
- **html2canvas:** Captura de imagen
- **file-saver:** Descarga de archivos

---

## ✅ RESUMEN DE FUNCIONALIDADES

### Gestión de Canciones
- ✅ Visualización con acordes sobre la letra
- ✅ Transposición de tonos (mayores y menores)
- ✅ Configuración de tamaño de letra (14-40px)
- ✅ Mostrar/ocultar acordes
- ✅ Capo de guitarra
- ✅ Auto-scroll con control de velocidad (1-70)
- ✅ Notas personales (3 botones)
- ✅ Soporte multi-idioma
- ✅ Navegación por secciones

### Gestión de Cancioneros
- ✅ Crear cancioneros personalizados
- ✅ Editar cancioneros
- ✅ Eliminar cancioneros
- ✅ Imagen de portada
- ✅ Validación de prefijos únicos

### Sistema de Importación
- ✅ Importar desde TXT
- ✅ Importar desde Word (.docx)
- ✅ Importar desde PDF
- ✅ Importar desde JSON
- ✅ Importar desde imagen (OCR)
- ✅ Detección automática de múltiples canciones
- ✅ Detección de canciones bilingües
- ✅ Editor previo antes de importar
- ✅ Selector de área para OCR

### Sistema de Exportación
- ✅ Exportar como TXT
- ✅ Exportar como Word (.docx)
- ✅ Exportar como PDF
- ✅ Exportar como JSON
- ✅ Exportar como imagen (PNG)
- ✅ Exportar canciones individuales
- ✅ Exportar selección múltiple
- ✅ Exportar cancioneros completos

### Sistema de Perfiles
- ✅ Perfil de usuario editable
- ✅ Foto de perfil (base64)
- ✅ Nombre, email, teléfono
- ✅ Estadísticas personales
- ✅ Modal de login (próximamente)

### Herramientas
- ✅ Metrónomo con Tap Tempo
- ✅ Afinador de referencia para guitarra
- ✅ Círculo de quintas

### Sistema de Listas y Órdenes
- ✅ Listas de reproducción (Setlists)
- ✅ Órdenes de culto
- ✅ Agregar/quitar canciones
- ✅ Reordenar elementos

### Sistema de Favoritos
- ✅ Marcar/desmarcar canciones favoritas
- ✅ Vista de favoritos

### Búsqueda Avanzada
- ✅ Buscar por título, artista, código o letra
- ✅ Resultados en tiempo real

### Selección Múltiple
- ✅ Modo de selección con checkboxes
- ✅ Seleccionar/deseleccionar todo
- ✅ Acciones múltiples (favoritos, copiar, enviar, eliminar, exportar)

### Temas
- ✅ Modo claro/oscuro
- ✅ Persistencia en localStorage

### Protección contra Traducción
- ✅ Atributo `translate="no"` en elementos musicales
- ✅ Meta tag para Google Translate
- ✅ Idioma configurado a español

---

**Fin del Informe**
