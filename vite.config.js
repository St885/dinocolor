import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Inyecta una Content-Security-Policy como <meta> SOLO en el build de producción.
 * Por qué solo en build: en dev, Vite sirve scripts inline (HMR/react-refresh) que una
 * CSP con `script-src 'self'` bloquearía, rompiendo `npm run dev`. El build no tiene
 * scripts inline (Vite emite módulos externos con hash), así que la CSP no rompe nada
 * — validado sirviendo el build y recorriendo el juego con 0 violaciones en consola.
 *
 * `style-src 'unsafe-inline'` es necesario por los estilos en línea de React
 * (p. ej. `style={{ width }}`, `--mascot-size`). `script-src 'self'` (sin unsafe-*) es
 * la protección importante: bloquea scripts inyectados/de terceros.
 *
 * Desde 2026-08-01 la CSP se CALCULA a partir del entorno (ver `buildCsp`): si el
 * build lleva configuración de Firebase, se abren los orígenes justos que necesita
 * el acceso con cuenta; si no, se queda tan cerrada como estaba.
 *
 * X-Content-Type-Options, Referrer-Policy (cabecera) y Permissions-Policy son cabeceras
 * HTTP: GitHub Pages no permite configurarlas → van documentadas en docs/SECURITY.md.
 */
/**
 * Orígenes que Firebase Auth necesita, y SOLO ellos:
 *   - identitytoolkit / securetoken: la API REST de Auth (login, refresco de token).
 *   - <authDomain> y accounts.google.com / appleid.apple.com: el iframe y la
 *     ventana emergente donde el usuario se identifica.
 *
 * Se añaden únicamente si el build tiene configuración de Firebase. Sin `.env`,
 * la CSP queda EXACTAMENTE igual de estricta que antes de existir el login: no
 * se abre ni un origen "por si acaso". Esa es la razón de que esto se calcule
 * aquí y no sea una constante fija.
 */
function buildCsp(env) {
  const authDomain = (env.VITE_FIREBASE_AUTH_DOMAIN || '').trim()
  const hasFirebase = Boolean(
    (env.VITE_FIREBASE_API_KEY || '').trim() && authDomain &&
      (env.VITE_FIREBASE_PROJECT_ID || '').trim() && (env.VITE_FIREBASE_APP_ID || '').trim(),
  )

  // `blob:` en connect-src — IMPRESCINDIBLE PARA QUE LA MASCOTA TENGA COLOR.
  // GLTFLoader mete las texturas embebidas del GLB en un Blob y, cuando el
  // navegador soporta `createImageBitmap` (todos los actuales), las carga con
  // ImageBitmapLoader… que por dentro usa `fetch()`. Un fetch NO lo gobierna
  // `img-src` sino `connect-src`, así que con `connect-src 'self'` las texturas
  // se quedaban fuera y el dinosaurio salía GRIS, como una figura de barro.
  // Medido con CDP el 2026-08-01: `fetch(blob:…)` → "Failed to fetch".
  // Se deja también en `img-src` porque three.js cae a `new Image()` en los
  // navegadores sin createImageBitmap, y ese camino sí lo gobierna `img-src`.
  // Son blobs del propio documento: no habilita ningún origen externo.
  const connect = ["'self'", 'blob:']
  const frame = []
  const script = ["'self'"]
  if (hasFirebase) {
    connect.push(
      'https://identitytoolkit.googleapis.com',
      'https://securetoken.googleapis.com',
      `https://${authDomain}`,
    )
    // El popup/iframe de acceso vive en el authDomain; Google y Apple pintan ahí
    // sus propias pantallas.
    frame.push(
      `https://${authDomain}`,
      'https://accounts.google.com',
      'https://appleid.apple.com',
    )
    // `apis.google.com` en script-src — SIN ESTO NO HAY LOGIN CON GOOGLE.
    // `signInWithPopup` no abre la ventana de Google directamente: primero carga
    // el ayudante `https://apis.google.com/js/api.js` (gapi), que es quien monta
    // el iframe oculto contra `<authDomain>/__/auth/iframe` y hace de puente con
    // la ventana emergente. Con `script-src 'self'` el navegador lo bloquea y el
    // botón no llega ni a abrir el popup:
    //   "Loading the script 'https://apis.google.com/js/api.js' violates the
    //    Content Security Policy directive: script-src 'self'"
    // Medido con CDP el 2026-08-07. Solo se abre este origen: NO hacen falta
    // `www.gstatic.com` ni `www.google.com` (los usa reCAPTCHA, que es del
    // acceso por telefono, y aqui no se usa).
    script.push('https://apis.google.com')
  }

  const directives = [
    "default-src 'self'",
    `script-src ${script.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    // `blob:` NO es decorativo: GLTFLoader guarda las texturas EMBEBIDAS del GLB
    // en un Blob y las carga como `blob:<origen>/<uuid>`. Sin esto, Chrome las
    // bloquea y la mascota sale GRIS, sin textura — y solo en producción, porque
    // la CSP no existe en `npm run dev`. Son blobs del propio origen, creados por
    // la página: no abre la puerta a imágenes de terceros.
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connect.join(' ')}`,
    "worker-src 'self' blob:",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
  ]
  // Sin Firebase no se declara `frame-src`: hereda `default-src 'self'`, que ya
  // prohíbe cualquier iframe externo.
  if (frame.length) directives.push(`frame-src ${frame.join(' ')}`)

  return directives.join('; ')
}

function securityHeadersPlugin(env) {
  return {
    name: 'dinocolor-security-headers',
    apply: 'build',
    transformIndexHtml() {
      const CSP = buildCsp(env)
      // head-prepend: la CSP debe ir ANTES de cualquier <script>/<link> para gobernarlos.
      return {
        tags: [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
            injectTo: 'head-prepend',
          },
        ],
      }
    },
  }
}

// base: './'  -> rutas relativas. Funciona en GitHub Pages (subcarpeta /dinocolor/)
//               y dentro de Capacitor (file://) sin reconfigurar.
// outDir: 'dist' -> salida estándar de Vite; es lo que sincroniza Capacitor (webDir).
export default defineConfig(({ mode }) => {
  // loadEnv con prefijo '' lee TODAS las variables del `.env`, no solo las
  // `VITE_*`. Aquí solo se usan para decidir la CSP; al cliente sigue llegando
  // únicamente lo que Vite expone por su cuenta (las `VITE_*`).
  const env = loadEnv(mode, process.cwd(), '')

  return {
  plugins: [react(), securityHeadersPlugin(env)],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Three.js es ~80 % del bundle y no cambia casi nunca; React tampoco. Al
        // separarlos del código del juego, tocar un nivel o el HUD invalida un chunk
        // pequeño, y quien vuelve al juego reutiliza de caché el trozo grande en vez
        // de volver a descargar 1 MB entero.
        manualChunks: {
          three: ['three'],
          react: ['react', 'react-dom'],
        },
      },
    },
    // El chunk de three es grande por naturaleza; el aviso genérico de Vite ya no
    // aporta información útil aquí.
    chunkSizeWarningLimit: 900,
  },
  server: {
    host: true,
    port: 5173,
  },
  }
})
