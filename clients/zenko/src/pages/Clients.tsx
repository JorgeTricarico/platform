import { useEffect, useState } from 'react';
import { fetchClients, searchClients, createClient, updateClient, deleteClient, fetchClientOrders } from '../services/api';
import type { DBClient, DBGarment, ClientOrdersResponse } from '../services/api';
import { useToast } from '../components/ToastContext';
import { SkeletonLoader, Spinner } from '../components/SkeletonLoader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Edit2, Trash2, ClipboardList, Phone, PhoneCall } from 'lucide-react';

const EMPTY_FORM = { name: '', phone: '', altPhone: '', email: '', notes: '' };

export default function Clients() {
  const toast = useToast();
  const [clients, setClients] = useState<DBClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });
  const [editTarget, setEditTarget] = useState<DBClient | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [historialTarget, setHistorialTarget] = useState<DBClient | null>(null);
  const [clientOrders, setClientOrders] = useState<ClientOrdersResponse | null>(null);

  const load = () => {
    setLoading(true);
    fetchClients()
      .then(data => { setClients(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!searchTerm.trim()) { load(); return; }
    const timeout = setTimeout(() => {
      searchClients(searchTerm).then(setClients).catch(() => {});
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createClient(createForm);
      toast.success('Cliente registrado correctamente');
      setIsCreateOpen(false);
      setCreateForm({ ...EMPTY_FORM });
      load();
    } catch { toast.error('Error al registrar cliente'); }
  };

  const openEdit = (c: DBClient) => {
    setEditTarget(c);
    setEditForm({ name: c.name, phone: c.phone, altPhone: c.altPhone || '', email: c.email || '', notes: c.notes || '' });
  };

  const openHistorial = async (c: DBClient) => {
    setHistorialTarget(c);
    setClientOrders(null);
    try {
      const data = await fetchClientOrders(c.id);
      setClientOrders(data);
    } catch { toast.error('Error al cargar historial'); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    try {
      await updateClient(editTarget.id, editForm);
      toast.success('Cliente actualizado correctamente');
      setEditTarget(null);
      load();
    } catch { toast.error('Error al actualizar cliente'); }
  };

  const handleDelete = async (c: DBClient) => {
    if (!confirm(`¿Eliminar a ${c.name}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteClient(c.id);
      toast.success('Cliente eliminado');
      load();
    } catch { toast.error('Error al eliminar cliente'); }
  };

  if (loading && clients.length === 0) return <SkeletonLoader rows={5} />;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Base de datos de clientes de Zenko.</p>
        </div>
        <Button className="shrink-0 self-start" onClick={() => setIsCreateOpen(true)}>
          + Nuevo Cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por nombre, teléfono..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {clients.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            No se encontraron clientes.
          </div>
        ) : clients.map(c => (
          <div key={c.id} className="rounded-xl border border-border bg-card shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="font-bold text-sm uppercase tracking-wide text-foreground">{c.name}</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <Phone className="h-3 w-3 shrink-0" />
                  {c.phone}
                </div>
                {c.altPhone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <PhoneCall className="h-3 w-3 shrink-0" />
                    {c.altPhone}
                  </div>
                )}
              </div>
            </div>
            {c.email && <div className="text-xs text-muted-foreground mb-1">{c.email}</div>}
            {c.notes && <div className="text-xs text-muted-foreground truncate mb-2">{c.notes}</div>}
            <div className="flex gap-2 flex-wrap pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                <Edit2 className="h-3.5 w-3.5" />
                Editar
              </Button>
              <Button variant="secondary" size="sm" onClick={() => openHistorial(c)}>
                <ClipboardList className="h-3.5 w-3.5" />
                Historial
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(c)}>
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Teléfono</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Notas</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Registrado</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map(c => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold uppercase tracking-wide">{c.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {c.phone}
                    </div>
                    {c.altPhone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <PhoneCall className="h-3 w-3 shrink-0" />
                        {c.altPhone}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm hidden lg:table-cell">
                    {c.email ? c.email : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm max-w-[200px] truncate hidden lg:table-cell">
                    {c.notes ? c.notes : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap hidden lg:table-cell">
                    {new Date(c.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                        <Edit2 className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => openHistorial(c)}>
                        <ClipboardList className="h-3.5 w-3.5" />
                        Historial
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(c)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground">
                    No se encontraron clientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent onClose={() => { setIsCreateOpen(false); setCreateForm({ ...EMPTY_FORM }); }}>
          <ClientModal
            title="Nuevo Cliente"
            form={createForm}
            setForm={setCreateForm}
            onSubmit={handleCreate}
            onClose={() => { setIsCreateOpen(false); setCreateForm({ ...EMPTY_FORM }); }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent onClose={() => setEditTarget(null)}>
          <ClientModal
            title={`Editar: ${editTarget?.name ?? ''}`}
            form={editForm}
            setForm={setEditForm}
            onSubmit={handleEdit}
            onClose={() => setEditTarget(null)}
            phoneDisabled
          />
        </DialogContent>
      </Dialog>

      {/* Historial modal */}
      <Dialog open={!!historialTarget} onOpenChange={(open) => { if (!open) setHistorialTarget(null); }}>
        <DialogContent
          className="w-[min(95vw,64rem)]"
          onClose={() => setHistorialTarget(null)}
        >
          <DialogHeader>
            <DialogTitle>Historial — {historialTarget?.name}</DialogTitle>
          </DialogHeader>

          {clientOrders === null ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {clientOrders.summary.totalOrders} órdenes en total
              </p>

              {clientOrders.orders.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sin órdenes registradas.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-xs">
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-1/3">Prenda</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap w-[1%] hidden sm:table-cell">Ingreso</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap w-[1%] hidden sm:table-cell">Entrega</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap w-[1%]">Estado</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap w-[1%]">Precio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {clientOrders.orders.map((o: DBGarment) => (
                        <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">
                            <span className="font-bold">{o.garmentName}</span>
                            <span className="text-muted-foreground ml-1">({o.repairType})</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap hidden sm:table-cell w-[1%]">
                            {o.intakeDate ? new Date(o.intakeDate + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap hidden sm:table-cell w-[1%]">
                            {o.deliveryDate ? new Date(o.deliveryDate + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap w-[1%]">{o.status}</td>
                          <td className="px-4 py-3 font-bold whitespace-nowrap w-[1%]">${o.price.toLocaleString('es-AR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistorialTarget(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type FormState = typeof EMPTY_FORM;

function ClientModal({ title, form, setForm, onSubmit, onClose, phoneDisabled }: {
  title: string;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onClose: () => void;
  phoneDisabled?: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    setSubmitting(true);
    try {
      await onSubmit(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Datos de Contacto</p>
        <Input required name="name" placeholder="Nombre completo" value={form.name} onChange={handle} />
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            required
            name="phone"
            placeholder="Teléfono principal"
            value={form.phone}
            onChange={handle}
            disabled={phoneDisabled}
            className={phoneDisabled ? 'opacity-60' : ''}
          />
          <Input name="altPhone" placeholder="Tel. alternativo" value={form.altPhone} onChange={handle} />
        </div>
        <Input name="email" type="email" placeholder="Email (opcional)" value={form.email} onChange={handle} />
      </div>

      <div className="flex flex-col gap-2 pt-3 border-t border-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Información Adicional</p>
        <textarea
          name="notes"
          placeholder="Notas sobre el cliente, preferencias, etc..."
          value={form.notes}
          onChange={handle}
          rows={3}
          className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogFooter>
    </form>
  );
}
