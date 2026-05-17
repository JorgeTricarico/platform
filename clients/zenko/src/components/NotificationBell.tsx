import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { fetchNotifications, markNotificationRead, type DBNotification } from '../services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
      // La campana solo trae alertas internas para Ana (audience=staff).
      // Los avisos enviados a clientes (audience=client) viven en la pagina
      // "Historial de avisos a clientes", no en la campana.
      fetchNotifications(clientId, 'staff')
        .then(setNotifications)
        .catch(() => {});
    };

    load();
    const interval = setInterval(load, pollInterval);
    return () => clearInterval(interval);
  }, [clientId, pollInterval]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

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
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        aria-label="Notificaciones"
        aria-expanded={open}
        aria-haspopup="true"
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge
            data-testid="unread-badge"
            className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center rounded-full"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      {open && (
        <div
          data-testid="notification-dropdown"
          className="absolute right-0 top-full mt-2 w-[min(18rem,90vw)] bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
          style={{ maxWidth: 'calc(100vw - 1rem)' }}
        >
          <div className="px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Alertas</span>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Sin alertas
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-border">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={cn(
                    'px-4 py-3 cursor-pointer hover:bg-muted transition-colors',
                    !n.read && 'bg-primary/5'
                  )}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                >
                  <div className="text-sm text-foreground leading-snug">{n.message}</div>
                  <div className="text-xs text-muted-foreground mt-1">{formatTime(n.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
