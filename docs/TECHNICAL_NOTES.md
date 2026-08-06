# DinoColor — Notas técnicas

## Stack

| Capa | Tecnología |
|---|---|
| Build / dev | Vite 5 (`@vitejs/plugin-react`) |
| UI | React 18 (JSX, runtime automático) |
| 3D | Three.js + @react-three/fiber |
| Estado | React hooks (sin Redux/Zustand) |
| Audio | Web Audio API (síntesis) |
| Persistencia | localStorage (con fallback en memoria) |
| Móvil (futuro) | Capacitor (Android) |

> Sin TypeScript (JavaScript/JSX). Sin `@react-three/drei` ni físicas: mantener mínimo de
> dependencias hasta que una necesidad real lo justifique (ver `CLAUDE.md`).

## Mapa de módulos

```
main.jsx → App.jsx (máquina de estados de escenas)
  ├─ scenes/StartScene · MenuScene · GameScene · ResultScene
  │     └─ GameScene → useGameLoop → useTimer
  │            ├─ Canvas (R3F): Background3D + Board3D → Ball3D
  │            └─ GameHUD (DOM) → ProgressBar
  ├─ hooks/useLevelProgress → systems/storageSystem + audioSystem
  ├─ systems/levelSystem → data/levels
  ├─ systems/scoringSystem (puro)
  └─ data/boardLayouts (formas → posiciones de mundo)
```

## Decisiones clave

- **`base: './'`** en `vite.config.js`: rutas relativas para que el build funcione en
  GitHub Pages (subcarpeta) y dentro de Capacitor (`file://`) sin reconfigurar.
- **Build a `dist/`** (estándar Vite). `capacitor.config.json` usa `webDir: "dist"`.
- **Render 3D vs UI:** el tablero y el fondo son 3D (R3F); el HUD y los menús son **DOM**
  para texto nítido y grande en móvil. El HUD se superpone con `pointer-events: none` y
  reactiva solo los botones.
- **Bucle de juego sin renders por frame:** `useGameLoop` mantiene la simulación de luces
  en `refs` y la sincroniza a estado React solo cuando cambia. La animación visual de las
  pelotas (pulso, brillo) se hace con `useFrame` dentro de `Ball3D`, sin re-render de React.
- **Tablero genérico:** `boardLayouts` separa la *forma* (celdas `[col,row]`) del *render*.
  `Board3D` centra y **auto-escala** el conjunto, así cualquier forma encaja.
- **El tablero encaja en la BANDA LIBRE, no en la pantalla** (`Board3D.jsx`, desde 2026-07-13):
  se reservan las bandas del HUD **en píxeles reales** (`TOP_RESERVE_PX` arriba —incluye la tarima
  de T-Rexo—, `BOTTOM_RESERVE_PX` abajo —stats + META + cofre—, más el safe-area del dispositivo) y
  el tablero se escala y se centra en el hueco que queda. Si la banda se queda corta, el tablero se
  encoge solo: **nunca invade el HUD**. Si tocas la altura del HUD o de la tarima en `game.css`,
  actualiza esas constantes.
- **Glow falso:** no se usa post-procesado (bloom). El brillo se simula con `emissive` + halos
  translúcidos additive + un anillo de foco. **Sin `pointLight` por pelota** (ver más abajo).

## Audio

`audioSystem.js` **sintetiza** los efectos con osciladores Web Audio, así suena sin
archivos. El `AudioContext` se crea/reanuda en el **primer gesto del usuario** (botón) vía
`unlock()` (política de autoplay de los navegadores/móvil).

Para usar **audio real** (mp3): añadir los archivos (ver `assets/README.md`), cargarlos
como buffers en `audioSystem.js` y reproducirlos en lugar de —o además de— la síntesis.
Rutas previstas: `assets/audio/sfx/{hit,miss,win,lose}.mp3`,
`assets/audio/music/dinocolor_theme.mp3`.

## Rendimiento / cosas a vigilar

- **El recuento de luces es FIJO.** Ya no hay una `pointLight` por pelota activa. Menos luces =
  sombreado por píxel más barato y una sola variante de programa. Medido: nivel 12 (4 pelotas a la
  vez) pasó de 35,5 ms a 34,1 ms por frame (~4 %).
  > Mito desmentido: *"cambiar el número de luces recompila todos los shaders en cada activación"*.
  > Se contaron las llamadas a `compileShader`/`linkProgram` y **no es cierto**: Three.js cachea un
  > programa por cada recuento de luces, así que alternar 0↔1↔4 reutiliza programas ya compilados
  > (0 recompilaciones en régimen, con y sin `pointLight`). Lo que se ahorra es coste por píxel y
  > variantes que compilar la primera vez.
- **En `GameScene` conviven DOS contextos WebGL**: el del juego y el del mini T-Rexo (`DinoMascot`
  trae su propio `<Canvas>`). El de la mascota va en `quality="low"` (DPR 1.5, sin antialias,
  `low-power`). No añadas un tercer canvas sin medir.
- **El cronómetro no debe re-renderizar por frame.** `useTimer` guarda el valor exacto en una ref y
  solo avisa a React cuando cambia el segundo mostrado (1 render/s en vez de 60). La barra la
  interpola una transición CSS lineal de 1 s (`.ghud-timer-fill`). Si algún día haces que `timeLeft`
  cambie cada frame, volverás a re-renderizar la escena entera (fondo, tablero, 9 pelotas, mascota
  y HUD) 60 veces por segundo.
