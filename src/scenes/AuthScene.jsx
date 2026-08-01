/**
 * AuthScene.jsx
 * -----------------------------------------------------------------------------
 * Puerta de entrada al juego: acceso con Google, Apple, correo/contraseña, o
 * como invitado. Aparece entre StartScene y MenuScene.
 *
 * PRINCIPIO DE DISEÑO — nunca dejar a nadie fuera:
 * un juego infantil no puede convertir un formulario en un muro. Por eso
 * "Seguir como invitado" está SIEMPRE visible (no escondido tras un enlace
 * pequeño) y por eso, si Firebase no está configurado, la pantalla lo dice con
 * un aviso claro en vez de enseñar botones que fallan al pulsarlos.
 *
 * PRESUPUESTO VERTICAL (la lección de ResultScene): la mascota solo se pinta en
 * el modo "elegir método". Al abrir un formulario desaparece y su altura se la
 * quedan los campos — así el botón de enviar nunca queda fuera del marco en un
 * móvil bajito, ni siquiera con el teclado abierto.
 *
 * TRES MODOS en un solo componente (`mode`):
 *   'chooser'  — elegir método (por defecto)
 *   'login'    — entrar con correo
 *   'register' — crear cuenta
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Button from '../components/ui/Button.jsx'
import DinoMascot from '../components/game/DinoMascot.jsx'
import ProviderButton from '../components/auth/ProviderButton.jsx'
import { MASCOT_NAME } from '../data/mascot.js'
import { authErrorMessage, isCancellation } from '../systems/auth/authErrors.js'
import {
  capabilities,
  continueAsGuest,
  registerWithEmail,
  sendPasswordReset,
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
} from '../systems/auth/authService.js'
import {
  PASSWORD_MIN_LENGTH,
  passwordStrength,
  validateDisplayName,
  validateEmail,
  validateNewPassword,
  validatePassword,
} from '../systems/auth/authValidation.js'

const STRENGTH_LABEL = ['Muy débil', 'Aceptable', 'Buena', 'Excelente']

export default function AuthScene({ onAuthenticated }) {
  const [mode, setMode] = useState('chooser')
  const [busy, setBusy] = useState(null) // 'google' | 'apple' | 'email' | 'guest' | null
  const [formError, setFormError] = useState('') // error global (banner)
  const [notice, setNotice] = useState('') // aviso positivo (p. ej. correo enviado)
  const [fields, setFields] = useState({ name: '', email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)

  // Evita rematar una acción sobre un componente ya desmontado (el jugador puede
  // pulsar "invitado" mientras el popup de Google sigue abierto: la escena se va
  // al menú y, al cerrarse el popup, la promesa antigua intentaría escribir
  // estado sobre un componente que ya no existe).
  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  const isRegister = mode === 'register'
  const anyBusy = busy !== null

  const setField = useCallback((key, value) => {
    setFields((f) => ({ ...f, [key]: value }))
    // Limpiar el error de ESE campo al escribir: mantenerlo en rojo mientras el
    // jugador corrige es puro castigo visual.
    setFieldErrors((e) => (e[key] ? { ...e, [key]: null } : e))
    setFormError('')
  }, [])

  /** Envoltorio común: marca ocupado, traduce el error y libera al terminar. */
  const run = useCallback(
    async (key, action) => {
      setBusy(key)
      setFormError('')
      setNotice('')
      try {
        const profile = await action()
        if (!aliveRef.current) return
        // `null` = el proveedor se fue por redirect: la página se recarga sola y
        // la sesión se resuelve al volver. No hay nada que hacer aquí.
        if (profile) onAuthenticated(profile)
      } catch (err) {
        if (!aliveRef.current) return
        // Cerrar el popup no es un fallo: no se pinta en rojo.
        if (!isCancellation(err)) setFormError(authErrorMessage(err))
      } finally {
        if (aliveRef.current) setBusy(null)
      }
    },
    [onAuthenticated],
  )

  const handleGoogle = useCallback(() => run('google', signInWithGoogle), [run])
  const handleApple = useCallback(() => run('apple', signInWithApple), [run])
  const handleGuest = useCallback(
    () => run('guest', async () => continueAsGuest()),
    [run],
  )

  /** Valida el formulario completo antes de gastar una llamada de red. */
  const validateForm = useCallback(() => {
    const errors = {
      email: validateEmail(fields.email),
      password: isRegister
        ? validateNewPassword(fields.password)
        : validatePassword(fields.password),
      name: isRegister ? validateDisplayName(fields.name) : null,
    }
    setFieldErrors(errors)
    return !errors.email && !errors.password && !errors.name
  }, [fields, isRegister])

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault()
      if (anyBusy) return
      if (!validateForm()) return
      const email = fields.email.trim()
      const name = fields.name.trim()
      run('email', () =>
        isRegister
          ? registerWithEmail(email, fields.password, name)
          : signInWithEmail(email, fields.password),
      )
    },
    [anyBusy, fields, isRegister, run, validateForm],
  )

  /** Recuperar contraseña: solo necesita un correo válido. */
  const handleReset = useCallback(async () => {
    const emailError = validateEmail(fields.email)
    if (emailError) {
      setFieldErrors((e) => ({ ...e, email: emailError }))
      return
    }
    setBusy('email')
    setFormError('')
    try {
      await sendPasswordReset(fields.email.trim())
      if (aliveRef.current) {
        setNotice('Te hemos enviado un correo para crear una contraseña nueva.')
      }
    } catch (err) {
      if (aliveRef.current) setFormError(authErrorMessage(err))
    } finally {
      if (aliveRef.current) setBusy(null)
    }
  }, [fields.email])

  /** Cambia de modo limpiando errores (no los campos: el correo se reaprovecha). */
  const goMode = useCallback((next) => {
    setMode(next)
    setFieldErrors({})
    setFormError('')
    setNotice('')
  }, [])

  const strength = useMemo(
    () => (isRegister ? passwordStrength(fields.password) : 0),
    [fields.password, isRegister],
  )

  const providerHint = capabilities.firebase
    ? undefined
    : 'Aún no está configurado el acceso con cuenta.'

  return (
    <div className="scene scene--auth">
      <div className="auth-brand">
        <h1 className="logo logo--sm">
          <span className="logo-dino">Dino</span>
          <span className="logo-color">Color</span>
        </h1>
        <p className="auth-subtitle">
          {mode === 'chooser' && 'Guarda tu progreso y juega en cualquier dispositivo'}
          {mode === 'login' && 'Vuelve a entrar en tu cuenta'}
          {mode === 'register' && 'Crea tu cuenta en 10 segundos'}
        </p>
      </div>

      {/* La mascota solo en el modo "elegir": en los formularios cede su altura
          a los campos para que el botón de enviar no se salga del marco. */}
      {mode === 'chooser' && (
        <DinoMascot
          className="mascot--auth"
          pose="greet"
          mood="happy"
          size={168}
          targetHeight={1.24}
          baseY={-0.6}
          message={
            <span>
              <strong className="bubble-title">¡Bienvenido!</strong>
              <span className="bubble-sub">Entra y guarda tus estrellas ⭐</span>
            </span>
          }
        />
      )}

      {/* Aviso honesto cuando no hay backend configurado. Mejor decirlo que
          dejar que el jugador descubra el fallo pulsando. */}
      {!capabilities.firebase && (
        <p className="auth-notice auth-notice--warn" role="status">
          El acceso con cuenta todavía no está configurado en esta versión.
          Puedes jugar como invitado sin perder nada.
        </p>
      )}

      {formError && (
        <p className="auth-notice auth-notice--error" role="alert">
          {formError}
        </p>
      )}
      {notice && (
        <p className="auth-notice auth-notice--ok" role="status">
          {notice}
        </p>
      )}

      {mode === 'chooser' ? (
        <div className="auth-panel">
          <div className="auth-providers">
            <ProviderButton
              provider="google"
              label="Continuar con Google"
              onClick={handleGoogle}
              disabled={!capabilities.google || anyBusy}
              busy={busy === 'google'}
              hint={providerHint}
            />
            <ProviderButton
              provider="apple"
              label="Continuar con Apple"
              onClick={handleApple}
              disabled={!capabilities.apple || anyBusy}
              busy={busy === 'apple'}
              hint={providerHint}
            />
          </div>

          <div className="auth-divider" role="separator">
            <span>o con tu correo</span>
          </div>

          {/* Estos dos botones solo CAMBIAN DE PANTALLA: no llaman a la red, así
              que no se deshabilitan aunque falte configuración. Deshabilitarlos
              dejaba el formulario inalcanzable (imposible de revisar) y, de cara
              al jugador, una pantalla con casi todo apagado. El aviso de arriba
              ya explica la situación, y al enviar se da el mensaje exacto. */}
          <div className="auth-email-actions">
            <Button
              variant="primary"
              size="md"
              block
              onClick={() => goMode('register')}
              disabled={anyBusy}
            >
              ✉ Crear cuenta
            </Button>
            <Button
              variant="secondary"
              size="md"
              block
              onClick={() => goMode('login')}
              disabled={anyBusy}
            >
              Iniciar sesión
            </Button>
          </div>
        </div>
      ) : (
        <form className="auth-panel auth-form" onSubmit={handleSubmit} noValidate>
          {isRegister && (
            <label className="auth-field">
              <span className="auth-label">Tu nombre (opcional)</span>
              <input
                className={`auth-input ${fieldErrors.name ? 'is-invalid' : ''}`}
                type="text"
                name="name"
                autoComplete="nickname"
                inputMode="text"
                maxLength={24}
                placeholder={`Cazador de ${MASCOT_NAME}s`}
                value={fields.name}
                onChange={(e) => setField('name', e.target.value)}
                disabled={anyBusy}
              />
              {fieldErrors.name && <span className="auth-error">{fieldErrors.name}</span>}
            </label>
          )}

          <label className="auth-field">
            <span className="auth-label">Correo electrónico</span>
            <input
              className={`auth-input ${fieldErrors.email ? 'is-invalid' : ''}`}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              maxLength={254}
              placeholder="dino@correo.com"
              value={fields.email}
              onChange={(e) => setField('email', e.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              disabled={anyBusy}
            />
            {fieldErrors.email && <span className="auth-error">{fieldErrors.email}</span>}
          </label>

          <label className="auth-field">
            <span className="auth-label">Contraseña</span>
            <span className="auth-input-wrap">
              <input
                className={`auth-input ${fieldErrors.password ? 'is-invalid' : ''}`}
                type={showPassword ? 'text' : 'password'}
                name="password"
                /* `new-password` en el registro evita que el gestor de
                   contraseñas rellene la antigua al crear una cuenta. */
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                maxLength={128}
                placeholder={isRegister ? `Mínimo ${PASSWORD_MIN_LENGTH} caracteres` : '••••••••'}
                value={fields.password}
                onChange={(e) => setField('password', e.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
                disabled={anyBusy}
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                disabled={anyBusy}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </span>
            {fieldErrors.password && (
              <span className="auth-error">{fieldErrors.password}</span>
            )}
            {/* Medidor: enseña el progreso mientras se escribe, en vez de
                castigar solo al enviar. */}
            {isRegister && fields.password.length > 0 && !fieldErrors.password && (
              <span className={`auth-strength auth-strength--${strength}`}>
                <i />
                <i />
                <i />
                <b>{STRENGTH_LABEL[strength]}</b>
              </span>
            )}
          </label>

          <Button
            variant="primary"
            size="lg"
            block
            type="submit"
            disabled={anyBusy}
            className="auth-submit"
          >
            {busy === 'email'
              ? 'Un momento…'
              : isRegister
                ? '🦕 Crear mi cuenta'
                : '▶ Entrar'}
          </Button>

          <div className="auth-switch">
            {isRegister ? (
              <button type="button" onClick={() => goMode('login')} disabled={anyBusy}>
                ¿Ya tienes cuenta? <b>Inicia sesión</b>
              </button>
            ) : (
              <>
                <button type="button" onClick={() => goMode('register')} disabled={anyBusy}>
                  ¿No tienes cuenta? <b>Créala</b>
                </button>
                <button
                  type="button"
                  className="auth-link-soft"
                  onClick={handleReset}
                  disabled={anyBusy}
                >
                  He olvidado mi contraseña
                </button>
              </>
            )}
          </div>
        </form>
      )}

      <div className="auth-bottom">
        {mode === 'chooser' ? (
          <button
            type="button"
            className="auth-guest"
            onClick={handleGuest}
            disabled={anyBusy}
          >
            {busy === 'guest' ? 'Entrando…' : 'Seguir como invitado →'}
          </button>
        ) : (
          <button
            type="button"
            className="auth-guest"
            onClick={() => goMode('chooser')}
            disabled={anyBusy}
          >
            ← Otros métodos de acceso
          </button>
        )}
        <p className="auth-legal">
          Solo guardamos tu nombre y tu correo para reconocerte. Nada más.
        </p>
      </div>
    </div>
  )
}
