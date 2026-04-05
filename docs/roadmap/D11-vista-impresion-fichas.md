# D11: Vista de Impresion Optimizada para Fichas

## Problematica
El PDF (D3) genera un archivo descargable, pero a veces Damian solo quiere imprimir rapidamente desde el navegador sin descargar. Una vista de impresion optimizada con CSS `@media print` permite hacer Ctrl+P directo.

## Contexto
- D3 ya genera PDF con jspdf (descarga archivo)
- La vista actual del historial no esta optimizada para impresion (sidebar, header, colores de fondo)
- CSS @media print puede ocultar elementos innecesarios y formatear para papel

## Implementacion propuesta
- Agregar CSS `@media print` en `index.css` que oculte sidebar, header, botones
- Formatear la vista de historial del paciente para impresion (margenes, tipografia, tabla limpia)
- Agregar boton "Imprimir" junto al "Exportar PDF" que dispare `window.print()`

## Criterio de aceptacion
- Ctrl+P desde la vista de historial produce una impresion limpia sin sidebar/header
- Los datos del paciente y todas las fichas son legibles en formato impreso
- Boton "Imprimir" visible en la vista detalle

## Notas
- Complementa D3, no lo reemplaza — PDF es para enviar, print es para imprimir en el momento
- Bajo esfuerzo: solo CSS + un boton
