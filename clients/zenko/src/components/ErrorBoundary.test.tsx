import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function ThrowError(): null {
  throw new Error('Test error');
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renderiza children cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <span>Contenido normal</span>
      </ErrorBoundary>
    );
    expect(screen.getByText('Contenido normal')).toBeInTheDocument();
  });

  it('muestra mensaje de error cuando un child lanza', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Algo salió mal/i)).toBeInTheDocument();
  });

  it('muestra botón "Recargar"', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
      configurable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const btn = screen.getByRole('button', { name: /recargar/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
