# C2: Validacion con Zod

## Problematica

El backend confia en que el frontend siempre manda los tipos correctos. `price` puede llegar como string en lugar de number, campos requeridos pueden faltar, y Prisma lanza errores internos en lugar de respuestas 400 informativas.

## Contexto

Sin validacion en la capa de entrada, los errores de tipo llegan hasta Prisma y se traducen en 500s genericos. El cliente no sabe que mando mal ni como corregirlo.

## Implementacion propuesta

1. Instalar Zod:
```bash
npm install zod
```

2. Crear schemas por modelo en `src/schemas/`:
```
schemas/
  appointment.schema.ts
  finance.schema.ts
  client.schema.ts
  patient.schema.ts
```

3. Ejemplo de schema:
```typescript
import { z } from 'zod'

export const CreateAppointmentSchema = z.object({
  clientId: z.string().uuid(),
  date: z.string().datetime(),
  price: z.coerce.number().positive(),
  notes: z.string().optional(),
})
```

4. Aplicar validacion en cada POST/PUT antes de llamar a Prisma:
```typescript
const result = CreateAppointmentSchema.safeParse(req.body)
if (!result.success) {
  return res.status(400).json({ error: result.error.flatten() })
}
```

## Criterio de aceptacion

- Requests con datos invalidos devuelven HTTP 400 con mensaje claro indicando que campo fallo
- `price` enviado como string se coerciona a number correctamente (o falla con mensaje util)
- Campos requeridos faltantes producen 400, no 500

## Notas

- Usar `z.coerce.number()` para campos numericos para manejar strings numericos del frontend
- `safeParse` es preferible a `parse` para evitar excepciones no controladas
- Los schemas pueden reutilizarse en los tests de C1 para generar fixtures validos
