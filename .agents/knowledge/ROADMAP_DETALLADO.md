# 🗺️ Roadmap Estratégico Detallado — Zenco Plataforma

> Documento vivo. Actualizar al cerrar cada Sprint.
> Última actualización: Sesión Fundacional (Abril 2026)

---

## SPRINT 1 ✅ COMPLETADO — UI/UX y Estructura Base

**Objetivo:** Tener una demo funcional y premium del Dashboard que impresione a potenciales clientes.

### Entregables completados:
- [x] Proyecto React + Vite + TypeScript inicializado
- [x] Design System CSS Variables (paleta Kitsune: `#D66D26`, `#F6F1EA`, `#2C1A0E`)
- [x] Fuente: Google Fonts Inter/Outfit (moderna y limpia)
- [x] Dashboard con 3 KPIs: Prendas Pendientes, Balance Mensual, Próximas a Vencer
- [x] Tabla de Prendas Urgentes (ordenadas por fecha de vencimiento más próxima)
- [x] Módulo Gestión de Prendas con filtro de búsqueda
- [x] Módulo Finanzas (ingresos/gastos/balance)
- [x] Modal "Nueva Orden" con formulario completo (cliente, prenda, arreglo, precio, fecha)
- [x] Logo del Zorro Kitsune generado por IA integrado en sidebar
- [x] Smoke tests E2E con Playwright
- [x] Smoke tests unitarios con Vitest

---

## SPRINT 2 ✅ COMPLETADO — Motor IA y WhatsApp

**Objetivo:** Cerebro del sistema autooperativo.

### Entregables completados:
- [x] Backend Node.js + Express API (puerto 3000)
- [x] Prisma ORM con modelos `Order` y `FinancialEntry`
- [x] Base de datos SQLite local funcional
- [x] Seed inicial de datos de prueba
- [x] Bot de WhatsApp usando `@whiskeysockets/baileys` (sin costo Meta API)
- [x] Integración Gemini 1.5 Flash con **Function Calling** habilitado
- [x] Tool `check_garment_status` → consulta DB real en tiempo real
- [x] Respuesta automática en español, amigable como "Ana de Zenco"

---

## SPRINT 3 🟡 EN PROGRESO — Deploy e Infraestructura

**Objetivo:** Sacar el sistema de la computadora local y subirlo a internet gratis.

### Pendiente:
- [ ] **BLOCKER:** Crear repositorio GitHub `Zenko` y hacer `git push`
- [ ] Crear cuenta en Supabase y obtener `DATABASE_URL` de PostgreSQL
- [ ] Cambiar Prisma de `sqlite` → `postgresql` (schema ya preparado)
- [ ] Hacer `npx prisma db push` contra Supabase
- [ ] Crear cuenta en Vercel → conectar repo GitHub → configurar `VITE_API_URL`
- [ ] Crear cuenta en Koyeb → conectar repo GitHub → configurar `GEMINI_API_KEY` + `DATABASE_URL`
- [ ] Verificar que la URL de la API del backend es accesible públicamente
- [ ] Primer QR scan del Bot en producción
- [ ] Documentar URL final del Dashboard para entregar a Ana

---

## SPRINT 4 🔴 PENDIENTE — Negocio de Damián (Masajes)

**Objetivo:** Adaptar la arquitectura para el primer cliente externo.

### Tareas:
- [ ] Definir nombre oficial del negocio de Damián
- [ ] Elegir paleta de colores (sugerencia: verde bambú/azul spa/lavanda)
- [ ] Generar logo por IA para Damián
- [ ] Customizar `damian-frontend/src/index.css` con nueva paleta
- [ ] Reemplazar "Prendas" por "Turnos" en el Frontend de Damián
- [ ] Adaptar schema Prisma en `damian-bot/` para modelo `Appointment { serviceName, duration, date, time }`
- [ ] Cambiar System Prompt del bot: "Eres el recepcionista de [Negocio de Damián]..."
- [ ] Agregar los servicios reales de Damián al seed de la DB
- [ ] Configurar puerto distinto (`:5174` Frontend, `:3001` Backend)
- [ ] Actualizar `docker-compose.yml` para orquestar ambos negocios
- [ ] Deploy paralelo de Damián (segunda instancia en Vercel + Koyeb)

---

## SPRINT 5 🔴 FUTURO — Google Calendar & Turnos

**Objetivo:** Automatizar la agenda de Damián (y eventualmente de Zenco).

### Ideas:
- [ ] Integrar Google Calendar API para que el bot pueda agendar turnos automáticamente
- [ ] Detección de horarios disponibles en tiempo real
- [ ] Confirmación automática vía WhatsApp con fecha/hora del turno
- [ ] Recordatorio automático 24hs antes del turno

---

## SPRINT 6 🔴 FUTURO — Expansión Comercial

**Objetivo:** Escalar el modelo a más clientes.

### Ideas de producto:
- [ ] Panel de Admin Multi-negocio (ver todos los clientes desde un solo panel)
- [ ] Generador automático de nuevos proyectos (script que clona la carpeta base y muta el config)
- [ ] Landing page de venta del servicio (`zenco.arg` o nombre definitivo)
- [ ] Módulo de pagos (MercadoPago API para cobrar los arreglos online)
- [ ] Reportes PDF automáticos semanales/mensuales para Ana
- [ ] Notificaciones push cuando una prenda está lista para retirar

---

## 💡 Ideas y Posibles Features (Backlog sin Sprint Definido)

- Sistema de clientes frecuentes (historial de órdenes por cliente)
- Fotos de las prendas adjuntas a cada orden
- QR en cada prenda física para escanear y ver el estado en el sistema
- WhatsApp "masivo" para notificar que hay prendas listas para retirar
- Integración con Instagram DMs de Zenco
- Módulo de presupuesto automático (el bot estima el precio según el tipo de arreglo)
