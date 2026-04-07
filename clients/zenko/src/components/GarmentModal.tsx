import { useState, useEffect, useRef } from 'react';
import { searchClients } from '../services/api';
import type { DBClient } from '../services/api';
import PhotoGallery from './PhotoGallery';
import { BUSINESS } from '../config';

export const EMPTY_FORM = {
  clientName: '', clientPhone: '', garmentName: '', repairType: '',
  description: '', intakeDate: new Date().toISOString().split('T')[0], deliveryDate: '', price: 0, status: 'recibido', location: ''
};

export type GarmentFormState = typeof EMPTY_FORM;

const KNOWN_REPAIR_TYPES = BUSINESS.repairTypes;

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
  const isCustomRepair = form.repairType !== '' && !KNOWN_REPAIR_TYPES.includes(form.repairType);
  const [showCustomRepair, setShowCustomRepair] = useState(isCustomRepair);
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
      <div className="card modal-card">
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <form onSubmit={handleSubmit} className="form-group">
          {/* Client selector */}
          {!isEditing && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button
                type="button"
                className={clientMode === 'existing' ? 'btn btn-primary btn-small' : 'btn btn-small'}
                style={clientMode !== 'existing' ? { backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)' } : {}}
                onClick={() => setClientMode('existing')}
              >
                Cliente existente
              </button>
              <button
                type="button"
                className={clientMode === 'new' ? 'btn btn-primary btn-small' : 'btn btn-small'}
                style={clientMode !== 'new' ? { backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)' } : {}}
                onClick={() => { setClientMode('new'); setClientQuery(''); setShowDropdown(false); }}
              >
                Nuevo cliente
              </button>
            </div>
          )}

          {clientMode === 'existing' && !isEditing ? (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <input
                type="text"
                placeholder="Buscar cliente por nombre o teléfono..."
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
                onFocus={() => { if (clientQuery.length >= 2) setShowDropdown(true); }}
                className="input"
              />
              {showDropdown && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  background: 'white', border: '1px solid var(--border-color)', borderRadius: '8px',
                  maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  {searching ? (
                    <div style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                      Buscando...
                    </div>
                  ) : clientResults.length > 0 ? (
                    clientResults.map(c => (
                      <div
                        key={c.id}
                        onClick={() => selectClient(c)}
                        style={{
                          padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-secondary)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                      >
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{c.phone}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                      No se encontraron clientes
                    </div>
                  )}
                </div>
              )}
              {form.clientName && (
                <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Seleccionado: <strong>{form.clientName}</strong> — {form.clientPhone}
                </div>
              )}
              <input type="hidden" name="clientName" value={form.clientName} />
              <input type="hidden" name="clientPhone" value={form.clientPhone} />
              {clientError && (
                <div style={{ color: 'var(--danger)', fontSize: '13px', marginTop: '4px' }}>{clientError}</div>
              )}
            </div>
          ) : (
            <div className="form-row">
              <input required name="clientName" placeholder="Nombre y Apellido" value={form.clientName} onChange={handle} className="input" style={{ flex: 1 }} />
              <input required name="clientPhone" placeholder="Teléfono" value={form.clientPhone} onChange={handle} className="input" style={{ flex: 1 }} />
            </div>
          )}
          <input required name="garmentName" placeholder="Ej: Pantalón de Vestir" value={form.garmentName} onChange={handle} className="input" />
          <div className="form-row">
            <select
              required={!showCustomRepair}
              name="repairType"
              value={showCustomRepair ? 'otro' : form.repairType}
              onChange={(e) => {
                if (e.target.value === 'otro') {
                  setShowCustomRepair(true);
                  setForm(prev => ({ ...prev, repairType: '' }));
                } else {
                  setShowCustomRepair(false);
                  setForm(prev => ({ ...prev, repairType: e.target.value }));
                }
              }}
              className="input"
              style={{ flex: 1 }}
            >
              <option value="">Tipo de Arreglo...</option>
              <option value="dobladillo">Dobladillo</option>
              <option value="cierre">Cambio de Cierre</option>
              <option value="entalle">Entalle / Achicar</option>
              <option value="tela">Arreglo de Tela</option>
              <option value="diseño">Diseño Nuevo</option>
              <option value="otro">Otro...</option>
            </select>
            <input required name="price" type="number" placeholder="Costo ($)" value={form.price || ''} onChange={handle} className="input" style={{ flex: 1 }} />
          </div>
          {showCustomRepair && (
            <input
              required
              name="repairType"
              placeholder="Escribí el tipo de arreglo..."
              value={form.repairType}
              onChange={handle}
              className="input"
            />
          )}
          <input required name="description" placeholder="Detalle exacto del trabajo a realizar..." value={form.description} onChange={handle} className="input" />
          <input name="location" placeholder="Ubicación en local (ej: Estante 3, Perchero B)" value={form.location} onChange={handle} className="input" />
          <div className="form-row">
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', color: '#666', marginBottom: '4px', display: 'block' }}>Fecha de Ingreso</label>
              <input required name="intakeDate" type="date" value={form.intakeDate} onChange={handle} className="input" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', color: '#666', marginBottom: '4px', display: 'block' }}>Fecha de Entrega</label>
              <input required name="deliveryDate" type="date" value={form.deliveryDate} onChange={handle} className="input" style={{ width: '100%', boxSizing: 'border-box' }} />
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
