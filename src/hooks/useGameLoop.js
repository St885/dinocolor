/**
 * useGameLoop.js
 * -----------------------------------------------------------------------------
 * El CORAZÓN de DinoColor. Orquesta una partida de un nivel:
 *   - mantiene qué pelotas están iluminadas (según activeBalls del nivel)
 *   - ilumina pelotas nuevas y hace expirar (fallar) las que no se pulsan a tiempo
 *   - aplica la puntuación (aciertos, combos, penalizaciones) usando scoringSystem
 *   - detecta victoria (puntuación objetivo) y derrota (tiempo agotado)
 *   - soporta PAUSA real (congela simulación y cronómetro)
 *   - reproduce los sonidos correspondientes
 *
 * La simulación rápida vive en refs (no provoca renders); el estado para la UI se
 * "sincroniza" a React tras cada cambio. Las pelotas iluminadas se animan en el
 * propio componente 3D con useFrame, así que no necesitamos render por frame aquí.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getLayout } from '../data/boardLayouts.js'
import {
  computeHitScore,
  wrongTapPenalty,
  missPenalty,
} from '../systems/scoringSystem.js'
import { Sounds } from '../systems/audioSystem.js'
import { comboMilestone, familyForColor } from '../data/hitEffects.js'
import { useTimer } from './useTimer.js'
import { pick } from '../utils/random.js'

const TICK_MS = 90 // frecuencia de actualización de la simulación de luces

const now = () =>
  typeof performance !== 'undefined' && performance.now
    ? performance.now()
    : Date.now()

/**
 * Contador monótono para las `key` de los eventos de feedback.
 * Antes se usaba el timestamp (y en los fallos `timestamp + puntuación`), lo que
 * podía repetir la misma key en dos eventos distintos: la animación del popup no se
 * reiniciaba y el jugador se perdía un "+100" o un "¡FALLO!".
 */
let eventSeq = 0
const nextEventKey = () => ++eventSeq

const freshSim = () => ({
  lights: new Map(), // cellId -> { activatedAt, expireAt }
  score: 0,
  combo: 0,
  bestCombo: 0,
  hits: 0,
  misses: 0,
  finished: false,
  pausedAt: null, // timestamp al pausar; sirve para re-anclar los plazos de las bolas
})

