import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './'  -> rutas relativas. Funciona en GitHub Pages (subcarpeta /dinocolor/)
//               y dentro de Capacitor (file://) sin reconfigurar.
// outDir: 'dist' -> salida estándar de Vite; es lo que sincroniza Capacitor (webDir).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    host: true,
    port: 5173,
  },
})
