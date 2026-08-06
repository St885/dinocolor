# DinoColor — Seguridad

> Revisión de seguridad y buenas prácticas. Actualizado en la iteración de **acceso
> con cuenta** (2026-08-01); antes, en la de niveles + hardening (2026-07-21).

DinoColor es un juego **estático, cliente 100 %**, sin backend propio. Desde
2026-08-01 **sí puede tener cuentas**, delegadas por completo en **Firebase
Authentication**: el juego no guarda contraseñas, no valida credenciales y no
expone ningún servidor propio. Toda la parte jugable sigue funcionando sin
conexión y sin cuenta (modo invitado).

**Lo que cambia respecto a la revisión anterior:**

| Antes (≤ 2026-07-28) | Ahora |
|---|---|
| Sin cuentas, sin login | Login opcional (Google / Apple / correo) + invitado |
| Sin datos personales | Se guarda **nombre y correo** del proveedor, en el dispositivo |
| Sin llamadas de red externas | Llamadas a Firebase **solo** al iniciar sesión |
| CSP fija y cerrada | CSP **calculada**: se abre lo justo, y solo si hay `.env` |

Detalle completo del flujo, activación y decisiones: **[`docs/AUTH.md`](AUTH.md)**.

## 1. Estado actual de seguridad

Auditoría completa de `src/`, `package.json`, `vite.config.js`, `index.html`, `.gitignore` y `public/manifest.webmanifest`:

