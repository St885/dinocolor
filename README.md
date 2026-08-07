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
6. Cuanto **más rápido** llegues a la meta, más **estrellas** (1–3) te llevas.

### ⭐ Estrellas, 🦴 huesos y 📜 misiones

- **Estrellas (1–3):** se ganan por RAPIDEZ — por el tiempo que sobra al alcanzar la
  meta. Ganar da 1⭐; llegar con ≈45 % del tiempo sin gastar, 2⭐; con ≈65 %, 3⭐.
  Se guardan por nivel y solo mejoran, así que repetir un nivel nunca resta.
- **Huesos 🦴:** moneda **local y decorativa**. Se ganan al superar un nivel, al
  conseguir estrellas nuevas, al batir un récord y al completar misiones. No se
  compran, no salen del dispositivo y **no afectan a la dificultad**.
- **Misiones de hoy:** tres retos diarios (ganar N niveles, un combo de x5, un nivel
  sin fallar…). Se renuevan a tu medianoche local, funcionan **sin conexión y en modo
  invitado**, y su recompensa se cobra sola al terminar la partida.

### 🔥 Racha diaria y 🏅 desafío del día

- **Racha:** entra cada día y reclama tu recompensa. Siete días seguidos suben de
  20 a **180 huesos**; si te saltas un día, la racha vuelve a empezar.
- **Desafío de hoy:** un reto especial distinto cada día (un combo de x8, dos
  niveles sin fallar, ganar con 85 % de precisión…), mejor pagado que las
  misiones. El botón te lleva directo a donde hacerlo.

Ambos son **locales**: funcionan sin conexión, sin cuenta y en modo invitado.

### 🛍️ Tienda

Los huesos se gastan en la tienda (se entra desde el contador de huesos del menú):

- **5 aspectos de T-Rexo** — clásico (gratis), tropical, volcánico, cristal y dorado.
  Todos usan el **mismo modelo 3D**: cambian parámetros de material, así que no
  añaden ni un byte de descarga.
- **5 ambientes** — selva clásica (gratis), amanecer tropical, cueva neón, volcán
  naranja y cristales morados. Visten menú, portada, tienda, resultado y partida.

**Sin dinero real, sin packs y sin nada que caduque.** Ninguna compra afecta a la
dificultad ni desbloquea niveles: es decoración.

### ✨ Efectos al acertar

- **Cada color se siente distinto.** Las pelotas verdes, cian, doradas, naranjas y
  rosas/moradas tienen sus propias partículas, su onda de choque y **su sonido**.
- **Puntuación flotante:** el `+N` sale sobre la pelota que acabas de tocar, y
  «¡RÁPIDO!» si has entrado en el bonus de rapidez.
- **Combos con celebración:** al llegar a x3, x5, x8 y x12 aparece su rótulo, suena un
  arpegio y se enciende un aura en los bordes de la pantalla que sube con la racha.
- **Al fallar** el aviso cae en naranja con una sacudida breve: se nota, pero no castiga.

Todo esto es **decorativo**: no cambia la mecánica, ni la puntuación, ni la dificultad.
Si tienes activado *reducir movimiento* en el sistema, la sacudida y el latido del aura
se desactivan solos.

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

✅ **MVP jugable y pulido** (v0.4.0). **42 niveles** progresivos con **estrellas (1–3 por nivel)** ·
pantallas (inicio, menú por capítulos, **tutorial**, juego, **pausa**, resultado) · tablero 3D ·
timer · iluminación de pelotas · interacción táctil/click · puntuación + combos · victoria/derrota ·
guardado local · sonidos sintetizados · **mascota 3D T-Rexo** (con fallback SVG y pantalla de
error). `npm run build` **verde**, recorrido completo jugado en navegador con WebGL:
**0 errores de consola**.

**Iteración 2026-08-07** (v0.6.3 · impacto del acierto):

- ✨ **Efectos distintos por color** (5 familias), **puntuación flotante** sobre la
  pelota tocada, **celebración de combo** en 4 escalones y feedback de fallo legible.
- 🔊 **Sonido por familia** y arpegio al cruzar un escalón de combo — sintetizados,
  **sin un solo byte de audio descargado**.
- ⚡ **Coste medido**: 22,8 ms de script por segundo martilleando el tablero (≈0,23 ms
  por frame a 60 fps) frente a 8,9 ms con la escena quieta; tope duro de 6 textos y 14
  partículas; nodos DOM 218 → 233 y heap plano.
