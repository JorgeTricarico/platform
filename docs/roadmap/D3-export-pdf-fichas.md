# M6: Export PDF de Fichas Clinicas

## Problematica

Damian necesita poder imprimir o enviar la historia clinica completa de un paciente. Actualmente no existe forma de exportar los datos del sistema — el paciente o un medico derivante no puede recibir un resumen estructurado del historial de sesiones.

## Contexto

La historia clinica en papel o PDF es un documento con valor legal y practico en el contexto de la salud. Damian necesita poder generar este documento desde la plataforma sin depender de herramientas externas. El PDF debe incluir datos del paciente y el historial completo de fichas de sesion.

## Implementacion propuesta

**Libreria recomendada:** `@react-pdf/renderer` (react-pdf) — permite definir el layout del PDF con componentes React y genera el archivo en el cliente sin llamadas extra al backend.

**Alternativa:** `jspdf` con `jspdf-autotable` — mas bajo nivel pero mas liviano.

**Estructura del PDF:**
1. Encabezado: nombre del consultorio / datos de Damian.
2. Datos del paciente: nombre, fecha de nacimiento, contacto.
3. Perfil clinico (si existe M1): peso, altura, alergias, medicamentos, antecedentes.
4. Historial de sesiones: tabla o lista con fecha + motivo + tratamiento + observaciones por sesion, ordenadas cronologicamente.
5. Pie de pagina: fecha de generacion del documento.

**Frontend:**
- Boton "Exportar PDF" en la vista de historial del paciente.
- Al hacer click, generar el PDF en el cliente con todos los datos ya cargados.
- Disparar descarga automatica con nombre `historial-{nombre-paciente}-{fecha}.pdf`.

**Backend (opcional):**
- Si se prefiere generacion server-side: endpoint `GET /api/damian/clients/:id/export-pdf` que devuelve el PDF como blob usando `pdfkit` o similar en Node.js.

## Criterio de aceptacion

- El boton "Exportar PDF" esta disponible en la vista del historial del paciente.
- El PDF descargado contiene: datos del paciente y el historial completo de fichas de sesion.
- El formato es legible e imprimible (margenes, tipografia, estructura clara).
- El nombre del archivo incluye el nombre del paciente y la fecha de exportacion.

## Notas

- `@react-pdf/renderer` funciona en el cliente — no requiere cambios de backend para MVP.
- Si el historial es muy largo (muchas sesiones), asegurarse de que el PDF pagina correctamente.
- Considerar agregar el logo del consultorio si Damian lo provee.
- Futuro: boton "Enviar por WhatsApp" que adjunte el PDF generado al mensaje.