- **`backdrop-filter` es caro**: cada uno es una capa de composición y un pase de desenfoque *por
  frame* sobre un canvas WebGL que ya va justo. El HUD llegó a tener 8; hoy solo lo usan el
  cronómetro y el bloque META. No lo repartas alegremente.
- Las texturas procedurales (telón del fondo, envMap, sprites de glow) se cachean **a nivel de
  módulo**: son dibujos estáticos y repintarlos en cada montaje de nivel era trabajo tirado.
- `dpr={[1,2]}` en el `Canvas` limita el devicePixelRatio para no sobrecargar móviles.
- `StrictMode` (solo dev) monta efectos dos veces; el bucle está protegido con flags.

## Mascota 3D — T-Rexo (actualizado 2026-07-13)

`DinoMascot.jsx` es un widget DOM autocontenido (su propio `<Canvas>`) que carga modelos GLB
**sin `@react-three/drei`**: usa `GLTFLoader` y `SkeletonUtils` (ambos dentro de `three`) vía
`useLoader`.

**Modelo único en producción: `dino_color_mascot.glb` (T-Rexo, 0,9 MB, 28 huesos, 8 clips).**
Lo usan las tres pantallas (`StartScene`, `ResultScene`, `MiniDinoWalker`). Se precarga al arrancar.

```
/assets/models/characters/dino-mascot/dino_color_mascot.glb   (0,9 MB — el único que se descarga)
```

### ⚠️ Trampa nº 1: SOLO el clip `idle` es usable

El GLB trae 8 clips (`idle, wave, talk, celebrate, sad, point, surprised, dance`), pero **solo
`idle` deforma bien la malla**. Los demás la ROMPEN:

| clip | qué pasa |
|---|---|
| `wave` | la placa del vientre y la boca **se despegan del cuerpo** y flotan |
| `celebrate` | el vientre se desgarra, los brazos se deforman |
| `sad` | la cabeza **colapsa en una bola sin cara** |
| `dance` | pasable, pero se le suelta una garra |

**No es un bug del componente.** El GLB está bien formado: las 14 primitivas tienen
`JOINTS_0`/`WEIGHTS_0`, ningún vértice se queda sin peso, y las traslaciones solo mueven el hueso
raíz `hips` (lo correcto). El fallo está en los **pesos de skinning**: hay vértices asignados al
hueso equivocado (la placa del vientre parece pegada a los huesos de los brazos). Con `idle` no se
nota porque la pose apenas se separa de la de reposo; en cuanto un clip mueve mucho un miembro, la
malla se abre.

Por eso `DinoMascot.jsx` tiene una allowlist:

```js
const SAFE_CLIPS = new Set(['idle'])   // resolveClip descarta todo lo demás
```

**Arreglo real (pendiente): repintar pesos en Blender.** El `.blend` está en
`assets/models/characters/dino-mascot/dino_color_mascot.blend` y el generador en
`tools/build_trexo.py`. Cuando esté corregido, añade los clips a `SAFE_CLIPS` **uno a uno,
mirándolos**, y el juego empezará a usarlos solo (la API no cambia).

> 📄 **El diagnóstico completo (causa raíz en `build_trexo.py`, evidencias por hueso, riesgos,
> plan Blender y checklist de validación) vive en [`docs/MASCOT_RIG_PLAN.md`](MASCOT_RIG_PLAN.md).**
> En resumen: el skinning se genera por **proximidad geométrica a 2 huesos, sin anatomía**, así que
> la panza pesa a la espinilla, la bandana a los brazos y la cara al `jaw`+ojos; `idle` se salva
> porque casi no mueve brazos ni cabeza.

### Poses: la emoción sin tocar el esqueleto

Como no podemos reproducir clips expresivos, el lenguaje corporal se hace moviendo el **modelo
entero como objeto rígido** (posición/rotación/escala del grupo, en `MascotRig`). Eso es incapaz de
romper el skinning. Poses en `POSES`:

| pose | uso | qué hace |
|---|---|---|
| `idle` | por defecto | respira y se balancea |
| `greet` | StartScene | se inclina hacia el jugador y se balancea con ganas |
| `cheer` | victoria, y el mini T-Rexo al acertar | **salta** con squash & stretch y gira |
| `sad` | derrota | hunde los hombros, se inclina hacia delante, suspira despacio |

Se deduce del `mood` (`happy→idle`, `cheer→cheer`, `sad→sad`) o se fuerza con la prop `pose`.

### Oliver (skin premium, NO se carga)

El registro `MODELS.oliver` sigue en el componente pero **ninguna escena lo pide**, así que sus
GLB no se descargan nunca. Historia, para que no se repita:

- `oliver_character.glb` (**22 MB**) — y **solo 1 clip** (`Armature|clip0|baselayer`). Era el que
  cargaban Start y Result, así que las prioridades de animación de la victoria
  (`Shake_It_Off_Dance → …`, clips que solo existen en *master*) caían siempre a ese único clip:
  **ganar y perder se veían idénticos**.
