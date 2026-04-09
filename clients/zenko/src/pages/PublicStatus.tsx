import { useEffect, useState } from 'react';
import { fetchPublicStatus } from '../services/api';
import type { PublicStatusResponse } from '../services/api';

const STEPS = [
  { id: 'recibido', label: 'Recibido', icon: '📥' },
  { id: 'en_proceso', label: 'En Proceso', icon: '🧵' },
  { id: 'listo', label: 'Listo para retirar', icon: '✅' },
  { id: 'entregado', label: 'Entregado', icon: '🛍️' },
];

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
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#F8F9FA' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loader" style={{ marginBottom: '16px' }}></div>
          <p style={{ color: '#666', fontSize: '14px' }}>Consultando el estado de tu prenda...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <h2 style={{ margin: '0 0 12px 0' }}>Ups!</h2>
          <p style={{ color: '#666', marginBottom: '24px' }}>{error || 'No pudimos cargar la información.'}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex(s => s.id === order.status);

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', padding: '24px 16px' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--primary-color)', marginBottom: '8px' }}>
            Zenko<span style={{ color: '#666', fontWeight: 400 }}>.arg</span>
          </div>
          <div style={{ 
            display: 'inline-block', 
            padding: '4px 12px', 
            background: 'white', 
            borderRadius: '20px', 
            fontSize: '12px', 
            fontWeight: 600, 
            color: '#25D366',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            Portal del Cliente
          </div>
        </header>

        <div className="card" style={{ marginBottom: '32px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: '14px', color: '#999', margin: '0 0 4px 0' }}>Hola {order.clientName.split(' ')[0]}, el estado de tu</p>
          <h2 style={{ fontSize: '22px', margin: '0 0 12px 0', color: '#333' }}>{order.garmentName}</h2>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', background: '#F0F0F0', padding: '4px 10px', borderRadius: '15px', color: '#555' }}>
              <strong>Arreglo:</strong> {order.repairType}
            </span>
          </div>

          <div style={{ borderTop: '1px dashed #eee', paddingTop: '16px', marginTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID de Orden</div>
              <div style={{ fontWeight: 700, color: '#333' }}>#{order.id.slice(-6).toUpperCase()}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entrega Estimada</div>
              <div style={{ fontWeight: 700, color: '#333' }}>{new Date(order.deliveryDate + 'T12:00:00').toLocaleDateString('es-AR')}</div>
            </div>
          </div>
        </div>

        {/* Vertical Stepper */}
        <div className="card" style={{ border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', padding: '32px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {STEPS.map((s, idx) => {
              const isCompleted = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              
              return (
                <div key={s.id} style={{ display: 'flex', gap: '20px', position: 'relative' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isCompleted ? '#25D366' : 'white',
                      color: isCompleted ? 'white' : '#CCC',
                      fontSize: isCompleted ? '18px' : '14px',
                      border: isCompleted ? 'none' : '2px solid #EEE',
                      boxShadow: isCurrent ? '0 0 0 4px rgba(37, 211, 102, 0.15)' : 'none',
                      transition: 'all 0.3s ease'
                    }}>
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div style={{ 
                        width: '3px', 
                        height: '48px', 
                        background: idx < currentStepIndex ? '#25D366' : '#EEE',
                        margin: '4px 0',
                        opacity: 0.8
                      }} />
                    )}
                  </div>
                  <div style={{ paddingTop: '6px', flex: 1 }}>
                    <div style={{ 
                      fontWeight: isCompleted ? 700 : 500, 
                      color: isCompleted ? '#333' : '#999',
                      fontSize: '16px'
                    }}>
                      {s.label} {s.icon}
                    </div>
                    {isCurrent && (
                      <div style={{ 
                        display: 'inline-block',
                        fontSize: '11px', 
                        background: 'rgba(37, 211, 102, 0.1)',
                        color: '#25D366', 
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontWeight: 700,
                        marginTop: '4px'
                      }}>
                        ACTUAL
                      </div>
                    )}
                    {!isCompleted && !isCurrent && (
                      <div style={{ fontSize: '13px', color: '#BBB' }}>Pendiente</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px', color: '#999', fontSize: '13px' }}>
          <p>¿Tenes alguna duda? Comunícate con nosotros.</p>
          <div style={{ marginTop: '12px', fontWeight: 600, color: '#444' }}>Zenko Arreglos de Ropa</div>
        </div>
      </div>
    </div>
  );
}
