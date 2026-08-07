---
name: dinocolor-context
description: Contexto base e invariantes de DinoColor (ruta, stack, repo, reglas de oro). Invócala SIEMPRE al empezar cualquier tarea sobre DinoColor para no repetir estas instrucciones en cada prompt.
---

# dinocolor-context

Contexto mínimo y reglas invariantes de DinoColor. Cárgalo al inicio de cualquier tarea del juego; el resto de skills (`dinocolor-qa-visual`, `dinocolor-performance`, etc.) asumen que ya tienes este contexto.

## Qué es

- **DinoColor** es un **juego independiente**, mobile-first, de **reflejos y coordinación**: el jugador pulsa rápido las pelotas que se iluminan en un tablero 3D antes de que se apaguen.
- **Ruta local:** `03_juegos/dinocolor` (trabaja SOLO aquí).
- **Repositorio:** `https://github.com/St885/dinocolor` (rama principal `main`).
- **URL prevista de publicación:** `https://st885.github.io/dinocolor/` (ver `dinocolor-deploy-pages` para el estado real).

## Stack

- **React 18 + Vite 5 + Three.js + React Three Fiber (R3F).**
- **JavaScript / JSX. NO TypeScript.**
- HUD y menús en **DOM** (texto nítido en móvil); tablero y fondo en **3D** (R3F).
- Audio **sintetizado** con Web Audio (sin archivos mp3).
- Persistencia en **localStorage** (con fallback en memoria).
- Android/Capacitor previsto (por eso `base: './'` en Vite — no lo cambies, ver `dinocolor-deploy-pages`).

## Cómo es el juego (para no inventar)

- Tablero 3D de pelotas ("canicas metálicas") sobre una losa; formas: `square3x3`, `cross`, `diamond` (+ extras).
- La **pelota activa** se ilumina con el **color del nivel**: verde (`#39ff88`) en los primeros niveles, y cambia a cian/amarillo/naranja/rosa/morado según sube la dificultad. Lleva además un **anillo de foco** giratorio (legibilidad, también para daltonismo).
- **42 niveles** progresivos en `src/data/levels.js` (única fuente de dificultad), agrupados en **5 capítulos** para el menú (`src/data/chapters.js`). Ambos se autovalidan en dev (`levelValidation.js`).
- **Estrellas 1–3 por nivel** según el margen sobre la meta (`computeStars` en `scoringSystem.js`). No cambian la condición de victoria. Se guardan como cadena de dígitos (sin `JSON.parse`).
- Pantallas: **StartScene → MenuScene → GameScene → ResultScene** (victoria/derrota) + **TutorialOverlay** (nivel 1, una vez), **PauseOverlay** y **ErrorBoundary**.
- Mascota: **T-Rexo** (`dino_color_mascot.glb`, 0,9 MB). Ver `dinocolor-mascot-3d` (hay reglas críticas de animación).
- **Efectos del acierto (v0.6.3):** `src/data/hitEffects.js` agrupa los colores de nivel en **5 familias** (`leaf`, `crystal`, `gold`, `ember`, `magic`) y cada familia decide partículas, onda de choque, matiz del texto y **sonido**. El texto flotante (`components/game/HitFx.jsx` + `styles/fx.css`) es DOM sobre el canvas, con `pointer-events: none`. Son **decorativos**: no tocan mecánica ni puntuación.

## Reglas de oro (invariantes — no las repitas en cada prompt, viven aquí)

1. **Aislamiento:** trabaja solo en `03_juegos/dinocolor`. **No toques** TREXoRoll ni otros juegos (`salva-t-rexo`, `14-familias-de-sangre`, `legendary-adventures`, `tetris-game`, `cavern-clashers`, `troll-castle-wars`…). No mezcles su código ni sus assets.
2. **Mobile-first siempre.** Vertical, botones grandes, texto legible, **sin scroll durante la partida**. El escritorio muestra el juego como un teléfono centrado.
3. **Sin `@react-three/drei`.** Solo `three` + `@react-three/fiber` (GLTFLoader y SkeletonUtils van dentro de `three`).
4. **No añadas dependencias** nuevas sin justificarlo y confirmarlo. No cambies `package.json` salvo necesidad real.
5. **No `git push`, no deploy, no commit automático** sin permiso explícito (ver `dinocolor-git-safe`).
6. **`npm run build` en toda validación importante.** Debe quedar verde.
7. **`dist/` y `node_modules/` fuera de Git** (ya están en `.gitignore`).
8. **Oliver es un asset pesado** (`assets/models/characters/oliver/`, 66 MB entre dos GLB). **No lo uses en runtime ni lo copies a `public/`** sin optimizar a < 5 MB primero (ver `dinocolor-mascot-3d`).
9. **No cambies** mecánica, sistema de niveles, scoring base ni el localStorage base salvo que sea la corrección de un bug real.

## Documentación viva del proyecto

- `docs/STATUS.md` — estado por iteración (última: **v0.6.3**, 2026-08-07).
- `docs/TECHNICAL_NOTES.md` — decisiones y **trampas** (cronómetro en segundo plano, `clearedLevel` vs `maxLevel`, skinning de T-Rexo, luces, etc.). Léelo antes de tocar zonas delicadas.
- `CLAUDE.md` (raíz del proyecto) — reglas detalladas y "no deshacer".
