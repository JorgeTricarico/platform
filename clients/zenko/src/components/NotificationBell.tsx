import { useState, useEffect, useRef } from 'react';
import { fetchNotifications, markNotificationRead, type DBNotification } from '../services/api';

interface NotificationBellProps {
  clientId: string;
  pollInterval?: number;
}

export default function NotificationBell({ clientId, pollInterval = 30000 }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!clientId) return;

    const load = () => {
      fetchNotifications(clientId)
        .then(setNotifications)
        .catch(() => {});
    };

    load();
    const interval = setInterval(load, pollInterval);
    return () => clearInterval(interval);
  }, [clientId, pollInterval]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch {
      // silent
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'ahora';
    if (diffMin < 60) return `hace ${diffMin}m`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `hace ${diffHours}h`;
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="notification-bell" ref={ref}>
      <button
        className="notification-bell-btn"
        onClick={() => setOpen(!open)}
        aria-label="Notificaciones"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge" data-testid="unread-badge">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown" data-testid="notification-dropdown">
          <div className="notification-dropdown-header">
            Notificaciones
          </div>
          {notifications.length === 0 ? (
            <div className="notification-empty">Sin notificaciones</div>
          ) : (
            <div className="notification-list">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`notification-item ${n.read ? '' : 'unread'}`}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                >
                  <div className="notification-item-message">{n.message}</div>
                  <div className="notification-item-time">{formatTime(n.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
