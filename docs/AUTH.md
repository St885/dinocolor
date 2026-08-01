# DinoColor — Acceso con cuenta (Google · Apple · correo · invitado)

> Iteración 2026-08-01. Estado: **UI y lógica completas y validadas en navegador.
> Falta la configuración externa** (proyecto de Firebase). Sin ella el juego
> arranca, se juega entero y el acceso ofrece el modo invitado con un aviso claro.

---

## 1. Qué hay construido

| Pieza | Archivo | Estado |
|---|---|---|
| Pantalla de acceso | `src/scenes/AuthScene.jsx` | ✅ terminada |
| Botones de proveedor (logos SVG en línea) | `src/components/auth/ProviderButton.jsx` | ✅ |
| Chip de sesión en el menú | `src/components/auth/AccountChip.jsx` | ✅ |
| Estilos | `styles/auth.css` | ✅ |
| Fachada de sesión | `src/systems/auth/authService.js` | ✅ |
| Adaptador Firebase | `src/systems/auth/firebaseProvider.js` | ✅ |
| Config por entorno | `src/systems/auth/authConfig.js` | ✅ |
| Validación de formularios (pura) | `src/systems/auth/authValidation.js` | ✅ |
| Mensajes de error en español | `src/systems/auth/authErrors.js` | ✅ |
| Perfil + espejo local | `src/systems/auth/userProfile.js` | ✅ |
| Puente con React | `src/hooks/useAuth.js` | ✅ |
| Credenciales reales de Google/Apple | consola de Firebase / Apple | ❌ **pendiente de Stefano** |

**Sin `.env` no falla nada:** `isFirebaseConfigured` es `false`, la pantalla lo
dice, los botones de proveedor salen desactivados y el modo invitado funciona.

---

## 2. El flujo

```
StartScene ──"Jugar"──► AuthScene ──► MenuScene ──► GameScene ──► ResultScene
                            │
                            ├─ Continuar con Google
                            ├─ Continuar con Apple
                            ├─ Crear cuenta  (correo + contraseña)
                            ├─ Iniciar sesión (correo + contraseña)
                            └─ Seguir como invitado   ← SIEMPRE disponible
```

- La puerta **no bloquea**: siempre hay salida por invitado.
- Quien ya tiene sesión (cuenta o invitado) **no vuelve a ver la pantalla**: pasa
  directo al menú (`App.jsx`).
- Mientras Firebase resuelve si había sesión se enseña un indicador breve
  (`.scene--auth-loading`), no el formulario — así un usuario ya identificado no
  ve parpadear un login que no le corresponde.
- Cerrar sesión (chip del menú → confirmación en línea) devuelve a la portada.

---

## 3. Progreso del jugador — decisión importante

**El progreso NO se ata a la cuenta.** Niveles desbloqueados, superados, récords
y estrellas siguen exactamente donde estaban: en `localStorage`, bajo las claves
`dinocolor.*` que gestiona `storageSystem.js`. Iniciar sesión, cambiar de cuenta
o cerrar sesión **no borra ni migra nada**.

Por qué se ha hecho así:

1. **No romper lo que funciona.** Separar el progreso por `uid` habría hecho que,
   al entrar con cuenta por primera vez, cualquier jugador existente viera su
   progreso "desaparecer". Es el peor fallo posible en un juego.
2. **Sin nube, una cuenta no puede guardar nada.** Firebase **Auth** identifica;
   no almacena datos de juego. Sincronizar de verdad exige Firestore (o similar),
   que es otra decisión, otro coste y otras reglas de seguridad.
3. Anunciar "guarda tu progreso" y no guardarlo sería mentir. Hoy la promesa de
   la pantalla es *reconocerte*; la sincronización real está en el §7.

El perfil se guarda **campo a campo** (no como JSON, siguiendo el criterio de
`docs/SECURITY.md`) en `dinocolor.auth.*`:

| Clave | Contenido |
|---|---|
| `dinocolor.auth.uid` | identificador del jugador |
| `dinocolor.auth.displayName` | nombre visible (máx. 24 caracteres) |
| `dinocolor.auth.email` | correo, si el proveedor lo da (vacío en invitado) |
| `dinocolor.auth.provider` | `google` · `apple` · `password` · `guest` |
| `dinocolor.auth.createdAt` | alta de la cuenta (ISO) |
| `dinocolor.auth.lastLogin` | último acceso (ISO) |

No se guarda **ningún token ni contraseña**: la sesión real la gestiona el SDK de
Firebase en su propio almacenamiento. Este espejo solo sirve para saludar por su
nombre al jugador en el primer frame y para sostener el modo invitado.

---

## 4. Cómo activar el acceso real (paso a paso)

### 4.1 Firebase (necesario para todo menos el invitado)

1. Entra en <https://console.firebase.google.com> y **crea un proyecto**.
2. **Añade una app web** (icono `</>`). Copia el bloque `firebaseConfig`.
3. En el proyecto, copia la plantilla y rellena:

   ```bash
   cp .env.example .env
   ```

   ```
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=tu-proyecto
   VITE_FIREBASE_APP_ID=1:123...:web:abc...
   ```

4. **Authentication → Sign-in method**: activa **Correo/contraseña** y **Google**.
5. **Authentication → Settings → Dominios autorizados**: añade los dominios desde
   los que se servirá el juego (`localhost` ya viene). Para GitHub Pages:
   `st885.github.io`.
6. `npm run build`. La CSP se ajusta sola (ver §6).

> **La config web de Firebase no es un secreto.** Viaja en el cliente por diseño
> y Google la considera pública. Lo que protege el proyecto son los **dominios
> autorizados** del paso 5 y las reglas del backend. Vive en `.env` para no atar
> el repositorio a un proyecto concreto y para poder tener entornos separados.

