/**
 * MenuScene.jsx — Menú principal: récord, progreso, selector de niveles por CAPÍTULOS
 * y botón Continuar. Mobile-first.
 *
 * El progreso se calcula con `clearedLevel` (niveles SUPERADOS), no con `maxLevel - 1`
 * (niveles DESBLOQUEADOS). Con la fórmula vieja, ganar el último nivel no desbloqueaba
 * nada — no hay nivel 43 — y el contador se quedaba clavado en "41/42" para siempre,
 * incluso con el juego terminado al 100 %.
 *
 * SELECTOR POR CAPÍTULOS (iteración 2026-07-28): antes se pintaban las 42 tarjetas
 * seguidas — 14 filas, ~1.400 px de scroll, y una pared de tarjetas bloqueadas como
 * primera impresión. Ahora se muestra un capítulo a la vez (los cinco tramos de la
 * curva de dificultad) y se abre por defecto en el capítulo donde el jugador va. Ver
 * `src/data/chapters.js`.
 */

import { useCallback, useMemo, useState } from 'react'
import Button from '../components/ui/Button.jsx'
import Panel from '../components/ui/Panel.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import LevelStars from '../components/ui/LevelStars.jsx'
import AccountChip from '../components/auth/AccountChip.jsx'
import DailyMissions from '../components/game/DailyMissions.jsx'
import { getAllLevels } from '../systems/levelSystem.js'
import { unlock } from '../systems/audioSystem.js'
import { CHAPTERS, chapterIndexOfLevel } from '../data/chapters.js'

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
  getStars = () => 0,
  totalStars = 0,
  maxStars = 0,
  soundEnabled,
  onToggleSound,
  user = null,
  onSignOut = () => {},
  bones = 0,
  missions = [],
  missionsDone = 0,
  onOpenShop = () => {},
  shopReady = 0,
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

  // El menú se abre en el capítulo donde el jugador va, no siempre en el primero.
  const [chapterIdx, setChapterIdx] = useState(() => chapterIndexOfLevel(continueId))
  const chapter = CHAPTERS[chapterIdx] || CHAPTERS[0]

  const chapterLevels = useMemo(
    () => levels.filter((l) => l.id >= chapter.from && l.id <= chapter.to),
    [levels, chapter.from, chapter.to],
  )

  const handleToggleSound = useCallback(() => {
    unlock() // desbloquea el audio si este es el primer gesto del jugador
    onToggleSound()
  }, [onToggleSound])

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
          onClick={handleToggleSound}
          aria-label={soundEnabled ? 'Silenciar' : 'Activar sonido'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      </div>

      {/* Quién está jugando. Va bajo la cabecera y no dentro de ella: en 360 px
          el nombre competía con el título y lo empujaba fuera. */}
      {user && (
        <div className="menu-account">
          <AccountChip user={user} onSignOut={onSignOut} />
        </div>
      )}

      {/* PANEL DE PROGRESO (v0.6.0). Antes eran tres filas apiladas "etiqueta …
          valor"; ahora los tres números viven en una sola fila de tarjetas y la
          barra de progreso va debajo. Ocupa MENOS alto que la versión anterior aun
          añadiendo los huesos, que es lo que deja sitio para las misiones. */}
      <Panel className="menu-best">
        <div className="stat-row">
          <div className="stat-cell">
            <span className="stat-ico" aria-hidden="true">⭐</span>
            <strong className="stat-value">
              {totalStars}
              <i>/{maxStars}</i>
            </strong>
            <span className="stat-label">Estrellas</span>
          </div>
          <div className="stat-cell">
            <span className="stat-ico" aria-hidden="true">🏆</span>
            <strong className="stat-value">{bestScore}</strong>
            <span className="stat-label">Récord</span>
          </div>
          {/* La celda de huesos ES el acceso a la tienda: donde ves el saldo es
              donde esperas poder gastarlo, y así no hace falta otro botón fijo
              robando altura al menú. */}
          <button
            type="button"
            className={`stat-cell stat-cell--bones stat-cell--shop ${shopReady > 0 ? 'has-offers' : ''}`}
            onClick={onOpenShop}
            aria-label={
              shopReady > 0
                ? `Tienda: ${bones} huesos, ${shopReady} artículos a tu alcance`
                : `Tienda: ${bones} huesos`
            }
          >
            <span className="stat-ico" aria-hidden="true">🦴</span>
            <strong className="stat-value">{bones}</strong>
            <span className="stat-label">Tienda</span>
            {shopReady > 0 && <span className="stat-dot" aria-hidden="true">{shopReady}</span>}
          </button>
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

      {/* Navegación de capítulos: un tramo a la vez en vez de 42 tarjetas seguidas. */}
      <nav className="chapter-nav" aria-label="Capítulos">
        {CHAPTERS.map((c, i) => {
          const chapterUnlocked = isUnlocked(c.from)
          return (
            <button
              key={c.id}
              className={[
                'chapter-tab',
                i === chapterIdx && 'is-active',
                !chapterUnlocked && 'is-locked',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setChapterIdx(i)}
              aria-current={i === chapterIdx ? 'true' : undefined}
              aria-label={`${c.name}, niveles ${c.from} a ${c.to}${
                chapterUnlocked ? '' : ' (bloqueado)'
              }`}
            >
              <span className="chapter-tab-ico" aria-hidden="true">
                {chapterUnlocked ? c.icon : '🔒'}
              </span>
              <span className="chapter-tab-name">{c.short}</span>
            </button>
          )
        })}
      </nav>

      <div className="menu-scroll">
        {/* Las misiones van DENTRO del área con scroll, no en la banda fija de
            arriba: así se ven nada más entrar (quedan justo bajo los capítulos)
            pero no roban altura permanente a la rejilla de niveles ni empujan el
            botón "Continuar", que sigue anclado abajo. */}
        <DailyMissions missions={missions} done={missionsDone} />

        <h2 className="menu-subtitle">
          {chapter.name}
          <em>
            Niveles {chapter.from}–{chapter.to}
          </em>
        </h2>

        <div className="level-grid">
          {chapterLevels.map((lvl) => {
            const unlocked = isUnlocked(lvl.id)
            const isCompleted = lvl.id <= clearedLevel
            const isCurrent = !isCompleted && lvl.id === continueId
            const stars = isCompleted ? getStars(lvl.id) : 0
            const cls = [
              'level-card',
              `level-card--${lvl.difficulty}`,
              !unlocked && 'level-card--locked',
              isCurrent && 'level-card--current',
              isCompleted && 'level-card--done',
              stars === 3 && 'level-card--perfect',
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
                        isCompleted ? `. Superado con ${stars} de 3 estrellas` : ''
                      }`
                    : `Nivel ${lvl.id} bloqueado`
                }
              >
                {isCurrent && <span className="level-card-flag">AQUÍ</span>}
                {/* El candado va como INSIGNIA, no en lugar del número: una tarjeta
                    bloqueada mostraba solo 🔒 y, dentro de un capítulo, era imposible
                    saber qué nivel era (antes lo delataba su posición en la lista de 42). */}
                {!unlocked && (
                  <span className="level-card-lock" aria-hidden="true">
                    🔒
                  </span>
                )}
                <span className="level-card-num">{lvl.id}</span>
                <span className="level-card-name">{lvl.name}</span>
                {/* Estado de un vistazo: bloqueado (🔒 y apagado), disponible (anillo
                    "AQUÍ"), completado (1–2 ⭐) o perfecto (3 ⭐ y borde dorado). */}
                {isCompleted ? (
                  <LevelStars value={stars} size="sm" />
                ) : (
                  <span className="level-card-diff">{DIFFICULTY_LABEL[lvl.difficulty]}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Las acciones quedan ANCLADAS abajo. Antes vivían dentro del área con scroll:
          con las tarjetas de nivel en pantalla, "Continuar" se iba fuera de la vista. */}
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
