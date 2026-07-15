# DinoColor — STATUS

> Estado del proyecto. Actualizar al cerrar cada iteración.

**Versión:** 0.2.0 — Revisión integral (bugs · UX · visual · rendimiento)
**Fecha:** 2026-07-13
**Stack:** React 18 + Vite 5 + Three.js + @react-three/fiber (JavaScript/JSX)

---

## 🔎 Revisión integral 2026-07-13

Revisión pantalla por pantalla con corrección de bugs, mejoras de UX/visuales y optimización.
Sin dependencias nuevas, sin TypeScript, sin cambios de mecánica, scoring ni niveles.
Todo validado en un navegador real (Chromium + WebGL) jugando partidas completas.

### 🚨 Los tres hallazgos gordos

**1. El juego descargaba 66 MB de modelos 3D… y la animación de victoria no existía.**
`StartScene`/`ResultScene` cargaban `oliver_character.glb` (22 MB) y `MiniDinoWalker` cargaba
`oliver_master.glb` (44 MB). Pero `oliver_character.glb` **solo tiene 1 clip**
(`Armature|clip0|baselayer`): la prioridad de animaciones de la victoria
(`Shake_It_Off_Dance → Jump_with_Arms_Open → …`) apuntaba a clips de *master*, así que caía
siempre al único clip disponible. **Ganar y perder se veían exactamente igual.**

Ahora la mascota es **T-Rexo (`dino_color_mascot.glb`, 0,9 MB)** en las tres pantallas:
es el modelo oficial del juego, pesa 70 veces menos y sus clips se llaman como los estados que
el código ya esperaba. **Descarga de GLB: 66 MB → 0,9 MB. `dist/`: 69 MB → 2,0 MB.**
El registro `oliver` sigue en `DinoMascot.jsx` (skin premium) pero ninguna escena lo pide, así
que no se descarga nunca. Sus GLB fuente siguen intactos en `assets/`.

**2. ⚠️ Los clips expresivos del GLB de T-Rexo ROMPEN la malla — solo `idle` es usable.**
Al reproducir `wave`, la placa del vientre y la boca **se despegan del cuerpo y flotan**; con
`celebrate` el vientre se desgarra; con `sad` la cabeza colapsa en una bola sin cara.
Comprobado renderizando cada clip.

No es un bug del código: el GLB está bien formado (las 14 primitivas tienen `JOINTS_0`/`WEIGHTS_0`,
ningún vértice sin peso, y las traslaciones solo mueven el hueso raíz `hips`, como debe ser). El
fallo está en los **pesos de skinning**: hay vértices asignados al hueso equivocado (la placa del
vientre parece pegada a los huesos de los brazos). Con `idle` no se nota porque la pose apenas se
separa de la de reposo; en cuanto un clip mueve mucho un miembro, la malla se abre.

**Solución adoptada:** allowlist `SAFE_CLIPS = {idle}` en `DinoMascot.jsx` (no reproducimos clips
rotos) + un sistema de **poses de cuerpo entero** (`greet` / `cheer` / `sad`) que mueve el modelo
como objeto rígido. T-Rexo **salta de alegría** al ganar y se queda **cabizbajo** al perder, y no
puede romperse porque no toca el esqueleto. → **Arreglo real pendiente: repintar pesos en Blender**
(el `.blend` está en `assets/models/characters/dino-mascot/`). Cuando esté, basta con ampliar
`SAFE_CLIPS`.

**3. Tiempo infinito minimizando la app.** `useTimer` reanclaba el cronómetro leyendo `timeLeft`
del *closure* del efecto, que estaba congelado en su valor inicial. Al volver de segundo plano el
contador **se reiniciaba a la duración completa**. Se lee de una ref viva. *(Verificado: antes
volvía marcando 0:30; ahora conserva el tiempo.)*

### 🐛 Otros bugs corregidos

