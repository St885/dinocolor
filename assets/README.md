# assets/ — recursos del juego (placeholders)

Estructura de assets de DinoColor. En el MVP **no hay binarios reales**: el audio se
sintetiza y la mascota es un SVG. Aquí se documenta **dónde colocar** los assets reales.

```
assets/
├─ audio/
│  ├─ music/   → música de fondo  (p. ej. dinocolor_theme.mp3)
│  └─ sfx/     → efectos          (hit.mp3, miss.mp3, win.mp3, lose.mp3)
├─ images/
│  ├─ backgrounds/ → fondos 2D (si se usan además del 3D)
│  ├─ ui/          → iconos, logo, icono de app (icon.svg ya incluido)
│  └─ mascot/      → arte 2D de la mascota
├─ models/
│  ├─ characters/
│  │  └─ dino-mascot/
│  │     ├─ dino_color_mascot.glb   (modelo 3D real, futuro)
│  │     └─ animations/             (clips de animación)
│  └─ props/        → otros modelos 3D (rocas, plantas…)
└─ textures/        → texturas para materiales 3D
```

## Importante sobre rutas en Vite

- Los archivos **importados desde JS** (`import url from '../assets/...'`) los procesa Vite
  y reciben una URL con hash en el build. Es la forma recomendada para modelos/imágenes.
- Si necesitas servir archivos por **ruta fija** (p. ej. cargar un mp3 por URL en runtime),
  colócalos en una carpeta `public/` (Vite la sirve tal cual en la raíz del sitio).

## Audio

El MVP **no requiere archivos**: `src/systems/audioSystem.js` sintetiza los efectos. Para
usar audio real, añade los `.mp3` indicados arriba y cárgalos en `audioSystem.js`
(ver `docs/TECHNICAL_NOTES.md`).

## Mascota

Placeholder actual: `src/components/game/DinoMascotPlaceholder.jsx` (SVG). El modelo 3D
real irá en `assets/models/characters/dino-mascot/dino_color_mascot.glb`.
