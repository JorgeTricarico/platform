/**
 * Utilidad de normalización de teléfonos argentinos a formato E.164 (sin `+`).
 *
 * Motivación: Ana (Zenko) cargaba clientes con formatos inconsistentes
 *   ("11-5057-9769", "15-5057-9769", "1150579769", "(11) 5057-9769", etc.)
 * y el botón "Avisar" usaba `phone.replace(/\D/g, '')`, que no convertía el
 * legacy `15` ni agregaba el `549` requerido por la WhatsApp Cloud API.
 *
 * Esta utilidad central normaliza TODO al formato `5491150579769` (13 dígitos
 * para AR móvil) listo para `https://wa.me/<e164>`.
 */

export interface NormalizedPhone {
  /** Formato E.164 sin `+` (ej: "5491150579769"). null si no es válido. */
  e164: string | null;
  /** Si el teléfono pudo normalizarse. */
  isValid: boolean;
  /** Mensaje en español cuando isValid=false. */
  error?: string;
  /** Formato bonito con `+` para mostrar (ej: "+54 9 11 5057-9769"). */
  display?: string;
}

/**
 * Normaliza un teléfono argentino (o internacional con `+`) al formato E.164 sin `+`.
 */
export function normalizeArgentinePhone(raw: string | null | undefined): NormalizedPhone {
  // Regla 1: vacío/null/undefined
  if (raw === null || raw === undefined) {
    return { isValid: false, e164: null, error: 'Teléfono requerido' };
  }
  const trimmed = String(raw).trim();
  if (trimmed.length === 0) {
    return { isValid: false, e164: null, error: 'Teléfono requerido' };
  }

  // Regla 2: detectar prefijo + (modo país explícito)
  const startsWithPlus = trimmed.startsWith('+');

  // Regla 3: quedarse sólo con dígitos
  const digits = trimmed.replace(/\D/g, '');

  // Regla 4: mínimo 8 dígitos
  if (digits.length < 8) {
    return { isValid: false, e164: null, error: 'Teléfono muy corto (mínimo 8 dígitos)' };
  }

  let e164: string;

  if (startsWithPlus) {
    // Regla 5: con + (país explícito)
    if (digits.startsWith('54') && digits.length === 12 && digits[2] !== '9') {
      // +54 + área(2) + número(8) sin móvil 9 → insertar 9
      e164 = '54' + '9' + digits.slice(2);
    } else {
      e164 = digits;
    }
  } else {
    // Regla 6: sin + (asumir Argentina)
    if (digits.startsWith('54')) {
      // 6a: ya tiene país 54 sin el +
      const rest = digits.slice(2);
      const withMobile = rest.startsWith('9') ? rest : '9' + rest;
      const candidate = '54' + withMobile;
      if (candidate.length < 12) {
        return { isValid: false, e164: null, error: 'Teléfono argentino incompleto' };
      }
      e164 = candidate;
    } else if (digits.length === 13 && digits.startsWith('549')) {
      // 6f: ya normalizado (chequear ANTES de 6c porque 13 dígitos no es regla 6c)
      e164 = digits;
    } else if (digits.startsWith('15') && digits.length === 10) {
      // 6b: legacy CABA "15-5057-9769" → "549 11 5057 9769"
      e164 = '549' + '11' + digits.slice(2);
    } else if (digits.length === 10) {
      // 6c: ya tiene código de área AR (ej: 11XXXXXXXX)
      e164 = '549' + digits;
    } else if (digits.length === 11 && digits.startsWith('9')) {
      // 6d: AR sin 54 (ej: 91150579769)
      e164 = '54' + digits;
    } else if (digits.length === 8) {
      // 6e: sólo número local, asumir CABA
      e164 = '5491' + digits;
    } else {
      // 6g: otro país sin + (heurística: lo dejamos tal cual)
      e164 = digits;
    }
  }

  return {
    isValid: true,
    e164,
    display: formatPhoneForDisplay(e164),
  };
}

/**
 * Construye una URL de WhatsApp (`wa.me`) lista para abrir en el navegador
 * o invocar desde un botón. Devuelve null si el teléfono no es válido.
 */
export function buildWhatsAppUrl(rawPhone: string, message?: string): string | null {
  const { e164, isValid } = normalizeArgentinePhone(rawPhone);
  if (!isValid || !e164) return null;
  const base = `https://wa.me/${e164}`;
  if (message) {
    return `${base}?text=${encodeURIComponent(message)}`;
  }
  return base;
}

/**
 * Convierte un E.164 (sin +) a un display bonito.
 * Para números argentinos (5491XXXXXXXXX, 13 dígitos): "+54 9 11 5057-9769".
 * Para el resto: "+<digits>".
 */
export function formatPhoneForDisplay(e164: string): string {
  if (e164.startsWith('549') && e164.length === 13) {
    // 549 + área(2) + bloque1(4) + bloque2(4)
    return `+54 9 ${e164.slice(3, 5)} ${e164.slice(5, 9)}-${e164.slice(9)}`;
  }
  return `+${e164}`;
}
