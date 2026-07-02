/**
 * main.jsx — punto de entrada. Monta React y carga los estilos globales.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Estilos (orden importa: base -> mobile -> juego)
import '../styles/global.css'
import '../styles/mobile.css'
import '../styles/game.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
