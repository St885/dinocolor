/**
 * DailyStreak.jsx
 * -----------------------------------------------------------------------------
 * La racha de entrada, en dos formas:
 *
 *   <DailyStreakModal>  se abre solo al entrar al menú CUANDO HAY RECOMPENSA.
 *   <DailyStreakStrip>  tira compacta que queda en el menú el resto del día.
 *
 * POR QUÉ UN MODAL Y NO UN PANEL FIJO. En 360×640 la zona con scroll del menú
 * mide 134 px: un panel permanente de racha (siete casillas + botón) se comería
 * la lista de niveles. Y al revés, una recompensa que espera escondida bajo un
 * scroll no la reclama nadie. El modal aparece SOLO el momento en que hay algo
 * que cobrar —una vez al día, con su ✕ para salir— y el resto del tiempo la
 * información vive en una tira de 40 px.
 *
 * El modal NO bloquea: se puede cerrar sin cobrar y el botón sigue en la tira.
 * -----------------------------------------------------------------------------
 */

import { memo, useCallback, useState } from 'react'
import Button from '../ui/Button.jsx'
import { Sounds, unlock } from '../../systems/audioSystem.js'

/** Las siete casillas del ciclo. Compartidas por el modal y la tira. */
function StreakDots({ days, compact = false }) {
  return (
    <ol className={`streak-dots ${compact ? 'streak-dots--compact' : ''}`}>
      {days.map((d) => (
        <li
          key={d.day}
          className={[
            'streak-dot',
            d.claimed && 'is-claimed',
            d.isToday && 'is-today',
            d.isBonus && 'is-bonus',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="streak-dot-day">{d.isBonus ? '★' : d.day}</span>
          {!compact && <span className="streak-dot-reward">{d.reward}</span>}
        </li>
      ))}
    </ol>
  )
}

export const DailyStreakModal = memo(function DailyStreakModal({ streak, onClaim, onClose }) {
  const [cobrado, setCobrado] = useState(null)

  const handleClaim = useCallback(() => {
    unlock()
    const res = onClaim()
    // `onClaim` devuelve null si hoy ya estaba cobrada (doble pulsación, otra
    // pestaña…). En ese caso no se celebra nada y se cierra sin más.
    if (!res) {
      onClose()
      return
    }
    Sounds.reward()
    setCobrado(res)
  }, [onClaim, onClose])

  return (
    <div className="streak-backdrop" role="dialog" aria-modal="true" aria-label="Recompensa diaria">
      <div className="streak-modal">
        <button className="streak-close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>

        {cobrado ? (
          <>
            <h2 className="streak-title">¡Recompensa recogida!</h2>
            <p className="streak-gain">
              +{cobrado.reward} <span aria-hidden="true">🦴</span>
            </p>
            <p className="streak-sub">
              {cobrado.isBonus
                ? '¡Semana completa! Mañana empieza una racha nueva.'
                : 'Vuelve mañana para seguir la racha.'}
            </p>
            <Button variant="primary" size="md" block onClick={onClose}>
              ¡Genial!
            </Button>
          </>
        ) : (
          <>
            <h2 className="streak-title">
              <span aria-hidden="true">🔥</span> Racha diaria
            </h2>
            <p className="streak-sub">
              {streak.continues
                ? `Día ${streak.currentDay} de 7. ¡Sigue así!`
                : 'Empiezas una racha nueva. Entra cada día para subirla.'}
            </p>
            <StreakDots days={streak.days} />
            <Button variant="primary" size="lg" block onClick={handleClaim}>
              Reclamar +{streak.reward} 🦴
            </Button>
            <p className="streak-foot">Mañana: +{streak.nextReward} 🦴</p>
          </>
        )}
      </div>
    </div>
  )
})

export const DailyStreakStrip = memo(function DailyStreakStrip({ streak, onOpen }) {
  return (
    <button
      type="button"
      className={`streak-strip ${streak.claimedToday ? 'is-done' : 'is-ready'}`}
      onClick={onOpen}
      aria-label={
        streak.claimedToday
          ? `Racha diaria: día ${streak.currentDay} de 7, ya reclamada. Mañana +${streak.nextReward} huesos`
          : `Racha diaria: reclama ${streak.reward} huesos`
      }
    >
      <span className="streak-strip-ico" aria-hidden="true">
        🔥
      </span>
      <span className="streak-strip-body">
        <span className="streak-strip-title">
          Racha · día {streak.currentDay}/7
        </span>
        <StreakDots days={streak.days} compact />
      </span>
      <span className="streak-strip-cta">
        {streak.claimedToday ? (
          <>
            <b>Vuelve mañana</b>
            <i>+{streak.nextReward} 🦴</i>
          </>
        ) : (
          <b className="streak-strip-claim">+{streak.reward} 🦴</b>
        )}
      </span>
    </button>
  )
})
