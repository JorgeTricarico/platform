# L3: Arquitectura Multi-Tenant

## Problematica

Hoy cada negocio tiene rutas y logica hardcodeadas en el codigo. Si se agrega un tercer negocio, hay que duplicar rutas, controladores y configuracion. Esto no escala.

## Contexto

La plataforma actualmente soporta dos negocios (Zenko y Damian) con rutas especificas para cada uno (ej: `/api/zenko/...`, `/api/damian/...`). Cada vez que se onboardea un nuevo cliente se requiere trabajo de desarrollo, lo que limita el crecimiento y aumenta el riesgo de inconsistencias entre negocios.

## Implementacion propuesta

- Crear un archivo de configuracion por negocio que defina:
  - Nombre del negocio
  - Modelos de AI a usar
  - Features habilitadas (chatbot, appointments, garments, etc.)
  - Configuracion especifica (horarios, servicios, etc.)
- Implementar rutas genericas del tipo `/api/:business/*` que resuelvan el negocio dinamicamente desde la config.
- Crear un factory de endpoints que genere los handlers correspondientes segun las features habilitadas en la config.
- El middleware de autenticacion y rate limiting aplica igualmente a todos los negocios.

**Ejemplo de config:**
```json
{
  "id": "nuevo-negocio",
  "name": "Mi Negocio",
  "models": { "chat": "gemini-2.0-flash" },
  "features": ["chatbot", "appointments"]
}
```

## Criterio de aceptacion

- Agregar un nuevo negocio requiere solo agregar un archivo de configuracion, sin modificar codigo de rutas ni controladores.
- Los negocios existentes (Zenko, Damian) funcionan sin cambios visibles.
- Las rutas `/api/:business/*` resuelven correctamente para cada negocio.

## Notas

- Mantener compatibilidad con rutas actuales durante la migracion (alias o redirect).
- La config de cada negocio puede vivir en DB o en archivos, evaluar segun necesidad de hot-reload.
- Aplicar esta arquitectura primero en el backend; el frontend puede seguir en una segunda fase.
