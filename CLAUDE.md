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

## Próximos pasos sugeridos

Ver [`docs/ROADMAP.md`](docs/ROADMAP.md). Prioridad: pulido visual, modelo 3D de mascota,
más layouts, efectos de partículas, y preparación de despliegue (GitHub Pages / Android).