| # | Bug | Dónde |
|---|---|---|
| 4 | **Completar el juego era imposible al 100 %.** Ganar el último nivel no desbloquea ninguno posterior, y el progreso se calculaba como `maxLevel - 1` → el menú se quedaba clavado en **11/12 para siempre**. Nueva clave `dinocolor.clearedLevel` (con migración de partidas antiguas). | `storageSystem`, `useLevelProgress`, `App`, `MenuScene` |
| 5 | **El botón "Pausa" no pausaba: salía al menú** y perdía la partida sin aviso. Ahora abre un overlay real que congela cronómetro y luces (Reanudar / Reiniciar / Salir). | `PauseOverlay` (nuevo), `useGameLoop`, `GameScene` |
| 6 | **Sonidos de victoria y derrota nunca sonaban.** `Sounds.win()`/`Sounds.lose()` estaban escritos y no los llamaba nadie: el juego terminaba en silencio. | `ResultScene` |
| 7 | **`ResultScene` se salía del marco** (título + mascota + 5 filas de stats + 2 botones): en móviles normales el contenido se recortaba y podía comerse el botón "Menú". Panel compacto 2×2. | `ResultScene`, `game.css` |
| 8 | **La tarima de T-Rexo tapaba la pelota superior izquierda.** El tablero se ajustaba contra la pantalla entera. Ahora `Board3D` reserva bandas del HUD **en píxeles reales** y centra el tablero en la banda libre: imposible que se solapen, en cualquier móvil. | `Board3D`, `safeArea.js` (nuevo) |
| 9 | **El popup "+100 / ¡FALLO!" flotaba sobre el tablero**, tapando justo las pelotas que hay que mirar. Ahora sale pegado al marcador y sube hacia él. | `GameHUD`, `game.css` |
| 10 | **Reiniciar el nivel desde la pausa no remontaba la partida** (la `key` de `GameScene` no cambiaba). Nonce `runId`. | `App` |
| 11 | **Claves de evento colisionables**: se usaba el timestamp (y en los fallos `timestamp + puntuación`), así que dos eventos podían compartir `key` y el popup no se reiniciaba. Contador monótono. | `useGameLoop` |
| 12 | **Varias pelotas expirando a la vez** disparaban N zumbidos solapados y solo se veía el último evento. Ahora: un sonido y un popup por tick. | `useGameLoop` |
| 13 | **El tablero se quedaba encendido** durante la transición a la pantalla de resultado. | `useGameLoop` |
| 14 | **El botón de sonido no desbloqueaba el audio.** Si era el primer gesto del jugador, el `AudioContext` no se creaba y el juego quedaba mudo toda la sesión. | `StartScene`, `MenuScene` |
| 15 | **Sin `ErrorBoundary`**: cualquier excepción de React dejaba una **pantalla en blanco** sin salida. | `ErrorBoundary` (nuevo) |
| 16 | **Sin indicador de carga del modelo**: el hueco de la mascota quedaba vacío hasta que llegaba el GLB. | `DinoMascot`, `game.css` |
| 17 | **El icono del manifest apuntaba a un archivo que la build no generaba** (404) y no había favicon. Ambos viven ya en `public/`. | `index.html`, `public/` |
| 18 | **El cofre era un `<button>` que no hacía nada** al pulsarlo: se sentía roto. | `GameHUD`, `TreasureChest` |
| 19 | **El botón "Continuar" del menú quedaba fuera de la vista** (vivía dentro del área con scroll, debajo de 12 tarjetas). Anclado abajo. | `MenuScene`, `mobile.css` |
| 20 | **El mini T-Rexo "caminaba" sin clip de caminar** → patinaje sobre hielo. Por eso se cargaba `oliver_master` (44 MB): solo para robarle el clip `Walking`. | `MiniDinoWalker` |

### 🎨 10 mejoras visuales aplicadas

1. **Anillo de foco giratorio** en la pelota activa (`Ball3D`) — el objetivo es inconfundible y se
   distingue por FORMA, no solo por color (accesible para daltonismo).
2. **Glow y emisión reforzados** en la pelota activa (`Ball3D`) — compensan la luz puntual retirada
   y se ven más limpios (halo suave, sin quemarse).
3. **El tablero toma el color del nivel** (`Board3D`) — el filo y el halo del suelo eran verdes
   fijos y desentonaban en los niveles rosas/morados.
4. **Composición del tablero por bandas reservadas** (`Board3D`) — el tablero se centra en el hueco
   libre real entre HUD y meta: respira, y nada se solapa en ninguna pantalla.
5. **Poses emocionales de T-Rexo** (`DinoMascot`) — saludo en la portada, **salto de alegría** al
   ganar, **cabizbajo** al perder. La emoción existe por primera vez.
6. **Popup de puntos junto al marcador** (`GameHUD`) — los puntos "vuelan al marcador" en vez de
   taparlo todo.
