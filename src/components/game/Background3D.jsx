/**
 * Background3D.jsx
 * -----------------------------------------------------------------------------
 * Ambiente 3D de la pantalla de juego: un MUNDO DE DINOSAURIOS amistoso "pintado".
 * En vez de siluetas 3D sueltas (que se leían como manchas), se pinta un TELÓN por
 * capas en un CanvasTexture: cielo jurásico al amanecer con sol cálido, cordilleras
 * con niebla (perspectiva atmosférica), un VOLCÁN lejano con brillo suave (amistoso,
 * no terrorífico), siluetas de dinos de cuello largo en el horizonte, dosel de jungla,
 * y grandes frondas de helecho/palmera desenfocadas enmarcando las esquinas.
 *
 * Es colorido y con profundidad, pero NO compite con el tablero: el centro queda
 * calmado y con viñeta, y las pelotas siempre mandan en la lectura.
 *
 * Añade luciérnagas, un envMap sutil (reflejos de las canicas) e iluminación
 * amable. Todo procedural (sin assets, sin dependencias nuevas). Canvas `flat`
 * (NoToneMapping) para que los verdes no se desaturen.
 * -----------------------------------------------------------------------------
 */

import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Sprite radial suave para las luciérnagas (sin él, los points se dibujan como
// CUADRADOS — se veía un artefacto cuadrado en el borde de la pantalla).
let _spriteTex = null
function spriteTexture() {
  if (_spriteTex || typeof document === 'undefined') return _spriteTex
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.5)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  _spriteTex = new THREE.CanvasTexture(c)
  _spriteTex.colorSpace = THREE.SRGBColorSpace
  return _spriteTex
}

/** Cordillera/dosel ondulado desde topY hasta abajo (relleno + rim opcional). */
function ridge(ctx, W, H, topY, amp, color, freqs, blur, rim) {
  const yAt = (x) =>
    topY -
    amp *
      (Math.sin(x * freqs[0] + freqs[3]) * 0.5 +
        Math.sin(x * freqs[1] + freqs[4]) * 0.3 +
        Math.sin(x * freqs[2] + freqs[5]) * 0.2 +
        0.7)
  ctx.save()
  if (blur) ctx.filter = `blur(${blur}px)`
  ctx.beginPath()
  ctx.moveTo(0, H)
  ctx.lineTo(0, topY)
  for (let x = 0; x <= W; x += 6) ctx.lineTo(x, yAt(x))
  ctx.lineTo(W, H)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
  if (rim) {
    ctx.save()
    if (blur) ctx.filter = `blur(${Math.max(0, blur - 1)}px)`
    ctx.beginPath()
    for (let x = 0; x <= W; x += 6) (x === 0 ? ctx.moveTo(x, yAt(x)) : ctx.lineTo(x, yAt(x)))
    ctx.strokeStyle = rim
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  }
}

/** Volcán lejano: cono suave con leve resplandor cálido en el cráter (amistoso). */
function volcano(ctx, cx, baseY, w, h, color) {
  const topW = w * 0.22
  ctx.save()
  ctx.filter = 'blur(2px)'
  ctx.beginPath()
  ctx.moveTo(cx - w / 2, baseY)
  ctx.lineTo(cx - topW / 2, baseY - h)
  ctx.lineTo(cx + topW / 2, baseY - h)
  ctx.lineTo(cx + w / 2, baseY)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
  // Resplandor cálido del cráter (sutil)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createRadialGradient(cx, baseY - h, 0, cx, baseY - h, h * 0.55)
  g.addColorStop(0, 'rgba(255,150,80,0.34)')
  g.addColorStop(1, 'rgba(255,150,80,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, baseY - h, h * 0.55, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Silueta amistosa de dino de cuello largo (sauropodo) en el horizonte. */
function sauropod(ctx, x, gy, s, color) {
  ctx.save()
  ctx.filter = 'blur(1px)'
  ctx.fillStyle = color
  // cuerpo
  ctx.beginPath()
  ctx.ellipse(x, gy - s * 0.28, s * 0.5, s * 0.25, 0, 0, Math.PI * 2)
  ctx.fill()
  // cola
  ctx.beginPath()
  ctx.moveTo(x - s * 0.35, gy - s * 0.34)
  ctx.quadraticCurveTo(x - s * 0.95, gy - s * 0.3, x - s * 1.02, gy - s * 0.52)
  ctx.quadraticCurveTo(x - s * 0.8, gy - s * 0.18, x - s * 0.3, gy - s * 0.24)
  ctx.closePath()
  ctx.fill()
  // cuello + cabeza
  ctx.beginPath()
  ctx.moveTo(x + s * 0.28, gy - s * 0.36)
  ctx.quadraticCurveTo(x + s * 0.72, gy - s * 0.5, x + s * 0.68, gy - s * 0.95)
  ctx.quadraticCurveTo(x + s * 0.9, gy - s * 0.6, x + s * 0.5, gy - s * 0.3)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(x + s * 0.72, gy - s * 0.97, s * 0.11, s * 0.08, 0, 0, Math.PI * 2)
  ctx.fill()
  // patas
  ctx.fillRect(x - s * 0.26, gy - s * 0.3, s * 0.1, s * 0.3)
  ctx.fillRect(x + s * 0.12, gy - s * 0.3, s * 0.1, s * 0.3)
  ctx.restore()
}

/** Pterosaurio/ave lejana (silueta "m" suave y amistosa). */
function pterosaur(ctx, x, y, s, color) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1.4, s * 0.16)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x - s, y)
  ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.6, x, y)
  ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.6, x + s, y)
  ctx.stroke()
  ctx.restore()
}

