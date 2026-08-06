/**
 * main.jsx — punto de entrada. Monta React y carga los estilos globales.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Estilos (orden importa: base -> mobile -> juego -> acceso)
// auth.css va al final: reutiliza los tokens de global.css y ajusta piezas que
// game.css ya define (p. ej. `.logo` en su variante pequeña).
import '../styles/global.css'
import '../styles/mobile.css'
import '../styles/game.css'
import '../styles/auth.css'
// shop.css va EL ÚLTIMO: además de la tienda, aquí viven los AMBIENTES, que
// redefinen variables ya usadas por game.css y auth.css.
import '../styles/shop.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
