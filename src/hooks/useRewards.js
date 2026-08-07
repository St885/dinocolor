/**
 * useRewards.js
 * -----------------------------------------------------------------------------
 * Puente entre React y todo lo que gira alrededor de los huesos 🦴: misiones
 * diarias, racha de entrada y desafío del día (que los dan) e inventario de la
 * tienda (que los gasta).
 *
 * Los tres viven en el MISMO hook porque comparten un único recurso —el saldo de
 * huesos—. Separarlos obligaría a duplicar ese estado o a pasar callbacks de
 * "cóbrame" de un hook a otro, y bastaría un render a destiempo para enseñar un
 * saldo que ya no es el real.
 *
 * Fino a propósito: toda la lógica está en `rewardSystem`, `missionSystem` e
 * `inventorySystem`, que son puros; aquí solo hay estado de React y
 * lectura/escritura de almacenamiento.
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
import { DEFAULT_SKIN, FREE_SKINS, SKINS, getSkin, isKnownSkinId } from '../data/skins.js'
import { DEFAULT_THEME, FREE_THEMES, THEMES, getTheme, isKnownThemeId } from '../data/themes.js'
import { isKnownChallengeId } from '../data/dailyChallenges.js'
import { applyRun, dayKey, describe, pickDailyMissions } from '../systems/missionSystem.js'
import {
  applyRunToChallenge,
  describeChallenge,
  pickChallenge,
  pickChallengeLevel,
} from '../systems/dailyChallengeSystem.js'
import { claimStreak, describeStreak, streakState } from '../systems/dailyStreakSystem.js'
import { canBuy, canEquip } from '../systems/inventorySystem.js'
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

/**
 * Lee el desafío del día, creándolo si falta o si el guardado no es coherente.
 * El nivel de los retos que apuntan a uno concreto se elige AQUÍ (una sola vez al
 * día) y se guarda: recalcularlo en cada render haría que desbloquear un nivel a
 * media tarde cambiara el reto en marcha.
 */
function loadOrCreateChallenge() {
  const day = dayKey()
  const stored = Storage.readChallenge(day, isKnownChallengeId)
  if (stored) return stored

  const id = pickChallenge(day)
  const needsLevel = ['levelPerfect'].includes(id)
  const fresh = {
    day,
    id,
    level: needsLevel ? pickChallengeLevel(day, Storage.getMaxLevel()) : 0,
    progress: 0,
    done: false,
  }
  Storage.writeChallenge(fresh)
  return fresh
}

