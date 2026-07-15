/**
 * DinoMascot.jsx
 * -----------------------------------------------------------------------------
 * Mascota 3D de DinoColor. Widget DOM autocontenido (incluye su propio <Canvas>
 * y bocadillo). Reemplazo directo del placeholder SVG (misma API: message/mood/size).
 *
 * MODELO PRINCIPAL — T-Rexo: `dino_color_mascot.glb` (0,9 MB, 8 clips).
 *   Sus clips se llaman EXACTAMENTE como los estados que usa el juego
 *   (idle, wave, talk, celebrate, sad, point, surprised, dance), así que los estados
 *   de ánimo funcionan de verdad, sin resolución difusa ni sustituciones.
 *
 * Historial (importante, no revertir sin medir):
 *   Se probaron los modelos "Oliver" como mascota principal y salió MUY caro:
 *     - oliver_character.glb  ~22 MB … y solo 1 clip ("Armature|clip0|baselayer"),
 *       así que las animaciones de victoria/derrota NUNCA se reproducían: todas
 *       caían al mismo clip.
 *     - oliver_master.glb     ~44 MB … 11 clips; lo cargaba el acompañante del juego.
 *   Total: ~66 MB de GLB solo para jugar una partida. T-Rexo hace lo mismo (y mejor)
 *   con 0,9 MB. Se mantiene el registro `oliver` para poder usarlos como skin premium
 *   cuando estén comprimidos (<5 MB con Draco/KTX2). Ver docs/TECHNICAL_NOTES.md.
 *
 * SOLO usa `three` + `@react-three/fiber` (GLTFLoader y SkeletonUtils van dentro de
 * `three`, no son dependencias nuevas). Sin drei.
 * -----------------------------------------------------------------------------
 */
import { Component, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import DinoMascotPlaceholder from './DinoMascotPlaceholder.jsx'

const BASE = import.meta.env.BASE_URL
const DINO_URL = `${BASE}assets/models/characters/dino-mascot/dino_color_mascot.glb`
const OLIVER_MASTER = `${BASE}assets/models/characters/oliver/oliver_master.glb`
const OLIVER_CHARACTER = `${BASE}assets/models/characters/oliver/oliver_character.glb`

/** Compatibilidad: sigue exportando la URL del modelo principal (usada por preload). */
export const DINO_MODEL_URL = DINO_URL

/**
 * Registro de modelos -> URLs candidatas EN ORDEN DE PRIORIDAD.
 * `trexo` es el único que piden las escenas. `oliver` sigue disponible (skin premium)
 * pero NINGUNA escena lo usa: así sus ~66 MB no se descargan nunca.
 */
const MODELS = {
  trexo: [DINO_URL],
  oliver: [OLIVER_CHARACTER, OLIVER_MASTER, DINO_URL],
}

/** Clips REALES de dino_color_mascot.glb (verificados sobre el GLB, no inventados). */
export const DINO_ANIMATIONS = [
  'idle', 'wave', 'talk', 'celebrate', 'sad', 'point', 'surprised', 'dance',
]

/**
 * ⚠️ CLIPS SEGUROS — LEE ESTO ANTES DE AMPLIAR LA LISTA.
 *
 * El GLB trae 8 clips, pero SOLO `idle` deforma bien la malla. Los demás la ROMPEN:
 * al reproducir `wave` la placa del vientre y la boca se DESPEGAN del cuerpo y flotan;
 * con `celebrate` el vientre se desgarra; con `sad` la cabeza colapsa en una bola sin
 * cara. (Comprobado renderizando cada clip y mirando el resultado.)
 *
 * No es un bug de este componente. El GLB está bien formado: las 14 primitivas tienen
 * JOINTS_0/WEIGHTS_0, ningún vértice queda sin peso y las traslaciones solo mueven el
 * hueso raíz (`hips`), como debe ser. El fallo está en los PESOS DE SKINNING: hay
 * vértices asignados al hueso equivocado (la placa del vientre está pegada a los huesos
 * de los brazos, por ejemplo). Con `idle` no se nota porque la pose apenas se separa de
 * la de reposo; en cuanto un clip mueve mucho un miembro, la malla se abre.
 *
 * ARREGLO REAL: repintar pesos en Blender. El .blend está en
 * `assets/models/characters/dino-mascot/dino_color_mascot.blend`. Cuando esté corregido,
 * añade aquí los clips ya validados (uno a uno, mirándolos) y el juego los usará solo.
 *
 * Mientras tanto NO reproducimos clips rotos: la mascota se queda en `idle` (que se ve
 * perfecta) y la emoción se transmite moviendo el MODELO ENTERO como un objeto rígido
 * (saltar de alegría, quedarse cabizbajo) — ver POSES/MascotRig. Eso es incapaz de
 * romper el skinning porque no toca el esqueleto.
 */
const SAFE_CLIPS = new Set(['idle'])

/** Animaciones que se reproducen UNA vez (el resto van en bucle). */
const ONESHOT = new Set(['celebrate', 'point', 'surprised', 'wave'])

const MOOD_ANIM = { happy: 'idle', cheer: 'dance', sad: 'sad' }

/** Lenguaje corporal por estado de ánimo (esto SÍ funciona: no toca el esqueleto). */
const MOOD_POSE = { happy: 'idle', cheer: 'cheer', sad: 'sad' }

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
 * Encuentra la mejor animación para un nombre pedido. `want` puede ser un string o una
 * LISTA de candidatos en orden de prioridad. Estrategia: 1) exacta respetando el orden,
 * 2) difusa (includes) respetando el orden, 3) cualquier "idle", 4) la primera.
 *
 * Antes de nada descarta los clips que NO están en SAFE_CLIPS (ver la nota de arriba):
 * más vale una mascota tranquila que una mascota rota. Si el modelo cargado no tiene
 * ningún clip seguro (p. ej. un GLB distinto), se acepta lo que haya en vez de dejarla
 * congelada.
 */
