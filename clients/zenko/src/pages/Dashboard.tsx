import { useEffect, useState } from 'react';
import { fetchGarments, fetchDashboard, createGarment } from '../services/api';
import type { DBGarment, DashboardData } from '../services/api';
import { useToast } from '../components/ToastContext';
import GarmentModal, { EMPTY_FORM } from '../components/GarmentModal';
import StaleGarmentsWidget from '../components/StaleGarmentsWidget';
import type { GarmentFormState } from '../components/GarmentModal';

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

  if (loading && garments.length === 0) return <div>Cargando dashboard...</div>;

  const pendingGarments = garments.filter(g => g.status !== 'entregado');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const urgentGarments = pendingGarments.filter(g => new Date(g.deliveryDate + 'T23:59:59') <= tomorrow).sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime());

  const monthlyIncome = dashData?.monthlyIncome ?? 0;
  const monthlyExpenses = dashData?.monthlyExpenses ?? 0;
  const balance = monthlyIncome - monthlyExpenses;

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
    <div>
      <div className="flex-between">
        <div>
          <h1>Hola, Ana 👋</h1>
          <p className="subtitle">Aquí tienes el resumen de tu taller al día de hoy.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ Nueva Orden</button>
      </div>

      <div className="grid grid-cols-3" style={{ marginBottom: '40px' }}>
        <div className="card">
          <div className="stat-title">Prendas Pendientes</div>
          <div className="stat-value">{pendingGarments.length}</div>
        </div>
        <div className="card">
          <div className="stat-title">Ingresos del Mes</div>
          <div className="stat-value" style={{ color: 'var(--success-color, #22c55e)' }}>${monthlyIncome.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="stat-title">Balance Mensual</div>
          <div className="stat-value">${balance.toLocaleString()}</div>
        </div>
      </div>

      <h2>Prioritarios: Proximas Entregas</h2>
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
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
                    <div style={{ fontWeight: 600 }}>{g.clientName}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{g.clientPhone}</div>
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
