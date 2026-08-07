/**
 * Ball3D.jsx
 * -----------------------------------------------------------------------------
 * Pelota del tablero, look "canica metálica pulida":
 *   - Inactiva: gris azulado metálico con reflejos suaves (envMap de la escena) y
 *     sombra de contacto.
 *   - Activa: cuerpo brillante del color del nivel + GLOW CIRCULAR suave detrás
 *     (disco de degradado radial, sin aros duros) + pulso + anillo de foco giratorio.
 *   - Feedback al pulsar: disco de destello + chispas + ONDA EXPANSIVA
 *     (color del nivel = acierto, naranja = fallo).
 *
 * EFECTOS POR FAMILIA DE COLOR (v0.6.3): cuántas chispas salen, a qué velocidad,
 * si giran en espiral y cuánto se abre la onda lo decide `src/data/hitEffects.js`
 * a partir del color del nivel. El COLOR no se toca: es información de juego.
 * Las tablas de direcciones se precalculan por familia a nivel de módulo, así que
 * un estallido no reserva memoria ni recorre nada que no vaya a dibujar.
 *
 * RENDIMIENTO:
 *
 *  1) SIN pointLight por pelota. Antes cada pelota activa montaba un <pointLight>, así
 *     que el número de luces de la escena bailaba entre 0 y 4 varias veces por segundo.
 *     Coste real (MEDIDO, no supuesto): en el nivel 12 (4 pelotas activas a la vez) el
 *     frame pasa de 35,5 ms a 34,1 ms de media — un ~4 % más rápido. Modesto pero
 *     gratis: el foco lo dan la emisión del material y los sprites aditivos, que ya
 *     estaban, y visualmente queda igual o mejor.
 *
 *     Nota para quien venga después: es tentador escribir aquí que cambiar el número de
 *     luces "recompila todos los shaders en cada activación". Se comprobó contando las
 *     llamadas a compileShader/linkProgram y NO es cierto: Three.js cachea un programa
 *     por cada recuento de luces, así que alternar 0↔1↔4 reutiliza programas ya
 *     compilados (0 recompilaciones en régimen, con y sin pointLight). Lo que sí ahorra
 *     quitarlas es coste de sombreado por píxel y variantes de programa que compilar la
 *     primera vez.
 *
 *  2) Geometrías COMPARTIDAS a nivel de módulo: antes cada una de las 9 pelotas creaba
 *     su propia esfera y sus planos; ahora todas apuntan a la misma geometría.
 *
 * Toda la animación va en useFrame (cero renders de React por frame).
 * -----------------------------------------------------------------------------
 */

import { memo, useCallback, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FAMILY_DIRS, MAX_PARTICLES, familyForColor } from '../../data/hitEffects.js'

const IDLE_COLOR = new THREE.Color('#b3c2d0') // gris azulado metálico (premium)
const BLACK = new THREE.Color('#000000')
const MISS_COLOR = new THREE.Color('#ff8a3d')

// --- Recursos COMPARTIDOS por todas las pelotas (se crean una sola vez) -------

// 32x24 en vez de 40x40: a este tamaño en pantalla es indistinguible y baja de
// ~3.200 a ~1.500 triángulos por pelota (por 9 pelotas en el tablero más grande).
const SPHERE_GEOM = new THREE.SphereGeometry(1, 32, 24)
const PLANE_GEOM = new THREE.PlaneGeometry(1, 1)
const SHADOW_GEOM = new THREE.CircleGeometry(1, 24)
const RING_GEOM = new THREE.RingGeometry(0.86, 1, 40)

