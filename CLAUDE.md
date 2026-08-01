# CLAUDE.md — DinoColor

Instrucciones para cualquier agente (Claude Code) que trabaje en este proyecto.

## Contexto

**DinoColor** es un juego **3D mobile-first de reflejos**: el jugador pulsa rápido las
pelotas que se iluminan en un tablero. Stack: **React + Vite + Three.js / React Three
Fiber**, JavaScript (JSX), sin TypeScript. Vive en `03_juegos/dinocolor/`.

## Reglas obligatorias

- **Proyecto independiente.** Trabajar **solo** dentro de `03_juegos/dinocolor/`. No tocar
  ni mezclar código/assets de otros juegos (`trexo-roll`, `14-familias-de-sangre`,
  `legendary-adventures`, `salva-t-rexo`, `tetris-game`).
- **Mantener la organización tipo TREXoRoll**: separación clara por carpetas
  (`src/components`, `src/data`, `src/hooks`, `src/scenes`, `src/systems`, `src/utils`,
  `styles`, `docs`, `assets`, `android`, `libs`, `tools`, `www`, `playstore`).
- **Mobile-first siempre.** Diseñar primero para celular en vertical; el escritorio muestra
  el juego centrado como un teléfono. Botones grandes, texto legible, sin scroll en partida.
- **Código modular y limpio.** Nada de archivos gigantes. Lógica pura en `systems/` y
  `hooks/`, vista en `components/` y `scenes/`. Datos en `data/`.
- **No añadir librerías innecesarias.** El MVP usa solo React, Three.js y @react-three/fiber.
  Antes de añadir dependencias (drei, zustand, físicas, etc.), confirmar con Stefano.
- **Assets:** usar placeholders cuando falten (audio sintetizado, mascota SVG). No mezclar
  assets de otros juegos. No borrar `.mp4/.mp3/.png/.wav` sin permiso.
- **Gates de confirmación:** pedir permiso antes de `git push`, deploy a GitHub Pages,
  instalar dependencias nuevas, integrar Capacitor/Android o cambios de arquitectura grandes.
- **Mantener docs al día:** actualizar `docs/STATUS.md` al cerrar cada iteración.

## Arquitectura (resumen)

- `src/data/levels.js` — definición de niveles (única fuente de dificultad).
- `src/data/boardLayouts.js` — formas de tablero (sistema genérico, fácil de extender).
- `src/systems/` — lógica pura: `scoringSystem`, `levelSystem`, `audioSystem`, `storageSystem`.
- `src/hooks/useGameLoop.js` — orquesta la partida (luces, puntuación, victoria/derrota).
- `src/hooks/useTimer.js` — cuenta atrás. `src/hooks/useLevelProgress.js` — progreso guardado.
- `src/scenes/` — pantallas (Start, Menu, Game, Result). `App.jsx` — máquina de estados.
- `src/components/game/` — 3D (Ball3D, Board3D, Background3D) + HUD + mascota.
- `styles/` — `global.css` (base/variables), `mobile.css` (marco responsive), `game.css` (UI).

