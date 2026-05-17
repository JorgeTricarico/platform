import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NotificationBell from './NotificationBell';
import { mockNotifications } from '../mocks/data';

// Mock the API module
vi.mock('../services/api', () => ({
  fetchNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
}));

import { fetchNotifications, markNotificationRead } from '../services/api';

const mockFetch = fetchNotifications as ReturnType<typeof vi.fn>;
const mockMarkRead = markNotificationRead as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue(mockNotifications);
  mockMarkRead.mockResolvedValue({ ...mockNotifications[0], read: true });
});

describe('NotificationBell', () => {
  it('renders bell button', async () => {
    await act(async () => { render(<NotificationBell clientId="all" />); });
    expect(screen.getByLabelText('Notificaciones')).toBeInTheDocument();
  });

  it('shows unread badge with correct count', async () => {
    await act(async () => { render(<NotificationBell clientId="all" />); });
    await waitFor(() => {
      expect(screen.getByTestId('unread-badge')).toHaveTextContent('2');
    });
  });

  it('does not show badge when all notifications are read', async () => {
    mockFetch.mockResolvedValue(mockNotifications.map(n => ({ ...n, read: true })));
    await act(async () => { render(<NotificationBell clientId="all" />); });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument();
  });

  it('opens dropdown on click and shows notifications', async () => {
    render(<NotificationBell clientId="all" />);
    await waitFor(() => {
      expect(screen.getByTestId('unread-badge')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Notificaciones'));
    expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
    expect(screen.getByText(/Pantalon/)).toBeInTheDocument();
    expect(screen.getByText(/Vestido/)).toBeInTheDocument();
    expect(screen.getByText(/Campera/)).toBeInTheDocument();
  });

  it('shows empty state when no notifications', async () => {
    mockFetch.mockResolvedValue([]);
    render(<NotificationBell clientId="all" />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByLabelText('Notificaciones'));
    expect(screen.getByText(/Sin alertas|Sin notificaciones/)).toBeInTheDocument();
  });

  it('marks notification as read on click', async () => {
    render(<NotificationBell clientId="all" />);
    await waitFor(() => {
      expect(screen.getByTestId('unread-badge')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Notificaciones'));
    fireEvent.click(screen.getByText(/Pantalon/));

    await waitFor(() => {
      expect(mockMarkRead).toHaveBeenCalledWith('n1');
    });
  });

  it('calls fetchNotifications with audience=staff (alertas internas)', async () => {
    // Bug fix: la campana de Ana solo debe mostrar alertas dirigidas a staff,
    // no las notificaciones que el sistema genera para los clientes.
    render(<NotificationBell clientId="all" />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('all', 'staff');
    });
  });

  it('closes dropdown on Escape key', async () => {
    render(<NotificationBell clientId="all" />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByLabelText('Notificaciones'));
    expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    });
    expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
  });

  it('closes dropdown on outside click', async () => {
    render(<NotificationBell clientId="all" />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByLabelText('Notificaciones'));
    expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
  });
});
