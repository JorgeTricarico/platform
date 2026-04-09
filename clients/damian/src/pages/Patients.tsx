import { useEffect, useState } from 'react';
import { fetchPatients, fetchPatientRecords, createPatientRecord, fetchNextAppointment } from '../services/api';
import type { DBPatient, DBPatientRecord, DBAppointment } from '../services/api';
import { downloadPatientPdf } from '../utils/exportPdf';
import { useToast } from '../components/ToastContext';

const EMPTY_RECORD = { date: new Date().toISOString().split('T')[0], reason: '', symptoms: '', areas: '', treatment: '', observations: '', nextSession: '' };

export default function Patients() {
  const toast = useToast();
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

  const load = () => {
    setLoading(true);
    fetchPatients()
      .then(data => { setPatients(data); setLoading(false); })
      .catch(() => setLoading(false));
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
      load(); // refresh patient list too
    } catch { toast.error('Error al guardar ficha'); }
    finally { setSubmitting(false); }
  };

  if (loading && patients.length === 0) return <div>Cargando pacientes...</div>;

  // Detail view
  if (selectedPatient) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ flexShrink: 0, marginBottom: '16px' }}>
          <button className="btn btn-small" style={{ marginBottom: '12px' }} onClick={() => { setSelectedPatient(null); setRecords([]); }}>
            &larr; Volver a lista
          </button>
          <div className="flex-between">
            <div>
              <h1 style={{ marginBottom: '4px', textTransform: 'uppercase' }}>{selectedPatient.name}</h1>
              <p className="subtitle" style={{ margin: 0, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                  {selectedPatient.phone}
                </span>
                {selectedPatient.email ? `| Email: ${selectedPatient.email}` : ''}
              </p>
              {selectedPatient.notes && <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Notas: {selectedPatient.notes}</p>}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-small" onClick={() => downloadPatientPdf({ patient: selectedPatient, records })}>Exportar PDF</button>
              <button className="btn btn-primary" onClick={() => setIsNewRecord(true)}>+ Nueva Ficha</button>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
          {/* D29: Próxima Cita widget */}
          <div className="card" style={{ padding: '20px 24px', marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Próxima Cita</h3>
            {loadingNextAppointment ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Cargando...</div>
            ) : nextAppointment ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '14px' }}>
                <span>{new Date(nextAppointment.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{nextAppointment.time}</span>
                <span style={{ fontWeight: 600 }}>{nextAppointment.service}</span>
                <span className={`badge ${nextAppointment.status}`}>{nextAppointment.status}</span>
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Sin citas programadas</div>
            )}
          </div>

          {loadingRecords ? <div>Cargando historial...</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {records.length === 0 && <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Sin fichas clinicas registradas.</div>}
              {records.map(r => (
                <div key={r.id} className="card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0 }}>{r.reason}</h3>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{new Date(r.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                    {r.symptoms && <div><strong>Sintomas:</strong> {r.symptoms}</div>}
                    {r.areas && <div><strong>Zonas trabajadas:</strong> {r.areas}</div>}
                    {r.treatment && <div><strong>Tratamiento:</strong> {r.treatment}</div>}
                    {r.nextSession && <div><strong>Proxima sesion:</strong> {r.nextSession}</div>}
                  </div>
                  {r.observations && <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--surface-secondary)', borderRadius: '8px', fontSize: '14px' }}><strong>Observaciones:</strong> {r.observations}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {isNewRecord && (
          <div className="modal-overlay">
            <div className="card modal-card modal-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 style={{ marginTop: 0 }}>Nueva Ficha Clínica — {selectedPatient.name}</h2>
              <form onSubmit={handleNewRecord} className="form-group">
                {/* Consultation Group */}
                <div style={{ padding: '16px', backgroundColor: 'var(--surface-secondary)', borderRadius: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#666', marginBottom: '8px', display: 'block' }}>Detalles de la Consulta</label>
                  <div className="form-row">
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Fecha</label>
                      <input required name="date" type="date" value={recordForm.date} onChange={e => setRecordForm(p => ({ ...p, date: e.target.value }))} className="input" />
                    </div>
                    <div style={{ flex: 2 }}>
                      <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Motivo</label>
                      <input required name="reason" placeholder="Motivo de consulta" value={recordForm.reason} onChange={e => setRecordForm(p => ({ ...p, reason: e.target.value }))} className="input" />
                    </div>
                  </div>
                </div>

                {/* Symptoms & Diagnosis */}
                <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#666', marginBottom: '8px', display: 'block' }}>Diagnóstico y Síntomas</label>
                  <textarea name="symptoms" placeholder="Síntomas reportados por el paciente" value={recordForm.symptoms} onChange={e => setRecordForm(p => ({ ...p, symptoms: e.target.value }))} rows={2} className="input" style={{ fontFamily: 'inherit', resize: 'vertical', marginBottom: '12px' }} />
                  <textarea name="areas" placeholder="Zonas trabajadas (ej: cervical, lumbar, hombros)" value={recordForm.areas} onChange={e => setRecordForm(p => ({ ...p, areas: e.target.value }))} rows={2} className="input" style={{ fontFamily: 'inherit', resize: 'vertical' }} />
                </div>

                {/* Treatment */}
                <div style={{ padding: '16px', backgroundColor: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#2f855a', marginBottom: '8px', display: 'block' }}>Tratamiento Realizado</label>
                  <textarea name="treatment" placeholder="Tratamiento aplicado" value={recordForm.treatment} onChange={e => setRecordForm(p => ({ ...p, treatment: e.target.value }))} rows={2} className="input" style={{ fontFamily: 'inherit', resize: 'vertical', marginBottom: '12px' }} />
                  <textarea name="observations" placeholder="Observaciones del terapeuta" value={recordForm.observations} onChange={e => setRecordForm(p => ({ ...p, observations: e.target.value }))} rows={2} className="input" style={{ fontFamily: 'inherit', resize: 'vertical' }} />
                </div>

                <div style={{ padding: '16px', border: '1px dotted var(--border-color)', borderRadius: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#666', marginBottom: '8px', display: 'block' }}>Seguimiento</label>
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex-between" style={{ marginBottom: '20px', flexShrink: 0 }}>
        <div>
          <h1>Fichas de Pacientes</h1>
          <p className="subtitle" style={{ margin: 0, fontSize: '14px' }}>Historia clinica y seguimiento de cada paciente.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px' }}>
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
                  <td style={{ fontWeight: 600, textTransform: 'uppercase' }}>{p.name}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                      {p.phone}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${p.totalRecords > 0 ? 'completed' : 'pending'}`}>
                      {p.totalRecords} ficha{p.totalRecords !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{p.lastVisit ? new Date(p.lastVisit + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</td>
                  <td style={{ fontSize: '13px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.lastReason || '-'}</td>
                  <td>
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => openHistory(p)}
                    >
                      Ver Historial
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
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
