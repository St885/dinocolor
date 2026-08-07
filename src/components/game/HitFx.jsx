/**
 * HitFx.jsx
 * -----------------------------------------------------------------------------
 * Capa de efectos en DOM sobre el tablero: textos flotantes al acertar ("+150",
 * "¡RÁPIDO!", "¡COMBO x3!") y avisos de fallo ("¡Se apagó!").
 *
 * POR QUÉ EN DOM Y NO EN EL CANVAS: el texto nítido en móvil es justo lo que el
 * proyecto ya resolvió poniendo HUD y menús en DOM (ver dinocolor-context). Meter
 * tipografía en el canvas obligaría a texturas o a un `Text` de drei —una
 * dependencia que no queremos— y se vería peor.
 *
 * POR QUÉ EL ESTADO VIVE AQUÍ Y NO EN GameScene: así los textos que entran y
 * salen re-renderizan SOLO este componente. Si la lista viviera en GameScene,
 * cada "+100" volvería a renderizar el árbol del tablero.
 *
 * RENDIMIENTO — las tres reglas que sigue:
 *  1. Tope duro de elementos vivos (MAX_FX). Machacar el tablero no puede llenar
 *     la pantalla ni el DOM: los más viejos se descartan.
 *  2. Se anima `transform` y `opacity`, nunca `top`/`left`. La posición inicial se
 *     fija una vez con `left/top` en línea y a partir de ahí solo se traslada.
 *  3. UN solo temporizador de barrido, no uno por texto. Con seis textos y un
 *     `setTimeout` cada uno, salir de la partida a mitad de racha dejaba seis
 *     temporizadores vivos que había que limpiar de uno en uno.
 * -----------------------------------------------------------------------------
 */

import { memo, useEffect, useRef, useState } from 'react'

/** Máximo de textos simultáneos. Por encima de esto se descartan los más viejos. */
const MAX_FX = 6

/** Cuánto vive cada texto (ms). Debe cuadrar con la animación de fx.css. */
const LIFE_MS = 900

/** Cada cuánto se barren los expirados. */
const SWEEP_MS = 300

let seq = 0

function HitFx({ lastEvent, color = '#39ff88' }) {
  const [items, setItems] = useState([])
  /**
   * La posición del toque llega en coordenadas de VENTANA (clientX/clientY), pero
   * los textos se posicionan dentro de esta capa. En móvil el marco ocupa toda la
   * pantalla y ambas coinciden; en ESCRITORIO el marco va centrado con
   * `max-width: 480px`, así que usar las de ventana tal cual desplazaría el "+150"
   * cientos de píxeles. Se convierten con el rect del contenedor: una sola medida
   * por acierto, no por frame.
   */
  const boxRef = useRef(null)
  // Espejo del último evento procesado: `lastEvent` puede llegar repetido en un
  // re-render del padre y no queremos duplicar el texto.
  const lastKey = useRef(null)

  useEffect(() => {
    if (!lastEvent || lastEvent.key === lastKey.current) return
    lastKey.current = lastEvent.key

    // Coordenadas locales del toque (o null si el evento no trae posición).
    const box = boxRef.current?.getBoundingClientRect()
    const at =
      lastEvent.at && box
        ? { x: lastEvent.at.x - box.left, y: lastEvent.at.y - box.top }
        : null

    const nuevos = []
    if (lastEvent.type === 'hit') {
      nuevos.push({
        id: ++seq,
        born: Date.now(),
        at,
        text: `+${lastEvent.points}`,
        kind: lastEvent.fast ? 'fast' : 'hit',
        family: lastEvent.family,
      })
      if (lastEvent.fast) {
        nuevos.push({
          id: ++seq,
          born: Date.now(),
          at,
          text: '¡RÁPIDO!',
          kind: 'tag',
          family: lastEvent.family,
          // Se desplaza un poco para no caer justo encima del "+150".
          offset: -26,
        })
      }
      if (lastEvent.milestone) {
        nuevos.push({
          id: ++seq,
          born: Date.now(),
          at,
          text: lastEvent.milestone,
          kind: 'combo',
          family: lastEvent.family,
          offset: -52,
        })
      }
    } else if (lastEvent.type === 'wrong') {
      nuevos.push({ id: ++seq, born: Date.now(), at, text: 'No era esa', kind: 'bad' })
    } else if (lastEvent.type === 'miss') {
      // Las que se apagan solas no tienen posición de toque: el aviso va al centro.
      nuevos.push({ id: ++seq, born: Date.now(), at: null, text: 'Se apagó', kind: 'bad' })
    }

    if (!nuevos.length) return
    // Tope duro: se conservan los últimos MAX_FX.
    setItems((prev) => [...prev, ...nuevos].slice(-MAX_FX))
  }, [lastEvent])

  // Un ÚNICO barrido periódico retira los expirados. Solo corre mientras hay algo
  // en pantalla, así que en una partida tranquila no hay ningún temporizador vivo.
  useEffect(() => {
    if (!items.length) return undefined
    const id = setInterval(() => {
      const ahora = Date.now()
      setItems((prev) => prev.filter((i) => ahora - i.born < LIFE_MS))
    }, SWEEP_MS)
    return () => clearInterval(id)
  }, [items.length])

  // El contenedor se monta SIEMPRE, aunque no haya textos. Si se devolviera null
  // cuando la lista está vacía, `boxRef` seguiría a null en el PRIMER acierto y ese
  // texto saldría centrado en vez de sobre la pelota. Un div vacío, absoluto y sin
  // eventos no cuesta nada.
  return (
    <div className="hitfx" ref={boxRef} aria-hidden="true">
      {items.map((i) => (
        <span
          key={i.id}
          className={`hitfx-item hitfx-item--${i.kind} ${i.family ? `hitfx-fam-${i.family}` : ''}`}
          style={{
            // Posición ya convertida a coordenadas de ESTA capa. Si el evento no
            // trae posición (una pelota que se apagó sola), sale centrado por CSS.
            ...(i.at ? { left: `${i.at.x}px`, top: `${i.at.y + (i.offset || 0)}px` } : null),
            // El color del NIVEL manda: es la misma señal que el jugador acaba de
            // tocar, así que el texto la refuerza en vez de introducir otro tono.
            '--fx-color': i.kind === 'bad' ? '#ff8a3d' : color,
          }}
        >
          {i.text}
        </span>
      ))}
    </div>
  )
}

/** memo: GameScene se re-renderiza con cada segundo del cronómetro. */
export default memo(HitFx)
