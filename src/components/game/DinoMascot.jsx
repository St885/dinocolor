/**
 * DinoMascot.jsx
 * -----------------------------------------------------------------------------
 * Mascota 3D de DinoColor. Widget DOM autocontenido (incluye su propio <Canvas>
 * y bocadillo). Reemplazo directo del placeholder SVG (misma API: message/mood/size).
 *
 * Soporta VARIOS modelos con carga por PRIORIDAD + fallback:
 *   - <DinoMascot model="oliver" animation="idle" />  -> oliver_character.glb (principal,
 *     ~23 MB) -> oliver_master.glb (fallback, ~44 MB) -> dino_color_mascot.glb -> SVG.
 *   - <DinoMascot ... /> (sin model) -> T-Rexo (dino_color_mascot.glb) -> SVG.
 *   - También admite modelPath / fallbackModelPath explícitos.
 *
 * Normaliza automáticamente ESCALA y ENCUADRE por bounding-box (cualquier modelo
 * sale grande, centrado, con los pies apoyados y sin cortes). Resuelve el nombre
 * de animación de forma DIFUSA (p. ej. "idle" -> "Idle_02" en Oliver).
 *
 * SOLO usa `three` + `@react-three/fiber` (GLTFLoader y SkeletonUtils van dentro de
 * `three`, no son dependencias nuevas). Sin drei.
 *
 * Rutas runtime (servidas por Vite desde public/, respetando import.meta.env.BASE_URL):
 *   /assets/models/characters/oliver/oliver_character.glb     (principal temporal, ~23 MB)
 *   /assets/models/characters/oliver/oliver_master.glb        (fallback, mayor calidad, ~44 MB)
 *   /assets/models/characters/dino-mascot/dino_color_mascot.glb (fallback anterior)
 * -----------------------------------------------------------------------------
 */
import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import DinoMascotPlaceholder from './DinoMascotPlaceholder.jsx'

const BASE = import.meta.env.BASE_URL
const DINO_URL = `${BASE}assets/models/characters/dino-mascot/dino_color_mascot.glb`
const OLIVER_MASTER = `${BASE}assets/models/characters/oliver/oliver_master.glb`
const OLIVER_CHARACTER = `${BASE}assets/models/characters/oliver/oliver_character.glb`

/** Compatibilidad: sigue exportando la URL del dino (usada por preload). */
export const DINO_MODEL_URL = DINO_URL

/** Registro de modelos -> lista de URLs candidatas EN ORDEN DE PRIORIDAD. */
const MODELS = {
  trexo: [DINO_URL],
  // character (~23 MB, principal TEMPORAL por peso/rendimiento) -> master (~44 MB, mayor
  // calidad, fallback) -> dino anterior -> placeholder SVG.
  oliver: [OLIVER_CHARACTER, OLIVER_MASTER, DINO_URL],
}

export const DINO_ANIMATIONS = [
  'idle', 'wave', 'talk', 'celebrate', 'sad', 'point', 'surprised', 'dance',
]

/** Animaciones que se reproducen UNA vez (el resto van en bucle). */
const ONESHOT = new Set(['celebrate', 'sad', 'point', 'surprised', 'wave'])

const MOOD_ANIM = { happy: 'idle', cheer: 'dance', sad: 'sad' }

export const DINO_STATE_ANIM = {
  start: 'wave', menu: 'idle', tutorial: 'talk', hint: 'point',
  correct: 'celebrate', wrong: 'surprised', victory: 'dance', defeat: 'sad', results: 'dance',
}

/** ErrorBoundary: si el modelo falla al cargar, avisa al padre (para probar el siguiente). */
class ModelErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error) {
    if (this.props.onError) this.props.onError(error)
  }
  render() {
    return this.state.hasError ? null : this.props.children
  }
}

/**
 * Encuentra la mejor animación para un nombre pedido. `want` puede ser un string
 * o una LISTA de candidatos en orden de prioridad (p. ej. victoria:
 * ['Shake_It_Off_Dance','Jump_with_Arms_Open',...]). Estrategia:
 *   1) coincidencia exacta, respetando el orden de prioridad,
 *   2) coincidencia difusa (includes), respetando el orden,
 *   3) cualquier "idle", 4) la primera animación disponible.
 * Con modelos de 1 sola animación (p. ej. oliver_character.glb) siempre cae a
 * esa única clip de forma segura.
 */
function resolveClip(animations, want) {
  if (!animations || !animations.length) return null
  const list = (Array.isArray(want) ? want : [want]).filter(Boolean)
  const wants = list.length ? list : ['idle']
  for (const w of wants) {
    const exact = animations.find((a) => a.name === w)
    if (exact) return exact
  }
  for (const w of wants) {
    const lw = w.toLowerCase()
    const fuzzy = animations.find((a) => a.name.toLowerCase().includes(lw))
    if (fuzzy) return fuzzy
  }
  return animations.find((a) => a.name.toLowerCase().includes('idle')) || animations[0]
}

/**
 * Malla animada + NORMALIZADA (para meter dentro de un <Canvas>).
 * @param {string} url  URL del GLB a cargar
 * @param {string} clip nombre (difuso) de animación
 * @param {number} targetHeight altura objetivo del modelo en unidades de mundo
 */
