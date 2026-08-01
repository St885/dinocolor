/**
 * mascot.js
 * -----------------------------------------------------------------------------
 * Identidad de la mascota en UN SOLO SITIO.
 *
 * Antes el nombre "T-Rexo" estaba escrito a mano en StartScene, MiniDinoWalker,
 * los textos de ResultScene y varios `aria-label`. Cambiarlo (o probar otro
 * nombre) obligaba a buscar por todo el proyecto y era fácil dejarse uno.
 *
 * El nombre se mantiene: la mascota SIGUE siendo T-Rexo. Lo que cambia es el
 * modelo 3D que la representa (ver MASCOT_MODEL más abajo).
 * -----------------------------------------------------------------------------
 */

/** Nombre visible del personaje. Cambiarlo aquí lo cambia en todo el juego. */
export const MASCOT_NAME = 'T-Rexo'

/**
 * Ficha del modelo 3D en runtime. Documenta de dónde sale y qué NO tiene, para
 * que nadie vuelva a buscar animaciones que no existen.
 *
 * MODELO ACTUAL (iteración 2026-08-01): T-Rexo v3.
 *   - Origen: generado con Meshy y optimizado en Blender para móvil.
 *   - Runtime: 1,3 MB · 42.000 triángulos · texturas 1024/512 (base color,
 *     normal, metallic-roughness). Partía de 20,5 MB y 395.058 triángulos.
 *   - NO TIENE ESQUELETO NI CLIPS DE ANIMACIÓN. Es una malla estática.
 *
 * Que no tenga esqueleto NO le quita vida: toda la expresividad del juego se
 * hace con POSES de cuerpo entero en `MascotRig` (respirar, saludar, saltar de
 * alegría, quedarse cabizbajo), que mueven el modelo como un objeto rígido.
 * Es exactamente el mismo mecanismo que ya se usaba con el modelo anterior,
 * cuyos clips de esqueleto rompían la malla (ver SAFE_CLIPS en DinoMascot.jsx).
 *
 * El modelo anterior (riggeado, 0,9 MB, 8 clips) sigue en `assets/` como fuente.
 */
export const MASCOT_MODEL = {
  id: 'trexo',
  hasSkeleton: false,
  file: 'dino_color_mascot.glb',
}