| Comprobación | Resultado |
|---|---|
| `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `document.write` | **0 usos** |
| `JSON.parse` sin try/catch (o sobre datos no confiables) | **0** (no hay ningún `JSON.parse` en el proyecto) |
| Lectura de `localStorage` sin validar | Ninguna: todo pasa por `storageSystem.js` (parseInt + `Number.isFinite` + rango + valor por defecto) |
| APIs del navegador sin guard (SSR/WebView) | Todas protegidas con `typeof … === 'undefined'` / try/catch |
| Secretos versionados (`.env`, keys, tokens, keystores) | **0**; `.gitignore` los excluye; `sourcemap: false` en producción |
| Pantalla en blanco ante fallo de asset/GLB/audio | Cubierto: `ErrorBoundary` global + fallback SVG de la mascota + audio sintetizado |
| Dependencias / scripts de `package.json` | Mínimas y legítimas (react, react-dom, three, @react-three/fiber, @capacitor/*); sin `postinstall` ni comandos peligrosos |

**Hardening aplicado en esta iteración:**
- **CSP (Content-Security-Policy)** inyectada como `<meta>` **solo en el build de producción** (ver `vite.config.js` → `securityHeadersPlugin`; en dev rompería el HMR de Vite). Validada sirviendo el build y jugando: **0 violaciones en consola**. Directiva clave: `script-src 'self'` (bloquea scripts inyectados/de terceros).
- **Referrer-Policy** vía `<meta name="referrer" content="strict-origin-when-cross-origin">` (no filtra la URL a terceros).
- **`AudioContext`** creado dentro de try/catch: si un WebView restringido lanza, el juego se queda sin audio pero **nunca roto** (antes podía "matar" el click que lo inicializaba).
- **Progreso clampeado** al rango real de niveles (`useLevelProgress`): un `localStorage` corrupto o heredado (p. ej. `maxLevel=9999`) ya no desbloquea de forma inconsistente ni apunta más allá del último nivel.
- **Validación de niveles en desarrollo** (`levelValidation.js`, llamada en `levels.js` bajo `import.meta.env?.DEV`): avisa por consola de ids duplicados, layouts inexistentes, `activeBalls` > celdas, metas inalcanzables, etc. Código muerto en producción.

## 2. Qué datos guarda `localStorage`

Namespaced bajo `dinocolor.` (ver `src/systems/storageSystem.js`). **Solo progreso de juego, nada personal:**

| Clave | Tipo | Contenido |
|---|---|---|
| `dinocolor.maxLevel` | entero ≥ 1 | nivel máximo desbloqueado |
| `dinocolor.clearedLevel` | entero ≥ 0 | nivel máximo superado |
| `dinocolor.bestScore` | entero ≥ 0 | mejor puntuación |
| `dinocolor.soundEnabled` | `'true'`/`'false'` | preferencia de sonido |
| `dinocolor.bones` | entero ≥ 0 (tope 9.999.999) | moneda local "huesos" (v0.6.0) |
| `dinocolor.daily.day` | `'YYYY-MM-DD'` local | día de las misiones vigentes |
| `dinocolor.daily.ids` | ids separados por `\|` | qué tres misiones tocan hoy |
| `dinocolor.daily.progress` | enteros separados por `\|` | progreso de cada misión |
| `dinocolor.daily.done` | dígitos `0`/`1` | misiones ya completadas |
| `dinocolor.shop.skins` | ids separados por `\|` | aspectos desbloqueados (v0.6.1) |
| `dinocolor.shop.skin` | id | aspecto equipado |
| `dinocolor.shop.themes` | ids separados por `\|` | ambientes desbloqueados |
| `dinocolor.shop.theme` | id | ambiente equipado |

**Inventario de la tienda:** los ids se validan contra el catálogo AL LEER; los que
no existan (guardado antiguo o manipulado) se descartan en silencio. Y lo *equipado*
se comprueba contra lo que de verdad se posee: poner a mano
`dinocolor.shop.theme = 'volcano'` sin haberlo comprado **no surte efecto**, el juego
arranca con el de serie (verificado).

**No hay compras reales.** Los huesos se ganan jugando; no existe pasarela de pago,
ni identificadores de compra, ni comunicación con ningún servidor. Manipular el saldo
solo permite desbloquear DECORACIÓN para uno mismo: ningún artículo altera la
dificultad ni desbloquea niveles. `spendBones` rechaza importes negativos — si no,
un artículo con precio −100 sería una forma de fabricar huesos.

**Las cuatro claves `daily.*` se validan en bloque** (`readDaily`): si el día no
coincide, si algún id no está en el catálogo, si hay ids repetidos o si las longitudes
no cuadran, se descarta TODO el bloque y se generan misiones nuevas. Probado
inyectando basura: el juego arranca igual y sigue jugable.

**Los huesos son decorativos**: no se compran, no salen del dispositivo y **no
desbloquean niveles ni alteran la dificultad**. Por eso manipularlos solo permite
hacerse trampas a uno mismo, igual que el resto del progreso. Si algún día
desbloquearan contenido, habría que revisar esta suposición.

Todo se **valida al leer** y se clampa al rango de niveles existente. Si `localStorage` no está disponible (Safari privado, WebView restringido), hay un **fallback en memoria** — el juego nunca falla por esto.

### 2.b Datos de la cuenta (desde 2026-08-01)

Solo si el jugador **decide** iniciar sesión. Namespaced bajo `dinocolor.auth.`
(ver `src/systems/auth/userProfile.js`), **campo a campo, sin `JSON.parse`**:

| Clave | Contenido |
|---|---|
| `dinocolor.auth.uid` | identificador del jugador |
| `dinocolor.auth.displayName` | nombre visible (saneado, máx. 24 caracteres) |
| `dinocolor.auth.email` | correo, si el proveedor lo entrega (vacío en invitado) |
| `dinocolor.auth.provider` | `google` · `apple` · `password` · `guest` |
| `dinocolor.auth.createdAt` / `lastLogin` | fechas ISO |

Es un **espejo de presentación**, no la sesión: sirve para saludar al jugador por
su nombre en el primer frame y para sostener el modo invitado. La sesión real la
gestiona el SDK de Firebase en su propio almacenamiento.

En **modo invitado** no hay ningún dato personal: el `uid` se genera localmente con
`crypto.randomUUID()` y no se envía a ninguna parte.

## 3. Qué datos NO se guardan / recogen

- **Ningún token ni refresh token propio, ninguna contraseña.** El juego nunca ve
  una contraseña más allá del campo del formulario; se la pasa directamente al SDK
  de Firebase.
- **Sin ubicación, contactos ni identificadores de dispositivo.**
- **Sin analítica, sin telemetría, sin cookies propias, sin rastreadores de terceros.**
- **Sin llamadas de red externas mientras se juega.** Firebase solo se contacta al
  iniciar sesión, y su SDK **ni siquiera se descarga** si el jugador entra como
  invitado (carga diferida). El GLB de la mascota se sirve del **mismo origen**.

## 4. Riesgos conocidos (no bloqueantes)

1. **GitHub Pages no permite configurar cabeceras HTTP.** La CSP va por `<meta>` (efectiva para casi todo), pero `frame-ancestors`, `form-action`, `X-Content-Type-Options` y `Permissions-Policy` **solo funcionan como cabecera** → quedan pendientes para una capa de hosting que las permita (ver §5).
2. **Manipulación de `localStorage`.** Un usuario puede editar su propio progreso desde las DevTools. Impacto: solo se "hace trampa" a sí mismo (desbloquea niveles). No afecta a nadie más ni rompe el juego (valores validados y clampeados). Aceptable para un juego sin ranking online.
3. **Manifest solo con iconos SVG.** Suficiente para la web; para instalabilidad PWA / icono nativo Android suelen requerirse PNG 192×192 y 512×512 (pendiente, §6/§8).
4. **URLs de "Oliver" latentes.** El registro `MODELS.oliver` en `DinoMascot.jsx` apunta a `public/assets/models/characters/oliver/`, que no existe (se retiró para aligerar el build). Ninguna escena lo usa, así que no hay impacto; si se reactivara sin volver a copiar el asset, caería con gracia al fallback SVG. Ver `dinocolor-mascot-3d`.

## 5. Recomendaciones para producción web (capa de hosting)

Cuando se sirva desde un host con control de cabeceras (Netlify, Cloudflare Pages, Nginx, etc.), añadir estas **cabeceras HTTP** (complementan la CSP por `<meta>`):

**Sin acceso con cuenta configurado** (build sin `.env`):

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' blob:; worker-src 'self' blob:; media-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=(), usb=(), payment=()
```

