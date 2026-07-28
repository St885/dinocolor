/**
 * GameScene.jsx
 * -----------------------------------------------------------------------------
 * Pantalla de juego. Monta el canvas 3D (fondo jungla + tablero), una viñeta de
 * profundidad y superpone el HUD. Toda la lógica vive en useGameLoop.
 *
 * El botón de pausa PAUSA de verdad (congela cronómetro y luces) y abre un overlay
 * con Reanudar / Reiniciar / Salir. Antes salía directo al menú perdiendo la partida.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Background3D from '../components/game/Background3D.jsx'
import Board3D from '../components/game/Board3D.jsx'
import GameHUD from '../components/game/GameHUD.jsx'
import MiniDinoWalker from '../components/game/MiniDinoWalker.jsx'
import PauseOverlay from '../components/game/PauseOverlay.jsx'
import TutorialOverlay from '../components/game/TutorialOverlay.jsx'
import useGameLoop from '../hooks/useGameLoop.js'

export default function GameScene({
  level,
  levelBest = 0,
  showTutorial = false,
  onTutorialDone,
  onFinish,
  onRestart,
  onExit,
}) {
  // El estado inicial se congela al montar: cuando el jugador cierra el tutorial, la
  // prop pasa a false, pero eso no debe reabrir/cerrar nada por su cuenta.
  const [tutorial, setTutorial] = useState(() => showTutorial)
  const game = useGameLoop({ level, onFinish, startPaused: showTutorial })

  const closeTutorial = useCallback(() => {
    setTutorial(false)
    onTutorialDone && onTutorialDone()
    game.resume()
  }, [onTutorialDone, game])

  return (
    <div className="scene scene--game">
      <Canvas
        className="game-canvas"
        flat /* NoToneMapping: evita que el verde brillante se desature a blanco */
        dpr={[1, 2]}
        camera={{ position: [0, 0, 9], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#071711']} />
        <Background3D />
        <Board3D
          layout={game.layout}
          activeIds={game.activeIds}
          activeColor={level.activeColor}
          onBallTap={game.onBallTap}
        />
      </Canvas>

      {/* Viñeta de profundidad (foco al tablero, look premium) */}
      <div className="game-vignette" />

      {/* Acompañante 3D: T-Rexo en su tarima, arriba-izquierda. Board3D reserva esa
          banda en píxeles, así que nunca se solapa con el tablero. */}
      <MiniDinoWalker lastEvent={game.lastEvent} size={88} />

      <GameHUD
        levelId={level.id}
        levelName={level.name}
        timeLeft={game.timeLeft}
        timeProgress={game.timeProgress}
        score={game.score}
        targetScore={level.targetScore}
        scoreProgress={game.scoreProgress}
        combo={game.combo}
        hits={game.hits}
        misses={game.misses}
        levelBest={levelBest}
        lastEvent={game.lastEvent}
        onPause={game.pause}
      />

      {tutorial && <TutorialOverlay level={level} onStart={closeTutorial} />}

      {game.paused && !tutorial && (
        <PauseOverlay
          levelId={level.id}
          levelName={level.name}
          score={game.score}
          targetScore={level.targetScore}
          timeLeft={game.timeLeft}
          onResume={game.resume}
          onRestart={onRestart}
          onMenu={onExit}
        />
      )}
    </div>
  )
}
