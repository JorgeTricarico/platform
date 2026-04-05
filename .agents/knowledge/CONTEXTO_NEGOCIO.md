# 👥 Contexto Personal y Organizacional — Zenco

Este documento captura **toda la información personal, organizacional y de contexto de negocio** compartida durante la conversación fundacional del proyecto Zenco. Es la fuente de verdad humana del proyecto.

---

## 🦊 Sobre el Nombre y la Marca

- **Nombre oficial:** **Zenco** (se escribe con **K** cuando aplica rediseño de marca: **Zenko**)
- **Concepto visual:** Zorro Kitsune (nueve colas), colores ámbar/naranja/marrón tierra, estética japonesa minimalista/Zen
- **Logo:** Generado por IA — Zorro Kitsune estirándose, tonos cálidos, fondo crema. Archivo: `src/assets/logo.png`
- **Dominio conceptual:** `zenco.arg` (aún no registrado)

---

## 👤 Los Participantes del Proyecto

### Ana
- **Rol en Zenco:** Dueña y operadora principal del taller
- **Formación:** Graduada en Diseño e Indumentaria
- **Actividad:** Cose, diseña, gestiona los arreglos de ropa
- **Necesidad Principal:** Que el bot atienda a los clientes por WhatsApp sin que ella tenga que interrumpir su trabajo manual para revisar mensajes
- **Nombre en el Dashboard:** El panel dice "Hola, Ana 👋" al iniciar

### Ariel
- **Relación:** Pareja de Ana
- **Rol en Zenco:** Futuro co-responsable del negocio (rol administrativo/operativo)
- **Contexto:** Está pronto a dedicarse full-time a cooperar en Zenco
- **Limitación declarada:** No sabe coser ni conoce el rubro de la indumentaria
- **Objetivo:** Fortalecer el negocio en todos aspectos NO técnicos de costura (gestión, comunicación, administración, tecnología)
- **Por eso el sistema:** El Dashboard fue diseñado para que Ariel pueda operar el negocio sin necesitar conocimiento de costura

### Jorge (El Usuario — Tú)
- **Rol en el emprendimiento:** Co-fundador tecnológico / Arquitecto del sistema
- **Actividad principal (trabajo):** QA Automation Engineer en OneVisa (proyecto `Agent-Automation-TS`)
- **Rol en Zenco:** Conseguir los primeros clientes y desarrollar la plataforma tecnológica
- **Visión de negocio:** Vender la configuración del sistema (bot + dashboard + infra) como servicio a otros pequeños emprendimientos
- **Primer cliente conseguido:** Damián (masajista / centro de estética)
- **Herramientas que maneja:** WSL, VS Code, Git, Docker, GitHub, Antigravity AI

---

## 🤝 Primer Cliente Externo: Damián

- **Nombre:** Damián
- **Negocio:** Centro de masajes / estética (nombre del negocio no definido aún)
- **Relación con Jorge:** Persona de confianza conseguida por Jorge
- **Propósito en el roadmap:** Primer cliente pagador de la plataforma Zenco
- **Servicios (a definir):** Masajes relajantes, posiblemente limpieza facial u otros tratamientos
- **Diferencia con Zenco:** En vez de gestionar *Prendas*, gestionará *Turnos* (Appointments) con fecha y horario
- **Estado del desarrollo:** Carpetas `damian-frontend/` y `damian-bot/` creadas pero sin customización de identidad visual aún

---

## 💼 Plan de Negocio del Emprendimiento (Largo Plazo)

### La Propuesta de Valor
Vender como servicio **"el ecosistema tecnológico completo"** a pequeños emprendimientos locales argentinos que no tienen recursos para contratar desarrolladores:

> **Paquete Zenco para Emprendedores:**
> - Dashboard web premium para gestión interna
> - Bot de WhatsApp con IA que atiende clientes 24/7
> - Base de datos en la nube (Supabase)
> - Dominio y deploy en internet (Vercel + Koyeb)
> - Onboarding + soporte inicial

### Modelo de Monetización (Hipótesis Inicial)
- **Setup inicial:** Cobro único por configurar el sistema
- **Suscripción mensual:** Mantenimiento, hosting, y actualizaciones
- **Expansión:** Agregar más "módulos" (Google Calendar, pagos, etc.) como add-ons de precio

### Pipeline de Clientes
| Cliente | Negocio | Estado |
|---------|---------|--------|
| Ana + Ariel | Zenco (Arreglos de Ropa) | 🟢 Proyecto propio / "familiar" |
| Damián | Centro de Masajes | 🟡 Primer cliente externo — acordado |
| Futuros | Cualquier pequeño emprendimiento (peluquerías, talleres, clínicas) | 🔴 Backlog |

### Estrategia de Infraestructura (Multi-tenant)
- Un único VPS aloja **múltiples Docker containers** (uno por cliente)
- Cada cliente entra por un endpoint/puerto diferente
- Costos compartidos = mayor margen de ganancia para el emprendimiento

---

## 🏗️ Contexto Técnico Personal de Jorge

- **Repo de trabajo QA:** `C:\Users\admin\Documents\Github\Agent-Automation-TS`
- **Repo de Zenco:** `C:\Users\admin\Documents\Github\Zenko`
- **Sistema operativo:** Windows con WSL2 (Ubuntu/Linux dentro de Windows)
- **API Keys disponibles en Agent-Automation-TS/.env:**
  - `GEMINI_API_KEY` ✅
  - `MISTRAL_API_KEY` ✅
  - `XAI_API_KEY` (Grok) ✅
  - `GITHUB_TOKEN` ✅
  - `GH_TOKEN_CROSS_REPO` ✅
  - `SAMBANOVA_API_KEY` (inferido del .env.example)
- **Preferencias declaradas:**
  - Le gustan las pruebas rápidas y simples (smoke tests), no complejas
  - Prefiere Playwright sobre extensiones de navegador lentas para capturas de pantalla
  - Prioriza ver resultados visuales rápido antes que perfección técnica

---

## 📱 Sobre el Bot de WhatsApp

- **Número de WhatsApp Business:** Zenco ya tiene WhatsApp Business activo
- **Estrategia de conexión:** Baileys (escaneo de código QR) — sin pagar API de Meta Business
- **Motor de IA:** Google Gemini 1.5 Flash (gratuito con límites generosos)
- **Comportamiento esperado del Bot:**
  - Atender consultas de clientes sobre el estado de sus arreglos
  - Responder amablemente en nombre de "Ana de Zenco"
  - Reducir al mínimo la intervención humana de Ana para responder mensajes rutinarios
