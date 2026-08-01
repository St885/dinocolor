/**
 * AccountChip.jsx
 * -----------------------------------------------------------------------------
 * Identidad del jugador en la cabecera del menú: inicial, nombre y salida.
 *
 * Al pulsarlo pide confirmación EN LÍNEA en vez de abrir un `confirm()` del
 * navegador: el diálogo nativo rompe la estética del juego, no se puede estilar
 * y en WebView/Capacitor a veces ni aparece. Además, cerrar sesión sin
 * confirmar sería demasiado fácil de tocar por accidente con el pulgar.
 *
 * Solo muestra el NOMBRE, nunca el correo: en la pantalla de un niño no hace
 * falta enseñar un dato personal para saber quién está dentro.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useState } from 'react'
import { Sounds, unlock } from '../../systems/audioSystem.js'

export default function AccountChip({ user, onSignOut }) {
  const [confirming, setConfirming] = useState(false)

  const handleToggle = useCallback(() => {
    unlock()
    Sounds.click()
    setConfirming((v) => !v)
  }, [])

  const handleSignOut = useCallback(() => {
    Sounds.click()
    setConfirming(false)
    onSignOut()
  }, [onSignOut])

  if (!user) return null

  const initial = (user.displayName || '?').trim().charAt(0) || '?'

  if (confirming) {
    return (
      <div className="account-chip account-chip--confirm">
        <span className="account-name">¿Cerrar sesión?</span>
        <button type="button" className="account-yes" onClick={handleSignOut}>
          Sí
        </button>
        <button type="button" className="account-no" onClick={handleToggle}>
          No
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`account-chip ${user.isGuest ? 'account-chip--guest' : ''}`}
      onClick={handleToggle}
      aria-label={`Sesión de ${user.displayName}. Pulsa para cerrar sesión`}
    >
      <span className="account-avatar" aria-hidden="true">
        {user.isGuest ? '👤' : initial}
      </span>
      <span className="account-name">{user.displayName}</span>
    </button>
  )
}
