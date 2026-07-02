# DinoColor — STATUS

> Estado del proyecto. Actualizar al cerrar cada iteración.

**Versión:** 0.1.0 — MVP pulido (revisión multi-agente)
**Fecha:** 2026-06-30
**Stack:** React 18 + Vite 5 + Three.js + @react-three/fiber (JavaScript/JSX)

## ✅ Implementado (MVP)

- **StartScene usa el modelo "Oliver"** (T-Rexo azul de alta calidad, texturas PBR) copiado desde
  TREXoRoll a `assets/models/characters/oliver/` (fuente) y `public/assets/.../oliver/` (runtime).
  `DinoMascot.jsx` es ahora multi-modelo con carga por prioridad (optimizada para móvil):
  **`oliver_character.glb` (~23 MB, principal temporal)** → **`oliver_master.glb` (~44 MB, fallback de
  mayor calidad)** → `dino_color_mascot.glb` → placeholder SVG. Animación `idle`. El texto de la
  mascota sigue diciendo "Hola, soy T-Rexo". ⚠️ Ambos GLB siguen siendo pesados; **próxima mejora:
  optimizar a < 5 MB** (Draco/KTX2).
  **Encuadre del héroe corregido (2026-07-02):** la cabeza se cortaba/quedaba bajo el globo porque
  el modelo llenaba ~93% del frame; se pasa por props sólo a esa instancia `size={256}`,
  `targetHeight={1.15}` y `baseY={-0.58}` (+ `gap:16px` en `.mascot--hero`), sin tocar la
  normalización por bounding-box del componente. Ahora se ve completo, centrado y con aire.
- **ResultScene usa Oliver/T-Rexo (2026-07-02):** antes mostraba el dino anterior (faltaba
  `model="oliver"`, caía al default `trexo`). Ahora `model="oliver"` (character→master→dino→SVG),
  `size={172}` + mismo encuadre `targetHeight={1.15}`/`baseY={-0.58}` (clase `.mascot--result`).
  Animaciones por prioridad: **victoria** `Shake_It_Off_Dance→Jump_with_Arms_Open→Big_Wave_Hello→
  Idle_02`; **derrota** `Alert→Idle_03→Idle_02`. `resolveClip` acepta ahora lista de prioridad
  (con `character.glb` de 1 clip cae a ella de forma segura; la prioridad aplica con `master`).
- Estructura de proyecto completa tipo TREXoRoll (carpetas + documentación).
- Configuración: Vite (`base: './'`), `index.html`, `manifest.webmanifest`,
  `capacitor.config.json`, `.gitignore`, `.nojekyll`, `LICENSE`.
- **Pantallas:** inicio, menú (con selector de niveles y récord), juego, resultado.
- **Tablero 3D** flotante sobre base de piedra; auto-escalado a la forma del nivel.
- **Pelotas 3D** grises con material brillante; activación con glow, pulso y luz puntual.
- **Interacción** táctil/click sobre las pelotas (R3F pointer events).
- **Bucle de juego** (`useGameLoop`): iluminación/expiración de pelotas, relleno a
  `activeBalls`, detección de victoria/derrota.
- **Timer** visible con barra (`useTimer`).
- **Puntuación**: aciertos rápidos/normales, penalizaciones, **combos** con multiplicador.
- **HUD**: nivel, tiempo, puntuación/meta, combo, aciertos, fallos + popups y destellos.
- **Niveles progresivos** (12 niveles) en `src/data/levels.js`.
- **Formas de tablero**: `square3x3`, `cross`, `diamond` (+ 4 extra listas para usar).
- **Guardado local**: nivel máximo, mejor puntuación, preferencia de sonido.
- **Audio** básico **sintetizado** (Web Audio): acierto, combo, fallo, victoria, derrota,
  click. Funciona sin archivos; rutas para audio real documentadas.
- **Mascota** placeholder (SVG animado) con bocadillos, en inicio y resultados.
- **Modelo 3D real de la mascota (v3, alineado al concepto)** listo: `dino_color_mascot.glb`
  (~495 KB, ~8.83k tris, rig de 28 huesos, 8 animaciones: idle/wave/talk/celebrate/sad/point/
  surprised/dance). v3: silueta clara de T-Rex bebé chibi — hocico definido, boca abierta con
  dientes (sup./inf.) + lengua, ojos grandes con brillo, fila de placas naranja cabeza→lomo→cola,
  barriga clara, brazos cortos y piernas grandes con garras, cola. Cuerpo por metaballs + detalles
  separados; re-skinning por proximidad. Rig y animaciones conservados (v2 respaldado en
  `*_v2_backup.blend`). Generador en `tools/build_trexo.py`. +
  componente `DinoMascot.jsx` (solo three + R3F, misma API que el placeholder + `state`).
  **Integrado** en `StartScene` (animación `wave`) y `ResultScene` (`dance` al ganar,
  `sad` al perder). Robusto: fallback a `idle` si falta una animación y al placeholder SVG
  si el GLB no carga. Servido por Vite desde `public/assets/models/characters/dino-mascot/`
  vía `import.meta.env.BASE_URL` (compatible con `base: './'`).
