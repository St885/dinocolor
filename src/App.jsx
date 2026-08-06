/**
 * App.jsx
 * -----------------------------------------------------------------------------
 * Máquina de estados de pantallas de DinoColor:
 *   start  →  auth  →  menu  →  game  →  result  →  (game | menu)
 *
 * Mantiene el nivel actual y el último resultado, y conecta el progreso guardado
 * (niveles desbloqueados, superados, récord, sonido) con las escenas.
 *
 * LA PUERTA DE ACCESO (iteración 2026-08-01)
 * `auth` se cruza UNA vez, entre inicio y menú, y NO bloquea: siempre ofrece
 * "seguir como invitado". Quien ya tiene sesión (cuenta o invitado) ni la ve —
 * pasa directo al menú.
 *
 * El PROGRESO no depende de la sesión: niveles, récords y estrellas siguen
 * viviendo en `localStorage` a través de `useLevelProgress`, exactamente igual
 * que antes. Iniciar o cerrar sesión no lo toca. Es deliberado: mezclar cuenta y
 * progreso sin sincronización en la nube solo puede terminar en progreso perdido
 * (ver docs/AUTH.md → "Progreso").
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import MobileLayout from './components/layout/MobileLayout.jsx'
import ErrorBoundary from './components/ui/ErrorBoundary.jsx'
import StartScene from './scenes/StartScene.jsx'
import AuthScene from './scenes/AuthScene.jsx'
import MenuScene from './scenes/MenuScene.jsx'
import ShopScene from './scenes/ShopScene.jsx'
import GameScene from './scenes/GameScene.jsx'
import ResultScene from './scenes/ResultScene.jsx'
import useLevelProgress from './hooks/useLevelProgress.js'
import useAuth from './hooks/useAuth.js'
import useRewards from './hooks/useRewards.js'
import { signOut } from './systems/auth/authService.js'
import { getFirstLevel, getLevelById, getNextLevel } from './systems/levelSystem.js'
import { computeStars } from './systems/scoringSystem.js'
import { affordableCount } from './systems/inventorySystem.js'

export default function App() {
  const progress = useLevelProgress()
  const auth = useAuth()
  const rewards = useRewards()
  const [scene, setScene] = useState('start')
  const [currentLevelId, setCurrentLevelId] = useState(getFirstLevel().id)
  const [lastResult, setLastResult] = useState(null)

  // Nonce de partida: cambia en CADA arranque de nivel. Va en la `key` de GameScene
  // para forzar un montaje limpio incluso al reiniciar el MISMO nivel desde la pausa
  // (sin él la key no cambiaba y la partida habría continuado con el estado anterior).
  const [runId, setRunId] = useState(0)

  /**
   * "Jugar": si ya hay sesión, al menú directo; si no, a la puerta de acceso.
   * Mientras la sesión aún se resuelve (Firebase tarda en responder en un
   * arranque en frío) también se va a `auth`: allí se enseña un indicador de
   * carga y, en cuanto se sabe que había sesión, se avanza solo.
   */
  const handleStart = useCallback(() => {
    setScene(auth.isSignedIn ? 'menu' : 'auth')
  }, [auth.isSignedIn])

  /**
   * Avance automático desde la puerta de acceso cuando la sesión termina de
   * resolverse y resulta que el jugador YA estaba dentro. Sin esto, un usuario
   * con sesión guardada vería el formulario de acceso durante un instante.
   */
  useEffect(() => {
    if (scene === 'auth' && !auth.isLoading && auth.isSignedIn) setScene('menu')
  }, [scene, auth.isLoading, auth.isSignedIn])

  /** Cierra la sesión y devuelve al jugador a la portada. El progreso NO se toca. */
  const handleSignOut = useCallback(() => {
    signOut()
    setScene('start')
  }, [])

  const startLevel = useCallback((levelId) => {
    const level = getLevelById(levelId) || getFirstLevel()
    setCurrentLevelId(level.id)
    setRunId((n) => n + 1)
    setScene('game')
  }, [])

  const handleFinish = useCallback(
    (result) => {
      const won = result.outcome === 'won'
      // Las estrellas se derivan de la RAPIDEZ (tiempo que sobró), no del margen sobre
      // la meta: como el nivel termina en el instante en que se alcanza la meta, ese
      // margen era siempre ~0 y nunca se pasaba de 1⭐ (ver scoringSystem.js). La
      // condición de victoria no cambia: ganar sigue siendo llegar a la meta. Se
      // calculan ANTES de guardar para saber en la pantalla final si son nuevas.
      const stars = computeStars(won, result.timeLeft, result.totalTime)
      const levelResult = progress.recordLevelResult(result.levelId, result.score, stars)

      // El récord global se guarda siempre; al ganar se marca el nivel como SUPERADO y
      // se desbloquea el siguiente (si lo hay: el último nivel no tiene siguiente, por
      // eso "superado" se registra aparte de "desbloqueado").
      progress.recordScore(result.score)
      if (won) {
        progress.recordCleared(result.levelId)
        const next = getNextLevel(result.levelId)
        if (next) progress.unlockLevel(next.id)
      }
      // Misiones diarias y huesos. Va DESPUÉS de guardar el progreso para que
      // `isRecord` y `previousStars` ya reflejen la realidad, y se llama una sola
      // vez por partida (la pantalla de resultado solo lee el desglose).
      const reward = rewards.registerRun({
        won,
        stars,
        previousStars: levelResult.previousStars,
        isRecord: levelResult.isRecord,
        bestCombo: result.bestCombo,
        misses: result.misses,
      })

      setLastResult({
        ...result,
        stars,
        bestStars: levelResult.stars,
        previousStars: levelResult.previousStars,
        isRecord: levelResult.isRecord,
        reward,
      })
      setScene('result')
    },
    [progress, rewards],
  )

  const handleNext = useCallback(() => {
    const next = getNextLevel(currentLevelId)
    if (next) startLevel(next.id)
    else setScene('menu')
  }, [currentLevelId, startLevel])

  const currentLevel = getLevelById(currentLevelId) || getFirstLevel()

  // ¿Hay algo en la tienda al alcance del saldo actual? Solo entonces el menú
  // lanza el aviso: un reclamo permanente que nunca puedes atender es ruido.
  const shopReady = useMemo(
    () =>
      affordableCount(rewards.skins, rewards.ownedSkins, rewards.bones) +
      affordableCount(rewards.themes, rewards.ownedThemes, rewards.bones),
    [rewards.skins, rewards.themes, rewards.ownedSkins, rewards.ownedThemes, rewards.bones],
  )

  return (
    <ErrorBoundary>
      <MobileLayout>
        {scene === 'start' && (
          <StartScene
            onStart={handleStart}
            soundEnabled={progress.soundEnabled}
            onToggleSound={progress.toggleSound}
          />
        )}

        {scene === 'auth' &&
          (auth.isLoading ? (
            <div className="scene scene--auth-loading">
              <span className="auth-boot" role="status" aria-label="Comprobando tu sesión">
                <i />
                <i />
                <i />
              </span>
              <p className="hint">Comprobando tu sesión…</p>
            </div>
          ) : (
            /* `onAuthenticated` recibe el perfil ya adoptado por el servicio; a
               esta pantalla solo le queda apartarse. */
            <AuthScene onAuthenticated={() => setScene('menu')} />
          ))}

        {scene === 'menu' && (
          <MenuScene
            onPlayLevel={startLevel}
            onBack={() => setScene('start')}
            user={auth.user}
            onSignOut={handleSignOut}
            maxLevel={progress.maxLevel}
            clearedLevel={progress.clearedLevel}
            bestScore={progress.bestScore}
            isUnlocked={progress.isUnlocked}
            getStars={progress.getStars}
            totalStars={progress.totalStars}
            maxStars={progress.maxStars}
            soundEnabled={progress.soundEnabled}
            onToggleSound={progress.toggleSound}
            bones={rewards.bones}
            missions={rewards.missions}
            missionsDone={rewards.missionsDone}
            onOpenShop={() => setScene('shop')}
            shopReady={shopReady}
          />
        )}

        {scene === 'shop' && (
          <ShopScene
            bones={rewards.bones}
            skins={rewards.skins}
            themes={rewards.themes}
            ownedSkins={rewards.ownedSkins}
            ownedThemes={rewards.ownedThemes}
            skinId={rewards.skinId}
            themeId={rewards.themeId}
            onBuy={rewards.buy}
            onEquip={rewards.equip}
            onBack={() => setScene('menu')}
          />
        )}

        {scene === 'game' && (
          <GameScene
            key={`level-${currentLevelId}-run-${runId}`}
            level={currentLevel}
            levelBest={progress.getLevelBest(currentLevelId)}
            showTutorial={currentLevel.id === getFirstLevel().id && !progress.tutorialSeen}
            onTutorialDone={progress.markTutorialSeen}
            onFinish={handleFinish}
            onRestart={() => startLevel(currentLevelId)}
            onExit={() => setScene('menu')}
          />
        )}

        {scene === 'result' && lastResult && (
          <ResultScene
            result={lastResult}
            hasNextLevel={getNextLevel(lastResult.levelId) !== null}
            onNext={handleNext}
            onRetry={() => startLevel(currentLevelId)}
            onMenu={() => setScene('menu')}
          />
        )}
      </MobileLayout>
    </ErrorBoundary>
  )
}
