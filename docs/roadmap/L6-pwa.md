# L6: Progressive Web App (PWA)

## Problematica

Ana y Damian usan la app principalmente desde el celular. Como web normal no tiene icono en el home screen, no funciona offline y la experiencia no es comparable a una app nativa. Esto genera friccion en el uso diario.

## Contexto

La app esta construida con Vite + React. Vite tiene soporte nativo para PWA via el plugin `vite-plugin-pwa`. Convertirla en PWA mejora significativamente la experiencia movil sin necesidad de publicar en app stores.

## Implementacion propuesta

- Instalar y configurar `vite-plugin-pwa` en el proyecto frontend.
- Crear `manifest.json` con:
  - Nombre de la app, nombre corto
  - Iconos en multiples tamanos (192x192, 512x512)
  - Color de tema y background
  - `display: "standalone"` para experiencia app-like
- Configurar un service worker basico con estrategia de cache:
  - Assets estaticos: cache-first
  - API calls: network-first (no cachear datos criticos offline)
- Crear iconos en los tamanos requeridos para iOS y Android.
- Agregar meta tags en `index.html` para soporte iOS (Apple touch icon, status bar).

## Criterio de aceptacion

- La app puede instalarse desde Chrome en Android mostrando el prompt "Agregar a pantalla de inicio".
- Aparece un icono de la app en el home screen del celular.
- La app abre en modo standalone (sin barra del navegador).
- Los assets estaticos cargan aunque haya conexion lenta (cacheados).

## Notas

- Generar iconos desde un SVG maestro para consistencia.
- Testear en iOS Safari (el soporte PWA es mas limitado que en Chrome Android).
- El service worker debe actualizarse correctamente cuando hay un nuevo deploy (evitar usuarios con version vieja).
