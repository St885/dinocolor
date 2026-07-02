# www/ — (reservado)

Carpeta reservada por convención del workspace. En DinoColor, **el build web de producción
se genera en `dist/`** (salida estándar de Vite), y es esa carpeta la que Capacitor
sincroniza (`webDir: "dist"` en `capacitor.config.json`).

No es necesario poner nada aquí. Se mantiene como marcador para alinearse con la estructura
del resto de juegos del workspace.

Para generar el build:

```bash
npm run build     # -> dist/
npm run preview   # sirve dist/ para probarlo
```
