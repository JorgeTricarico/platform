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
          <CardContent className="pt-5 pb-5">
            <div className="space-y-0">
              {STEPS.map((s, idx) => {
                const isCompleted = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const isLast = idx === STEPS.length - 1;

                return (
                  <div key={s.id} className="flex gap-4">
                    {/* Track column */}
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 z-10',
                          isCurrent
                            ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                            : isCompleted
                              ? 'bg-success text-white'
                              : 'bg-muted text-muted-foreground border border-border'
                        )}
                      >
                        {isCompleted ? '✓' : idx + 1}
                      </div>
                      {!isLast && (
                        <div
                          className={cn(
                            'w-0.5 flex-1 my-1 min-h-6',
                            idx < currentStepIndex ? 'bg-success' : 'bg-border'
                          )}
                        />
                      )}
                    </div>

                    {/* Content column */}
                    <div className={cn('pb-5 flex-1', isLast && 'pb-0')}>
                      <div className="flex items-center gap-2 pt-1">
                        <span
                          className={cn(
                            'text-sm font-medium',
                            isCurrent ? 'font-bold text-foreground' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                          )}
                        >
                          {s.label} {s.icon}
                        </span>
                        {isCurrent && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0">
                            ACTUAL
                          </Badge>
                        )}
                        {!isCompleted && !isCurrent && (
                          <span className="text-xs text-muted-foreground">Pendiente</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center pt-2 pb-4">
          <p className="text-sm text-muted-foreground">¿Tenes alguna duda? Comunícate con nosotros.</p>
          <p className="text-xs text-muted-foreground/60 mt-1 font-medium">{BUSINESS.name} {BUSINESS.serviceDescription}</p>
        </div>
      </div>
    </div>
  );
}