- ✅ Validado en Chrome real con WebGL a 390×844 y 360×640: **0 errores de consola, 0
  peticiones fallidas, 0 violaciones de CSP**, y misiones/tienda/racha/desafío intactos.

**Iteración 2026-07-28** (progresión · claridad · rendimiento):

- ⭐ **Estrellas 1–3 por nivel** según el margen sobre la meta, con contador global
  (`⭐ 1/126`), insignia de nivel **perfecto** y "+35 puntos para la estrella 2" al terminar:
  la primera razón real para rejugar un nivel ya superado.
- 📖 **El selector de 42 niveles pasa a 5 capítulos** (uno a la vez, abierto donde va el
  jugador) en vez de una pared de 14 filas y ~1.400 px de scroll.
- 🎓 **Tutorial del nivel 1** (una sola vez) con la partida **congelada** mientras se lee:
  leer no cuesta tiempo ni bolas.
- 🐛 **8 bugs**, entre ellos: T-Rexo se quedaba celebrando para siempre tras un acierto
  seguido de un fallo; el chip 🏆 mostraba el récord global (2050) jugando el nivel 1 (meta
  300); y el chip de combo mostraba la racha (`x4`) como si fuera el multiplicador (×1,5).
- ⚡ **Rendimiento medido** en 6 s de pausa: ScriptDuration 0,058 s → **0 s**, layouts
  **55 → 0** (el canvas se duerme con `frameloop="demand"` y los brillos animan `transform`
  en vez de `left`). `dist/` sigue en **2,0 MB**.

**Iteración 2026-07-21** (niveles · dificultad · seguridad):

- 🎚️ **De 12 a 42 niveles**, con la curva de dificultad reajustada de arriba abajo en 5 tramos
  (tutorial → experto), sin saltos bruscos y con validador automático (42 niveles, 0 problemas).
- 🔒 **Hardening de seguridad**: CSP en el build, Referrer-Policy, `AudioContext` a prueba de
  fallos y progreso clampeado. Auditoría sin sinks peligrosos ni secretos. Ver
  [`docs/SECURITY.md`](docs/SECURITY.md).
- 🐛 **Bug corregido**: reanudar tras pausa ya no provoca fallos masivos (los plazos de las bolas
  se congelan con la pausa, como el cronómetro).

**Revisión integral 2026-07-13** (bugs · UX · visual · rendimiento). Lo más gordo:

- 🪶 **La descarga de modelos 3D pasa de 66 MB a 0,9 MB** y `dist/` de **69 MB a 2,0 MB**. Antes se
  cargaban dos GLB de "Oliver" (22 MB + 44 MB); ahora la mascota es **T-Rexo**
  (`dino_color_mascot.glb`, 0,9 MB), que además es el modelo oficial del juego.
- 🏆 **Ganar y perder ya no se ven igual.** El modelo que se cargaba solo tenía 1 animación, así que
  la celebración de victoria nunca existió. Ahora T-Rexo **salta de alegría** al ganar y se queda
  **cabizbajo** al perder.
- ⏱️ **Se acabó el tiempo infinito**: minimizar la app y volver reiniciaba el cronómetro a cero
  segundos consumidos.
- ⏸️ **El botón de pausa pausa de verdad** (antes salía al menú y perdías la partida sin aviso).
- 💯 **El juego se puede completar al 100 %**: superar el último nivel no contaba y el progreso se
  quedaba clavado en 11/12 para siempre.

⚠️ **Pendiente importante:** de los 8 clips del GLB de T-Rexo **solo `idle` es usable**; los demás
rompen la malla (pesos de skinning mal pintados). Hay que **repintarlos en Blender**. Mientras
tanto, la emoción se consigue con poses de cuerpo entero. Ver `docs/TECHNICAL_NOTES.md`.

Ver detalle en [`docs/STATUS.md`](docs/STATUS.md) y plan en [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## 🔜 Próximas mejoras

Repintar los pesos de T-Rexo en Blender (desbloquea sus animaciones), comprimir los GLB de Oliver a
< 5 MB para recuperarlo como skin premium, más formas de tablero, función real del cofre, logros, y publicación en Android. Detalle en [`docs/ROADMAP.md`](docs/ROADMAP.md).
