import { useState } from 'react';
import { createAppointment } from '../services/api';
import { BUSINESS } from '../config';
import TodayAppointmentsWidget from '../components/TodayAppointmentsWidget';
import StalePatientWidget from '../components/StalePatientWidget';
import UpcomingAppointmentsWidget from '../components/UpcomingAppointmentsWidget';

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '', clientPhone: '', service: '', duration: BUSINESS.defaultDuration, date: '', time: '', price: 0, notes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAppointment({ ...formData, duration: Number(formData.duration), price: Number(formData.price) });
      setIsModalOpen(false);
      setFormData({ clientName: '', clientPhone: '', service: '', duration: BUSINESS.defaultDuration, date: '', time: '', price: 0, notes: '' });
      // Dispatch custom event so widgets re-fetch
      window.dispatchEvent(new Event('dashboard-refresh'));
    } catch (error) {
      alert("Error al guardar la cita");
    }
  };

  return (
    <div>
      <div className="flex-between">
        <div>
          <h1>{BUSINESS.greeting}</h1>
          <p className="subtitle">{BUSINESS.subtitle}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ Nueva Cita</button>
      </div>

      <div className="grid grid-cols-2" style={{ marginBottom: '24px' }}>
        <TodayAppointmentsWidget />
        <StalePatientWidget />
      </div>

      <UpcomingAppointmentsWidget />

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '450px', padding: '32px' }}>
            <h2 style={{ marginTop: 0 }}>Agendar Nueva Cita</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <input required name="clientName" placeholder="Nombre Cliente" value={formData.clientName} onChange={handleInputChange} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                <input required name="clientPhone" placeholder="Telefono" value={formData.clientPhone} onChange={handleInputChange} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>

              <select required name="service" value={formData.service} onChange={handleInputChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                <option value="">Tipo de Masaje...</option>
                {BUSINESS.services.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: '16px' }}>
                <input required name="duration" type="number" placeholder="Duracion (min)" value={formData.duration} onChange={handleInputChange} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                <input required name="price" type="number" placeholder="Precio ($)" value={formData.price || ''} onChange={handleInputChange} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <input required name="date" type="date" value={formData.date} onChange={handleInputChange} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                <input required name="time" type="time" value={formData.time} onChange={handleInputChange} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>

              <input name="notes" placeholder="Notas (opcional)..." value={formData.notes} onChange={handleInputChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Agendar Cita</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
