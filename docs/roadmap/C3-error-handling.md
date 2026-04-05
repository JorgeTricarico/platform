# C3: Error Handling Global

## Problematica

Los bloques `catch` devuelven mensajes genericos sin loguear el error real. Es imposible diagnosticar fallos remotamente desde los logs de Render.

## Contexto

El patron actual es:
```typescript
} catch (error) {
  res.status(500).json({ error: 'Internal server error' })
}
```

El error real nunca aparece en ningun log, haciendo el debugging en produccion practicamente imposible.

## Implementacion propuesta

1. Agregar `console.error` en todos los bloques catch existentes:
```typescript
} catch (error) {
  console.error('[appointments] POST error:', error)
  res.status(500).json({ error: 'Internal server error' })
}
```

2. Crear middleware de error global en `src/middleware/errorHandler.ts`:
```typescript
export function errorHandler(err, req, res, next) {
  console.error(`[${req.method}] ${req.path}`, err)

  const isDev = process.env.NODE_ENV !== 'production'
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(isDev && { details: err.stack }),
  })
}
```

3. Registrar el middleware al final de la cadena en `app.ts`:
```typescript
app.use(errorHandler)
```

4. Propagar errores con `next(error)` en lugar de manejarlos inline donde sea apropiado

## Criterio de aceptacion

- Todos los errores son visibles en los logs de Render con contexto de ruta y metodo
- En desarrollo (`NODE_ENV !== production`) la respuesta incluye el stack trace
- En produccion el stack trace no se expone al cliente

## Notas

- El middleware global solo captura errores pasados con `next(error)` — los catch inline necesitan `console.error` independientemente
- Render muestra `console.error` en el tab de Logs del servicio
- Considerar estructurar los logs como JSON para facilitar busquedas futuras
