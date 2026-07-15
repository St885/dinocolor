/**
 * Board3D.jsx
 * -----------------------------------------------------------------------------
 * Tablero de pelotas sobre una PLATAFORMA redondeada oscura y limpia.
 *
 * ENCAJE POR BANDAS RESERVADAS (corrección estructural)
 * -----------------------------------------------------
 * Antes el tablero se ajustaba contra la pantalla ENTERA (FIT_H = 66 % de la altura,
 * centrado en el origen) y luego se confiaba en que el HUD "cupiera encima". No cabía:
 *   - en móviles cortos el borde superior del tablero se metía bajo el cronómetro,
 *   - y la tarima de T-Rexo (arriba-izquierda) se comía la pelota superior izquierda.
 *
 * Ahora se reservan bandas en PÍXELES REALES (las que ocupa de verdad el HUD) y el
 * tablero se escala y se CENTRA dentro de la banda libre que queda:
 *
 *   ┌───────────────────────────┐  ← TOP_RESERVE_PX
 *   │ pausa · cronómetro · nivel│    (incluye la tarima de T-Rexo)
 *   │ [T-Rexo]                  │
 *   ├───────────────────────────┤
 *   │                           │
 *   │      banda libre: aquí    │  ← el tablero se centra aquí
 *   │      va el tablero        │
 *   ├───────────────────────────┤
 *   │ combo/aciertos · META ·🎁 │  ← BOTTOM_RESERVE_PX
 *   └───────────────────────────┘
 *
 * Si la banda libre se queda corta (móvil muy bajito), el tablero se encoge solo:
 * nunca invade el HUD. Funciona con cualquier forma de tablero y cualquier pantalla.
 *
 * Props:
 *   - layout       objeto de getLayout()
 *   - activeIds    Set de ids de celdas iluminadas
 *   - activeColor  color de activación
 *   - onBallTap    (cellId) => void   ← debe ser ESTABLE (useCallback en el padre)
 * -----------------------------------------------------------------------------
 */

import { memo, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { layoutToWorld } from '../../data/boardLayouts.js'
import { safeAreaInsets } from '../../utils/safeArea.js'
import Ball3D from './Ball3D.jsx'

const SPACING = 1.9
const BALL_R = 0.54 // buen tamaño táctil con separación cómoda
const MAX_SCALE = 1.2
const FIT_W = 0.9 // el tablero es el protagonista a lo ancho

/**
 * Bandas del HUD, en píxeles CSS. Medidas sobre el HUD real (game.css):
 *   Arriba: padding 10 + botón de pausa 42 + tarima de T-Rexo (100 alto, top 54) ≈ 154
 *   Abajo:  stats 28 + META 58 / cofre 62 + padding 18 ≈ 118
 * Se les suma el safe-area del dispositivo. Si tocas el HUD, ajusta estos números.
 */
const TOP_RESERVE_PX = 154
const BOTTOM_RESERVE_PX = 118
const MIN_BAND_PX = 200 // la banda libre nunca baja de aquí (pantallas diminutas)

function roundedRect(w, h, r) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

function Board3D({ layout, activeIds, activeColor, onBallTap }) {
  // Selectores: sin ellos, `const { viewport } = useThree()` suscribe el componente al
  // store ENTERO de R3F y lo re-renderiza ante cualquier cambio interno.
  const viewport = useThree((s) => s.viewport)
  const size = useThree((s) => s.size)

  const { cells, fitW, fitH, platform, rim, inner } = useMemo(() => {
    const positioned = layoutToWorld(layout, SPACING)
    let maxX = 0
    let maxY = 0
    positioned.forEach((c) => {
      maxX = Math.max(maxX, Math.abs(c.position[0]))
      maxY = Math.max(maxY, Math.abs(c.position[1]))
    })
    const w = maxX * 2 + BALL_R * 2
    const h = maxY * 2 + BALL_R * 2
    const padd = BALL_R * 2.0
    const platW = w + padd
    const platH = h + padd
    const rad = BALL_R * 1.6
    return {
      cells: positioned,
      fitW: platW + 0.16,
      fitH: platH + 0.16,
      platform: roundedRect(platW, platH, rad),
      rim: roundedRect(platW + 0.14, platH + 0.14, rad + 0.07),
      inner: roundedRect(platW - 0.55, platH - 0.55, rad * 0.8),
    }
  }, [layout])

  // --- Encaje dentro de la banda libre (en píxeles -> mundo) ---
  const safe = safeAreaInsets()
  const worldPerPx = viewport.height / size.height
  const topPx = TOP_RESERVE_PX + safe.top
  const bottomPx = BOTTOM_RESERVE_PX + safe.bottom
  const bandPx = Math.max(MIN_BAND_PX, size.height - topPx - bottomPx)
  const bandH = bandPx * worldPerPx

  const scale = Math.min(MAX_SCALE, (viewport.width * FIT_W) / fitW, (bandH * 0.94) / fitH)

  // Centrar el tablero en la banda libre (y no en el centro de la pantalla).
  const bandCenterPx = topPx + bandPx / 2
  const offsetY = (size.height / 2 - bandCenterPx) * worldPerPx

  const groundR = Math.max(fitW, fitH) * 0.62

  return (
    <group scale={scale} position={[0, offsetY, 0]}>
      {/* Halo que ASIENTA la losa en el mundo. Toma el color del nivel: en los niveles
          rosas/morados el halo verde fijo desentonaba con las pelotas. */}
      <mesh position={[0, -0.1, -1.3]}>
        <circleGeometry args={[groundR, 48]} />
        <meshBasicMaterial color={activeColor} transparent opacity={0.08} depthWrite={false} />
      </mesh>

      {/* Sombra proyectada bajo la losa (grounding) */}
      <mesh position={[0, -0.22, -1.2]}>
        <shapeGeometry args={[rim]} />
        <meshBasicMaterial color="#02110a" transparent opacity={0.42} depthWrite={false} />
      </mesh>

      {/* Filo del nivel (borde premium, mismo color que las pelotas activas) */}
      <mesh position={[0, 0, -1.08]}>
        <shapeGeometry args={[rim]} />
        <meshBasicMaterial color={activeColor} transparent opacity={0.34} depthWrite={false} />
      </mesh>

      {/* Canto/grosor de la losa desplazado hacia abajo (da profundidad 3D real) */}
      <mesh position={[0, -0.1, -1.05]}>
        <shapeGeometry args={[platform]} />
        <meshStandardMaterial color="#0b1f27" roughness={0.9} metalness={0.18} />
      </mesh>

      {/* Cara superior: losa "piedra jurásica / tech", limpia y con volumen */}
      <mesh position={[0, 0, -1.0]}>
        <shapeGeometry args={[platform]} />
        <meshStandardMaterial color="#173b47" roughness={0.72} metalness={0.3} envMapIntensity={0.85} />
      </mesh>

      {/* Realce interior sutil (acabado premium, un poco más claro) */}
      <mesh position={[0, 0, -0.98]}>
        <shapeGeometry args={[inner]} />
        <meshBasicMaterial color="#22505f" transparent opacity={0.42} depthWrite={false} />
      </mesh>

      {cells.map((cell) => (
        <Ball3D
          key={cell.id}
          id={cell.id}
          position={cell.position}
          active={activeIds.has(cell.id)}
          color={activeColor}
          radius={BALL_R}
          onTap={onBallTap}
        />
      ))}
    </group>
  )
}

/**
 * memo: el tablero solo depende de layout/activeIds/color. Sin memo se reconstruía
 * en cada render de GameScene (o sea, con cada punto y cada segundo del cronómetro).
 */
export default memo(Board3D)