- `oliver_master.glb` (**44 MB**, 11 clips) — lo cargaba el mini acompañante SOLO para robarle el
  clip `Walking`.
- Total: **66 MB de GLB para jugar una partida.** T-Rexo hace lo mismo (y mejor) con 0,9 MB.

Los **fuentes** siguen intactos en `assets/models/characters/oliver/`. Se retiró la **copia** de
`public/` (que es la que se empaqueta): `dist/` pasó de **69 MB a 2,0 MB**. Para recuperarlos como
skin habría que **comprimirlos a < 5 MB** (Draco/KTX2) y volver a copiarlos a `public/`.

### Otros detalles

**Normalización automática** por bounding-box (escala a `targetHeight`, pies en y=0, centrado x/z →
cualquier modelo sale centrado y sin cortes); `ErrorBoundary` por URL que avanza al siguiente
candidato y, si todo falla, cae al **placeholder SVG** (nunca pantalla en blanco); indicador de
carga mientras llega el GLB. API estable: `message`, `mood`, `size`, `animation`/`state`, `model`,
`pose`, `quality`, `targetHeight`, `baseY`, `cameraDistance`.

**El tamaño lo decide el CSS** (`--mascot-size`), no un `style` inline: así `.mascot--hero` puede
usar `clamp()` con `vh` y encoger a T-Rexo en pantallas bajitas en vez de recortarlo.

> El **encuadre de cámara** (`cameraDistance`, fov) se mantiene estable a propósito: tocarlo a
> ciegas recorta o deforma la mascota. Su presentación se ajusta por **luces**, por el "escenario"
> CSS (`.mascot-canvas::before`) y por las **poses**, no moviendo la cámara sin ver el render.

## Decisiones de la iteración de pulido (2026-06-30)

- **Ajuste del tablero a pantalla por la PLATAFORMA, no por las pelotas** (`Board3D.jsx`): la
  escala se calcula con la extensión de la plataforma + filo neón (`fitW`/`fitH`), de modo que el
  marco completo respeta el margen y nunca se recorta/pega a los bordes. El grupo del tablero se
  desplaza hacia abajo (`DROP_FRAC`) para despejar el HUD superior.
- **`<fog>` debe colgar de la ESCENA, no de un `<group>`** (`Background3D.jsx`): con
  `attach="fog"` dentro de un grupo, se asigna a `group.fog` (que el renderer ignora) y la niebla
  **no se aplica**. Debe ser hija directa del `<Canvas>`/escena.
- **`layout` memoizado** (`useGameLoop.js`): evita que `Board3D` reconstruya su `THREE.Shape` en
  cada `setState` del bucle (la identidad del layout era nueva en cada render).
- **Timer "justo" en segundo plano** (`useTimer.js`): el rAF se congela con la pestaña/app oculta;
  un listener de `visibilitychange` suelta el anclaje para no descontar el tiempo en background.

## Trampas de la revisión 2026-07-13 (no las reintroduzcas)

- **`useTimer`: reanclar el cronómetro leyendo `timeLeft` del closure.** El efecto tiene deps
  `[running, duration]`, así que `timeLeft` dentro de `tick` está **congelado en su valor inicial**.
  Al volver de segundo plano se reanclaba con `duration - duration = 0` de tiempo consumido y el
  contador **se reiniciaba a la duración completa**: tiempo infinito minimizando y restaurando la
  app. Hay que leerlo de `timeLeftRef` (ref viva). La "pausa justa" en background sigue funcionando.

- **Progreso: `maxLevel` (desbloqueado) ≠ `clearedLevel` (superado).** El último nivel no desbloquea
  ninguno posterior, así que calcular el progreso como `maxLevel - 1` hacía que **ganar el nivel 12
  no contara nunca** y el menú se quedara en 11/12 para siempre. Clave nueva
  `dinocolor.clearedLevel`, con migración: si no existe, se deduce de `maxLevel - 1`.

- **`key` de eventos de feedback: nunca uses el timestamp.** Se usaba `performance.now()` (y en los
  fallos `timestamp + puntuación`), y dos eventos podían compartir `key` → la animación del popup no
  se reiniciaba y el jugador se perdía un "+100". Contador monótono (`nextEventKey()`).

- **Reiniciar el MISMO nivel no cambia la `key` de `GameScene`.** Al reiniciar desde la pausa, el
  `level.id` es el mismo, así que sin un nonce (`runId` en `App.jsx`) React reutiliza el componente
  y la partida continúa con el estado anterior.

- **`useThree()` sin selector** suscribe el componente al store ENTERO de R3F. Usa
  `useThree((s) => s.viewport)`.

- **El manifest y sus iconos deben vivir en `public/`.** Si el manifest está en la raíz, Vite lo
  procesa y lo mueve a `dist/assets/…`, y sus rutas relativas dejan de resolver → el icono daba 404.

- **Audio: `unlock()` en el PRIMER gesto, sea cual sea.** El `<Button>` ya lo hacía, pero el botón de
  sonido era un `<button>` pelado: si el jugador lo tocaba primero, el `AudioContext` no se creaba y
  el juego quedaba mudo toda la sesión.

## Iteración 2026-07-21 (niveles + seguridad)

