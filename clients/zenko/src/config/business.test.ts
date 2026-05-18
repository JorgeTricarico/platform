import { describe, it, expect } from 'vitest';
import { BUSINESS } from './business';

describe('BUSINESS.whatsappReadyMsg', () => {
  describe('mode=long (cliente nuevo o con 1 entrega previa)', () => {
    it('incluye intro "Somos Zenko" / "Te escribimos de *Zenko*"', () => {
      const msg = BUSINESS.whatsappReadyMsg('Ana', ['campera negra'], { mode: 'long' });
      expect(msg).toContain('Te escribimos de *Zenko*');
      expect(msg).toContain('¡Te esperamos!');
    });

    it('encierra el nombre de la prenda en *«»* para resaltar que es lo cargado', () => {
      const msg = BUSINESS.whatsappReadyMsg('Ana', ['pantalón gris de vestir'], { mode: 'long' });
      expect(msg).toContain('*«pantalón gris de vestir»*');
      expect(msg).toContain('Ya está listo tu *«pantalón gris de vestir»*');
    });

    it('incluye dirección y horarios', () => {
      const msg = BUSINESS.whatsappReadyMsg('Ana', ['campera'], { mode: 'long' });
      expect(msg).toContain('Independencia 243, Morón');
      expect(msg).toContain('Lun-Vie');
      expect(msg).toContain('Sáb');
    });
  });

  describe('mode=short (cliente con 2+ entregas previas)', () => {
    it('NO incluye intro "Te escribimos"', () => {
      const msg = BUSINESS.whatsappReadyMsg('Ana', ['campera'], { mode: 'short' });
      expect(msg).not.toContain('Te escribimos de *Zenko*');
      expect(msg).not.toContain('¡Te esperamos!');
    });

    it('sigue incluyendo nombre de prenda, dirección y horarios', () => {
      const msg = BUSINESS.whatsappReadyMsg('Ana', ['saco azul'], { mode: 'short' });
      expect(msg).toContain('*«saco azul»*');
      expect(msg).toContain('Independencia 243, Morón');
      expect(msg).toContain('Lun-Vie');
    });
  });

  describe('multiples prendas', () => {
    it('lista todas las prendas separadas por coma, cada una con *«»*', () => {
      const msg = BUSINESS.whatsappReadyMsg('Ana', ['campera', 'pantalón', 'saco'], { mode: 'long' });
      expect(msg).toContain('Ya están listos: *«campera»*, *«pantalón»*, *«saco»*');
    });

    it('usa singular "Ya está listo tu" para 1 sola prenda', () => {
      const msg = BUSINESS.whatsappReadyMsg('Ana', ['campera'], { mode: 'long' });
      expect(msg).toContain('Ya está listo tu *«campera»*');
      expect(msg).not.toContain('Ya están listos');
    });
  });

  it('default mode es long si no se especifica opts', () => {
    const msg = BUSINESS.whatsappReadyMsg('Ana', ['campera']);
    expect(msg).toContain('Te escribimos de *Zenko*');
  });
});
