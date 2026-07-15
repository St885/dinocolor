/**
 * safeArea.js
 * -----------------------------------------------------------------------------
 * Lee los márgenes seguros del dispositivo (notch, barra de gestos) en PÍXELES.
 *
 * `getComputedStyle(:root).getPropertyValue('--safe-top')` NO sirve: devuelve el
 * texto literal "env(safe-area-inset-top, 0px)" sin resolver. El truco fiable es
 * aplicar el env() a un elemento sonda y leer el valor ya calculado.
 *
 * Lo necesita Board3D para reservar las bandas del HUD en píxeles y garantizar que el
 * tablero nunca queda debajo del HUD ni de la tarima de T-Rexo, en ningún móvil.
 * -----------------------------------------------------------------------------
 */

let cached = null

export function safeAreaInsets() {
  if (cached) return cached
  if (typeof document === 'undefined' || !document.body) return { top: 0, bottom: 0 }

  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;' +
    'padding-top:env(safe-area-inset-top,0px);' +
    'padding-bottom:env(safe-area-inset-bottom,0px);'
  document.body.appendChild(probe)
  const cs = getComputedStyle(probe)
  cached = {
    top: parseFloat(cs.paddingTop) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
  }
  probe.remove()
  return cached
}

export default safeAreaInsets