- **42 niveles con validador** (`src/data/levels.js` + `src/systems/levelValidation.js`).
  `validateLevels(levels, layouts)` es **puro** (sin React ni `import.meta`), así que se
  puede llamar desde un test o un script. `levels.js` lo invoca bajo `import.meta.env?.DEV`
  (código muerto en producción, y `?.` no rompe en Node sin Vite). El validador comprueba:
  ids únicos y secuenciales, campos requeridos, layout existente, `activeBalls ≤ celdas`,
  sin negativos, `reactionTime ≥ 1.0`, color hex, difficulty con estilo CSS, y pace
  (`targetScore/totalTime`) por debajo de un techo alcanzable.
  > Recordatorio: solo hay 4 valores de `difficulty` con estilo CSS (`facil`, `media`,
  > `dificil`, `extrema`). Usar otro deja la tarjeta sin franja de color.

- **Pausa: re-anclar los plazos de las bolas** (`useGameLoop.js`). Las luces guardan un
  `expireAt` ABSOLUTO. Al reanudar hay que desplazar `expireAt` y `activatedAt` de cada
  bola por el tiempo pausado (`resume()` usa `pausedAt` sellado en `pause()`), o el primer
  tick tras la pausa las expira todas de golpe. Es el mismo problema que ya resuelve
  `useTimer` para el cronómetro, pero para los deadlines de las bolas.

- **CSP solo en el build** (`vite.config.js` → `securityHeadersPlugin`, `apply: 'build'`).
  Se inyecta con `transformIndexHtml` + `injectTo: 'head-prepend'` (debe ir ANTES de los
  `<script>`/`<link>` para gobernarlos). **No** se pone en `index.html` fuente porque en dev
  Vite sirve scripts inline (HMR) que `script-src 'self'` bloquearía. Solo directivas
  efectivas vía `<meta>`: `frame-ancestors`/`form-action` se ignoran en `<meta>` (avisan por
  consola) → van como cabecera de hosting (ver `docs/SECURITY.md`). Validado: el juego
  arranca bajo CSP con 0 violaciones.

- **Progreso clampeado al rango de niveles** (`useLevelProgress.js`). `storageSystem` evita
  NaN/negativos pero no conoce cuántos niveles hay; el hook clampa a `[1..N]`/`[0..N]` con
  `totalLevels()` para que un `localStorage` corrupto (`maxLevel=9999`) no desbloquee de
  forma inconsistente ni apunte más allá del último nivel.

- **`AudioContext` en try/catch** (`audioSystem.js`): crearlo puede lanzar en WebView
  restringidos; como se llama desde el handler de un botón (`unlock()`), sin el try/catch
  una excepción mataría ese click. Ante el fallo, el juego se queda sin audio, nunca roto.

## Iteración 2026-07-28 (estrellas, capítulos, tutorial, rendimiento)

- **Estrellas sin `JSON.parse`.** `dinocolor.stars` es una **cadena de dígitos**: el
  carácter *i−1* son las estrellas del nivel *i* (`"3200…"`). 42 bytes, se lee carácter a
  carácter y se sanea con `/^[0-3]$/`, así que un valor manipulado degrada a 0 estrellas
  en ese nivel. Es deliberado: `docs/SECURITY.md` audita "0 `JSON.parse`" y serializar un
  mapa lo habría reintroducido. El récord **por nivel** va en claves separadas
  (`dinocolor.best.<id>`) por lo mismo.
  > `resetProgress()` **descubre** las claves `dinocolor.best.*` recorriendo
  > `localStorage` en vez de asumir cuántos niveles hay: `storageSystem` no conoce el
  > catálogo de niveles y no debe empezar a conocerlo.

- **Las estrellas NO tocan la condición de victoria.** `computeStars` deriva 1–3 ⭐ de la
  puntuación final ya existente; ganar sigue siendo llegar a `targetScore`. Superar la
  meta da **siempre** ≥ 1 ⭐ (si ganaste, no puedes quedarte a cero).

- **⚠️ El efecto de "celebración" del mini T-Rexo: `return` vs `return cleanup`.** El
  efecto de `MiniDinoWalker` salía con `return undefined` cuando el evento no era un
  acierto, **pero el cleanup del efecto anterior se ejecuta igual**. Así que la secuencia
  acierto → fallo cancelaba el `setTimeout` que apaga la celebración y dejaba `cheer` en
  `true` para siempre (T-Rexo saltando de alegría mientras el jugador falla). El
  temporizador se gestiona en una ref y **solo** se cancela al desmontar; cada acierto
  reprograma su propio fin. Vigila este patrón en cualquier efecto con salida temprana.

- **`startPaused` en `useGameLoop`.** El tutorial necesita que la partida arranque
  congelada. Ojo: el efecto de reinicio (`[level.id]`) hacía `setPaused(false)`, o sea
  que habría despausado justo después del primer render — lee de `startPausedRef`. Y
  `resume()` pone la ref a `false` para que la partida no vuelva a arrancar pausada.

- **`frameloop="demand"` para dormir el canvas.** En pausa/tutorial/fin de nivel no hay
  nada que animar. Dos detalles: R3F pinta siempre el primer frame al montar (por eso el
  tablero se ve aunque nazca dormido), pero el canvas de la **mascota** solo se duerme
  cuando el modelo ya está listo (`sleeping && ready`) — dormido antes de que llegue el
  GLB dependería de que alguna invalidación lo despertara.

