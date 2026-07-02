# android/ — (reservado, futuro)

Carpeta reservada para el proyecto **Android nativo generado por Capacitor**.

Todavía **no se usa**. Se generará automáticamente cuando se integre Capacitor:

```bash
npm run build      # genera dist/
npm run cap:add    # crea esta carpeta android/ (solo la primera vez)
npm run cap:sync   # sincroniza el build web con android/
npm run cap:open   # abre Android Studio
```

El contenido de `android/` es **regenerable** y, salvo configuración curada, no se versiona
(ver `.gitignore` en la raíz). Nunca subir aquí secretos nativos (keystore,
`google-services.json`, `local.properties`, etc.).

> Requiere confirmación de Stefano antes de integrar Capacitor/Android.
