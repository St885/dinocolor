/**
 * useLevelProgress.js
 * -----------------------------------------------------------------------------
 * Puente entre el guardado local (storageSystem) y React. Expone el progreso del
 * jugador (nivel máximo desbloqueado, mejor puntuación, preferencia de sonido) y
 * funciones para actualizarlo. Sincroniza el audioSystem con la preferencia.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useState } from 'react'
import * as Storage from '../systems/storageSystem.js'
import { setEnabled as setAudioEnabled } from '../systems/audioSystem.js'
import { totalLevels } from '../systems/levelSystem.js'

/**
 * Ancla el progreso leído al rango de niveles que EXISTEN de verdad. storageSystem ya
 * evita NaN/negativos, pero no conoce cuántos niveles hay: un localStorage manipulado o
 * heredado de una versión con más niveles podría traer, p. ej., maxLevel=9999 (que
 * desbloquearía todo) o apuntar más allá del último nivel. Clampear aquí mantiene el
 * progreso siempre dentro de [1..N] / [0..N].
 */
export function useLevelProgress() {
  const total = totalLevels()
  const clampMax = (v) => Math.min(Math.max(1, v), total)
  const clampCleared = (v) => Math.min(Math.max(0, v), total)

  const [maxLevel, setMaxLevelState] = useState(() => clampMax(Storage.getMaxLevel()))
  const [clearedLevel, setClearedLevelState] = useState(() => clampCleared(Storage.getClearedLevel()))
  const [bestScore, setBestScoreState] = useState(() => Storage.getBestScore())
  const [soundEnabled, setSoundEnabledState] = useState(() =>
    Storage.getSoundEnabled(),
  )

  // Mantener el motor de audio en sintonía con la preferencia guardada.
  useEffect(() => {
    setAudioEnabled(soundEnabled)
  }, [soundEnabled])

  /** Desbloquea un nivel (si es mayor que el actual). */
  const unlockLevel = useCallback((levelId) => {
    Storage.setMaxLevel(levelId)
    setMaxLevelState(Math.min(Math.max(1, Storage.getMaxLevel()), total))
  }, [total])

  /**
   * Marca un nivel como SUPERADO. Va aparte de unlockLevel porque el último nivel
   * no desbloquea ninguno posterior: sin esto, ganarlo no contaba y el progreso del
   * menú se quedaba para siempre en "11/12".
   */
  const recordCleared = useCallback((levelId) => {
    Storage.setClearedLevel(levelId)
    setClearedLevelState(Math.min(Math.max(0, Storage.getClearedLevel()), total))
  }, [total])

  /** Registra una puntuación (guarda solo si es récord). */
  const recordScore = useCallback((score) => {
    Storage.setBestScore(score)
    setBestScoreState(Storage.getBestScore())
  }, [])

  /** Activa/desactiva el sonido y lo persiste. */
  const toggleSound = useCallback(() => {
    setSoundEnabledState((prev) => {
      const next = !prev
      Storage.setSoundEnabled(next)
      return next
    })
  }, [])

  const isUnlocked = useCallback(
    (levelId) => levelId <= maxLevel,
    [maxLevel],
  )

  return {
    maxLevel,
    clearedLevel,
    bestScore,
    soundEnabled,
    unlockLevel,
    recordCleared,
    recordScore,
    toggleSound,
    isUnlocked,
  }
}

export default useLevelProgress