export function useGameLoop({ level, onFinish, startPaused = false }) {
  // Memoizado por forma: mantiene una identidad estable del layout entre renders, así
  // Board3D no reconstruye su geometría (THREE.Shape) al cambiar la puntuación.
  const layout = useMemo(() => getLayout(level.layout), [level.layout])

  // --- Estado mutable de la simulación (no provoca renders) ---
  const sim = useRef(freshSim())

  // --- Estado espejo para la UI ---
  const [status, setStatus] = useState('playing') // 'playing' | 'won' | 'lost'

  // `startPaused` arranca la partida CONGELADA (tablero apagado, cronómetro intacto).
  // Lo usa el tutorial del nivel 1: sin esto el bucle hace su primer tick al montar y
  // el jugador perdería tiempo y una bola mientras lee las instrucciones.
  const [paused, setPaused] = useState(startPaused)
  const startPausedRef = useRef(startPaused)
  const [activeIds, setActiveIds] = useState(() => new Set())
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [lastEvent, setLastEvent] = useState(null) // feedback visual puntual

  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])

  // Puente hacia el tiempo restante EXACTO del cronómetro. Hace falta porque las
  // estrellas se calculan por rapidez (ver scoringSystem) y `finish` se define antes
  // que `useTimer` — que a su vez necesita `finish` para el fin de tiempo. Se guarda
  // la ref del cronómetro (no su valor) para leer siempre el dato vivo, no el del
  // último render: el estado de React solo se refresca una vez por segundo.
  const timerRef = useRef(null)

  // Vuelca el estado de la simulación a React.
  const sync = useCallback(() => {
    const s = sim.current
    setActiveIds(new Set(s.lights.keys()))
    setScore(s.score)
    setCombo(s.combo)
    setHits(s.hits)
    setMisses(s.misses)
  }, [])

  const finish = useCallback(
    (outcome) => {
      const s = sim.current
      if (s.finished) return
      s.finished = true
      // Apagar el tablero: si no, las pelotas se quedaban encendidas durante la
      // transición a la pantalla de resultado (y seguían pareciendo pulsables).
      s.lights.clear()
      setActiveIds(new Set())
      setStatus(outcome)
      const timeLeft = timerRef.current ? Math.max(0, timerRef.current.current) : 0
      onFinishRef.current &&
        onFinishRef.current({
          outcome, // 'won' | 'lost'
          levelId: level.id,
          score: s.score,
          hits: s.hits,
          misses: s.misses,
          bestCombo: s.bestCombo,
          targetScore: level.targetScore,
          // Rapidez: de aquí salen las estrellas y el resumen de la pantalla final.
          timeLeft,
          totalTime: level.totalTime,
        })
    },
    [level.id, level.targetScore, level.totalTime],
  )

  // --- Reinicio al (re)entrar a un nivel ---
  useEffect(() => {
    sim.current = freshSim()
    setStatus('playing')
    setPaused(startPausedRef.current)
    setLastEvent(null)
    sync()
    // Reaccionamos al id del nivel: cada nivel es una partida nueva.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level.id])

  // "Vivo" = jugando y sin pausar. Congela simulación y cronómetro a la vez.
  const live = status === 'playing' && !paused

  // --- Bucle de simulación de luces ---
  useEffect(() => {
    if (!live) return undefined

    const allCellIds = layout.cells.map((c) => c.id)

    const tick = () => {
      const s = sim.current
      if (s.finished) return
      const t = now()
      let changed = false
      let expired = 0

      // 1) Expirar pelotas no pulsadas a tiempo -> fallo
      for (const [cellId, light] of s.lights) {
        if (t >= light.expireAt) {
          s.lights.delete(cellId)
          s.score = Math.max(0, s.score - missPenalty())
          s.combo = 0
          s.misses += 1
          expired += 1
          changed = true
        }
      }
      if (expired > 0) {
        // Un solo sonido y un solo popup aunque expiren varias a la vez (antes se
        // solapaban N zumbidos y solo sobrevivía el último evento del bucle).
        Sounds.miss()
        setLastEvent({ type: 'miss', count: expired, key: nextEventKey() })
      }

      // 2) Rellenar hasta activeBalls con celdas libres
      const target = Math.min(level.activeBalls, allCellIds.length)
      while (s.lights.size < target) {
        const free = allCellIds.filter((id) => !s.lights.has(id))
        if (free.length === 0) break
        s.lights.set(pick(free), {
          activatedAt: t,
          expireAt: t + level.reactionTime * 1000,
        })
        changed = true
      }

      if (changed) sync()
    }

    // Primer tick inmediato para que el tablero no arranque vacío.
    tick()
    const intervalId = setInterval(tick, TICK_MS)
    return () => clearInterval(intervalId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, level.id])

  // --- Timer de la partida ---
  const handleExpire = useCallback(() => {
    const s = sim.current
    if (s.finished) return
    finish(s.score >= level.targetScore ? 'won' : 'lost')
  }, [finish, level.targetScore])

  const { timeLeft, progress: timeProgress, timeLeftRef } = useTimer({
    duration: level.totalTime,
    running: live,
    onExpire: handleExpire,
  })

  // `timeLeftRef` es estable, así que esto se ejecuta una sola vez: deja a `finish`
  // (definido más arriba) una vía para leer el tiempo exacto al terminar la partida.
  useEffect(() => {
    timerRef.current = timeLeftRef
  }, [timeLeftRef])

  // --- Interacción: el jugador pulsa una pelota ---
  const onBallTap = useCallback(
    /**
     * `at` es la posición EN PANTALLA del toque, que aporta Ball3D. Viaja hasta
     * `lastEvent` para que el texto flotante salga sobre la pelota tocada sin
     * proyectar coordenadas 3D por su cuenta. Es opcional: si falta, el efecto se
     * limita a no dibujar el texto.
     */
    (cellId, at) => {
      const s = sim.current
      if (s.finished || !live) return
      const t = now()

      if (s.lights.has(cellId)) {
        // ACIERTO
        const light = s.lights.get(cellId)
        s.lights.delete(cellId)
        s.combo += 1
        if (s.combo > s.bestCombo) s.bestCombo = s.combo
        const { points, fast, multiplier } = computeHitScore(
          t - light.activatedAt,
          level.reactionTime,
          s.combo,
        )
        s.score += points
        s.hits += 1
        // Sonido POR FAMILIA de color (v0.6.3): cada tramo del juego suena distinto.
        // `hit()`/`combo()` siguen existiendo intactos como respaldo.
        const family = familyForColor(level.activeColor).id
        Sounds.hitFamily(family, fast)
        // Al cruzar un escalón de combo se encadena un arpegio POR ENCIMA del
        // acierto (arranca con retardo, así que no se pisan).
        const milestone = comboMilestone(s.combo)
        if (milestone) Sounds.comboUp(milestone.tier)
        setLastEvent({
          type: 'hit',
          points,
          combo: s.combo,
          fast,
          multiplier,
          family,
          at,
          milestone: milestone ? milestone.label : null,
          key: nextEventKey(),
        })
        sync()
        if (s.score >= level.targetScore) finish('won')
      } else {
        // FALLO: pulsar una pelota apagada
        s.score = Math.max(0, s.score - wrongTapPenalty(level))
        s.combo = 0
        s.misses += 1
        Sounds.miss()
        setLastEvent({ type: 'wrong', at, key: nextEventKey() })
        sync()
      }
    },
    [live, level, finish, sync],
  )

  // Pausa/reanuda. Las bolas iluminadas guardan un `expireAt` ABSOLUTO (reloj que no se
  // detiene durante la pausa). Sin re-anclarlas, al reanudar el primer tick vería TODAS
  // las bolas como expiradas de golpe → "¡FALLO!" masivo, combo a 0 y pérdida de puntos
  // sin culpa del jugador. Al reanudar desplazamos `expireAt` y `activatedAt` por el
  // tiempo que estuvo pausado, así cada bola conserva el tiempo que le quedaba (y el
  // bonus de acierto "rápido" tampoco cuenta la pausa). El cronómetro ya se congela solo
  // en useTimer; esto hace lo mismo con los plazos de las bolas.
  const pause = useCallback(() => {
    sim.current.pausedAt = now()
    setPaused(true)
  }, [])
  const resume = useCallback(() => {
    const s = sim.current
    // Una vez el jugador ha reanudado, la partida ya no debe volver a arrancar pausada.
    startPausedRef.current = false
    if (s.pausedAt != null) {
      const delta = Math.max(0, now() - s.pausedAt)
      for (const light of s.lights.values()) {
        light.expireAt += delta
        light.activatedAt += delta
      }
      s.pausedAt = null
    }
    setPaused(false)
  }, [])

  return {
    layout,
    status,
    paused,
    pause,
    resume,
    activeIds,
    score,
    combo,
    hits,
    misses,
    lastEvent,
    timeLeft,
    timeProgress,
    scoreProgress: Math.min(1, score / level.targetScore),
    onBallTap,
  }
}

export default useGameLoop