- **Animar `left` cuesta layout; `transform` no.** `meta-shine` y `btn-shine` movían
  `left` en un bucle infinito **encima del canvas WebGL**. Medido con
  `Performance.getMetrics` en 6 s de pausa: **55 layouts → 0** al pasar a
  `translateX` (un canvas congelado no provoca layout, así que la ventana de pausa aísla
  justo este coste). El recorrido de `meta-shine` es una distancia fija de 420 px mayor
  que cualquier ancho de barra posible (el marco tiene `max-width: 480px`) y
  `.ghud-metabar` lo recorta con `overflow: hidden`: no hace falta medir el ancho en JS.

- **`box-shadow` grande y animado = repaint carísimo.** `.hud-flash` cubría la pantalla
  con `box-shadow: inset 0 0 130px` y se disparaba en cada acierto y cada fallo. Un
  degradado radial (se pinta una vez) animando solo `opacity` da el mismo halo.

- **`Ball3D` con salida temprana en `useFrame`.** Como los lerps son **asintóticos**, no
  basta con dejar de animar: hay que **fijar el estado exacto de reposo** (color, emisión,
  escala) al converger, o la pelota se queda con un tinte residual del color del nivel.
  La marca se limpia en cuanto la pelota se activa o se toca.

- **`THREE.WebGLRenderer: Context Lost` es NORMAL aquí.** Sale ~10 veces en un recorrido
  largo, al desmontarse cada `<Canvas>` en los cambios de escena (`dispose()` de
  three.js). Comparado en los dos builds con el mismo recorrido: **10 antes, 10 después**.
  Sale por `console.log`, **no** por `console.warn`: un validador que filtre solo
  `error`/`warning` no lo verá. No lo persigas como si fuera un bug nuevo.

- **⚠️ Cómo NO medir "no hay scroll en la partida".** Dos formas que dan falsos positivos:
  1. `scrollHeight - clientHeight` → da **84 px** porque `.app-frame::before` tiene
     `inset: -10%` (una capa decorativa de blobs) y `overflow: hidden` la recorta. Nadie
     ve ese "desbordamiento".
  2. `el.scrollTop = 9999` → un contenedor con `overflow: hidden` **sí** se puede
     desplazar por script; solo el usuario no puede.

  Lo único concluyente es **hacer un swipe de verdad** (`Input.synthesizeScrollGesture`)
  y comprobar que nada se movió, incluido un testigo visual como `.ghud-bottom`.

- **Los capítulos deben cubrir los 42 niveles.** El menú muestra un capítulo a la vez, así
  que un nivel fuera de todo capítulo sería **invisible** en el selector (solo alcanzable
  con "Continuar"). `validateChapters(LEVELS, CHAPTERS)` comprueba rangos contiguos, sin
  huecos ni solapes, y corre en dev junto a `validateLevels`. Si cambias la curva de
  niveles, actualiza `src/data/chapters.js`.

- **El presupuesto vertical de `ResultScene` es real.** Esta pantalla ya se salió del
  marco una vez (bug 7 de la revisión 2026-07-13). La fila de estrellas se pagó
  encogiendo `.mascot--result` (`clamp(104px, 16vh, 148px)`) y el texto motivador va
  **dentro del globo que ya existía** (cero altura extra). El botón "Repetir" comparte
  fila con "Menú" en vez de añadir una tercera fila alta. Si añades algo aquí, quita algo.

---

## Iteración 2026-08-01 (mascota v3 + acceso con cuenta)

Dos frentes: **cambiar el modelo de la mascota** por uno bonito de verdad y
**añadir acceso con cuenta**. Sin tocar mecánica, niveles ni scoring.

### 🦕 T-Rexo v3 — de 20,5 MB a 1,3 MB

El modelo nuevo (generado con Meshy) apareció en `public/` con **20,5 MB, 395.058
triángulos y texturas 2048²**. Tal cual, `dist/` pasaba de 2,0 MB a ~22 MB: 10×
por encima del límite de 5 MB del proyecto e inaceptable en móvil.

Se optimizó con **Blender en modo background** (sin MCP, script de un solo uso):

| | Antes | Después |
|---|---|---|
| Peso | 20,5 MB | **1,3 MB** (−94 %) |
| Triángulos | 395.058 | **41.999** (decimate collapse, ratio 0,106) |
| Base color | 2048² | 1024² |
| Normal | 2048² | 1024² |
| Metallic-roughness | 2048² | 512² |
| Emisiva | 2048² (luma media 0,0005 → **negra**) | eliminada |
| `doubleSided` | `true` | `false` (malla cerrada: ahorra la mitad del trabajo de fragmento) |

Renderizado antes y después a tamaño de héroe: **indistinguible**. Las fuentes
quedan en `assets/models/characters/dino-mascot/` (gitignored):
`trexo_v3_meshy_source.glb` (original) y `trexo_v3_optimized.glb` (el que se sirve).

