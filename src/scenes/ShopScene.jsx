/**
 * ShopScene.jsx
 * -----------------------------------------------------------------------------
 * Tienda local: se cambian huesos 🦴 por ASPECTOS de T-Rexo y AMBIENTES.
 *
 * NO hay dinero real, ni packs, ni ofertas, ni nada que caduque. Los huesos se
 * ganan jugando y solo compran decoración: ninguna compra afecta a la dificultad,
 * desbloquea niveles ni da ventaja. Es un escaparate para que el progreso tenga
 * dónde gastarse, no una tienda.
 *
 * Dos pestañas para no apilar diez tarjetas en un móvil. Cada artículo enseña su
 * estado de un vistazo: equipado · en propiedad · puedes comprarlo · te faltan N.
 *
 * El "probador" de arriba enseña a T-Rexo con el aspecto SELECCIONADO (aunque no
 * lo tengas), que es la gracia de una tienda: ver antes de gastar.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useMemo, useState } from 'react'
import Button from '../components/ui/Button.jsx'
import DinoMascot from '../components/game/DinoMascot.jsx'
import BoneCount from '../components/ui/BoneCount.jsx'
import { getSkin } from '../data/skins.js'
import { getTheme } from '../data/themes.js'
import { itemState } from '../systems/inventorySystem.js'
import { Sounds, unlock } from '../systems/audioSystem.js'

const TABS = [
  { id: 'skins', label: 'Aspectos', icon: '🦖' },
  { id: 'themes', label: 'Ambientes', icon: '🌄' },
]

export default function ShopScene({
  bones,
  skins,
  themes,
  ownedSkins,
  ownedThemes,
  skinId,
  themeId,
  onBuy,
  onEquip,
  onBack,
}) {
  const [tab, setTab] = useState('skins')
  // Artículo que se está mirando en el probador (no implica tenerlo).
  const [previewSkin, setPreviewSkin] = useState(skinId)
  const [flash, setFlash] = useState(null) // mensaje efímero de compra/error

  const isSkins = tab === 'skins'
  const catalog = isSkins ? skins : themes
  const owned = isSkins ? ownedSkins : ownedThemes
  const equipped = isSkins ? skinId : themeId

  const previewed = useMemo(
    () => getSkin(previewSkin) || getSkin(skinId),
    [previewSkin, skinId],
  )

  const say = useCallback((text, tone = 'ok') => {
    setFlash({ text, tone })
    // Sin temporizador: el aviso se sustituye o desaparece con la siguiente acción.
    // Un setTimeout aquí obligaría a limpiarlo al desmontar y no aporta nada.
  }, [])

  const handleAction = useCallback(
    (item) => {
      unlock()
      const kind = isSkins ? 'skin' : 'theme'
      if (owned.includes(item.id)) {
        if (item.id === equipped) return
        onEquip(kind, item.id)
        Sounds.click()
        say(`${item.name} equipado`)
        return
      }
      const res = onBuy(kind, item.id)
      if (res.ok) {
        Sounds.win() // el mismo fanfarrón de ganar un nivel: una compra es un logro
        say(`¡${item.name} desbloqueado! −${res.price} 🦴`)
      } else if (res.reason === 'funds') {
        Sounds.miss()
        say(`Te faltan ${res.missing} 🦴 para esto`, 'bad')
      } else if (res.reason === 'owned') {
        say('Ya lo tienes')
      } else {
        say('No se ha podido completar', 'bad')
      }
    },
    [equipped, isSkins, onBuy, onEquip, owned, say],
  )

  const handleTab = useCallback((id) => {
    unlock()
    Sounds.click()
    setTab(id)
    setFlash(null)
  }, [])

  return (
    <div className="scene scene--shop">
      <header className="shop-header">
        <button className="hud-exit" onClick={onBack} aria-label="Volver al menú">
          ‹
        </button>
        <h1 className="shop-title">Tienda</h1>
        <BoneCount value={bones} className="shop-bones" />
      </header>

      {/* Probador: solo tiene sentido con aspectos; con ambientes el propio marco
          ya cambia de color al seleccionarlos, así que se libera ese espacio. */}
      {isSkins && (
        <div className="shop-preview">
          <DinoMascot
            className="mascot--shop"
            pose="greet"
            mood="happy"
            size={150}
            targetHeight={1.32}
            baseY={-0.66}
            skin={previewed}
          />
          <p className="shop-preview-name">{previewed?.name}</p>
        </div>
      )}

      <nav className="shop-tabs" aria-label="Secciones de la tienda">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`shop-tab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => handleTab(t.id)}
            aria-current={tab === t.id ? 'true' : undefined}
          >
            <span aria-hidden="true">{t.icon}</span> {t.label}
          </button>
        ))}
      </nav>

      {flash && (
        <p className={`shop-flash shop-flash--${flash.tone}`} role="status">
          {flash.text}
        </p>
      )}

      <ul className="shop-list">
        {catalog.map((item) => {
          const state = itemState(item, owned, equipped, bones)
          const theme = !isSkins ? getTheme(item.id) : null
          return (
            <li
              key={item.id}
              className={`shop-item is-${state}`}
              onClick={() => isSkins && setPreviewSkin(item.id)}
            >
              <span className={`shop-item-art ${isSkins ? `aura-${item.aura}` : ''}`} aria-hidden="true">
                {isSkins ? (
                  '🦖'
                ) : (
                  <span className="theme-swatch">
                    {theme.swatch.map((c) => (
                      <i key={c} style={{ background: c }} />
                    ))}
                  </span>
                )}
              </span>

              <span className="shop-item-body">
                <strong className="shop-item-name">{item.name}</strong>
                <span className="shop-item-desc">{item.description}</span>
              </span>

              <span className="shop-item-action">
                {state === 'equipped' ? (
                  <span className="shop-badge shop-badge--on">✔ Puesto</span>
                ) : state === 'owned' ? (
                  <Button variant="secondary" size="md" onClick={() => handleAction(item)}>
                    Poner
                  </Button>
                ) : (
                  <Button
                    variant={state === 'affordable' ? 'primary' : 'ghost'}
                    size="md"
                    onClick={() => handleAction(item)}
                    /* No se deshabilita cuando falta saldo: al pulsarlo dice
                       cuántos huesos faltan, que es información útil. Un botón
                       muerto no explica nada. */
                  >
                    {item.price} 🦴
                  </Button>
                )}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="shop-foot">
        <p className="hint">Los huesos se ganan jugando y con las misiones del día.</p>
      </div>
    </div>
  )
}
