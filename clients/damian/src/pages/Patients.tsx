import { useEffect, useState } from 'react';
import { fetchPatients, fetchPatientRecords, createPatientRecord } from '../services/api';
import type { DBPatient, DBPatientRecord } from '../services/api';
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
    try {
      const recs = await fetchPatientRecords(patient.id);
      setRecords(recs);
    } catch { setRecords([]); }
    setLoadingRecords(false);
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
      <div>
        <button className="btn btn-small" style={{ marginBottom: '16px' }} onClick={() => { setSelectedPatient(null); setRecords([]); }}>
          &larr; Volver a lista
        </button>
        <div className="flex-between">
          <div>
            <h1>{selectedPatient.name}</h1>
            <p className="subtitle">Tel: {selectedPatient.phone} {selectedPatient.email ? `| Email: ${selectedPatient.email}` : ''}</p>
            {selectedPatient.notes && <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Notas: {selectedPatient.notes}</p>}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-small" onClick={() => downloadPatientPdf({ patient: selectedPatient, records })}>Exportar PDF</button>
            <button className="btn btn-primary" onClick={() => setIsNewRecord(true)}>+ Nueva Ficha</button>
          </div>
        </div>

        {loadingRecords ? <div>Cargando historial...</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {records.length === 0 && <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Sin fichas clinicas registradas.</div>}
            {records.map(r => (
              <div key={r.id} className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0 }}>{r.reason}</h3>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{r.date}</span>
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

        {isNewRecord && (
          <div className="modal-overlay">
            <div className="card modal-card modal-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 style={{ marginTop: 0 }}>Nueva Ficha Clinica — {selectedPatient.name}</h2>
              <form onSubmit={handleNewRecord} className="form-group">
                <input required name="date" type="date" value={recordForm.date} onChange={e => setRecordForm(p => ({ ...p, date: e.target.value }))} className="input" />
                <input required name="reason" placeholder="Motivo de consulta" value={recordForm.reason} onChange={e => setRecordForm(p => ({ ...p, reason: e.target.value }))} className="input" />
                <textarea name="symptoms" placeholder="Sintomas reportados por el paciente" value={recordForm.symptoms} onChange={e => setRecordForm(p => ({ ...p, symptoms: e.target.value }))} rows={2} className="input" style={{ fontFamily: 'inherit', resize: 'vertical' }} />
                <textarea name="areas" placeholder="Zonas trabajadas (ej: cervical, lumbar, hombros)" value={recordForm.areas} onChange={e => setRecordForm(p => ({ ...p, areas: e.target.value }))} rows={2} className="input" style={{ fontFamily: 'inherit', resize: 'vertical' }} />
                <textarea name="treatment" placeholder="Tratamiento aplicado" value={recordForm.treatment} onChange={e => setRecordForm(p => ({ ...p, treatment: e.target.value }))} rows={2} className="input" style={{ fontFamily: 'inherit', resize: 'vertical' }} />
                <textarea name="observations" placeholder="Observaciones del terapeuta" value={recordForm.observations} onChange={e => setRecordForm(p => ({ ...p, observations: e.target.value }))} rows={3} className="input" style={{ fontFamily: 'inherit', resize: 'vertical' }} />
                <input name="nextSession" placeholder="Indicaciones proxima sesion" value={recordForm.nextSession} onChange={e => setRecordForm(p => ({ ...p, nextSession: e.target.value }))} className="input" />
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
    <div>
      <div className="flex-between">
        <div>
          <h1>Fichas de Pacientes</h1>
          <p className="subtitle">Historia clinica y seguimiento de cada paciente.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
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
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.phone}</td>
                  <td>
                    <span className={`badge ${p.totalRecords > 0 ? 'completed' : 'pending'}`}>
                      {p.totalRecords} ficha{p.totalRecords !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{p.lastVisit || '-'}</td>
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