7. **Barra de META legible** (`GameHUD`) — muestra `puntos / meta` y un brillo que la recorre.
8. **Panel de resultado premium y compacto** (`ResultScene`) — puntuación gigante en oro + rejilla
   2×2 con aciertos, fallos, mejor combo y **precisión** (dato nuevo).
9. **Estados del menú con contraste real** (`MenuScene`) — bloqueado inequívocamente apagado,
   completado con tinte verde y ⭐, actual con anillo pulsante.
10. **Mascota responsive + indicador de carga** (`DinoMascot`) — `clamp()` con `vh`: en pantallas
    bajitas T-Rexo se encoge en vez de recortarse o expulsar al botón fuera del marco.

*(Extra: overlay de pausa, feedback del cofre, favicon e icono de app.)*

### ⚡ 10 mejoras de rendimiento aplicadas

1. **GLB: 66 MB → 0,9 MB** — la mascota es T-Rexo; Oliver no se carga en ninguna escena.
2. **`dist/`: 69 MB → 2,0 MB** — se retira la COPIA de los GLB de Oliver de `public/`
   (los originales siguen intactos en `assets/`). El APK deja de cargar 66 MB muertos.
3. **El cronómetro pasa de 60 renders/s a 1** (`useTimer`) — el valor exacto vive en una ref y solo
   se avisa a React cuando cambia el segundo mostrado. La barra la interpola una transición CSS
   lineal de 1 s: se ve igual de continua. *Antes, cada frame re-renderizaba GameScene entera:
   fondo, tablero, las 9 pelotas, la mascota y el HUD.*
4. **`memo` en todo lo caro** — `Board3D`, `Ball3D`, `Background3D`, `GameHUD`, `MiniDinoWalker`,
   `DinoMascot`. Una pelota solo se re-renderiza si cambia su propio `active`.
5. **Geometrías compartidas a nivel de módulo** (`Ball3D`) — esfera, planos, anillo y sombra se
   crean UNA vez para las 9 pelotas. Esfera 40×40 → 32×24 segmentos (indistinguible a este tamaño).
6. **La textura del fondo se pinta una sola vez** (`Background3D`) — el telón (canvas 512×896 con
   decenas de degradados, blurs y siluetas) se repintaba **en cada montaje de nivel y cada
   reintento**. Ahora se cachea a nivel de módulo. Igual el envMap.
7. **Menos luces** (`Ball3D`) — fuera el `<pointLight>` por pelota activa. Medido: nivel 12 (4
   pelotas a la vez) pasa de **35,5 ms a 34,1 ms** de frame (~4 %).
8. **`backdrop-filter`: de 8 capas a 2** (`game.css`) — cada blur de fondo en vivo es una capa de
   composición y un pase de desenfoque **por frame** sobre un canvas WebGL que ya va justo. Solo lo
   conservan el cronómetro y el bloque META.
9. **Bundle partido en 3 chunks** (`vite.config.js`) — `three` (684 kB) / `react` (141 kB) / juego
   (232 kB). Tocar un nivel ya no invalida el megabyte entero en la caché del jugador.
10. **Fugas y trabajo inútil eliminados** — `useThree` con selectores (no re-render por cualquier
    cambio del store de R3F), `onTap` estable, `mixer`/`timers` limpiados al desmontar, estado
    `bestCombo` innecesario fuera, y el canvas del mini T-Rexo en baja calidad (DPR 1.5, sin
    antialias) porque en GameScene conviven **dos contextos WebGL**.

### ✅ Validaciones

- `npm run build` **verde**. Sin dependencias nuevas (`package.json` intacto).
- Recorrido completo en Chromium con WebGL (390×844, móvil): Start → Menú → Juego → Pausa →
  Resultado (victoria **y** derrota). **0 errores de consola, 0 peticiones fallidas.**
- Un solo GLB descargado en toda la sesión: `dino_color_mascot.glb`.
- Victoria comprobada jugando de verdad (bot que localiza la pelota encendida): 350 pts sobre
  meta 300 → desbloquea el nivel 2, ⭐ 1/12.
- Bug del cronómetro: antes volvía de segundo plano con 0:30; ahora conserva el tiempo.
- Bug del 12/12: el menú llega a `12/12 niveles`; las partidas guardadas antiguas migran a 11/12.
- Sin desbordamiento vertical en Start ni en Result (0 px): nada se recorta.

### ⏳ Pendientes que deja esta revisión

1. **Repintar los pesos de skinning de T-Rexo en Blender** — es lo que desbloquea `wave`,
   `celebrate`, `dance` y `sad` de verdad. Hoy solo `idle` es seguro (`SAFE_CLIPS`).
