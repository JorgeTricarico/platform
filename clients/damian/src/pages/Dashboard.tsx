import { useState } from 'react';
import { createAppointment } from '../services/api';
import { BUSINESS } from '../config';
import { useToast } from '../components/ToastContext';
import TodayAppointmentsWidget from '../components/TodayAppointmentsWidget';
import StalePatientWidget from '../components/StalePatientWidget';
import MonthlyIncomeWidget from '../components/MonthlyIncomeWidget';
import UpcomingAppointmentsWidget from '../components/UpcomingAppointmentsWidget';

export default function Dashboard() {
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '', clientPhone: '', service: '', duration: BUSINESS.defaultDuration, date: '', time: '', price: 0, notes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createAppointment({ ...formData, duration: Number(formData.duration), price: Number(formData.price) });
      setIsModalOpen(false);
      setFormData({ clientName: '', clientPhone: '', service: '', duration: BUSINESS.defaultDuration, date: '', time: '', price: 0, notes: '' });
      toast.success('Cita agendada correctamente');
      // Dispatch custom event so widgets re-fetch
      window.dispatchEvent(new Event('dashboard-refresh'));
    } catch (error) {
      toast.error('Error al guardar la cita');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="flex-between" style={{ marginBottom: '20px', flexShrink: 0 }}>
        <div>
          <h1>{BUSINESS.greeting}</h1>
          <p className="subtitle" style={{ margin: 0 }}>{BUSINESS.subtitle}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ Nueva Cita</button>
      </div>

      <div className="grid grid-cols-3" style={{ marginBottom: '24px', flexShrink: 0 }}>
        <TodayAppointmentsWidget />
        <MonthlyIncomeWidget />
        <StalePatientWidget />
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <UpcomingAppointmentsWidget />
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="card modal-card modal-md">
            <h2 style={{ marginTop: 0 }}>Agendar Nueva Cita</h2>
            <form onSubmit={handleSubmit} className="form-group">
              <div className="form-row">
                <input required name="clientName" placeholder="Nombre Cliente" value={formData.clientName} onChange={handleInputChange} className="input" style={{ flex: 1 }} />
                <input required name="clientPhone" placeholder="Telefono" value={formData.clientPhone} onChange={handleInputChange} className="input" style={{ flex: 1 }} />
              </div>

              <select required name="service" value={formData.service} onChange={handleInputChange} className="input">
                <option value="">Tipo de Masaje...</option>
                {BUSINESS.services.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <div className="form-row">
                <input required name="duration" type="number" placeholder="Duracion (min)" value={formData.duration} onChange={handleInputChange} className="input" style={{ flex: 1 }} />
                <input required name="price" type="number" placeholder="Precio ($)" value={formData.price || ''} onChange={handleInputChange} className="input" style={{ flex: 1 }} />
              </div>

              <div className="form-row">
                <input required name="date" type="date" value={formData.date} onChange={handleInputChange} className="input" style={{ flex: 1 }} />
                <input required name="time" type="time" value={formData.time} onChange={handleInputChange} className="input" style={{ flex: 1 }} />
              </div>

              <input name="notes" placeholder="Notas (opcional)..." value={formData.notes} onChange={handleInputChange} className="input" />

              <div className="form-actions">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Agendando...' : 'Agendar Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
