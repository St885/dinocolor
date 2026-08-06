/**
 * useRewards.js
 * -----------------------------------------------------------------------------
 * Puente entre React y todo lo que gira alrededor de los huesos 🦴: misiones
 * diarias (que los dan) e inventario de la tienda (que los gasta).
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
import { applyRun, dayKey, describe, pickDailyMissions } from '../systems/missionSystem.js'
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
