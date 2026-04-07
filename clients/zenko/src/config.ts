// Configuracion centralizada del negocio
// Cambiar estos valores para personalizar toda la app
export const BUSINESS = {
  name: 'Zenko',
  brandLabel: 'Zenko',
  brandSuffix: '.arreglos',
  ownerName: 'Ana & Ariel',
  greeting: 'Hola, Ana & Ariel',
  subtitle: 'Aqui tienes el resumen de tus pedidos al dia de hoy.',
  currency: '$',
  repairTypes: ['dobladillo', 'cierre', 'entalle', 'tela', 'diseño'],
  statuses: [
    { key: 'recibido',   label: 'Recibido',   order: 2 },
    { key: 'en_proceso', label: 'En Proceso', order: 1 },
    { key: 'listo',      label: 'Listo',      order: 0 },
    { key: 'entregado',  label: 'Entregado',  order: 3 },
  ] as const,
  whatsappReadyMsg: (clientName: string, garmentName: string) =>
    `Hola ${clientName}, tu prenda (${garmentName}) está lista para retirar. 🧵`,
};
