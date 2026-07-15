/**
 * ErrorBoundary.jsx
 * -----------------------------------------------------------------------------
 * Red de seguridad de toda la app. Sin esto, cualquier excepción durante el render
 * (un GLB corrupto, un contexto WebGL perdido, un nivel mal formado...) desmontaba
 * el árbol entero y dejaba una PANTALLA EN BLANCO sin salida.
 *
 * Ahora se muestra una pantalla de error amable, con T-Rexo en versión SVG (nunca
 * 3D: si lo que falló fue justamente el 3D, el fallback no puede depender de él) y
 * un botón para reintentar sin recargar.
 * -----------------------------------------------------------------------------
 */

import { Component } from 'react'
import DinoMascotPlaceholder from '../game/DinoMascotPlaceholder.jsx'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
    this.handleRetry = this.handleRetry.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Deja rastro en consola para depurar, sin romper la experiencia del jugador.
    console.error('[DinoColor] Error no controlado:', error, info?.componentStack)
  }

  handleRetry() {
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="scene scene--error">
        <h1 className="result-title">¡Ups!</h1>
        <DinoMascotPlaceholder
          mood="sad"
          size={148}
          message="Algo se ha roto... ¡pero no pasa nada, podemos volver a intentarlo!"
        />
        <div className="scene-actions">
          <button className="btn btn--primary btn--lg btn--block" onClick={this.handleRetry}>
            ↻ Reintentar
          </button>
          <button
            className="btn btn--secondary btn--lg btn--block"
            onClick={() => window.location.reload()}
          >
            ⟳ Recargar el juego
          </button>
        </div>
      </div>
    )
  }
}
