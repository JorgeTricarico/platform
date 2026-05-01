import { useState, useEffect, useRef } from 'react';
import { searchClients } from '../services/api';
import type { DBClient, DBGarment } from '../services/api';
import PhotoGallery from './PhotoGallery';
import CameraCapture from './CameraCapture';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, User, Phone, Shirt, Scissors, FileText, CalendarDays, DollarSign, Loader2, Plus, Trash2, Camera, X as XIcon } from 'lucide-react';

export type GarmentItem = {
  garmentName: string;
  repairType: string;
  description: string;
  price: number;
  deposit: number;
};

export const EMPTY_ITEM: GarmentItem = {
  garmentName: '', repairType: '', description: '', price: 0, deposit: 0,
};

export const EMPTY_FORM = {
  clientName: '', clientPhone: '', garmentName: '', repairType: '',
  description: '', intakeDate: new Date().toISOString().split('T')[0], deliveryDate: '', price: 0, deposit: 0, status: 'recibido', location: '',
  items: [{ ...EMPTY_ITEM }] as GarmentItem[],
};

export type GarmentFormState = typeof EMPTY_FORM;

// Función pura: precio sugerido basado en historial
export function getPriceSuggestion(
  garmentName: string,
  repairType: string,
  history: DBGarment[]
): { avg: number; count: number } | null {
  if (!garmentName.trim() || !history.length) return null;
  const name = garmentName.toLowerCase();
  const repair = repairType.toLowerCase().trim();
  const matches = history.filter(g =>
    g.garmentName.toLowerCase().includes(name) &&
    (!repair || g.repairType.toLowerCase().includes(repair)) &&
    g.price > 0
  );
  if (matches.length < 2) return null;
  const avg = Math.round(matches.reduce((sum, g) => sum + g.price, 0) / matches.length);
  return { avg, count: matches.length };
}

