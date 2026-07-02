/**
 * MobileLayout.jsx
 * -----------------------------------------------------------------------------
 * Marco mobile-first. En móvil ocupa toda la pantalla; en escritorio centra el
 * juego en un "marco de teléfono" vertical. Evita el scroll y respeta las safe
 * areas (notch) del dispositivo. Todas las escenas se renderizan dentro.
 * -----------------------------------------------------------------------------
 */

export default function MobileLayout({ children }) {
  return (
    <div className="app-shell">
      <div className="app-frame">{children}</div>
    </div>
  )
}