**El modelo v3 NO tiene esqueleto ni clips de animación.** No es un problema: la
expresividad del juego ya se hacía con **poses de cuerpo entero** (`MascotRig`),
porque los clips del modelo anterior rompían la malla (ver `SAFE_CLIPS`). Toda la
maquinaria de clips sigue en su sitio y probada: el día que haya un modelo bien
riggeado, empieza a animarse sola. Ficha del modelo en `src/data/mascot.js`.

### ⚠️ TRAMPA GORDA: la CSP dejaba la mascota GRIS (solo en producción)

Con el modelo nuevo, el dinosaurio salía **gris, como una figura de barro**. Las
texturas no cargaban:

```
THREE.GLTFLoader: Couldn't load texture blob:http://localhost:4173/…
```

Causa: GLTFLoader mete las texturas **embebidas** del GLB en un `Blob` y, cuando
el navegador soporta `createImageBitmap` (todos los actuales), las carga con
`ImageBitmapLoader`… que por dentro usa **`fetch()`**. Un `fetch` no lo gobierna
`img-src` sino **`connect-src`**, y la política era `connect-src 'self'`.

- **No se veía en `npm run dev`**: la CSP se inyecta solo en el build.
- **No se veía antes**: el modelo anterior no tenía NINGUNA textura (`images: []`).
- Poner `blob:` únicamente en `img-src` **no arregla nada**; hay que ponerlo
  también en `connect-src` (medido: `fetch(blob:…)` → *Failed to fetch*).

Ambas directivas lo llevan ahora: `img-src` cubre el camino `new Image()` de los
navegadores sin `createImageBitmap`. Son blobs del propio documento; no habilitan
ningún origen externo.

> **Regla:** si algún día se embeben más binarios (texturas KTX2, audio, Draco),
> comprueba la CSP **sobre el build servido**, no en `dev`.

### 🐛 El `clamp()` responsive de la mascota nunca se aplicó

`.mascot--hero { --mascot-size: clamp(176px, 30vh, 260px) }` era **código muerto**
desde que se escribió. `DinoMascot` ponía `--mascot-size` en un `style` **inline**
del **mismo elemento** que lleva la clase, y un estilo inline siempre gana. La
mascota medía siempre los píxeles fijos del JS y **no se encogía en pantallas
bajas** — exactamente lo contrario de lo que prometía el comentario.

Medido: rect de 272 px tanto en 390×844 como en 360×640. Arreglo: el JS escribe
en `--mascot-size-base` y las clases en `--mascot-size`;
`.mascot-canvas` usa `var(--mascot-size, var(--mascot-size-base))`. Ahora en
360×640 el héroe mide 211 px (33vh) y en 390×844, 279 px.

### 🐛 `justify-content: center` + `overflow-y: auto` = contenido inalcanzable

Cuando una escena desborda, flexbox con `justify-content: center` reparte el
sobrante **a partes iguales arriba y abajo**. Lo de arriba queda **fuera del área
desplazable**: el logo se cortaba y no había forma de llegar a él ni con scroll.

Arreglo en `mobile.css`: `justify-content: flex-start` seguido de
`justify-content: safe center`. Con `safe`, cuando no cabe se comporta como
`flex-start` y todo el desbordamiento se va abajo, donde el scroll sí llega. Los
navegadores que no entiendan `safe` se quedan con la declaración anterior, que
también es segura. Aplicado a `.scene--start`, `--auth`, `--result` y `--error`.

### Encuadre del modelo nuevo (los números no son a ojo)

El modelo v3 es **más estrecho** que el anterior (0,56 de ancho por alto, frente a
0,86), así que a igual altura se leía mucho más pequeño. Con `fov 30` a distancia
2,8, la altura visible en `z=0` es `2·2.8·tan(15°) ≈ 1,50` → `y ∈ [-0,75, 0,75]`.
Con `targetHeight 1.32` y `baseY -0.66` el modelo ocupa `y ∈ [-0,66, 0,66]`: 88 %
del encuadre, con aire arriba y abajo. Mismo criterio en StartScene, ResultScene y
el mini acompañante (que usa distancia 2,95 → `y ∈ ±0,79`, y ocupa `±0,62`).

**Luces recalibradas:** con texturas de verdad, el contraluz verde a 0,85 le teñía
el vientre y le apagaba el azul. Ahora ambiente 0,88 (levanta la sombra de la
barriga) y verde a 0,55 (puro remate de silueta).

### 🔐 Acceso con cuenta

Documentado aparte y en detalle en **[`docs/AUTH.md`](AUTH.md)**. Lo esencial:

- Única dependencia nueva: **`firebase`**, con `import()` **diferido** — no entra
  en el bundle inicial (verificado: `index.html` no la precarga).
- `src/systems/auth/` es una capa desacoplada; **solo `firebaseProvider.js`
  importa `firebase`**. Cambiar de backend es reescribir ese archivo.
- **El progreso NO se ata a la cuenta**: sigue en `localStorage` con las mismas
  claves. Iniciar o cerrar sesión no lo toca (el porqué, en AUTH.md §3).
- **Modo invitado siempre disponible**: la puerta de acceso nunca bloquea.
- La CSP se **calcula** según haya o no `.env` (`buildCsp` en `vite.config.js`):
  sin configuración, queda igual de estricta que antes.

### Validado en navegador (Chrome real con WebGL, por CDP)

Recorrido completo Inicio → Acceso → Registro → Menú → Juego → Resultado en
**390×844** y **360×640**, con la build de producción y su CSP:

