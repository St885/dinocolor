/**
 * GameHUD.jsx
 * -----------------------------------------------------------------------------
 * HUD de la pantalla de juego, compacto y premium:
 *   - Arriba: pausa (izq.), nivel + mejor puntuación (der.), cápsula de tiempo
 *     centrada y PUNTUACIÓN grande debajo.
 *   - Abajo: stats compactos (combo/aciertos/fallos), bloque "META: XXX PUNTOS" con
 *     barra de progreso, y el cofre en la esquina inferior derecha.
 * Mantiene popup de feedback ("+100" / "¡FALLO!"), destello de pantalla y háptica.
 * Es DOM (no 3D) para que el texto sea nítido en móvil.
 *
 * RENDIMIENTO:
 *   - `memo`: el HUD solo se repinta cuando cambia algo suyo, no en cada frame.
 *   - La barra de tiempo ya NO se actualiza 60 veces por segundo: useTimer avisa una
 *     vez por segundo y la barra interpola con una transición CSS lineal de 1s. Se ve
 *     continua y cuesta 1 render/s en vez de 60.
 * -----------------------------------------------------------------------------
 */

import { memo, useEffect, useState } from 'react'
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

function GameHUD({
  levelId,
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
  onPause,
}) {
  const [popup, setPopup] = useState(null)
  const [flash, setFlash] = useState(null)
  const [chestHint, setChestHint] = useState(false)

  useEffect(() => {
    if (!lastEvent) return undefined
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

  // El cofre era un <button> que no hacía absolutamente nada al pulsarlo: parecía roto.
  // Hasta que tenga recompensas de verdad, al menos responde y dice a qué juega.
  useEffect(() => {
    if (!chestHint) return undefined
    const id = setTimeout(() => setChestHint(false), 1800)
    return () => clearTimeout(id)
  }, [chestHint])

  const lowTime = timeLeft <= 5

  return (
    <div className="hud">
      {flash && <div className={`hud-flash hud-flash--${flash.kind}`} key={`flash-${flash.key}`} />}

      {/* ---------- Barra superior: pausa · nivel + mejor ---------- */}
      <div className="ghud-top">
        <button className="ghud-pause" onClick={onPause} aria-label="Pausar la partida">
          <span className="ghud-pause-bars">
            <i />
            <i />
          </span>
        </button>
        <div className="ghud-topright">
          <span className="ghud-chip ghud-level-num">
            <b>NIVEL</b> {levelId}
          </span>
          <span className="ghud-chip ghud-best">🏆 {bestScore}</span>
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
          <span className="ghud-score-value" key={score}>
            {score}
          </span>
        </div>

        {/* Popup de puntos / fallo: sale JUNTO A la puntuación y sube hacia ella
            ("los puntos vuelan al marcador"). Antes flotaba sobre el tablero y tapaba
            justo las pelotas que hay que mirar. */}
        {popup && (
          <div className={`hud-popup hud-popup--${popup.kind}`} key={`popup-${popup.key}`}>
            {popup.text}
          </div>
        )}
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
              <span className="ghud-meta-label">🎯 META</span>
              <span className="ghud-meta-value">
                {score} / {targetScore}
              </span>
            </div>
            <div className="ghud-metabar">
              <i style={{ width: pct(scoreProgress) }} />
            </div>
          </div>
          <div className="ghud-chest-slot">
            {chestHint && <span className="ghud-chest-tip">¡Muy pronto!</span>}
            <TreasureChest onClick={() => setChestHint(true)} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(GameHUD)
