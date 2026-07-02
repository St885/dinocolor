/**
 * useGameLoop.js
 * -----------------------------------------------------------------------------
 * El CORAZÓN de DinoColor. Orquesta una partida de un nivel:
 *   - mantiene qué pelotas están iluminadas (según activeBalls del nivel)
 *   - ilumina pelotas nuevas y hace expirar (fallar) las que no se pulsan a tiempo
 *   - aplica la puntuación (aciertos, combos, penalizaciones) usando scoringSystem
 *   - detecta victoria (puntuación objetivo) y derrota (tiempo agotado)
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
import { useTimer } from './useTimer.js'
import { pick } from '../utils/random.js'

const TICK_MS = 90 // frecuencia de actualización de la simulación de luces

const now = () =>
  typeof performance !== 'undefined' && performance.now
    ? performance.now()
    : Date.now()

export function useGameLoop({ level, onFinish }) {
  // Memoizado por forma: mantiene una identidad estable del layout entre renders, así
  // Board3D no reconstruye su geometría (THREE.Shape) en cada tick de puntuación.
  const layout = useMemo(() => getLayout(level.layout), [level.layout])

  // --- Estado mutable de la simulación (no provoca renders) ---
  const sim = useRef({
    lights: new Map(), // cellId -> { activatedAt, expireAt }
    score: 0,
    combo: 0,
    bestCombo: 0,
    hits: 0,
    misses: 0,
    finished: false,
  })

  // --- Estado espejo para la UI ---
  const [status, setStatus] = useState('playing') // 'playing' | 'won' | 'lost'
  const [activeIds, setActiveIds] = useState(() => new Set())
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [lastEvent, setLastEvent] = useState(null) // feedback visual puntual

  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])

  // Vuelca el estado de la simulación a React.
  const sync = useCallback(() => {
    const s = sim.current
    setActiveIds(new Set(s.lights.keys()))
    setScore(s.score)
    setCombo(s.combo)
    setBestCombo(s.bestCombo)
    setHits(s.hits)
    setMisses(s.misses)
  }, [])

  const finish = useCallback(
    (outcome) => {
      const s = sim.current
      if (s.finished) return
      s.finished = true
      setStatus(outcome)
      onFinishRef.current &&
        onFinishRef.current({
          outcome, // 'won' | 'lost'
          levelId: level.id,
          score: s.score,
          hits: s.hits,
          misses: s.misses,
          bestCombo: s.bestCombo,
          targetScore: level.targetScore,
        })
    },
    [level.id, level.targetScore],
  )

  // --- Reinicio al (re)entrar a un nivel ---
  useEffect(() => {
    sim.current = {
      lights: new Map(),
      score: 0,
      combo: 0,
      bestCombo: 0,
      hits: 0,
      misses: 0,
      finished: false,
    }
    setStatus('playing')
    setLastEvent(null)
    sync()
    // Reaccionamos al id del nivel: cada nivel es una partida nueva.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level.id])

  // --- Bucle de simulación de luces ---
  useEffect(() => {
    if (status !== 'playing') return

    const allCellIds = layout.cells.map((c) => c.id)

    const tick = () => {
      const s = sim.current
      if (s.finished) return
      const t = now()
      let changed = false

      // 1) Expirar pelotas no pulsadas a tiempo -> fallo
      for (const [cellId, light] of s.lights) {
        if (t >= light.expireAt) {
          s.lights.delete(cellId)
          s.score = Math.max(0, s.score - missPenalty())
          s.combo = 0
          s.misses += 1
          changed = true
          Sounds.miss()
          setLastEvent({ type: 'miss', key: t + Math.round(s.score) })
        }
      }

      // 2) Rellenar hasta activeBalls con celdas libres
      const target = Math.min(level.activeBalls, allCellIds.length)
      let guard = 0
      while (s.lights.size < target && guard < allCellIds.length * 2) {
        guard += 1
        const free = allCellIds.filter((id) => !s.lights.has(id))
        if (free.length === 0) break
        const cellId = pick(free)
        s.lights.set(cellId, {
          activatedAt: t,
          expireAt: t + level.reactionTime * 1000,
        })
        changed = true
      }

      if (changed) sync()

      // 3) ¿Victoria?
      if (s.score >= level.targetScore) finish('won')
    }

    // Primer tick inmediato para que el tablero no arranque vacío.
    tick()
    const intervalId = setInterval(tick, TICK_MS)
    return () => clearInterval(intervalId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, level.id])

  // --- Timer de la partida ---
  const handleExpire = useCallback(() => {
    const s = sim.current
    if (s.finished) return
    finish(s.score >= level.targetScore ? 'won' : 'lost')
  }, [finish, level.targetScore])

  const { timeLeft, progress: timeProgress } = useTimer({
    duration: level.totalTime,
    running: status === 'playing',
    onExpire: handleExpire,
  })

  // --- Interacción: el jugador pulsa una pelota ---
  const onBallTap = useCallback(
    (cellId) => {
      const s = sim.current
      if (s.finished || status !== 'playing') return
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
        if (fast || s.combo >= 3) Sounds.combo()
        else Sounds.hit()
        setLastEvent({
          type: 'hit',
          points,
          combo: s.combo,
          fast,
          multiplier,
          key: t,
        })
        sync()
        if (s.score >= level.targetScore) finish('won')
      } else {
        // FALLO: pulsar una pelota apagada
        s.score = Math.max(0, s.score - wrongTapPenalty(level))
        s.combo = 0
        s.misses += 1
        Sounds.miss()
        setLastEvent({ type: 'wrong', key: t })
        sync()
      }
    },
    [status, level, finish, sync],
  )

  return {
    layout,
    status,
    activeIds,
    score,
    combo,
    bestCombo,
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
