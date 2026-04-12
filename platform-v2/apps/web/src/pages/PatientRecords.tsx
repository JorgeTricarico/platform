/**
 * PatientRecords — standalone detail view for a single patient's clinical history.
 *
 * Usage: render this component passing a clientId when you want a full-screen
 * view of one patient's records (e.g. navigating to #patients?id=<clientId>).
 *
 * For the embedded expandable-row experience see Patients.tsx.
 */
import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { ArrowLeft, Plus, FileText, Pencil, Trash2, X } from 'lucide-react';
import { formatDate, today } from '../lib/utils';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ToastContext';
import type { Client, PatientRecord, CreatePatientRecordInput } from '@platform/types';
import type { TenantConfig } from '@platform/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PatientRecordsProps {
  clientId: string;
  tenant: TenantConfig;
  onBack: () => void;
}

// ─── Record form ──────────────────────────────────────────────────────────────

interface RecordForm {
  date: string;
  reason: string;
  symptoms: string;
  areas: string;
  treatment: string;
  observations: string;
  nextSession: string;
}

function emptyForm(): RecordForm {
  return {
    date: today(),
    reason: '',
    symptoms: '',
    areas: '',
    treatment: '',
    observations: '',
    nextSession: '',
  };
}

// ─── Record Modal ─────────────────────────────────────────────────────────────

interface ModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  form: RecordForm;
  onChange: (field: keyof RecordForm, value: string) => void;
  submitting: boolean;
}

