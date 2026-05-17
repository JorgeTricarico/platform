import { describe, it, expect } from 'vitest';
import { normalizeArgentinePhone, buildWhatsAppUrl, formatPhoneForDisplay } from './phone';

describe('normalizeArgentinePhone', () => {
  it('10 dígitos con área 11', () => expect(normalizeArgentinePhone('1150579769').e164).toBe('5491150579769'));
  it('con espacios', () => expect(normalizeArgentinePhone('11 5057 9769').e164).toBe('5491150579769'));
  it('con guiones', () => expect(normalizeArgentinePhone('11-5057-9769').e164).toBe('5491150579769'));
  it('con paréntesis', () => expect(normalizeArgentinePhone('(11) 5057-9769').e164).toBe('5491150579769'));
  it('legacy 15 a 549 11', () => expect(normalizeArgentinePhone('15-5057-9769').e164).toBe('5491150579769'));
  it('54 sin 9 móvil', () => expect(normalizeArgentinePhone('541150579769').e164).toBe('5491150579769'));
  it('549 ya normalizado', () => expect(normalizeArgentinePhone('5491150579769').e164).toBe('5491150579769'));
  it('9 + 10 dígitos sin 54', () => expect(normalizeArgentinePhone('91150579769').e164).toBe('5491150579769'));
  it('8 dígitos asume CABA', () => expect(normalizeArgentinePhone('50579769').e164).toBe('549150579769'));

  it('+54 9 completo', () => expect(normalizeArgentinePhone('+54 9 11 5057-9769').e164).toBe('5491150579769'));
  it('+54 sin 9', () => expect(normalizeArgentinePhone('+541150579769').e164).toBe('5491150579769'));
  it('+1 USA', () => expect(normalizeArgentinePhone('+1 555 123 4567').e164).toBe('15551234567'));
  it('+34 España', () => expect(normalizeArgentinePhone('+34 612 345 678').e164).toBe('34612345678'));
  it('+598 Uruguay', () => expect(normalizeArgentinePhone('+598 99 123 456').e164).toBe('59899123456'));

  it('vacío', () => expect(normalizeArgentinePhone('').isValid).toBe(false));
  it('null', () => expect(normalizeArgentinePhone(null).isValid).toBe(false));
  it('undefined', () => expect(normalizeArgentinePhone(undefined).isValid).toBe(false));
  it('muy corto', () => expect(normalizeArgentinePhone('123').isValid).toBe(false));
  it('solo letras', () => expect(normalizeArgentinePhone('abc').isValid).toBe(false));

  it('retorna display formateado AR', () => expect(normalizeArgentinePhone('1150579769').display).toBe('+54 9 11 5057-9769'));

  it('vacío con mensaje de error', () => expect(normalizeArgentinePhone('').error).toBe('Teléfono requerido'));
  it('null con mensaje de error', () => expect(normalizeArgentinePhone(null).error).toBe('Teléfono requerido'));
  it('muy corto con mensaje de error', () => expect(normalizeArgentinePhone('123').error).toMatch(/muy corto/i));

  it('inválido retorna e164 null', () => expect(normalizeArgentinePhone('').e164).toBeNull());
  it('válido retorna isValid true', () => expect(normalizeArgentinePhone('1150579769').isValid).toBe(true));
});

describe('formatPhoneForDisplay', () => {
  it('AR 13 dígitos', () => expect(formatPhoneForDisplay('5491150579769')).toBe('+54 9 11 5057-9769'));
  it('otros países', () => expect(formatPhoneForDisplay('15551234567')).toBe('+15551234567'));
});

describe('buildWhatsAppUrl', () => {
  it('URL básica', () => expect(buildWhatsAppUrl('11-5057-9769')).toBe('https://wa.me/5491150579769'));
  it('URL con mensaje', () => expect(buildWhatsAppUrl('1150579769', 'Hola Ana')).toBe('https://wa.me/5491150579769?text=Hola%20Ana'));
  it('null si inválido', () => expect(buildWhatsAppUrl('abc')).toBeNull());
  it('normaliza legacy 15', () => expect(buildWhatsAppUrl('15-5057-9769')).toBe('https://wa.me/5491150579769'));
  it('respeta otros países', () => expect(buildWhatsAppUrl('+1 555 123 4567')).toBe('https://wa.me/15551234567'));
});
