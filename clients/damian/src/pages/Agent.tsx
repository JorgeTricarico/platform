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
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <div style={{ flexShrink: 0 }}>
        <h1 style={{ margin: '0 0 4px 0' }}>Asistente Inteligente</h1>
        <p className="subtitle" style={{ margin: 0 }}>Gestiona pacientes, turnos y música con lenguaje natural.</p>
      </div>

      <div className="card" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        padding: 0, 
        overflow: 'hidden', 
        marginTop: '20px',
        flex: 1,
        minHeight: 0
      }}>
        {/* Messages Area */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '24px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '20px',
          backgroundColor: '#fafafa'
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '85%',
                padding: '14px 18px',
                borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                backgroundColor: msg.role === 'user' ? 'var(--primary-color, #6366f1)' : 'white',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                boxShadow: msg.role === 'user' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : '0 2px 8px rgba(0,0,0,0.05)',
                fontSize: '14.5px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div className="typing-indicator" style={{ 
                padding: '14px 18px', 
                borderRadius: '20px 20px 20px 4px', 
                backgroundColor: 'white', 
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                display: 'flex',
                gap: '4px'
              }}>
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ 
          padding: '20px 24px', 
          borderTop: '1px solid var(--border-color)', 
          display: 'flex', 
          gap: '12px',
          backgroundColor: 'white'
        }}>
          <input
            type="text"
            placeholder="Ej: ¿Qué turnos tengo para hoy?, busca a Ariel..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            disabled={loading}
            style={{ 
              flex: 1, 
              padding: '14px 20px', 
              borderRadius: '12px', 
              border: '1px solid var(--border-color)', 
              outline: 'none', 
              fontFamily: 'inherit', 
              fontSize: '15px',
              transition: 'border-color 0.2s',
              backgroundColor: loading ? '#f9fafb' : 'white'
            }}
          />
          <button 
            className="btn btn-primary" 
            onClick={send} 
            disabled={loading} 
            style={{ 
              padding: '0 28px', 
              borderRadius: '12px',
              fontWeight: 600
            }}
          >
            {loading ? '...' : 'Enviar'}
          </button>
        </div>
      </div>

      <style>{`
        .dot {
          width: 5px;
          height: 5px;
          background: #9ca3af;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        .dot:nth-child(1) { animation-delay: -0.32s; }
        .dot:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
      `}</style>
    </div>
  );
}