- **0 errores de consola**, **0 peticiones fallidas**.
- **0 desbordes** del marco en las cinco pantallas y en ambos tamaños.
- Validación de formularios comprobada de verdad (correo inválido, contraseña
  corta, campos vacíos, mensaje de "no configurado").
- Perfil de invitado persistido correctamente; progreso del juego intacto.
- `Context Lost` sale 3–5 veces por recorrido: es el `dispose()` de three.js al
  desmontar cada `<Canvas>`. **No es una regresión** (ver `dinocolor-qa-visual`).

> Aviso para quien valide con CDP: `scrollIntoView` puede desplazar `.app-frame`
> **aunque tenga `overflow: hidden`**, y entonces todos los rects salen negativos
> como si estuviera recortado por arriba. Devuelve el scroll a cero antes de medir.

---

## Iteración 2026-08-05 (v0.6.0 — rejugabilidad y recompensas)

### ⚠️ Las estrellas medían algo que NUNCA podía pasar

`useGameLoop` termina el nivel en el instante en que `score >= targetScore`:

```js
s.score += points
if (s.score >= level.targetScore) finish('won')   // ← fin inmediato
```

…pero `computeStars` premiaba el **margen sobre la meta** (2⭐ a 1,2×, 3⭐ a 1,5×).
Como el nivel acaba justo al cruzarla, ese margen es siempre ~0. Es decir: el juego
medía una cantidad que su propia condición de victoria hacía imposible acumular.

Comprobado JUGANDO (bot que localiza la pelota encendida por color y la toca): el
nivel 1 terminaba con **300 sobre meta 300**, la pantalla decía «superada por 0» y
daba **1⭐**. Las 2⭐/3⭐ solo salían si el último golpe se pasaba mucho — azar.

**Arreglo: estrellas por RAPIDEZ** (`STAR_TIME_THRESHOLDS`, 45 % y 65 % del tiempo
restante). Se eligió frente a las otras dos opciones porque:

- *Seguir jugando tras la meta* habría restaurado el margen, pero obliga a que los 42
  niveles duren siempre su tiempo completo — cambia el ritmo de todo el juego.
- *Precisión* premia otra habilidad, pero es más difícil de explicar en una línea.
- La rapidez es lo natural en un juego de reflejos, es determinista y el jugador
  entiende «te sobraron 26 s» sin explicación.

**Fontanería:** `finish()` se define ANTES de `useTimer` (que a su vez necesita
`finish` para el fin de tiempo), así que no puede leer el tiempo directamente. Se
guarda la **ref** del cronómetro (`timerRef.current = timeLeftRef`) y `finish` lee de
ella el valor vivo — no el del último render, que solo se refresca 1 vez por segundo.

**Calibración:** medida real en el nivel 1 con el bot → terminó con 26 s de 32 (81 %)
→ 3⭐. Los niveles altos no se pudieron conducir con el bot (con 3-4 pelotas
simultáneas, `Page.captureScreenshot` se agota bajo WebGL por software), así que los
umbrales están razonados sobre la curva de niveles pero **pendientes de validar en un
móvil real**. Son dos números en un solo sitio: subirlos endurece las estrellas.

### Misiones diarias — decisiones

- **El día es LOCAL, no UTC.** `dayKey()` se construye a mano en vez de con
  `toISOString()`: ese método pasa a UTC y en España a la 01:00 seguiría devolviendo
  el día anterior, renovando las misiones a una hora rarísima.
- **Elección determinista sin barajar:** se recorre el catálogo con un paso coprimo
  con su tamaño, a partir de un índice derivado del hash del día. Al ser coprimo, el
  recorrido pasa por todas las misiones antes de repetir: los tres del día siempre
  son distintos y varían de un día a otro, sin estado extra.
- **Se comprueba el día también al volver a la pestaña** (`visibilitychange`) y
  **antes de sumar** progreso: si alguien deja el juego abierto pasada la medianoche,
  el progreso no se apunta en las misiones de ayer.
- **Sin botón de "reclamar":** la recompensa se paga sola al terminar la partida. Un
  paso extra solo sirve para que el jugador se deje huesos sin recoger.

### Almacenamiento nuevo (sin `JSON.parse`, como el resto)

Cuatro claves de texto plano, saneadas al leer:

```
dinocolor.bones           entero  (clamp 0..9.999.999)
dinocolor.daily.day       'YYYY-MM-DD' local
dinocolor.daily.ids       'flawless1|record1|combo5'
dinocolor.daily.progress  '1|1|0'
dinocolor.daily.done      '110'
```

`readDaily` devuelve **null** —y el sistema regenera misiones— si el día no coincide,
si algún id no está en el catálogo, si hay ids repetidos o si las longitudes no
cuadran. Probado inyectando basura (`ids='inventada|otra|xxx'`, `progress='a|b|c'`,
`done='zzz'`): el juego arranca, regenera las tres misiones y sigue jugable.

**Los huesos NO afectan a la dificultad ni desbloquean niveles.** Si algún día lo
hicieran, dejarían de ser decorativos y habría que revisar el modelo de amenazas (hoy
un jugador solo puede hacerse trampas a sí mismo editando su propio `localStorage`).

