---
name: Session 22 Reflection
description: Z22 ingresos Zenko, D28 ingresos Damian, Z25 stale garments, 356 tests, finance type inconsistency
type: project
---

**Session 22 (2026-04-07)**: Dashboard income + stale garments features.

**Completed:**
- Z22: monthlyIncome/monthlyExpenses server-side en GET /api/zenco/dashboard + card "Ingresos del Mes"
- D28: GET /api/damian/dashboard/monthly-income + MonthlyIncomeWidget (income/expenses/balance)
- Z25: GET /api/zenco/dashboard/stale-garments (status='listo', deliveryDate >7 días) + StaleGarmentsWidget
- D30: Ya existía (StalePatientWidget confirmado)
- 356 tests (343 → 356, +13)

**Key decisions:**
- Z22 movido a server-side (antes era client-side con todas las finances)
- Z25 usa deliveryDate como proxy de "sin retirar" (no hay statusChangedAt)
- Finance types inconsistentes: Zenko='ingreso'/'gasto', Damian='income'/'expense'

**Why:** Dashboard features para dar visibilidad de ingresos y prendas pendientes a Ana y Damian.

**How to apply:**
- Normalizar finance types es deuda técnica pendiente
- Agregar statusChangedAt a Order mejoraría Z25 tracking
- StaleGarmentsWidget no tiene dashboard-refresh listener (Damian widgets sí)