function resolveClip(animations, want) {
  if (!animations || !animations.length) return null
  const safe = animations.filter((a) => SAFE_CLIPS.has(a.name.toLowerCase()))
  const pool = safe.length ? safe : animations

  const list = (Array.isArray(want) ? want : [want]).filter(Boolean)
  const wants = list.length ? list : ['idle']
  for (const w of wants) {
    const exact = pool.find((a) => a.name === w)
    if (exact) return exact
  }
  for (const w of wants) {
    const lw = w.toLowerCase()
    const fuzzy = pool.find((a) => a.name.toLowerCase().includes(lw))
    if (fuzzy) return fuzzy
  }
  return pool.find((a) => a.name.toLowerCase().includes('idle')) || pool[0]
}

/**
 * Malla animada + NORMALIZADA (escala por bounding-box: cualquier modelo sale
 * centrado, con los pies apoyados y sin cortes).
 */
export function DinoModel({
  url,
  clip = 'idle',
  fade = 0.3,
  once,
  onFinished,
  onReady,
  targetHeight = 1.4,
}) {
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

  // Este componente solo se renderiza cuando useLoader YA resolvió el GLB: es el
  // instante exacto en que el modelo está listo y podemos retirar el indicador de carga.
  useEffect(() => {
    onReady && onReady()
  }, [onReady])

  // Soltar la copia del esqueleto y el mixer al desmontar (evita fugas al ir y venir
  // entre escenas). La geometría/material ORIGINALES viven en la caché de useLoader y
  // se reutilizan en el siguiente montaje, por eso no se tocan aquí.
  useEffect(() => {
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(model)
    }
  }, [mixer, model])

  // El callback puede cambiar de identidad en cada render del padre: lo guardamos en
  // una ref para no re-suscribir el listener del mixer en cada render.
  const finishedRef = useRef(onFinished)
  useEffect(() => {
    finishedRef.current = onFinished
  }, [onFinished])

  useEffect(() => {
    const handler = (e) => finishedRef.current && finishedRef.current(e.action.getClip().name)
    mixer.addEventListener('finished', handler)
    return () => mixer.removeEventListener('finished', handler)
  }, [mixer])

  // Acción actual + clip reproducido: NO reiniciar si se pide el mismo clip resuelto,
  // y hacer crossfade solo cuando el clip cambia de verdad.
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

  return (
    <group scale={norm.s} position={norm.pos}>
      <primitive object={model} />
    </group>
  )
}

/**
 * Soporte de la mascota: la mueve como un OBJETO RÍGIDO (posición, rotación, escala del
 * grupo). Aquí vive todo el lenguaje corporal de T-Rexo.
 *
 * Es a propósito: los clips expresivos del GLB rompen la malla (ver SAFE_CLIPS), pero
 * mover el modelo entero no puede romper nada — no toca huesos ni pesos. Un salto de
 * alegría bien temporizado transmite más que una animación de esqueleto rota.
 *
 * Poses:
 *   idle  — respira y se balancea suave (por defecto)
 *   greet — saludo: se inclina hacia el jugador y se balancea con ganas
 *   cheer — celebración: SALTA, gira y da un botecito al aterrizar
 *   sad   — derrota: hunde los hombros, se inclina hacia delante y suspira despacio
 */
const POSES = {
  idle: (t, r) => ({
    y: Math.sin(t * 1.6) * 0.04,
    rx: 0,
    ry: r + Math.sin(t * 0.5) * 0.16,
    rz: 0,
    s: 1,
  }),
  greet: (t, r) => ({
    y: Math.sin(t * 1.9) * 0.05,
    rx: -0.05,
    ry: r + Math.sin(t * 0.7) * 0.26,
    rz: Math.sin(t * 1.9) * 0.04,
    s: 1,
  }),
  cheer: (t, r) => {
    // Salto con rebote: |sin| da la parábola del salto; la escala hace el "squash".
    const hop = Math.abs(Math.sin(t * 2.6))
    const air = Math.pow(hop, 0.7)
    return {
      y: air * 0.22,
      rx: -0.06 * air,
      ry: r + Math.sin(t * 1.7) * 0.42,
      rz: Math.sin(t * 5.2) * 0.07,
      s: 1 + (1 - air) * 0.05 - air * 0.02, // achatado al caer, estirado en el aire
    }
  },
  sad: (t, r) => ({
    y: -0.05 + Math.sin(t * 0.85) * 0.016, // hundido y respirando despacio
    rx: 0.16, // cabizbajo
    ry: r + Math.sin(t * 0.35) * 0.07,
    rz: Math.sin(t * 0.5) * 0.03,
    s: 0.97,
  }),
}

