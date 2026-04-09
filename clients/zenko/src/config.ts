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
  whatsappReadyMsg: (_clientName: string, _garmentName: string) =>
    `Hola 👋🏻\n` +
    `Te escribimos desde Zenko – Taller de arreglos de ropa 🦊 para avisarte que tus arreglos ya se encuentran finalizados y disponibles para retirar ✨\n\n` +
    `Horario de atención:\n` +
    `🕘Lunes a viernes: 9:30 a 12:30 / 15:00 a 18:30\n` +
    `🕘Sábados: 9:30 a 15:00\n\n` +
    `¡Muchas gracias!`,
  whatsappReminderMsg: (clientName: string, garmentName: string) =>
    `Hola ${clientName}, te recordamos que tu prenda "${garmentName}" está lista para retirar. ¡Te esperamos! 🧵`,
};
