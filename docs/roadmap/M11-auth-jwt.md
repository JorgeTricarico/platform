# M11: Auth Básica (JWT)

## Problemática
Todos los endpoints de la API están abiertos — cualquiera con la URL puede hacer CRUD completo sobre los datos de ambos negocios. No hay autenticación ni autorización.

## Estado actual (sesión 12 — parcial)

### Completado (backend)
- Modelo `User` en Prisma (email, passwordHash, name, role, business)
- Paquetes: `jsonwebtoken` + `bcryptjs`
- `POST /api/auth/register` — crea usuario, hashea password, devuelve JWT
- `POST /api/auth/login` — valida credenciales, devuelve JWT
- Middleware `authenticate` — valida Bearer token en header
- Middleware `requireBusiness(biz)` — restringe acceso por negocio (zenco/damian/all)
- Todos los endpoints protegidos con auth + business check
- `/health` y `/api/auth/*` permanecen públicos
- 18 tests nuevos, 216 backend tests passing

### Pendiente (frontend + infra)
1. **JWT_SECRET en Render** — Agregar env var en los 3 servicios
2. **Login UI** — Crear pantalla de login en ambos clientes
3. **Token storage** — Guardar JWT en localStorage, incluir en headers de API calls
4. **CORS restrictivo** — Limitar origins a las URLs de Render + localhost
5. **Auto-logout** — Redirigir a login cuando token expira (401)
6. **Seed script** — Crear usuarios iniciales (Ana/Ariel para zenco, Damian para damian, Jorge para all)
7. **Migración DB** — Correr `prisma db push` para crear tabla `users` en Supabase

## Archivos clave
- `backend/src/middleware/auth.ts` — authenticate, requireBusiness, signToken
- `backend/src/routes/auth.ts` — register, login
- `backend/src/schemas.ts` — registerSchema, loginSchema
- `backend/prisma/schema.prisma` — modelo User
- `backend/src/__tests__/auth.test.ts` — 18 tests

## Criterio de aceptación (completo)
- [ ] JWT_SECRET configurado en Render
- [ ] Tabla users creada en Supabase
- [ ] Login UI funcional en ambos clientes
- [ ] Token persistido y enviado en todos los requests
- [ ] CORS restringido a origins conocidos
- [ ] 401 → redirect a login automático
