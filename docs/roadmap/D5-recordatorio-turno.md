# D5: Recordatorio de turno al cliente (24h antes)

## Problematica
Los clientes de Damian a veces faltan a los turnos porque se olvidan. Un recordatorio automatico 24h antes reduciria las ausencias.

## Contexto
Las citas tienen date y time. No hay sistema de notificaciones. El chatbot de WhatsApp existe en demo.

## Implementacion propuesta
1. Job/cron que revise citas de manana cada dia a las 20:00
2. Generar notificacion in-app para Damian ("Recordar a Juan: turno manana 10:00")
3. Fase 2: enviar mensaje WhatsApp al clientPhone (depende de L1)

## Criterio de aceptacion
- Job detecta citas de manana correctamente
- Notificacion se genera para el terapeuta
- Tests del job de recordatorio

## Notas
Empezar con notificacion in-app. WhatsApp real depende de L1.
