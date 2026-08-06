/**
 * MiniDinoWalker.jsx
 * -----------------------------------------------------------------------------
 * Acompañante 3D de la pantalla de juego: un mini T-Rexo que vive en su tarima, en
 * la zona segura de arriba-izquierda (bajo el botón de pausa).
 *
 * Comportamiento (bucle de "compañía"):
 *   - descansa con un balanceo suave, derivando un poco por su tarima,
 *   - al ACERTAR el jugador, SALTA de alegría un instante y vuelve a lo suyo.
 *
 * Por qué ya NO camina ni baila: el GLB de T-Rexo no tiene clip de caminar, y sus clips
 * expresivos (dance, celebrate...) ROMPEN la malla — le despegan trozos del cuerpo (ver
 * SAFE_CLIPS en DinoMascot.jsx). Antes se cargaba `oliver_master.glb` (~44 MB) SOLO para
 * robarle el clip "Walking": un precio absurdo por una figurita de 88 px.
 *
 * Lo que sí hace: `idle` (el único clip que se ve bien) + movimiento del cuerpo entero
 * (deriva y salto). El salto de celebración es una pose rígida, así que se ve fenomenal
 * y no puede romper nada.
 *
 * NUNCA tapa el tablero: Board3D reserva una banda superior en píxeles y encaja el
 * tablero por DEBAJO de esta tarima (ver TOP_RESERVE_PX en Board3D.jsx).
 * -----------------------------------------------------------------------------
 */

import { memo, useEffect, useRef, useState } from 'react'
import DinoMascot from './DinoMascot.jsx'
import { MASCOT_NAME } from '../../data/mascot.js'

const DRIFT_MS = 3400 // cada cuánto cambia de lado de la tarima
const CHEER_MS = 1100 // celebración al acertar

function MiniDinoWalker({ lastEvent, size = 88, sleeping = false, skin }) {
  const [side, setSide] = useState(0) // extremo de la tarima hacia el que deriva
  const [cheer, setCheer] = useState(false)
  const cheerRef = useRef(null)

  // Mira hacia donde deriva.
  const facing = side === 1 ? 1 : -1

  // Deriva lenta de un lado a otro de su tarima. Se detiene con la partida pausada:
  // un dinosaurio paseando sobre un juego congelado se ve como un fallo.
  useEffect(() => {
    if (sleeping) return undefined
    const id = setInterval(() => setSide((s) => (s === 0 ? 1 : 0)), DRIFT_MS)
    return () => clearInterval(id)
  }, [sleeping])

  /**
   * Celebración al acertar: cambia la POSE (salto), no el clip.
   *
   * BUG CORREGIDO: el efecto salía antes con `return undefined` cuando el evento no era
   * un acierto, y su cleanup (`clearTimeout`) se ejecutaba igual al llegar ese evento.
   * Resultado: acierto → fallo dejaba el temporizador CANCELADO con `cheer` en true, y
   * T-Rexo se quedaba celebrando indefinidamente (dando saltos mientras el jugador
   * fallaba) hasta el siguiente acierto. Ahora el temporizador se gestiona en la ref y
   * solo se cancela al desmontar: cada acierto reprograma su propio fin.
   */
  useEffect(() => {
    if (!lastEvent || lastEvent.type !== 'hit') return
    setCheer(true)
    clearTimeout(cheerRef.current)
    cheerRef.current = setTimeout(() => setCheer(false), CHEER_MS)
  }, [lastEvent])

  // El timeout de celebración se re-crea con cada acierto: hay que limpiarlo también
  // al DESMONTAR o queda vivo tras salir al menú (timer huérfano).
  useEffect(() => () => clearTimeout(cheerRef.current), [])

  return (
    <div className="mini-dino2" aria-hidden="true">
      <div className="mini-dino2-stage">
        <span className="mini-dino2-shadow" />
        <div className={`mini-dino2-track ${cheer ? 'is-cheer' : ''}`} data-side={side}>
          <div className="mini-dino2-flip" style={{ '--facing': facing }}>
            <DinoMascot
              model="trexo"
              pose={cheer ? 'cheer' : 'idle'}
              size={size}
              quality="low"
              sleeping={sleeping}
              skin={skin}
              /* Con fov 30 a distancia 2.95 la altura visible es ≈1.58 (y ∈ ±0.79).
                 El modelo v3 llena y ∈ [-0.62, 0.62]: aprovecha la tarima sin
                 rozar los bordes. Antes ocupaba 1.02 y, siendo más estrecho que
                 el modelo anterior, se leía como una manchita azul. */
              targetHeight={1.24}
              baseY={-0.62}
              cameraY={0.52}
              cameraDistance={2.95}
              className="mini-dino2-model"
            />
          </div>
        </div>
        <span className="mini-dino2-label">{MASCOT_NAME}</span>
      </div>
    </div>
  )
}

/** memo: GameScene se re-renderiza con cada acierto y cada segundo del cronómetro. */
export default memo(MiniDinoWalker)
