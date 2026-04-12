import { useState, useRef, useEffect } from 'react';
import { sendAgentMessage } from '../services/api';
import { useMusicCommand } from '../components/MusicContext';
import type { MusicCommand } from '../components/MusicContext';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface GeminiHistoryEntry {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export default function Agent() {
  const { sendMusicCommand } = useMusicCommand();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: '¡Hola Damián! Soy tu asistente. Puedo ayudarte a buscar pacientes, ver historiales clínicos, guardar fichas de sesión, controlar la música, o ver los turnos del día. ¿En qué puedo ayudarte?' }
  ]);
  const [history, setHistory] = useState<GeminiHistoryEntry[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const { reply, actions } = await sendAgentMessage(text, history);

      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);

      // Update history for the next turn
      setHistory(prev => [
        ...prev,
        { role: 'user', parts: [{ text }] },
        { role: 'model', parts: [{ text: reply }] }
      ]);

      if (actions) {
        for (const action of actions) {
          if (action.type === 'music_command' && action.action) {
            sendMusicCommand({ action: action.action as MusicCommand['action'], query: action.query });
          }
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error al comunicar con el agente. Intenta de nuevo.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 100px)' }}>
      <div className="flex-shrink-0">
        <h1 className="m-0 mb-1">Asistente Inteligente</h1>
        <p className="subtitle" style={{ margin: 0 }}>Gestiona pacientes, turnos y música con lenguaje natural.</p>
      </div>

      <div className="bg-(--color-card) rounded-2xl shadow-sm border border-(--color-border) flex flex-col overflow-hidden mt-5 flex-1 min-h-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 bg-(--color-background)">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-[18px] py-[14px] text-[14.5px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-(--color-primary) text-white shadow-[0_4px_12px_rgba(214,109,38,0.2)]'
                    : 'bg-(--color-card) text-(--color-foreground) border border-(--color-border) shadow-sm'
                }`}
                style={{
                  borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div
                className="px-[18px] py-[14px] bg-(--color-card) border border-(--color-border) text-(--color-muted-foreground) flex gap-1"
                style={{ borderRadius: '20px 20px 20px 4px' }}
              >
                <span className="agent-dot"></span>
                <span className="agent-dot"></span>
                <span className="agent-dot"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-6 py-5 border-t border-(--color-border) flex gap-3 bg-(--color-card)">
          <input
            type="text"
            placeholder="Ej: ¿Qué turnos tengo para hoy?, busca a Ariel..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            disabled={loading}
            className="flex-1 px-5 py-[14px] rounded-xl border border-(--color-border) bg-(--color-muted) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50 text-[15px] font-[inherit] disabled:opacity-60"
          />
          <button
            className="inline-flex items-center justify-center px-7 py-0 rounded-xl bg-(--color-primary) text-white font-semibold hover:bg-(--color-accent) transition-all disabled:opacity-60"
            onClick={send}
            disabled={loading}
          >
            {loading ? '...' : 'Enviar'}
          </button>
        </div>
      </div>

      <style>{`
        .agent-dot {
          width: 5px;
          height: 5px;
          background: #9ca3af;
          border-radius: 50%;
          animation: agent-bounce 1.4s infinite ease-in-out both;
        }
        .agent-dot:nth-child(1) { animation-delay: -0.32s; }
        .agent-dot:nth-child(2) { animation-delay: -0.16s; }
        @keyframes agent-bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
      `}</style>
    </div>
  );
}
