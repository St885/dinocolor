# DinoColor — STATUS

> Estado del proyecto. Actualizar al cerrar cada iteración.

**Versión:** 0.4.0 — estrellas, capítulos, tutorial y pulido de rendimiento
**Fecha:** 2026-07-28
**Stack:** React 18 + Vite 5 + Three.js + @react-three/fiber (JavaScript/JSX)

---

## 🌟 Iteración 2026-07-28 — Progresión, claridad y pulido

Sin cambios de mecánica (sigue siendo "pulsa las pelotas activas antes de que se
apaguen"), sin dependencias nuevas, sin tocar los 42 niveles ni el scoring base.
Validado jugando en Chrome real con WebGL (390×844, build de producción con CSP).

### 🎁 Sistema de estrellas (1–3 por nivel)

El menú solo distinguía "superado / no superado" con una ⭐ decorativa: **ganar
raspando y ganar de sobra se veían idénticos**, así que no había ninguna razón para
volver a un nivel ya pasado. Ahora la puntuación final da estrellas:

| Estrellas | Condición |
|---|---|
| ⭐ | superar la meta (si ganaste, nunca te quedas en cero) |
| ⭐⭐ | ≥ 120 % de la meta |
| ⭐⭐⭐ | ≥ 150 % de la meta |

`computeStars` / `pointsToNextStar` son **puros** (`scoringSystem.js`) y no tocan la
condición de victoria: ganar sigue siendo llegar a la meta. Se persisten en
`dinocolor.stars` como **cadena de dígitos** (un carácter por nivel, 42 bytes) para no
introducir `JSON.parse` y mantener el criterio de `docs/SECURITY.md`. Un valor corrupto
degrada a 0 estrellas en ese nivel. El menú muestra el total (`⭐ 1/126`).

### 📖 El selector de 42 niveles, por capítulos

Se pintaban las 42 tarjetas de golpe: 14 filas, ~1.400 px de scroll, y una **pared de
tarjetas bloqueadas** como primera impresión. Ahora hay 5 capítulos (los tramos que ya
definía `levels.js`) en `src/data/chapters.js`, se muestra **uno a la vez** y el menú se
abre en el capítulo donde va el jugador. Cabecera, récord y pestañas viven **fuera** del
área con scroll, así que cambiar de tramo no obliga a volver arriba.

`validateChapters` (en `levelValidation.js`, se ejecuta en dev junto a `validateLevels`)
comprueba que los capítulos **cubren los 42 niveles sin huecos ni solapes**: un nivel
fuera de todo capítulo sería invisible en el selector.

### 🎓 Tutorial del nivel 1

El juego lanzaba al jugador directamente a la partida; la única pista era una línea
pequeña en la portada. Ahora el nivel 1 abre con 4 pasos (qué tocar, cuánto tiempo hay,
cuál es la meta, para qué son las estrellas) **una sola vez**
(`dinocolor.tutorialSeen`). Mientras está abierto la partida arranca **congelada**
(`startPaused` en `useGameLoop`): leer no cuesta tiempo ni bolas.
*Verificado: 0:32 → 0:32 tras 3 s con el tutorial abierto, 0 fallos acumulados.*

### 🐛 Bugs corregidos

| # | Sev | Bug | Dónde |
|---|---|---|---|
| 1 | Media | **T-Rexo se quedaba celebrando para siempre.** El efecto salía con `return undefined` si el evento no era un acierto, pero su cleanup (`clearTimeout`) corría igual: la secuencia acierto → fallo dejaba el temporizador cancelado con `cheer` en `true`, y el mini T-Rexo seguía dando saltos mientras el jugador fallaba, hasta el siguiente acierto. | `MiniDinoWalker` |
| 2 | Media | **El chip 🏆 del HUD mostraba el récord GLOBAL.** Jugando el nivel 1 (meta 300) ponía "🏆 2050" (récord del nivel 42): una cifra imposible de batir que no orientaba nada. Ahora es el récord **de ese nivel** (`dinocolor.best.<id>`), y dice "Sin récord" si no lo hay. | `GameHUD`, `storageSystem` |
| 3 | Media | **El chip de combo mentía.** Mostraba `🔥 x4` con la RACHA, no con el multiplicador (que en ese momento era ×1,5): parecía que cada acierto valía 4 veces más. Ahora se ve la racha y, al lado, el multiplicador real cuando está activo — y también viaja pegado a los puntos en el popup. | `GameHUD` |
| 4 | Media | **El canvas 3D seguía dibujando a 60 fps con el juego congelado** (pausa, tutorial o nivel terminado), con el overlay de pausa añadiendo un `backdrop-filter` a pantalla completa encima. `frameloop="demand"` cuando no hay partida en curso. | `GameScene`, `DinoMascot` |
| 5 | Baja | **Una tarjeta bloqueada no decía qué nivel era**: el 🔒 sustituía al número. Con las 42 en lista lo delataba la posición; dentro de un capítulo, no. El candado pasa a ser insignia de esquina. | `MenuScene` |
| 6 | Baja | **Los dos fallos decían lo mismo** ("¡FALLO!"). Dejar apagarse una pelota no es el mismo error que pulsar una apagada → "¡SE APAGÓ!" / "¡FALLASTE!". | `GameHUD` |
| 7 | Baja | Textos por debajo del mínimo legible en móvil: `.mini-dino2-label` 0,52 rem (~8 px), dificultad de nivel 0,6 rem (~10 px), pistas 0,72–0,76 rem. | `game.css` |
| 8 | Baja | `ResultScene` recibía `soundEnabled` y no lo usaba nunca (prop muerta). | `App`, `ResultScene` |

### 🎨 Mejoras visuales

1. **Selector por capítulos** — 5–10 tarjetas por pantalla en vez de 42 seguidas.
2. **Cuatro estados de nivel legibles**: bloqueado (número + 🔒, apagado), disponible
   (anillo pulsante + etiqueta **AQUÍ**), completado (1–2 ⭐) y **perfecto** (3 ⭐ con
   borde dorado, un estado que antes no existía).
3. **Estrellas con entrada escalonada** en el resultado (caen una a una): la recompensa
   se *siente*, no solo se informa.
4. **Insignia RÉCORD** y **¡NUEVO!** cuando se batió algo, en la pantalla de resultado.
5. **La derrota explica el margen** ("te faltaron 90") y **la victoria también**
   ("superada por 25"): antes solo había una cifra desnuda.
6. **Mensaje de T-Rexo según el rendimiento real** (precisión, fallos, récord, perfecto)
   en vez de una frase fija. Va en el globo que ya existía: cero altura extra.
7. **Gancho de estrellas**: "+35 puntos para la estrella 2 ⭐" y botón **Repetir** junto
   a Menú cuando quedan estrellas — la primera razón real para rejugar un nivel.
8. **Contraste y tamaños** subidos en HUD, tarjetas y pistas (ver bug 7).
9. **Popup de puntos con el multiplicador** de combo pegado a la cifra.
10. **Tutorial ilustrado**: el primer paso es una pelota encendida en miniatura que
    late, no un texto que describe la pelota.

### ⚡ Rendimiento (medido, no supuesto)

Ventana de **6 s con el juego en PAUSA** (todo congelado, así que solo se mide el
trabajo que el juego hace sin necesidad), `Performance.getMetrics`, antes vs. después:

| Métrica | Antes | Después |
|---|---|---|
| ScriptDuration | 0,058 s | **0 s** |
| LayoutCount | 55 | **0** |
| RecalcStyleCount | 107 | **30** |

1. **El canvas se duerme** (`frameloop="demand"`) en pausa, tutorial y fin de nivel —
   es lo que lleva ScriptDuration a 0. El canvas del mini T-Rexo solo se duerme cuando
   el modelo ya está en pantalla (en "demand" dependería de una invalidación).
2. **`meta-shine` y `btn-shine` animaban `left`** → layout + repaint en cada frame,
   encima del canvas WebGL, durante toda la partida. Con `transform: translateX` lo
   resuelve el compositor: es el cambio que explica los **55 → 0 layouts** (un canvas
   congelado no provoca layout).
3. **`.hud-flash` usaba `box-shadow: inset 0 0 130px` a pantalla completa** en CADA
   acierto y CADA fallo (varias veces por segundo con 4 pelotas). Ahora es un degradado
   radial animando solo `opacity`.
4. **`Ball3D` sale de `useFrame` en la primera línea** cuando la pelota está apagada y
   quieta (fija antes el estado exacto de reposo, porque los lerps son asintóticos). En
   los niveles fáciles ocho de las nueve pelotas están apagadas todo el rato.
5. **`TreasureChest` memoizado** y con `onClick` estable: vive en el HUD, que se
   re-renderiza con cada punto y cada segundo, y son ~25 nodos SVG con 5 gradientes.
   Además pasa de dos `drop-shadow` encadenados a uno (el halo lo pinta ya el SVG).
6. **El mini T-Rexo deja de pasear** con la partida pausada (además de verse mal).
7. `dist/` sigue en **2,0 MB** y el único GLB descargado sigue siendo
   `dino_color_mascot.glb` (0,9 MB). **Oliver no se ha tocado.**

### ✅ Validaciones

- `npm run build` **verde** (dist 2,0 MB). No hay script de lint/test en el proyecto.
- **Lógica pura en Node** (`validateLevels`, `validateChapters`, `computeStars`,
  `pointsToNextStar`, `comboMultiplier`): 42 niveles y 5 capítulos sin problemas, y los
  umbrales de estrellas verificados en los 42 niveles reales + casos límite
  (meta 0, derrota, tope en 3).
- **Recorrido completo jugado en Chrome real con WebGL** (390×844, producción + CSP):
  **40 de 41 comprobaciones OK**. Start → Menú (5 capítulos, 42 niveles accesibles) →
  tutorial → nivel 1 ganado por un bot que localiza la pelota encendida → resultado con
  ⭐ y RÉCORD → desbloqueo del nivel 2 con estrellas en la tarjeta → pausa/reanudar →
  derrota por tiempo → `localStorage` corrupto.
- **Sin scroll en la partida**, comprobado con un **swipe real de 300 px**: body 0,
  marco 0, escena 0, HUD sin moverse. *(Nota: `scrollHeight - clientHeight` da 84 px
  falsos porque `.app-frame::before` tiene `inset: -10%` y queda recortado por
  `overflow: hidden`; y `el.scrollTop = 9999` también engaña, porque un contenedor con
  `overflow: hidden` sí se puede desplazar por script. Solo el gesto es concluyente.)*
- **0 errores de consola, 0 excepciones, 0 peticiones fallidas.**
- `localStorage` corrupto (`maxLevel=9999`, `stars="XZ!!9999zzz"`,
  `best.1="no-soy-un-numero"`): sin crash, progreso clampado a 42/42, estrellas a 0.

### ⚠️ Conocido y NO regresión

- **`THREE.WebGLRenderer: Context Lost`** aparece ~10 veces en un recorrido largo, al
  desmontarse cada `<Canvas>` en los cambios de escena. **Medido en los dos builds con
  el mismo recorrido: 10 antes y 10 después**, mismo patrón por fase y mismo número de
  canvases. Es el `dispose()` normal de three.js (y sale por `console.log`, no por
  `warn`, así que un filtro de error/warning no lo ve). No afecta al juego.

### ⏳ Pendientes que deja esta iteración

1. **Repintar los pesos de skinning de T-Rexo en Blender** (sigue vigente, ver
   `docs/MASCOT_RIG_PLAN.md`). Es lo único que desbloquea `wave`/`celebrate`/`sad`.
2. **Función real del cofre**: hoy solo responde "¡Muy pronto!". Las estrellas ya dan
   una moneda natural para lo que sea que guarde.
3. **Validación en dispositivo real** (Android gama media / iPhone). Todo lo medido aquí
   es Chrome con SwiftShader: las cifras de CPU valen para comparar antes/después, pero
   **no representan** el coste de GPU de un móvil real.
4. Pantalla de ajustes (volumen, reiniciar progreso — `resetProgress` existe y ya limpia
   estrellas y récords por nivel, pero ninguna pantalla lo llama).
5. Tests automáticos de verdad: la lógica pura ya es testeable (`computeStars`,
   `validateChapters`), pero no hay runner ni script `npm test`.

---

## 🎯 Iteración 2026-07-21 — Niveles, dificultad y seguridad

Sin cambios de mecánica ni dependencias nuevas. Todo validado en navegador (build de
producción, Chromium + WebGL): **0 errores de consola, 0 peticiones fallidas**.

### Niveles: 12 → 42 (reajuste completo de la curva)

Se reescribió `src/data/levels.js` con **42 niveles** y una curva de dificultad **gradual**
en 5 tramos, reajustando también los 12 originales (no solo añadiendo al final):

| Tramo | Niveles | Bolas | reactionTime | Layouts | Meta (pace) |
|---|---|---|---|---|---|
| Tutorial (fácil) | 1–5 | 1 | 2.6 → 2.2s | square3x3 | ~9–16 pts/s |
| Principiante (media) | 6–12 | 1–2 | 2.2 → 1.95s | + cross, diamond, circle | ~17–27 |
| Intermedio (difícil) | 13–22 | 2–3 | 1.9 → 1.65s | + hexagon, triangle, diagonals | ~29–45 |
| Avanzado (extrema) | 23–32 | 3–4 | 1.8 → 1.45s | todos | ~43–65 |
| Experto (extrema) | 33–42 | 4 | 1.4 → 1.1s | todos | ~62–89 |

**Criterios de progresión (ver comentario de `levels.js`):**
- El nivel 1 se gana fácil; 2–3 siguen cómodos.
- Nunca se suben varias dimensiones a la vez: al introducir +1 bola se **afloja** la
  reacción; al acelerar la reacción se bajan las bolas o se sube menos la meta.
- `reactionTime` nunca baja de **1.1s**; `activeBalls` máx **4** (nº sano en móvil);
  nunca supera las celdas del layout.
- `targetScore/totalTime` (pace) sube de forma suave; siempre por debajo de lo alcanzable.
- Sin saltos bruscos entre niveles consecutivos (verificado).
- Se usan **los 7 layouts** (square3x3, cross, diamond, circle, hexagon, triangle, diagonals).

**Validación de niveles:** nuevo `src/systems/levelValidation.js` (validador puro) +
autochequeo en dev (`levels.js` bajo `import.meta.env?.DEV`). Resultado determinista:
**42 niveles, 0 problemas** (ids únicos 1..42, layouts existentes, `activeBalls ≤ celdas`,
sin negativos, reactionTime ≥ 1.1, metas alcanzables). En dev, la consola imprime
"42 niveles validados correctamente ✓".

### Seguridad (ver `docs/SECURITY.md`, nuevo)

Auditoría completa: **0 sinks peligrosos** (`dangerouslySetInnerHTML`/`eval`/`new Function`/
`innerHTML`/`document.write`), **0 `JSON.parse`**, **0 secretos versionados**, storage ya
robusto. Hardening aplicado:
- **CSP** inyectada como `<meta>` solo en el build de producción (`vite.config.js`),
  validada jugando (0 violaciones). `script-src 'self'` bloquea scripts de terceros.
- **Referrer-Policy** `strict-origin-when-cross-origin` en `index.html`.
- **`AudioContext` en try/catch** (un WebView restringido ya no puede "matar" el click).
- **Progreso clampeado** al rango de niveles (localStorage corrupto/heredado ya no
  desbloquea de forma inconsistente).
- `docs/SECURITY.md` documenta datos de localStorage, riesgos, cabeceras recomendadas para
  hosting/Capacitor, política de privacidad y checklist para tiendas.

### Bug corregido (encontrado en la auditoría)

- **[MEDIA] Reanudar tras pausa provocaba fallos masivos.** Las bolas iluminadas guardan
  un `expireAt` absoluto (`performance.now`), que sigue avanzando durante la pausa; al
  reanudar, el primer tick las veía TODAS expiradas → "¡FALLO!" en cadena, combo a 0 y
  pérdida de puntos sin culpa del jugador. `useGameLoop` ahora re-ancla `expireAt` y
  `activatedAt` por el tiempo pausado. **Verificado**: tras 3,5s de pausa, fallos 0→0 y
  combo x3 conservado.

### Validaciones (build de producción, Chromium + WebGL)

- `npm run build` verde (dist **2,0 MB**, solo el GLB de T-Rexo).
- Arranque, Menú (**42 tarjetas**, 41 bloqueadas, "0/42"), jugar y ganar el nivel 1
  (→ desbloquea el 2, ⭐ 1/42), pausa/reanudar, **nivel avanzado (40)** cargado sin fallos,
  derrota por tiempo. Sin scroll en gameplay (0 px).
- Save corrupto (`9999`) → clampado a 42/42, 0 niveles bloqueados, sin crash.
- CSP activa: 0 violaciones, 0 errores de consola, GLB 200.

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
