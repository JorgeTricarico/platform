---
name: jules_orchestrator
description: "Cliente CLI para delegar tareas largas al agente Jules en la nube. TRIGGER cuando el usuario diga: 'delegá a Jules', 'mandá a Jules', 'Jules que lo haga', 'tarea larga en cloud'.\nDO NOT TRIGGER cuando: la tarea se puede resolver localmente en menos de 5 minutos."
roles: [qa]
---

# Jules Orchestrator (Zero-Drift Edition)

Este skill permite al agente local (IDE/Orquestador) delegar y transferir la ejecución de tareas de alto consumo de tokens al entorno seguro en la nube de **Jules**.

## Reglas de Arquitectura (Zero-Drift)

Antes, Jules actuaba de manera superpuesta al agente local. Ahora funciona como una **herramienta atómica (LangChain Tool)** invocada exclusivamente desde el **Nodo de Planeación o Generación**.

### Inputs del Tool
El LLM usará este tool enviando un JSON con:
- `action`: Qué hacer (e.g. `new_task`, `list_sessions`, `pull_patch`).
- `missionTarget`: Prompt puro que describe lo que Jules debe hacer en la nube.
- `specContent` (Opcional): Si la misión requiere código base para inyectar en Jules.

## Operatoria y Restricciones
1. **Inyección por Pipe**: Para tareas robustas, el agente empaquetará el prompt y el archivo de especificación en un stream dirigido a Jules: `cat spec.md | npx @google/jules new --repo OWNER/REPO`.
2. **Sincronización (Commit Previo)**: NUNCA se invoca una tarea remota de Jules si el código local tiene archivos sin pushear en Git. Jules solo lee el branch remoto.
3. **Fire & Forget**: El bot local invoca la tarea, revisa que esté `In Progress` y libera el hilo. No se bloquea esperando a que Jules termine.

## Scripts

- `scripts/tool.ts` — Herramienta de delegación de tareas al agente Jules cloud

## Comandos Tácticos (Background CLI)

| Acción              | Comando CLI de Jules                                   | Descripción de Operación                 |
| :------------------ | :----------------------------------------------------- | :--------------------------------------- |
| **Delegación**      | `npx @google/jules new "<desc>"`                       | Levanta VM remota de Google.             |
| **Monitoreo**       | `npx @google/jules remote list --session`              | Permite ver si el parche está listo.     |
| **Aplicación Parche**| `npx @google/jules remote pull --session <ID> --apply`| Devuelve modificaciones del Cloud a local.|
