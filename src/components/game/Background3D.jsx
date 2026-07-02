/**
 * Background3D.jsx
 * -----------------------------------------------------------------------------
 * Ambiente 3D de la pantalla de juego: JUNGLA JURÁSICA NOCTURNA "pintada".
 * En lugar de siluetas 3D sueltas (que se leían como manchas), se usa un TELÓN
 * pintado en un CanvasTexture con capas suaves (cielo con rayo cálido, cordillera
 * con niebla, dosel, matorral y frondas de primer plano desenfocadas). Es más
 * premium, con profundidad, y NO ensucia la lectura del tablero.
 *
 * Sigue el lenguaje visual de TREXoRoll (fondo tipo imagen + luces cálidas/frías)
 * pero adaptado y oscuro. Añade luciérnagas y un envMap sutil para reflejos de las
 * canicas metálicas. Todo procedural (sin assets, sin dependencias nuevas).
 * Escena con NoToneMapping (Canvas `flat`).
 * -----------------------------------------------------------------------------
 */

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/** Dibuja la jungla por capas en un canvas 2D (soft, premium). */
function paintJungle(W, H) {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')

  // --- Cielo (gradiente vertical con brillo de horizonte) ---
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0.0, '#123f30')
  sky.addColorStop(0.36, '#134a49')
  sky.addColorStop(0.62, '#0d2c28')
  sky.addColorStop(1.0, '#05130e')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  // --- Rayo de luz cálido desde arriba (atmósfera) ---
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const shaft = ctx.createRadialGradient(W * 0.5, -H * 0.08, 0, W * 0.5, H * 0.5, H * 0.72)
  shaft.addColorStop(0, 'rgba(255,224,150,0.12)')
  shaft.addColorStop(1, 'rgba(255,224,150,0)')
  ctx.fillStyle = shaft
  ctx.fillRect(0, 0, W, H)
  ctx.restore()

  // helper: silueta de dosel ondulado desde topY hasta abajo
  const canopy = (topY, amp, color, freqs, blur, rim) => {
    ctx.save()
    if (blur) ctx.filter = `blur(${blur}px)`
    ctx.beginPath()
    ctx.moveTo(0, H)
    ctx.lineTo(0, topY)
    for (let x = 0; x <= W; x += 6) {
      const y =
        topY -
        amp *
          (Math.sin(x * freqs[0] + freqs[3]) * 0.5 +
            Math.sin(x * freqs[1] + freqs[4]) * 0.3 +
            Math.sin(x * freqs[2] + freqs[5]) * 0.2 +
            0.7)
      ctx.lineTo(x, y)
    }
    ctx.lineTo(W, H)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
    ctx.restore()
    if (rim) {
      ctx.save()
      if (blur) ctx.filter = `blur(${Math.max(0, blur - 1)}px)`
      ctx.beginPath()
      for (let x = 0; x <= W; x += 6) {
        const y =
          topY -
          amp *
            (Math.sin(x * freqs[0] + freqs[3]) * 0.5 +
              Math.sin(x * freqs[1] + freqs[4]) * 0.3 +
              Math.sin(x * freqs[2] + freqs[5]) * 0.2 +
              0.7)
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.strokeStyle = rim
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.restore()
    }
  }

  // --- Cordillera lejana con niebla (baja, difusa) ---
  canopy(H * 0.46, H * 0.05, '#12433f', [0.006, 0.013, 0.03, 0.4, 1.7, 3.1], 5, null)
  // --- Dosel medio ---
  canopy(H * 0.56, H * 0.07, '#0b3327', [0.009, 0.02, 0.05, 1.1, 2.3, 0.7], 2, 'rgba(70,150,110,0.22)')
  // --- Matorral cercano (más oscuro) ---
  canopy(H * 0.82, H * 0.06, '#07190f', [0.012, 0.026, 0.06, 2.0, 0.9, 2.4], 1, null)

  // --- Frondas de primer plano (esquinas), muy suaves (desenfocadas) ---
  const leaf = (cx, cy, rx, ry, rot, col) => {
    ctx.save()
    ctx.filter = 'blur(9px)'
    ctx.translate(cx, cy)
    ctx.rotate(rot)
    ctx.beginPath()
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    ctx.fillStyle = col
    ctx.fill()
    ctx.restore()
  }
  const frondDark = 'rgba(3,14,10,0.92)'
  // esquina superior izquierda
  leaf(-20, -10, 190, 70, 0.5, frondDark)
  leaf(20, 40, 150, 55, 0.9, frondDark)
  // esquina superior derecha
  leaf(W + 20, -10, 190, 70, -0.5, frondDark)
  leaf(W - 20, 40, 150, 55, -0.9, frondDark)
  // esquinas inferiores (matojos)
  leaf(-10, H + 20, 200, 80, -0.4, frondDark)
  leaf(W + 10, H + 20, 200, 80, 0.4, frondDark)

  // --- Viñeta suave ---
  const vig = ctx.createRadialGradient(W * 0.5, H * 0.44, H * 0.28, W * 0.5, H * 0.5, H * 0.72)
  vig.addColorStop(0, 'rgba(2,8,5,0)')
  vig.addColorStop(1, 'rgba(2,8,5,0.62)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, W, H)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Telón pintado (plano grande detrás de todo). */
function JungleBackdrop() {
  const tex = useMemo(() => paintJungle(512, 896), [])
  return (
    <mesh position={[0, 0, -11]}>
      <planeGeometry args={[13.2, 23]} />
      <meshBasicMaterial map={tex} fog={false} depthWrite={false} />
    </mesh>
  )
}

/** envMap suave (gradiente equirectangular) para reflejos de los metales. */
function EnvLight() {
  const { scene } = useThree()
  useEffect(() => {
    const c = document.createElement('canvas')
    c.width = 16
    c.height = 64
    const ctx = c.getContext('2d')
    const g = ctx.createLinearGradient(0, 0, 0, 64)
    g.addColorStop(0.0, '#4d8f6e')
    g.addColorStop(0.5, '#164740')
    g.addColorStop(1.0, '#08120c')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 16, 64)
    const tex = new THREE.CanvasTexture(c)
    tex.mapping = THREE.EquirectangularReflectionMapping
    tex.colorSpace = THREE.SRGBColorSpace
    const prev = scene.environment
    scene.environment = tex
    return () => {
      scene.environment = prev
      tex.dispose()
    }
  }, [scene])
  return null
}

function Fireflies({ count = 20 }) {
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
        color="#a9ffd0"
        size={0.12}
        sizeAttenuation
        transparent
        opacity={0.65}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export default function Background3D() {
  return (
    <group>
      <JungleBackdrop />
      <EnvLight />

      {/* Iluminación estilo TREXoRoll (nocturna): hemisférica + sol cálido + contraluz frío.
          Un poco más clara para que las canicas metálicas se vean premium (no apagadas). */}
      <hemisphereLight args={['#cdeef0', '#2c3a1c', 0.68]} />
      <ambientLight intensity={0.32} />
      <directionalLight position={[4, 7, 6]} intensity={1.35} color="#fff2d0" />
      <directionalLight position={[-5, 3, -3]} intensity={0.5} color="#8ab6ff" />
      <pointLight position={[0, 3.5, 3]} intensity={0.4} color="#ffcf7a" />

      <Fireflies />
    </group>
  )
}
