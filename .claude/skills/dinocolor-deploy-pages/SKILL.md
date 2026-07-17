---
name: dinocolor-deploy-pages
description: Publicación de DinoColor en GitHub Pages vía GitHub Actions (workflow existente, base './', no versionar dist/, no romper Capacitor). Úsala para "revisa el deploy", "publica en Pages", "verifica que Pages sigue funcionando".
---

# dinocolor-deploy-pages

Despliegue de DinoColor. Asume `dinocolor-context` cargado. **No cambies nada de Pages ni el workflow sin permiso explícito.**

## Datos fijos

- **Repo:** `https://github.com/St885/dinocolor` · rama `main`.
- **URL prevista:** `https://st885.github.io/dinocolor/`.
- **Método:** GitHub **Actions** (artefacto), no rama `gh-pages`, **sin versionar `dist/`**, sin secretos.
- **Workflow:** `.github/workflows/deploy-pages.yml` — `npm ci` → `npm run build` → `configure-pages` → `upload-pages-artifact (path: dist)` → `deploy-pages`. Node 20. Dispara en push a `main` y por `workflow_dispatch`.

## Base de Vite (no la cambies)

- Vite mantiene **`base: './'`** (rutas relativas). **Validado**: sirviendo el build bajo `/dinocolor/` el juego arranca con 0 errores y el GLB carga (HTTP 200).
- **Por qué no `base: '/dinocolor/'`:** el mismo build debe funcionar también en **Capacitor/Android (`file://`)**; una base absoluta `/dinocolor/...` rompería el APK. Como no hay routing de cliente, la base relativa no tiene inconveniente en Pages. **Cambiarla sería una regresión.**

## Estado real de la publicación (importante)

⚠️ El repo `St885/dinocolor` es **PRIVADO**. GitHub Pages en repos privados requiere **plan de pago** (Pro/Team/Enterprise); en el plan **gratuito** Pages solo funciona con repos **públicos**. Hasta resolver esto, el paso `deploy-pages` fallará y `Settings > Pages` no ofrecerá "GitHub Actions".

Para que Pages quede online, el **dueño** debe elegir una vía (decisión suya, no la fuerces):
- **A) Hacer el repo público** (lo habitual para una demo jugable, gratis) → `Settings` → Danger Zone → Change visibility → Public.
- **B) Mantenerlo privado con GitHub Pro** (de pago).
Luego: `Settings > Pages` → **Source: GitHub Actions** → `Actions` → "Deploy to GitHub Pages" → **Run workflow** (o re-run). El sitio tarda 1–2 min.

## Procedimiento de verificación de un deploy

1. `npm run build` local verde (y `dist/` sin GLB pesados).
2. Confirmar sync: `git status -sb` (HEAD == origin/main) y working tree limpio.
3. Tras el push (que dispara el workflow): revisar **Actions** → `https://github.com/St885/dinocolor/actions`.
4. Validar la **URL final** `https://st885.github.io/dinocolor/`: carga sin 404, GLB 200, juego arranca. (Si el repo sigue privado en plan free, esperar rojo — ver arriba.)

## Reglas

- **No cambies** la configuración de Pages, el workflow ni la visibilidad del repo sin permiso.
- **No versiones `dist/`** (se construye en CI).
- **No rompas Capacitor/Android** (no cambies `base`).
- Antes de cualquier deploy: `npm run build`. Después: revisar Actions y la URL.
