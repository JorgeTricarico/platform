import { useEffect, useState } from 'react';
import { fetchPublicStatus } from '../services/api';
import type { PublicStatusResponse } from '../services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BUSINESS } from '../config/business';

const STEPS = [
  { id: 'recibido',   label: 'Recibido',           icon: '📥' },
  { id: 'en_proceso', label: 'En Proceso',          icon: '🧵' },
  { id: 'listo',      label: 'Listo para retirar',  icon: '✅' },
  { id: 'entregado',  label: 'Entregado',           icon: '🛍️' },
];

const STATUS_HERO: Record<string, { bg: string; text: string; emoji: string; headline: string; sub: string }> = {
  recibido: {
    bg: 'bg-slate-100 border-slate-300',
    text: 'text-slate-700',
    emoji: '📥',
    headline: '¡Recibimos tu prenda!',
    sub: 'Ya está en el taller. Te avisaremos cuando esté lista.',
  },
  en_proceso: {
    bg: 'bg-blue-50 border-blue-300',
    text: 'text-blue-700',
    emoji: '🧵',
    headline: 'Tu prenda está en proceso',
    sub: 'Estamos trabajando en tu arreglo.',
  },
  listo: {
    bg: 'bg-green-50 border-green-400',
    text: 'text-green-700',
    emoji: '✅',
    headline: '¡Tu prenda está lista para retirar!',
    sub: 'Podés pasar a buscarla en cualquier momento.',
  },
  entregado: {
    bg: 'bg-purple-50 border-purple-300',
    text: 'text-purple-700',
    emoji: '🛍️',
    headline: 'Prenda entregada',
    sub: '¡Gracias por elegirnos!',
  },
};

export default function PublicStatus() {
  const [order, setOrder] = useState<PublicStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order');
    if (!orderId) {
      setError('No se proporcionó un código de orden válido.');
      setLoading(false);
      return;
    }

    fetchPublicStatus(orderId)
      .then(setOrder)
      .catch(err => {
        console.error(err);
        setError('No pudimos encontrar tu pedido. Por favor, verifica el código en tu ticket.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Consultando el estado de tu prenda...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 pb-6 flex flex-col items-center text-center gap-3">
            <span className="text-4xl">🔍</span>
            <h2 className="text-xl font-bold text-foreground">Ups!</h2>
            <p className="text-sm text-muted-foreground">{error || 'No pudimos cargar la información.'}</p>
            <Button onClick={() => window.location.reload()}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex(s => s.id === order.status);
  const hero = STATUS_HERO[order.status] ?? STATUS_HERO.recibido;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Header */}
        <header className="flex items-center justify-between mb-2">
          <span className="text-xl font-bold text-foreground">
            {BUSINESS.brandLabel}<span className="text-primary">{BUSINESS.brandSuffix}</span>
          </span>
          <Badge variant="secondary">Portal del Cliente</Badge>
        </header>

        {/* Status Hero — prominente, primer vistazo */}
        <div
          data-testid="status-hero"
          className={cn(
            'rounded-2xl border-2 px-6 py-6 flex flex-col items-center text-center gap-2',
            hero.bg,
          )}
        >
          <span className="text-5xl leading-none">{hero.emoji}</span>
          <h1 className={cn('text-2xl font-extrabold leading-tight mt-1', hero.text)}>
            {hero.headline}
          </h1>
          <p className={cn('text-sm', hero.text, 'opacity-80')}>{hero.sub}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Hola <strong>{order.clientName.split(' ')[0]}</strong> — <span className="font-medium">{order.garmentName}</span>
          </p>
        </div>

        {/* Order card */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="mb-3">
              <Badge variant="secondary">
                <strong className="mr-1">Arreglo:</strong> {order.repairType}
              </Badge>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">ID de Orden</div>
                <div className="text-sm font-semibold text-foreground">
                  ORD-{String(order.orderNumber).padStart(6, '0')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-0.5">Entrega Estimada</div>
                <div className="text-sm font-semibold text-foreground">
                  {new Date(order.deliveryDate + 'T12:00:00').toLocaleDateString('es-AR')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vertical Stepper */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="space-y-1">
              {STEPS.map((s, idx) => {
                const isPast    = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const isLast    = idx === STEPS.length - 1;

                if (isCurrent) {
                  return (
                    <div key={s.id}>
                      <div className={cn(
                        'rounded-2xl border-2 px-4 py-4 flex items-center gap-4',
                        hero.bg
                      )}>
                        <span className="text-4xl leading-none flex-shrink-0">{s.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn('text-xl font-black leading-tight', hero.text)}>{s.label}</span>
                            <Badge variant="default" className="text-[11px] px-2 py-0.5 animate-pulse font-bold">AHORA</Badge>
                          </div>
                          <p className={cn('text-xs mt-0.5 opacity-75', hero.text)}>{hero.sub}</p>
                        </div>
                      </div>
                      {!isLast && <div className="w-0.5 h-4 bg-border/40 ml-7 my-0.5" />}
                    </div>
                  );
                }

                return (
                  <div key={s.id}>
                    <div className="flex items-center gap-3 py-1">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                        isPast ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground/40 border border-border'
                      )}>
                        {isPast ? '✓' : '·'}
                      </div>
                      <span className={cn(
                        'text-sm font-medium',
                        isPast ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground/50'
                      )}>
                        {s.label}{isPast ? ` ${s.icon}` : ''}
                      </span>
                    </div>
                    {!isLast && <div className="w-0.5 h-3 bg-border/30 ml-4" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Otras prendas activas del cliente */}
        {order.otherActiveOrders && order.otherActiveOrders.length > 0 && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Tus otras prendas en el taller
              </h3>
              <div className="space-y-2">
                {order.otherActiveOrders.map((o) => (
                  <div key={o.orderNumber} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div>
                      <span className="text-sm font-medium text-foreground">{o.garmentName}</span>
                      <span className="text-xs text-muted-foreground ml-1">({o.repairType})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        o.status === 'listo' ? 'bg-green-100 text-green-700' :
                        o.status === 'en_proceso' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      )}>
                        {o.status === 'listo' ? '✅ Lista' :
                         o.status === 'en_proceso' ? '🧵 En proceso' : '📥 Recibida'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center pt-2 pb-4">
          <p className="text-sm text-muted-foreground">¿Tenes alguna duda? Comunícate con nosotros.</p>
          <p className="text-xs text-muted-foreground/60 mt-1 font-medium">{BUSINESS.name} {BUSINESS.serviceDescription}</p>
        </div>
      </div>
    </div>
  );
}
