---
name: mcp-cloud-connectors
description: MCPs conectados via claude.ai que causan "Prompt is too long" en sub-agentes — instrucciones para desactivar/reactivar
type: reference
---

## Cloud MCP Connectors (claude.ai)

Estos MCPs estan conectados via la cuenta de claude.ai y se inyectan automaticamente en cada sesion:

| MCP | Tools aprox | Estado deseado |
|-----|-------------|----------------|
| PostHog | ~150+ | **DESACTIVAR** (causa prompt overflow en sub-agentes) |
| Slack | ~15 | **DESACTIVAR** (no se usa en desarrollo) |
| Granola | ~5 | mantener (pocas tools) |

### Como desactivar
1. Ir a **claude.ai** > **Settings** > **Integrations**
2. Desconectar PostHog y Slack

### Como reactivar
1. Ir a **claude.ai** > **Settings** > **Integrations**
2. Reconectar PostHog y/o Slack (re-autenticar si pide)

### Por que
Con muchos MCP tools conectados (~170+), los sub-agentes heredan todos los schemas y el prompt supera el limite de contexto. Desactivar PostHog y Slack libera ~165 tools y permite usar sub-agentes normalmente.
