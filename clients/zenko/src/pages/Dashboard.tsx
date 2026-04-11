import { useEffect, useState, useMemo } from 'react';
import { fetchGarments, fetchDashboard, createGarment } from '../services/api';
import type { DBGarment, DashboardData } from '../services/api';
import { useToast } from '../components/ToastContext';
import GarmentModal, { EMPTY_FORM } from '../components/GarmentModal';
import StaleGarmentsWidget from '../components/StaleGarmentsWidget';
import type { GarmentFormState } from '../components/GarmentModal';
import { SkeletonLoader } from '../components/SkeletonLoader';

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
      await createGarment({ ...formData, price: Number(formData.price) });
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
      case 'recibido': return <span className="badge pending">Recibido</span>;
      case 'en_proceso': return <span className="badge urgent">En Proceso</span>;
      case 'listo': return <span className="badge completed">Listo</span>;
      default: return <span className="badge">Entregado</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="flex-between" style={{ marginBottom: '20px', flexShrink: 0 }}>
        <div>
          <h1>Hola, Ana 👋</h1>
          <p className="subtitle" style={{ margin: 0, fontSize: '14px' }}>Aquí tienes el resumen de tu taller al día de hoy.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ Nueva Orden</button>
      </div>

      <div className="grid grid-cols-4" style={{ marginBottom: '24px', flexShrink: 0 }}>
        <div className="card">
          <div className="stat-title">Para Arreglar</div>
          <div className="stat-value">{itemsToRepair}</div>
        </div>
        <div className="card">
          <div className="stat-title">Para Entregar</div>
          <div className="stat-value">{itemsToDeliver}</div>
        </div>
        <div className="card">
          <div className="stat-title">Ingresos Mes</div>
          <div className="stat-value" style={{ color: 'var(--success-color, #22c55e)' }}>${monthlyIncome.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="stat-title">Balance</div>
          <div className="stat-value">${balance.toLocaleString()}</div>
        </div>
      </div>

      <h2 style={{ marginBottom: '12px', fontSize: '18px', flexShrink: 0 }}>Prioritarios: Arreglos Pendientes</h2>
      <div className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Prenda</th>
                <th>Arreglo</th>
                <th>Estado</th>
                <th>Entrega</th>
              </tr>
            </thead>
            <tbody>
              {urgentGarments.map(g => (
                <tr key={g.id}>
                  <td>
                    <div style={{ fontWeight: 600, textTransform: 'uppercase' }}>{g.clientName}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                      {g.clientPhone}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.6, marginTop: '2px', fontFamily: 'monospace' }}>ORD-{String(g.orderNumber).padStart(3, '0')}</div>
                  </td>
                  <td>{g.garmentName}</td>
                  <td style={{ textTransform: 'capitalize' }}>{g.repairType}</td>
                  <td>{getStatusBadge(g.status)}</td>
                  <td style={{ fontWeight: 600, color: 'var(--urgent-color)' }}>{formatDate(g.deliveryDate)}</td>
                </tr>
              ))}
              {urgentGarments.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No hay entregas urgentes proximas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <StaleGarmentsWidget />
      </div>

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
