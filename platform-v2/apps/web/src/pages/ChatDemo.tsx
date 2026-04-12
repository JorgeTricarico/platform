import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { Send, Bot, User, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import type { TenantConfig } from '@platform/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ChatDemoProps {
  tenant: TenantConfig;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'user' | 'assistant';

interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: Date;
  error?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function generateSessionId() {
  const key = `chat_session_${Date.now()}`;
  return key;
}

// ─── Message bubble ───────────────────────────────────────────────────────────

interface BubbleProps {
  message: Message;
}

function MessageBubble({ message }: BubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5" />
        ) : (
          <Bot className="w-3.5 h-3.5" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : message.error
            ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 rounded-tl-sm'
            : 'bg-muted text-foreground rounded-tl-sm',
        )}
      >
        {message.error && (
          <div className="flex items-center gap-1.5 mb-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs font-semibold">Error</span>
          </div>
        )}
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        <p
          className={cn(
            'text-[10px] mt-1',
            isUser ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground',
          )}
        >
          {message.createdAt.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-muted text-muted-foreground">
        <Bot className="w-3.5 h-3.5" />
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

// ─── Welcome screen ───────────────────────────────────────────────────────────

interface WelcomeProps {
  tenantName: string;
  onSuggestion: (text: string) => void;
}

const SUGGESTIONS = [
  '¿Cuáles son los servicios disponibles?',
  '¿Cuáles son los horarios de atención?',
  '¿Cómo puedo sacar un turno?',
  '¿Cuánto cuesta una sesión?',
];

function WelcomeScreen({ tenantName, onSuggestion }: WelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Bot className="w-7 h-7 text-primary" />
      </div>
      <div>
        <h3 className="text-base font-semibold">Asistente de {tenantName}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Hacé una pregunta o elegí una sugerencia para empezar.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            className="text-left text-sm px-4 py-2.5 rounded-xl border bg-card hover:bg-muted transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ChatDemo({ tenant }: ChatDemoProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState<string>(generateSessionId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const apiBaseUrl = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '/api';

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${apiBaseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          tenantId: tenant.slug,
          sessionId,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({})) as Record<string, unknown>;
        throw new Error((errBody['error'] as string | undefined) ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as { reply?: string; message?: string; content?: string };
      const reply = data.reply ?? data.message ?? data.content ?? 'Sin respuesta del servidor.';

      const assistantMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: reply,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content:
          err instanceof Error
            ? err.message
            : 'Error al conectar con el asistente. Intentá de nuevo.',
        createdAt: new Date(),
        error: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Asistente AI</p>
            <p className="text-xs text-muted-foreground">{tenant.name}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            title="Nueva conversación"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nueva conversación</span>
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <WelcomeScreen
            tenantName={tenant.name}
            onSuggestion={(s) => { setInput(s); inputRef.current?.focus(); }}
          />
        ) : (
          <div className="space-y-4 max-w-2xl mx-auto">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t bg-background px-4 py-3 flex-shrink-0">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribí tu mensaje… (Enter para enviar)"
              rows={1}
              disabled={loading}
              className={cn(
                'flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm resize-none',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                'max-h-32 overflow-y-auto',
              )}
              style={{ minHeight: '42px' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                'bg-primary text-primary-foreground',
                'hover:opacity-90 transition-opacity',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
              title="Enviar"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Presioná Shift+Enter para nueva línea
          </p>
        </form>
      </div>
    </div>
  );
}
