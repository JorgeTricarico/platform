import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChatDemo from './ChatDemo';

// Mock scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = vi.fn();

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ reply: 'Hola, soy Ana de Zenko' }),
  });
});

describe('ChatDemo page', () => {
  it('renders without crashing', () => {
    render(<ChatDemo />);
    expect(screen.getByText('Demo del Bot de WhatsApp')).toBeInTheDocument();
  });

  it('renders scenario tabs', () => {
    render(<ChatDemo />);
    expect(screen.getByText('Chat libre')).toBeInTheDocument();
    expect(screen.getByText('Estado de prenda')).toBeInTheDocument();
    expect(screen.getByText('Presupuesto')).toBeInTheDocument();
  });

  it('renders chat input and send button', () => {
    render(<ChatDemo />);
    expect(screen.getByPlaceholderText('Escribe un mensaje...')).toBeInTheDocument();
  });

  it('renders empty state message', () => {
    render(<ChatDemo />);
    expect(screen.getByText('Escribe un mensaje para empezar la conversación')).toBeInTheDocument();
  });

  it('sends a message when user types and presses Enter', async () => {
    render(<ChatDemo />);
    const input = screen.getByPlaceholderText('Escribe un mensaje...');
    fireEvent.change(input, { target: { value: 'Hola' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Hola')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/chat'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('shows bot reply after sending message', async () => {
    render(<ChatDemo />);
    const input = screen.getByPlaceholderText('Escribe un mensaje...');
    fireEvent.change(input, { target: { value: 'Hola' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Hola, soy Ana de Zenko')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    render(<ChatDemo />);
    const input = screen.getByPlaceholderText('Escribe un mensaje...');
    fireEvent.change(input, { target: { value: 'Hola' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/asistente de IA no está disponible/)).toBeInTheDocument();
    });
  });

  it('handles network error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ChatDemo />);
    const input = screen.getByPlaceholderText('Escribe un mensaje...');
    fireEvent.change(input, { target: { value: 'Hola' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/asistente de IA no está disponible/)).toBeInTheDocument();
    });
  });

  it('switches scenario when tab is clicked', async () => {
    render(<ChatDemo />);
    fireEvent.click(screen.getByText('Estado de prenda'));

    // First message is auto-sent for this scenario
    await waitFor(() => {
      expect(screen.getByText('Hola, quiero saber como va mi arreglo')).toBeInTheDocument();
    });
  });
});
