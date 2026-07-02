/**
 * Button.jsx
 * -----------------------------------------------------------------------------
 * Botón táctil grande y reutilizable. Reproduce un click de UI y delega al onClick.
 *
 * Props:
 *   - variant   'primary' | 'secondary' | 'ghost'
 *   - size      'md' | 'lg'
 *   - block     bool (ancho completo)
 *   - resto: props normales de <button>
 * -----------------------------------------------------------------------------
 */

import { Sounds, unlock } from '../../systems/audioSystem.js'

export default function Button({
  children,
  variant = 'primary',
  size = 'lg',
  block = false,
  onClick,
  className = '',
  ...rest
}) {
  const handleClick = (e) => {
    unlock() // desbloquea el audio en el primer gesto del usuario
    Sounds.click()
    onClick && onClick(e)
  }

  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    block ? 'btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={classes} onClick={handleClick} {...rest}>
      {children}
    </button>
  )
}