### 4.2 Apple (requiere cuenta de pago)

Apple Sign-In en **web** no se activa con un clic. Hace falta:

1. **Apple Developer Program** (99 $/año). Sin esto no hay forma de hacerlo.
2. En <https://developer.apple.com/account/resources/identifiers>:
   - un **App ID** con la capacidad *Sign In with Apple*;
   - un **Services ID** (este es el que actúa de `client_id` en web);
   - en el Services ID, configurar *Sign In with Apple* con:
     - **Domain:** el dominio del juego (p. ej. `st885.github.io`),
     - **Return URL:** `https://<tu-proyecto>.firebaseapp.com/__/auth/handler`
       — es la de **Firebase**, no la del juego. Es el error más habitual.
   - una **clave privada** (`.p8`) con *Sign In with Apple*, anotando su Key ID.
3. En Firebase → Authentication → Sign-in method → **Apple**: pegar Services ID,
   Team ID, Key ID y el contenido de la clave `.p8`.
4. Mientras no esté listo, oculta el botón para no ofrecer algo que falla:

   ```
   VITE_AUTH_APPLE_ENABLED=false
   ```

**Notas de Apple que conviene saber antes:**
- Apple entrega el **nombre y el correo solo la PRIMERA vez** que el usuario
  acepta. Si se pierden, no hay forma de recuperarlos (habría que borrar la
  autorización desde el ID de Apple del usuario). Por eso `firebaseProvider.js`
  pide los scopes `name` y `email` en el primer intento.
- El usuario puede elegir **ocultar su correo** (relay `@privaterelay.appleid.com`).
  El perfil lo acepta sin problema y, si no hay nombre, cae a "Explorador".

### 4.3 Dominio propio (recomendado en producción)

Se usa **ventana emergente** (`signInWithPopup`), con caída a redirect solo si el
navegador la bloquea. Motivo: `signInWithRedirect` depende de cookies de tercero
contra `<proyecto>.firebaseapp.com`, que Safari (ITP) y Chrome bloquean; el
usuario vuelve del redirect **sin sesión y sin error visible**.

La solución definitiva es servir el `authDomain` desde el **mismo dominio** que el
juego (Firebase Hosting con dominio propio, o un proxy de `/__/auth/`). Mientras
tanto, el popup funciona bien en navegador de escritorio y móvil.

---

## 5. Errores: qué ve el jugador

Todos los códigos de Firebase se traducen en `authErrors.js`. Nunca se enseña un
código crudo ni un stack trace.

| Situación | Mensaje |
|---|---|
| Correo mal escrito | «Ese correo no parece válido. Ejemplo: dino@correo.com» |
| Contraseña corta / sin número | «Usa al menos 8 caracteres.» / «Añade algún número.» |
| Credenciales incorrectas | «Correo o contraseña incorrectos. Inténtalo de nuevo.» |
| Correo ya registrado | «Ya existe una cuenta con ese correo. Inicia sesión.» |
| Proveedor sin activar | «Ese método de acceso aún no está activado.» |
| Sin `.env` | «El acceso con cuenta todavía no está configurado. Puedes jugar como invitado.» |
| Sin conexión | «Sin conexión. Comprueba tu internet e inténtalo otra vez.» |
| Cerró la ventana del proveedor | *(no se pinta nada: no es un fallo)* |

**Decisión de seguridad:** «no existe ese correo» y «contraseña incorrecta»
comparten el MISMO mensaje. Distinguirlos convierte el formulario en un detector
de cuentas registradas (enumeración de usuarios).

---

## 6. Seguridad

- **Cero secretos en el repositorio.** `.env` está en `.gitignore`; solo se
  versiona `.env.example`, vacío.
- **CSP calculada según el entorno** (`vite.config.js` → `buildCsp`): los orígenes
  de Google/Apple/Firebase se añaden **solo si el build tiene configuración**. Sin
  `.env`, la política queda tan cerrada como antes de existir el login.
  Con Firebase configurado se añaden:
  - `connect-src`: `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`,
    el `authDomain`;
  - `frame-src`: el `authDomain`, `accounts.google.com`, `appleid.apple.com`.
- **`blob:` en `connect-src` e `img-src`** — no tiene que ver con el login, pero
  es imprescindible: sin ello las texturas del GLB no cargan. Ver
  `docs/TECHNICAL_NOTES.md`.
- **El SDK se carga en diferido** (`import()` dentro de la función): no entra en
  el bundle inicial. Verificado en el build: `index.html` no lo precarga.
- **Sin `JSON.parse`** sobre datos del usuario; el perfil se guarda y sanea campo
  a campo (`userProfile.js`).
- **Sin registro de credenciales**: nada de contraseñas ni tokens en consola.
- El **nombre visible se limpia** de caracteres de control y se recorta a 24
  caracteres antes de pintarse.

---

## 7. Pendientes conocidos

1. **Credenciales reales** (§4). Es lo único que separa la pantalla de estar viva.
2. **Sincronización del progreso en la nube.** Hoy el progreso es del dispositivo
   (§3). Requiere Firestore + reglas de seguridad; conviene decidirlo aparte.
3. **Capacitor / Android.** `signInWithPopup` no funciona dentro de un WebView
   nativo: haría falta `@capacitor-firebase/authentication` (dependencia nueva, a
   confirmar). En la web funciona tal cual.
4. **Dominio propio para `authDomain`** (§4.3) si algún día se necesita redirect.
5. **Verificación de correo** y **borrado de cuenta** (RGPD) no están: si el juego
   se publica con cuentas de verdad, hay que añadirlos.
