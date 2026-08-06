/**
 * DailyMissions.jsx
 * -----------------------------------------------------------------------------
 * Las tres misiones del día en el menú. Compacto a propósito: comparte pantalla con
 * el panel de progreso, los capítulos y la rejilla de niveles, y en 360×640 no hay
 * sitio para una tarjeta por misión.
 *
 * Cada fila enseña ICONO · TEXTO · PROGRESO (2/3) y una barra fina. Al completarse,
 * la fila se marca en verde con ✔ y su recompensa ya está cobrada (se paga sola al
 * terminar la partida, sin botón de "reclamar": un botón extra solo añade un paso
 * que el jugador puede olvidar y dejar huesos sin recoger).
 * -----------------------------------------------------------------------------
 */

import { memo } from 'react'

function DailyMissions({ missions = [], done = 0 }) {
  if (!missions.length) return null
  const todasHechas = done >= missions.length

  return (
    <section className="missions" aria-label="Misiones de hoy">
      <header className="missions-head">
        <h2 className="missions-title">
          <span aria-hidden="true">📜</span> Misiones de hoy
        </h2>
        <span className={`missions-count ${todasHechas ? 'is-done' : ''}`}>
          {done}/{missions.length}
        </span>
      </header>

      <ul className="missions-list">
        {missions.map((m) => {
          const pct = m.goal > 0 ? Math.min(1, m.current / m.goal) : 0
          return (
            <li key={m.id} className={`mission ${m.done ? 'is-done' : ''}`}>
              <span className="mission-ico" aria-hidden="true">
                {m.done ? '✔' : m.icon}
              </span>
              <span className="mission-body">
                <span className="mission-text">{m.text}</span>
                {/* La barra va DENTRO de la fila para no añadir altura propia. */}
                <span className="mission-bar" aria-hidden="true">
                  <i style={{ width: `${pct * 100}%` }} />
                </span>
              </span>
              <span className="mission-right">
                {m.done ? (
                  <span className="mission-reward is-paid">+{m.reward} 🦴</span>
                ) : (
                  <>
                    <span className="mission-progress">
                      {m.current}/{m.goal}
                    </span>
                    <span className="mission-reward">+{m.reward} 🦴</span>
                  </>
                )}
              </span>
            </li>
          )
        })}
      </ul>

      {todasHechas && (
        <p className="missions-alldone">¡Las has hecho todas! Vuelve mañana 🦕</p>
      )}
    </section>
  )
}

/** memo: el menú re-renderiza al cambiar de capítulo y las misiones no dependen de eso. */
export default memo(DailyMissions)