2. **Comprimir los GLB de Oliver a < 5 MB** (Draco/KTX2) si se quiere recuperarlo como skin premium.
3. Validación en dispositivo real (Android gama media / iPhone) — todo lo anterior se probó en
   Chromium con SwiftShader, que no representa el rendimiento de una GPU móvil real.
4. Función real del cofre (recompensas), pantalla de ajustes, tests automáticos.

---

## ✅ Implementado (MVP)

> ℹ️ **Registro histórico del MVP.** Donde contradiga la **Revisión integral 2026-07-13** (arriba),
> manda esa. En particular: la mascota ya **no** es Oliver, sino **T-Rexo**; y las **copias** de los
> GLB de Oliver en `public/assets/models/characters/oliver/` **se retiraron** (los originales siguen
> en `assets/models/characters/oliver/`). Ver la sección de arriba y `docs/TECHNICAL_NOTES.md`.

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
- **Revisión integral + iteración visual (2026-07-03):** GameScene con "mundo de
  dinosaurios" (telón procedural: amanecer, cordilleras con niebla, volcán a la derecha,
  saurópodos y pterosaurios lejanos, nido de huevos + huellas + helechos bajo el tablero);
  acompañante `MiniDinoWalker` (Oliver `oliverAnimated`, master primero: patrulla
  camina/baila en tarima propia arriba-izq., celebra aciertos, SIEMPRE completo);
  HUD modernizado (pausa de barras, chips nivel/mejor, pop de puntuación, pulso de combo,
  cofre premium con gema); tablero con grosor/sombra/halo (integrado al entorno) y pelota
  activa con halo doble limpio. FIXES: puntos de `pointsMaterial` SIN textura se dibujaban
  como CUADRADOS (luciérnagas/chispas → sprite radial), side-effect en updater de estado
  del walker (StrictMode), y atmósfera de escenas por `background` (no `position:fixed`,
  que rompía el marco de escritorio). Menú con tarjetas premium (brillo, estado completado)
  y atmósfera jurásica en Start/Menú/Result; puntuación dorada destacada en resultados.
  `npm run build` verde; validado con capturas reales de las 4 pantallas.
- **ResultScene usa Oliver/T-Rexo (2026-07-02):** antes mostraba el dino anterior (faltaba
  `model="oliver"`, caía al default `trexo`). Ahora `model="oliver"` (character→master→dino→SVG),
  `size={172}` + mismo encuadre `targetHeight={1.15}`/`baseY={-0.58}` (clase `.mascot--result`).
  Animaciones por prioridad: **victoria** `Shake_It_Off_Dance→Jump_with_Arms_Open→Big_Wave_Hello→
  Idle_02`; **derrota** `Alert→Idle_03→Idle_02`. `resolveClip` acepta ahora lista de prioridad
  (con `character.glb` de 1 clip cae a ella de forma segura; la prioridad aplica con `master`).
- **Iteración visual de GameScene (2026-07-03):**
  - **Mini mascota rehecha** → `MiniDinoWalker.jsx` (reemplaza `MiniDinoReaction`): T-Rexo COMPLETO
    (encuadre `targetHeight={1.02}`/`baseY={-0.52}`, sin recortes) en una **tarima** arriba-izquierda;
    **camina y baila** (patrulla) y celebra los aciertos. Usa el modelo `oliverAnimated`
    (master primero: único con `Walking`/`Shake_It_Off_Dance`). ⚠️ implica cargar `master` (~44 MB)
    en GameScene → reforzar el plan de optimizar GLB a < 5 MB.
  - **HUD modernizado:** chips de nivel/mejor, icono de pausa de 2 barras, pop de puntuación al
    cambiar, énfasis de combo en caliente, cofre SVG premium (gema + base).
  - **Tablero con más profundidad:** canto/grosor 3D, sombra proyectada, halo verde que lo asienta,
    losa "piedra jurásica" (materiales más ricos). Pelota activa con **halo más limpio** (no quemado)
    y esfera más verde (objetivo claro).
  - **Fondo = mundo de dinosaurios** (`Background3D` repintado): valle jurásico al amanecer con sol,
    cordilleras con niebla, **volcán** suave, **siluetas de dinos de cuello largo** en el horizonte,
    dosel y frondas de helecho enmarcando; toda la escenografía en la banda superior (no tapa el tablero).
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
