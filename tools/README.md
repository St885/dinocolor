# tools/ — scripts de soporte (reservado)

Carpeta para scripts de desarrollo: validadores de niveles, conversión de modelos 3D
(GLB), generación de assets, smoke tests, etc.

Actualmente **vacía**. Ideas para el futuro (ver `docs/ROADMAP.md`):

- `validate-levels.mjs` — comprobar que cada nivel sea coherente y superable.
- `convert-mascot.mjs` — optimizar/convertir el modelo GLB de la mascota.
- Smoke tests de `scoringSystem` y `boardLayouts`.

Los scripts deben ser ejecutables con Node (`node tools/<script>.mjs`).
