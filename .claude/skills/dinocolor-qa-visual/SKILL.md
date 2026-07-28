---
name: dinocolor-qa-visual
description: Revisión visual/UX pantalla por pantalla de DinoColor y corrección de bugs de layout, recortes, HUD, tablero, mascota, responsive y consola. Úsala para "revisa las pantallas", "corrige bugs visuales", "algo se ve cortado/tapado/mal en móvil".
---

# dinocolor-qa-visual

QA visual de DinoColor. Asume `dinocolor-context` cargado. Objetivo: dejar cada pantalla legible, sin recortes ni solapes, mobile-first, y con la build verde.

## Pantallas a revisar (todas)

1. **StartScene** — logo, mascota héroe (T-Rexo), globo de diálogo, botón Jugar, pista inferior.
2. **MenuScene** — récord, barra de progreso, tarjetas de nivel (estados bloqueado/actual/completado), botón "Continuar" **anclado** abajo.
3. **GameScene** — HUD superior (pausa, nivel, mejor, cronómetro, puntuación), tablero, pelota activa, mini T-Rexo en su tarima, meta+barra, cofre, popup de feedback.
4. **ResultScene victoria** — título, mascota celebrando, panel de stats 2×2, botones siguiente/menú.
5. **ResultScene derrota** — mensaje motivador, mascota cabizbaja, stats, reintentar/menú.

## Checklist de bugs a detectar

**Recortes / encuadre**
- [ ] Dinosaurio (héroe, mini o resultado) **cortado** por arriba/abajo/lados.
- [ ] Pelotas del tablero **cortadas** o pegadas al borde.
- [ ] Contenido que se sale del marco (overflow) → en Start/Result puede recortar botones.

**Solapes / capas**
- [ ] HUD **montado sobre** el tablero, o el tablero bajo el cronómetro.
- [ ] La tarima del mini T-Rexo tapando la pelota superior izquierda (Board3D reserva banda en px; ver `dinocolor-mascot-3d`).
- [ ] Elementos que tapan zonas jugables (popup sobre las pelotas, mascota sobre stats/botones).

**Composición / responsive**
- [ ] Tablero **mal centrado** (debe ir en la banda libre entre HUD y meta).
- [ ] Textos **desalineados** o mal contrastados sobre el fondo.
- [ ] Botones **demasiado pegados** entre sí o al borde.
- [ ] **Scroll no deseado** durante la partida (no debe haber).
- [ ] Fallos en pantallas cortas/anchas (probar ~360×640 y ~430×930).
- [ ] Fondo que **ensucia** la lectura del tablero (viñeta/scrims mal calibrados).

**Legibilidad móvil**
- [ ] Texto diminuto; tamaños con `clamp()` en vez de px fijos donde compite con la altura.
- [ ] Estados de nivel indistinguibles (bloqueado vs jugable vs completado).

**Técnico**
- [ ] **Errores/warnings de consola** al recorrer las 5 pantallas.
- [ ] Peticiones fallidas (GLB, icono, manifest).

## Procedimiento (siempre en este orden)

1. **Revisar visualmente** cada pantalla (idealmente en navegador; ver "Validación en navegador").
2. **Corregir** el bug en su archivo (escenas en `src/scenes/`, componentes en `src/components/`, estilos en `styles/game.css`, `styles/mobile.css`, `styles/global.css`).
3. **`npm run build`** y confirmar verde.
4. **Entregar la lista de archivos modificados** y qué se corrigió en cada uno.
5. **Entregar capturas o una descripción de la validación** (qué pantalla, qué se comprobó, resultado).

## Validación en navegador (recomendada, sin instalar nada nuevo)

DinoColor usa WebGL; validar de verdad requiere navegador. Patrón usado en el proyecto:
`npm run build` → servir `dist/` (p. ej. `vite preview`) → abrir con Chromium/Playwright **desde la caché global** (no como dependencia del proyecto) → recorrer Start→Menú→Juego→Pausa→Resultado (victoria y derrota) → capturar screenshots y contar errores de consola / requests fallidas. Guarda scripts temporales en el **scratchpad de la sesión**, nunca dentro del proyecto.

> Regla anti-alucinación: si dices "arreglado" o "se ve bien", que sea porque lo **viste** en una captura o lo **mediste** (rects, overflow, requests), no por inferencia.

## ⚠️ Cómo NO medir "no hay scroll en la partida"

Dos métodos que dan **falsos positivos** en este proyecto (comprobado 2026-07-28):

1. `scrollHeight - clientHeight` → devuelve **84 px** siempre, porque `.app-frame::before`
   tiene `inset: -10%` (capa decorativa de blobs) y `overflow: hidden` la recorta. Nadie ve
   ese "desbordamiento".
2. `el.scrollTop = 9999` → un contenedor con `overflow: hidden` **sí** se puede desplazar por
   script; solo el usuario no puede.

Lo único concluyente es **hacer un swipe de verdad** (`Input.synthesizeScrollGesture` por CDP) y
comprobar que nada se movió, incluido un testigo visual (p. ej. el rect de `.ghud-bottom`).

## ⚠️ `Context Lost` no es un bug nuevo

`THREE.WebGLRenderer: Context Lost.` sale ~10 veces en un recorrido largo: es el `dispose()` de
three.js al desmontar cada `<Canvas>` en los cambios de escena. Medido igual antes y después de la
iteración 2026-07-28. **Sale por `console.log`, no por `console.warn`**, así que un filtro de
`error`/`warning` no lo ve — y si lo capturas, no lo persigas como regresión sin comparar builds.
