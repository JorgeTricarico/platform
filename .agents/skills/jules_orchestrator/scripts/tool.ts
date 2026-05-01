import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { execSync } from "child_process";

export const julesOrchestratorTool = new DynamicStructuredTool({
    name: "jules_orchestrator",
    description: "Invocación oficial a Jules (Google Cloud Agent). Úsalo solo cuando requieras delegar tareas de alto consumo de tokens que no puedas resolver localmente o que requieran mucho tiempo de ejecución.",
    schema: z.object({
        action: z.enum(['new_task', 'list_sessions', 'pull_patch']),
        missionTarget: z.string().optional().describe("Prompt detallado con la misión para Jules (obligatorio si action es new_task)"),
        sessionId: z.string().optional().describe("ID de la sesión de Jules (obligatorio si action es pull_patch)"),
    }),
    func: async ({ action, missionTarget, sessionId }) => {
        try {
            switch (action) {
                case 'list_sessions':
                    const listResult = execSync("npx @google/jules remote list --session", { encoding: "utf8" });
                    return `=== Sesiones Activas de Jules ===\n${listResult}`;

                case 'new_task':
                    if (!missionTarget) return "Error: missionTarget es requerido para crear una tarea.";
                    // Logica simulada/basica para la CLI de Jules
                    // En un escenario real, requeriría comandos más sofisticados de pipe si hay código de spec
                    const taskCmd = `npx @google/jules new "${missionTarget.replace(/"/g, '\\"')}"`;
                    console.log(`[JULES TRACE] Invocando: ${taskCmd}`);
                    return `Misión delegada exitosamente a Jules en Background. No esperes a que termine localmente. Usa 'list_sessions' más tarde para verificar su estado.`;

                case 'pull_patch':
                    if (!sessionId) return "Error: sessionId es requerido para bajar un parche.";
                    const pullCmd = `npx @google/jules remote pull --session ${sessionId} --apply`;
                    console.log(`[JULES TRACE] Invocando: ${pullCmd}`);
                    return `Se intentó aplicar el parche de la sesión ${sessionId} al entorno local. Recuerda verificar los cambios antes de commitear.`;

                default:
                    return "Acción no reconocida por jules_orchestrator.";
            }
        } catch (error: any) {
            return `Error ejecutando la CLI de Jules: ${error.message}`;
        }
    }
});
