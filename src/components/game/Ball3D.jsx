/**
 * Ball3D.jsx
 * -----------------------------------------------------------------------------
 * Pelota del tablero, look "canica metálica pulida":
 *   - Inactiva: gris azulado metálico con reflejos suaves (usa el envMap de la
 *     escena) y sombra de contacto.
 *   - Activa: VERDE brillante (no blanca) con un GLOW CIRCULAR suave detrás
 *     (disco de degradado radial, sin aros duros) + pulso + luz puntual tenue.
 *   - Feedback al pulsar: disco de destello que se expande y desvanece
 *     (verde = acierto, naranja = fallo).
 *
 * La escena usa NoToneMapping (Canvas `flat`) para que el verde no se queme.
 * Toda la animación va en useFrame (sin renders de React por frame).
 * -----------------------------------------------------------------------------
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const IDLE_COLOR = new THREE.Color('#b3c2d0') // gris azulado metálico (más claro/premium)
const BLACK = new THREE.Color('#000000')
const MISS_COLOR = new THREE.Color('#ff8a3d')

// Textura de glow radial (blanco al centro -> transparente). Compartida por todas
// las pelotas; se crea una sola vez.
let _glowTex = null
function glowTexture() {
  if (_glowTex || typeof document === 'undefined') return _glowTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  _glowTex = new THREE.CanvasTexture(c)
  _glowTex.colorSpace = THREE.SRGBColorSpace
  return _glowTex
}

export default function Ball3D({ position, active, color = '#39ff88', radius = 0.52, onTap }) {
  const meshRef = useRef()
  const matRef = useRef()
  const glowRef = useRef()
  const burstRef = useRef()
  const pressRef = useRef(0)
  const burst0 = useRef(0)
  const tex = useMemo(() => glowTexture(), [])

  const { emissiveColor, baseColor } = useMemo(() => {
    const c = new THREE.Color(color)
    return { emissiveColor: c.clone(), baseColor: c.clone().multiplyScalar(0.55) }
  }, [color])

  // Partículas de "juice" al pulsar (chispas que salen disparadas).
  const PART_N = 9
  const partPos = useMemo(() => new Float32Array(PART_N * 3), [])
  const partDirs = useMemo(() => {
    const d = []
    for (let i = 0; i < PART_N; i++) {
      const a = (i / PART_N) * Math.PI * 2 + (i % 2 ? 0.3 : -0.2)
      const sp = 0.85 + (i % 3) * 0.18
      d.push([Math.cos(a) * sp, Math.sin(a) * sp, i % 2 ? 0.25 : -0.12])
    }
    return d
  }, [])
  const partGeom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(partPos, 3))
    return g
  }, [partPos])
  const partRef = useRef()
  const part0 = useRef(0)

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const mesh = meshRef.current
    const mat = matRef.current
    if (!mesh || !mat) return
    const k = Math.min(1, delta * 9)
    const wob = (Math.sin(t * 6) + 1) / 2

    const pulse = active ? 1 + wob * 0.05 : 1
    const press = (pressRef.current = Math.max(0, pressRef.current - delta * 4.5))
    mesh.scale.setScalar(pulse * (1 - press * 0.16))

    // Color/emisión verde controlada.
    mat.color.lerp(active ? baseColor : IDLE_COLOR, k)
    mat.emissive.lerp(active ? emissiveColor : BLACK, k)
    const targetEmissive = active ? 0.5 + wob * 0.22 : 0
    mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * k

    // Glow circular detrás de la pelota activa.
    const glow = glowRef.current
    if (glow) {
      const target = active ? 0.92 + wob * 0.1 : 0
      glow.material.opacity += (target - glow.material.opacity) * k
      glow.visible = glow.material.opacity > 0.02
      const s = radius * (2.95 + (active ? wob * 0.14 : 0))
      glow.scale.set(s, s, s)
    }

    // Disco de destello al pulsar (expande y desvanece).
    const burst = burstRef.current
    if (burst) {
      const p = (burst0.current = Math.max(0, burst0.current - delta * 2.6))
      if (p > 0) {
        const s = radius * (2.2 + (1 - p) * 2.4)
        burst.scale.set(s, s, s)
        burst.material.opacity = p * 0.8
        burst.visible = true
      } else if (burst.visible) {
        burst.visible = false
      }
    }

    // Partículas (chispas) al pulsar.
    const parts = partRef.current
    if (parts) {
      const p = (part0.current = Math.max(0, part0.current - delta * 2.2))
      if (p > 0) {
        const spread = radius * 2.9 * (1 - p)
        for (let i = 0; i < PART_N; i++) {
          const d = partDirs[i]
          partPos[i * 3] = d[0] * spread
          partPos[i * 3 + 1] = d[1] * spread
          partPos[i * 3 + 2] = d[2] * spread
        }
        parts.geometry.attributes.position.needsUpdate = true
        parts.material.opacity = p
        parts.material.size = radius * (0.42 + p * 0.32)
        parts.visible = true
      } else if (parts.visible) {
        parts.visible = false
      }
    }
  })

  const handleDown = (e) => {
    e.stopPropagation()
    pressRef.current = 1
    burst0.current = 1
    part0.current = 1
    const fx = active ? emissiveColor : MISS_COLOR
    if (burstRef.current) burstRef.current.material.color.copy(fx)
    if (partRef.current) partRef.current.material.color.copy(fx)
    onTap && onTap()
  }

  return (
    <group position={position}>
      {/* Sombra de contacto */}
      <mesh position={[0, -radius * 0.98, -0.7]} scale={[1.25, 0.42, 1]}>
        <circleGeometry args={[radius * 0.8, 24]} />
        <meshBasicMaterial color="#05100a" transparent opacity={0.34} depthWrite={false} />
      </mesh>

      {/* Glow circular (detrás) */}
      <mesh ref={glowRef} position={[0, 0, -0.12]} visible={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={tex}
          color={color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      {/* Destello de toque (delante) */}
      <mesh ref={burstRef} position={[0, 0, 0.5]} visible={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={tex}
          color={color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      {/* Partículas (chispas) al pulsar */}
      <points ref={partRef} geometry={partGeom} position={[0, 0, 0.55]} visible={false}>
        <pointsMaterial
          color={color}
          size={radius * 0.5}
          transparent
          opacity={0}
          depthWrite={false}
          depthTest={false}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Esfera metálica */}
      <mesh ref={meshRef} onPointerDown={handleDown}>
        <sphereGeometry args={[radius, 40, 40]} />
        <meshStandardMaterial
          ref={matRef}
          color={IDLE_COLOR}
          emissive={BLACK}
          emissiveIntensity={0}
          metalness={0.5}
          roughness={0.26}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Luz puntual tenue cuando está activa */}
      {active && <pointLight color={color} intensity={0.8} distance={2.4} decay={2} />}
    </group>
  )
}