- Diseño **mobile-first** responsive (marco de teléfono en escritorio, safe areas, sin scroll).

## 🔧 Iteración de pulido visual/UX (2026-06-30)

Revisión multi-agente (Orquestador · Product Owner · Videojuegos/Visual · Rubí/Texto · QA técnico)
y 3 ciclos de mejora. Sin cambios de mecánica ni de arquitectura, sin dependencias nuevas.

**Layout / jugabilidad (crítico)**
- `Board3D.jsx`: el ajuste a pantalla se calcula con la **extensión real de la plataforma + filo**
  (no solo las pelotas) → la plataforma ya no se pega ni se recorta en los bordes; el tablero baja
  ~5 % del alto para despejar el HUD superior. `MAX_SCALE` 1.12→1.05, `FIT_H` 0.6→0.66.
- `game.css`: HUD más compacto; **scrims** 34 %/20 %→24 %/16 % y más suaves (no oscurecen la fila
  superior de pelotas); **popup "¡FALLO!"** 2.6→1.95 rem y top 40 %→27 % (no tapa el tablero).
- `StartScene.jsx`: pista corregida a «Toca las pelotas que se iluminan **antes de que se apaguen**.»
  (antes decía "de verde", incorrecto porque el color cambia por nivel).
- `useGameLoop.js`: `layout` memoizado → el tablero no reconstruye su geometría en cada tick.

**Visual**
- `Background3D.jsx`: **bug corregido** — la `<fog>` estaba dentro de un `<group>` y no se aplicaba;
  ahora es hija directa de la escena. Helechos 5→3, más claros y al fondo; gradiente del telón
  menos apagado; menos luces decorativas (lectura más limpia + menos coste en gama baja).
- `Ball3D.jsx`: pelota activa más **nítida y contenida** (aro ceñido, glow/luz puntual reducidos),
  esfera con acabado un punto más pulido.
- `GameHUD.jsx` + `game.css`: etiqueta «META» → **«🎯 Objetivo»**.
- `DinoMascot.jsx` + `game.css`: T-Rexo con más volumen (iluminación clave/relleno/contraluz) y
  "escenario" de luz enriquecido (glow cálido + sombra de contacto).

**Pulido / técnico**
- `game.css`: botón "volver" integrado como un chip más del HUD.
- `useTimer.js`: pausa "justa" en segundo plano (no descuenta el tiempo con la app oculta).

**Validaciones**: `npm run dev` arranca limpio (módulos servidos 200, GLB servido) y `npm run build`
**verde** (~2.4 s). Revisión adversarial de regresiones: sin bugs introducidos.

## ⏳ Pendiente

- Pulido visual: partículas al acertar, mejores materiales/post-procesado.
- Mascota 3D como guía en la pantalla de juego (`GameScene`) — pendiente, evaluar
  rendimiento antes de añadir un segundo Canvas durante la partida.
- Más formas de tablero en niveles avanzados y nuevos modos.
- Pantalla de ajustes (volumen, reiniciar progreso, idioma).
- Tests automáticos (lógica de scoring y layouts).
- Integración Capacitor/Android y despliegue GitHub Pages (requiere confirmación).

## 🐛 Errores conocidos

- **Corregido (2026-06-30):** la niebla de profundidad no se aplicaba (estaba dentro de un
  `<group>`); ahora funciona. Plataforma recortada/pegada a bordes; HUD tapando la fila superior;
  popup "¡FALLO!" invasivo — todos corregidos.
- Ninguno bloqueante registrado. Verificación pendiente en dispositivos reales
  (rendimiento del glow/luces en gama baja; en niveles con 4 pelotas activas hay hasta ~4 luces
  puntuales dinámicas, considerar limitar a 2 si el FPS sufre).
- En `React.StrictMode` (solo dev) los efectos se montan dos veces; el bucle está
  protegido con flags, pero conviene revisar si se añade lógica con efectos secundarios.

## ▶️ Próximo paso

1. **Prueba manual / visual en dispositivo real** (iPhone SE, Android gama media): encuadre del
   tablero en 19.5:9–20:9, tamaño del modelo de T-Rexo (el encuadre de cámara del modelo se dejó
   intacto a propósito; afinarlo requiere ver el render) y sensación de control.
2. Ajuste fino de tiempos/metas en `src/data/levels.js` con playtesting (curva niveles 8–12).
3. Medir FPS en gama baja y, si hace falta, limitar luces puntuales simultáneas a 2.
