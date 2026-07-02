# 🦖 DinoColor

**DinoColor** es un juego **3D mobile-first de reflejos y velocidad de reacción**.
El jugador ve un tablero de pelotas grises; en cada ronda una o varias se iluminan
de color y hay que **pulsarlas rápido** antes de que se apaguen. Inspirado en los
ejercicios de reflejos que usan los porteros de fútbol.

Construido con **React + Vite + Three.js (React Three Fiber)**. Pensado primero para
celular (vertical), compatible con escritorio, y preparado para empaquetarse como app
Android con **Capacitor** y desplegarse en **GitHub Pages**.

> Proyecto **independiente** dentro del workspace `Programacion IA`. No comparte código
> ni assets con otros juegos (ver `CLAUDE.md`).

---

## 🎮 Cómo se juega

1. Pulsa **Jugar** → elige un nivel en el menú.
2. Toca las pelotas que se **iluminan de color** antes de que se apaguen.
3. Suma puntos hasta alcanzar la **meta** antes de que se acabe el tiempo.
4. Si fallas (pulsas una apagada o dejas que se apague una encendida) pierdes puntos.
5. Encadena aciertos para subir el **combo** y multiplicar la puntuación.

---

## 🚀 Instalación y ejecución

Requisitos: **Node.js 18+**.

```bash
cd 03_juegos/dinocolor
npm install      # instala dependencias (genera node_modules y package-lock.json)
npm run dev      # arranca Vite en http://localhost:5173
```

### Comandos principales

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (hot reload) |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve el build de producción para probarlo |
| `npm run cap:add` | (Futuro) Añade la plataforma Android (Capacitor) |
| `npm run cap:sync` | (Futuro) Compila web y sincroniza con Android |
| `npm run cap:open` | (Futuro) Abre el proyecto en Android Studio |

---

## 🧩 Dónde modificar el juego

- **Niveles** (dificultad, tiempos, metas, colores): [`src/data/levels.js`](src/data/levels.js)
- **Formas de tablero** (square3x3, cross, diamond… y añadir nuevas): [`src/data/boardLayouts.js`](src/data/boardLayouts.js)
- **Puntuación / combos**: [`src/systems/scoringSystem.js`](src/systems/scoringSystem.js)
- **Sonidos**: [`src/systems/audioSystem.js`](src/systems/audioSystem.js)
- **Lógica de partida**: [`src/hooks/useGameLoop.js`](src/hooks/useGameLoop.js)
- **Estilos**: [`styles/`](styles/) (`global.css`, `mobile.css`, `game.css`)

> Añadir un nivel = agregar un objeto a `LEVELS`. Añadir una forma = agregar un array de
> celdas `[col, row]` a `BOARD_LAYOUTS`. No hace falta tocar el motor del juego.

---

## 📁 Estructura

```
dinocolor/
├─ src/
│  ├─ components/  (game/ ui/ layout/)   → componentes React (3D y UI)
│  ├─ data/        (levels, boardLayouts) → configuración del juego
│  ├─ hooks/       (useGameLoop, useTimer, useLevelProgress)
│  ├─ scenes/      (Start, Menu, Game, Result)
│  ├─ systems/     (scoring, level, audio, storage)
│  ├─ utils/       (random, formatTime)
│  ├─ App.jsx      → máquina de estados de pantallas
│  └─ main.jsx     → punto de entrada
├─ styles/         → CSS (global, mobile, game)
├─ assets/         → audio, imágenes, modelos, texturas (placeholders)
├─ docs/           → GDD, STATUS, ROADMAP, notas técnicas y de Play Store
├─ android/        → (futuro) proyecto Capacitor/Android
├─ libs/ tools/ www/ playstore/  → carpetas de soporte (ver sus README)
├─ index.html · vite.config.js · capacitor.config.json · manifest.webmanifest
└─ package.json
```

---

## 📦 Estado del MVP

✅ **MVP jugable y pulido.** Pantallas (inicio, menú, juego, resultado) · tablero 3D · timer ·
iluminación de pelotas · interacción táctil/click · puntuación + combos · victoria/derrota ·
niveles progresivos · guardado local · sonidos sintetizados · **mascota 3D T-Rexo** (con fallback
SVG). Tras una **revisión multi-agente y 3 ciclos de pulido** (layout/HUD, fondo, feedback,
presentación de T-Rexo), `npm run build` queda **verde**.

> **StartScene** usa ahora el modelo **"Oliver"** (T-Rexo azul de alta calidad, copiado desde
> TREXoRoll) con carga por prioridad `oliver_character.glb` (~23 MB, principal temporal) →
> `oliver_master.glb` (~44 MB, fallback de mayor calidad) → `dino_color_mascot.glb` → SVG. El texto
> sigue siendo "Hola, soy T-Rexo". ⚠️ Ambos son pesados: **próxima mejora, optimizar a < 5 MB**
> (Draco/KTX2). Ver `docs/TECHNICAL_NOTES.md`.

Ver detalle en [`docs/STATUS.md`](docs/STATUS.md) y plan en [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## 🔜 Próximas mejoras

Modelo 3D real de la mascota, más formas de tablero, efectos/partículas, tienda y skins,
logros, eventos diarios, anuncios recompensados y publicación en Android. Detalle en
[`docs/ROADMAP.md`](docs/ROADMAP.md).
