import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';
import { normalizeArgentinePhone, buildWhatsAppUrl, buildWhatsAppWebFallbackUrl, whatsappLinkProps, formatPhoneForDisplay, stripEmojis } from './phone';

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
  // URL scheme nativo whatsapp:// → abre WhatsApp Desktop con emoji font propia.
  it('URL básica', () => expect(buildWhatsAppUrl('11-5057-9769')).toBe('whatsapp://send?phone=5491150579769'));
  it('URL con mensaje', () => expect(buildWhatsAppUrl('1150579769', 'Hola Ana')).toBe('whatsapp://send?phone=5491150579769&text=Hola%20Ana'));
  it('null si inválido', () => expect(buildWhatsAppUrl('abc')).toBeNull());
  it('normaliza legacy 15', () => expect(buildWhatsAppUrl('15-5057-9769')).toBe('whatsapp://send?phone=5491150579769'));
  it('respeta otros países', () => expect(buildWhatsAppUrl('+1 555 123 4567')).toBe('whatsapp://send?phone=15551234567'));
  it('mensaje con emoji preserva surrogate pair en encoding', () => {
    const url = buildWhatsAppUrl('11-5057-9769', 'Hola 👋🏻 🦊');
    // 👋 = F0 9F 91 8B, 🏻 = F0 9F 8F BB, 🦊 = F0 9F A6 8A
    expect(url).toContain('text=Hola%20%F0%9F%91%8B%F0%9F%8F%BB%20%F0%9F%A6%8A');
  });
});

describe('buildWhatsAppWebFallbackUrl', () => {
  it('URL Web con api.whatsapp.com', () => {
    expect(buildWhatsAppWebFallbackUrl('11-5057-9769', 'Hola'))
      .toBe('https://api.whatsapp.com/send/?phone=5491150579769&type=phone_number&app_absent=0&text=Hola');
  });
  it('null si invalido', () => expect(buildWhatsAppWebFallbackUrl('abc')).toBeNull());
});

describe('stripEmojis', () => {
  it('quita emoji basico', () => expect(stripEmojis('Hola 🦊 mundo')).toBe('Hola mundo'));
  it('quita waving + skin tone modifier', () => expect(stripEmojis('Hola 👋🏻')).toBe('Hola'));
  it('quita sparkle', () => expect(stripEmojis('Listo ✨')).toBe('Listo'));
  it('quita reloj', () => expect(stripEmojis('🕘 Lun a Vie')).toBe('Lun a Vie'));
  it('respeta texto plano y tildes', () => expect(stripEmojis('Hola, ¿cómo estás? Sábado a las 9:30')).toBe('Hola, ¿cómo estás? Sábado a las 9:30'));
  it('colapsa dobles espacios', () => expect(stripEmojis('Hola 🦊 🦊 mundo')).toBe('Hola mundo'));
  it('preserva saltos de linea simples', () => expect(stripEmojis('A 🦊\nB ✨')).toBe('A\nB'));
  it('saca emojis de mensaje multilinea de Zenko', () => {
    const msg = `Hola 👋🏻\nTu pedido en Zenko ya está listo para retirar 🦊\n\n🕘 Lun a Vie: 9:30 a 12:30 / 15:00 a 18:30\n🕘 Sáb: 9:30 a 15:00\n\n¡Gracias!`;
    const expected = `Hola\nTu pedido en Zenko ya está listo para retirar\n\nLun a Vie: 9:30 a 12:30 / 15:00 a 18:30\nSáb: 9:30 a 15:00\n\n¡Gracias!`;
    expect(stripEmojis(msg)).toBe(expected);
  });
});

describe('whatsappLinkProps', () => {
  it('href apunta al scheme nativo whatsapp://', () => {
    const props = whatsappLinkProps('11-5057-9769', 'Hola');
    expect(props.href).toBe('whatsapp://send?phone=5491150579769&text=Hola');
  });

  it('onClick dispara fallback Web si la ventana no pierde focus en 1.5s', () => {
    vi.useFakeTimers();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const props = whatsappLinkProps('11-5057-9769', 'Hola');
    props.onClick?.();
    expect(openSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1500);
    expect(openSpy).toHaveBeenCalledWith(
      'https://api.whatsapp.com/send/?phone=5491150579769&type=phone_number&app_absent=0&text=Hola',
      '_blank',
      'noopener,noreferrer'
    );
    openSpy.mockRestore();
    vi.useRealTimers();
  });

  it('fallback Web usa el mensaje SIN emojis (desktop conserva los emojis)', () => {
    vi.useFakeTimers();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const props = whatsappLinkProps('11-5057-9769', 'Hola 👋🏻 Zenko 🦊');
    // El href para desktop conserva los emojis
    expect(props.href).toContain('%F0%9F%91%8B');
    expect(props.href).toContain('%F0%9F%A6%8A');
    // El fallback Web los pierde
    props.onClick?.();
    vi.advanceTimersByTime(1500);
    const webUrl = openSpy.mock.calls[0][0] as string;
    expect(webUrl).not.toContain('%F0%9F%91%8B');
    expect(webUrl).not.toContain('%F0%9F%A6%8A');
    expect(webUrl).toContain('text=Hola%20Zenko');
    openSpy.mockRestore();
    vi.useRealTimers();
  });

  it('NO dispara fallback si la ventana pierde focus (app desktop abrio)', () => {
    vi.useFakeTimers();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const props = whatsappLinkProps('11-5057-9769', 'Hola');
    props.onClick?.();
    // Simular que la app abrio (la ventana del browser pierde focus)
    window.dispatchEvent(new Event('blur'));
    vi.advanceTimersByTime(1500);
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
    vi.useRealTimers();
  });

  it('retorna undefined si telefono invalido', () => {
    const props = whatsappLinkProps('abc');
    expect(props.href).toBeUndefined();
    expect(props.onClick).toBeUndefined();
  });
});
