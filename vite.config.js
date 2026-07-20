import { defineConfig } from 'vite'
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
 * la protección importante: bloquea scripts inyectados/de terceros. Todo es de origen
 * propio (el GLB se sirve del mismo sitio), no hay conexiones externas.
 *
 * X-Content-Type-Options, Referrer-Policy (cabecera) y Permissions-Policy son cabeceras
 * HTTP: GitHub Pages no permite configurarlas → van documentadas en docs/SECURITY.md.
 */
// Solo directivas que SÍ funcionan vía <meta>. `frame-ancestors` y `form-action` solo
// tienen efecto como cabecera HTTP (el navegador las ignora en <meta> y avisa por
// consola), así que van documentadas para la capa de hosting en docs/SECURITY.md.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ')

function securityHeadersPlugin() {
  return {
    name: 'dinocolor-security-headers',
    apply: 'build',
    transformIndexHtml() {
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
export default defineConfig({
  plugins: [react(), securityHeadersPlugin()],
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
})
