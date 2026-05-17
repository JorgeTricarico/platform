export interface NormalizedPhone {
  e164: string | null;
  isValid: boolean;
  error?: string;
  display?: string;
}

export function formatPhoneForDisplay(e164: string): string {
  if (e164.startsWith('549') && e164.length === 13) {
    return `+54 9 ${e164.slice(3, 5)} ${e164.slice(5, 9)}-${e164.slice(9)}`;
  }
  return `+${e164}`;
}

export function normalizeArgentinePhone(raw: string | null | undefined): NormalizedPhone {
  if (raw === null || raw === undefined) {
    return { e164: null, isValid: false, error: 'Teléfono requerido' };
  }
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { e164: null, isValid: false, error: 'Teléfono requerido' };
  }

  const startsWithPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (digits.length < 8) {
    return { e164: null, isValid: false, error: 'Teléfono muy corto (mínimo 8 dígitos)' };
  }

  let e164: string;

  if (startsWithPlus) {
    if (digits.startsWith('54') && digits.length === 12 && digits[2] !== '9') {
      e164 = '54' + '9' + digits.slice(2);
    } else {
      e164 = digits;
    }
  } else {
    if (digits.startsWith('54')) {
      const rest = digits.slice(2);
      e164 = '54' + (rest.startsWith('9') ? rest : '9' + rest);
      if (e164.length < 12) {
        return { e164: null, isValid: false, error: 'Teléfono muy corto (mínimo 8 dígitos)' };
      }
    } else if (digits.startsWith('15') && digits.length === 10) {
      e164 = '549' + '11' + digits.slice(2);
    } else if (digits.length === 10) {
      e164 = '549' + digits;
    } else if (digits.length === 11 && digits.startsWith('9')) {
      e164 = '54' + digits;
    } else if (digits.length === 8) {
      e164 = '5491' + digits;
    } else if (digits.length === 13 && digits.startsWith('549')) {
      e164 = digits;
    } else {
      e164 = digits;
    }
  }

  return {
    e164,
    isValid: true,
    display: formatPhoneForDisplay(e164),
  };
}

export function buildWhatsAppUrl(rawPhone: string, message?: string): string | null {
  const { e164, isValid } = normalizeArgentinePhone(rawPhone);
  if (!isValid || !e164) return null;
  // URL scheme nativo `whatsapp://send`: en desktop abre WhatsApp Desktop (que
  // trae su propia emoji font embebida, no depende del OS); en mobile abre
  // la app directamente. Comparado con wa.me / api.whatsapp.com que pasan por
  // WhatsApp Web donde la emoji font cae a la del browser/OS y puede romper.
  // Requiere que el cliente tenga WhatsApp Desktop instalada en Windows/Mac/Linux.
  const base = `whatsapp://send?phone=${e164}`;
  return message ? `${base}&text=${encodeURIComponent(message)}` : base;
}

/**
 * Saca emojis del texto. Util para el fallback Web — WhatsApp Web no renderiza
 * los emojis confiablemente, mejor mandar texto plano que mostrar simbolos rotos.
 * - `\p{Extended_Pictographic}` cubre emojis principales (🦊, 👋, ✨, 🕘, etc.).
 * - `\p{Emoji_Modifier}` cubre skin-tone modifiers (🏻, 🏼, 🏽, 🏾, 🏿).
 * - U+200D (ZWJ) une emojis en secuencias (familia, profesiones, etc.).
 * Luego limpia espacios y saltos sobrantes que quedaron donde estaban los emojis.
 */
export function stripEmojis(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\p{Emoji_Modifier}/gu, '')
    .replace(/‍/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^[ \t]+|[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * URL de fallback Web — se usa si el cliente no tiene WhatsApp Desktop instalado
 * y el scheme nativo falla. Pierde la ventaja de emoji font propia, asi que
 * recibe el mensaje YA stripeado de emojis (responsabilidad del caller).
 */
export function buildWhatsAppWebFallbackUrl(rawPhone: string, message?: string): string | null {
  const { e164, isValid } = normalizeArgentinePhone(rawPhone);
  if (!isValid || !e164) return null;
  const base = `https://api.whatsapp.com/send/?phone=${e164}&type=phone_number&app_absent=0`;
  return message ? `${base}&text=${encodeURIComponent(message)}` : base;
}

/**
 * Props listos para un `<a>` que abre WhatsApp con fallback automatico.
 * - href apunta al scheme `whatsapp://send` (abre la app desktop/mobile).
 * - onClick setea un timer: si la pestana no pierde focus en 1.5s, abre el
 *   fallback Web en nueva ventana. Si la app abrio, el blur cancela el timer.
 * NOTA: no usa target="_blank" para que el scheme se dispare en la pestana
 * actual (evita abrir tabs vacios cuando el scheme funciona).
 */
export function whatsappLinkProps(rawPhone: string, message?: string) {
  const desktopUrl = buildWhatsAppUrl(rawPhone, message);
  // En el fallback Web los emojis se rompen, mandamos el mismo mensaje sin ellos.
  const webMessage = message ? stripEmojis(message) : undefined;
  const webUrl = buildWhatsAppWebFallbackUrl(rawPhone, webMessage);
  if (!desktopUrl || !webUrl) {
    return { href: undefined, onClick: undefined };
  }
  return {
    href: desktopUrl,
    onClick: () => {
      let opened = false;
      const onBlur = () => { opened = true; };
      window.addEventListener('blur', onBlur, { once: true });
      window.setTimeout(() => {
        window.removeEventListener('blur', onBlur);
        if (!opened) {
          window.open(webUrl, '_blank', 'noopener,noreferrer');
        }
      }, 1500);
    },
  };
}
