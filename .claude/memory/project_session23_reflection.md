---
name: Session 23 Reflection
description: Finance normalization bug fix, statusChangedAt, Z26 Avisar, D29 Próxima Cita, audit findings
type: project
---

## Session 23 (2026-04-07)

### Completed
- Finance normalization: Zenko backend 'ingreso'/'gasto' → 'income'/'expense' (was a live bug)
- statusChangedAt String? added to Order model, set on every status change
- Z26: "Avisar" WhatsApp button in StaleGarmentsWidget with reminder message
- D29: "Próxima Cita" widget in patient detail page with dedicated endpoint
- 371 tests (356 → 371, +15 new)

### Audit Findings (prioritized for next session)
1. **Bug**: Damian Finances.tsx shares `submitting` state between create/edit forms
2. **Bug**: Notification.clientId stores phone number, not actual client ID
3. **Performance**: No indexes on Order.status, Order.deliveryDate, Appointment.date, finance dates
4. **Validation**: createFinanceSchema.type accepts any string (should be z.enum)
5. **Race condition**: Sequential Order ID generation can collide under concurrent POSTs
6. **Silent errors**: WhatsApp catch blocks have no logging
7. **Missing guards**: Patient record endpoints don't verify clientId exists
8. **Duplication**: 6+ components identical between zenko/damian (ToastContext, OfflineIndicator, AuthContext, etc.)
9. **Schema gap**: Appointment has no FK to Client, lookup by clientName is approximate
