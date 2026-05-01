import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CameraCapture from './CameraCapture';

// Mock HTMLVideoElement.play
window.HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);

const mockStream = {
  getTracks: () => [{ stop: vi.fn() }],
  getVideoTracks: () => [{ stop: vi.fn() }],
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
    },
    writable: true,
  });
});

describe('CameraCapture', () => {
  it('renderiza botón de captura', async () => {
    render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByRole('button', { name: /capturar/i })).toBeInTheDocument();
  });

  it('renderiza botón de cambiar cámara', async () => {
    render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByRole('button', { name: /voltear|cambiar cámara/i })).toBeInTheDocument();
  });

  it('renderiza botón de cerrar', async () => {
    render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByRole('button', { name: /cerrar/i })).toBeInTheDocument();
  });

  it('llama onClose al hacer click en cerrar', async () => {
    const onClose = vi.fn();
    render(<CameraCapture onCapture={vi.fn()} onClose={onClose} />);
    const btn = await screen.findByRole('button', { name: /cerrar/i });
    fireEvent.click(btn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('muestra error si getUserMedia falla', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied')),
      },
      writable: true,
    });
    render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/no se pudo acceder a la cámara/i)).toBeInTheDocument();
    });
  });
});
