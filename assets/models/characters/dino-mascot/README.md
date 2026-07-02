# dino-mascot/ — Mascota oficial 3D 🦖

Bebé T-Rex cartoon ("T-Rexo"), mascota guía de **DinoColor**. **Modelo v4 (AZUL, fiel a la
imagen de referencia)**: cuerpo **azul vivo** con **manchas azul oscuro**, **barriga beige
segmentada**, **pañuelo rojo** al cuello (punta en V al pecho), **ojos grandes con iris
verde** + pupila + brillo, **boca abierta sonriente** con dientes/colmillos + lengua,
**espinas naranja** en cabeza→lomo→cola, brazos cortos, **pies grandes con uñas** y **cola
curva**. Cuerpo por metaballs (superficie suave) + detalles como mallas separadas.

```
dino_color_mascot.glb            ← modelo principal (malla + rig + 8 animaciones)
dino_color_mascot.blend          ← fuente editable (v4 azul)
backups/dino_color_mascot_before_blue_reference_exact.blend  ← respaldo v3 verde (.blend)
backups/dino_color_mascot_before_blue_reference_exact.glb    ← respaldo v3 verde (.glb)
dino_color_mascot_v2_backup.blend ← respaldo v2 "blob"
dino_color_mascot_v1_backup.glb   ← respaldo GLB v1
animations/                       ← reservado (todo va en el GLB)
```

## Ficha técnica
| Dato | Valor |
|------|-------|
| Formato | glTF 2.0 binario (GLB), Y-up |
| Peso | ~808 KB |
| Triángulos | ~17.272 (rango ideal mobile 10k–20k) |
| Malla | `DinoColor_Mascot` (`DinoColor_Mascot_Mesh`) |
| Armature | `DinoColor_Mascot_Rig` (28 huesos) |
| Skinning | Pesos por **proximidad** (2 huesos más cercanos por vértice) |
| Origen / pivot | En los pies, centrado (`0,0,0`) |
| Texturas | Ninguna (10 materiales planos cartoon) |
| Mira hacia | +Z (de frente a la cámara por defecto en R3F) |

## Materiales (10)
`mat_body_green`, `mat_belly_light`, `mat_spikes_orange`, `mat_eyes_white`,
`mat_pupils_black`, `mat_mouth_dark`, `mat_teeth_soft`, `mat_nails_cream`,
`mat_tongue_pink`, `mat_eye_shine`.

## Animaciones (8)
| Nombre | Bucle | Uso sugerido |
|--------|:-----:|--------------|
| `idle` | ✅ | Menú / espera |
| `wave` | — | Inicio (saludo) |
| `talk` | ✅ | Tutorial / bocadillos |
| `celebrate` | — | Acierto |
| `sad` | — | Derrota |
| `point` | — | Señalar tablero/pelota |
| `surprised` | — | Fallo |
| `dance` | ✅ | Victoria / resultados |

## Rig
```
root ─ hips ─ spine ─ chest ─ neck ─ head ─ jaw / eye_L / eye_R
                       │
                       └─ shoulder_(L/R) ─ upperarm ─ forearm ─ hand
       hips ─ thigh_(L/R) ─ shin ─ foot ─ toe
       hips ─ tail_1 ─ tail_2 ─ tail_3
```

## Integración
Usa el componente `src/components/game/DinoMascot.jsx` (solo `three` +
`@react-three/fiber`, sin dependencias nuevas). Mantiene la API del placeholder
(`message`, `mood`, `size`) y añade `state` / `animation`.

```jsx
// Drop-in sobre el placeholder (misma API):
<DinoMascot message="¡Hola!" mood="happy" size={160} />

// O por estado de juego:
<DinoMascot state="victory" />          // baila
<DinoMascot state="correct" />          // celebra una vez

// Dentro de un <Canvas> ya existente (guía en partida):
import { DinoModel } from '../components/game/DinoMascot.jsx'
<DinoModel clip="point" />
```

### Rutas (importante)
- **Fuente / export canónico:** `assets/models/characters/dino-mascot/dino_color_mascot.glb`
  (+ `dino_color_mascot.blend`). Es el origen de verdad para editar/re-exportar.
- **Runtime (servido por Vite):** `public/assets/models/characters/dino-mascot/dino_color_mascot.glb`.
  Vite copia `public/` a la raíz del build, así que el componente lo carga como
  `` `${import.meta.env.BASE_URL}assets/models/characters/dino-mascot/dino_color_mascot.glb` ``
  → resuelve a `/assets/...` en dev y a `/<base>/assets/...` en GitHub Pages / Capacitor.

> ⚠️ Si re-exportas el GLB, **copia también la nueva versión a `public/assets/...`**
> (la copia de `public/` es la que se sirve en runtime).

## Regenerar
Construida proceduralmente en **Blender 5.1** (modo background CLI, sin addon interactivo).
Pipeline **v3**: cuerpo verde por **metaballs** (torso peral + cuello + cabeza + hocico +
mandíbula + brazos + muslo/espinilla/pie + cola) → convertir a malla + decimate (~8.8k) →
**detalles como mallas separadas** (barriga, ojos/pupilas/brillo, cejas, boca + lengua,
dientes sup./inf., fosas, **placas dorsales naranja**, garras) con sus materiales → join →
normales + shade smooth → **re-skinning por proximidad** (2 huesos más cercanos por vértice)
al rig existente → export GLB. **El rig y las 8 animaciones se conservan.**

Script: `tools/build_trexo.py` (parámetros de proporción al inicio del archivo).
Comando: `blender -b dino_color_mascot.blend --python build_trexo.py` con envs
`DINO_SKIN=1 DINO_SAVE=1 DINO_EXPORT=1`. Tras exportar, **copiar el GLB a `public/assets/...`**.
