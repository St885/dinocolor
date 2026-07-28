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