### Presupuesto vertical de la pantalla de resultado

La tira de recompensa nació como **panel propio** y costaba ~250 px: en el peor caso
—3 estrellas nuevas + récord + dos misiones completadas, o sea la PRIMERA victoria de
cualquier jugador nuevo— dejaba el botón «Menú» fuera de la pantalla (58 px de
desborde en 390×844, 110 px en 360×640).

Se rehízo **dentro** del panel de estadísticas, con fichas en vez de filas (~70 px), y
en pantallas de ≤700 px las fichas van en **una sola fila deslizable** en horizontal
en lugar de envolverse en tres. Verificado: ambos botones visibles en los dos tamaños.

> Al medir desbordes con CDP, **devuelve el scroll a cero antes**: `scrollIntoView`
> desplaza `.app-frame` aunque tenga `overflow: hidden`, y entonces todo mide con
> `top` negativo y parece recortado. Y no cuentes como recorte lo que esté dentro de
> `.menu-scroll`: esa zona hace scroll por diseño.

### Trampa del entorno de pruebas

`vite preview` sin puerto libre puede dejarte midiendo **otro proyecto**: durante esta
iteración el puerto 4173 lo ocupaba otro juego del workspace y el `curl` devolvía 200
tan campante. **Comprueba el `<title>` o el hash de `assets/index-*.js`, no solo el
código HTTP.**

---

## Iteración 2026-08-05 (b) · v0.6.1 — Tienda, aspectos y ambientes

### ⚠️ Teñir el GLB sin teñirlos TODOS

`SkeletonUtils.clone` clona el grafo de objetos pero **reutiliza los materiales**, y
esos materiales viven en la caché de `useLoader`, compartida por todas las
instancias. Pintar sobre ellos habría teñido a la vez al héroe de la portada, al
mini de la partida y al de la pantalla final — y el tinte habría **sobrevivido al
cambio de escena**, porque la caché no se limpia al desmontar.

`DinoModel` clona el material una vez por instancia (`useMemo` sobre el modelo),
guarda los valores ORIGINALES y a partir de ahí solo actualiza propiedades. Cambiar
de aspecto no crea materiales nuevos ni recompila shaders, y las copias se liberan
con `dispose()` al desmontar (son nuestras, no de la caché).

### Por qué un aspecto necesita `color` Y `emissive`

`material.color` se **multiplica** por la textura base. Sobre un dinosaurio azul eso
sirve para aclarar, oscurecer o moverse dentro de su familia de tonos, pero **no
puede volverlo dorado**: el azul casi no tiene canal rojo, así que multiplicar por
oro lo desatura y sale **color hueso** (comprobado con captura antes de corregirlo).

La solución es repartir el trabajo: `color` quita el azul y templa, y `emissive`
—que SUMA luz— pone el oro. De ahí que el aspecto dorado lleve una emisión tan alta
(0,62) comparada con el resto. `metalness`/`roughness` multiplican al mapa
metallic-roughness del modelo, y son los que dan el acabado pulido del cristal y el oro.

### Qué NO cambia un ambiente

- **El color de la pelota activa.** Es información de juego (dificultad del nivel y
  legibilidad, también para daltonismo), no decoración.
- **La textura del fondo 3D.** `Background3D` la dibuja una vez en un `CanvasTexture`;
  regenerarla por tema costaría CPU en cada cambio. El ambiente llega a la partida
  por el color del cielo (`<color attach="background">`) y un **velo estático** de CSS
  sobre el canvas, pegado a los bordes para no lavar el centro, que es donde vive el
  tablero. Consecuencia honesta: **el relieve de la jungla sigue siendo verde en
  todos los ambientes**; cambia la atmósfera, no el decorado.

### Reglas del inventario (y dónde viven)

Cuatro invariantes, todas en `inventorySystem.js` (puro) y aplicadas en `useRewards`:

1. No se compra lo que no está en el catálogo.
2. No se compra dos veces (ni se cobra dos veces).
3. No se compra sin saldo.
4. No se equipa lo que no está desbloqueado.

La (2) y la (3) están reforzadas en el almacenamiento: `spendBones` devuelve **null**
si no llega el saldo en vez de recortar a cero, así que quien llama puede distinguir
"cobrado" de "no te llega" y no entregar el artículo igualmente. Y rechaza importes
negativos — si no, un artículo con precio −100 sería una forma de fabricar huesos.

La (4) se comprueba **al leer**: `getEquipped` devuelve el valor por defecto si el id
equipado no está entre los que de verdad se poseen. Verificado poniendo a mano
`dinocolor.shop.theme = 'volcano'` sin haberlo comprado: el juego arranca con la
selva clásica.

### Orden de los CSS

`shop.css` va **el último** en `main.jsx`: además de la tienda, contiene los
AMBIENTES, que redefinen variables ya usadas por `game.css` y `auth.css`. Al vivir
en `[data-theme]` sobre `.app-frame` ganan por especificidad, sin un solo `!important`.

Si añades un color de interfaz, **úsalo desde una variable**. Los que iban escritos a
mano en verde (la pestaña de capítulo activa, la sombra inferior del botón primario)
se quedaban descolgados al equipar un ambiente neón o volcánico, y hubo que ir a
buscarlos uno a uno.
