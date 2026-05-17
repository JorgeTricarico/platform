import { useEffect, useState } from 'react';
import { fetchStaleGarments } from '../services/api';
import type { StaleGarment } from '../services/api';
import { BUSINESS } from '../config';
import { SkeletonCard } from './SkeletonLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { buildWhatsAppUrl } from '../lib/phone';
import { MessageCircle } from 'lucide-react';

export default function StaleGarmentsWidget() {
  const [garments, setGarments] = useState<StaleGarment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaleGarments()
      .then(setGarments)
      .catch(err => console.error('Error cargando prendas sin retirar:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonCard />;

  const formatDate = (dateStr: string) => {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', options);
  };

  const daysOverdue = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr + 'T00:00:00').getTime();
    return Math.floor(diff / 86400000);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Prendas Listas sin Retirar
        </CardTitle>
      </CardHeader>
      <CardContent>
        {garments.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-0">No hay prendas pendientes de retiro.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {garments.map(g => (
              <div key={g.id} className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{g.clientName}</div>
                  <div className="text-xs text-muted-foreground">{(g.items ?? []).map(i => i.garmentName).join(', ')}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="overdue" className="text-xs whitespace-nowrap">
                    {daysOverdue(g.deliveryDate)} dias — {formatDate(g.deliveryDate)}
                  </Badge>
                  {(() => {
                    const url = buildWhatsAppUrl(
                      g.clientPhone,
                      BUSINESS.whatsappReminderMsg(g.clientName, (g.items ?? []).map(i => i.garmentName).join(', ') || 'pedido')
                    );
                    return url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(buttonVariants({ variant: 'success', size: 'sm' }))}
                      >
                        <MessageCircle className="w-3 h-3" />
                        Avisar
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        title="Teléfono inválido"
                        className={cn(buttonVariants({ variant: 'success', size: 'sm' }), 'opacity-50 cursor-not-allowed')}
                      >
                        <MessageCircle className="w-3 h-3" />
                        Avisar
                      </button>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
