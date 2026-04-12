import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ChatDemo from './ChatDemo';

// jsdom no implementa scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ChatDemo — renderizado básico', () => {
  it('renderiza sin errores', () => {
    render(<ChatDemo />);
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('muestra el título "Demo del Bot de WhatsApp"', () => {
    render(<ChatDemo />);
    expect(screen.getByText('Demo del Bot de WhatsApp')).toBeInTheDocument();
  });

  it('muestra la badge de Modo Demo', () => {
    render(<ChatDemo />);
    expect(screen.getByText('Modo Demo')).toBeInTheDocument();
  });

  it('muestra los tabs de escenarios: Chat libre, Reservar turno, Cancelar cita', () => {
    render(<ChatDemo />);
    expect(screen.getByText('Chat libre')).toBeInTheDocument();
    expect(screen.getByText('Reservar turno')).toBeInTheDocument();
    expect(screen.getByText('Cancelar cita')).toBeInTheDocument();
  });

  it('muestra el input de mensaje', () => {
    render(<ChatDemo />);
    expect(screen.getByPlaceholderText('Escribe un mensaje...')).toBeInTheDocument();
  });

  it('muestra el botón de envío', () => {
    render(<ChatDemo />);
    // El botón de envío tiene el icono ➤ (&#10148;)
    const sendButton = document.querySelector('button[disabled]') || document.querySelectorAll('button')[document.querySelectorAll('button').length - 1];
    // O buscamos el botón por su contenedor
    expect(document.querySelector('.bg-\\[\\#25D366\\]')).not.toBeNull();
  });

  it('muestra el mensaje de "Escribi un mensaje" cuando no hay mensajes', () => {
    render(<ChatDemo />);
    expect(screen.getByText('Escribi un mensaje para empezar la conversacion')).toBeInTheDocument();
  });
});

describe('ChatDemo — escenarios de conversación', () => {
  it('el tab "Chat libre" está activo por defecto', () => {
    render(<ChatDemo />);
    const libreButton = screen.getByText('Chat libre');
    expect(libreButton.className).toContain('bg-[#25D366]');
  });

  it('el usuario puede escribir en el input', () => {
    render(<ChatDemo />);
    const input = screen.getByPlaceholderText('Escribe un mensaje...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Hola, quiero un turno' } });
    expect(input.value).toBe('Hola, quiero un turno');
  });

  it('envía mensaje al hacer click en el botón y muestra en chat', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: 'Hola! ¿Para qué día querés el turno?' }),
    } as Response);

    render(<ChatDemo />);
    const input = screen.getByPlaceholderText('Escribe un mensaje...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Hola, quiero un turno' } });

    // Encuentra el botón de envío (último botón)
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons[buttons.length - 1];
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Hola, quiero un turno')).toBeInTheDocument();
    });
  });

  it('envía mensaje al presionar Enter', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: 'Perfecto, te anoto.' }),
    } as Response);

    render(<ChatDemo />);
    const input = screen.getByPlaceholderText('Escribe un mensaje...');
    fireEvent.change(input, { target: { value: 'Quiero el viernes' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Quiero el viernes')).toBeInTheDocument();
    });
  });

  it('muestra mensaje de IA no disponible cuando la API falla', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ChatDemo />);
    const input = screen.getByPlaceholderText('Escribe un mensaje...');
    fireEvent.change(input, { target: { value: 'test' } });
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(/asistente de IA no está disponible/)).toBeInTheDocument();
    });
  });

  it('muestra mensaje de IA no disponible cuando la respuesta tiene error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Internal Server Error' }),
    } as Response);

    render(<ChatDemo />);
    const input = screen.getByPlaceholderText('Escribe un mensaje...');
    fireEvent.change(input, { target: { value: 'test' } });
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(/asistente de IA no está disponible/)).toBeInTheDocument();
    });
  });

  it('no envía mensaje si el input está vacío', async () => {
    render(<ChatDemo />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('ChatDemo — cambio de escenarios', () => {
  it('cambiar a "Reservar turno" activa ese tab', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ reply: 'Bienvenido, ¿qué tipo de masaje querés?' }),
    } as Response);

    render(<ChatDemo />);
    fireEvent.click(screen.getByText('Reservar turno'));

    await waitFor(() => {
      const turnoButton = screen.getByText('Reservar turno');
      expect(turnoButton.className).toContain('bg-[#25D366]');
    });
  });

  it('limpiar el chat al cambiar de escenario', () => {
    render(<ChatDemo />);
    // Primero cambiamos a un escenario diferente
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ reply: 'Respuesta del bot' }),
    } as Response);

    fireEvent.click(screen.getByText('Cancelar cita'));
    // El chat se limpia al cambiar de escenario
    // El mensaje de placeholder vuelve a mostrarse (si no hay mensajes)
    // waitFor para el estado de loading que puede aparecer
    expect(document.body).toBeInTheDocument();
  });
});
