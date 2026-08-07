/**
 * GameScene.jsx
 * -----------------------------------------------------------------------------
 * Pantalla de juego. Monta el canvas 3D (fondo jungla + tablero), una viñeta de
 * profundidad y superpone el HUD. Toda la lógica vive en useGameLoop.
 *
 * El botón de pausa PAUSA de verdad (congela cronómetro y luces) y abre un overlay
 * con Reanudar / Reiniciar / Salir. Antes salía directo al menú perdiendo la partida.
 *
 * RENDIMIENTO — el canvas se DUERME cuando no hay partida en curso:
 *   `frameloop="demand"` mientras está pausado o ya terminó. Antes seguía dibujando a
 *   60 fps con el juego congelado: el overlay de pausa aún añade un backdrop-filter a
 *   pantalla completa, así que el móvil gastaba batería (y se calentaba) por una
 *   imagen fija. `invalidate` en el cambio de estado asegura un último frame limpio.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Background3D from '../components/game/Background3D.jsx'
import Board3D from '../components/game/Board3D.jsx'
import GameHUD from '../components/game/GameHUD.jsx'
import MiniDinoWalker from '../components/game/MiniDinoWalker.jsx'
import PauseOverlay from '../components/game/PauseOverlay.jsx'
import TutorialOverlay from '../components/game/TutorialOverlay.jsx'
import HitFx from '../components/game/HitFx.jsx'
import useGameLoop from '../hooks/useGameLoop.js'
import { comboTier } from '../data/hitEffects.js'

export default function GameScene({
  level,
  levelBest = 0,
  showTutorial = false,
  onTutorialDone,
  onFinish,
  onRestart,
  onExit,
  skin,
  theme,
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

  // Sin partida en curso (pausa, tutorial o nivel terminado) no hay nada que animar.
  const sleeping = game.paused || game.status !== 'playing'

  /**
   * Escalón de combo alcanzado. Sale del MISMO contador que ya lleva useGameLoop
   * (no hay sistema paralelo): solo traduce el número a un nivel de intensidad
   * visual. Se apaga en cuanto se rompe la racha o termina la partida, para que el
   * aura no se quede encendida sobre la pantalla de resultado.
   */
  const tier = useMemo(
    () => (game.status === 'playing' ? comboTier(game.combo) : 0),
    [game.combo, game.status],
  )

  /**
   * Sacudida breve al fallar. Se apunta a la KEY del evento, no al tipo: dos
   * fallos seguidos tienen keys distintas y así el segundo vuelve a sacudir en vez
   * de quedarse quieto porque la clase ya estaba puesta.
   */
  const [shakeKey, setShakeKey] = useState(0)
  const shakeTimer = useRef(null)
  useEffect(() => {
    const ev = game.lastEvent
    if (!ev || (ev.type !== 'miss' && ev.type !== 'wrong')) return undefined
    setShakeKey(ev.key)
    clearTimeout(shakeTimer.current)
    shakeTimer.current = setTimeout(() => setShakeKey(0), 300)
    return undefined
  }, [game.lastEvent])
  // El temporizador se reprograma con cada fallo: hay que limpiarlo también al
  // DESMONTAR, o queda vivo al salir al menú a mitad de una mala racha.
  useEffect(() => () => clearTimeout(shakeTimer.current), [])

  return (
    <div className={`scene scene--game ${shakeKey ? 'is-shaking' : ''}`}>
      <Canvas
        className="game-canvas"
        flat /* NoToneMapping: evita que el verde brillante se desature a blanco */
        frameloop={sleeping ? 'demand' : 'always'}
        dpr={[1, 2]}
        camera={{ position: [0, 0, 9], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        {/* El cielo lo pone el ambiente equipado. Es un solo color: cambiarlo no
            regenera la textura del fondo (que sí sería caro), pero basta para que
            una cueva neón y un volcán se sientan distintos desde el primer frame. */}
        <color attach="background" args={[(theme && theme.sky) || '#071711']} />
        <Background3D />
        <Board3D
          layout={game.layout}
          activeIds={game.activeIds}
          activeColor={level.activeColor}
          onBallTap={game.onBallTap}
        />
      </Canvas>

      {/* Velo del ambiente: un degradado ESTÁTICO sobre el canvas. No se anima ni
          se recalcula, así que no cuesta nada por frame, y da al tema su carácter
          sin tocar la textura del fondo 3D. Va bajo la viñeta y no captura toques. */}
      {theme && theme.tint !== 'transparent' && (
        <div className="game-theme-tint" style={{ background: theme.tint }} aria-hidden="true" />
      )}

      {/* Aura de combo: marco de luz en los bordes que sube con la racha. No toca
          el centro, así que nunca compite con las pelotas. El tono lo pone el color
          del nivel, así que refuerza la señal que el jugador ya está siguiendo. */}
      {tier > 0 && (
        <div
          className={`combo-aura combo-aura--${tier}`}
          style={{ '--combo-glow': `${level.activeColor}88` }}
          aria-hidden="true"
        />
      )}

      {/* Viñeta de profundidad (foco al tablero, look premium) */}
      <div className="game-vignette" />

      {/* Textos flotantes del acierto/fallo. Van SOBRE el canvas pero sin capturar
          toques (pointer-events: none en fx.css). */}
      <HitFx lastEvent={game.lastEvent} color={level.activeColor} />

      {/* Acompañante 3D: T-Rexo en su tarima, arriba-izquierda. Board3D reserva esa
          banda en píxeles, así que nunca se solapa con el tablero. */}
      <MiniDinoWalker lastEvent={game.lastEvent} size={88} sleeping={sleeping} skin={skin} />

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