export function useRewards() {
  const [bones, setBones] = useState(() => Storage.getBones())
  const [daily, setDaily] = useState(loadOrCreateDaily)

  const [streakSaved, setStreakSaved] = useState(() => Storage.readStreak())
  const [challengeSaved, setChallengeSaved] = useState(loadOrCreateChallenge)

  /** Si ha cambiado el día, renueva misiones y desafío. Idempotente y barato. */
  const refreshDay = useCallback(() => {
    const hoy = dayKey()
    setDaily((current) => (current.day === hoy ? current : loadOrCreateDaily()))
    setChallengeSaved((current) => (current.day === hoy ? current : loadOrCreateChallenge()))
    // La racha no se "renueva": se recalcula sola a partir de la fecha del último
    // cobro, así que basta con volver a leerla para que el botón se reactive.
    setStreakSaved(Storage.readStreak())
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

    // Desafío del día. Se lee del ALMACENAMIENTO, no del estado de React: si el
    // día cambió con el juego abierto, el estado podría ir un paso por detrás y el
    // progreso se apuntaría en el reto de ayer.
    const chalBase = Storage.readChallenge(day, isKnownChallengeId) || loadOrCreateChallenge()
    const chal = applyRunToChallenge(chalBase, run)
    const chalNext = { ...chalBase, progress: chal.progress, done: chal.done }
    Storage.writeChallenge(chalNext)
    setChallengeSaved(chalNext)

    // Huesos: los de la partida + misiones recién completadas + desafío.
    const runReward = computeRunReward(run)
    const parts = [...runReward.parts]
    applied.completed.forEach((m) => {
      parts.push({ icon: m.icon, label: `Misión: ${m.text}`, amount: m.reward })
    })
    const challengeInfo = describeChallenge(chalNext)
    if (chal.justCompleted && chal.reward > 0) {
      parts.push({ icon: '🏅', label: `Desafío: ${challengeInfo?.text || 'completado'}`, amount: chal.reward })
    }
    const total = runReward.total + applied.bones + chal.reward
    if (total > 0) setBones(Storage.addBones(total))

    return {
      total,
      parts,
      missions: applied.completed,
      challengeDone: chal.justCompleted,
    }
  }, [])

  /** Misiones del día ya resueltas contra el catálogo, listas para pintar. */
  const missions = useMemo(
    () => describe(daily.ids, daily.progress, daily.done),
    [daily],
  )

  const missionsDone = missions.filter((m) => m.done).length

  /**
   * Cobra la racha de hoy. Devuelve `null` si hoy ya estaba cobrada — la guarda
   * vive en `claimStreak`, así que ni una doble pulsación ni un estado de React
   * desfasado pueden pagar dos veces.
   */
  const claimDailyStreak = useCallback(() => {
    const fresco = Storage.readStreak()
    const res = claimStreak(fresco)
    if (!res) return null
    Storage.writeStreak(res.next)
    setStreakSaved(res.next)
    setBones(Storage.addBones(res.reward))
    return { reward: res.reward, day: res.day, isBonus: res.isBonus }
  }, [])

  const streak = useMemo(() => {
    const state = streakState(streakSaved)
    return { ...state, days: describeStreak(state) }
  }, [streakSaved])

  const challenge = useMemo(() => describeChallenge(challengeSaved), [challengeSaved])

  // --- Inventario de la tienda ------------------------------------------------
  //
  // Se lee del almacenamiento SANEADO: los ids que no existan en el catálogo se
  // descartan, los gratuitos se dan por desbloqueados siempre, y lo "equipado" se
  // valida contra lo que de verdad está en propiedad (ver storageSystem).
  const [ownedSkins, setOwnedSkins] = useState(() =>
    Storage.getOwnedSkins(isKnownSkinId, FREE_SKINS),
  )
  const [ownedThemes, setOwnedThemes] = useState(() =>
    Storage.getOwnedThemes(isKnownThemeId, FREE_THEMES),
  )
  const [skinId, setSkinId] = useState(() =>
    Storage.getEquipped(
      'skin',
      isKnownSkinId,
      Storage.getOwnedSkins(isKnownSkinId, FREE_SKINS),
      DEFAULT_SKIN,
    ),
  )
  const [themeId, setThemeId] = useState(() =>
    Storage.getEquipped(
      'theme',
      isKnownThemeId,
      Storage.getOwnedThemes(isKnownThemeId, FREE_THEMES),
      DEFAULT_THEME,
    ),
  )

  /**
   * Compra un artículo. Devuelve `{ ok, reason?, missing? }`.
   *
   * ORDEN IMPORTANTE: primero se COBRA y solo si el cobro tiene éxito se entrega.
   * `spendBones` devuelve null cuando no hay saldo, así que aunque dos pulsaciones
   * seguidas pasaran la comprobación previa, la segunda no podría cobrar y no
   * entregaría nada. Y como la entrega es "añadir a un Set", comprar dos veces no
   * duplica nada aunque llegara a colarse.
   */
  const buy = useCallback(
    (kind, id) => {
      const isSkin = kind === 'skin'
      const item = isSkin ? getSkin(id) : getTheme(id)
      const owned = isSkin ? ownedSkins : ownedThemes
      const check = canBuy(item, owned, bones)
      if (!check.ok) return check

      const left = Storage.spendBones(check.price)
      if (left === null) return { ok: false, reason: 'funds' }
      setBones(left)

      const next = [...new Set([...owned, item.id])]
      if (isSkin) {
        Storage.setOwnedSkins(next)
        setOwnedSkins(next)
        // Al comprar se equipa: nadie compra un aspecto para no ponérselo.
        Storage.setEquipped('skin', item.id)
        setSkinId(item.id)
      } else {
        Storage.setOwnedThemes(next)
        setOwnedThemes(next)
        Storage.setEquipped('theme', item.id)
        setThemeId(item.id)
      }
      return { ok: true, price: check.price, bones: left }
    },
    [bones, ownedSkins, ownedThemes],
  )

  /** Equipa algo YA desbloqueado. Si no lo está, no hace nada. */
  const equip = useCallback(
    (kind, id) => {
      const isSkin = kind === 'skin'
      const item = isSkin ? getSkin(id) : getTheme(id)
      const owned = isSkin ? ownedSkins : ownedThemes
      if (!canEquip(item, owned)) return false
      Storage.setEquipped(kind, item.id)
      if (isSkin) setSkinId(item.id)
      else setThemeId(item.id)
      return true
    },
    [ownedSkins, ownedThemes],
  )

  // Objetos resueltos (nunca null) para que las escenas no tengan que defenderse.
  const skin = useMemo(() => getSkin(skinId) || getSkin(DEFAULT_SKIN), [skinId])
  const theme = useMemo(() => getTheme(themeId) || getTheme(DEFAULT_THEME), [themeId])

  return {
    bones,
    missions,
    missionsDone,
    missionsTotal: missions.length,
    registerRun,
    refreshDay,
    // Retención diaria
    streak,
    claimDailyStreak,
    challenge,
    // Tienda
    skins: SKINS,
    themes: THEMES,
    ownedSkins,
    ownedThemes,
    skinId,
    themeId,
    skin,
    theme,
    buy,
    equip,
  }
}

export default useRewards
