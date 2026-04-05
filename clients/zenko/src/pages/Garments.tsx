import { useEffect, useState } from 'react';
import { fetchGarments } from '../services/api';
import type { DBGarment } from '../services/api';

export default function Garments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [garments, setGarments] = useState<DBGarment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGarments()
      .then(data => {
        setGarments(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error al obtener prendas:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Cargando lista de prendas...</div>;
  
  const filtered = garments.filter(g => 
    g.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.garmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'recibido': return <span className="badge pending">Recibido</span>;
      case 'en_proceso': return <span className="badge urgent">En Proceso</span>;
      case 'listo': return <span className="badge completed">Listo para Entrega</span>;
      case 'entregado': return <span className="badge">Entregado</span>;
      default: return null;
    }
  };

  return (
    <div>
      <div className="flex-between">
        <div>
          <h1>Gestión de Prendas</h1>
          <p className="subtitle">Administra los arreglos de tus clientes detalladamente.</p>
        </div>
        <button className="btn btn-primary">Registrar Ingreso</button>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px' }}>
          <input 
            type="text" 
            placeholder="Buscar por cliente, prenda o nro orden..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              width: '320px',
              outline: 'none',
              fontFamily: 'inherit',
              fontSize: '14px'
            }}
          />
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID Orden</th>
                <th>Cliente</th>
                <th>Prenda & Detalle</th>
                <th>Costo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(g => (
                <tr key={g.id}>
                  <td style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>#{g.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{g.clientName}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{g.clientPhone}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{g.garmentName} ({g.repairType})</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {g.description}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>${g.price.toLocaleString()}</td>
                  <td>{getStatusBadge(g.status)}</td>
                  <td>
                    <button className="btn" style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)' }}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
