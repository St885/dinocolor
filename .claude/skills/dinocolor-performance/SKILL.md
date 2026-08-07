---
name: dinocolor-performance
description: Auditoría y optimización de rendimiento de DinoColor (tamaño de dist/, GLB pesados, assets duplicados, re-renders React, memo, geometrías/materiales, timers sin cleanup, bundle Three.js). Úsala para "optimiza el rendimiento", "reduce el peso", "detecta N mejoras de performance".
---

# dinocolor-performance

Optimización de rendimiento de DinoColor **sin cambiar mecánica**. Asume `dinocolor-context` cargado. Aplica solo cambios seguros; mide antes/después cuando puedas.

## Regla crítica de assets (la más importante)

- **Oliver NO debe volver a `public/`** salvo que esté optimizado (< 5 MB) o sea estrictamente necesario y confirmado. Sus dos GLB pesan 66 MB (22 + 44) y **ninguna escena los usa** (ver `dinocolor-mascot-3d`).
- **Objetivo futuro:** cualquier GLB de mascota en runtime debe pesar **< 5 MB** (Draco/KTX2).
- La mascota en runtime es **T-Rexo ligero** (`dino_color_mascot.glb`, 0,9 MB). Es el único GLB que debe descargarse al jugar.

## Qué revisar

**Peso / build**
- [ ] Tamaño de `dist/` (objetivo actual ~2,0 MB). `du -sh dist`.
- [ ] Ningún GLB pesado en `dist/` (`find dist -name '*.glb' -size +5M`). Oliver no debe aparecer.
- [ ] Assets **duplicados** entre `assets/` (fuente) y `public/` (runtime): solo debe estar en `public/` lo que el juego sirve de verdad.
- [ ] Uso innecesario de `public/`: todo lo de `public/` se empaqueta en cada build.
- [ ] Bundle de Three.js separado (`manualChunks`: `three` / `react` / juego) para caché.
- [ ] Advertencias de chunks (`chunkSizeWarningLimit`) — no ocultar problemas reales, solo el ruido esperado de `three`.

**React / R3F**
- [ ] Re-renderizados innecesarios: `memo` en componentes 3D pesados (`Board3D`, `Ball3D`, `Background3D`, `GameHUD`, `MiniDinoWalker`, `DinoMascot`).
- [ ] Geometrías/materiales/texturas **recreados** en cada render o cada frame → compartir a nivel de módulo (esfera, planos, sprites de glow, telón del fondo, envMap).
- [ ] Arrays de posiciones / CanvasTexture recreados innecesariamente.
- [ ] `useThree()` **con selector** (`useThree(s => s.viewport)`), no el store entero.
- [ ] Separar estado **visual** de estado de **gameplay** (p. ej. el cronómetro notifica a React 1 vez/seg, no 60).
- [ ] `useMemo`/`useCallback` donde evite trabajo o estabilice props (`onTap` estable, layout memoizado).

**Ciclo de vida / fugas**
- [ ] `setInterval`/`setTimeout`/`requestAnimationFrame` con **cleanup** al desmontar.
- [ ] `useEffect` sin cleanup; listeners (`visibilitychange`, mixer de animación) removidos al salir.
- [ ] Timers que sigan vivos al cambiar de pantalla (mini T-Rexo, popups).

**3D / luces**
- [ ] Nº de luces **constante** durante la partida (no una luz por pelota). Menos luces = más barato en móvil.
- [ ] Segmentos de geometría razonables (esferas 32×24, no 40×40) — invisible a ese tamaño.
- [ ] `dpr={[1,2]}` en el Canvas; el segundo Canvas (mini T-Rexo) en `quality="low"` (sin antialias, DPR menor).
- [ ] `backdrop-filter` limitado (cada uno es un pase de desenfoque por frame sobre WebGL).
- [ ] **El canvas se duerme cuando no hay partida** (`frameloop="demand"` en pausa/tutorial/fin de nivel). Ojo: el canvas de la mascota solo debe dormirse cuando el modelo YA está en pantalla.
- [ ] **Ninguna animación CSS infinita mueve `left`/`top`/`width`** (layout + repaint por frame sobre el canvas). Usa `transform`. Medido: `meta-shine` + `btn-shine` costaban **55 layouts / 6 s**; con `translateX`, **0**.
- [ ] **Ningún `box-shadow` grande y animado a pantalla completa** (`.hud-flash` usaba `inset 0 0 130px` en cada acierto). Degradado radial + `opacity`.
- [ ] `useFrame` con **salida temprana** cuando el objeto está en reposo — fijando antes el estado exacto (los lerps son asintóticos).

### ⚠️ Los fps en headless NO miden nada

Sin GPU (SwiftShader) los fotogramas por segundo son ruido: en v0.6.3 la escena **quieta**
dio 23,5 fps y la misma escena con todos los efectos disparándose dio 46,5 — un "coste
negativo" que solo demuestra que el instrumento no sirve. Mide **trabajo de hilo
principal**, que es independiente del rasterizador.

Y no compares unidades distintas: `ScriptDuration` sale en segundos **por ventana de
medida**. 22,8 ms de script por segundo son ≈0,23 ms por frame a 60 fps, **no** un 137 %
del presupuesto de 16,7 ms de un frame.

### Cómo medir (sin instalar nada)

`Performance.getMetrics` por CDP, comparando una ventana con el juego **en pausa** antes y después
del cambio: al estar todo congelado, la ventana aísla el trabajo que el juego hace sin necesidad.
`ScriptDuration` y `LayoutCount` son las dos cifras útiles. **No** capturan el coste de GPU, así que
no conviertas un ahorro de CPU en una promesa de batería sin medirlo en un móvil real.

**Git**
- [ ] **`dist/` nunca** en Git. **`node_modules/` nunca** en Git. Verifícalo con `git ls-files`.

## Procedimiento

1. Medir estado actual (peso de `dist/`, GLB, y si puedes, ms/frame o recuento de renders).
2. Aplicar cambios **seguros** (no tocar mecánica, niveles ni scoring).
3. **`npm run build`** verde + comprobar que `dist/` no engordó ni metió GLB pesados.
4. Entregar lista numerada de optimizaciones aplicadas: **qué**, **en qué archivo**, **qué problema evita**.
5. Documentar como *pendiente* lo que requiera herramientas externas (Draco/KTX2, reexportar modelos) — no lo inventes como hecho.
