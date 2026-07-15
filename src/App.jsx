/**
 * App.jsx
 * -----------------------------------------------------------------------------
 * Máquina de estados de pantallas de DinoColor:
 *   start  →  menu  →  game  →  result  →  (game | menu)
 *
 * Mantiene el nivel actual y el último resultado, y conecta el progreso guardado
 * (niveles desbloqueados, superados, récord, sonido) con las escenas.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useState } from 'react'
import MobileLayout from './components/layout/MobileLayout.jsx'
import ErrorBoundary from './components/ui/ErrorBoundary.jsx'
import StartScene from './scenes/StartScene.jsx'
import MenuScene from './scenes/MenuScene.jsx'
import GameScene from './scenes/GameScene.jsx'
import ResultScene from './scenes/ResultScene.jsx'
import useLevelProgress from './hooks/useLevelProgress.js'
import { getFirstLevel, getLevelById, getNextLevel } from './systems/levelSystem.js'

export default function App() {
  const progress = useLevelProgress()
  const [scene, setScene] = useState('start')
  const [currentLevelId, setCurrentLevelId] = useState(getFirstLevel().id)
  const [lastResult, setLastResult] = useState(null)

  // Nonce de partida: cambia en CADA arranque de nivel. Va en la `key` de GameScene
  // para forzar un montaje limpio incluso al reiniciar el MISMO nivel desde la pausa
  // (sin él la key no cambiaba y la partida habría continuado con el estado anterior).
  const [runId, setRunId] = useState(0)

  const startLevel = useCallback((levelId) => {
    const level = getLevelById(levelId) || getFirstLevel()
    setCurrentLevelId(level.id)
    setRunId((n) => n + 1)
    setScene('game')
  }, [])

  const handleFinish = useCallback(
    (result) => {
      // El récord se guarda siempre; al ganar se marca el nivel como SUPERADO y se
      // desbloquea el siguiente (si lo hay: el último nivel no tiene siguiente, por
      // eso "superado" se registra aparte de "desbloqueado").
      progress.recordScore(result.score)
      if (result.outcome === 'won') {
        progress.recordCleared(result.levelId)
        const next = getNextLevel(result.levelId)
        if (next) progress.unlockLevel(next.id)
      }
      setLastResult(result)
      setScene('result')
    },
    [progress],
  )

  const handleNext = useCallback(() => {
    const next = getNextLevel(currentLevelId)
    if (next) startLevel(next.id)
    else setScene('menu')
  }, [currentLevelId, startLevel])

  const currentLevel = getLevelById(currentLevelId) || getFirstLevel()

  return (
    <ErrorBoundary>
      <MobileLayout>
        {scene === 'start' && (
          <StartScene
            onStart={() => setScene('menu')}
            soundEnabled={progress.soundEnabled}
            onToggleSound={progress.toggleSound}
          />
        )}

        {scene === 'menu' && (
          <MenuScene
            onPlayLevel={startLevel}
            onBack={() => setScene('start')}
            maxLevel={progress.maxLevel}
            clearedLevel={progress.clearedLevel}
            bestScore={progress.bestScore}
            isUnlocked={progress.isUnlocked}
            soundEnabled={progress.soundEnabled}
            onToggleSound={progress.toggleSound}
          />
        )}

        {scene === 'game' && (
          <GameScene
            key={`level-${currentLevelId}-run-${runId}`}
            level={currentLevel}
            bestScore={progress.bestScore}
            onFinish={handleFinish}
            onRestart={() => startLevel(currentLevelId)}
            onExit={() => setScene('menu')}
          />
        )}

        {scene === 'result' && lastResult && (
          <ResultScene
            result={lastResult}
            hasNextLevel={getNextLevel(lastResult.levelId) !== null}
            soundEnabled={progress.soundEnabled}
            onNext={handleNext}
            onRetry={() => startLevel(currentLevelId)}
            onMenu={() => setScene('menu')}
          />
        )}
      </MobileLayout>
    </ErrorBoundary>
  )
}
