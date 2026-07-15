/**
 * MenuScene.jsx — Menú principal: récord, progreso, selector de niveles con estados
 * (completado / actual / bloqueado) y botón Continuar. Mobile-first.
 *
 * El progreso se calcula con `clearedLevel` (niveles SUPERADOS), no con `maxLevel - 1`
 * (niveles DESBLOQUEADOS). Con la fórmula vieja, ganar el último nivel no desbloqueaba
 * nada — no hay nivel 13 — y el contador se quedaba clavado en "11/12" para siempre,
 * incluso con el juego terminado al 100 %.
 */

import { useCallback } from 'react'
import Button from '../components/ui/Button.jsx'
import Panel from '../components/ui/Panel.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import { getAllLevels } from '../systems/levelSystem.js'
import { unlock } from '../systems/audioSystem.js'

const DIFFICULTY_LABEL = {
  facil: 'Fácil',
  media: 'Media',
  dificil: 'Difícil',
  extrema: 'Extrema',
}

export default function MenuScene({
  onPlayLevel,
  onBack,
  maxLevel,
  clearedLevel = 0,
  bestScore,
  isUnlocked,
  soundEnabled,
  onToggleSound,
}) {
  const levels = getAllLevels()
  const total = levels.length
  const completed = Math.max(0, Math.min(total, clearedLevel))
  const allDone = completed >= total

  // El id de "Continuar" se limita a un nivel que EXISTE de verdad. Sin esto, si el
  // progreso guardado quedara por delante de la lista de niveles (p. ej. tras quitar
  // niveles en una actualización), startLevel caía en silencio al nivel 1.
  const continueId = Math.min(Math.max(1, maxLevel), total)
  const continueLevel = levels.find((l) => l.id === continueId) || levels[0]

  const handleToggleSound = useCallback(() => {
    unlock() // desbloquea el audio si este es el primer gesto del jugador
    onToggleSound()
  }, [onToggleSound])

  return (
    <div className="scene scene--menu">
      <div className="menu-scroll">
        <div className="menu-header">
          <button className="hud-exit" onClick={onBack} aria-label="Volver">
            ‹
          </button>
          <h1 className="menu-title">
            <span className="logo-dino">Dino</span>
            <span className="logo-color">Color</span>
          </h1>
          <button
            className="sound-toggle sound-toggle--inline"
            onClick={handleToggleSound}
            aria-label={soundEnabled ? 'Silenciar' : 'Activar sonido'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        <Panel className="menu-best">
          <div className="best-row">
            <span>🏆 Mejor puntuación</span>
            <strong>{bestScore}</strong>
          </div>
          <div>
            <div className="menu-progress-row">
              <span>Progreso</span>
              <span>
                {completed}/{total} niveles
              </span>
            </div>
            <ProgressBar value={total ? completed / total : 0} kind="xp" />
          </div>
        </Panel>

        <h2 className="menu-subtitle">Elige nivel</h2>

        <div className="level-grid">
          {levels.map((lvl) => {
            const unlocked = isUnlocked(lvl.id)
            const isCompleted = lvl.id <= clearedLevel
            const isCurrent = !isCompleted && lvl.id === continueId
            const cls = [
              'level-card',
              `level-card--${lvl.difficulty}`,
              !unlocked && 'level-card--locked',
              isCurrent && 'level-card--current',
              isCompleted && 'level-card--done',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <button
                key={lvl.id}
                className={cls}
                disabled={!unlocked}
                onClick={() => unlocked && onPlayLevel(lvl.id)}
                aria-label={
                  unlocked
                    ? `Nivel ${lvl.id}: ${lvl.name}. Dificultad ${DIFFICULTY_LABEL[lvl.difficulty]}${
                        isCompleted ? '. Superado' : ''
                      }`
                    : `Nivel ${lvl.id} bloqueado`
                }
              >
                {isCompleted && <span className="level-card-badge">⭐</span>}
                <span className="level-card-num">{unlocked ? lvl.id : '🔒'}</span>
                <span className="level-card-name">{lvl.name}</span>
                <span className="level-card-diff">{DIFFICULTY_LABEL[lvl.difficulty]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Las acciones quedan ANCLADAS abajo. Antes vivían dentro del área con scroll:
          con 12 niveles en pantalla, "Continuar" se iba fuera de la vista. */}
      <div className="menu-actions">
        <Button variant="primary" size="lg" block onClick={() => onPlayLevel(continueId)}>
          {allDone ? `↻ Rejugar nivel ${continueId}` : `▶ Continuar (Nivel ${continueId})`}
        </Button>
        <p className="menu-next-hint">
          {allDone ? '¡Has superado todos los niveles! 🏆' : continueLevel.name}
        </p>
      </div>
    </div>
  )
}