function RecordModal({ title, onClose, onSubmit, form, onChange, submitting }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-card rounded-2xl border shadow-xl w-full overflow-y-auto"
        style={{ maxWidth: 'min(560px, 95vw)', maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-card z-10">
          <h2 className="font-semibold text-base">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Fecha *</label>
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => onChange('date', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Próxima sesión</label>
              <input
                type="date"
                value={form.nextSession}
                onChange={(e) => onChange('nextSession', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Motivo de consulta *</label>
            <input
              required
              autoFocus
              value={form.reason}
              onChange={(e) => onChange('reason', e.target.value)}
              placeholder="ej: Dolor lumbar, contractura cervical…"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Síntomas</label>
            <input
              value={form.symptoms}
              onChange={(e) => onChange('symptoms', e.target.value)}
              placeholder="ej: Dolor al girar, rigidez matutina…"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Zonas tratadas</label>
            <input
              value={form.areas}
              onChange={(e) => onChange('areas', e.target.value)}
              placeholder="ej: Columna lumbar, trapecio derecho…"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Tratamiento aplicado</label>
            <textarea
              rows={2}
              value={form.treatment}
              onChange={(e) => onChange('treatment', e.target.value)}
              placeholder="Técnicas utilizadas, duración, presión…"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Observaciones</label>
            <textarea
              rows={2}
              value={form.observations}
              onChange={(e) => onChange('observations', e.target.value)}
              placeholder="Notas adicionales, respuesta del paciente…"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {submitting ? 'Guardando…' : 'Guardar ficha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Record detail card ───────────────────────────────────────────────────────

interface RecordCardProps {
  record: PatientRecord;
  onEdit: () => void;
  onDelete: () => void;
}

function RecordDetailCard({ record, onEdit, onDelete }: RecordCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 dark:bg-card dark:border-border space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{record.reason}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(record.date)}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors text-muted-foreground"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {record.symptoms && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Síntomas
            </p>
            <p className="text-sm">{record.symptoms}</p>
          </div>
        )}
        {record.areas && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Zonas tratadas
            </p>
            <p className="text-sm">{record.areas}</p>
          </div>
        )}
        {record.treatment && (
          <div className="sm:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Tratamiento
            </p>
            <p className="text-sm">{record.treatment}</p>
          </div>
        )}
        {record.observations && (
          <div className="sm:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Observaciones
            </p>
            <p className="text-sm">{record.observations}</p>
          </div>
        )}
      </div>

      {record.nextSession && (
        <div className="pt-2 border-t border-border/40 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Próxima sesión</p>
          <p className="text-sm font-semibold">{formatDate(record.nextSession)}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PatientRecords({ clientId, tenant, onBack }: PatientRecordsProps) {
  const api = useApi();
  const toast = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<RecordForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [editTarget, setEditTarget] = useState<PatientRecord | null>(null);
  const [editForm, setEditForm] = useState<RecordForm>(emptyForm);

  const [confirmDelete, setConfirmDelete] = useState<PatientRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [clientData, recordsData] = await Promise.all([
        api.clients.get(clientId),
        api.patientRecords.list(clientId),
      ]);
      setClient(clientData);
      setRecords(recordsData);
    } catch {
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [api, clientId, toast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: CreatePatientRecordInput = {
        clientId,
        date: createForm.date,
        reason: createForm.reason,
        symptoms: createForm.symptoms || undefined,
        areas: createForm.areas || undefined,
        treatment: createForm.treatment || undefined,
        observations: createForm.observations || undefined,
        nextSession: createForm.nextSession || undefined,
      };
      await api.patientRecords.create(clientId, payload);
      toast.success('Ficha creada');
      setIsCreateOpen(false);
      setCreateForm(emptyForm());
      await load();
    } catch {
      toast.error('Error al crear la ficha');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await api.patientRecords.update(clientId, editTarget.id, {
        date: editForm.date,
        reason: editForm.reason,
        symptoms: editForm.symptoms || undefined,
        areas: editForm.areas || undefined,
        treatment: editForm.treatment || undefined,
        observations: editForm.observations || undefined,
        nextSession: editForm.nextSession || undefined,
      });
      toast.success('Ficha actualizada');
      setEditTarget(null);
      await load();
    } catch {
      toast.error('Error al actualizar la ficha');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.patientRecords.delete(clientId, confirmDelete.id);
      toast.success('Ficha eliminada');
      setConfirmDelete(null);
      await load();
    } catch {
      toast.error('Error al eliminar la ficha');
    }
  };

  const openEdit = (r: PatientRecord) => {
    setEditTarget(r);
    setEditForm({
      date: r.date,
      reason: r.reason,
      symptoms: r.symptoms ?? '',
      areas: r.areas ?? '',
      treatment: r.treatment ?? '',
      observations: r.observations ?? '',
      nextSession: r.nextSession ?? '',
    });
  };

  const updateField =
    (setter: React.Dispatch<React.SetStateAction<RecordForm>>) =>
    (field: keyof RecordForm, value: string) =>
      setter((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-semibold">
              {loading ? 'Cargando…' : (client?.name ?? 'Paciente')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {loading ? '' : `${records.length} ${records.length === 1 ? 'ficha clínica' : 'fichas clínicas'}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nueva ficha</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      {/* Client info strip */}
      {client && !loading && (
        <div className="mb-4 p-3 rounded-xl bg-muted/40 border flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
            style={{ backgroundColor: `hsl(${tenant.theme.primaryHsl})` }}
          >
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{client.name}</p>
            {client.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
          </div>
        </div>
      )}

      {/* Records list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sin fichas clínicas</p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-3 text-xs text-primary hover:underline"
          >
            Crear primera ficha
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <RecordDetailCard
              key={r.id}
              record={r}
              onEdit={() => openEdit(r)}
              onDelete={() => setConfirmDelete(r)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {isCreateOpen && (
        <RecordModal
          title={`Nueva ficha${client ? ` — ${client.name}` : ''}`}
          onClose={() => { setIsCreateOpen(false); setCreateForm(emptyForm()); }}
          onSubmit={handleCreate}
          form={createForm}
          onChange={updateField(setCreateForm)}
          submitting={submitting}
        />
      )}

      {editTarget && (
        <RecordModal
          title="Editar ficha"
          onClose={() => setEditTarget(null)}
          onSubmit={handleEdit}
          form={editForm}
          onChange={updateField(setEditForm)}
          submitting={submitting}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-2">Eliminar ficha</h3>
            <p className="text-sm text-muted-foreground mb-5">
              ¿Eliminar la ficha del{' '}
              <strong>{formatDate(confirmDelete.date)}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-lg border py-2.5 text-sm hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-lg bg-destructive text-destructive-foreground py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
