import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { API_URL, fetchClients, type DBClient } from '../services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SendHorizontal, User, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = localStorage.getItem('auth_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

interface Message {
  role: 'user' | 'bot';
  text: string;
}

interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const SCENARIOS = [
  { id: 'libre', label: 'Chat libre', firstMessage: '' },
  { id: 'estado', label: 'Estado de prenda', firstMessage: 'Hola, quiero saber como va mi arreglo' },
  { id: 'presupuesto', label: 'Presupuesto', firstMessage: 'Hola, cuanto me sale hacer un dobladillo de pantalon?' },
];

export default function ChatDemo() {
  const [activeScenario, setActiveScenario] = useState(SCENARIOS[0].id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<GeminiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<DBClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<DBClient | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientPicker, setShowClientPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const clientPickerRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(`${activeScenario}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  // Cerrar picker al clickear fuera
  useEffect(() => {
    if (!showClientPicker) return;
    const onDocClick = (e: MouseEvent) => {
      if (!clientPickerRef.current?.contains(e.target as Node)) setShowClientPicker(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showClientPicker]);

  // Cargar clientes reales para que Ana (IA) reciba el senderPhone como
  // si fuese un WhatsApp entrante: el backend pre-fetchea sus pedidos.
  useEffect(() => {
    fetchClients().then(setClients).catch(() => {});
  }, []);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients.slice(0, 50);
    return clients
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.altPhone ?? '').includes(q),
      )
      .slice(0, 50);
  }, [clients, clientSearch]);

  const pickClient = useCallback((c: DBClient | null) => {
    setSelectedClient(c);
    setShowClientPicker(false);
    setClientSearch('');
    // Reset conversation when switching identity so the agent doesnt mix contexts
    setMessages([]);
    setHistory([]);
    sessionIdRef.current = `${activeScenario}-${c?.id ?? 'anon'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }, [activeScenario]);


  const sendMessageText = useCallback(async (userMsg: string, currentHistory: GeminiMessage[], currentSessionId: string) => {
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const AI_UNAVAILABLE = 'Lo siento, el asistente de IA no está disponible en este momento. Por favor contactá al administrador para configurar la conexión.';
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          message: userMsg,
          history: currentHistory,
          sessionId: currentSessionId,
          senderPhone: selectedClient?.phone,
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setMessages(prev => [...prev, { role: 'bot', text: AI_UNAVAILABLE }]);
        setLoading(false);
        return;
      }
      const botReply = data.reply || AI_UNAVAILABLE;
      setMessages(prev => [...prev, { role: 'bot', text: botReply }]);
      setHistory(prev => [
        ...prev,
        { role: 'user', parts: [{ text: userMsg }] },
        { role: 'model', parts: [{ text: botReply }] },
      ]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: AI_UNAVAILABLE }]);
    }
    setLoading(false);
  }, [selectedClient]);

  const switchScenario = useCallback((scenarioId: string) => {
    const scenario = SCENARIOS.find(s => s.id === scenarioId)!;
    setActiveScenario(scenarioId);
    setMessages([]);
    setHistory([]);
    setInput('');
    const newSessionId = `${scenarioId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionIdRef.current = newSessionId;

    if (scenario.firstMessage) {
      setTimeout(() => sendMessageText(scenario.firstMessage, [], newSessionId), 300);
    }
  }, [sendMessageText]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    await sendMessageText(userMsg, history, sessionIdRef.current);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Demo del Bot de WhatsApp</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Simula como respondería Ana (IA) a los mensajes de tus clientes.</p>
        </div>
        <Badge variant="listo" className="px-4 py-1.5 text-sm font-bold uppercase tracking-wide shrink-0">
          Modo Demo
        </Badge>
      </div>

      {/* Client picker: simula quien escribe (senderPhone -> IA pre-fetchea sus pedidos como en prod) */}
      <div ref={clientPickerRef} className="max-w-[600px] w-full mx-auto mb-3 shrink-0 relative">
        <button
          type="button"
          onClick={() => setShowClientPicker(v => !v)}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-full bg-whatsapp-header/15 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-whatsapp-header" />
          </div>
          <div className="flex-1 min-w-0">
            {selectedClient ? (
              <>
                <div className="text-sm font-semibold text-foreground truncate">{selectedClient.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">{selectedClient.phone} · simulando WhatsApp entrante</div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold text-foreground">Cliente anónimo</div>
                <div className="text-[11px] text-muted-foreground">Click para elegir un cliente real y simular como en prod</div>
              </>
            )}
          </div>
          {selectedClient && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); pickClient(null); }}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted shrink-0"
              title="Limpiar selección"
            >
              ✕
            </button>
          )}
        </button>

        {showClientPicker && (
          <div className="absolute z-30 left-0 right-0 mt-2 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                placeholder="Buscar por nombre o teléfono..."
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />
              <span className="text-[11px] text-muted-foreground shrink-0">{filteredClients.length}</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {filteredClients.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  {clients.length === 0 ? 'Cargando clientes...' : 'Sin resultados'}
                </div>
              )}
              {filteredClients.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pickClient(c)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted text-left transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{c.phone}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scenario Tabs */}
      <div className="flex gap-2 justify-center mb-6 flex-wrap shrink-0">
        {SCENARIOS.map(s => (
          <button
            key={s.id}
            onClick={() => switchScenario(s.id)}
            disabled={loading}
            className={cn(
              'px-4 py-2 rounded-full text-xs font-semibold transition-all border',
              activeScenario === s.id
                ? 'bg-whatsapp-header text-white border-whatsapp-header shadow-sm'
                : 'bg-card text-foreground border-border hover:bg-muted'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="max-w-[600px] w-full mx-auto rounded-2xl border border-border bg-card shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Chat Header */}
        <div className="bg-whatsapp-header text-white px-4 py-3 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg select-none shrink-0">
            Z
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate">Ana de Zenko</div>
            <div className="text-[11px] opacity-90 flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
              {selectedClient
                ? <span className="truncate">simulando a {selectedClient.name}</span>
                : <span>en línea</span>}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-whatsapp-bg flex flex-col gap-3 scroll-smooth min-h-0">
          {messages.length === 0 && !loading && (
            <div className="flex-1 flex items-center justify-center text-center text-muted-foreground/60 text-xs italic px-4">
              Escribe un mensaje para empezar la conversación
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                'p-3 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-sm break-words',
                m.role === 'user'
                  ? 'self-end bg-whatsapp-user text-slate-900 rounded-tr-none'
                  : 'self-start bg-whatsapp-bot text-slate-900 dark:text-slate-100 rounded-tl-none'
              )}
            >
              {m.text}
            </div>
          ))}
          {loading && (
            <div className="self-start bg-whatsapp-bot text-muted-foreground p-3 rounded-2xl rounded-tl-none text-xs flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              Escribiendo...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 p-3 bg-whatsapp-input border-t border-border/10 shrink-0">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={loading ? 'Esperando respuesta...' : 'Escribe un mensaje...'}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-full border-none bg-card text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-whatsapp-header/50 shadow-inner disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <Button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            size="icon"
            className="rounded-full bg-whatsapp-header hover:bg-whatsapp-header/90 text-white w-10 h-10 shrink-0 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
            ) : (
              <SendHorizontal className="w-5 h-5 ml-0.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
