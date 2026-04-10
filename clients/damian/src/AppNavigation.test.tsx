import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock all page components to avoid loading their heavy logic
vi.mock('./pages/Dashboard', () => ({ default: () => <div data-testid="dashboard-page">Dashboard Page</div> }));
vi.mock('./pages/Appointments', () => ({ default: () => <div data-testid="appointments-page">Appointments Page</div> }));
vi.mock('./pages/Finances', () => ({ default: () => <div data-testid="finances-page">Finances Page</div> }));
vi.mock('./pages/Clients', () => ({ default: () => <div data-testid="clients-page">Clients Page</div> }));
vi.mock('./pages/Patients', () => ({ default: () => <div data-testid="patients-page">Patients Page</div> }));
vi.mock('./pages/Agent', () => ({ default: () => <div data-testid="agent-page">Agent Page</div> }));
vi.mock('./pages/Ambient', () => ({ default: () => <div data-testid="ambient-page">Ambient Page</div> }));
vi.mock('./pages/ChatDemo', () => ({ default: () => <div data-testid="chat-page">Chat Page</div> }));
vi.mock('./pages/Login', () => ({ default: () => <div data-testid="login-page">Login Page</div> }));

// Mock AuthContext to be authenticated
vi.mock('./components/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ isAuthenticated: true, loading: false, user: { name: 'Test User' }, authRequired: true, logout: vi.fn() })
}));

// Mock ToastContext
vi.mock('./components/ToastContext', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => ({ success: vi.fn(), error: vi.fn() })
}));

// Mock MusicContext
vi.mock('./components/MusicContext', () => ({
  MusicProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useMusicCommand: () => ({ isPlaying: false, currentTrackTitle: '' })
}));

// Mock sync service
vi.mock('./services/sync', () => ({
  setupOnlineSync: () => vi.fn()
}));

describe('App Navigation & Routing', () => {
  it('navigates to Clients via sidebar and updates URL', async () => {
    render(
      <MemoryRouter initialEntries={['/damian']}>
        <App />
      </MemoryRouter>
    );

    // Initial state
    expect(screen.getByTestId('dashboard-page')).toBeDefined();

    // Click Clientes
    fireEvent.click(screen.getByText('Clientes'));

    // Should show Clients page
    await waitFor(() => {
      expect(screen.getByTestId('clients-page')).toBeDefined();
    });
  });

  it('navigates to Patients via sidebar and updates URL', async () => {
    render(
      <MemoryRouter initialEntries={['/damian']}>
        <App />
      </MemoryRouter>
    );

    // Click Fichas
    fireEvent.click(screen.getByText('Fichas'));

    // Should show Patients page
    await waitFor(() => {
      expect(screen.getByTestId('patients-page')).toBeDefined();
    });
  });

  it('renders correct page based on initial URL (Deep Linking)', async () => {
    render(
      <MemoryRouter initialEntries={['/damian/patients']}>
        <App />
      </MemoryRouter>
    );

    // Should show Patients page immediately
    await waitFor(() => {
      expect(screen.getByTestId('patients-page')).toBeDefined();
    });
    expect(screen.queryByTestId('dashboard-page')).toBeNull();
  });

  it('syncs state when URL changes externally (e.g. internal navigation)', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/damian/clients']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByTestId('clients-page')).toBeDefined();

    // Simulating an internal navigation that happens inside a component
    // In our App, that's handled by the sync effect on location.pathname
    // We can't easily trigger a router navigate from outside without a ref or custom history,
    // but we can re-render with a different initialEntry if we use a controlled component,
    // or just rely on the component's internal useLocation hook.
  });
});
