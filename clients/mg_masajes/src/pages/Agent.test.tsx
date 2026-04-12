import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Agent from './Agent';

// jsdom no implementa scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock('../services/api', () => ({
  sendAgentMessage: vi.fn(),
}));

vi.mock('../components/MusicContext', () => ({
  useMusicCommand: () => ({ sendMusicCommand: vi.fn() }),
}));

import { sendAgentMessage } from '../services/api';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Agent — renderizado básico', () => {
  it('renderiza sin errores', () => {
    render(<Agent />);
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('muestra el título "Asistente Inteligente"', () => {
    render(<Agent />);
    expect(screen.getByText('Asistente Inteligente')).toBeInTheDocument();
  });

  it('muestra el subtítulo descriptivo', () => {
    render(<Agent />);
    expect(screen.getByText(/Gestiona pacientes, turnos y música/)).toBeInTheDocument();
  });

  it('muestra el mensaje de bienvenida del asistente', () => {
    render(<Agent />);
    expect(screen.getByText(/Hola Damián/)).toBeInTheDocument();
  });

  it('muestra el input de mensaje', () => {
    render(<Agent />);
    expect(screen.getByPlaceholderText(/¿Qué turnos tengo/)).toBeInTheDocument();
  });

  it('muestra el botón Enviar', () => {
    render(<Agent />);
    expect(screen.getByText('Enviar')).toBeInTheDocument();
  });
});

describe('Agent — interacción con el chat', () => {
  it('envía un mensaje al hacer click en Enviar', async () => {
    (sendAgentMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
      reply: 'Hoy tienes 3 turnos.',
      actions: [],
    });

    render(<Agent />);
    const input = screen.getByPlaceholderText(/¿Qué turnos tengo/);
    fireEvent.change(input, { target: { value: '¿Cuántos turnos tengo hoy?' } });
    fireEvent.click(screen.getByText('Enviar'));

    await waitFor(() => {
      expect(sendAgentMessage as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
        '¿Cuántos turnos tengo hoy?',
        expect.any(Array)
      );
    });
  });

  it('envía un mensaje al presionar Enter', async () => {
    (sendAgentMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
      reply: 'La próxima cita es a las 10:00.',
      actions: [],
    });

    render(<Agent />);
    const input = screen.getByPlaceholderText(/¿Qué turnos tengo/);
    fireEvent.change(input, { target: { value: 'próxima cita' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(sendAgentMessage as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
        'próxima cita',
        expect.any(Array)
      );
    });
  });

  it('muestra la respuesta del agente en el chat', async () => {
    (sendAgentMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
      reply: 'Hoy tienes 3 turnos.',
      actions: [],
    });

    render(<Agent />);
    const input = screen.getByPlaceholderText(/¿Qué turnos tengo/);
    fireEvent.change(input, { target: { value: 'cuántos turnos' } });
    fireEvent.click(screen.getByText('Enviar'));

    await waitFor(() => {
      expect(screen.getByText('Hoy tienes 3 turnos.')).toBeInTheDocument();
    });
  });

  it('muestra mensaje de error cuando la API no está disponible', async () => {
    (sendAgentMessage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    render(<Agent />);
    const input = screen.getByPlaceholderText(/¿Qué turnos tengo/);
    fireEvent.change(input, { target: { value: 'test mensaje' } });
    fireEvent.click(screen.getByText('Enviar'));

    await waitFor(() => {
      expect(screen.getByText('Error al comunicar con el agente. Intenta de nuevo.')).toBeInTheDocument();
    });
  });

  it('no envía mensaje si el input está vacío', async () => {
    render(<Agent />);
    fireEvent.click(screen.getByText('Enviar'));
    expect(sendAgentMessage as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it('deshabilita el input y botón mientras está cargando', async () => {
    let resolveMessage: (val: unknown) => void;
    (sendAgentMessage as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(res => { resolveMessage = res; }));

    render(<Agent />);
    const input = screen.getByPlaceholderText(/¿Qué turnos tengo/);
    fireEvent.change(input, { target: { value: 'mensaje de prueba' } });
    fireEvent.click(screen.getByText('Enviar'));

    await waitFor(() => {
      expect(input).toBeDisabled();
    });

    resolveMessage!({ reply: 'respuesta', actions: [] });
  });
});
