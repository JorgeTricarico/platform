---
name: Fake Timers + waitFor
description: vi.useFakeTimers() bloquea waitFor de testing-library — fix con shouldAdvanceTime
type: feedback
---

`vi.useFakeTimers()` sin opciones bloquea `waitFor` de React Testing Library porque `waitFor` usa `setInterval` internamente para polling, y los fake timers lo interceptan.

**Why:** Descubierto en sesión 20 al escribir tests de D23 (filtro por fecha). Los tests con `waitFor` colgaban a 5000ms de timeout.

**How to apply:** Siempre que necesites mockear `new Date()` con `vi.setSystemTime()`:
```ts
vi.useFakeTimers({ shouldAdvanceTime: true }); // ← crítico
vi.setSystemTime(new Date('2026-04-07T12:00:00'));
```
Esto permite controlar `Date` mientras el tiempo real sigue avanzando para que `waitFor` funcione.
