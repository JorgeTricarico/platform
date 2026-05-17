/**
 * Tests TDD para normalización de teléfonos argentinos.
 *
 * Spec: ver `phone.ts`. Reglas 1-7 cubren números argentinos (con/sin
 * código de país, legacy "15", solo local) y números internacionales
 * con `+`.
 */
import { describe, it, expect } from 'vitest';
import { normalizeArgentinePhone, buildWhatsAppUrl, formatPhoneForDisplay } from './phone.js';

describe('normalizeArgentinePhone — Argentina sin +', () => {
  it('normaliza 10 dígitos con código de área 11', () => {
    expect(normalizeArgentinePhone('1150579769').e164).toBe('5491150579769');
  });

  it('normaliza con espacios', () => {
    expect(normalizeArgentinePhone('11 5057 9769').e164).toBe('5491150579769');
  });

  it('normaliza con guiones', () => {
    expect(normalizeArgentinePhone('11-5057-9769').e164).toBe('5491150579769');
  });

  it('normaliza con paréntesis', () => {
    expect(normalizeArgentinePhone('(11) 5057-9769').e164).toBe('5491150579769');
  });

  it('normaliza legacy 15 a 549 11', () => {
    expect(normalizeArgentinePhone('15-5057-9769').e164).toBe('5491150579769');
  });

  it('normaliza ya con 54 sin 9 móvil', () => {
    expect(normalizeArgentinePhone('541150579769').e164).toBe('5491150579769');
  });

  it('respeta 549 ya normalizado (13 dígitos)', () => {
    expect(normalizeArgentinePhone('5491150579769').e164).toBe('5491150579769');
  });

  it('normaliza 11 dígitos con 9 al inicio (sin 54)', () => {
    expect(normalizeArgentinePhone('91150579769').e164).toBe('5491150579769');
  });

  it('asume CABA para 8 dígitos sueltos (regla 6e: 5491 + 8 dígitos)', () => {
    // Regla 6e: '5491' + '50579769' = '549150579769' (12 dígitos)
    expect(normalizeArgentinePhone('50579769').e164).toBe('549150579769');
  });
});

describe('normalizeArgentinePhone — con + (país explícito)', () => {
  it('respeta + con país explícito Argentina completo (5491...)', () => {
    expect(normalizeArgentinePhone('+54 9 11 5057-9769').e164).toBe('5491150579769');
  });

  it('agrega 9 móvil cuando + 54 + área(2) sin 9', () => {
    expect(normalizeArgentinePhone('+541150579769').e164).toBe('5491150579769');
  });

  it('respeta país USA con +', () => {
    expect(normalizeArgentinePhone('+1 555 123 4567').e164).toBe('15551234567');
  });

  it('respeta país España con +', () => {
    expect(normalizeArgentinePhone('+34 612 345 678').e164).toBe('34612345678');
  });

  it('respeta país Uruguay con +', () => {
    expect(normalizeArgentinePhone('+598 99 123 456').e164).toBe('59899123456');
  });
});

describe('normalizeArgentinePhone — casos inválidos', () => {
  it('falla con string vacío', () => {
    const r = normalizeArgentinePhone('');
    expect(r.isValid).toBe(false);
    expect(r.e164).toBeNull();
    expect(r.error).toBeDefined();
  });

  it('falla con null', () => {
    const r = normalizeArgentinePhone(null);
    expect(r.isValid).toBe(false);
    expect(r.e164).toBeNull();
  });

  it('falla con undefined', () => {
    const r = normalizeArgentinePhone(undefined);
    expect(r.isValid).toBe(false);
    expect(r.e164).toBeNull();
  });

  it('falla con sólo espacios', () => {
    const r = normalizeArgentinePhone('   ');
    expect(r.isValid).toBe(false);
  });

  it('falla con menos de 8 dígitos', () => {
    const r = normalizeArgentinePhone('123');
    expect(r.isValid).toBe(false);
    expect(r.error).toContain('corto');
  });

  it('falla con sólo letras', () => {
    const r = normalizeArgentinePhone('abcdefg');
    expect(r.isValid).toBe(false);
  });
});

describe('normalizeArgentinePhone — display', () => {
  it('retorna display con formato bonito para AR de 13 dígitos', () => {
    expect(normalizeArgentinePhone('1150579769').display).toBe('+54 9 11 5057-9769');
  });

  it('retorna display genérico para otros países', () => {
    expect(normalizeArgentinePhone('+1 555 123 4567').display).toBe('+15551234567');
  });
});

describe('formatPhoneForDisplay', () => {
  it('formatea AR 13 dígitos como "+54 9 AA BBBB-CCCC"', () => {
    expect(formatPhoneForDisplay('5491150579769')).toBe('+54 9 11 5057-9769');
  });

  it('fallback genérico para otros países', () => {
    expect(formatPhoneForDisplay('15551234567')).toBe('+15551234567');
  });

  it('fallback genérico para AR de 12 dígitos (5491 + 8)', () => {
    expect(formatPhoneForDisplay('549150579769')).toBe('+549150579769');
  });
});

describe('buildWhatsAppUrl', () => {
  it('construye URL básica con teléfono normalizado', () => {
    expect(buildWhatsAppUrl('11-5057-9769')).toBe('https://wa.me/5491150579769');
  });

  it('construye URL con mensaje codificado', () => {
    expect(buildWhatsAppUrl('1150579769', 'Hola Ana')).toBe('https://wa.me/5491150579769?text=Hola%20Ana');
  });

  it('retorna null si el teléfono es inválido', () => {
    expect(buildWhatsAppUrl('abc')).toBeNull();
  });

  it('normaliza legacy 15 al construir URL', () => {
    expect(buildWhatsAppUrl('15-5057-9769')).toBe('https://wa.me/5491150579769');
  });
});
