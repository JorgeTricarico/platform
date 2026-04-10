import { useState, useEffect, useRef } from 'react';
import { searchClients } from '../services/api';
import type { DBClient } from '../services/api';
import PhotoGallery from './PhotoGallery';
// No config imports needed
export const EMPTY_FORM = {
  clientName: '', clientPhone: '', garmentName: '', repairType: '',
  description: '', intakeDate: new Date().toISOString().split('T')[0], deliveryDate: '', price: 0, deposit: 0, status: 'recibido', location: ''
};

export type GarmentFormState = typeof EMPTY_FORM;

// Removed unused KNOWN_REPAIR_TYPES

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
  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
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
    <div className="modal-overlay">
      <div className="card modal-card modal-lg">
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <form onSubmit={handleSubmit} className="form-group">
          {/* Client selector */}
          {!isEditing && (
            <div className="garment-modal-mode-toggle">
              <button
                type="button"
                className={clientMode === 'existing' ? 'btn btn-primary btn-small' : 'btn btn-small'}
                onClick={() => setClientMode('existing')}
              >
                Cliente existente
              </button>
              <button
                type="button"
                className={clientMode === 'new' ? 'btn btn-primary btn-small' : 'btn btn-small'}
                onClick={() => { setClientMode('new'); setClientQuery(''); setShowDropdown(false); }}
              >
                Nuevo cliente
              </button>
            </div>
          )}

          {clientMode === 'existing' && !isEditing ? (
            <div className="garment-modal-client-search" ref={dropdownRef}>
              <input
                type="text"
                placeholder="Buscar cliente por nombre o teléfono..."
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
                onFocus={() => { if (clientQuery.length >= 2) setShowDropdown(true); }}
                className="input"
              />
              {showDropdown && (
                <div className="garment-modal-dropdown">
                  {searching ? (
                    <div className="garment-modal-dropdown-msg">
                      Buscando...
                    </div>
                  ) : clientResults.length > 0 ? (
                    clientResults.map(c => (
                      <div
                        key={c.id}
                        onClick={() => selectClient(c)}
                        className="garment-modal-dropdown-item"
                      >
                        <span className="garment-modal-client-name">{c.name}</span>
                        <span className="garment-modal-client-phone">{c.phone}</span>
                      </div>
                    ))
                  ) : (
                    <div className="garment-modal-dropdown-msg">
                      No se encontraron clientes
                    </div>
                  )}
                </div>
              )}
              {form.clientName && (
                <div className="garment-modal-selected-client">
                  Seleccionado: <strong>{form.clientName}</strong> — {form.clientPhone}
                </div>
              )}
              <input type="hidden" name="clientName" value={form.clientName} />
              <input type="hidden" name="clientPhone" value={form.clientPhone} />
              {clientError && (
                <div className="garment-modal-client-error">{clientError}</div>
              )}
            </div>
          ) : (
            <div className="form-row">
              <input required name="clientName" placeholder="Nombre y Apellido" value={form.clientName} onChange={handle} className="input garment-modal-input-flex" />
              <input required name="clientPhone" placeholder="Teléfono" value={form.clientPhone} onChange={handle} className="input garment-modal-input-flex" />
            </div>
          )}
          <div className="form-row">
            <input required name="garmentName" placeholder="Prenda (ej: Pantalón)" value={form.garmentName} onChange={handle} className="input garment-modal-input-flex" />
            <input required name="repairType" placeholder="Arreglo (ej: Dobladillo)" value={form.repairType} onChange={handle} className="input garment-modal-input-flex" />
          </div>
          <input required name="description" placeholder="Detalle exacto del trabajo a realizar..." value={form.description} onChange={handle} className="input" />

          <div className="form-row">
            <div className="garment-modal-field">
              <label className="garment-modal-label">Fecha de Ingreso</label>
              <input required name="intakeDate" type="date" value={form.intakeDate} onChange={handle} className="input garment-modal-input-full" />
            </div>
            <div className="garment-modal-field">
              <label className="garment-modal-label">Fecha de Entrega</label>
              <input required name="deliveryDate" type="date" value={form.deliveryDate} onChange={handle} className="input garment-modal-input-full" />
            </div>
          </div>

          <div className="form-row">
            <div className="garment-modal-field">
              <label className="garment-modal-label">Precio ($)</label>
              <input required name="price" type="number" placeholder="Ej: 1500" value={form.price || ''} onChange={handle} className="input" />
            </div>
            <div className="garment-modal-field">
              <label className="garment-modal-label">Seña ($)</label>
              <input name="deposit" type="number" placeholder="Ej: 500" value={form.deposit || ''} onChange={handle} className="input" />
            </div>
          </div>

          {showStatus && (
            <select name="status" value={form.status} onChange={handle} className="input">
              <option value="recibido">Recibido</option>
              <option value="en_proceso">En Proceso</option>
              <option value="listo">Listo para Entrega</option>
              <option value="entregado">Entregado</option>
            </select>
          )}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
        {garmentId && <PhotoGallery garmentId={garmentId} />}
      </div>
    </div>
  );
}
