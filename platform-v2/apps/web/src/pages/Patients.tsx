import { useEffect, useState, useMemo, useCallback, type FormEvent } from 'react';
import {
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  FileText,
  X,
  Pencil,
  Trash2,
} from 'lucide-react';
import { formatDate, today } from '../lib/utils';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ToastContext';
import type { Client, PatientRecord, CreatePatientRecordInput } from '@platform/types';
import type { TenantConfig } from '@platform/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PatientsProps {
  tenant: TenantConfig;
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

function emptyRecordForm(): RecordForm {
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

interface RecordModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  form: RecordForm;
  onChange: (field: keyof RecordForm, value: string) => void;
  submitting: boolean;
}

function RecordModal({ title, onClose, onSubmit, form, onChange, submitting }: RecordModalProps) {
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
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
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

// ─── Record card ──────────────────────────────────────────────────────────────

interface RecordCardProps {
  record: PatientRecord;
  onEdit: () => void;
  onDelete: () => void;
}

function RecordCard({ record, onEdit, onDelete }: RecordCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{record.reason}</p>
          <p className="text-xs text-muted-foreground">{formatDate(record.date)}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors text-muted-foreground"
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

      {record.symptoms && (
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Síntomas
          </span>
          <p className="text-xs mt-0.5">{record.symptoms}</p>
        </div>
      )}
      {record.areas && (
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Zonas
          </span>
          <p className="text-xs mt-0.5">{record.areas}</p>
        </div>
      )}
      {record.treatment && (
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tratamiento
          </span>
          <p className="text-xs mt-0.5">{record.treatment}</p>
        </div>
      )}
      {record.observations && (
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Observaciones
          </span>
          <p className="text-xs mt-0.5">{record.observations}</p>
        </div>
      )}
      {record.nextSession && (
        <div className="pt-1 border-t border-border/50">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Próxima sesión
          </span>
          <p className="text-xs mt-0.5 font-medium">{formatDate(record.nextSession)}</p>
        </div>
      )}
    </div>
  );
}

// ─── Patient row (expandable) ─────────────────────────────────────────────────

interface PatientRowProps {
  client: Client;
  tenant: TenantConfig;
  isExpanded: boolean;
  onToggle: () => void;
}

function PatientRow({ client, tenant, isExpanded, onToggle }: PatientRowProps) {
  const api = useApi();
  const toast = useToast();
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<RecordForm>(emptyRecordForm());
  const [submitting, setSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState<PatientRecord | null>(null);
  const [editForm, setEditForm] = useState<RecordForm>(emptyRecordForm());
  const [confirmDelete, setConfirmDelete] = useState<PatientRecord | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.patientRecords.list(client.id);
      setRecords(data);
      setLoaded(true);
    } catch {
      toast.error('Error al cargar las fichas');
    } finally {
      setLoading(false);
    }
  }, [api, client.id, toast]);

  useEffect(() => {
    if (isExpanded && !loaded) {
      loadRecords();
    }
  }, [isExpanded, loaded, loadRecords]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: CreatePatientRecordInput = {
        clientId: client.id,
        date: createForm.date,
        reason: createForm.reason,
        symptoms: createForm.symptoms || undefined,
        areas: createForm.areas || undefined,
        treatment: createForm.treatment || undefined,
        observations: createForm.observations || undefined,
        nextSession: createForm.nextSession || undefined,
      };
      await api.patientRecords.create(client.id, payload);
      toast.success('Ficha creada');
      setIsCreateOpen(false);
      setCreateForm(emptyRecordForm());
      await loadRecords();
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
      await api.patientRecords.update(client.id, editTarget.id, {
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
      await loadRecords();
    } catch {
      toast.error('Error al actualizar la ficha');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.patientRecords.delete(client.id, confirmDelete.id);
      toast.success('Ficha eliminada');
      setConfirmDelete(null);
      await loadRecords();
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
    <>
      {/* Patient header row */}
      <div
        className="rounded-xl border bg-card overflow-hidden cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 p-4">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
            style={{ backgroundColor: `hsl(${tenant.theme.primaryHsl})` }}
          >
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{client.name}</p>
            {client.phone && (
              <p className="text-xs text-muted-foreground">{client.phone}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {loaded && (
              <span className="text-xs text-muted-foreground">
                {records.length} {records.length === 1 ? 'ficha' : 'fichas'}
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div
            className="border-t px-4 pb-4 pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Fichas clínicas
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:opacity-80 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                Nueva ficha
              </button>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin fichas clínicas</p>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Crear primera ficha
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {records.map((r) => (
                  <RecordCard
                    key={r.id}
                    record={r}
                    onEdit={() => openEdit(r)}
                    onDelete={() => setConfirmDelete(r)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {isCreateOpen && (
        <RecordModal
          title={`Nueva ficha — ${client.name}`}
          onClose={() => { setIsCreateOpen(false); setCreateForm(emptyRecordForm()); }}
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
                className="flex-1 rounded-lg border py-2.5 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
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
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Patients({ tenant }: PatientsProps) {
  const api = useApi();
  const toast = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.clients.list();
      setClients(data);
    } catch {
      toast.error('Error al cargar los pacientes');
    } finally {
      setLoading(false);
    }
  }, [api, toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.phone && c.phone.includes(term)),
    );
  }, [clients, searchTerm]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="text-lg font-semibold">Fichas clínicas</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? 'paciente' : 'pacientes'}
          </p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar paciente por nombre o teléfono…"
          className="w-full rounded-lg border bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No se encontraron pacientes</p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => (
            <PatientRow
              key={client.id}
              client={client}
              tenant={tenant}
              isExpanded={expandedId === client.id}
              onToggle={() => toggleExpand(client.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
