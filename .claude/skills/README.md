# Skills de DinoColor

Skills locales reutilizables para trabajar en **DinoColor** (`03_juegos/dinocolor`) con prompts cortos, en vez de repetir instrucciones largas en cada mensaje.

## 1. Qué son estas skills

Cada carpeta contiene un `SKILL.md` con **frontmatter** (`name`, `description`) y un cuerpo de instrucciones. Son **skills de Claude Code a nivel de proyecto**: viven en `.claude/skills/<nombre>/SKILL.md` y se pueden invocar por nombre. El `description` es lo que Claude usa para decidir cuándo una skill es relevante.

> Nota: se cargan cuando abres el workspace/proyecto donde viven. Al abrir el subproyecto `03_juegos/dinocolor` en Claude Code, estas skills están disponibles.

## 2. Por qué reducen tokens

- El contexto pesado (ruta, stack, reglas, trampas conocidas) **se escribe una vez** aquí y **no se reenvía** en cada prompt.
- Su contenido **se carga solo cuando la skill se invoca** (bajo demanda), no en todos los mensajes.
- Tú escribes prompts de 1–2 líneas (`Usa dinocolor-context + dinocolor-qa-visual. Revisa GameScene…`) en lugar de párrafos que repetirías igual cada vez.
- Menos repetición ⇒ menos tokens de entrada por turno y menos deriva/olvidos entre sesiones.

## 3. Skills disponibles y cuándo usarlas

| Skill | Úsala cuando… |
|---|---|
| **dinocolor-context** | Empiezas **cualquier** tarea de DinoColor. Fija ruta, stack e invariantes. Casi siempre va primera. |
| **dinocolor-qa-visual** | Hay que revisar pantallas y corregir bugs visuales/UX (recortes, HUD, tablero, responsive, consola). |
| **dinocolor-performance** | Optimizar rendimiento sin tocar mecánica (peso de `dist/`, GLB, re-renders, memo, fugas, bundle). |
| **dinocolor-git-safe** | Cualquier operación de Git: revisar estado, preparar commits, evitar push/deploy accidentales. |
| **dinocolor-mascot-3d** | Trabajar con T-Rexo/Oliver: encuadre, que no se corte/tape nada, animaciones (¡ojo con `SAFE_CLIPS`!). |
| **dinocolor-deploy-pages** | Deploy a GitHub Pages por Actions, verificar la publicación, sin romper `base`/Capacitor. |
| **dinocolor-prompt-shortcuts** | Chuleta de cómo formular prompts cortos combinando skills. |

## 4. Ejemplos de prompts cortos

```
Usa dinocolor-context + dinocolor-qa-visual. Revisa todas las pantallas, corrige bugs y valida build.
Usa dinocolor-performance. Detecta 10 mejoras de rendimiento seguras y aplícalas sin cambiar mecánica.
Usa dinocolor-git-safe. Revisa el estado del repo, prepara un commit local y no hagas push.
Usa dinocolor-mascot-3d. Corrige el encuadre de T-Rexo en ResultScene y valida build.
Usa dinocolor-deploy-pages. Verifica que GitHub Pages sigue funcionando tras el último push.
```

Fórmula: **`Usa <skills>. <acción concreta>. <restricción, p. ej. "sin push">.`** Ver `dinocolor-prompt-shortcuts` para más.

## 5. Reglas generales del proyecto (resumen — el detalle está en cada skill y en `CLAUDE.md`)

- Trabajar solo en `03_juegos/dinocolor`. No tocar TREXoRoll ni otros juegos.
- Mobile-first. Sin `@react-three/drei`. Sin dependencias nuevas sin justificar.
- `npm run build` en toda validación importante. `dist/` y `node_modules/` fuera de Git.
- No `push`/deploy/commit sin permiso explícito.
- Mascota en runtime = **T-Rexo** (0,9 MB). **Oliver no vuelve a `public/`** sin optimizar (< 5 MB). Solo el clip **`idle`** de T-Rexo es seguro; la emoción se hace con **poses** de cuerpo entero.
- No cambiar mecánica, niveles, scoring ni el `base: './'` de Vite.

## 6. Cómo añadir una skill nueva

1. Crea `.claude/skills/<nombre-en-kebab-case>/SKILL.md`.
2. Empieza con frontmatter:
   ```
   ---
   name: <nombre-en-kebab-case>   # igual que la carpeta
   description: <qué hace y CUÁNDO usarla — esto decide su relevancia>
   ---
   ```
3. En el cuerpo: instrucciones claras y **verificables**. Asume que `dinocolor-context` ya se cargó (no repitas lo básico).
4. Encódea **hechos reales y actuales**, no supuestos: si algo cambió (assets, estado del repo, comportamiento), actualiza la skill afectada. Una skill con datos falsos causa regresiones.
5. Añade una fila a la tabla del punto 3 y, si aplica, un ejemplo en `dinocolor-prompt-shortcuts`.
6. Mantén cada skill **enfocada**: una responsabilidad por skill; combínalas en el prompt.

> Estas skills son **documentación/instrucciones**: no ejecutan nada por sí solas ni modifican el juego. Guían cómo Claude debe trabajar cuando las invocas.
