# Z14 — Mejoras UX menores en órdenes

**Prioridad:** MEDIA
**Estado:** Pendiente

## Items
1. **`<textarea>` para descripción** — `<input>` es insuficiente para detalles de arreglo. Cambiar a `<textarea>` con `resize: vertical`
2. **Link `tel:` en teléfono** — en la tabla, el teléfono debería ser un link para llamar con un tap en mobile
3. **Extraer `<StatusBadge>`** — componente compartido entre Garments y Dashboard (hoy están duplicados)
4. **Extraer `<GarmentModal>`** — a `components/GarmentModal.tsx` (140 líneas dentro de Garments.tsx)
5. **`<LoadingSpinner>` compartido** — reemplazar los `<div>Cargando...</div>` de todas las páginas
6. **Clients.tsx: agregar sort** por nombre (hoy no ordena)
7. **Finances: agregar búsqueda por texto** (hoy solo filtra por mes)
8. **Empty state diferenciado** — "No hay órdenes" vs "No se encontraron resultados para X"
9. **`confirm()` nativo → modal propio** — el delete usa `window.confirm`, no matchea el estilo de la app
