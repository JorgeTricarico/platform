# Z8: Galeria de fotos en detalle de orden

## Problematica
Z4 permite subir fotos de prendas pero no hay UI para verlas. Ana necesita ver las fotos al consultar una orden.

## Contexto
Z4 implemento upload/list/delete de fotos con multer. Los archivos se sirven desde /uploads. Falta el componente React.

## Implementacion propuesta
1. En la vista de detalle de orden, agregar seccion "Fotos"
2. Grid de thumbnails con preview al click
3. Boton "Agregar foto" con input file (POST al backend)
4. Boton eliminar por foto (DELETE al backend)
5. Lightbox simple para ver foto completa

## Criterio de aceptacion
- Se ven las fotos de la prenda en la vista de detalle
- Se pueden subir nuevas fotos
- Se pueden eliminar fotos existentes
- Feedback visual de loading/error en upload

## Notas
Depende de Z4 (completado). Considerar lazy loading para ordenes con muchas fotos.
