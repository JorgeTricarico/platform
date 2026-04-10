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
      <div className="public-page-center">
        <div className="public-loading-inner">
          <div className="loader"></div>
          <p className="public-loading-text">Consultando el estado de tu prenda...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="public-page-error">
        <div className="card" style={{ maxWidth: '400px' }}>
          <div className="public-error-icon">🔍</div>
          <h2 className="public-error-title">Ups!</h2>
          <p className="public-error-message">{error || 'No pudimos cargar la información.'}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex(s => s.id === order.status);

  return (
    <div className="public-page">
      <div className="public-container">
        <header className="public-header">
          <div className="public-brand">
            Zenko<span className="public-brand-suffix">.arg</span>
          </div>
          <div className="public-portal-badge">
            Portal del Cliente
          </div>
        </header>

        <div className="card public-card">
          <p className="public-card-greeting">Hola {order.clientName.split(' ')[0]}, el estado de tu</p>
          <h2 className="public-card-garment-name">{order.garmentName}</h2>

          <div className="public-tags-row">
            <span className="public-tag">
              <strong>Arreglo:</strong> {order.repairType}
            </span>
          </div>

          <div className="public-card-footer">
            <div>
              <div className="public-meta-label">ID de Orden</div>
              <div className="public-meta-value">#{order.id.slice(-6).toUpperCase()}</div>
            </div>
            <div className="public-card-footer-right">
              <div className="public-meta-label">Entrega Estimada</div>
              <div className="public-meta-value">{new Date(order.deliveryDate + 'T12:00:00').toLocaleDateString('es-AR')}</div>
            </div>
          </div>
        </div>

        {/* Vertical Stepper */}
        <div className="card public-stepper-card">
          <div className="public-stepper-list">
            {STEPS.map((s, idx) => {
              const isCompleted = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              const circleClass = isCurrent
                ? 'public-step-circle public-step-circle--current'
                : isCompleted
                  ? 'public-step-circle public-step-circle--completed'
                  : 'public-step-circle public-step-circle--pending';

              const labelClass = isCompleted
                ? 'public-step-label public-step-label--completed'
                : 'public-step-label public-step-label--pending';

              return (
                <div key={s.id} className="public-step-row">
                  <div className="public-step-track">
                    <div className={circleClass}>
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className={`public-step-line ${idx < currentStepIndex ? 'public-step-line--done' : 'public-step-line--pending'}`} />
                    )}
                  </div>
                  <div className="public-step-content">
                    <div className={labelClass}>
                      {s.label} {s.icon}
                    </div>
                    {isCurrent && (
                      <div className="public-step-badge-current">ACTUAL</div>
                    )}
                    {!isCompleted && !isCurrent && (
                      <div className="public-step-pending-text">Pendiente</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="public-footer">
          <p>¿Tenes alguna duda? Comunícate con nosotros.</p>
          <div className="public-footer-brand">Zenko Arreglos de Ropa</div>
        </div>
      </div>
    </div>
  );
}
