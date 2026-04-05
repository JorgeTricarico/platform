# C1: Tests para el Backend de Damian

## Problematica

El backend de Damian no tiene tests. Cualquier cambio puede romper endpoints sin que haya deteccion automatica.

## Contexto

Los endpoints existentes cubren:
- `appointments` — CRUD completo
- `finances` — registros financieros
- `clients` — gestion de clientes
- `patients/records` — historial de pacientes
- `agent` — integracion con IA

## Implementacion propuesta

1. Instalar dependencias:
```bash
npm install -D vitest supertest @types/supertest
```

2. Configurar `vitest.config.ts` en el directorio del backend de Damian

3. Crear mock global de Prisma (`__mocks__/prisma.ts`) para aislar tests de la DB

4. Implementar tests con enfoque TDD vertical: un test por endpoint por comportamiento

```
tests/
  appointments.test.ts
  finances.test.ts
  clients.test.ts
  patients.test.ts
  agent.test.ts
```

5. Estructura base por test:
```typescript
describe('GET /appointments', () => {
  it('returns list of appointments', async () => {
    // arrange mock
    // act: supertest request
    // assert: status + body shape
  })
})
```

## Criterio de aceptacion

- Todos los endpoints tienen al menos un unit test cubriendo el happy path
- `vitest run` pasa al 100% sin errores
- Los tests no dependen de conexion real a la DB (Prisma mockeado)

## Notas

- Priorizar happy path primero, luego casos de error
- Mock de Prisma debe resetear entre tests para evitar estado compartido
- Considerar `vitest --coverage` para visualizar coverage una vez los tests basicos esten funcionando
