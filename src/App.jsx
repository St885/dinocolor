/**
 * App.jsx
 * -----------------------------------------------------------------------------
 * Máquina de estados de pantallas de DinoColor:
 *   start  →  menu  →  game  →  result  →  (game | menu)
 *
 * Mantiene el nivel actual y el último resultado, y conecta el progreso guardado
 * (niveles desbloqueados, récord, sonido) con las escenas.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useState } from 'react'
import MobileLayout from './components/layout/MobileLayout.jsx'
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

  const startLevel = useCallback((levelId) => {
    const level = getLevelById(levelId) || getFirstLevel()
    setCurrentLevelId(level.id)
    setScene('game')
  }, [])

  const handleFinish = useCallback(
    (result) => {
      // El récord se guarda siempre; al ganar, se desbloquea el siguiente nivel.
      progress.recordScore(result.score)
      if (result.outcome === 'won') {
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
          bestScore={progress.bestScore}
          isUnlocked={progress.isUnlocked}
          soundEnabled={progress.soundEnabled}
          onToggleSound={progress.toggleSound}
        />
      )}

      {scene === 'game' && (
        // key fuerza un montaje limpio al cambiar/reiniciar de nivel.
        <GameScene
          key={`level-${currentLevelId}`}
          level={currentLevel}
          bestScore={progress.bestScore}
          onFinish={handleFinish}
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
  )
}
