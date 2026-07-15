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
