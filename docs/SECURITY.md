# DinoColor — Seguridad

> Revisión de seguridad y buenas prácticas. Actualizado en la iteración de niveles + hardening (2026-07-21).

DinoColor es un juego **estático, cliente 100 %**, sin backend, sin cuentas, sin red externa. Eso reduce mucho la superficie de ataque: no hay servidor que comprometer, ni datos de usuario que filtrar, ni autenticación.

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

Todo se **valida al leer** y se clampa al rango de niveles existente. Si `localStorage` no está disponible (Safari privado, WebView restringido), hay un **fallback en memoria** — el juego nunca falla por esto.

## 3. Qué datos NO se guardan / recogen

- **Nada de datos personales** (nombre, email, ubicación, contactos, identificadores de dispositivo).
- **Sin cuentas, sin login, sin tokens ni credenciales.**
- **Sin analítica, sin telemetría, sin cookies, sin rastreadores de terceros.**
- **Sin llamadas de red externas** (el único asset remoto es el GLB de la mascota, servido del **mismo origen**).

## 4. Riesgos conocidos (no bloqueantes)

1. **GitHub Pages no permite configurar cabeceras HTTP.** La CSP va por `<meta>` (efectiva para casi todo), pero `frame-ancestors`, `form-action`, `X-Content-Type-Options` y `Permissions-Policy` **solo funcionan como cabecera** → quedan pendientes para una capa de hosting que las permita (ver §5).
2. **Manipulación de `localStorage`.** Un usuario puede editar su propio progreso desde las DevTools. Impacto: solo se "hace trampa" a sí mismo (desbloquea niveles). No afecta a nadie más ni rompe el juego (valores validados y clampeados). Aceptable para un juego sin ranking online.
3. **Manifest solo con iconos SVG.** Suficiente para la web; para instalabilidad PWA / icono nativo Android suelen requerirse PNG 192×192 y 512×512 (pendiente, §6/§8).
4. **URLs de "Oliver" latentes.** El registro `MODELS.oliver` en `DinoMascot.jsx` apunta a `public/assets/models/characters/oliver/`, que no existe (se retiró para aligerar el build). Ninguna escena lo usa, así que no hay impacto; si se reactivara sin volver a copiar el asset, caería con gracia al fallback SVG. Ver `dinocolor-mascot-3d`.

## 5. Recomendaciones para producción web (capa de hosting)

Cuando se sirva desde un host con control de cabeceras (Netlify, Cloudflare Pages, Nginx, etc.), añadir estas **cabeceras HTTP** (complementan la CSP por `<meta>`):

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; media-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=(), usb=(), payment=()
```

Notas:
- `style-src 'unsafe-inline'` es necesario por los estilos en línea de React (`style={{…}}`, `--mascot-size`). El resto de directivas son estrictas.
- La versión por cabecera **incluye** `frame-ancestors`/`form-action` (que por `<meta>` se ignoran).
- No se necesita `unsafe-eval` ni orígenes externos: todo es de origen propio.

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
