/**
 * Board3D.jsx
 * -----------------------------------------------------------------------------
 * Tablero de pelotas sobre una PLATAFORMA redondeada oscura y limpia (diseño
 * aprobado). Se autoescala para caber SIEMPRE en pantalla (cualquier forma y
 * aspecto) usando el viewport real de R3F, dejando aire para el HUD arriba/abajo.
 *
 * Props:
 *   - layout       objeto de getLayout()
 *   - activeIds    Set de ids de celdas iluminadas
 *   - activeColor  color de activación
 *   - onBallTap    (cellId) => void
 * -----------------------------------------------------------------------------
 */

import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { layoutToWorld } from '../../data/boardLayouts.js'
import Ball3D from './Ball3D.jsx'

const SPACING = 1.9
const BALL_R = 0.54 // buen tamaño táctil con separación cómoda
const MAX_SCALE = 1.2
const FIT_W = 0.9 // tablero protagonista (más ancho)
const FIT_H = 0.66 // deja banda arriba (timer/score) y abajo (meta/cofre)
const DROP_FRAC = -0.02 // sube el tablero un pelín para centrarlo en la banda jugable

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

export default function Board3D({ layout, activeIds, activeColor, onBallTap }) {
  const { viewport } = useThree()

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

  const scale = Math.min(MAX_SCALE, (viewport.width * FIT_W) / fitW, (viewport.height * FIT_H) / fitH)
  const offsetY = -viewport.height * DROP_FRAC

  return (
    <group scale={scale} position={[0, offsetY, 0]}>
      {/* Filo verde sutil (borde premium, sin neón exagerado) */}
      <mesh position={[0, 0, -1.06]}>
        <shapeGeometry args={[rim]} />
        <meshBasicMaterial color="#3fbf82" transparent opacity={0.32} depthWrite={false} />
      </mesh>

      {/* Plataforma oscura pero NO negra (tono medio, limpia) */}
      <mesh position={[0, 0, -1.0]}>
        <shapeGeometry args={[platform]} />
        <meshStandardMaterial color="#15303c" roughness={0.8} metalness={0.25} envMapIntensity={0.7} />
      </mesh>

      {/* Realce interior sutil (acabado premium, un poco más claro) */}
      <mesh position={[0, 0, -0.98]}>
        <shapeGeometry args={[inner]} />
        <meshBasicMaterial color="#1e3f4d" transparent opacity={0.45} depthWrite={false} />
      </mesh>

      {cells.map((cell) => (
        <Ball3D
          key={cell.id}
          position={cell.position}
          active={activeIds.has(cell.id)}
          color={activeColor}
          radius={BALL_R}
          onTap={() => onBallTap(cell.id)}
        />
      ))}
    </group>
  )
}
