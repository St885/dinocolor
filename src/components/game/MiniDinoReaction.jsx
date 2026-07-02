/**
 * MiniDinoReaction.jsx
 * -----------------------------------------------------------------------------
 * Mini mascota de apoyo (Oliver/T-Rexo) DENTRO de la pantalla de juego: pequeña,
 * no invasiva, que REACCIONA a los eventos del jugador como un mini entrenador.
 *
 * Reacciones (derivadas de `lastEvent` del bucle de juego):
 *   - idle    : sin eventos recientes.
 *   - success : el jugador acierta (~1.1s, luego vuelve a idle).
 *   - fail    : el jugador falla (~1.1s, luego vuelve a idle).
 *   - win/lose: opcionales vía prop `reaction` (en la práctica la victoria/derrota
 *               las muestra la mascota grande de ResultScene; aquí quedan soportadas).
 *
 * Rendimiento: reutiliza `DinoMascot` (mismo GLB de Oliver que StartScene → el
 * caché de `useLoader` evita recargarlo). Como `oliver_character.glb` trae 1 sola
 * animación, la reacción se refuerza con efectos CSS (pop/shake/glow) + mini-mensaje,
 * así SIEMPRE se percibe la reacción (con `master` además cambia la animación).
 * -----------------------------------------------------------------------------
 */

import { useEffect, useRef, useState } from 'react'
import DinoMascot from './DinoMascot.jsx'

/** reacción -> nombre de animación (mapeo inteligente para oliver_master.glb).
 *  Se evitan animaciones agresivas (kicks, rifle). Con character.glb (1 clip) el
 *  resolvedor difuso cae a esa única animación; la reacción la dan los efectos CSS. */
const REACTION_ANIM = {
  idle: 'Idle_02',
  success: 'Big_Wave_Hello',
  fail: 'Alert',
  win: 'Shake_It_Off_Dance',
  lose: 'Alert',
}

const MSG = {
  success: ['¡Bien!', '¡Rápido!', '¡Sigue!'],
  fail: ['¡Casi!', 'Intenta otra', 'No pasa nada'],
}
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const REACTION_MS = 1100

export default function MiniDinoReaction({
  lastEvent,
  reaction: reactionOverride,
  size = 78,
  position = 'top-left',
  visible = true,
}) {
  const [reaction, setReaction] = useState('idle')
  const [msg, setMsg] = useState(null)
  const timerRef = useRef(null)

  // Deriva success/fail del último evento del juego (acierto / fallo).
  useEffect(() => {
    if (!lastEvent) return undefined
    let r = null
    if (lastEvent.type === 'hit') r = 'success'
    else if (lastEvent.type === 'wrong' || lastEvent.type === 'miss') r = 'fail'
    if (!r) return undefined
    setReaction(r)
    setMsg({ text: pick(MSG[r]), kind: r, key: lastEvent.key })
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setReaction('idle')
      setMsg(null)
    }, REACTION_MS)
    return () => clearTimeout(timerRef.current)
  }, [lastEvent])

  // La prop `reaction` (p. ej. win/lose desde el padre) tiene prioridad.
  const active = reactionOverride || reaction
  const anim = REACTION_ANIM[active] || 'Idle_02'

  if (!visible) return null

  return (
    <div className={`mini-dino mini-dino--${position} mini-dino--${active}`} aria-hidden="true">
      {msg && (
        <div className={`mini-dino-msg mini-dino-msg--${msg.kind}`} key={msg.key}>
          {msg.text}
        </div>
      )}
      <div className="mini-dino-body">
        <DinoMascot
          model="oliver"
          animation={anim}
          size={size}
          mood="happy"
          className="mini-dino-model"
        />
      </div>
    </div>
  )
}
