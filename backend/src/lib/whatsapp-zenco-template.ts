/**
 * Template de mensaje WhatsApp "pedido listo" para Zenko.
 * Espejo del template del frontend (clients/zenko/src/config/business.ts).
 * Mantener ambos sincronizados.
 */

const SCHEDULE_WEEKDAYS = '9:30 a 12:30 / 15:00 a 18:30';
const SCHEDULE_SATURDAYS = '9:30 a 15:00';
const ADDRESS = 'Independencia 243, Morón';

export interface ReadyMsgOpts {
  /** 'long' incluye intro "Somos Zenko...". 'short' para clientes con 2+ entregas previas. */
  mode: 'long' | 'short';
}

export function buildZencoReadyMsg(items: string[], opts: ReadyMsgOpts): string {
  const lines: string[] = [];

  if (opts.mode === 'long') {
    lines.push(`¡Hola! Te escribimos de *Zenko*, arreglos y confección de ropa.`);
    lines.push(``);
  } else {
    lines.push(`¡Hola! ✨`);
  }

  const quoted = items.map(i => `*«${i}»*`);
  if (quoted.length === 1) {
    lines.push(`✨ Ya está listo tu ${quoted[0]}`);
  } else if (quoted.length > 1) {
    lines.push(`✨ Ya están listos: ${quoted.join(', ')}`);
  } else {
    lines.push(`✨ Tu pedido ya está listo`);
  }

  lines.push(``);
  lines.push(`📍 ${ADDRESS}`);
  lines.push(`🕒 Lun-Vie: ${SCHEDULE_WEEKDAYS}`);
  lines.push(`🕒 Sáb: ${SCHEDULE_SATURDAYS}`);

  if (opts.mode === 'long') {
    lines.push(``);
    lines.push(`¡Te esperamos!`);
  }

  return lines.join('\n');
}
