# DinoColor — Plan de corrección del rig/skinning de T-Rexo

> Diagnóstico y plan para **desbloquear las animaciones de T-Rexo sin romper la malla**.
> Estado: **solo documentación** — no se ha tocado el modelo, el `.blend`, el código ni `public/`.
> Fecha del diagnóstico: 2026-07-21. Modelo analizado: `dino_color_mascot.glb` (0,9 MB, 28 huesos, 8 clips).

Contexto de por qué existe este documento: hoy **solo el clip `idle` es seguro**; los demás
(`wave`, `talk`, `celebrate`, `sad`, `point`, `surprised`, `dance`) deforman/rompen la malla, así
que están bloqueados por la allowlist `SAFE_CLIPS` en `DinoMascot.jsx` y la emoción se hace con
**poses de cuerpo entero** (que no tocan el esqueleto). Ver [`TECHNICAL_NOTES.md`](TECHNICAL_NOTES.md)
y la nota "no deshacer" de [`../CLAUDE.md`](../CLAUDE.md).

---

## 1. Diagnóstico resumido

- ✅ **El rig está bien.** 28 huesos con jerarquía anatómica correcta:
  `root → hips → spine → chest → neck → head → jaw/eye_L/eye_R`, brazos
  `shoulder → upperarm → forearm → hand` (L/R), piernas `thigh → shin → foot → toe` (L/R) y cola
  `tail_1 → tail_2 → tail_3`.
- ✅ **Las animaciones están bien.** Rotaciones plausibles por clip; solo `hips` traslada (lo
  normal). No hay nada malo en los clips en sí.
- ❌ **El problema real está en el SKINNING (los pesos).** Los vértices están asignados a huesos
  **anatómicamente equivocados**.
- 🎯 **Causa principal:** `tools/build_trexo.py`, bloque "SKIN por proximidad al rig" (líneas
  ~249-274). Cada vértice se pega a **sus 2 huesos más cercanos por distancia geométrica**
  (inverse-distance, con epsilon 0.02), **sin ninguna lógica anatómica ni máscara por pieza**:

  ```python
  ds = sorted((dps(co, h, t), n) for n, h, t in segs)   # distancia a CADA segmento de hueso
  (d0, n0), (d1, n1) = ds[0], ds[1]                      # los 2 huesos más cercanos
  w0 = 1.0/(d0+0.02); w1 = 1.0/(d1+0.02); s = w0+w1
  vgs[n0].add([v.index], w0/s, 'REPLACE')                # peso a esos 2, y ya
  vgs[n1].add([v.index], w1/s, 'REPLACE')
  ```

  Como los brazos cortos del T-Rex chibi quedan geométricamente cerca de la panza, y los detalles
  de la cara quedan cerca del `jaw`/`eye_*`, la proximidad "ciega" asigna piezas a huesos que no les
  corresponden. Además, **ninguna pieza queda anclada con firmeza a un hueso** (dureza medida: 0 %
  de vértices con un peso dominante > 90 %): todo son mezclas difusas de 2 huesos vecinos.

## 2. Evidencias principales

Extraídas del propio GLB (peso total de cada malla repartido por hueso):

| Pieza (material) | Pesos observados | Debería ir a |
|---|---|---|
| **panza** (`mat_belly_light`) | chest 11% · **shin_L 10%** (¡espinilla!) · spine 7% | spine / chest |
| **franja de panza** (`mat_belly_line`) | hips 39% · spine 27% · **hand_R 9%** | hips / spine |
| **bandana** (`mat_bandana_red`) | **shoulder_L 30% · upperarm_L 22%** (¡brazo!) · shoulder_R 17% | neck / chest |
| **boca / lengua / dientes** | jaw 64-74% + **eye_L/eye_R 10-17%** (mezcla con los ojos) | solo jaw |
| **ojos / iris / pupilas** | repartidos **jaw ~32-49% + eye_L/eye_R** | eye_L / eye_R (o head) |
| **uñas** (`mat_nails_cream`) | **mezcla toe_L/toe_R + hand_L** | uñas de mano→hand_*, de pie→toe_* |
| **cuerpo** (`mat_body_blue`) | eye_R 14% · eye_L 13% · jaw 8% | spine/chest/head (los ojos no deben mover la piel) |

**Por qué `idle` funciona y los demás rompen** — grados que gira cada hueso por clip (medido):

| clip | huesos que más giran | resultado |
|---|---|---|
| **idle** | tail_3 11° · tail_2 9° · **upperarm 3°** | ✅ seguro (casi no mueve brazos ni cabeza) |
| `wave` | **upperarm_L 82°** · forearm_L 39° | ✗ panza/bandana/boca se despegan |
| `celebrate` | **upperarm_L/R 94°** | ✗ la panza se rasga |
| `sad` | **head 25°** · tail 28° | ✗ la cara colapsa en una bola |
| `dance` | upperarm_L/R 61° | ✗ se suelta una garra |

`idle` solo mueve la cola unos grados y casi nada los brazos/cabeza, así que **nunca ejercita el
mal skinning**. En cuanto un clip gira los brazos 80-94° o la cabeza 25°, los vértices mal asignados
(panza→espinilla, bandana→brazo, cara→jaw+ojos) se despegan y la malla se abre.

## 3. Archivos involucrados

**Arte / fuente (donde se arregla de verdad):**
- `assets/models/characters/dino-mascot/dino_color_mascot.blend` — repintar pesos.
- `tools/build_trexo.py` — algoritmo de skinning (Opción B).
- `assets/models/characters/dino-mascot/dino_color_mascot.glb` — GLB fuente (gitignored).
- `public/assets/models/characters/dino-mascot/dino_color_mascot.glb` — **el que sirve el juego** (se
  versiona, 0,9 MB). Copiar aquí solo el GLB **ya validado**.

