/**
 * Panel.jsx — contenedor tipo tarjeta para agrupar contenido de UI.
 *
 * Props:
 *   - title    string (opcional) cabecera del panel
 *   - className string extra
 *   - children contenido
 */

export default function Panel({ title, children, className = '' }) {
  return (
    <div className={`panel ${className}`}>
      {title && <h2 className="panel-title">{title}</h2>}
      <div className="panel-body">{children}</div>
    </div>
  )
}
