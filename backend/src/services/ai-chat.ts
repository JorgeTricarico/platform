/**
 * AI Chat service with automatic fallback chain.
 * Tries providers in order until one responds successfully.
 *
 * Chain: Gemini → Cerebras → Mistral → Sambanova (plain chat only)
 *
 * Gemini, Cerebras, and Mistral support function calling.
 * Sambanova is plain chat fallback only.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

interface GeminiHistoryEntry {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface FunctionDecl {
  name: string;
  description: string;
  parameters: any;
}

interface ChatOptions {
  systemPrompt: string;
  message: string;
  history?: GeminiHistoryEntry[];
  tools?: { functionDeclarations: FunctionDecl[] }[];
  onFunctionCall?: (name: string, args: Record<string, string>) => Promise<any>;
}

interface ChatResult {
  reply: string;
  provider: string;
}

// OpenAI-compatible providers
interface Provider {
  name: string;
  envKey: string;
  baseUrl: string;
  model: string;
  supportsTools: boolean;
}

const PROVIDERS: Provider[] = [
  { name: 'cerebras', envKey: 'CEREBRAS_API_KEY', baseUrl: 'https://api.cerebras.ai/v1', model: 'llama3.1-8b', supportsTools: true },
  { name: 'mistral', envKey: 'MISTRAL_API_KEY', baseUrl: 'https://api.mistral.ai/v1', model: 'mistral-small-latest', supportsTools: true },
  { name: 'sambanova', envKey: 'SAMBANOVA_API_KEY', baseUrl: 'https://api.sambanova.ai/v1', model: 'Meta-Llama-3.3-70B-Instruct', supportsTools: false },
];

/** Convert Gemini history to OpenAI messages */
function toOpenAIMessages(systemPrompt: string, history: GeminiHistoryEntry[], message: string) {
  const messages: any[] = [{ role: 'system', content: systemPrompt }];
  for (const h of history) {
    messages.push({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.parts.map(p => p.text).join(''),
    });
  }
  messages.push({ role: 'user', content: message });
  return messages;
}

/** Convert our tool declarations to OpenAI format */
function toOpenAITools(tools: { functionDeclarations: FunctionDecl[] }[]) {
  const result: any[] = [];
  for (const group of tools) {
    for (const fn of group.functionDeclarations) {
      result.push({
        type: 'function',
        function: {
          name: fn.name,
          description: fn.description,
          parameters: convertSchemaType(fn.parameters),
        },
      });
    }
  }
  return result;
}

/** Convert Gemini SchemaType to JSON Schema */
function convertSchemaType(param: any): any {
  if (!param) return {};
  const result: any = {};

  // Map Gemini schema types to JSON Schema
  const typeMap: Record<string, string> = { OBJECT: 'object', STRING: 'string', NUMBER: 'number', BOOLEAN: 'boolean', ARRAY: 'array' };
  result.type = typeMap[param.type] || param.type?.toLowerCase() || 'object';

  if (param.description) result.description = param.description;
  if (param.required) result.required = param.required;

  if (param.properties) {
    result.properties = {};
    for (const [key, val] of Object.entries(param.properties)) {
      result.properties[key] = convertSchemaType(val);
    }
  }

  return result;
}

/** Try Gemini (native function calling) */
async function tryGemini(opts: ChatOptions): Promise<ChatResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('No GEMINI_API_KEY');

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelConfig: any = {
    model: 'gemini-2.0-flash',
    systemInstruction: opts.systemPrompt,
  };
  if (opts.tools) modelConfig.tools = opts.tools;

  const model = genAI.getGenerativeModel(modelConfig);
  const chat = model.startChat({ history: opts.history || [] });

  let response = await chat.sendMessage(opts.message);
  let result = response.response;

  if (opts.tools && opts.onFunctionCall) {
    let maxRounds = 3;
    while (maxRounds-- > 0) {
      const functionCalls = result.functionCalls();
      if (!functionCalls || functionCalls.length === 0) break;

      const functionResponses = [];
      for (const fc of functionCalls) {
        const fnResult = await opts.onFunctionCall(fc.name, fc.args as Record<string, string>);
        functionResponses.push({
          functionResponse: { name: fc.name, response: fnResult },
        });
      }

      response = await chat.sendMessage(functionResponses);
      result = response.response;
    }
  }

  return { reply: result.text(), provider: 'gemini' };
}

/** Try an OpenAI-compatible provider (with optional function calling) */
async function tryOpenAI(provider: Provider, opts: ChatOptions): Promise<ChatResult> {
  const apiKey = process.env[provider.envKey];
  if (!apiKey) throw new Error(`No ${provider.envKey}`);

  const messages = toOpenAIMessages(opts.systemPrompt, opts.history || [], opts.message);
  const useTools = provider.supportsTools && opts.tools && opts.tools.length > 0;

  const body: any = {
    model: provider.model,
    messages,
    max_tokens: 500,
  };
  if (useTools) {
    body.tools = toOpenAITools(opts.tools!);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    let response: any;
    let maxRounds = 3;

    while (maxRounds-- > 0) {
      const res = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`${provider.name} ${res.status}: ${err.slice(0, 200)}`);
      }

      const data = await res.json();
      response = data.choices?.[0]?.message;

      if (!response) throw new Error(`${provider.name}: empty response`);

      // Handle tool calls
      if (response.tool_calls && response.tool_calls.length > 0 && opts.onFunctionCall) {
        // Add assistant message with tool calls to context
        body.messages.push(response);

        for (const tc of response.tool_calls) {
          const args = typeof tc.function.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments;

          const fnResult = await opts.onFunctionCall(tc.function.name, args);

          body.messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(fnResult),
          });
        }
        // Continue loop to get final text response
        continue;
      }

      // Got a text response — done
      break;
    }

    const reply = response?.content;
    if (!reply) throw new Error(`${provider.name}: no text in final response`);

    return { reply, provider: provider.name };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Send a chat message with automatic fallback chain.
 * Tries Gemini first, then OpenAI-compatible providers.
 * All providers that support tools will use function calling.
 */
export async function chatWithFallback(opts: ChatOptions): Promise<ChatResult> {
  const errors: string[] = [];

  // 1. Try Gemini first
  try {
    return await tryGemini(opts);
  } catch (e: any) {
    errors.push(`gemini: ${e.message?.slice(0, 100)}`);
  }

  // 2. Fallback through OpenAI-compatible providers
  for (const provider of PROVIDERS) {
    try {
      return await tryOpenAI(provider, opts);
    } catch (e: any) {
      errors.push(`${provider.name}: ${e.message?.slice(0, 100)}`);
    }
  }

  console.error('All AI providers failed:', errors.join(' | '));
  throw new Error('All AI providers failed');
}