**Código del juego (solo cuando el GLB nuevo esté validado en navegador):**
- `src/components/game/DinoMascot.jsx` — ampliar `SAFE_CLIPS` clip a clip; opcionalmente volver a
  usar `animation`/`state` en `StartScene.jsx`, `ResultScene.jsx`, `MiniDinoWalker.jsx`.

**Documentación / reglas (mantener al día tras el arreglo):**
- `docs/TECHNICAL_NOTES.md` (sección SAFE_CLIPS), `docs/STATUS.md`, `../CLAUDE.md` (nota "no
  deshacer") y `.claude/skills/dinocolor-mascot-3d/SKILL.md`.

## 4. Riesgos

- **No romper el GLB publicado.** Es un asset de runtime: el juego en vivo lo descarga; un GLB mal
  regenerado rompe la mascota en producción.
- **No tocar `public/` hasta validar** el modelo nuevo en navegador (clip por clip, sin artefactos).
- **No ampliar `SAFE_CLIPS`** sin haber probado cada clip visualmente.
- **No reintroducir Oliver** a `public/` (66 MB; regla de `dinocolor-performance`).
- **Tamaño:** mantener el GLB **por debajo de 1 MB** si es posible, y **siempre < 5 MB**. Repintar
  pesos no cambia apenas el peso.
- **Encuadre:** revisar `targetHeight` / `baseY` / `cameraDistance` después de exportar — si cambia
  el bounding-box, T-Rexo podría cortarse (ver `dinocolor-mascot-3d`).
- **No romper `idle`:** es lo único que hoy funciona; tras re-skinnear, confirmar que sigue perfecto.
- **Generador no portable:** `build_trexo.py` tiene una ruta de export **hardcodeada de Windows**
  (`C:\Users\olgit\…`) y usa flags por env (`DINO_SKIN`, `DO_SAVE`, `DO_EXPORT`); adaptar para Mac.

## 5. Plan recomendado

**Opción A — Repintar pesos en Blender (empezar por aquí: resultado visual rápido y fiable).**
Asignar cada pieza a su hueso lógico (no por proximidad) y suavizar solo las articulaciones:
- ojos → `eye_L`/`eye_R` (o `head`) · boca/dientes/lengua → `jaw` · panza → `spine`/`chest` ·
  bandana → `neck` · uñas de mano → `hand_*` · uñas de pie → `toe_*` · púas → cadena
  `spine/chest/head/tail` según su posición.
- Para el cuerpo, *Armature Deform → With Automatic Weights* (bone-heat) en vez de la proximidad a
  2 segmentos; suavizar límites (Weight Paint → Smooth) sin sangrar a huesos ajenos.

**Opción B — Corregir el generador (`tools/build_trexo.py`) para un skinning anatómico y
reproducible.** Reescribir el bloque de skinning para asignar los detalles a su hueso por **nombre
de material** (diccionario `material → hueso`) y usar *automatic weights* para el cuerpo, en lugar
de "2 huesos más cercanos". Así el pipeline procedural queda correcto y repetible.

**Estrategia:** hacer primero la **Opción A** (arreglar y validar visualmente), y **luego trasladar
esa lógica a la Opción B** (el generador) para que futuras regeneraciones ya salgan bien.

## 6. Checklist de validación

- [ ] Abrir `dino_color_mascot.blend`.
- [ ] Corregir pesos **por pieza** (ojos/boca/dientes/lengua/panza/bandana/uñas/púas → su hueso).
- [ ] **Normalize All**.
- [ ] **Limit Total = 4** (máx. 4 influencias por vértice).
- [ ] Probar en pose: **idle**.
- [ ] Probar **wave**.
- [ ] Probar **celebrate**.
- [ ] Probar **sad**.
- [ ] Probar **dance** (y talk/point/surprised).
- [ ] Exportar GLB (glTF con skins + animaciones).
- [ ] Validar **tamaño** (< 1 MB objetivo, < 5 MB obligatorio).
- [ ] Validar **en navegador** (build + WebGL, 0 artefactos, 0 errores de consola).
- [ ] Validar **StartScene** (T-Rexo héroe completo, sin cortes).
- [ ] Validar **GameScene** (mini T-Rexo completo, no tapa tablero/HUD).
- [ ] Validar **ResultScene victoria** (celebración sin romper la malla).
- [ ] Validar **ResultScene derrota** (cabizbajo sin romper la malla).
- [ ] **Solo entonces** ampliar `SAFE_CLIPS` en `DinoMascot.jsx` (clip a clip) y, si se quiere,
      volver a usar animaciones reales en las escenas.

## 7. Decisión técnica

- **Arreglar el T-Rexo actual es mejor que optimizar Oliver.** T-Rexo pesa 0,9 MB (Oliver 22-44 MB),
  su rig y sus animaciones ya son correctos y semánticamente alineados con el juego, y es la
  mascota oficial. El problema es **acotado** (repintar pesos de un rig bueno). Optimizar Oliver
  arrastraría peso permanente (aún >5 MB tras Draco/KTX2), menos clips útiles y va contra las reglas
  de rendimiento del proyecto.
- **Oliver queda como asset pesado de referencia, no de runtime.** Sus GLB fuente siguen en
  `assets/` (gitignored); **no** deben volver a `public/` ni pedirse desde ninguna escena hasta que
  estén comprimidos a < 5 MB.

---

### Estado y próximo paso
Este documento es **solo el plan**. No se ha modificado el modelo, el `.blend`, `src/`, `public/`
ni `tools/build_trexo.py`. El siguiente paso (a confirmar) sería ejecutar la **Opción A** en Blender
(vía su MCP), repintando pesos pieza por pieza y validando cada clip en navegador **antes** de tocar
`public/` o el código.