**Con Firebase Auth configurado**, añadir a esas dos directivas (y solo a esas):

```
connect-src … https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://<authDomain>
frame-src   https://<authDomain> https://accounts.google.com https://appleid.apple.com
```

Es exactamente lo que genera `buildCsp` en `vite.config.js` para la `<meta>`: si el
build no tiene configuración de Firebase, **no se abre ni un origen extra**.

Notas:
- `style-src 'unsafe-inline'` es necesario por los estilos en línea de React (`style={{…}}`, `--mascot-size-base`). El resto de directivas son estrictas.
- **`blob:` en `img-src` y en `connect-src` no es opcional**: GLTFLoader carga las
  texturas embebidas del GLB desde un `Blob`, y con `createImageBitmap` disponible
  lo hace con `fetch()` (que gobierna `connect-src`, no `img-src`). Sin ambas, la
  mascota se renderiza **gris, sin textura** — y solo en producción, porque la CSP
  no existe en `npm run dev`. Ver `docs/TECHNICAL_NOTES.md`.
- La versión por cabecera **incluye** `frame-ancestors`/`form-action` (que por `<meta>` se ignoran).
  Ojo: si se activa Apple/Google, `form-action 'none'` puede interferir con el
  handler de OAuth — validarlo antes de fijarlo.
- No se necesita `unsafe-eval`.

## 6. Recomendaciones para Android / Capacitor (futuro)

- **CSP en Capacitor:** definir `server.androidScheme: 'https'` y una CSP por cabecera/config; evitar `allowNavigation` a orígenes externos.
- **Cleartext:** mantener `android:usesCleartextTraffic="false"` (el juego no necesita HTTP en claro).
- **Firma:** el keystore de release **nunca** se versiona (ya en `.gitignore`: `*.keystore`, `*.jks`, `keystore.properties`, `google-services.json`). Guardarlo fuera del repo con copia de seguridad.
- **Permisos:** no declarar permisos que el juego no usa (nada de ubicación, cámara, contactos, almacenamiento externo).
- **WebView:** revisar que no queda `console`/depuración activa en release; `sourcemap: false` ya evita filtrar el fuente.
- **Iconos:** generar PNG (192/512, y adaptativos) para la Play Store.

## 7. Política de privacidad

Hoy DinoColor **no recoge ni transmite ningún dato personal**, así que una política de privacidad puede ser muy simple y honesta:

> «DinoColor no recopila, almacena ni comparte datos personales. El progreso del juego (nivel y mejor puntuación) se guarda únicamente en tu dispositivo (localStorage) y no se envía a ningún servidor. No usamos analítica, publicidad ni rastreadores.»

Las tiendas (Google Play / App Store) **exigen** una política de privacidad publicada (URL) aunque no se recojan datos. Antes de publicar: alojar esa política y rellenar el "Data safety" de Play declarando "no se recogen datos". Si en el futuro se añade analítica, anuncios o compras, **actualizar** esta sección y la política.

## 8. Checklist de seguridad antes de publicar en tiendas

- [ ] `npm run build` verde; revisado que `dist/` no incluye secretos ni `.map`.
- [ ] Sin `.env`, keys, tokens ni keystores versionados (`git ls-files` limpio).
- [ ] CSP activa y validada (0 violaciones en consola jugando).
- [ ] Cabeceras de seguridad configuradas en el hosting (§5) si el host lo permite.
- [ ] Política de privacidad publicada y enlazada (§7); "Data safety" de Play rellenado.
- [ ] Iconos PNG (192/512/adaptativos) generados; manifest actualizado.
- [ ] Permisos Android mínimos (ninguno innecesario).
- [ ] Keystore de release fuera del repo, con backup seguro.
- [ ] Sin logs de depuración sensibles en release.
- [ ] Revisión de dependencias (`npm audit`) sin vulnerabilidades altas/críticas.
