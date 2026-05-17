import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

vi.mock('../lib/errorLogger', () => ({
  logError: vi.fn(),
}));

import { logError } from '../lib/errorLogger';

function ThrowError(): null {
  throw new Error('Test error');
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.clearAllMocks();
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

  it('muestra mensaje amigable de seguridad para el usuario', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText(/tu trabajo está a salvo/i)).toBeInTheDocument();
  });

  it('muestra botón "Recargar" que llama a window.location.reload', () => {
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

  it('reporta el error a logError con type: react.boundary', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(logError).toHaveBeenCalledTimes(1);
    const [errArg, levelArg, metaArg] = (logError as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(errArg).toBeInstanceOf(Error);
    expect((errArg as Error).message).toBe('Test error');
    expect(levelArg).toBe('error');
    expect(metaArg).toMatchObject({ type: 'react.boundary' });
    expect(typeof metaArg.componentStack).toBe('string');
  });
});