export function DinoModel({ url, clip = 'idle', fade = 0.3, once, onFinished, targetHeight = 1.4 }) {
  const { scene, animations } = useLoader(GLTFLoader, url)
  const model = useMemo(() => cloneSkeleton(scene), [scene])
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model])

  // Normalizar: escala para que la altura sea targetHeight; pies en y=0; centrado x/z.
  const norm = useMemo(() => {
    model.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const s = size.y > 0.0001 ? targetHeight / size.y : 1
    return { s, pos: [-center.x * s, -box.min.y * s, -center.z * s] }
  }, [model, targetHeight])

  useFrame((_, dt) => mixer.update(dt))

  // Acción actual + clip reproducido: NO reiniciar si se pide el mismo clip resuelto
  // (modelos con 1 sola animación, p. ej. oliver_character.glb) y hacer crossfade
  // sólo cuando el clip cambia de verdad.
  const actionRef = useRef(null)
  const playedRef = useRef(null)
  useEffect(() => {
    const data = resolveClip(animations, clip)
    if (!data) return undefined
    if (playedRef.current === data.name) return undefined
    const name = data.name.toLowerCase()
    const loop = once === true ? false : once === false ? true : !ONESHOT.has(name)
    const next = mixer.clipAction(data)
    next.reset()
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity)
    next.clampWhenFinished = !loop
    next.fadeIn(fade).play()
    const prev = actionRef.current
    if (prev && prev !== next) prev.fadeOut(fade)
    actionRef.current = next
    playedRef.current = data.name
    return undefined
  }, [clip, animations, mixer, fade, once])

  useEffect(() => {
    if (!onFinished) return undefined
    const handler = (e) => onFinished(e.action.getClip().name)
    mixer.addEventListener('finished', handler)
    return () => mixer.removeEventListener('finished', handler)
  }, [mixer, onFinished])

  return (
    <group scale={norm.s} position={norm.pos}>
      <primitive object={model} />
    </group>
  )
}

/** Soporte con balanceo idle suave + posición/rotación base. */
function MascotRig({ children, baseY = -0.55, rotation = [0, 0, 0] }) {
  const ref = useRef()
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (!ref.current) return
    ref.current.position.y = baseY + Math.sin(t * 1.6) * 0.04
    ref.current.rotation.y = rotation[1] + Math.sin(t * 0.5) * 0.16
  })
  return (
    <group ref={ref} position={[0, baseY, 0]} rotation={rotation}>
      {children}
    </group>
  )
}

/** Prueba las URLs candidatas en orden; al fallar una, prueba la siguiente. */
function ModelWithFallback({ urls, onAllFailed, ...modelProps }) {
  const [idx, setIdx] = useState(0)
  const exhausted = idx >= urls.length
  useEffect(() => {
    if (exhausted && onAllFailed) onAllFailed()
  }, [exhausted, onAllFailed])
  if (exhausted) return null
  const url = urls[idx]
  return (
    <ModelErrorBoundary key={url} onError={() => setIdx((i) => i + 1)}>
      <Suspense fallback={null}>
        <MascotRig baseY={modelProps.baseY} rotation={modelProps.rotation}>
          <DinoModel
            url={url}
            clip={modelProps.clip}
            fade={modelProps.fade}
            once={modelProps.once}
            onFinished={modelProps.onFinished}
            targetHeight={modelProps.targetHeight}
          />
        </MascotRig>
      </Suspense>
    </ModelErrorBoundary>
  )
}

export default function DinoMascot({
  message,
  mood = 'happy',
  size = 150,
  animation,
  state,
  model,
  modelPath,
  fallbackModelPath,
  fade = 0.3,
  once,
  onFinished,
  cameraDistance = 2.8,
  cameraY = 0.55,
  targetHeight = 1.4,
  baseY = -0.55,
  rotation = [0, 0, 0],
  className = '',
}) {
  const [failed, setFailed] = useState(false)

  // Prioridad de animación: state > animation > mood
  const clip = (state && DINO_STATE_ANIM[state]) || animation || MOOD_ANIM[mood] || 'idle'

  // Lista de URLs candidatas (prioridad + fallback).
  const urls = useMemo(() => {
    if (modelPath) return [modelPath, fallbackModelPath, DINO_URL].filter(Boolean)
    if (model && MODELS[model]) return MODELS[model]
    return MODELS.trexo
  }, [model, modelPath, fallbackModelPath])

  // Si TODO falla, placeholder SVG (nunca pantalla en blanco).
  if (failed) {
    return <DinoMascotPlaceholder message={message} mood={mood} size={size} className={className} />
  }

  return (
    <div className={`mascot mascot--3d ${className}`} style={{ '--mascot-size': `${size}px` }}>
      {message && <div className={`mascot-bubble mascot-bubble--${mood}`}>{message}</div>}
      <div className="mascot-canvas" style={{ width: `${size}px`, height: `${size}px` }}>
        <Canvas
          flat
          camera={{ position: [0, cameraY, cameraDistance], fov: 30 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
        >
          {/* Iluminación cartoon (NoToneMapping): clave cálida + relleno frío + contraluz. */}
          <ambientLight intensity={0.72} />
          <hemisphereLight args={['#ffffff', '#0c2c20', 0.5]} />
          <directionalLight position={[3, 5, 5]} intensity={1.55} color="#fff3df" />
          <directionalLight position={[-4, 2, 1]} intensity={0.5} color="#bfe9ff" />
          <directionalLight position={[0, 3.2, -5]} intensity={0.85} color="#54ff9d" />

          {/* Sombra de contacto bajo los pies (grounding premium) */}
          <mesh position={[0, baseY - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.62, 32]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.22} depthWrite={false} />
          </mesh>

          <ModelWithFallback
            urls={urls}
            clip={clip}
            fade={fade}
            once={once}
            onFinished={onFinished}
            targetHeight={targetHeight}
            baseY={baseY}
            rotation={rotation}
            onAllFailed={() => setFailed(true)}
          />
        </Canvas>
      </div>
    </div>
  )
}

// Precarga del dino (ligero). NO se precarga Oliver por su gran tamaño; se carga
// solo cuando la escena que lo usa se monta.
useLoader.preload(GLTFLoader, DINO_URL)
