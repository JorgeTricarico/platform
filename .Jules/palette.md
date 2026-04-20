## 2026-04-20 - Dropdowns and Lightboxes

**Learning:** Componentes como popovers/dropdowns (ej. NotificationBell) y modales/lightboxes (ej. PhotoGallery) deben poder cerrarse con la tecla "Escape" para asegurar accesibilidad por teclado. Además, los botones que abren/cierran un menú deben reflejar su estado con los atributos `aria-expanded` y `aria-haspopup`.

**Action:** Siempre verificar el soporte para atajos de teclado (como "Escape" para cerrar y navegar por componentes con "Tab") y añadir atributos `aria` apropiados al crear o modificar elementos interactivos tipo popup.
