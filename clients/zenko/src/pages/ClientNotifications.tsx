import { useEffect, useState } from 'react';
import { fetchNotifications, fetchClients } from '../services/api';
import type { DBNotification, DBClient } from '../services/api';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';

export default function ClientNotifications() {
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [clients, setClients] = useState<Record<string, DBClient>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchNotifications('all', 'client'),
      fetchClients(),
    ])
      .then(([notifs, cls]) => {
        if (cancelled) return;
        setNotifications(notifs);
        const byId: Record<string, DBClient> = {};
        cls.forEach((c) => { byId[c.id] = c; });
        setClients(byId);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Bell className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Avisos a Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Historial de mensajes que el sistema envio (o esta por enviar) a los clientes.
          </p>
        </div>
      </header>

      {loading ? (
        <SkeletonLoader />
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          Sin avisos registrados todavia.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {notifications.map((n) => {
              const client = clients[n.clientId];
              return (
                <div key={n.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">
                        {client?.name ?? 'Cliente desconocido'}
                      </span>
                      <Badge variant={n.read ? 'entregado' : 'recibido'}>
                        {n.read ? 'Leida' : 'No leida'}
                      </Badge>
                    </div>
                    <div className="text-sm text-foreground mt-1 leading-snug">{n.message}</div>
                    <div className="text-xs text-muted-foreground mt-1">{formatDate(n.createdAt)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
