# DinoColor — Notas para Google Play (futuro)

> Pendiente hasta que se decida publicar. No empaquetar Android sin confirmación de Stefano.

## Identidad de la app

- **Nombre:** DinoColor
- **appId (package):** `com.st885.dinocolor` (ver `capacitor.config.json`)
- **Categoría sugerida:** Juegos › Casual / Educativo (apto para niños)
- **Orientación:** vertical (portrait)

## Empaquetado con Capacitor (resumen)

```bash
npm run build        # genera dist/
npm run cap:add      # solo la primera vez: crea android/
npm run cap:sync     # copia dist/ a android/ y sincroniza plugins
npm run cap:open     # abre Android Studio para compilar el AAB/APK
```

El proyecto `android/` es **generado/regenerable** y NO se versiona (ver `.gitignore`):
así el repo web queda limpio y se evita colar secretos nativos (keystore,
google-services.json, etc.).

## Checklist antes de publicar

- [ ] Iconos y splash (adaptar de `assets/images/ui/`).
- [ ] Política de privacidad publicada (borrador en `playstore/privacy-policy-draft.md`).
- [ ] Ficha de tienda (borrador en `playstore/store-listing-draft.md`).
- [ ] Clasificación de contenido (apta para niños) y formulario de público objetivo.
- [ ] Firma de la app (keystore guardado FUERA del repo).
- [ ] Cumplimiento de políticas de Families si se dirige a menores.
- [ ] Si se añaden anuncios (AdMob) o compras: declarar y configurar consentimiento.

## Monetización (futuro)

Anuncios **recompensados** (AdMob) y/o compras dentro de la app. Diseñar un punto único de
"otorgar recompensa" para enchufar AdMob/IAP sin tocar la lógica del juego.
