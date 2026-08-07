/**
 * cspWatch.js
 * -----------------------------------------------------------------------------
 * Anota la última violación de Content Security Policy que ha visto la página.
 *
 * POR QUÉ EXISTE: cuando la CSP bloquea `https://apis.google.com/js/api.js`, el
 * navegador escupe un mensaje clarísimo… en la consola, donde ningún jugador va a
 * mirar. Firebase, por su parte, solo ve que su ayudante no cargó y devuelve un
 * `auth/internal-error` genérico, que se traduciría a "Algo falló por nuestro
 * lado. Inténtalo otra vez." — un mensaje que manda a buscar el problema justo
 * donde no está. Pasó de verdad el 2026-08-07 y costó un rato.
 *
 * Con esto, si el acceso con un proveedor falla y JUSTO ANTES hubo una violación
 * de CSP, se puede decir la verdad: la bloqueó el navegador, no Firebase.
 *
 * El evento `securitypolicyviolation` es el canal estándar y no cuesta nada: se
 * dispara solo cuando algo se bloquea, no por frame.
 * -----------------------------------------------------------------------------
 */

let ultima = null

if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('securitypolicyviolation', (e) => {
    ultima = {
      // `effectiveDirective` es la directiva que realmente aplicó (script-src);
      // `violatedDirective` incluye su valor y en algunos navegadores va vacía.
      directive: e.effectiveDirective || e.violatedDirective || 'desconocida',
      blockedURI: e.blockedURI || '',
      at: Date.now(),
    }
  })
}

/**
 * ¿Hubo una violación de CSP hace poco?
 *
 * La ventana existe para no culpar a la CSP de un fallo posterior sin relación:
 * una violación de hace cinco minutos no explica el error de ahora. Diez segundos
 * cubren de sobra el hueco entre "el script no carga" y "la promesa se rechaza".
 *
 * @param {number} ventanaMs
 * @returns {{directive: string, blockedURI: string, at: number} | null}
 */
export function recentCspViolation(ventanaMs = 10000) {
  if (!ultima) return null
  return Date.now() - ultima.at <= ventanaMs ? ultima : null
}
