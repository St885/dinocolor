/**
 * MobileLayout.jsx
 * -----------------------------------------------------------------------------
 * Marco mobile-first. En móvil ocupa toda la pantalla; en escritorio centra el
 * juego en un "marco de teléfono" vertical. Evita el scroll y respeta las safe
 * areas (notch) del dispositivo. Todas las escenas se renderizan dentro.
 * -----------------------------------------------------------------------------
 */

/**
 * `theme` es el id del ambiente equipado. Se aplica como `data-theme` en el marco
 * (y en el shell, que es quien pinta el fondo de escritorio): el CSS redefine ahí
 * un puñado de variables y cambia toda la atmósfera con un repintado, sin
 * re-renderizar nada del árbol 3D.
 */
export default function MobileLayout({ children, theme = 'jungle' }) {
  return (
    <div className="app-shell" data-theme={theme}>
      <div className="app-frame" data-theme={theme}>
        {children}
      </div>
    </div>
  )
}
