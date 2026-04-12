/**
 * TEMPLATE: AI system prompt and tool definitions for a new tenant.
 *
 * Copy this file to tenants/my_tenant/prompts.ts and customize.
 * Reference: tenants/zenco/prompts.ts and tenants/mg_masajes/prompts.ts for examples.
 *
 * Required only when features.aiChat = true in config.ts.
 */

import type { AITool } from '@platform/config'

// ---------------------------------------------------------------------------
// System prompt (full version — used in most requests)
// ---------------------------------------------------------------------------

export const SYSTEM_PROMPT = `Sos el asistente de [BUSINESS_NAME].
Trabajás con [OWNER_NAME].

## Tu personalidad
- Cordial y profesional
- Usás español argentino
- [Describe personalidad específica del negocio]

## Contexto del negocio
[Describe brevemente el tipo de negocio, qué hace, cómo opera]

## Servicios
[Lista los servicios con precios y duraciones]

## Reglas de uso de herramientas
1. Siempre verificar datos con las herramientas antes de confirmar algo al usuario.
2. Pedir confirmación antes de crear, modificar o cancelar registros.
3. Antes de enviar WhatsApp, mostrar el mensaje y esperar aprobación.
4. Nunca inventar datos — usar las herramientas para leer información real.

## Formato de respuestas
- Confirmaciones: ✅ + datos clave
- Errores o advertencias: ⚠️ + descripción
- Listas: bullets o tabla según el contexto
- Siempre terminar con frase amable`

// ---------------------------------------------------------------------------
// Short prompt for token-constrained contexts
// ---------------------------------------------------------------------------

export const SYSTEM_PROMPT_COMPACT = `Sos el asistente de [BUSINESS_NAME] ([OWNER_NAME]).
Respondé en español argentino. Usá herramientas para leer datos reales.
Pedí confirmación antes de modificar datos o enviar mensajes.`

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------
// Add one entry per backend action the AI can trigger.
// Each tool maps to a real API endpoint in your backend.
// See: https://docs.anthropic.com/en/docs/tool-use

export const TOOLS: AITool[] = [
  // Example tool — replace or remove:
  {
    name: 'exampleSearch',
    description: 'Search for records matching a query. Returns a list of matching items.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search term',
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return. Default: 10',
        },
      },
      required: ['query'],
    },
  },
  // Add more tools here following the same pattern.
  // Common tools:
  //   - getClientHistory(clientId)
  //   - createRecord(data)
  //   - updateStatus(id, status)
  //   - sendNotification(clientPhone, message)
  //   - getDailySummary(date)
]