// Función pura: sugerencias de repairType basadas en historial
export function getSuggestions(garmentName: string, history: DBGarment[]): string[] {
  if (!garmentName.trim() || !history.length) return [];
  const query = garmentName.toLowerCase();
  const freq: Record<string, number> = {};
  history.forEach(g => {
    if (g.garmentName.toLowerCase().includes(query)) {
      const rt = g.repairType.trim();
      if (rt) freq[rt] = (freq[rt] || 0) + 1;
    }
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type);
}

export default function GarmentModal({ title, form, setForm, onSubmit, onClose, showStatus, garmentId, garmentHistory }: {
  title: string;
  form: GarmentFormState;
  setForm: React.Dispatch<React.SetStateAction<GarmentFormState>>;
  onSubmit: (e: React.FormEvent, capturedPhotos?: File[]) => Promise<void>;
  onClose: () => void;
  showStatus: boolean;
  garmentId?: string;
  garmentHistory?: DBGarment[];
}) {
  const today = new Date().toISOString().split('T')[0];
  const [submitting, setSubmitting] = useState(false);
  const [deliveryError, setDeliveryError] = useState('');
  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (e.target.name === 'deliveryDate') setDeliveryError('');
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Client search
  const isEditing = !!garmentId;

  // Fotos capturadas en modo creación
  const [capturedPhotos, setCapturedPhotos] = useState<File[]>([]);
  const [showCamera, setShowCamera] = useState(false);

  const handleCapture = (file: File) => {
    setCapturedPhotos(prev => [...prev, file]);
    setShowCamera(false);
  };

  const removePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

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

  // Items state para modo creación
  const items: GarmentItem[] = form.items && form.items.length > 0 ? form.items : [{ ...EMPTY_ITEM }];

  const updateItem = (index: number, field: keyof GarmentItem, value: string | number) => {
    setForm(prev => {
      const newItems = [...(prev.items || [{ ...EMPTY_ITEM }])];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...(prev.items || []), { ...EMPTY_ITEM }],
    }));
    setSuggestions(prev => [...prev, []]);
  };

  const removeItem = (index: number) => {
    setForm(prev => {
      const newItems = (prev.items || []).filter((_, i) => i !== index);
      return { ...prev, items: newItems.length > 0 ? newItems : [{ ...EMPTY_ITEM }] };
    });
  };

  // Sugerencias por ítem
  const [suggestions, setSuggestions] = useState<string[][]>(items.map(() => []));

  const handleItemGarmentName = (index: number, value: string) => {
    updateItem(index, 'garmentName', value);
    const sugs = garmentHistory ? getSuggestions(value, garmentHistory) : [];
    setSuggestions(prev => {
      const next = [...prev];
      next[index] = sugs;
      return next;
    });
  };

  const applySuggestion = (index: number, repairType: string) => {
    updateItem(index, 'repairType', repairType);
    setSuggestions(prev => {
      const next = [...prev];
      next[index] = [];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (!isEditing && form.deliveryDate && form.deliveryDate < today) {
      e.preventDefault();
      setDeliveryError('La fecha de entrega no puede ser una fecha pasada');
      return;
    }
    if (clientMode === 'existing' && !isEditing && !form.clientName) {
      e.preventDefault();
      setClientError('Seleccioná un cliente de la lista');
      return;
    }
    setClientError('');
    setSubmitting(true);
    try {
      await onSubmit(e, isEditing ? undefined : capturedPhotos);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }} className="w-[min(95vw,36rem)]">
      <DialogContent onClose={onClose}>
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
                <User className="h-3.5 w-3.5" />
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Buscar cliente por nombre o teléfono..."
                  value={clientQuery}
                  onChange={(e) => setClientQuery(e.target.value)}
                  onFocus={() => { if (clientQuery.length >= 2) setShowDropdown(true); }}
                  className="pl-9"
                />
              </div>
              {showDropdown && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                  {searching ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
                <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  Seleccionado: <strong className="text-foreground">{form.clientName}</strong>
                  {form.clientPhone && (
                    <>
                      <Phone className="h-3 w-3 ml-1 shrink-0" />
                      <span>{form.clientPhone}</span>
                    </>
                  )}
                </div>
              )}
              <input type="hidden" name="clientName" value={form.clientName} />
              <input type="hidden" name="clientPhone" value={form.clientPhone} />
              {clientError && (
                <p className="mt-1 text-xs text-destructive font-medium">{clientError}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input required name="clientName" placeholder="Nombre y Apellido" value={form.clientName} onChange={handle} className="pl-9" />
              </div>
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input required name="clientPhone" placeholder="Teléfono" value={form.clientPhone} onChange={handle} className="pl-9" />
              </div>
            </div>
          )}

          {/* Modo edición: campos planos (sin cambios) */}
          {isEditing ? (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Shirt className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input required name="garmentName" placeholder="Prenda (ej: Pantalón)" value={form.garmentName} onChange={handle} className="pl-9" />
                </div>
                <div className="relative flex-1">
                  <Scissors className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input required name="repairType" placeholder="Arreglo (ej: Dobladillo)" value={form.repairType} onChange={handle} className="pl-9" />
                </div>
              </div>

              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Textarea
                  required
                  name="description"
                  placeholder="Detalle exacto del trabajo a realizar..."
                  value={form.description}
                  onChange={handle}
                  rows={3}
                  className="pl-9 resize-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    Precio ($)
                  </label>
                  <Input required name="price" type="number" placeholder="Ej: 1500" value={form.price || ''} onChange={handle} />
                  {(() => {
                    const sug = garmentHistory ? getPriceSuggestion(form.garmentName, form.repairType, garmentHistory) : null;
                    return sug ? (
                      <p className="text-xs text-muted-foreground mt-0.5 cursor-pointer hover:text-primary"
                         onClick={() => setForm(prev => ({ ...prev, price: sug.avg }))}
                      >
                        Sugerido: ${sug.avg.toLocaleString()} <span className="opacity-60">(basado en {sug.count} pedidos)</span>
                      </p>
                    ) : null;
                  })()}
                </div>
                <div className="flex-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    Seña ($)
                  </label>
                  <Input name="deposit" type="number" placeholder="Ej: 500" value={form.deposit || ''} onChange={handle} />
                </div>
              </div>
            </>
          ) : (
            /* Modo creación: lista de ítems */
            <>
              {items.map((item, index) => (
                <div key={index} className="border border-border rounded-lg p-3 flex flex-col gap-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Prenda {index + 1}</span>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(index)}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        aria-label="Eliminar prenda"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Shirt className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        required
                        placeholder="Prenda (ej: Pantalón)"
                        value={item.garmentName}
                        onChange={(e) => handleItemGarmentName(index, e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="relative flex-1">
                      <Scissors className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        required
                        placeholder="Arreglo (ej: Dobladillo)"
                        value={item.repairType}
                        onChange={(e) => updateItem(index, 'repairType', e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Chips de sugerencias */}
                  {suggestions[index] && suggestions[index].length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions[index].map(sug => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => applySuggestion(index, sug)}
                          className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Textarea
                      placeholder="Detalle del trabajo (opcional)"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      rows={2}
                      className="pl-9 resize-none"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        Precio ($)
                      </label>
                      <Input
                        required
                        type="number"
                        placeholder="Ej: 1500"
                        value={item.price || ''}
                        onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
                      />
                      {(() => {
                        const sug = garmentHistory ? getPriceSuggestion(item.garmentName, item.repairType, garmentHistory) : null;
                        return sug ? (
                          <p className="text-xs text-muted-foreground mt-0.5 cursor-pointer hover:text-primary"
                             onClick={() => updateItem(index, 'price', sug.avg)}
                          >
                            Sugerido: ${sug.avg.toLocaleString()} <span className="opacity-60">(basado en {sug.count} pedidos)</span>
                          </p>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex-1">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        Seña ($)
                      </label>
                      <Input
                        type="number"
                        placeholder="Ej: 500"
                        value={item.deposit || ''}
                        onChange={(e) => updateItem(index, 'deposit', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Añadir prenda — botón prominente naranja */}
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-3 w-full rounded-xl border-2 border-dashed border-[#A34E17]/40 hover:border-[#A34E17] hover:bg-[#A34E17]/5 px-4 py-2.5 transition-colors group"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#A34E17] text-white text-xl font-bold flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm">+</span>
                <span className="text-sm font-bold text-[#A34E17]">Añadir otra prenda al pedido</span>
              </button>

              {/* Sección de fotos — solo en creación */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-muted-foreground">Fotos (opcional)</p>
                {!showCamera && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCamera(true)}
                    aria-label="Agregar foto"
                  >
                    <Camera className="h-4 w-4" />
                    Agregar foto
                  </Button>
                )}
                {showCamera && (
                  <CameraCapture
                    onCapture={handleCapture}
                    onClose={() => setShowCamera(false)}
                  />
                )}
                {capturedPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {capturedPhotos.map((file, i) => (
                      <div key={i} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`foto-${i + 1}`}
                          className="h-16 w-16 rounded-md object-cover border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          aria-label={`Eliminar foto ${i + 1}`}
                          className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white text-[10px]"
                        >
                          <XIcon className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Fechas: compartidas entre todos los ítems en creación, normales en edición */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Fecha de Ingreso
              </label>
              <Input required name="intakeDate" type="date" value={form.intakeDate} onChange={handle} />
            </div>
            <div className="flex-1">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Fecha de Entrega
              </label>
              <Input required name="deliveryDate" type="date" min={isEditing ? undefined : today} value={form.deliveryDate} onChange={handle} className={deliveryError ? 'border-destructive' : ''} />
              {deliveryError && <p className="text-xs text-destructive mt-1">{deliveryError}</p>}
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
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>

        {garmentId && <PhotoGallery garmentId={garmentId} />}
      </DialogContent>
    </Dialog>
  );
}
