import { useEffect, useState } from 'react';
import { fetchPatients, fetchPatientRecords, createPatientRecord } from '../services/api';
import type { DBPatient, DBPatientRecord } from '../services/api';

const EMPTY_RECORD = { date: new Date().toISOString().split('T')[0], reason: '', symptoms: '', areas: '', treatment: '', observations: '', nextSession: '' };

export default function Patients() {
  const [patients, setPatients] = useState<DBPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<DBPatient | null>(null);
  const [records, setRecords] = useState<DBPatientRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [recordForm, setRecordForm] = useState({ ...EMPTY_RECORD });

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
    try {
      await createPatientRecord(selectedPatient.id, recordForm);
      setIsNewRecord(false);
      setRecordForm({ ...EMPTY_RECORD });
      const recs = await fetchPatientRecords(selectedPatient.id);
      setRecords(recs);
      load(); // refresh patient list too
    } catch { alert('Error al guardar ficha'); }
  };

  if (loading && patients.length === 0) return <div>Cargando pacientes...</div>;

  // Detail view
  if (selectedPatient) {
    return (
      <div>
        <button className="btn" style={{ marginBottom: '16px', padding: '8px 16px', backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)' }} onClick={() => { setSelectedPatient(null); setRecords([]); }}>
          &larr; Volver a lista
        </button>
        <div className="flex-between">
          <div>
            <h1>{selectedPatient.name}</h1>
            <p className="subtitle">Tel: {selectedPatient.phone} {selectedPatient.email ? `| Email: ${selectedPatient.email}` : ''}</p>
            {selectedPatient.notes && <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Notas: {selectedPatient.notes}</p>}
          </div>
          <button className="btn btn-primary" onClick={() => setIsNewRecord(true)}>+ Nueva Ficha</button>
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
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '540px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 style={{ marginTop: 0 }}>Nueva Ficha Clinica — {selectedPatient.name}</h2>
              <form onSubmit={handleNewRecord} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <input required name="date" type="date" value={recordForm.date} onChange={e => setRecordForm(p => ({ ...p, date: e.target.value }))} style={inputStyle} />
                <input required name="reason" placeholder="Motivo de consulta" value={recordForm.reason} onChange={e => setRecordForm(p => ({ ...p, reason: e.target.value }))} style={inputStyle} />
                <textarea name="symptoms" placeholder="Sintomas reportados por el paciente" value={recordForm.symptoms} onChange={e => setRecordForm(p => ({ ...p, symptoms: e.target.value }))} rows={2} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} />
                <textarea name="areas" placeholder="Zonas trabajadas (ej: cervical, lumbar, hombros)" value={recordForm.areas} onChange={e => setRecordForm(p => ({ ...p, areas: e.target.value }))} rows={2} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} />
                <textarea name="treatment" placeholder="Tratamiento aplicado" value={recordForm.treatment} onChange={e => setRecordForm(p => ({ ...p, treatment: e.target.value }))} rows={2} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} />
                <textarea name="observations" placeholder="Observaciones del terapeuta" value={recordForm.observations} onChange={e => setRecordForm(p => ({ ...p, observations: e.target.value }))} rows={3} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} />
                <input name="nextSession" placeholder="Indicaciones proxima sesion" value={recordForm.nextSession} onChange={e => setRecordForm(p => ({ ...p, nextSession: e.target.value }))} style={inputStyle} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                  <button type="button" onClick={() => { setIsNewRecord(false); setRecordForm({ ...EMPTY_RECORD }); }} style={{ padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Guardar Ficha</button>
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
            style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', width: '320px', outline: 'none', fontFamily: 'inherit', fontSize: '14px' }}
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
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '13px' }}
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

const inputStyle: React.CSSProperties = { padding: '10px', borderRadius: '6px', border: '1px solid #ccc' };