// Textura de glow radial (blanco al centro -> transparente). Una sola para todas.
let _glowTex = null
function glowTexture() {
  if (_glowTex || typeof document === 'undefined') return _glowTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  // Centro NO totalmente saturado + caída suave => halo limpio (no "quemado").
  g.addColorStop(0, 'rgba(255,255,255,0.88)')
  g.addColorStop(0.3, 'rgba(255,255,255,0.4)')
  g.addColorStop(0.62, 'rgba(255,255,255,0.12)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  _glowTex = new THREE.CanvasTexture(c)
  _glowTex.colorSpace = THREE.SRGBColorSpace
  return _glowTex
}

// El buffer se dimensiona al TOPE de todas las familias y cada una usa solo sus
// primeras N posiciones: así cambiar de nivel (y de familia) no recrea geometría.
// Las que sobran se aparcan lejos de cámara en vez de dibujarse encima.
const PART_N = MAX_PARTICLES

function Ball3D({ id, position, active, color = '#39ff88', radius = 0.52, onTap }) {
  // Perfil de efecto del color actual. Memoizado por color: cambia una vez por
  // nivel, no por frame ni por acierto.
  const fx = useMemo(() => familyForColor(color), [color])
  const dirs = useMemo(() => FAMILY_DIRS[fx.id], [fx])
  const meshRef = useRef()
  const matRef = useRef()
  const glowRef = useRef()
  const haloRef = useRef()
  const ringRef = useRef()
  const burstRef = useRef()
  const shockRef = useRef()
  const pressRef = useRef(0)
  const burst0 = useRef(0)
  const shock0 = useRef(0)
  const tex = useMemo(() => glowTexture(), [])

  const { emissiveColor, baseColor } = useMemo(() => {
    const c = new THREE.Color(color)
    // Esfera activa claramente coloreada (no oscura): el cuerpo ya "lee" como objetivo.
    return { emissiveColor: c.clone(), baseColor: c.clone().multiplyScalar(0.72) }
  }, [color])

  // Buffer de chispas: propio de cada pelota (posiciones distintas), pero creado una
  // sola vez por pelota, nunca por frame.
  const partPos = useMemo(() => new Float32Array(PART_N * 3), [])
  const partGeom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(partPos, 3))
    return g
  }, [partPos])
  const partRef = useRef()
  const part0 = useRef(0)

  // Marca de "en reposo": una pelota apagada que ya terminó de apagarse no tiene nada
  // que animar, pero seguía ejecutando su lerp de color, cuatro interpolaciones de
  // opacidad y dos bucles de partículas 60 veces por segundo. En el tablero grande son
  // NUEVE pelotas y, en los niveles fáciles, ocho de ellas están apagadas todo el rato.
  // Cuando todo ha convergido, el callback sale en la primera línea.
  const idleRef = useRef(false)

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const mesh = meshRef.current
    const mat = matRef.current
    if (!mesh || !mat) return

    if (
      !active &&
      idleRef.current &&
      pressRef.current <= 0 &&
      burst0.current <= 0 &&
      part0.current <= 0 &&
      shock0.current <= 0
    ) {
      return
    }

    const k = Math.min(1, delta * 9)
    const wob = (Math.sin(t * 6) + 1) / 2

    const pulse = active ? 1 + wob * 0.05 : 1
    const press = (pressRef.current = Math.max(0, pressRef.current - delta * 4.5))
    mesh.scale.setScalar(radius * pulse * (1 - press * 0.16))

    // Color/emisión controlada. Al no haber pointLight, la emisión es LA fuente de
    // "luz" de la pelota activa: se sube un poco respecto a antes para compensar.
    mat.color.lerp(active ? baseColor : IDLE_COLOR, k)
    mat.emissive.lerp(active ? emissiveColor : BLACK, k)
    const targetEmissive = active ? 0.62 + wob * 0.2 : 0
    mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * k

    // Glow circular detrás de la pelota activa (halo limpio).
    const glow = glowRef.current
    if (glow) {
      const target = active ? 0.78 + wob * 0.1 : 0
      glow.material.opacity += (target - glow.material.opacity) * k
      glow.visible = glow.material.opacity > 0.02
      const s = radius * (3.15 + (active ? wob * 0.16 : 0))
      glow.scale.set(s, s, s)
    }

    // Aura exterior amplia y muy suave (profundidad premium, sin saturar).
    const halo = haloRef.current
    if (halo) {
      const target = active ? 0.34 + wob * 0.06 : 0
      halo.material.opacity += (target - halo.material.opacity) * k
      halo.visible = halo.material.opacity > 0.02
      const s = radius * (4.7 + (active ? wob * 0.2 : 0))
      halo.scale.set(s, s, s)
    }

    // Anillo de foco que respira alrededor de la pelota activa: refuerza "PÚLSAME"
    // sin depender de una luz real, y hace legible el objetivo también para quien
    // distingue mal los colores (cambia la FORMA, no solo el tono).
    const ring = ringRef.current
    if (ring) {
      const target = active ? 0.5 + wob * 0.22 : 0
      ring.material.opacity += (target - ring.material.opacity) * k
      ring.visible = ring.material.opacity > 0.02
      const s = radius * (1.72 + (active ? wob * 0.22 : 0))
      ring.scale.set(s, s, s)
      ring.rotation.z = t * 0.6
    }

    // Disco de destello al pulsar (expande y desvanece).
    const burst = burstRef.current
    if (burst) {
      const p = (burst0.current = Math.max(0, burst0.current - delta * 2.6))
      if (p > 0) {
        const s = radius * (fx.burst + (1 - p) * 2.4)
        burst.scale.set(s, s, s)
        burst.material.opacity = p * 0.8
        burst.visible = true
      } else if (burst.visible) {
        burst.visible = false
      }
    }

    // ONDA EXPANSIVA: un anillo que se abre y se desvanece. Es lo que separa de un
    // vistazo una familia de otra (el cian abre mucho y despacio; la brasa, poco y
    // rápido). Reutiliza la geometría de anillo COMPARTIDA: cero coste de memoria.
    const shock = shockRef.current
    if (shock) {
      const p = (shock0.current = Math.max(0, shock0.current - delta * fx.shockDecay))
      if (p > 0) {
        const s = radius * (1.3 + (1 - p) * fx.shock)
        shock.scale.set(s, s, s)
        // Se desvanece con el cuadrado: arranca marcada y se va rápido al final,
        // que es como se lee una onda de verdad.
        shock.material.opacity = p * p * 0.7
        shock.visible = true
      } else if (shock.visible) {
        shock.visible = false
      }
    }

    // Chispas al pulsar.
    const parts = partRef.current
    if (parts) {
      const p = (part0.current = Math.max(0, part0.current - delta * fx.decay))
      if (p > 0) {
        const spread = radius * fx.spread * (1 - p)
        const n = dirs.length
        // Espiral: las chispas de la familia "magic" giran mientras se alejan.
        const rot = fx.swirl ? (1 - p) * fx.swirl : 0
        const cos = rot ? Math.cos(rot) : 1
        const sin = rot ? Math.sin(rot) : 0
        for (let i = 0; i < n; i++) {
          const d = dirs[i]
          const dx = rot ? d[0] * cos - d[1] * sin : d[0]
          const dy = rot ? d[0] * sin + d[1] * cos : d[1]
          partPos[i * 3] = dx * spread
          partPos[i * 3 + 1] = dy * spread
          partPos[i * 3 + 2] = d[2] * spread
        }
        // Las posiciones que esta familia no usa se aparcan detrás de la cámara
        // en vez de quedarse donde las dejó la familia anterior.
        for (let i = n; i < PART_N; i++) partPos[i * 3 + 2] = -9999
        parts.geometry.attributes.position.needsUpdate = true
        parts.material.opacity = p
        parts.material.size = radius * (fx.size * 0.8 + p * fx.size * 0.7)
        parts.visible = true
      } else if (parts.visible) {
        parts.visible = false
      }
    }

    // ¿Ya ha convergido todo el apagado? Entonces se fija el estado EXACTO de reposo
    // (los lerps son asintóticos: si nos limitáramos a dejar de animar, la pelota se
    // quedaría con un tinte residual del color del nivel) y se marca para saltar los
    // próximos frames. Cualquier activación o toque vuelve a despertarla.
    if (!active && mat.emissiveIntensity < 0.004 && pressRef.current <= 0) {
      mat.color.copy(IDLE_COLOR)
      mat.emissive.copy(BLACK)
      mat.emissiveIntensity = 0
      mesh.scale.setScalar(radius)
      idleRef.current = true
    } else if (active) {
      idleRef.current = false
    }
  })

  const handleDown = useCallback(
    (e) => {
      e.stopPropagation()
      pressRef.current = 1
      burst0.current = 1
      part0.current = 1
      shock0.current = 1
      const tint = active ? emissiveColor : MISS_COLOR
      if (burstRef.current) burstRef.current.material.color.copy(tint)
      if (partRef.current) partRef.current.material.color.copy(tint)
      if (shockRef.current) shockRef.current.material.color.copy(tint)
      // La POSICIÓN EN PANTALLA del toque viaja con el evento: es lo que permite
      // que el "+100" salga justo encima de la pelota tocada sin que nadie tenga
      // que proyectar coordenadas 3D a 2D por su cuenta.
      onTap && onTap(id, { x: e.clientX, y: e.clientY })
    },
    [active, emissiveColor, onTap, id],
  )

  return (
    <group position={position}>
      {/* Sombra de contacto */}
      <mesh
        geometry={SHADOW_GEOM}
        position={[0, -radius * 0.98, -0.7]}
        scale={[radius * 1.0, radius * 0.34, 1]}
      >
        <meshBasicMaterial color="#05100a" transparent opacity={0.34} depthWrite={false} />
      </mesh>

      {/* Aura exterior amplia y suave (detrás del todo) */}
      <mesh ref={haloRef} geometry={PLANE_GEOM} position={[0, 0, -0.18]} visible={false}>
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

      {/* Glow circular (detrás) */}
      <mesh ref={glowRef} geometry={PLANE_GEOM} position={[0, 0, -0.12]} visible={false}>
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

      {/* Anillo de foco (gira despacio alrededor de la pelota activa) */}
      <mesh ref={ringRef} geometry={RING_GEOM} position={[0, 0, -0.06]} visible={false}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Destello de toque (delante) */}
      <mesh ref={burstRef} geometry={PLANE_GEOM} position={[0, 0, 0.5]} visible={false}>
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

      {/* Onda expansiva del toque (anillo que se abre) */}
      <mesh ref={shockRef} geometry={RING_GEOM} position={[0, 0, 0.45]} visible={false}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Chispas al pulsar — con sprite radial (redondas, no cuadradas) */}
      <points ref={partRef} geometry={partGeom} position={[0, 0, 0.55]} visible={false}>
        <pointsMaterial
          map={tex}
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

      {/* Esfera metálica (geometría de radio 1 compartida; el radio real va en la escala) */}
      <mesh ref={meshRef} geometry={SPHERE_GEOM} scale={radius} onPointerDown={handleDown}>
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
    </group>
  )
}

/**
 * memo: sin esto las 9 pelotas se re-renderizaban con CADA cambio de puntuación y
 * CADA segundo del cronómetro. Ahora una pelota solo se re-renderiza si cambia su
 * propio `active` (o el color del nivel).
 */
export default memo(Ball3D)
