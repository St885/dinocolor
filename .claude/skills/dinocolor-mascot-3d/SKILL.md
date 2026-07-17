---
name: dinocolor-mascot-3d
description: Reglas de la mascota 3D de DinoColor (T-Rexo en runtime, Oliver como asset pesado no usado), encuadre por pantalla y la trampa crítica de animaciones/skinning. Úsala para "ajusta el encuadre de T-Rexo", "la mascota se corta/tapa algo", "anima la mascota".
---

# dinocolor-mascot-3d

Todo sobre la mascota 3D. Asume `dinocolor-context` cargado. Componente: `src/components/game/DinoMascot.jsx` (solo `three` + R3F, sin drei).

## Qué modelo se usa

- **Runtime = T-Rexo:** `dino_color_mascot.glb` (**0,9 MB**, 28 huesos, 8 clips). Es el único GLB que descarga el juego. Lo usan `StartScene`, `ResultScene` y el mini acompañante `MiniDinoWalker` (GameScene).
- **Oliver = asset pesado, NO en runtime:** `assets/models/characters/oliver/` → `oliver_character.glb` (22 MB, **1 solo clip**) y `oliver_master.glb` (44 MB, 11 clips). El registro `MODELS.oliver` sigue en el código como skin futuro, pero **ninguna escena lo pide**.
  - **No copies Oliver a `public/`** ni lo pidas en runtime sin **confirmarlo** y **optimizarlo a < 5 MB** (Draco/KTX2) antes. Sus fuentes están en `assets/` (gitignored); no los borres.

## ⚠️ Trampa CRÍTICA: solo el clip `idle` es seguro

El GLB de T-Rexo trae 8 clips (`idle, wave, talk, celebrate, sad, point, surprised, dance`) pero **solo `idle` deforma bien la malla**. Los demás la **ROMPEN** (le despegan la placa del vientre y la boca; `sad` le colapsa la cabeza). No es un bug del componente: son los **pesos de skinning** del modelo, mal pintados.

- Protegido con `const SAFE_CLIPS = new Set(['idle'])` en `DinoMascot.jsx`: `resolveClip` descarta cualquier otro clip.
- **NO pidas `wave`/`celebrate`/`dance`/`sad` como animación de esqueleto.** Reintroduce el bug por el que "ganar y perder se veían idénticos".
- **Arreglo real pendiente:** repintar pesos en Blender (`assets/models/characters/dino-mascot/dino_color_mascot.blend`). Cuando esté, ampliar `SAFE_CLIPS` **clip a clip, mirándolos**.

## La emoción se hace con POSES (cuerpo rígido), no con clips

Como no podemos reproducir clips expresivos, el lenguaje corporal mueve el **modelo entero** (posición/rotación/escala del grupo, en `MascotRig`). Esto NO puede romper el skinning. Poses en `POSES`:

| pose | uso | efecto |
|---|---|---|
| `idle` | por defecto | respira y se balancea |
| `greet` | StartScene | se inclina hacia el jugador y saluda con el cuerpo |
| `cheer` | victoria / mini T-Rexo al acertar | **salta** con squash & stretch y gira |
| `sad` | derrota | hombros hundidos, inclinado, suspira despacio |

Se elige con la prop `pose`, o se deduce del `mood` (`happy→idle`, `cheer→cheer`, `sad→sad`).

## Encuadre por pantalla (no se debe cortar nunca)

- **StartScene (héroe):** grande y **completa**, centrada; `.mascot--hero` usa `--mascot-size: clamp(176px,30vh,260px)` para encoger en pantallas bajas en vez de recortarse. `targetHeight≈1.15`, `baseY≈-0.58`.
- **GameScene (mini):** pequeña, en su **tarima** arriba-izquierda, **sin tapar** tablero/HUD/timer/meta/cofre. `Board3D` reserva la banda superior en px (`TOP_RESERVE_PX`) para que no se solape con la pelota superior izquierda. `quality="low"`.
- **ResultScene:** centrada, **sin tapar** el título ni el panel de stats; `.mascot--result` más compacta (`clamp(120px,19vh,168px)`).

## Cómo corregir un encuadre (sin romper nada)

Ajusta en este orden, y **mira el render** (captura) tras cada cambio:
1. **Contenedor CSS** (`--mascot-size`, la clase `.mascot--hero`/`--result`, `gap`).
2. **Escala/posición del modelo:** props `targetHeight` y `baseY` (normalización por bounding-box; no toca la malla).
3. **Cámara:** `cameraDistance` / `cameraY` — con cuidado, a ciegas recorta o deforma; cámbialo solo viendo el resultado.
4. Nunca resuelvas un recorte metiendo un clip de esqueleto: usa poses/encuadre.

La API del componente es estable: `message`, `mood`, `size`, `pose`, `animation`/`state`, `model`, `quality`, `targetHeight`, `baseY`, `cameraDistance`, `cameraY`.

## Referencia: animaciones de Oliver (NO activas en runtime)

Solo como catálogo, por si algún día se optimiza Oliver. `oliver_master.glb` trae, entre otras:
`Idle_02` · `Idle_03` · `Walking` · `Running` · `Big_Wave_Hello` · `Jump_with_Arms_Open` · `Shake_It_Off_Dance` · `Alert`.
`oliver_character.glb` trae **1 sola** clip (`Armature|clip0|baselayer`) — por eso, cuando era el modelo principal, cualquier animación pedida caía a esa única clip. **Recordatorio: Oliver no se carga hoy; no lo actives sin confirmar + optimizar.**
