---
name: dinocolor-deploy-pages
description: Publicación de DinoColor en GitHub Pages vía GitHub Actions (workflow existente, base './', no versionar dist/, no romper Capacitor). Úsala para "revisa el deploy", "publica en Pages", "verifica que Pages sigue funcionando".
---

# dinocolor-deploy-pages

Despliegue de DinoColor. Asume `dinocolor-context` cargado. **No cambies nada de Pages ni el workflow sin permiso explícito.**

## Datos fijos

- **Repo:** `https://github.com/St885/dinocolor` · rama `main` · **público**.
- **URL publicada (en línea):** `https://st885.github.io/dinocolor/`.
- **Método:** GitHub **Actions** (artefacto), no rama `gh-pages`, **sin versionar `dist/`**, sin secretos.
- **Workflow:** `.github/workflows/deploy-pages.yml` — `npm ci` → `npm run build` → `configure-pages` → `upload-pages-artifact (path: dist)` → `deploy-pages`. Node 20. Dispara en push a `main` y por `workflow_dispatch`.

## Base de Vite (no la cambies)

- Vite mantiene **`base: './'`** (rutas relativas). **Validado**: sirviendo el build bajo `/dinocolor/` el juego arranca con 0 errores y el GLB carga (HTTP 200).
- **Por qué no `base: '/dinocolor/'`:** el mismo build debe funcionar también en **Capacitor/Android (`file://`)**; una base absoluta `/dinocolor/...` rompería el APK. Como no hay routing de cliente, la base relativa no tiene inconveniente en Pages. **Cambiarla sería una regresión.**

## Estado real de la publicación

✅ **El juego está PUBLICADO y funcionando.** No hay nada pendiente de configurar.

- El repo `St885/dinocolor` es **público** y **Pages está activo** (Source: GitHub Actions).
- El workflow **"Deploy to GitHub Pages" está en verde**; sus dos jobs (`build` y `deploy`) pasan.
- **El deploy es automático: cada push a `main` dispara el workflow.** No hay que hacer nada más.
- Último despliegue validado: **v0.4.0** (`3c3bec4`, 2026-07-28) — estrellas, capítulos y tutorial.
  Recorrido completo jugado en la URL publicada: 0 errores de consola, 0 peticiones fallidas,
  CSP activa sin violaciones y el GLB de T-Rexo servido con 200.
- **No hagas deploy manual** (`workflow_dispatch` / "Run workflow") salvo indicación expresa de
  Stefano: el push ya lo cubre, y relanzarlo a mano solo tiene sentido si el run automático falló.

> Nota histórica (para no volver a diagnosticarlo): hasta 2026-07 el repo fue **privado**, y como
> Pages en repos privados requiere plan de pago, el paso `deploy-pages` no podía funcionar. **Eso
> ya está resuelto** — el repo es público. Si alguna skill o documento antiguo dice lo contrario,
> está desactualizado.

## Procedimiento de verificación de un deploy

**Antes del push**

1. `npm run build` local **verde** (y `dist/` sin GLB pesados: solo T-Rexo, 0,9 MB).
2. Working tree limpio y `git status -sb` revisado. **El push necesita autorización explícita**
   de Stefano (ver `dinocolor-git-safe`).

**Después del push** (el workflow arranca solo)

3. Revisar **Actions** → `https://github.com/St885/dinocolor/actions`. Esperar a que el run del
   commit pusheado quede en `completed/success`, con sus dos jobs (`build` y `deploy`) en verde.
4. Validar la **URL publicada** `https://st885.github.io/dinocolor/`: carga sin 404, el GLB
   responde 200 y el juego arranca. Tarda 1–2 min desde que el run termina.
5. Comprobar que **sirve el build nuevo**, no el anterior cacheado: los hashes de
   `assets/index-*.js` / `assets/index-*.css` de la página deben coincidir con los del `dist/`
   local recién construido. Es la forma más rápida de distinguir "desplegado" de "aún el viejo".

> Para validar el juego de verdad (no solo que la página responde), usa `dinocolor-qa-visual`:
> recorrer Start → Menú → Juego → Resultado en un navegador con WebGL y contar errores de consola.

## Reglas

- **No `git push` ni deploy sin autorización explícita** de Stefano.
- **No hagas deploy manual** (`workflow_dispatch`): el push a `main` ya despliega.
- **No cambies** la configuración de Pages, el workflow (`.github/`) ni la visibilidad del repo.
- **No versiones `dist/`** (se construye en CI).
- **No rompas Capacitor/Android**: no cambies `base: './'` en `vite.config.js`.
- Antes de cualquier push: `npm run build`. Después: revisar Actions **y** la URL publicada.
