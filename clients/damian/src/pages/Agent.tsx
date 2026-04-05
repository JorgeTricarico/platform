import { useState, useRef, useEffect } from 'react';
import { sendAgentMessage } from '../services/api';
import { useMusicCommand } from '../components/MusicContext';
import type { MusicCommand } from '../components/MusicContext';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export default function Agent() {
  const { sendMusicCommand } = useMusicCommand();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hola Damian! Soy tu asistente. Puedo ayudarte a buscar pacientes, ver historiales clinicos, guardar fichas de sesion, controlar la musica, o ver los turnos del dia. Que necesitas?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const { reply, actions } = await sendAgentMessage(text);
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
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
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div>
        <h1>Asistente IA</h1>
        <p className="subtitle">Tu agente personal — gestiona fichas, busca pacientes, consulta turnos.</p>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', marginTop: '16px' }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%',
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                backgroundColor: msg.role === 'user' ? 'var(--primary-color, #6366f1)' : 'var(--surface-secondary, #f3f4f6)',
                color: msg.role === 'user' ? 'white' : 'inherit',
                fontSize: '14px',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', backgroundColor: 'var(--surface-secondary, #f3f4f6)', fontSize: '14px', color: 'var(--text-secondary)' }}>
                Pensando...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px' }}>
          <input
            type="text"
            placeholder="Ej: busca a Maria Lopez, turnos de hoy, guarda ficha de sesion..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            disabled={loading}
            style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontFamily: 'inherit', fontSize: '14px' }}
          />
          <button className="btn btn-primary" onClick={send} disabled={loading} style={{ padding: '12px 24px' }}>
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
