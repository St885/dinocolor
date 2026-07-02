/**
 * MenuScene.jsx — Menú principal: récord, progreso, selector de niveles con
 * estados (completado / actual / bloqueado) y botón Continuar. Mobile-first.
 */

import Button from '../components/ui/Button.jsx'
import Panel from '../components/ui/Panel.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import { getAllLevels } from '../systems/levelSystem.js'

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
  bestScore,
  isUnlocked,
  soundEnabled,
  onToggleSound,
}) {
  const levels = getAllLevels()
  const total = levels.length
  const completed = Math.max(0, Math.min(total, maxLevel - 1))

  return (
    <div className="scene scene--menu">
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
          onClick={onToggleSound}
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
          const isCompleted = lvl.id < maxLevel
          const isCurrent = lvl.id === maxLevel
          const cls = [
            'level-card',
            `level-card--${lvl.difficulty}`,
            !unlocked && 'level-card--locked',
            isCurrent && 'level-card--current',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={lvl.id}
              className={cls}
              disabled={!unlocked}
              onClick={() => unlocked && onPlayLevel(lvl.id)}
            >
              {isCompleted && <span className="level-card-badge">⭐</span>}
              <span className="level-card-num">{unlocked ? lvl.id : '🔒'}</span>
              <span className="level-card-name">{lvl.name}</span>
              <span className="level-card-diff">{DIFFICULTY_LABEL[lvl.difficulty]}</span>
            </button>
          )
        })}
      </div>

      <div className="scene-actions">
        <Button variant="primary" size="lg" block onClick={() => onPlayLevel(maxLevel)}>
          ▶ Continuar (Nivel {maxLevel})
        </Button>
      </div>
    </div>
  )
}
