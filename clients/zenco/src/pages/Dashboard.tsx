import { useEffect, useState } from 'react';
import { fetchGarments, fetchFinances, createGarment } from '../services/api';
import type { DBGarment, DBFinance } from '../services/api';

export default function Dashboard() {
  const [garments, setGarments] = useState<DBGarment[]>([]);
  const [finances, setFinances] = useState<DBFinance[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '', clientPhone: '', garmentName: '', repairType: '', description: '', deliveryDate: '', price: 0
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([fetchGarments(), fetchFinances()])
      .then(([gData, fData]) => {
        setGarments(gData);
        setFinances(fData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error al cargar data:", err);
        setLoading(false);
      });
  };

  useEffect(() => { loadData(); }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createGarment({ ...formData, price: Number(formData.price) });
      setIsModalOpen(false);
      setFormData({ clientName: '', clientPhone: '', garmentName: '', repairType: '', description: '', deliveryDate: '', price: 0 });
      loadData(); // Refrescar la tabla
    } catch (error) {
      alert("Error al guardar la orden");
    }
  };

  if (loading && garments.length === 0) return <div>Cargando dashboard...</div>;

  const pendingGarments = garments.filter(g => g.status !== 'entregado');
  const urgentGarments = pendingGarments.filter(g => new Date(g.deliveryDate) <= new Date('2026-04-06')).sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime());
  
  const totalIncome = finances.filter(f => f.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = finances.filter(f => f.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpenses;

  const formatDate = (dateStr: string) => {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    return new Date(dateStr).toLocaleDateString('es-AR', options);
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
          <div className="stat-title">Balance Mensual</div>
          <div className="stat-value">${balance.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="stat-title">Próximos a Vencer</div>
          <div className="stat-value" style={{ color: 'var(--urgent-color)'}}>{urgentGarments.length}</div>
        </div>
      </div>

      <h2>Prioritarios: Próximas Entregas</h2>
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
                    No hay entregas urgentes próximas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '450px', padding: '32px' }}>
            <h2 style={{ marginTop: 0 }}>Registrar Nueva Orden</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'flex', gap: '16px' }}>
                <input required name="clientName" placeholder="Nombre Cliente" value={formData.clientName} onChange={handleInputChange} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                <input required name="clientPhone" placeholder="Teléfono" value={formData.clientPhone} onChange={handleInputChange} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>
              
              <input required name="garmentName" placeholder="Ej: Pantalón de Vestir" value={formData.garmentName} onChange={handleInputChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              
              <div style={{ display: 'flex', gap: '16px' }}>
                <select required name="repairType" value={formData.repairType} onChange={handleInputChange} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                  <option value="">Tipo de Arreglo...</option>
                  <option value="dobladillo">Dobladillo</option>
                  <option value="cierre">Cambio de Cierre</option>
                  <option value="entalle">Entalle / Achicar</option>
                  <option value="diseño">Diseño Nuevo</option>
                </select>
                <input required name="price" type="number" placeholder="Costo ($)" value={formData.price || ''} onChange={handleInputChange} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>

              <input required name="description" placeholder="Detalle exacto del trabajo a realizar..." value={formData.description} onChange={handleInputChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              <input required name="deliveryDate" type="date" value={formData.deliveryDate} onChange={handleInputChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear Orden</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
