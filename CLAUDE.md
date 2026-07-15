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

## ⚠️ Tres cosas que NO hay que deshacer (revisión 2026-07-13)

1. **NO vuelvas a usar los modelos "Oliver" como mascota.** Pesan 22 MB y 44 MB (66 MB para jugar
   una partida) y `oliver_character.glb` **solo tiene 1 animación**, por lo que la celebración de
   victoria no existía: ganar y perder se veían idénticos. La mascota es **T-Rexo**
   (`dino_color_mascot.glb`, 0,9 MB). El registro `oliver` sigue en `DinoMascot.jsx` como skin
   premium, pero **ninguna escena debe pedirlo** hasta que esté comprimido a < 5 MB (Draco/KTX2).
   Sus GLB fuente están intactos en `assets/`; la copia servible de `public/` se retiró a propósito
   (era lo que engordaba `dist/` hasta 69 MB).

2. **De los 8 clips de T-Rexo, SOLO `idle` es seguro.** Los demás rompen la malla (le despegan la
   placa del vientre, le colapsan la cabeza). Está protegido con la allowlist `SAFE_CLIPS` en
   `DinoMascot.jsx`. **No la amplíes sin renderizar el clip y mirarlo.** El arreglo de verdad es
   repintar los pesos de skinning en Blender (`assets/models/characters/dino-mascot/*.blend`).
   La emoción (saludo, salto de alegría, cabizbajo) se hace con **poses de cuerpo entero**
   (`POSES` / `MascotRig`), que no pueden romper el esqueleto.

3. **El tablero se encaja en la BANDA LIBRE, no en la pantalla.** `Board3D` reserva las bandas del
   HUD en píxeles (`TOP_RESERVE_PX`, `BOTTOM_RESERVE_PX`) para que nunca se solape con el HUD ni con
   la tarima de T-Rexo. Si cambias la altura del HUD o de la tarima en `game.css`, **actualiza esas
   constantes** o volverán los solapes.

> Detalle completo y demás trampas (cronómetro en segundo plano, `clearedLevel` vs `maxLevel`,
> `key`s de eventos, `useThree` sin selector…) en [`docs/TECHNICAL_NOTES.md`](docs/TECHNICAL_NOTES.md).

## Próximos pasos sugeridos

Ver [`docs/ROADMAP.md`](docs/ROADMAP.md). Prioridad: pulido visual, modelo 3D de mascota,
más layouts, efectos de partículas, y preparación de despliegue (GitHub Pages / Android).