function MascotRig({ children, baseY = -0.55, rotation = [0, 0, 0], pose = 'idle' }) {
  const ref = useRef()
  useFrame((state) => {
    const g = ref.current
    if (!g) return
    const t = state.clock.elapsedTime
    const fn = POSES[pose] || POSES.idle
    const p = fn(t, rotation[1] || 0)
    g.position.y = baseY + p.y
    g.rotation.x = (rotation[0] || 0) + p.rx
    g.rotation.y = p.ry
    g.rotation.z = (rotation[2] || 0) + p.rz
    g.scale.setScalar(p.s)
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
        <MascotRig baseY={modelProps.baseY} rotation={modelProps.rotation} pose={modelProps.pose}>
          <DinoModel
            url={url}
            clip={modelProps.clip}
            fade={modelProps.fade}
            once={modelProps.once}
            onFinished={modelProps.onFinished}
            onReady={modelProps.onReady}
            targetHeight={modelProps.targetHeight}
          />
        </MascotRig>
      </Suspense>
    </ModelErrorBoundary>
  )
}

function DinoMascot({
  message,
  mood = 'happy',
  size = 150,
  animation,
  state,
  pose, // 'idle' | 'greet' | 'cheer' | 'sad'  (si no se pasa, se deduce del mood)
  model = 'trexo',
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
  quality = 'high', // 'high' (héroe/resultado) | 'low' (acompañante del HUD)
  className = '',
}) {
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)

  // Prioridad de animación: state > animation > mood.
  // Ojo: resolveClip descarta después los clips que rompen la malla (ver SAFE_CLIPS),
  // así que en la práctica hoy siempre acaba en `idle`. La API no cambia: el día que
  // se repinten los pesos en Blender, esto empieza a funcionar solo.
  const clip = (state && DINO_STATE_ANIM[state]) || animation || MOOD_ANIM[mood] || 'idle'

  // El lenguaje corporal SÍ responde al mood hoy mismo (mueve el modelo entero).
  const bodyPose = pose || MOOD_POSE[mood] || 'idle'

  // Lista de URLs candidatas (prioridad + fallback).
  const urls = useMemo(() => {
    if (modelPath) return [modelPath, fallbackModelPath, DINO_URL].filter(Boolean)
    if (model && MODELS[model]) return MODELS[model]
    return MODELS.trexo
  }, [model, modelPath, fallbackModelPath])

  const handleReady = useCallback(() => setReady(true), [])
  const handleAllFailed = useCallback(() => setFailed(true), [])

  // Si TODO falla, placeholder SVG (nunca pantalla en blanco).
  if (failed) {
    return <DinoMascotPlaceholder message={message} mood={mood} size={size} className={className} />
  }

  // El acompañante del HUD es diminuto: no necesita antialias ni 2x de DPR. Ahorrar
  // ahí importa porque en GameScene conviven DOS contextos WebGL.
  const low = quality === 'low'

  return (
    <div className={`mascot mascot--3d ${className}`} style={{ '--mascot-size': `${size}px` }}>
      {message && <div className={`mascot-bubble mascot-bubble--${mood}`}>{message}</div>}
      {/* El tamaño lo aplica el CSS a partir de --mascot-size, así una clase (p. ej.
          .mascot--hero) puede hacerlo responsive con clamp() sin tocar el JS. */}
      <div className={`mascot-canvas ${ready ? 'is-ready' : 'is-loading'}`}>
        {/* Indicador de carga: antes el hueco quedaba VACÍO hasta que llegaba el GLB. */}
        {!ready && (
          <span className="mascot-loader" role="status" aria-label="Cargando a T-Rexo">
            <i />
            <i />
            <i />
          </span>
        )}
        <Canvas
          flat
          camera={{ position: [0, cameraY, cameraDistance], fov: 30 }}
          dpr={low ? [1, 1.5] : [1, 2]}
          gl={{
            antialias: !low,
            alpha: true,
            powerPreference: low ? 'low-power' : 'high-performance',
          }}
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
            pose={bodyPose}
            fade={fade}
            once={once}
            onFinished={onFinished}
            onReady={handleReady}
            targetHeight={targetHeight}
            baseY={baseY}
            rotation={rotation}
            onAllFailed={handleAllFailed}
          />
        </Canvas>
      </div>
    </div>
  )
}

/**
 * memo: en GameScene la mascota vive en un árbol que se re-renderiza con cada acierto
 * y cada segundo. Sin memo, cada render del padre recorría de nuevo todo el <Canvas>.
 */
export default memo(DinoMascot)

// Precarga del modelo principal (0,9 MB): al llegar a StartScene ya está listo.
// NO se precarga Oliver (~66 MB): ninguna escena lo pide.
useLoader.preload(GLTFLoader, DINO_URL)
