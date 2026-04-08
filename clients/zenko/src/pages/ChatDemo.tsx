import { useState, useRef, useEffect } from 'react';
import { API_URL } from '../services/api';

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

// Gemini history format
interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

function getSessionId(): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `zenco-chat-session-${today}`;
  let sessionId = localStorage.getItem(key);
  if (!sessionId) {
    sessionId = `${today}-${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem(key, sessionId);
  }
  return sessionId;
}

export default function ChatDemo() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<GeminiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(getSessionId());

  // Load chat history from DB on mount
  useEffect(() => {
    fetch(`${API_URL}/chat/history?sessionId=${sessionId.current}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data.messages?.length > 0) {
          const restored: Message[] = data.messages.map((m: { role: string; content: string }) => ({
            role: m.role === 'user' ? 'user' : 'bot',
            text: m.content,
          }));
          const restoredHistory: GeminiMessage[] = data.messages.map((m: { role: string; content: string }) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
          }));
          setMessages(restored);
          setHistory(restoredHistory);
        }
      })
      .catch(() => { /* ignore — first visit or offline */ });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ message: userMsg, history, sessionId: sessionId.current })
      });
      const data = await res.json();
      const botReply = data.reply || 'No pude procesar tu mensaje.';
      setMessages(prev => [...prev, { role: 'bot', text: botReply }]);
      // Update history for next turn
      setHistory(prev => [
        ...prev,
        { role: 'user', parts: [{ text: userMsg }] },
        { role: 'model', parts: [{ text: botReply }] },
      ]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: 'Ups, tuve un problema. Intenta de nuevo en un momento.' }]);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1>Demo del Bot de WhatsApp</h1>
          <p className="subtitle">Simula como responderia Ana (IA) a los mensajes de tus clientes.</p>
        </div>
        <span className="badge completed" style={{ padding: '8px 16px', fontSize: '14px' }}>Modo Demo</span>
      </div>

      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: 0, overflow: 'hidden' }}>
        {/* Chat Header */}
        <div style={{ background: '#25D366', color: 'white', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '18px' }}>Z</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px' }}>Ana de Zenco</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>en linea</div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ height: '400px', overflowY: 'auto', padding: '16px', background: '#ECE5DD', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
        <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderTop: '1px solid #ddd', background: '#F0F0F0' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Escribe un mensaje..."
            style={{ flex: 1, padding: '10px 14px', borderRadius: '20px', border: 'none', outline: 'none', fontSize: '14px' }}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            style={{ background: '#25D366', color: 'white', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            &#10148;
          </button>
        </div>
      </div>
    </div>
  );
}
