import { useState, useEffect, useRef } from 'react';
import { searchClients } from '../services/api';
import type { DBClient } from '../services/api';
import PhotoGallery from './PhotoGallery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export const EMPTY_FORM = {
  clientName: '', clientPhone: '', garmentName: '', repairType: '',
  description: '', intakeDate: new Date().toISOString().split('T')[0], deliveryDate: '', price: 0, deposit: 0, status: 'recibido', location: ''
};

export type GarmentFormState = typeof EMPTY_FORM;

export default function GarmentModal({ title, form, setForm, onSubmit, onClose, showStatus, garmentId }: {
  title: string;
  form: GarmentFormState;
  setForm: React.Dispatch<React.SetStateAction<GarmentFormState>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onClose: () => void;
  showStatus: boolean;
  garmentId?: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // Client search
  const isEditing = !!garmentId;
  const [clientMode, setClientMode] = useState<'existing' | 'new'>(isEditing ? 'new' : 'existing');
  const [clientQuery, setClientQuery] = useState('');
  const [clientResults, setClientResults] = useState<DBClient[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (clientQuery.length < 2) { setClientResults([]); setShowDropdown(false); setSearching(false); return; }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    setSearching(true);
    setShowDropdown(true);
    searchTimeout.current = setTimeout(() => {
      searchClients(clientQuery).then(results => {
        setClientResults(results);
        setSearching(false);
        setShowDropdown(true);
      });
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [clientQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectClient = (client: DBClient) => {
    setForm(prev => ({ ...prev, clientName: client.name, clientPhone: client.phone }));
    setClientQuery(client.name);
    setShowDropdown(false);
  };

  const [clientError, setClientError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    if (clientMode === 'existing' && !isEditing && !form.clientName) {
      e.preventDefault();
      setClientError('Seleccioná un cliente de la lista');
      return;
    }
    setClientError('');
    setSubmitting(true);
    try {
      await onSubmit(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[min(95vw,36rem)] max-h-[90vh] overflow-y-auto" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Client selector toggle */}
          {!isEditing && (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={clientMode === 'existing' ? 'default' : 'outline'}
                onClick={() => setClientMode('existing')}
              >
                Cliente existente
              </Button>
              <Button
                type="button"
                size="sm"
                variant={clientMode === 'new' ? 'default' : 'outline'}
                onClick={() => { setClientMode('new'); setClientQuery(''); setShowDropdown(false); }}
              >
                Nuevo cliente
              </Button>
            </div>
          )}

          {clientMode === 'existing' && !isEditing ? (
            <div className="relative" ref={dropdownRef}>
              <Input
                type="text"
                placeholder="Buscar cliente por nombre o teléfono..."
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
                onFocus={() => { if (clientQuery.length >= 2) setShowDropdown(true); }}
              />
              {showDropdown && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                  {searching ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      Buscando...
                    </div>
                  ) : clientResults.length > 0 ? (
                    clientResults.map(c => (
                      <div
                        key={c.id}
                        onClick={() => selectClient(c)}
                        className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-muted transition-colors text-sm"
                      >
                        <span className="font-semibold text-foreground">{c.name}</span>
                        <span className="text-muted-foreground text-xs">{c.phone}</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      No se encontraron clientes
                    </div>
                  )}
                </div>
              )}
              {form.clientName && (
                <div className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                  Seleccionado: <strong className="text-foreground">{form.clientName}</strong> — {form.clientPhone}
                </div>
              )}
              <input type="hidden" name="clientName" value={form.clientName} />
              <input type="hidden" name="clientPhone" value={form.clientPhone} />
              {clientError && (
                <p className="mt-1 text-xs text-destructive font-medium">{clientError}</p>
              )}
            </div>
          ) : (
            <div className="flex gap-3">
              <Input required name="clientName" placeholder="Nombre y Apellido" value={form.clientName} onChange={handle} className="flex-1" />
              <Input required name="clientPhone" placeholder="Teléfono" value={form.clientPhone} onChange={handle} className="flex-1" />
            </div>
          )}

          <div className="flex gap-3">
            <Input required name="garmentName" placeholder="Prenda (ej: Pantalón)" value={form.garmentName} onChange={handle} className="flex-1" />
            <Input required name="repairType" placeholder="Arreglo (ej: Dobladillo)" value={form.repairType} onChange={handle} className="flex-1" />
          </div>

          <textarea
            required
            name="description"
            placeholder="Detalle exacto del trabajo a realizar..."
            value={form.description}
            onChange={handle}
            rows={3}
            className={cn(
              'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha de Ingreso</label>
              <Input required name="intakeDate" type="date" value={form.intakeDate} onChange={handle} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha de Entrega</label>
              <Input required name="deliveryDate" type="date" value={form.deliveryDate} onChange={handle} />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Precio ($)</label>
              <Input required name="price" type="number" placeholder="Ej: 1500" value={form.price || ''} onChange={handle} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Seña ($)</label>
              <Input name="deposit" type="number" placeholder="Ej: 500" value={form.deposit || ''} onChange={handle} />
            </div>
          </div>

          {showStatus && (
            <Select name="status" value={form.status} onChange={handle}>
              <option value="recibido">Recibido</option>
              <option value="en_proceso">En Proceso</option>
              <option value="listo">Listo para Entrega</option>
              <option value="entregado">Entregado</option>
            </Select>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>

        {garmentId && <PhotoGallery garmentId={garmentId} />}
      </DialogContent>
    </Dialog>
  );
}
