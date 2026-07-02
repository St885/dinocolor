/**
 * GameScene.jsx
 * -----------------------------------------------------------------------------
 * Pantalla de juego. Monta el canvas 3D (fondo jungla + tablero), una viñeta de
 * profundidad y superpone el HUD. Toda la lógica vive en useGameLoop.
 * -----------------------------------------------------------------------------
 */

import { Canvas } from '@react-three/fiber'
import Background3D from '../components/game/Background3D.jsx'
import Board3D from '../components/game/Board3D.jsx'
import GameHUD from '../components/game/GameHUD.jsx'
import MiniDinoReaction from '../components/game/MiniDinoReaction.jsx'
import useGameLoop from '../hooks/useGameLoop.js'

export default function GameScene({ level, bestScore = 0, onFinish, onExit }) {
  const game = useGameLoop({ level, onFinish })

  return (
    <div className="scene scene--game">
      <Canvas
        className="game-canvas"
        flat /* NoToneMapping: evita que el verde brillante se desature a blanco */
        dpr={[1, 2]}
        camera={{ position: [0, 0, 9], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
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

      {/* Mini mascota de apoyo (arriba-izquierda, zona segura): reacciona a los
          aciertos/fallos sin tapar tablero, HUD, timer, meta/barra ni cofre. */}
      <MiniDinoReaction lastEvent={game.lastEvent} position="top-left" size={78} />

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
        bestScore={bestScore}
        lastEvent={game.lastEvent}
        onExit={onExit}
      />
    </div>
  )
}