## Cómo ejecutar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # producción en dist/
```

## Convenciones

- JavaScript + JSX (sin TypeScript). JSX runtime automático (no hace falta `import React`).
- `base: './'` en Vite para que funcione en GitHub Pages (subcarpeta) y Capacitor.
- Todo texto visible está en **español** (público objetivo). Mantener tono amigable/infantil.
- La mascota **T-Rexo** es un **modelo 3D real** servido desde
  `public/assets/models/characters/dino-mascot/dino_color_mascot.glb` (`DinoMascot.jsx`, solo
  `three` + R3F, sin drei). El **SVG es el fallback** si el GLB no carga. No cambiar la API del
  componente (`message`, `mood`, `size`, `animation`/`state`).

## ⚠️ Cosas que NO hay que deshacer (revisiones 2026-07-13 y 2026-08-01)

1. **NO vuelvas a usar los modelos "Oliver" como mascota.** Pesan 22 MB y 44 MB (66 MB para jugar
   una partida) y `oliver_character.glb` **solo tiene 1 animación**, por lo que la celebración de
   victoria no existía: ganar y perder se veían idénticos. La mascota es **T-Rexo**. El registro
   `oliver` sigue en `DinoMascot.jsx` como skin premium, pero **ninguna escena debe pedirlo** hasta
   que esté comprimido a < 5 MB (Draco/KTX2). Sus GLB fuente están intactos en `assets/`; la copia
   servible de `public/` se retiró a propósito (era lo que engordaba `dist/` hasta 69 MB).

2. **El GLB de runtime va OPTIMIZADO — no lo sustituyas por el original de Meshy** (2026-08-01).
   El modelo actual es **T-Rexo v3**: `dino_color_mascot.glb`, **1,3 MB y 42.000 triángulos**.
   La fuente sin optimizar pesa **20,5 MB con 395.058 triángulos** y está guardada aparte en
   `assets/models/characters/dino-mascot/trexo_v3_meshy_source.glb` (gitignored). Copiar la fuente
   a `public/` lleva `dist/` de 2,6 MB a ~22 MB. Si hay que regenerarlo: decimar a ~42k triángulos
   y bajar texturas a 1024/1024/512 con Blender en modo background (receta en
   `docs/TECHNICAL_NOTES.md`). **Techo del proyecto: ningún GLB de runtime > 5 MB.**

3. **`blob:` tiene que estar en `img-src` Y en `connect-src` de la CSP** (`vite.config.js`).
   GLTFLoader carga las texturas embebidas del GLB desde un `Blob` usando `fetch()`, que gobierna
   `connect-src`. Si lo quitas, **la mascota se renderiza gris, sin textura** — y solo en el build,
   porque la CSP no existe en `npm run dev`. Costó un rato encontrarlo; no lo repitas.

4. **La mascota v3 NO tiene esqueleto ni clips.** No es un fallo: la expresividad se hace con
   **poses de cuerpo entero** (`POSES` / `MascotRig`), que mueven el modelo como objeto rígido.
   Toda la maquinaria de clips y la allowlist `SAFE_CLIPS` siguen en `DinoMascot.jsx` a propósito,
   listas para el día que haya un modelo bien riggeado. **No las borres por "código muerto".**
   (Del modelo anterior solo `idle` era seguro: los demás clips rompían la malla.)

5. **El tamaño de la mascota lo mandan las clases, no el JS.** El componente escribe
   `--mascot-size-base` y las clases (`.mascot--hero`, `--result`, `--auth`) escriben
   `--mascot-size`; `.mascot-canvas` usa `var(--mascot-size, var(--mascot-size-base))`.
   **No vuelvas a poner `--mascot-size` en el `style` inline**: gana a la clase y deja muertos
   los `clamp()` responsive (era un bug real, la mascota no se encogía en pantallas bajas).

6. **El tablero se encaja en la BANDA LIBRE, no en la pantalla.** `Board3D` reserva las bandas del
   HUD en píxeles (`TOP_RESERVE_PX`, `BOTTOM_RESERVE_PX`) para que nunca se solape con el HUD ni con
   la tarima de T-Rexo. Si cambias la altura del HUD o de la tarima en `game.css`, **actualiza esas
   constantes** o volverán los solapes.

7. **El progreso NO se ata a la cuenta** (2026-08-01). Niveles, récords y estrellas viven en
   `localStorage` bajo `dinocolor.*` y son del DISPOSITIVO. Iniciar o cerrar sesión no los toca.
   Separarlos por `uid` sin sincronización en la nube haría que cualquier jugador existente viera
   desaparecer su progreso al entrar con cuenta por primera vez. Ver `docs/AUTH.md` §3.

> Detalle completo y demás trampas (cronómetro en segundo plano, `clearedLevel` vs `maxLevel`,
> `key`s de eventos, `useThree` sin selector…) en [`docs/TECHNICAL_NOTES.md`](docs/TECHNICAL_NOTES.md).

## Próximos pasos sugeridos

Ver [`docs/ROADMAP.md`](docs/ROADMAP.md). Prioridad: pulido visual, modelo 3D de mascota,
más layouts, efectos de partículas, y preparación de despliegue (GitHub Pages / Android).

---

## AISLAMIENTO OBLIGATORIO DEL PROYECTO

### Identidad del proyecto

- **Nombre:** `DinoColor`
- **Ruta absoluta:** `/Users/stefanofrontado/Desktop/Programacion IA/03_juegos/dinocolor`
- **Carpeta Git esperada (repositorio propio):** `/Users/stefanofrontado/Desktop/Programacion IA/03_juegos/dinocolor`

`git rev-parse --show-toplevel` **debe** devolver exactamente `/Users/stefanofrontado/Desktop/Programacion IA/03_juegos/dinocolor`. Si devuelve otra ruta,
un ancestro, o `fatal: not a git repository`, **detente**: el proyecto se abrió desde el sitio
equivocado. No ejecutes ningún comando Git fuera de esta carpeta.

Esta sesión debe trabajar **exclusivamente** dentro de este proyecto.

### Validación obligatoria antes de actuar

Antes de inspeccionar, editar, ejecutar pruebas o usar Git, comprueba SIEMPRE que estás en el
sitio correcto:

```bash
pwd                        # debe estar dentro de /Users/stefanofrontado/Desktop/Programacion IA/03_juegos/dinocolor
git rev-parse --show-toplevel   # ver la regla de Git de arriba
```

Si `pwd` no está dentro de la ruta de este proyecto, **detente**: el juego no se abrió desde su
propia carpeta raíz. No adivines la ruta ni «te muevas» a ella con `cd` para forzar el arranque;
avisa de que el proyecto se abrió mal.

### Aislamiento y concurrencia (proyectos hermanos)

- `03_juegos/` contiene **varios juegos independientes**. Los cambios en CUALQUIER otro juego
  (por ejemplo en `trexo-roll`, `salva-t-rexo`, `legendary-adventures`, `troll-castle-wars`,
  `cavern-clashers`…) **no son concurrencia de
  este proyecto** y **no deben interpretarse como tal**: ignóralos por completo. Solo cuentan los
  ficheros DENTRO de `/Users/stefanofrontado/Desktop/Programacion IA/03_juegos/dinocolor`.
- **No mezcles contextos** entre juegos: documentación, decisiones, convenciones de código,
  paletas ni dependencias de un juego no aplican a otro.
- **No modifiques, leas para editar, ni ejecutes** nada en otro proyecto de `03_juegos/`, aunque
  parezca relacionado. Si un cambio necesitara tocar dos juegos, **detente y repórtalo** antes de
  actuar.
- Si detectas ediciones concurrentes **dentro de este mismo proyecto** que tú no has hecho (un
  fichero que cambia entre tus propios comandos), asume que **hay otra sesión trabajando aquí**:
  **detente, no sigas editando y avisa** — no intentes «ganar» la carrera de ediciones.

### Git y raíz del workspace

- **Nunca ejecutes Git desde la raíz general** `~/Desktop/Programacion IA` ni desde
  `03_juegos/`: no son repositorios del proyecto. Ejecuta Git solo dentro de la carpeta de este
  juego (o no lo ejecutes, si no tiene repositorio propio).
- No hagas `push`, `deploy`, ni cambios de rama/historial sin autorización explícita de Stefano.

*(Bloque de aislamiento estándar del workspace — añadido por el agente-orquestador de
mantenimiento. Documental: no cambia código, assets ni configuración de build.)*
