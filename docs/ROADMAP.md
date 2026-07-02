# DinoColor — ROADMAP

Desarrollo por **iteraciones pequeñas y verificables**. No avanzar a la siguiente hasta
que la anterior compile y funcione.

## ✅ Iteración 0 — MVP jugable (v0.1.0)
Estructura del proyecto, pantallas, tablero 3D, timer, iluminación de pelotas,
interacción, puntuación + combos, victoria/derrota, niveles progresivos, guardado local,
audio sintetizado y mascota placeholder.

## 🔜 Iteración 1 — Pulido visual y feel
- Partículas/explosión al acertar; mejor glow (post-procesado opcional).
- Transiciones entre pantallas; cuenta atrás "3·2·1" al empezar.
- Vibración (haptics) en móvil al acertar/fallar (Capacitor o Vibration API).
- Ajuste fino de tiempos y metas en dispositivos reales.

## Iteración 2 — Mascota 3D
- Modelo real en `assets/models/characters/dino-mascot/dino_color_mascot.glb`.
- Carga con `useGLTF`; animaciones idle/celebración/ánimo.
- Reacciones contextuales (acierto, combo, victoria, derrota).

## Iteración 3 — Contenido
- Más formas de tablero (círculo, hexágono, triángulo, diagonales y especiales).
- Más niveles y/o generación de niveles; selector de dificultad.
- Modos: contrarreloj, supervivencia, precisión.

## Iteración 4 — Meta-juego
- Pantalla de ajustes (volumen, idioma ES/EN, reiniciar progreso).
- Logros y estadísticas; mejores combos históricos.
- Tienda y skins de pelotas/mascota; economía simple (monedas).

## Iteración 5 — Publicación
- Despliegue web en **GitHub Pages** (requiere confirmación de Stefano).
- Empaquetado **Android con Capacitor** (`npm run cap:add` / `cap:sync` / `cap:open`).
- Iconos/splash, política de privacidad y ficha de tienda (ver `playstore/`).
- Anuncios recompensados (AdMob) e IAP — punto único de recompensa para integrarlos.

## Iteración 6 — Estable
- Tests automáticos (scoring, layouts, validación de niveles superables).
- Optimización de rendimiento (luces, draw calls) para gama baja.
- Revisión de bugs y versión 1.0.0.
