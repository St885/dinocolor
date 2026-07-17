---
name: dinocolor-git-safe
description: Reglas de Git seguras para DinoColor (revisar estado, commits pequeños y claros, nunca push/deploy sin permiso, no versionar dist/ ni node_modules/ ni secretos). Úsala para "prepara un commit", "revisa el estado del repo", "haz git de forma segura".
---

# dinocolor-git-safe

Trabajo seguro con Git en DinoColor. Asume `dinocolor-context` cargado.

## Estado actual del repo (para no re-descubrirlo)

- Repo GitHub **existe**: `https://github.com/St885/dinocolor`.
- Rama principal: **`main`** (con upstream `origin/main`).
- Es su **propio repo git** (raíz en `03_juegos/dinocolor`): no rastrea nada fuera → otros juegos/TREXoRoll no están dentro.
- **Workflow de deploy ya existe**: `.github/workflows/deploy-pages.yml` (GitHub Pages por Actions). Estado real de la publicación: ver `dinocolor-deploy-pages` (el repo es **privado**, así que Pages aún requiere acción del dueño).
- Historial base: `initial commit` → `revisión integral v0.2.0` → `remove duplicate Oliver runtime assets` → `configure GitHub Pages deployment`.
- `.gitignore` ya excluye `node_modules/`, `dist/`, `.env*`, keystores, `/assets/models/**/*.glb` (los GLB fuente **no** se versionan) y `**/backups/`.

## Reglas

1. **Trabaja solo en `03_juegos/dinocolor`.** No toques otros proyectos.
2. **Antes de tocar nada:** `git status --short` y `git log --oneline -5`. Reporta lo que ves.
3. **Nunca `git push`** sin confirmación explícita del usuario.
4. **Nunca deploy** sin confirmación explícita.
5. **Nunca commit automático** de trabajo grande sin permiso; los commits los haces cuando el usuario lo pide.
6. **No versiones** `dist/`, `node_modules/`, secretos (`.env`, keystores, `google-services.json`) ni GLB pesados. Verifica con `git ls-files | grep -E 'dist/|node_modules/'` (debe ser vacío) y `git ls-files | grep '\.glb$'` (solo el T-Rexo de 0,9 MB en `public/`).
7. **Commits pequeños y claros**, en presente imperativo, con prefijo tipo `feat:`/`fix:`/`chore:`/`docs:`. Un commit = un cambio lógico.
8. **Revisa `.gitignore`** si aparecen archivos que no deberían entrar.
9. **Revisa archivos grandes** antes de commitear: `git ls-files -z | xargs -0 du -h | sort -rh | head`.
10. **Reporta siempre** los archivos modificados y confirma que el **working tree queda limpio** tras el commit.

## Al preparar un commit (checklist)

- [ ] `git status --short` revisado; entra solo lo que debe.
- [ ] No entra `node_modules/` ni `dist/` ni secretos.
- [ ] No entra nada de otros juegos (imposible: repo aislado, pero confírmalo).
- [ ] Mensaje claro y acotado al cambio real (si el árbol mezcla trabajos distintos, **avísalo** y propón dividir en commits; no metas 2.000 líneas bajo un `chore:` menor).
- [ ] Tras commitear: `git status --short` vacío y `git log --oneline -3` correcto.
- [ ] **Push solo si el usuario lo pidió**; si no, deja el commit local y dilo.

## Cuando NO estás seguro

Si el mensaje pedido no describe bien lo que hay en el árbol (o hay cambios de otra sesión), **pregunta** antes de commitear. Un historial engañoso es peor que un commit de más.
