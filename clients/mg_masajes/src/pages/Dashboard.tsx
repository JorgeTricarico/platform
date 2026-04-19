import { useState, useCallback } from 'react';
import { createAppointment } from '../services/api';
import { BUSINESS } from '../config';
import { useToast } from '../components/ToastContext';
import { useDashboardRefresh } from '../components/DashboardRefreshContext';
import TodayAppointmentsWidget from '../components/TodayAppointmentsWidget';
import StalePatientWidget from '../components/StalePatientWidget';
import MonthlyIncomeWidget from '../components/MonthlyIncomeWidget';
import UpcomingAppointmentsWidget from '../components/UpcomingAppointmentsWidget';

export default function Dashboard() {
  const toast = useToast();
  const { triggerRefresh } = useDashboardRefresh();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '', clientPhone: '', service: '', duration: 40, date: '', time: '', price: 0, notes: ''
  });

  const handleOpenModal = useCallback(() => setIsModalOpen(true), []);
  const handleCloseModal = useCallback(() => setIsModalOpen(false), []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'service' && value in (BUSINESS.services as any)) {
      const selected = (BUSINESS.services as any)[value];
      setFormData(prev => ({
        ...prev,
        service: value,
        price: selected.price,
        duration: selected.duration
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createAppointment({ ...formData, duration: Number(formData.duration), price: Number(formData.price) });
      setIsModalOpen(false);
      setFormData({ clientName: '', clientPhone: '', service: '', duration: 40, date: '', time: '', price: 0, notes: '' });
      toast.success('Cita agendada correctamente');
      triggerRefresh();
    } catch (error) {
      toast.error('Error al guardar la cita');
    } finally {
      setSubmitting(false);
    }
  }, [formData, toast, triggerRefresh]);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div>
          <h1>{BUSINESS.greeting}</h1>
          <p className="subtitle" style={{ margin: 0 }}>{BUSINESS.subtitle}</p>
        </div>
        <button
          className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-(--color-primary) text-white font-semibold text-[15px] hover:bg-(--color-accent) hover:shadow-md transition-all"
          onClick={handleOpenModal}
        >
          + Nueva Cita
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6 flex-shrink-0">
        <TodayAppointmentsWidget />
        <MonthlyIncomeWidget />
        <StalePatientWidget />
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <UpcomingAppointmentsWidget />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-(--color-card) rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl border border-(--color-border)">
            <h2 className="text-xl font-bold text-(--color-foreground) mb-4 mt-0">Agendar Nueva Cita</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <input required name="clientName" placeholder="Nombre Cliente" value={formData.clientName} onChange={handleInputChange} className="flex-1 px-3 py-2 rounded-md border border-(--color-border) bg-(--color-card) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50" />
                <input required name="clientPhone" placeholder="Telefono" value={formData.clientPhone} onChange={handleInputChange} className="flex-1 px-3 py-2 rounded-md border border-(--color-border) bg-(--color-card) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50" />
              </div>

              <select required name="service" value={formData.service} onChange={handleInputChange} className="w-full px-3 py-2 rounded-md border border-(--color-border) bg-(--color-card) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50">
                <option value="">Tipo de Masaje...</option>
                {Object.keys(BUSINESS.services).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <div className="flex flex-col sm:flex-row gap-3">
                <input required name="duration" type="number" placeholder="Duracion (min)" value={formData.duration} onChange={handleInputChange} className="flex-1 px-3 py-2 rounded-md border border-(--color-border) bg-(--color-card) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50" />
                <input required name="price" type="number" placeholder="Precio ($)" value={formData.price || ''} onChange={handleInputChange} className="flex-1 px-3 py-2 rounded-md border border-(--color-border) bg-(--color-card) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50" />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input required name="date" type="date" value={formData.date} onChange={handleInputChange} className="flex-1 px-3 py-2 rounded-md border border-(--color-border) bg-(--color-card) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50" />
                <input required name="time" type="time" value={formData.time} onChange={handleInputChange} className="flex-1 px-3 py-2 rounded-md border border-(--color-border) bg-(--color-card) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50" />
              </div>

              <input name="notes" placeholder="Notas (opcional)..." value={formData.notes} onChange={handleInputChange} className="w-full px-3 py-2 rounded-md border border-(--color-border) bg-(--color-card) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50" />

              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 rounded-md font-semibold text-sm text-(--color-muted-foreground) hover:bg-(--color-muted) transition-colors">Cancelar</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-(--color-primary) text-white font-semibold hover:bg-(--color-accent) transition-all disabled:opacity-60">
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
