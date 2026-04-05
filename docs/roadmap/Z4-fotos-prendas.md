# Z4: Fotos de prendas (upload al recibir)

## Problematica
Ana quiere fotografiar la prenda al recibirla para tener evidencia del estado original. Hoy no hay forma de adjuntar fotos.

## Contexto
El modelo Order no tiene campo de imagen. Se necesita storage (Supabase Storage o S3).

## Implementacion propuesta
1. Agregar campo `photoUrl` al modelo Order
2. Endpoint POST /api/zenco/garments/:id/photo (multipart upload)
3. Guardar en Supabase Storage, almacenar URL publica en photoUrl
4. Mostrar thumbnail en la lista de garments y en el detalle

## Criterio de aceptacion
- Se puede subir foto al crear o editar una orden
- La foto se muestra en el frontend
- Tests del endpoint de upload

## Notas
Supabase Storage tiene tier gratuito de 1GB. Comprimir imagenes en frontend antes de subir.
