import { useState, useRef, useEffect, useCallback } from 'react';
import { API_URL } from '../services/api';
import { BUSINESS } from '../config';

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
  { id: 'turno', label: 'Reservar turno', firstMessage: 'Hola, quiero sacar turno para un masaje descontracturante' },
  { id: 'cancelar', label: 'Cancelar cita', firstMessage: 'Hola, necesito cancelar mi turno' },
];

export default function ChatDemo() {
  const [activeScenario, setActiveScenario] = useState(SCENARIOS[0].id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<GeminiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(`${activeScenario}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessageText = useCallback(async (userMsg: string, currentHistory: GeminiMessage[], currentSessionId: string) => {
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const AI_UNAVAILABLE = 'Lo siento, el asistente de IA no está disponible en este momento. Por favor contactá al administrador para configurar la conexión.';
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ message: userMsg, history: currentHistory, sessionId: currentSessionId })
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
  }, []);

  const switchScenario = useCallback((scenarioId: string) => {
    const scenario = SCENARIOS.find(s => s.id === scenarioId)!;
    setActiveScenario(scenarioId);
    setMessages([]);
    setHistory([]);
    setInput('');
    const newSessionId = `${scenarioId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Demo del Bot de WhatsApp</h1>
          <p className="subtitle">Simula como responderia {BUSINESS.ownerName} (IA) a los mensajes de tus clientes.</p>
        </div>
        <span className="inline-flex px-4 py-2 rounded-full text-sm font-bold bg-green-100 text-(--color-success)">Modo Demo</span>
      </div>

      {/* Scenario Tabs */}
      <div className="flex gap-2 justify-center mb-4 flex-wrap">
        {SCENARIOS.map(s => (
          <button
            key={s.id}
            onClick={() => switchScenario(s.id)}
            disabled={loading}
            className={`px-4 py-2 rounded-full text-[13px] transition-colors ${
              activeScenario === s.id
                ? 'bg-[#25D366] text-white font-semibold border-2 border-[#25D366]'
                : 'bg-white text-[#333] border border-[#ccc] hover:bg-gray-50'
            } disabled:cursor-not-allowed`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="bg-(--color-card) rounded-2xl shadow-sm border border-(--color-border) max-w-[600px] mx-auto overflow-hidden flex flex-col">
        {/* Chat Header */}
        <div className="bg-[#25D366] text-white px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center font-bold text-lg">D</div>
          <div>
            <div className="font-bold text-base">{BUSINESS.ownerName} de {BUSINESS.name}</div>
            <div className="text-xs opacity-90">en linea</div>
          </div>
        </div>

        {/* Messages */}
        <div
          className="overflow-y-auto p-4 flex flex-col gap-2"
          style={{ height: 'max(400px, 50vh)', background: '#ECE5DD' }}
        >
          {messages.length === 0 && !loading && (
            <div className="text-center text-[#999] text-[13px] mt-[160px]">
              Escribi un mensaje para empezar la conversacion
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user' ? '#DCF8C6' : 'white',
              padding: '10px 14px',
              borderRadius: '10px',
              maxWidth: '80%',
              fontSize: '14px',
              lineHeight: '1.5',
              boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
              whiteSpace: 'pre-wrap'
            }}>
              {m.text}
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: 'flex-start', background: 'white', padding: '10px 14px', borderRadius: '10px', fontSize: '14px', color: '#999' }}>
              Escribiendo...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 px-4 py-3 border-t border-(--color-border) bg-[#F0F0F0]">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-4 py-2.5 rounded-full border-none outline-none text-[14px] bg-white"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-[#25D366] text-white border-none rounded-full w-10 h-10 flex items-center justify-center cursor-pointer disabled:opacity-60 text-lg"
          >
            &#10148;
          </button>
        </div>
      </div>
    </div>
  );
}
