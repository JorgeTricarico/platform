import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchPatients, fetchPatientRecords, createPatientRecord, fetchNextAppointment } from '../services/api';
import type { DBPatient, DBPatientRecord, DBAppointment } from '../services/api';
import { downloadPatientPdf } from '../utils/exportPdf';
import { useToast } from '../components/ToastContext';
import { SkeletonLoader, Spinner } from '../components/SkeletonLoader';

const EMPTY_RECORD = { date: new Date().toISOString().split('T')[0], reason: '', symptoms: '', areas: '', treatment: '', observations: '', nextSession: '' };

const inputClass = "w-full px-3 py-2 rounded-md border border-(--color-border) bg-(--color-card) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50";
const textareaClass = "w-full px-3 py-2 rounded-md border border-(--color-border) bg-(--color-card) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50 resize-none";

export default function Patients() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [patients, setPatients] = useState<DBPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<DBPatient | null>(null);
  const [records, setRecords] = useState<DBPatientRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [recordForm, setRecordForm] = useState({ ...EMPTY_RECORD });
  const [submitting, setSubmitting] = useState(false);
  const [nextAppointment, setNextAppointment] = useState<DBAppointment | null>(null);
  const [loadingNextAppointment, setLoadingNextAppointment] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchPatients();
      setPatients(data);

      // Handle query params for auto-select
      const selectId = searchParams.get('select');
      const action = searchParams.get('action');
      if (selectId) {
        const p = data.find(item => item.id === selectId);
        if (p) {
          await openHistory(p);
          if (action === 'new_record') {
            setIsNewRecord(true);
          }
        }
      }
    } catch {
      toast.error('Error al cargar pacientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone.includes(searchTerm)
  );

  const openHistory = async (patient: DBPatient) => {
    setSelectedPatient(patient);
    setLoadingRecords(true);
    setLoadingNextAppointment(true);
    try {
      const [recs, appt] = await Promise.all([
        fetchPatientRecords(patient.id),
        fetchNextAppointment(patient.id),
      ]);
      setRecords(recs);
      setNextAppointment(appt);
    } catch {
      setRecords([]);
      setNextAppointment(null);
    }
    setLoadingRecords(false);
    setLoadingNextAppointment(false);
  };

  const handleNewRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setSubmitting(true);
    try {
      await createPatientRecord(selectedPatient.id, recordForm);
      setIsNewRecord(false);
      setRecordForm({ ...EMPTY_RECORD });
      const recs = await fetchPatientRecords(selectedPatient.id);
      setRecords(recs);
      toast.success('Ficha guardada correctamente');
      const data = await fetchPatients(); // Refresh list
      setPatients(data);
    } catch { toast.error('Error al guardar ficha'); }
    finally { setSubmitting(false); }
  };

  if (loading && patients.length === 0) return <SkeletonLoader rows={5} />;

  // Detail view
  if (selectedPatient) {
    return (
      <div>
        <div className="mb-4">
          <button
            className="px-3 py-1.5 text-sm rounded-md border border-(--color-border) bg-(--color-muted) text-(--color-foreground) hover:bg-(--color-border) transition-colors mb-4"
            onClick={() => { setSelectedPatient(null); setRecords([]); }}
          >
            &larr; Volver a lista
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-(--color-foreground) mb-1">{selectedPatient.name}</h1>
              <p className="text-(--color-muted-foreground) text-base font-medium">
                <span className="inline-flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                  {selectedPatient.phone}
                </span>
                {selectedPatient.altPhone ? ` | Alternativo: ${selectedPatient.altPhone}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-2 text-sm rounded-md border border-(--color-border) bg-(--color-muted) text-(--color-foreground) hover:bg-(--color-border) transition-colors"
                onClick={() => downloadPatientPdf({ patient: selectedPatient, records })}
              >
                Exportar PDF
              </button>
              <button
                className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-(--color-primary) text-white font-semibold hover:bg-(--color-accent) transition-all"
                onClick={() => setIsNewRecord(true)}
              >
                + Nueva Ficha
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-(--color-card) rounded-2xl p-4 shadow-sm border border-(--color-border)">
            <h3 className="text-sm font-bold text-(--color-foreground) mb-3">Próxima Cita</h3>
            {loadingNextAppointment ? (
              <div className="flex items-center gap-2"><Spinner size={16} /></div>
            ) : nextAppointment ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-(--color-foreground) font-medium">{new Date(nextAppointment.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                <span className="text-sm text-(--color-muted-foreground)">{nextAppointment.time}</span>
                <span className="text-sm text-(--color-foreground)">{nextAppointment.service}</span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                  nextAppointment.status === 'completado' ? 'bg-green-100 text-(--color-success)' :
                  nextAppointment.status === 'cancelado' ? 'bg-red-100 text-(--color-destructive)' :
                  'bg-yellow-100 text-(--color-accent)'
                }`}>{nextAppointment.status}</span>
              </div>
            ) : (
              <div className="text-sm text-(--color-muted-foreground) italic">Sin citas programadas</div>
            )}
          </div>

          {loadingRecords ? (
            <div className="flex justify-center p-4"><Spinner /></div>
          ) : (
            <div className="flex flex-col gap-3">
              {records.length === 0 && (
                <div className="bg-(--color-card) rounded-2xl p-5 border border-(--color-border) text-sm text-(--color-muted-foreground) text-center">
                  Sin fichas clinicas registradas.
                </div>
              )}
              {records.map(r => (
                <div key={r.id} className="bg-(--color-card) rounded-2xl p-5 shadow-sm border border-(--color-border)">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-bold text-(--color-foreground)">{r.reason}</h3>
                    <span className="text-xs text-(--color-muted-foreground) shrink-0 ml-3">{new Date(r.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-(--color-foreground)">
                    {r.symptoms && <div><strong>Sintomas:</strong> {r.symptoms}</div>}
                    {r.areas && <div><strong>Zonas trabajadas:</strong> {r.areas}</div>}
                    {r.treatment && <div><strong>Tratamiento:</strong> {r.treatment}</div>}
                    {r.nextSession && <div><strong>Proxima sesion:</strong> {r.nextSession}</div>}
                  </div>
                  {r.observations && (
                    <div className="mt-3 text-sm text-(--color-muted-foreground) border-t border-(--color-border) pt-3">
                      <strong>Observaciones:</strong> {r.observations}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {isNewRecord && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-(--color-card) rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-(--color-border)">
              <h2 className="text-xl font-bold text-(--color-foreground) mb-4 mt-0">Nueva Ficha Clínica — {selectedPatient.name}</h2>
              <form onSubmit={handleNewRecord} className="flex flex-col gap-3">
                <div className="bg-(--color-muted) rounded-xl p-4">
                  <label className="block text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider mb-3">Detalles de la Consulta</label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-(--color-muted-foreground) mb-1">Fecha</label>
                      <input required name="date" type="date" value={recordForm.date} onChange={e => setRecordForm(p => ({ ...p, date: e.target.value }))} className={inputClass} />
                    </div>
                    <div className="flex-[2]">
                      <label className="block text-xs text-(--color-muted-foreground) mb-1">Motivo</label>
                      <input required name="reason" placeholder="Motivo de consulta" value={recordForm.reason} onChange={e => setRecordForm(p => ({ ...p, reason: e.target.value }))} className={inputClass} />
                    </div>
                  </div>
                </div>

                <div className="border border-(--color-border) rounded-xl p-4">
                  <label className="block text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider mb-3">Diagnóstico y Síntomas</label>
                  <textarea name="symptoms" placeholder="Síntomas reportados por el paciente" value={recordForm.symptoms} onChange={e => setRecordForm(p => ({ ...p, symptoms: e.target.value }))} rows={2} className={`${textareaClass} mb-3`} />
                  <textarea name="areas" placeholder="Zonas trabajadas (ej: cervical, lumbar, hombros)" value={recordForm.areas} onChange={e => setRecordForm(p => ({ ...p, areas: e.target.value }))} rows={2} className={textareaClass} />
                </div>

                <div className="bg-green-50/50 border border-green-100 rounded-xl p-4">
                  <label className="block text-xs font-semibold text-green-700 uppercase tracking-wider mb-3">Tratamiento Realizado</label>
                  <textarea name="treatment" placeholder="Tratamiento aplicado" value={recordForm.treatment} onChange={e => setRecordForm(p => ({ ...p, treatment: e.target.value }))} rows={2} className={`${textareaClass} mb-3`} />
                  <textarea name="observations" placeholder="Observaciones del terapeuta" value={recordForm.observations} onChange={e => setRecordForm(p => ({ ...p, observations: e.target.value }))} rows={2} className={textareaClass} />
                </div>

                <div className="border border-dashed border-(--color-border) rounded-xl p-4">
                  <label className="block text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider mb-3">Seguimiento</label>
                  <input name="nextSession" placeholder="Indicaciones para la próxima sesión..." value={recordForm.nextSession} onChange={e => setRecordForm(p => ({ ...p, nextSession: e.target.value }))} className={inputClass} />
                </div>

                <div className="flex justify-end gap-3 mt-2">
                  <button type="button" onClick={() => { setIsNewRecord(false); setRecordForm({ ...EMPTY_RECORD }); }} className="px-4 py-2 rounded-md font-semibold text-sm text-(--color-muted-foreground) hover:bg-(--color-muted) transition-colors">Cancelar</button>
                  <button type="submit" disabled={submitting} className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-(--color-primary) text-white font-semibold hover:bg-(--color-accent) transition-all disabled:opacity-60">
                    {submitting ? 'Guardando...' : 'Guardar Ficha'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1>Fichas de Pacientes</h1>
          <p className="subtitle" style={{ margin: 0 }}>Historia clinica y seguimiento de cada paciente.</p>
        </div>
      </div>

      <div className="bg-(--color-card) rounded-2xl shadow-sm border border-(--color-border) overflow-hidden">
        <div className="p-4 border-b border-(--color-border)">
          <input
            type="text"
            placeholder="Buscar paciente por nombre o telefono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-(--color-border) bg-(--color-muted) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50 text-sm"
          />
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-5 py-4 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Paciente</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Telefono</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Fichas</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Ultima visita</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Ultimo motivo</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wider bg-(--color-muted) border-b border-(--color-border)">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-(--color-border) last:border-0">
                  <td className="px-5 py-4 text-[15px] text-(--color-foreground) font-semibold">{p.name}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 text-sm text-(--color-foreground)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                      {p.phone}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                      p.totalRecords > 0 ? 'bg-green-100 text-(--color-success)' : 'bg-yellow-100 text-(--color-accent)'
                    }`}>
                      {p.totalRecords} ficha{p.totalRecords !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-(--color-muted-foreground)">{p.lastVisit ? new Date(p.lastVisit + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</td>
                  <td className="px-5 py-4 text-sm text-(--color-muted-foreground) max-w-[200px] truncate">{p.lastReason || '-'}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-(--color-primary) text-white text-xs font-semibold hover:bg-(--color-accent) transition-all"
                        onClick={() => {
                          openHistory(p);
                          setIsNewRecord(true);
                        }}
                      >
                        Crear Ficha
                      </button>
                      <button
                        className="px-3 py-1.5 rounded-md text-xs font-semibold border border-(--color-border) bg-(--color-muted) text-(--color-foreground) hover:bg-(--color-border) transition-colors"
                        onClick={() => openHistory(p)}
                      >
                        Ver Historial
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center px-5 py-8 text-(--color-muted-foreground) text-sm">
                    No se encontraron pacientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
