/**
 * GameHUD.jsx
 * -----------------------------------------------------------------------------
 * HUD de la pantalla de juego, compacto y premium según el diseño aprobado:
 *   - Arriba: pausa/volver (izq.), nivel + mejor puntuación (der.), cápsula de
 *     tiempo centrada y PUNTUACIÓN grande debajo.
 *   - Abajo: stats compactos (combo/aciertos/fallos), bloque "META: XXX PUNTOS"
 *     con barra de progreso verde, y cofre en la esquina inferior derecha.
 * Mantiene popup de feedback ("+100"/"¡FALLO!"), destello de pantalla y háptica.
 * Es DOM (no 3D) para texto nítido en móvil.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState } from 'react'
import TreasureChest from './TreasureChest.jsx'
import { formatTime } from '../../utils/formatTime.js'

/** Vibración móvil opcional y segura (no hace nada si no está soportada). */
function haptic(pattern) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern)
  } catch {
    /* noop */
  }
}

const pct = (v) => `${Math.max(0, Math.min(1, v || 0)) * 100}%`

export default function GameHUD({
  levelId,
  levelName,
  timeLeft,
  timeProgress,
  score,
  targetScore,
  scoreProgress,
  combo,
  hits,
  misses,
  bestScore = 0,
  lastEvent,
  onExit,
}) {
  const [popup, setPopup] = useState(null)
  const [flash, setFlash] = useState(null)

  useEffect(() => {
    if (!lastEvent) return
    if (lastEvent.type === 'hit') {
      setPopup({ text: `+${lastEvent.points}`, kind: lastEvent.fast ? 'fast' : 'normal', key: lastEvent.key })
      setFlash({ kind: 'good', key: lastEvent.key })
      haptic(lastEvent.fast ? 14 : 9)
    } else if (lastEvent.type === 'wrong' || lastEvent.type === 'miss') {
      setPopup({ text: '¡FALLO!', kind: 'bad', key: lastEvent.key })
      setFlash({ kind: 'bad', key: lastEvent.key })
      haptic([0, 22, 30, 22])
    }
    const id = setTimeout(() => setPopup(null), 650)
    const id2 = setTimeout(() => setFlash(null), 300)
    return () => {
      clearTimeout(id)
      clearTimeout(id2)
    }
  }, [lastEvent])

  const lowTime = timeLeft <= 5

  return (
    <div className="hud">
      {flash && <div className={`hud-flash hud-flash--${flash.kind}`} key={`flash-${flash.key}`} />}

      {/* ---------- Barra superior: pausa · nivel + mejor ---------- */}
      <div className="ghud-top">
        <button className="ghud-pause" onClick={onExit} aria-label="Pausa / salir">
          ‖
        </button>
        <div className="ghud-topright">
          <span className="ghud-level-num">NIVEL {levelId}</span>
          <span className="ghud-best">🏆 {bestScore}</span>
        </div>
      </div>

      {/* ---------- Timer + puntuación centrados ---------- */}
      <div className="ghud-center">
        <div className={`ghud-timer ${lowTime ? 'is-low' : ''}`}>
          <span className="ghud-timer-ico">⏱</span>
          {formatTime(timeLeft)}
          <span className="ghud-timer-fill" style={{ width: pct(timeProgress) }} />
        </div>
        <div className="ghud-score">
          <span className="ghud-score-label">PUNTUACIÓN</span>
          <span className="ghud-score-value">{score}</span>
        </div>
      </div>

      <div className="hud-spacer" />

      {/* ---------- Bloque inferior: stats · meta+barra · cofre ---------- */}
      <div className="ghud-bottom">
        <div className="ghud-stats">
          <span className={`s-combo ${combo >= 3 ? 'is-hot' : ''}`}>🔥 x{combo}</span>
          <span className="s-hit">✔ {hits}</span>
          <span className="s-miss">✘ {misses}</span>
        </div>
        <div className="ghud-bottom-row">
          <div className="ghud-meta-block">
            <div className="ghud-meta-row">
              <span className="ghud-meta-label">META</span>
              <span className="ghud-meta-value">{targetScore} PUNTOS</span>
            </div>
            <div className="ghud-metabar">
              <i style={{ width: pct(scoreProgress) }} />
            </div>
          </div>
          <TreasureChest />
        </div>
      </div>

      {/* ---------- Popup de puntos / fallo ---------- */}
      {popup && (
        <div className={`hud-popup hud-popup--${popup.kind}`} key={`popup-${popup.key}`}>
          {popup.text}
        </div>
      )}
    </div>
  )
}