/** Nido con huevos de dinosaurio (silueta suave con motas, decoración inferior). */
function dinoEggs(ctx, cx, cy, s, color, spot) {
  ctx.save()
  ctx.filter = 'blur(1px)'
  ctx.fillStyle = color
  // montículo del nido
  ctx.beginPath()
  ctx.ellipse(cx, cy + s * 0.4, s * 1.5, s * 0.4, 0, 0, Math.PI * 2)
  ctx.fill()
  // huevos
  const eggs = [
    [cx - s * 0.55, cy, s * 0.42, s * 0.55],
    [cx + s * 0.4, cy + s * 0.06, s * 0.38, s * 0.5],
    [cx - s * 0.02, cy - s * 0.18, s * 0.44, s * 0.58],
  ]
  for (const [x, y, rx, ry] of eggs) {
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // motas (toque amistoso)
  ctx.fillStyle = spot
  for (const [x, y, rx] of eggs) {
    ctx.beginPath()
    ctx.arc(x - rx * 0.2, y - rx * 0.3, rx * 0.18, 0, Math.PI * 2)
    ctx.arc(x + rx * 0.3, y + rx * 0.15, rx * 0.13, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** Huella de dino de tres dedos, muy tenue (detalle de mundo). */
function footprint(ctx, x, y, s, rot, color) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(0, 0, s * 0.34, s * 0.42, 0, 0, Math.PI * 2) // palma
  ctx.fill()
  for (const a of [-0.6, 0, 0.6]) {
    ctx.beginPath()
    ctx.ellipse(Math.sin(a) * s * 0.42, -s * 0.52 - Math.cos(a) * s * 0.1, s * 0.13, s * 0.3, a * 0.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** Fronda de helecho/palmera (rib central + folíolos), para enmarcar esquinas. */
function frond(ctx, cx, cy, len, angle, color, blur) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  ctx.filter = `blur(${blur}px)`
  ctx.fillStyle = color
  // hoja central
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(len * 0.5, -len * 0.16, len, -len * 0.02)
  ctx.quadraticCurveTo(len * 0.5, len * 0.16, 0, 0)
  ctx.fill()
  // folíolos
  const n = 8
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1)
    const px = len * t
    const py = -len * 0.16 * Math.sin(Math.PI * t) * 0.5
    const ll = len * 0.2 * (1 - t * 0.55)
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(px - ll * 0.25, py - ll)
    ctx.lineTo(px + ll * 0.35, py - ll * 0.2)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(px - ll * 0.25, py + ll)
    ctx.lineTo(px + ll * 0.35, py + ll * 0.2)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/** Pinta el mundo de dinosaurios por capas (soft, colorido, premium).
 *  TODA la escenografía vive en la BANDA SUPERIOR (~0-30%), que es la zona visible
 *  por encima del tablero; el centro/abajo queda calmado (el tablero manda). */
function paintDinoWorld(W, H) {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')

  // --- Cielo jurásico al amanecer: colorido arriba, calmado hacia el centro ---
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0.0, '#165a51')
  sky.addColorStop(0.12, '#226a5b')
  sky.addColorStop(0.22, '#2c7d5e') // banda cálida-verde (amanecer)
  sky.addColorStop(0.33, '#164a3c')
  sky.addColorStop(0.55, '#0c3025')
  sky.addColorStop(1.0, '#05160e')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  // --- Sol / amanecer cálido (detrás de las montañas) ---
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const halo = ctx.createRadialGradient(W * 0.6, H * 0.1, 0, W * 0.6, H * 0.1, H * 0.36)
  halo.addColorStop(0, 'rgba(255,228,150,0.40)')
  halo.addColorStop(0.5, 'rgba(255,186,120,0.12)')
  halo.addColorStop(1, 'rgba(255,186,120,0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, W, H)
  const disc = ctx.createRadialGradient(W * 0.6, H * 0.095, 0, W * 0.6, H * 0.095, H * 0.05)
  disc.addColorStop(0, 'rgba(255,246,214,0.75)')
  disc.addColorStop(1, 'rgba(255,246,214,0)')
  ctx.fillStyle = disc
  ctx.fillRect(0, 0, W, H)
  ctx.restore()

  // --- Cordillera lejana con niebla (clara, atmosférica) ---
  ridge(ctx, W, H, H * 0.155, H * 0.045, '#33705f', [0.006, 0.014, 0.03, 0.4, 1.7, 3.1], 6, null)

  // --- Volcán amistoso (a la DERECHA: zona visible, no lo tapa la tarjeta de T-Rexo) ---
  volcano(ctx, W * 0.82, H * 0.21, W * 0.3, H * 0.125, '#256150')

  // --- Pterosaurios lejanos en el cielo (vida amistosa) ---
  pterosaur(ctx, W * 0.47, H * 0.115, 9, 'rgba(10,42,33,0.75)')
  pterosaur(ctx, W * 0.55, H * 0.09, 6.5, 'rgba(10,42,33,0.6)')
  pterosaur(ctx, W * 0.4, H * 0.145, 5.5, 'rgba(10,42,33,0.5)')

  // --- Cordillera media ---
  ridge(ctx, W, H, H * 0.205, H * 0.05, '#1a5443', [0.008, 0.02, 0.045, 1.1, 2.3, 0.7], 3, 'rgba(130,230,180,0.18)')

  // --- Niebla sobre las cordilleras (profundidad) ---
  ctx.save()
  const mist = ctx.createLinearGradient(0, H * 0.14, 0, H * 0.28)
  mist.addColorStop(0, 'rgba(200,240,222,0)')
  mist.addColorStop(0.5, 'rgba(192,236,216,0.18)')
  mist.addColorStop(1, 'rgba(192,236,216,0)')
  ctx.fillStyle = mist
  ctx.fillRect(0, H * 0.14, W, H * 0.14)
  ctx.restore()

  // --- Dinos lejanos (siluetas amistosas de cuello largo) sobre la loma ---
  sauropod(ctx, W * 0.46, H * 0.225, 48, '#123f33')
  sauropod(ctx, W * 0.6, H * 0.235, 33, '#103a2f')

  // --- Dosel de jungla cercano (enmarca el borde superior del tablero) ---
  ridge(ctx, W, H, H * 0.285, H * 0.05, '#0e3a2b', [0.01, 0.022, 0.05, 2.0, 0.9, 2.4], 2, 'rgba(90,195,140,0.22)')
  ridge(ctx, W, H, H * 0.4, H * 0.045, '#082014', [0.013, 0.028, 0.06, 0.6, 2.1, 1.2], 1, null)

  // --- Banda inferior (bajo el tablero): claro de jungla con vida, sutil ---
  // Suelo/loma tenue
  ridge(ctx, W, H, H * 0.76, H * 0.03, 'rgba(10,36,24,0.55)', [0.011, 0.024, 0.05, 1.4, 0.5, 2.9], 3, null)
  // Nido con huevos de dino (izquierda) + brillo suave que lo hace legible
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const nest = ctx.createRadialGradient(W * 0.16, H * 0.8, 0, W * 0.16, H * 0.8, H * 0.06)
  nest.addColorStop(0, 'rgba(150,255,200,0.10)')
  nest.addColorStop(1, 'rgba(150,255,200,0)')
  ctx.fillStyle = nest
  ctx.fillRect(0, H * 0.7, W * 0.4, H * 0.2)
  ctx.restore()
  dinoEggs(ctx, W * 0.16, H * 0.795, 15, '#0d3527', 'rgba(120,220,170,0.28)')
  // Helechos medianos (derecha, sobre el cofre pero detrás de todo)
  frond(ctx, W * 0.98, H * 0.82, 120, Math.PI - 0.35, 'rgba(9,32,21,0.85)', 3)
  frond(ctx, W * 1.02, H * 0.86, 100, Math.PI + 0.15, 'rgba(7,26,17,0.9)', 3)
  // Huellas de dino cruzando en diagonal (muy tenues)
  footprint(ctx, W * 0.42, H * 0.78, 7, 0.5, 'rgba(120,220,170,0.10)')
  footprint(ctx, W * 0.5, H * 0.81, 7, 0.7, 'rgba(120,220,170,0.09)')
  footprint(ctx, W * 0.58, H * 0.785, 7, 0.5, 'rgba(120,220,170,0.08)')

  // --- Frondas de helecho/palmera enmarcando esquinas (verdes oscuras, desenfocadas) ---
  const frondCol = 'rgba(6,26,17,0.9)'
  frond(ctx, -16, 20, 235, 0.5, frondCol, 6) // sup-izq
  frond(ctx, 30, -12, 180, 1.1, frondCol, 7)
  frond(ctx, W + 18, 40, 220, Math.PI - 0.42, frondCol, 6) // sup-der (lejos del sol)
  frond(ctx, W + 6, -6, 165, Math.PI - 0.95, frondCol, 7)
  frond(ctx, -10, H + 20, 240, -0.5, frondCol, 8) // inf-izq
  frond(ctx, W + 10, H + 20, 240, Math.PI + 0.5, frondCol, 8) // inf-der

  // --- Viñeta suave (foco al centro, SIN apagar la escenografía superior) ---
  const vig = ctx.createRadialGradient(W * 0.5, H * 0.4, H * 0.32, W * 0.5, H * 0.5, H * 0.8)
  vig.addColorStop(0, 'rgba(2,8,5,0)')
  vig.addColorStop(1, 'rgba(2,8,5,0.5)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, W, H)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * Telón pintado (plano grande detrás de todo).
 *
 * RENDIMIENTO: la textura se cachea a nivel de MÓDULO. Antes iba en un useMemo del
 * componente, así que cada montaje de GameScene — o sea, CADA nivel y CADA reintento —
 * volvía a pintar a mano un canvas de 512x896 con decenas de degradados, blurs y
 * siluetas, y a subirlo a la GPU. Es un dibujo estático: basta con hacerlo una vez.
 */
let _worldTex = null
function worldTexture() {
  if (!_worldTex) _worldTex = paintDinoWorld(512, 896)
  return _worldTex
}

function DinoWorldBackdrop() {
  const tex = worldTexture()
  // Ojo: NO se hace dispose al desmontar. La textura la comparten todos los niveles y
  // vive lo que viva la pestaña; liberarla obligaría a repintarla en el siguiente nivel.
  return (
    <mesh position={[0, 0, -11]}>
      <planeGeometry args={[13.2, 23]} />
      <meshBasicMaterial map={tex} fog={false} depthWrite={false} />
    </mesh>
  )
}

/** envMap suave (gradiente equirectangular) para reflejos de los metales. */
let _envTex = null
function envTexture() {
  if (_envTex || typeof document === 'undefined') return _envTex
  const c = document.createElement('canvas')
  c.width = 16
  c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 64)
  g.addColorStop(0.0, '#5aa07c')
  g.addColorStop(0.5, '#1a4a42')
  g.addColorStop(1.0, '#08120c')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 16, 64)
  _envTex = new THREE.CanvasTexture(c)
  _envTex.mapping = THREE.EquirectangularReflectionMapping
  _envTex.colorSpace = THREE.SRGBColorSpace
  return _envTex
}

function EnvLight() {
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const tex = envTexture()
    if (!tex) return undefined
    const prev = scene.environment
    scene.environment = tex
    return () => {
      scene.environment = prev
    }
  }, [scene])
  return null
}

/** Luciérnagas/partículas cálidas flotando (ambiente vivo del mundo dino). */
function Fireflies({ count = 24 }) {
  const ref = useRef()
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < count; i++) {
      const a = i * golden
      const r = 3 + (i % 7) * 0.95
      pos[i * 3] = Math.cos(a) * r
      pos[i * 3 + 1] = Math.sin(a * 1.3) * 3.0 + ((i % 5) - 2) * 0.6
      pos[i * 3 + 2] = -2 - (i % 5) * 1.2
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [count])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ref.current) {
      ref.current.rotation.z = Math.sin(t * 0.05) * 0.12
      ref.current.position.y = Math.sin(t * 0.4) * 0.2
    }
  })
  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial
        map={spriteTexture()}
        color="#bfffd8"
        size={0.14}
        sizeAttenuation
        transparent
        opacity={0.62}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function Background3D() {
  return (
    <group>
      <DinoWorldBackdrop />
      <EnvLight />

      {/* Iluminación amable del mundo dino: hemisférica cálida + sol + contraluz frío.
          Un pelín más clara para que las canicas metálicas se vean premium.

          El recuento de luces es FIJO durante toda la partida (antes Ball3D añadía un
          <pointLight> por cada pelota encendida). Menos luces = sombreado por píxel más
          barato, y una sola variante de programa que compilar. Si añades aquí una luz,
          que sea permanente: las que se encienden y apagan obligan a Three.js a cambiar
          de variante de shader sobre la marcha. */}
      <hemisphereLight args={['#dff2ea', '#33421f', 0.72]} />
      <ambientLight intensity={0.34} />
      <directionalLight position={[4, 7, 6]} intensity={1.5} color="#fff2cf" />
      <directionalLight position={[-5, 3, -3]} intensity={0.55} color="#8ab6ff" />

      <Fireflies />
    </group>
  )
}

/** memo: no recibe props; con memo NUNCA se re-renderiza tras el primer montaje. */
export default memo(Background3D)
