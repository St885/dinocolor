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
  `Board3D` centra y **auto-escala** el conjunto a un marco fijo, así cualquier forma encaja.
- **Glow falso:** no se usa post-procesado (bloom). El brillo se simula con `emissive` +
  un halo translúcido additive + una `pointLight` por pelota activa. Si el rendimiento en
  gama baja sufre, reducir/eliminar las `pointLight`.

## Audio

`audioSystem.js` **sintetiza** los efectos con osciladores Web Audio, así suena sin
archivos. El `AudioContext` se crea/reanuda en el **primer gesto del usuario** (botón) vía
`unlock()` (política de autoplay de los navegadores/móvil).

Para usar **audio real** (mp3): añadir los archivos (ver `assets/README.md`), cargarlos
como buffers en `audioSystem.js` y reproducirlos en lugar de —o además de— la síntesis.
Rutas previstas: `assets/audio/sfx/{hit,miss,win,lose}.mp3`,
`assets/audio/music/dinocolor_theme.mp3`.

## Rendimiento / cosas a vigilar

- Nº de `pointLight` activas = `activeBalls`. En niveles con 4 pelotas + gama baja, vigilar.
- `dpr={[1,2]}` en el `Canvas` limita el devicePixelRatio para no sobrecargar móviles.
- `StrictMode` (solo dev) monta efectos dos veces; el bucle está protegido con flags.

## Mascota 3D (integrada) — multi-modelo con fallback

`DinoMascot.jsx` es un widget DOM autocontenido (su propio `<Canvas>`) que carga modelos GLB
**sin `@react-three/drei`**: usa `GLTFLoader` y `SkeletonUtils` (ambos dentro de `three`) vía
`useLoader`. Soporta **varios modelos con prioridad + fallback**:

- **StartScene** usa `<DinoMascot model="oliver" animation="idle" />` → intenta en orden
  `oliver_character.glb` (**principal temporal por peso**) → `oliver_master.glb` (**fallback de mayor
  calidad**) → `dino_color_mascot.glb` → placeholder SVG.
- El resto de escenas (**ResultScene**) usan `<DinoMascot />` (sin `model`) → `dino_color_mascot.glb` → SVG.
- Registro de modelos en `MODELS`; también admite `modelPath`/`fallbackModelPath` explícitos.

**Rutas runtime** (servidas desde `public/`, con `import.meta.env.BASE_URL`; en dev resuelven a
`/assets/...`):
```
/assets/models/characters/oliver/oliver_character.glb     (principal temporal, ~23 MB)
/assets/models/characters/oliver/oliver_master.glb        (fallback, mayor calidad, ~44 MB)
/assets/models/characters/dino-mascot/dino_color_mascot.glb (fallback anterior)
```
Los GLB de Oliver se **copiaron desde TREXoRoll** a `assets/models/characters/oliver/` (fuente) y a
`public/assets/models/characters/oliver/` (runtime). TREXoRoll no se modificó.

Otros detalles: **normalización automática** por bounding-box (escala a `targetHeight`, pies en
y=0, centrado x/z → cualquier modelo sale grande, centrado y sin cortes); **resolución difusa** de
animación (`idle` → `Idle_02` en Oliver, que trae 11 clips Mixamo); `ErrorBoundary` por URL que
avanza al siguiente candidato; balanceo idle suave (`MascotRig`). API del placeholder intacta
(`message`, `mood`, `size`) + `animation`/`state`/`model`/`targetHeight`/`cameraDistance`.

> ⚠️ **Peso:** se usa `oliver_character.glb` (**~23 MB**) como **principal temporal** por rendimiento;
> `oliver_master.glb` (**~44 MB**, mayor calidad, 11 animaciones) queda como **fallback**. Ambos siguen
> siendo **pesados para móvil/web**. **Próxima mejora recomendada:** optimizar el modelo a un objetivo
> ideal **< 5 MB** (Draco/KTX2, texturas más pequeñas o re-export). No versionar estos binarios sin Git LFS.

> El **encuadre de cámara del modelo** (`cameraDistance`, fov) se mantiene estable a propósito:
> tocarlo a ciegas puede recortar/deformar la mascota. Su presentación se ajusta por **luces** y
> por el "escenario" CSS (`.mascot-canvas::before`), no moviendo la cámara sin ver el render.

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
