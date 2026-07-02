# DinoColor — Game Design Document (GDD)

## 1. Concepto

DinoColor es un juego **3D mobile-first de reflejos y velocidad de reacción** con
temática **jurásica** amigable. El jugador observa un tablero de pelotas grises; en cada
ronda una o varias se **iluminan de color** y debe **pulsarlas rápido** antes de que se
apaguen. La dinámica está inspirada en los **ejercicios de reflejos de los porteros de
fútbol**, que reaccionan a estímulos visuales repentinos.

Público objetivo: niños y público casual. Sesiones cortas, satisfactorias y rejugables.

## 2. Mecánica principal

- El tablero tiene una **forma** (3×3, cruz, diamante…). Cada posición es una pelota.
- Cada cierto tiempo (`reactionTime`) se iluminan `activeBalls` pelotas a la vez.
- El jugador pulsa (táctil o click) las pelotas iluminadas:
  - **Acierto** → suma puntos (más si es rápido) y sube el **combo**.
  - **Pulsar una apagada** → penalización y se rompe el combo.
  - **No pulsar a tiempo** (la pelota se apaga sola) → penalización y combo roto.
- Se gana al alcanzar la **puntuación objetivo** (`targetScore`) antes de que acabe el
  tiempo (`totalTime`). Se pierde si el tiempo llega a 0 sin alcanzarla.

## 3. Sistema de niveles

Definido en `src/data/levels.js`. Cada nivel especifica:

| Campo | Significado |
|---|---|
| `id` | Identificador y orden |
| `name` | Nombre visible |
| `layout` | Forma de tablero (id de `boardLayouts`) |
| `activeBalls` | Pelotas iluminadas a la vez |
| `totalTime` | Duración (s) |
| `reactionTime` | Tiempo que una pelota permanece encendida (s) |
| `targetScore` | Puntuación para ganar |
| `penalty` | Puntos restados al pulsar una apagada |
| `activeColor` | Color del brillo |
| `difficulty` | Etiqueta visual (facil/media/dificil/extrema) |

**Curva de dificultad:** se sube combinando — más pelotas activas, menos tiempo de
reacción, menos tiempo total y mayor meta — además de cambiar la forma del tablero.
Ejemplos: N1 (3×3, 1 pelota, 2.5s, meta 300) → N5 (3×3, 2 pelotas, 2.0s, meta 600) →
N10 (diamante, 3 pelotas, 1.5s, meta 900).

## 4. Sistema de puntuación

Definido en `src/systems/scoringSystem.js`:

- **Acierto rápido** (dentro del 45% del tiempo de reacción): **+100**
- **Acierto normal**: **+50**
- **Pulsar apagada**: **−25** (configurable por nivel con `penalty`)
- **No pulsar a tiempo**: **−50**
- **Combo**: cada 3 aciertos seguidos el multiplicador sube +0.5 (tope ×3).
- La puntuación nunca baja de 0.

HUD muestra: nivel, tiempo restante, puntuación, meta, combo, aciertos y fallos.

## 5. Formas de tablero

En `src/data/boardLayouts.js`. MVP: `square3x3`, `cross`, `diamond`. Ya preparadas
(funcionan igual): `circle`, `hexagon`, `triangle`, `diagonals`. Añadir una forma nueva
es solo crear un array de celdas `[col, row]` y registrarlo.

## 6. Estilo visual

- Fondo de **jungla nocturna / jurásica** (gradientes + niebla 3D + siluetas de helechos).
- Tablero **flotante** sobre una base de piedra.
- Pelotas grises **brillantes**; al activarse, **glow** de color con pulso y luz puntual.
- Feedback al acertar (destello verde, popup “+100”) y al fallar (destello rojo, “¡FALLO!”).
- UI grande y táctil, mobile-first. Logo **DinoColor** colorido. Mascota dino amigable.

## 7. Mascota

“Rex”, un dinosaurio amigable. En el MVP es un **placeholder SVG** con bocadillos de
texto ("¡Muy bien!", "¡Rápido, pulsa la pelota verde!", "¡Nuevo nivel desbloqueado!").
Aparece en inicio y resultados. Modelo 3D real futuro:
`assets/models/characters/dino-mascot/dino_color_mascot.glb`.

## 8. Guardado

`localStorage` (`src/systems/storageSystem.js`): nivel máximo desbloqueado, mejor
puntuación y preferencia de sonido.

## 9. Futuras mejoras

Modelo 3D de mascota con animaciones, más formas y modos, partículas/post-procesado,
tienda y skins, logros, eventos diarios, anuncios recompensados, publicación Android.
