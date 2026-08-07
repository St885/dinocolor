/**
 * DailyChallenge.jsx
 * -----------------------------------------------------------------------------
 * El desafío del día en el menú: un bloque compacto, más llamativo que una misión
 * (es uno solo y paga más) pero sin robarle la pantalla a la lista de niveles.
 *
 * Se distingue de las misiones por COLOR, no por tamaño: cian/morado frente al
 * verde del resto. Así se lee como "otra cosa" de un vistazo sin ocupar más alto.
 *
 * El botón lleva al nivel del reto cuando el reto apunta a uno concreto, y al
 * nivel por el que va el jugador cuando es general. Nunca deja al jugador con la
 * duda de "vale, ¿y ahora dónde hago esto?".
 * -----------------------------------------------------------------------------
 */

import { memo } from 'react'
import { Sounds, unlock } from '../../systems/audioSystem.js'

function DailyChallenge({ challenge, onGo }) {
  if (!challenge) return null

  const pct = challenge.goal > 0 ? Math.min(1, challenge.current / challenge.goal) : 0

  const handleGo = () => {
    unlock()
    Sounds.click()
    onGo(challenge.level || 0)
  }

  return (
    <section className={`challenge ${challenge.done ? 'is-done' : ''}`} aria-label="Desafío de hoy">
      <header className="challenge-head">
        <span className="challenge-ico" aria-hidden="true">
          {challenge.done ? '✔' : challenge.icon}
        </span>
        <h2 className="challenge-title">Desafío de hoy</h2>
        <span className={`challenge-badge ${challenge.done ? 'is-done' : ''}`}>
          {challenge.done ? 'Completado' : `+${challenge.reward} 🦴`}
        </span>
      </header>

      <p className="challenge-text">{challenge.text}</p>
      {/* La pista explica CÓMO conseguirlo. Sin ella, "gana con 85 % de precisión"
          es una cifra que el jugador no sabe de dónde sale. */}
      {!challenge.done && <p className="challenge-hint">{challenge.hint}</p>}

      <div className="challenge-foot">
        <span className="challenge-bar" aria-hidden="true">
          <i style={{ width: `${pct * 100}%` }} />
        </span>
        <span className="challenge-progress">
          {challenge.current}/{challenge.goal}
        </span>
        {!challenge.done && (
          <button type="button" className="challenge-go" onClick={handleGo}>
            {challenge.level ? `Ir al nivel ${challenge.level}` : 'Jugar'}
          </button>
        )}
      </div>
    </section>
  )
}

/** memo: el menú se re-renderiza al cambiar de capítulo y el reto no depende de eso. */
export default memo(DailyChallenge)
