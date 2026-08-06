/**
 * useRewards.js
 * -----------------------------------------------------------------------------
 * Puente entre React y los sistemas de recompensa: huesos 🦴 y misiones diarias.
 * Fino a propósito — toda la lógica está en `rewardSystem` y `missionSystem`, que
 * son puros; aquí solo hay estado de React y lectura/escritura de almacenamiento.
 *
 * REGENERACIÓN DIARIA: las misiones se regeneran cuando cambia el día local, y
 * también cuando el bloque guardado no cuadra (ids desconocidos, longitudes que no
 * coinciden, texto manipulado). `readDaily` devuelve null en esos casos y aquí se
 * crean misiones nuevas — el jugador nunca se queda sin ellas ni ve un error.
 *
 * Además se comprueba el día al VOLVER A LA PESTAÑA: si alguien deja el juego
 * abierto pasada la medianoche, al volver ve las misiones de hoy y no las de ayer.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import * as Storage from '../systems/storageSystem.js'
import { DAILY_COUNT, isKnownMissionId } from '../data/missions.js'
import { applyRun, dayKey, describe, pickDailyMissions } from '../systems/missionSystem.js'
import { computeRunReward } from '../systems/rewardSystem.js'

/** Lee el bloque del día, regenerándolo si falta o no es coherente. */
function loadOrCreateDaily() {
  const day = dayKey()
  const stored = Storage.readDaily(day, isKnownMissionId, DAILY_COUNT)
  if (stored) return stored

  const ids = pickDailyMissions(day)
  const fresh = {
    day,
    ids,
    progress: ids.map(() => 0),
    done: ids.map(() => false),
  }
  Storage.writeDaily(fresh)
  return fresh
}

export function useRewards() {
  const [bones, setBones] = useState(() => Storage.getBones())
  const [daily, setDaily] = useState(loadOrCreateDaily)

  /** Si ha cambiado el día, cambia las misiones. Idempotente y barato. */
  const refreshDay = useCallback(() => {
    setDaily((current) => (current.day === dayKey() ? current : loadOrCreateDaily()))
  }, [])

  // Al volver a la pestaña (o a la app en móvil) se comprueba el día. Sin esto, un
  // jugador que deja el juego abierto toda la noche seguiría con las de ayer.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const onVisibility = () => {
      if (!document.hidden) refreshDay()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [refreshDay])

  /**
   * Registra una partida terminada: avanza las misiones y paga los huesos.
   * Se llama UNA vez por partida, desde App.handleFinish.
   *
   * @returns {{ total:number, parts:Array, missions:Array }} desglose para la
   *   pantalla de resultado. `missions` son las completadas justo ahora.
   */
  const registerRun = useCallback((run) => {
    // El día puede haber cambiado con el juego abierto: comprobarlo ANTES de sumar,
    // o el progreso se apuntaría en las misiones de ayer.
    const day = dayKey()
    const base =
      Storage.readDaily(day, isKnownMissionId, DAILY_COUNT) ||
      (() => {
        const ids = pickDailyMissions(day)
        const fresh = { day, ids, progress: ids.map(() => 0), done: ids.map(() => false) }
        Storage.writeDaily(fresh)
        return fresh
      })()

    const applied = applyRun(base.ids, base.progress, base.done, run)
    const next = {
      day,
      ids: base.ids,
      progress: applied.progress,
      done: applied.done,
    }
    Storage.writeDaily(next)
    setDaily(next)

    // Huesos: los de la partida + los de las misiones recién completadas.
    const runReward = computeRunReward(run)
    const parts = [...runReward.parts]
    applied.completed.forEach((m) => {
      parts.push({ icon: m.icon, label: `Misión: ${m.text}`, amount: m.reward })
    })
    const total = runReward.total + applied.bones
    if (total > 0) setBones(Storage.addBones(total))

    return { total, parts, missions: applied.completed }
  }, [])

  /** Misiones del día ya resueltas contra el catálogo, listas para pintar. */
  const missions = useMemo(
    () => describe(daily.ids, daily.progress, daily.done),
    [daily],
  )

  const missionsDone = missions.filter((m) => m.done).length

  return {
    bones,
    missions,
    missionsDone,
    missionsTotal: missions.length,
    registerRun,
    refreshDay,
  }
}

export default useRewards
