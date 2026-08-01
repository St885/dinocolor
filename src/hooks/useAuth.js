/**
 * useAuth.js
 * -----------------------------------------------------------------------------
 * Puente entre `authService` (módulo con estado, global) y React. Fino a
 * propósito: toda la lógica vive en el servicio, así que se puede razonar sobre
 * la sesión sin montar un componente.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState } from 'react'
import { getAuthState, initAuth, subscribe } from '../systems/auth/authService.js'

export function useAuth() {
  const [state, setState] = useState(getAuthState)

  useEffect(() => {
    // Suscribirse ANTES de arrancar: si `initAuth` resuelve de forma síncrona
    // (caso "sin Firebase configurado"), su emisión no puede perderse.
    const unsubscribe = subscribe(setState)
    initAuth()
    // El estado pudo cambiar entre el primer render y este efecto.
    setState(getAuthState())
    return unsubscribe
  }, [])

  return {
    user: state.user,
    status: state.status,
    isLoading: state.status === 'loading',
    isSignedIn: Boolean(state.user),
    isGuest: Boolean(state.user && state.user.isGuest),
  }
}

export default useAuth
