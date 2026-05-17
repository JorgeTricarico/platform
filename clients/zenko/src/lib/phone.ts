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
  const base = `https://wa.me/${e164}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
