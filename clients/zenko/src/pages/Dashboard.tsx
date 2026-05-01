import { useEffect, useState, useMemo } from 'react';
import { fetchGarments, fetchDashboard, createGarment } from '../services/api';
import type { DBGarment, DashboardData } from '../services/api';
import { useToast } from '../components/ToastContext';
import GarmentModal, { EMPTY_FORM } from '../components/GarmentModal';
import StaleGarmentsWidget from '../components/StaleGarmentsWidget';
import type { GarmentFormState } from '../components/GarmentModal';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Smartphone } from 'lucide-react';
import { BUSINESS } from '../config/business';

export default function Dashboard() {
  const toast = useToast();
  const [garments, setGarments] = useState<DBGarment[]>([]);
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<GarmentFormState>({ ...EMPTY_FORM });

  const loadData = () => {
    setLoading(true);
    Promise.all([fetchGarments(), fetchDashboard()])
      .then(([gData, dData]) => {
        setGarments(gData);
        setDashData(dData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error al cargar data:", err);
        setLoading(false);
      });
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const items = (formData.items && formData.items.length > 0)
        ? formData.items
        : [{ garmentName: formData.garmentName, repairType: formData.repairType, description: formData.description, price: Number(formData.price) }];
      await createGarment({ clientName: formData.clientName, clientPhone: formData.clientPhone, deliveryDate: formData.deliveryDate, intakeDate: formData.intakeDate, deposit: Number(formData.deposit || 0), items: items.map(i => ({ garmentName: i.garmentName, repairType: i.repairType, description: i.description || '', price: Number(i.price) })) });
      toast.success('Orden guardada correctamente');
      setIsModalOpen(false);
      setFormData({ ...EMPTY_FORM });
      loadData();
    } catch {
      toast.error('Error al guardar la orden');
    }
  };

  const itemsToRepair = useMemo(
    () => garments.filter(g => g.status === 'recibido' || g.status === 'en_proceso').length,
    [garments]
  );

  const itemsToDeliver = useMemo(
    () => garments.filter(g => g.status === 'listo').length,
    [garments]
  );

  const urgentGarments = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return garments
      .filter(g => (g.status === 'recibido' || g.status === 'en_proceso') && new Date(g.deliveryDate + 'T23:59:59') <= tomorrow)
      .sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime());
  }, [garments]);

  const { monthlyIncome, balance } = useMemo(() => {
    const income = dashData?.monthlyIncome ?? 0;
    const expenses = dashData?.monthlyExpenses ?? 0;
    return { monthlyIncome: income, monthlyExpenses: expenses, balance: income - expenses };
  }, [dashData]);

  if (loading && garments.length === 0) return <SkeletonLoader rows={5} />;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'recibido': return <Badge variant="recibido">Recibido</Badge>;
      case 'en_proceso': return <Badge variant="en_proceso">En Proceso</Badge>;
      case 'listo': return <Badge variant="listo">Listo</Badge>;
      default: return <Badge variant="entregado">Entregado</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{BUSINESS.greeting} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {BUSINESS.subtitle}
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Nueva Orden
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Para Arreglar
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 pt-1">
            <div className="text-2xl sm:text-3xl font-bold">{itemsToRepair}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Para Entregar
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 pt-1">
            <div className="text-2xl sm:text-3xl font-bold">{itemsToDeliver}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ingresos Mes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 pt-1">
            <div className="text-2xl sm:text-3xl font-bold text-status-positive">${monthlyIncome.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 pt-1">
            <div className="text-2xl sm:text-3xl font-bold">${balance.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Urgent garments */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Prioritarios: Arreglos Pendientes</h2>

        {urgentGarments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No hay entregas urgentes próximas.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {urgentGarments.map(g => (
                <Card key={g.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        ORD-{String(g.orderNumber).padStart(6, '0')}
                      </span>
                      {getStatusBadge(g.status)}
                    </div>
                    <div className="font-bold text-sm uppercase">{g.clientName}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Smartphone className="w-3 h-3" />
                      {g.clientPhone}
                    </div>
                    <div className="mt-2 text-sm">
                      {(g.items ?? []).map((item, idx) => (
                        <div key={idx}><span className="font-semibold">{item.garmentName}</span><span className="text-muted-foreground"> — {item.repairType}</span></div>
                      ))}
                    </div>
                    <div className="mt-2 text-xs font-bold text-status-negative">
                      Entrega: {formatDate(g.deliveryDate)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop: table */}
            <Card className="hidden md:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Cliente</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Prenda</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Arreglo</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Estado</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Entrega</th>
                    </tr>
                  </thead>
                  <tbody>
                    {urgentGarments.map((g, i) => (
                      <tr
                        key={g.id}
                        className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold uppercase">{g.clientName}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Smartphone className="w-3 h-3" />
                            {g.clientPhone}
                          </div>
                          <div className="text-xs text-muted-foreground/60 font-mono mt-0.5">
                            ORD-{String(g.orderNumber).padStart(6, '0')}
                          </div>
                        </td>
                        <td className="px-4 py-3">{(g.items ?? []).map(i => i.garmentName).join(', ')}</td>
                        <td className="px-4 py-3 capitalize">{(g.items ?? []).map(i => i.repairType).join(', ')}</td>
                        <td className="px-4 py-3">{getStatusBadge(g.status)}</td>
                        <td className="px-4 py-3 font-semibold text-status-negative">
                          {formatDate(g.deliveryDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Stale garments widget */}
      <StaleGarmentsWidget />

      {isModalOpen && (
        <GarmentModal
          title="Registrar Nueva Orden"
          form={formData}
          setForm={setFormData}
          onSubmit={handleCreate}
          onClose={() => setIsModalOpen(false)}
          showStatus={false}
        />
      )}
    </div>
  );
}
