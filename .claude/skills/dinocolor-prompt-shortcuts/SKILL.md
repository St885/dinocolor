---
name: dinocolor-prompt-shortcuts
description: Cómo escribir prompts CORTOS para DinoColor combinando las skills, en vez de repetir instrucciones largas. Úsala como chuleta cuando no recuerdes qué skill pedir o cómo formular la tarea.
---

# dinocolor-prompt-shortcuts

Chuleta para trabajar en DinoColor con prompts cortos. La idea: **el contexto vive en las skills**, tú solo dices *qué skills usar* + *qué quieres* + *qué NO hacer*.

## Fórmula de un buen prompt corto

```
Usa <skill(s)>. <acción concreta y acotada>. <restricción clave, p. ej. "no hagas push">.
```

Con eso, las reglas de ruta, mobile-first, sin drei, sin push/deploy, validar build, etc. ya están cubiertas por las skills (empezando por `dinocolor-context`).

## Ejemplos listos para copiar

- **QA visual de una pantalla**
  `Usa dinocolor-context y dinocolor-qa-visual. Revisa GameScene, corrige bugs visuales y valida build. No hagas push.`

- **QA visual de todo el juego**
  `Usa dinocolor-context + dinocolor-qa-visual. Revisa todas las pantallas, corrige bugs y valida build.`

- **Rendimiento**
  `Usa dinocolor-performance. Detecta 10 mejoras de rendimiento seguras y aplícalas sin cambiar mecánica.`

- **Git seguro**
  `Usa dinocolor-git-safe. Revisa el estado del repo, prepara un commit local claro y no hagas push.`

- **Mascota**
  `Usa dinocolor-mascot-3d. Corrige el encuadre de T-Rexo en ResultScene y valida build.`

- **Deploy**
  `Usa dinocolor-deploy-pages. Verifica que GitHub Pages sigue funcionando después del último push.`

- **Combinado**
  `Usa dinocolor-context + dinocolor-mascot-3d + dinocolor-qa-visual. La mascota se corta en Start; arréglalo, revisa que no tape nada y valida build. Sin push.`

## Reglas para que los prompts cortos funcionen

1. **Empieza casi siempre por `dinocolor-context`** (o combínalo): fija ruta, stack e invariantes.
2. **Nombra la skill específica** de la tarea (`qa-visual`, `performance`, `git-safe`, `mascot-3d`, `deploy-pages`).
3. **Sé concreto en la acción** ("revisa GameScene y corrige el HUD que tapa el tablero"), no genérico.
4. **Di explícitamente lo que NO quieres** cuando importe: `no hagas push`, `no cambies mecánica`, `solo documentación`.
5. **Pide validación** cuando aplique: `valida build`, `enséñame capturas`, `lista archivos modificados`.
6. Si vas a hacer algo grande o multiagente, dilo aparte; las skills asumen cambios acotados y seguros.

## Qué NO hace falta repetir (ya está en las skills)

Ruta `03_juegos/dinocolor` · no tocar otros juegos/TREXoRoll · mobile-first · sin `@react-three/drei` · sin dependencias nuevas · `npm run build` en validaciones · no `dist/`/`node_modules/` en Git · no push/deploy sin permiso · Oliver no vuelve a runtime sin optimizar · solo `idle` es clip seguro de T-Rexo.
