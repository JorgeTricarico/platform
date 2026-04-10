import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchPatients, fetchPatientRecords, createPatientRecord, fetchNextAppointment } from '../services/api';
import type { DBPatient, DBPatientRecord, DBAppointment } from '../services/api';
import { downloadPatientPdf } from '../utils/exportPdf';
import { useToast } from '../components/ToastContext';
import { SkeletonLoader, Spinner } from '../components/SkeletonLoader';

const EMPTY_RECORD = { date: new Date().toISOString().split('T')[0], reason: '', symptoms: '', areas: '', treatment: '', observations: '', nextSession: '' };

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
      <div className="patients-page">
        <div className="patients-detail-header">
          <button className="btn btn-small patients-back-btn" onClick={() => { setSelectedPatient(null); setRecords([]); }}>
            &larr; Volver a lista
          </button>
          <div className="flex-between">
            <div>
              <h1 className="patients-name">{selectedPatient.name}</h1>
              <p className="subtitle patients-contact-row">
                <span className="patients-phone-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                  {selectedPatient.phone}
                </span>
                {selectedPatient.altPhone ? `| Alternativo: ${selectedPatient.altPhone}` : ''}
              </p>
            </div>
            <div className="patients-action-btns">
              <button className="btn btn-small" onClick={() => downloadPatientPdf({ patient: selectedPatient, records })}>Exportar PDF</button>
              <button className="btn btn-primary" onClick={() => setIsNewRecord(true)}>+ Nueva Ficha</button>
            </div>
          </div>
        </div>

        <div className="patients-detail-body">
          <div className="card patients-next-appt-card">
            <h3 className="patients-next-appt-title">Próxima Cita</h3>
            {loadingNextAppointment ? (
              <div className="patients-next-appt-loading"><Spinner size={16} /></div>
            ) : nextAppointment ? (
              <div className="patients-next-appt-info">
                <span>{new Date(nextAppointment.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                <span className="patients-next-appt-time">{nextAppointment.time}</span>
                <span className="patients-next-appt-service">{nextAppointment.service}</span>
                <span className={`badge ${nextAppointment.status}`}>{nextAppointment.status}</span>
              </div>
            ) : (
              <div className="patients-next-appt-empty">Sin citas programadas</div>
            )}
          </div>

          {loadingRecords ? <div className="flex-center" style={{ padding: '16px' }}><Spinner /></div> : (
            <div className="patients-records-list">
              {records.length === 0 && <div className="card patients-record-empty">Sin fichas clinicas registradas.</div>}
              {records.map(r => (
                <div key={r.id} className="card patients-record-card">
                  <div className="patients-record-header">
                    <h3 className="patients-record-title">{r.reason}</h3>
                    <span className="patients-record-date">{new Date(r.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                  </div>
                  <div className="patients-record-grid">
                    {r.symptoms && <div><strong>Sintomas:</strong> {r.symptoms}</div>}
                    {r.areas && <div><strong>Zonas trabajadas:</strong> {r.areas}</div>}
                    {r.treatment && <div><strong>Tratamiento:</strong> {r.treatment}</div>}
                    {r.nextSession && <div><strong>Proxima sesion:</strong> {r.nextSession}</div>}
                  </div>
                  {r.observations && <div className="patients-record-observations"><strong>Observaciones:</strong> {r.observations}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {isNewRecord && (
          <div className="modal-overlay">
            <div className="card modal-card modal-lg patients-modal-scroll">
              <h2 className="appointments-modal-title">Nueva Ficha Clínica — {selectedPatient.name}</h2>
              <form onSubmit={handleNewRecord} className="form-group">
                <div className="patients-form-section patients-form-section-bg">
                  <label className="patients-form-section-label">Detalles de la Consulta</label>
                  <div className="form-row">
                    <div className="patients-form-field-flex1">
                      <label className="patients-form-field-label">Fecha</label>
                      <input required name="date" type="date" value={recordForm.date} onChange={e => setRecordForm(p => ({ ...p, date: e.target.value }))} className="input" />
                    </div>
                    <div className="patients-form-field-flex2">
                      <label className="patients-form-field-label">Motivo</label>
                      <input required name="reason" placeholder="Motivo de consulta" value={recordForm.reason} onChange={e => setRecordForm(p => ({ ...p, reason: e.target.value }))} className="input" />
                    </div>
                  </div>
                </div>

                <div className="patients-form-section patients-form-section-border">
                  <label className="patients-form-section-label">Diagnóstico y Síntomas</label>
                  <textarea name="symptoms" placeholder="Síntomas reportados por el paciente" value={recordForm.symptoms} onChange={e => setRecordForm(p => ({ ...p, symptoms: e.target.value }))} rows={2} className="input patients-textarea-mb" />
                  <textarea name="areas" placeholder="Zonas trabajadas (ej: cervical, lumbar, hombros)" value={recordForm.areas} onChange={e => setRecordForm(p => ({ ...p, areas: e.target.value }))} rows={2} className="input patients-textarea" />
                </div>

                <div className="patients-form-section patients-form-section-green">
                  <label className="patients-form-section-label-green">Tratamiento Realizado</label>
                  <textarea name="treatment" placeholder="Tratamiento aplicado" value={recordForm.treatment} onChange={e => setRecordForm(p => ({ ...p, treatment: e.target.value }))} rows={2} className="input patients-textarea-mb" />
                  <textarea name="observations" placeholder="Observaciones del terapeuta" value={recordForm.observations} onChange={e => setRecordForm(p => ({ ...p, observations: e.target.value }))} rows={2} className="input patients-textarea" />
                </div>

                <div className="patients-form-section patients-form-section-dotted">
                  <label className="patients-form-section-label">Seguimiento</label>
                  <input name="nextSession" placeholder="Indicaciones para la próxima sesión..." value={recordForm.nextSession} onChange={e => setRecordForm(p => ({ ...p, nextSession: e.target.value }))} className="input" />
                </div>

                <div className="form-actions">
                  <button type="button" onClick={() => { setIsNewRecord(false); setRecordForm({ ...EMPTY_RECORD }); }} className="btn-secondary">Cancelar</button>
                  <button type="submit" disabled={submitting} className="btn btn-primary">
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
    <div className="patients-page">
      <div className="flex-between patients-list-header">
        <div>
          <h1>Fichas de Pacientes</h1>
          <p className="subtitle patients-subtitle">Historia clinica y seguimiento de cada paciente.</p>
        </div>
      </div>

      <div className="card patients-list-card">
        <div className="patients-search-bar">
          <input
            type="text"
            placeholder="Buscar paciente por nombre o telefono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-search"
          />
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Telefono</th>
                <th>Fichas</th>
                <th>Ultima visita</th>
                <th>Ultimo motivo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td className="patients-table-name">{p.name}</td>
                  <td>
                    <div className="patients-table-phone">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                      {p.phone}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${p.totalRecords > 0 ? 'completed' : 'pending'}`}>
                      {p.totalRecords} ficha{p.totalRecords !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="patients-table-lastvisit">{p.lastVisit ? new Date(p.lastVisit + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</td>
                  <td className="patients-table-lastreason">{p.lastReason || '-'}</td>
                  <td>
                    <div className="patients-table-actions">
                      <button
                        className="btn btn-primary btn-small"
                        onClick={() => {
                          openHistory(p);
                          setIsNewRecord(true);
                        }}
                      >
                        Crear Ficha
                      </button>
                      <button
                        className="btn btn-secondary btn-small"
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
                  <td colSpan={6} className="patients-table-empty">
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
