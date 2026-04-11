import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from './Login';

const mockLogin = vi.fn();
const mockLoginAsDemo = vi.fn();
let mockAuthRequired = false;

vi.mock('../components/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin, loginAsDemo: mockLoginAsDemo, authRequired: mockAuthRequired }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthRequired = false;
});

describe('Login page', () => {
  it('renders without crash', () => {
    render(<Login />);
    expect(screen.getByText('Iniciar Sesion')).toBeInTheDocument();
  });

  it('muestra inputs de nombre y password', () => {
    render(<Login />);
    expect(screen.getByPlaceholderText('Tu nombre')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tu contrasena')).toBeInTheDocument();
  });

  it('muestra botón "Probar Demo" cuando authRequired es false', () => {
    render(<Login />);
    expect(screen.getByText('Probar Demo')).toBeInTheDocument();
  });

  it('NO muestra botón "Probar Demo" cuando authRequired es true', () => {
    mockAuthRequired = true;
    render(<Login />);
    expect(screen.queryByText('Probar Demo')).not.toBeInTheDocument();
  });

  it('llama login() con nombre y password al submit', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText('Tu nombre'), {
      target: { value: 'Ana' },
    });
    fireEvent.change(screen.getByPlaceholderText('Tu contrasena'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByText('Iniciar Sesion'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('Ana', 'secret123');
    });
  });

  it('muestra error cuando login falla', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Credenciales incorrectas'));
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText('Tu nombre'), {
      target: { value: 'Ana' },
    });
    fireEvent.change(screen.getByPlaceholderText('Tu contrasena'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByText('Iniciar Sesion'));

    await waitFor(() => {
      expect(screen.getByText('Credenciales incorrectas')).toBeInTheDocument();
    });
  });

  it('llama loginAsDemo() cuando se clickea "Probar Demo"', () => {
    render(<Login />);
    fireEvent.click(screen.getByText('Probar Demo'));
    expect(mockLoginAsDemo).toHaveBeenCalledTimes(1);
  });
});
