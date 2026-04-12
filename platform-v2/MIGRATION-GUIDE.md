# Guía de Migración: Platform v1 → Platform v2

Este documento describe el proceso paso a paso para migrar desde la arquitectura actual (`clients/zenko`, `clients/mg_masajes`, `backend/` con rutas hardcodeadas) hacia la nueva arquitectura multi-tenant de platform-v2.

**Tiempo estimado total:** 5–6 semanas  
**Riesgo:** Medio — la estrategia de ejecución paralela permite rollback en cualquier momento  
**Responsable:** Jorge Tricarico

---

## Índice

- [Contexto: qué estamos migrando](#contexto-qué-estamos-migrando)
- [Principio guía: ejecución paralela](#principio-guía-ejecución-paralela)
- [Fase 1 — Arranque en paralelo](#fase-1--arranque-en-paralelo-semana-1-2)
- [Fase 2 — Migración de datos](#fase-2--migración-de-datos-semana-2-3)
- [Fase 3 — Verificación de paridad de features](#fase-3--verificación-de-paridad-de-features-semana-3-4)
- [Fase 4 — Cutover](#fase-4--cutover-semana-4-5)
- [Fase 5 — Limpieza](#fase-5--limpieza-semana-5-6)
- [Tabla de riesgos](#tabla-de-riesgos)
- [Checklist de testing completo](#checklist-de-testing-completo)
- [Procedimiento de rollback](#procedimiento-de-rollback)

---

## Contexto: qué estamos migrando

### Estado actual (Platform v1)

```
Platform/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── zenco.ts           ← rutas hardcodeadas para Zenko
│   │   │   ├── mg_masajes.ts      ← rutas hardcodeadas para MG Masajes
│   │   │   └── ...
│   │   └── index.ts
│   └── prisma/schema.prisma       ← schema con tablas separadas por tenant
│
├── clients/
│   ├── zenko/                     ← app React independiente
│   │   ├── src/pages/
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── mg_masajes/                ← app React independiente (código duplicado)
│       ├── src/pages/
│       ├── vite.config.ts
│       └── package.json
```

**Problemas de la arquitectura actual:**
- Código de frontend ~60% duplicado entre `clients/zenko` y `clients/mg_masajes`
- Rutas del backend separadas por tenant (`/zenco/*`, `/mg_masajes/*`) en lugar de `/api/:tenant/*`
- Finanzas en tablas separadas (`zenco_finances`, `mg_masajes_finances`) en lugar de una tabla unificada
- Configuración de tenant dispersa entre variables de entorno, código hardcodeado y comentarios
- Agregar un nuevo tenant requiere duplicar código, no solo configuración
- Desplegado en Render (más caro, menos control)

### Estado objetivo (Platform v2)

- Monorepo Turborepo con packages compartidos
- Un backend con rutas `/api/:tenant/*` genéricas
- Un frontend compilado por tenant via `VITE_TENANT`
- Configuración declarativa en `tenants/<slug>/config.ts`
- Tabla `Finance` unificada con campo `tenantId`
- Desplegado en Coolify/Hetzner (más barato, más control)

---

## Principio guía: ejecución paralela

**Nunca apagar el sistema viejo antes de que el nuevo esté validado.**

La estrategia es:
1. Platform v2 corre en puertos distintos (backend `:3001`, web `:5174`)
2. Render sigue activo hasta el cutover final
3. La base de datos de producción se usa como fuente de verdad para el dump de migración
4. El DNS se redirige solo cuando platform-v2 pasa todos los checks
5. El código viejo se elimina solo después de 2 semanas de estabilidad en producción

---

## Fase 1 — Arranque en paralelo (Semana 1-2)

**Objetivo:** platform-v2 funciona localmente y en staging sin afectar producción.

### 1.1 Setup del entorno de desarrollo

```bash
# Posicionarse en el nuevo monorepo
cd Platform/platform-v2

# Instalar dependencias de todos los workspaces
npm install

# Verificar que todos los packages buildean
npx turbo build
```

Resultado esperado: `turbo` compila `@platform/types` → `@platform/config` → `@platform/db` → `@platform/api-client` → `@platform/ui` → `apps/backend` → `apps/web` en orden topológico, sin errores TypeScript.

Si hay errores de TypeScript en algún package: resolverlos antes de continuar. Ver `tsconfig.base.json` para la configuración base.

### 1.2 Verificar que los packages se linkean correctamente

```bash
# Comprobar que los imports internos resuelven
node -e "import('@platform/types').then(m => console.log('types OK:', Object.keys(m)))"
node -e "import('@platform/config').then(m => console.log('config OK:', Object.keys(m)))"
```

Si hay problemas de resolución, verificar que cada package tiene `dist/` generado. Correr `npx turbo build --filter=@platform/types` individualmente.

### 1.3 Base de datos local

```bash
# Levantar PostgreSQL en Docker
docker compose -f infra/docker-compose.yml up postgres -d

# Esperar a que esté healthy
docker compose -f infra/docker-compose.yml ps

# Aplicar migraciones
cd packages/db
npx prisma migrate deploy
npx prisma generate
cd ../..
```

Verificar en el cliente Prisma que las tablas se crearon:
```bash
cd packages/db
npx prisma studio
# Abrir http://localhost:5555 y confirmar tablas: tenants, users, clients, orders, appointments...
```

### 1.4 Levantar el nuevo backend en puerto alternativo

```bash
# Modificar temporalmente .env para usar otro puerto
PORT=3001 npx turbo dev --filter=backend
```

Verificar endpoints básicos:
```bash
curl http://localhost:3001/health
# → { "status": "ok", "version": "...", "timestamp": "..." }

curl http://localhost:3001/api/zenco/garments \
  -H "Authorization: Bearer <token>"
# → [ ... lista de órdenes ... ]
```

### 1.5 Comparar respuestas entre backend viejo y nuevo

Para cada endpoint relevante, comparar la respuesta del backend v1 (Render) con el backend v2 (local):

```bash
# Script de comparación — correr para cada endpoint
TENANT=zenco
OLD_BASE=https://api-zenko.onrender.com
NEW_BASE=http://localhost:3001
TOKEN=<jwt-valido>

for ENDPOINT in garments clients finances; do
  echo "=== $ENDPOINT ==="
  echo "--- OLD ---"
  curl -s "$OLD_BASE/api/$ENDPOINT" -H "Authorization: Bearer $TOKEN" | jq 'length'
  echo "--- NEW ---"
  curl -s "$NEW_BASE/api/$TENANT/$ENDPOINT" -H "Authorization: Bearer $TOKEN" | jq 'length'
done
```

Los conteos deben coincidir. Si difieren, hay un problema en la migración de datos o en los filtros del nuevo backend.

### 1.6 Smoke test del frontend

```bash
# Levantar web con tenant Zenko apuntando al nuevo backend
VITE_TENANT=zenco VITE_API_URL=http://localhost:3001 npx turbo dev --filter=web
```

Verificar manualmente en http://localhost:5173:
- [ ] Login funciona
- [ ] Dashboard carga sin errores en consola
- [ ] Lista de prendas/órdenes muestra datos
- [ ] Crear una orden nueva funciona
- [ ] Cerrar sesión funciona

Repetir para MG Masajes:
```bash
VITE_TENANT=mg_masajes VITE_API_URL=http://localhost:3001 npx turbo dev --filter=web
```

### 1.7 Criterio de salida de Fase 1

- [ ] `npx turbo build` completa sin errores TypeScript
- [ ] `npx turbo test` pasa al 100%
- [ ] Backend v2 responde en `:3001` con datos iguales al backend v1
- [ ] Frontend de Zenko y MG Masajes cargan y operan normalmente contra el nuevo backend
- [ ] No hay regresiones en funcionalidad core

---

## Fase 2 — Migración de datos (Semana 2-3)

**Objetivo:** unificar el schema de base de datos para que platform-v2 sea la fuente de verdad.

### 2.1 Análisis del schema actual vs nuevo

Comparar los modelos actuales (backend v1) con el schema de platform-v2:

**Cambios necesarios identificados:**

| Modelo | Estado actual | Estado objetivo | Acción requerida |
|--------|--------------|-----------------|-----------------|
| `Order` | Sin `tenantId` | Con `business` (slug) | Agregar columna, poblar con `'zenco'` |
| `Appointment` | Sin `tenantId` | Con `business` (slug) | Agregar columna, poblar con `'mg_masajes'` |
| `ZencoFinance` | Tabla separada | Tabla `Finance` unificada | Crear nueva tabla, migrar datos, renombrar |
| `MgMasajesFinance` | Tabla separada | Tabla `Finance` unificada | Mergear en tabla `Finance`, eliminar original |
| `Client` | Campo `business` ya existe | Sin cambios | No requiere acción |
| `ChatMessage` | Campo `business` ya existe | Sin cambios | No requiere acción |

### 2.2 Agregar `tenantId` a `Order` y `Appointment`

Crear migración Prisma:

```bash
cd packages/db

# Editar schema.prisma: agregar campo 'business' a Order y Appointment
```

Cambios en `schema.prisma`:

```prisma
model Order {
  // ... campos existentes ...
  business String @default("zenco")   // ← agregar esta línea

  @@index([business])                  // ← agregar este índice
  @@map("orders")
}

model Appointment {
  // ... campos existentes ...
  business String @default("mg_masajes")  // ← agregar esta línea

  @@index([business])                      // ← agregar este índice
  @@map("appointments")
}
```

```bash
npx prisma migrate dev --name "add-tenantid-to-orders-and-appointments"
```

### 2.3 Unificar tablas de finanzas

**Estrategia:** crear una nueva tabla `Finance` con campo `tenantId`, migrar datos de ambas tablas originales, y mantener las tablas viejas como backup por 30 días.

Agregar a `schema.prisma`:

```prisma
// Tabla unificada (NUEVA)
model Finance {
  id          String @id
  tenantId    String           // slug del tenant: "zenco" | "mg_masajes"
  date        String
  type        String           // "ingreso" | "gasto"
  category    String
  amount      Float
  description String

  @@index([tenantId])
  @@index([date])
  @@index([type])
  @@map("finances")
}

// Mantener tablas viejas con @map diferente hasta que se confirme migración OK
model ZencoFinanceLegacy {
  id          String @id
  // ... mismos campos ...
  @@map("zenco_finances_backup")
}

model MgMasajesFinanceLegacy {
  id          String @id
  // ... mismos campos ...
  @@map("mg_masajes_finances_backup")
}
```

```bash
npx prisma migrate dev --name "unify-finance-tables"
```

### 2.4 Script de migración de datos

Crear `infra/scripts/migrate-finances.ts`:

```typescript
import { prisma } from '@platform/db'

async function migrateFinances() {
  console.log('Iniciando migración de finanzas...')

  // 1. Migrar ZencoFinance → Finance
  const zencoFinances = await prisma.$queryRaw<any[]>`
    SELECT * FROM zenco_finances
  `
  console.log(`Migrando ${zencoFinances.length} registros de Zenko...`)

  for (const record of zencoFinances) {
    await prisma.finance.upsert({
      where: { id: record.id },
      create: {
        id: record.id,
        tenantId: 'zenco',
        date: record.date,
        type: record.type,
        category: record.category,
        amount: record.amount,
        description: record.description,
      },
      update: {},
    })
  }

  // 2. Migrar MgMasajesFinance → Finance
  const mgFinances = await prisma.$queryRaw<any[]>`
    SELECT * FROM mg_masajes_finances
  `
  console.log(`Migrando ${mgFinances.length} registros de MG Masajes...`)

  for (const record of mgFinances) {
    await prisma.finance.upsert({
      where: { id: record.id },
      create: {
        id: record.id,
        tenantId: 'mg_masajes',
        date: record.date,
        type: record.type,
        category: record.category,
        amount: record.amount,
        description: record.description,
      },
      update: {},
    })
  }

  // 3. Copiar tablas originales como backup
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS zenco_finances_backup AS SELECT * FROM zenco_finances
  `
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS mg_masajes_finances_backup AS SELECT * FROM mg_masajes_finances
  `

  // 4. Verificación de conteos
  const newCount = await prisma.finance.count()
  const expectedCount = zencoFinances.length + mgFinances.length
  if (newCount !== expectedCount) {
    throw new Error(`Conteo incorrecto: esperaba ${expectedCount}, encontré ${newCount}`)
  }

  console.log(`✓ Migración completa: ${newCount} registros en tabla Finance`)
}

migrateFinances()
  .catch(err => { console.error('Error en migración:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

### 2.5 Probar la migración en copia local de producción

```bash
# 1. Hacer dump de la base de datos de producción
./infra/scripts/backup-db.sh zenco

# 2. Restaurar en PostgreSQL local
pg_restore -d platform_migration_test backup-zenco-$(date +%Y%m%d).dump

# 3. Apuntar al DB de prueba
DATABASE_URL=postgresql://platform:devpassword@localhost:5432/platform_migration_test \
  npx tsx infra/scripts/migrate-finances.ts

# 4. Verificar integridad
DATABASE_URL=... npx tsx infra/scripts/verify-migration.ts
```

### 2.6 Procedimiento de rollback de datos

Si la migración falla o produce datos incorrectos:

```sql
-- Restaurar finanzas originales desde backup
INSERT INTO zenco_finances
  SELECT id, date, type, category, amount, description
  FROM zenco_finances_backup
  ON CONFLICT (id) DO NOTHING;

INSERT INTO mg_masajes_finances
  SELECT id, date, type, category, amount, description
  FROM mg_masajes_finances_backup
  ON CONFLICT (id) DO NOTHING;

-- Las tablas de backup se mantienen por 30 días
-- Eliminar después: DROP TABLE zenco_finances_backup; DROP TABLE mg_masajes_finances_backup;
```

### 2.7 Criterio de salida de Fase 2

- [ ] Migración ejecutada en DB local de prueba sin errores
- [ ] Conteo de registros coincide antes y después de migración
- [ ] `Finance` unificada contiene todos los registros con `tenantId` correcto
- [ ] `Order.business` y `Appointment.business` populados
- [ ] Tablas de backup creadas en producción
- [ ] Backend v2 lee finanzas correctamente desde la nueva tabla unificada
- [ ] Tests de finanzas pasan con la nueva estructura

---

## Fase 3 — Verificación de paridad de features (Semana 3-4)

**Objetivo:** confirmar que platform-v2 implementa el 100% de la funcionalidad actual antes del cutover.

### 3.1 Checklist de paridad — Zenko

#### Módulo de Prendas/Órdenes
- [ ] Listar todas las prendas con filtros (estado, fecha, cliente)
- [ ] Ver detalle de una prenda
- [ ] Crear nueva prenda (campos: cliente, tipo de arreglo, precio, fecha entrega)
- [ ] Editar prenda existente
- [ ] Cambiar estado de prenda (recibido → en proceso → listo → entregado)
- [ ] Registrar `statusChangedAt` al cambiar estado
- [ ] Eliminar prenda
- [ ] Prendas vencidas (sin retirar después de 90 días)
- [ ] Número de orden autoincremental (`orderNumber`)

#### QR y Estado Público
- [ ] Generar ticket QR por orden
- [ ] Imprimir ticket QR
- [ ] Página pública `/status/:orderNumber` accesible sin login
- [ ] Página muestra estado actual de la prenda sin datos sensibles

#### Galería de Fotos
- [ ] Subir foto a una orden
- [ ] Ver galería de fotos de una orden
- [ ] Eliminar foto

#### Clientes
- [ ] Listar clientes con búsqueda por nombre/teléfono
- [ ] Ver historial de prendas de un cliente
- [ ] Crear cliente inline (desde el modal de nueva prenda)
- [ ] Buscar cliente existente antes de crear uno nuevo
- [ ] Eliminar cliente (con cascade a sus órdenes)

#### Finanzas (Zenko)
- [ ] Listar ingresos y gastos con filtro de fecha y tipo
- [ ] Registrar ingreso
- [ ] Registrar gasto
- [ ] Resumen mensual (total ingresos, total gastos, balance)
- [ ] Ingreso automático al marcar prenda como entregada

#### WhatsApp (Zenko)
- [ ] Botón "Avisar que está lista" por prenda (estado = listo)
- [ ] Envío del template `zenko_prenda_lista` al número del cliente
- [ ] Registro de notificación enviada en historial

#### AI Chat (Zenko)
- [ ] Chat con asistente disponible en la UI
- [ ] Herramienta `getOrderStatus` funcional
- [ ] Herramienta `getClientOrders` funcional
- [ ] Herramienta `markOrderReady` funcional
- [ ] Herramienta `getDailySummary` funcional
- [ ] Historial de mensajes persiste en sesión

#### PWA (Zenko)
- [ ] Instalable como PWA en móvil
- [ ] Funciona offline (datos cacheados con Service Worker)
- [ ] Indicador de modo offline visible

---

### 3.2 Checklist de paridad — MG Masajes

#### Módulo de Turnos/Citas
- [ ] Calendario con vista semanal y diaria
- [ ] Listar turnos con filtros (fecha, estado, servicio)
- [ ] Crear nuevo turno (campos: cliente, servicio, fecha, hora, precio, notas)
- [ ] Editar turno existente
- [ ] Cambiar estado del turno (pendiente → confirmado → completado → cancelado)
- [ ] Detección de conflictos: no permitir doble reserva en mismo horario
- [ ] Próxima cita de un cliente
- [ ] Eliminar/cancelar turno

#### Fichas Clínicas
- [ ] Listar fichas de un paciente ordenadas por fecha
- [ ] Crear ficha clínica (motivo, síntomas, áreas, tratamiento, observaciones, próxima sesión)
- [ ] Ver ficha completa
- [ ] Editar ficha
- [ ] Historial clínico completo del paciente

#### Clientes (MG Masajes)
- [ ] CRUD completo de clientes
- [ ] Buscar cliente al crear turno
- [ ] Crear cliente inline desde el modal de turno
- [ ] Ver historial de turnos y fichas de un cliente

#### Finanzas (MG Masajes)
- [ ] Listar ingresos y gastos
- [ ] Registrar ingreso
- [ ] Registrar gasto
- [ ] Resumen mensual

#### WhatsApp (MG Masajes)
- [ ] Enviar confirmación de turno al crear (template `mg_turno_confirmado`)
- [ ] Enviar recordatorio 24h antes (template `mg_recordatorio_turno`)
- [ ] Enviar notificación de cancelación (template `mg_turno_cancelado`)

#### AI Chat + Agente (MG Masajes)
- [ ] Chat con asistente disponible
- [ ] Herramienta `getAvailableSlots` funcional
- [ ] Herramienta `bookAppointment` funcional
- [ ] Herramienta `cancelAppointment` funcional
- [ ] Herramienta `getClientHistory` funcional
- [ ] Flujo completo: usuario consulta disponibilidad → elige slot → agente reserva

#### Música Ambiental (MG Masajes)
- [ ] Reproductor de música ambiental en la UI
- [ ] Controles de play/pause/volumen
- [ ] Persiste entre navegaciones

#### PWA (MG Masajes)
- [ ] Instalable como PWA
- [ ] Funciona offline
- [ ] Indicador offline visible

---

### 3.3 Cómo ejecutar la verificación

Para cada ítem del checklist:

1. **Test automatizado:** verificar que existe un test en Vitest que cubre el comportamiento.
2. **Test manual:** ejecutar el flujo en el browser con el nuevo backend.
3. **Comparar con v1:** tener la app v1 abierta en paralelo y verificar que el comportamiento es idéntico.

Registrar discrepancias en un documento de issues y resolverlas antes de avanzar a Fase 4.

### 3.4 Criterio de salida de Fase 3

- [ ] 100% de ítems del checklist de Zenko verificados
- [ ] 100% de ítems del checklist de MG Masajes verificados
- [ ] Sin discrepancias de comportamiento entre v1 y v2
- [ ] `npx turbo test` pasa al 100% (todos los tests)
- [ ] `npx turbo build` sin errores TypeScript
- [ ] Performance comparable o mejor (tiempo de carga, respuesta de API)

---

## Fase 4 — Cutover (Semana 4-5)

**Objetivo:** redirigir el tráfico de producción de Render a Coolify/Hetzner.

### 4.1 Build de imágenes Docker

```bash
# Build imagen del backend
docker build \
  -f infra/docker/Dockerfile.backend \
  -t ghcr.io/tu-org/platform-backend:latest \
  .

# Build imagen del frontend Zenko
docker build \
  -f infra/docker/Dockerfile.web \
  --build-arg VITE_TENANT=zenco \
  --build-arg VITE_API_URL=https://api.zenco.tudominio.com \
  -t ghcr.io/tu-org/platform-web-zenco:latest \
  .

# Build imagen del frontend MG Masajes
docker build \
  -f infra/docker/Dockerfile.web \
  --build-arg VITE_TENANT=mg_masajes \
  --build-arg VITE_API_URL=https://api.mgmasajes.tudominio.com \
  -t ghcr.io/tu-org/platform-web-mg-masajes:latest \
  .

# Push a GitHub Container Registry
docker push ghcr.io/tu-org/platform-backend:latest
docker push ghcr.io/tu-org/platform-web-zenco:latest
docker push ghcr.io/tu-org/platform-web-mg-masajes:latest
```

### 4.2 Deploy en Coolify

Para cada tenant:

1. En Coolify → Create Resource → Docker Compose
2. Source: GitHub repo, branch `main`
3. Compose file: `platform-v2/infra/tenants/<slug>/docker-compose.yml`
4. Environment variables: cargar desde `infra/tenants/<slug>/.env`
5. Domains: configurar FQDN del tenant
6. Deploy y verificar que el health check pase

```bash
# Verificar que Coolify puede alcanzar los servicios
curl https://api.zenco.tudominio.com/health
curl https://zenco.tudominio.com
```

### 4.3 Migración de datos en producción

**Solo ejecutar cuando los servicios en Coolify estén levantados y verificados.**

```bash
# 1. Poner el backend v1 en modo read-only (si es posible) o anunciar ventana de mantenimiento

# 2. Dump final de producción
./infra/scripts/backup-db.sh zenco
./infra/scripts/backup-db.sh mg_masajes

# 3. Ejecutar migraciones de schema en producción
DATABASE_URL=<prod-db-url> npx prisma migrate deploy

# 4. Ejecutar migración de datos
DATABASE_URL=<prod-db-url> npx tsx infra/scripts/migrate-finances.ts

# 5. Verificar integridad
DATABASE_URL=<prod-db-url> npx tsx infra/scripts/verify-migration.ts
```

### 4.4 Cutover de DNS

> **Este es el paso irreversible de corto plazo.** Asegurarse de que todo lo anterior esté verificado antes de ejecutarlo.

```
Antes: zenco.tudominio.com  →  Render (viejo)
Después: zenco.tudominio.com  →  Coolify/Hetzner (nuevo)
```

Pasos:
1. En el panel DNS (Cloudflare / Route53 / etc.):
   - Cambiar el registro A de `zenco.tudominio.com` a la IP del VPS Hetzner
   - Cambiar el registro A de `api.zenco.tudominio.com` a la misma IP
   - Repetir para `mgmasajes.tudominio.com` y `api.mgmasajes.tudominio.com`
2. TTL recomendado durante la ventana de cutover: 60 segundos
3. Coolify provisiona el certificado SSL automáticamente via Traefik + Let's Encrypt

### 4.5 Monitoreo post-cutover (48 horas)

Monitorear durante 48 horas después del cutover:

```bash
# Verificar que los endpoints responden correctamente
watch -n 30 'curl -s https://api.zenco.tudominio.com/health | jq .status'

# Revisar logs del backend
docker logs platform-backend --follow --tail=100

# Revisar logs del proxy
docker logs coolify-proxy --follow --tail=100
```

**Alertas a configurar en Coolify:**
- Health check falla 3 veces consecutivas → notificación
- Uso de CPU > 80% por más de 5 minutos → notificación
- Error 5xx rate > 1% → notificación

**Criterios de éxito del cutover:**
- [ ] Ambos tenants accesibles via HTTPS en sus dominios nuevos
- [ ] Certificado SSL válido (no warnings en browser)
- [ ] Login funciona para usuarios de producción
- [ ] Datos de producción visibles (órdenes, turnos, finanzas)
- [ ] Sin errores 5xx en los primeros 30 minutos
- [ ] WhatsApp notifications funcionando
- [ ] AI chat respondiendo

### 4.6 Plan de rollback del cutover

Si algo falla después del cutover:

```bash
# 1. Revertir DNS (inmediato)
#    Cambiar registros A de vuelta a la IP de Render
#    TTL bajo (60s) hace que el rollback sea efectivo en ~1 minuto

# 2. Render sigue desplegado — el tráfico vuelve automáticamente

# 3. Investigar el problema en Coolify sin presión
#    El backend v1 en Render sigue siendo la fuente de verdad hasta que se resuelva
```

---

## Fase 5 — Limpieza (Semana 5-6)

**Prerequisito:** 2 semanas de estabilidad en producción con platform-v2. Sin incidentes críticos.

### 5.1 Eliminar código de frontend duplicado

```bash
# Verificar que nada más depende de estos directorios
grep -r "clients/zenko" ./ --include="*.ts" --include="*.json" --exclude-dir=node_modules
grep -r "clients/mg_masajes" ./ --include="*.ts" --include="*.json" --exclude-dir=node_modules

# Si no hay dependencias externas:
rm -rf clients/zenko
rm -rf clients/mg_masajes
```

### 5.2 Eliminar rutas hardcodeadas del backend v1

```bash
# Las rutas del backend v1 ya no se usan
rm backend/src/routes/zenco.ts
rm backend/src/routes/mg_masajes.ts

# Si el backend v1 completo ya no se usa:
rm -rf backend/
```

Actualizar el `package.json` raíz para eliminar referencias a los workspaces eliminados.

### 5.3 Mover platform-v2 a la raíz (opcional)

Si se decide que platform-v2 IS la plataforma (no hay v3 planeada):

```bash
# Mover contenido de platform-v2/ a la raíz del repo
cp -r platform-v2/* .
rm -rf platform-v2/

# Actualizar referencias en CI/CD y documentación
```

### 5.4 Archivar servicios de Render

1. En el panel de Render:
   - Suspender (no eliminar) los servicios de `zenko` y `mg_masajes`
   - Mantener suspendidos por 30 días adicionales como seguro
   - Pasados 30 días: eliminar definitivamente

2. Actualizar variables de entorno para remover tokens de Render del repositorio.

### 5.5 Eliminar tablas de backup de la DB

```sql
-- Ejecutar 30 días después de la migración, cuando esté todo estable
DROP TABLE IF EXISTS zenco_finances_backup;
DROP TABLE IF EXISTS mg_masajes_finances_backup;

-- Limpiar tablas originales si ya no son referenciadas
-- (solo si ZencoFinance y MgMasajesFinance fueron completamente migradas)
DROP TABLE IF EXISTS zenco_finances;
DROP TABLE IF EXISTS mg_masajes_finances;
```

### 5.6 Actualizar CI/CD

- [ ] Actualizar GitHub Actions para buildear desde `platform-v2/` (o raíz si se movió)
- [ ] Actualizar scripts de deploy para apuntar a Coolify en lugar de Render
- [ ] Eliminar secrets de Render de GitHub Secrets
- [ ] Agregar secrets de Coolify (API token, webhook URL)

### 5.7 Criterio de salida de Fase 5 (migración completa)

- [ ] `clients/zenko` y `clients/mg_masajes` eliminados del repo
- [ ] `backend/src/routes/zenco.ts` y `mg_masajes.ts` eliminados
- [ ] Servicios de Render suspendidos
- [ ] CI/CD actualizado y funcionando
- [ ] Tablas legacy eliminadas de la DB de producción
- [ ] Documentación actualizada (este archivo, README.md)
- [ ] Todos los tests pasan en la nueva estructura

---

## Tabla de riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| Datos perdidos en migración de finanzas | Baja | Alto | Backup antes de migrar; tablas originales como fallback 30 días |
| Downtime durante cutover DNS | Baja | Alto | TTL bajo (60s); Render activo como fallback inmediato |
| Feature faltante no detectada en paridad | Media | Medio | Checklist exhaustivo Fase 3; usuarios de prueba por tenant |
| Certificado SSL no provisiona en Coolify | Baja | Alto | Verificar Traefik config antes del cutover; cert manual como backup |
| Performance degradada en Hetzner vs Render | Baja | Medio | Load test antes del cutover; monitoreo en las 48h post-cutover |
| Incompatibilidad de versión Prisma entre v1 y v2 | Media | Alto | Schema compartido; test de migración en copia local de producción |
| Error de autenticación JWT con tokens existentes | Media | Alto | Usar el mismo JWT_SECRET que en producción actual |
| `VITE_TENANT` incorrecto en build de producción | Baja | Alto | Verificar env vars antes del build; smoke test de la app compilada |
| Conflicto de puertos entre v1 y v2 en dev | Alta | Bajo | v2 usa puertos alternativos (3001, 5174) durante la Fase 1 |
| WhatsApp templates no aprobados en la nueva instancia | Media | Medio | Verificar templates existentes antes del cutover; no recrear desde cero |

---

## Checklist de testing completo

### Antes de cada fase

```bash
# Siempre ejecutar antes de avanzar de fase
npx turbo test          # 100% tests pasando
npx turbo typecheck     # sin errores TypeScript
npx turbo build         # build exitoso
```

### Tests de integración por módulo

#### Autenticación
- [ ] `POST /api/auth/login` — credenciales válidas retorna JWT
- [ ] `POST /api/auth/login` — credenciales inválidas retorna 401
- [ ] `GET /api/zenco/garments` sin token retorna 401
- [ ] `GET /api/zenco/garments` con token de tenant diferente retorna 403
- [ ] Token expirado retorna 401 con mensaje claro

#### Prendas (Zenko)
- [ ] `GET /api/zenco/garments` retorna lista paginada
- [ ] `GET /api/zenco/garments?status=listo` filtra correctamente
- [ ] `POST /api/zenco/garments` crea orden con número autoincremental
- [ ] `PATCH /api/zenco/garments/:id` actualiza campos
- [ ] `PATCH /api/zenco/garments/:id/status` registra `statusChangedAt`
- [ ] `DELETE /api/zenco/garments/:id` elimina y retorna 204
- [ ] Tenant isolation: `GET /api/mg_masajes/garments` desde token Zenko → 403

#### Turnos (MG Masajes)
- [ ] `GET /api/mg_masajes/appointments` retorna lista
- [ ] `POST /api/mg_masajes/appointments` crea turno
- [ ] `POST /api/mg_masajes/appointments` con horario ocupado retorna 409
- [ ] `PATCH /api/mg_masajes/appointments/:id` actualiza
- [ ] `DELETE /api/mg_masajes/appointments/:id` elimina

#### Finanzas
- [ ] `GET /api/zenco/finances` retorna solo registros con `tenantId = 'zenco'`
- [ ] `GET /api/mg_masajes/finances` retorna solo `tenantId = 'mg_masajes'`
- [ ] `POST /api/zenco/finances` crea con `tenantId` correcto
- [ ] Sin posibilidad de crear finanzas cross-tenant

#### Clientes
- [ ] `GET /api/zenco/clients` retorna solo clientes de Zenko
- [ ] `POST /api/zenco/clients` con teléfono duplicado retorna 409
- [ ] `DELETE /api/zenco/clients/:id` hace cascade a órdenes y notificaciones

### Tests de performance

```bash
# Instalar k6 para load testing
# k6 run infra/scripts/load-test.js

# O con autocannon (más simple)
npx autocannon -c 10 -d 30 http://localhost:3001/api/zenco/garments \
  -H "Authorization: Bearer $TOKEN"
```

Criterios:
- p95 < 200ms para listas simples
- p95 < 500ms para operaciones con joins
- Sin errores bajo 10 conexiones concurrentes

---

## Procedimiento de rollback

### Rollback de DNS (inmediato, < 2 minutos)

```
1. Abrir panel DNS
2. Cambiar registro A de vuelta a IP de Render
3. Esperar TTL (máximo 60 segundos si se configuró TTL bajo)
4. Verificar: curl https://zenco.tudominio.com → responde desde Render
```

### Rollback de migración de datos

```sql
-- Si la migración de finanzas produjo datos incorrectos
-- Las tablas originales se mantienen como backup

-- Verificar que los backups existen
SELECT COUNT(*) FROM zenco_finances_backup;
SELECT COUNT(*) FROM mg_masajes_finances_backup;

-- Truncar la tabla nueva y restaurar desde backup
TRUNCATE TABLE finances;

INSERT INTO finances (id, tenantId, date, type, category, amount, description)
SELECT id, 'zenco', date, type, category, amount, description
FROM zenco_finances_backup;

INSERT INTO finances (id, tenantId, date, type, category, amount, description)
SELECT id, 'mg_masajes', date, type, category, amount, description
FROM mg_masajes_finances_backup;
```

### Rollback de schema (migraciones Prisma)

```bash
# Revertir última migración
cd packages/db
npx prisma migrate resolve --rolled-back <migration-name>

# Aplicar el estado anterior manualmente si es necesario
npx prisma db push --force-reset   # SOLO EN DEV, nunca en prod
```

> En producción: restaurar desde el backup de DB tomado antes de la migración.
> `pg_restore -d <db-name> backup-pre-migration.dump`

---

## Contacto y soporte

Cualquier duda sobre el proceso de migración o problema encontrado durante las fases:

- Documentar en los archivos de reflexión de sesión (`~/.claude/projects/.../memory/`)
- Revisar `MIGRATION-GUIDE.md` (este archivo) antes de tomar decisiones de rollback
- La arquitectura completa está documentada en `README.md`
