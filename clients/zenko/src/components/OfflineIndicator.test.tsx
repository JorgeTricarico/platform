import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OfflineIndicator } from './OfflineIndicator';

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    value,
    writable: true,
    configurable: true,
  });
}

afterEach(() => {
  // Restaurar a online por defecto entre tests
  setOnline(true);
});

describe('OfflineIndicator', () => {
  it('no renderiza nada cuando está online', () => {
    setOnline(true);
    const { container } = render(<OfflineIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('muestra banner cuando está offline', () => {
    setOnline(false);
    render(<OfflineIndicator />);
    expect(screen.getByText(/Sin conexion/i)).toBeInTheDocument();
  });

  it('desaparece cuando vuelve online', () => {
    setOnline(false);
    render(<OfflineIndicator />);
    expect(screen.getByText(/Sin conexion/i)).toBeInTheDocument();

    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.queryByText(/Sin conexion/i)).not.toBeInTheDocument();
  });
});
