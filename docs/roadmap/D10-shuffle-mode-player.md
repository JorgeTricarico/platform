# D10: Shuffle Mode para el Player de Musica Ambiente

## Problematica
Actualmente el player reproduce una sola track en loop o avanza secuencialmente con "next". Para sesiones largas de masaje, seria mejor tener un modo shuffle que reproduzca tracks al azar.

## Contexto
- Ambient.tsx tiene loop mode (ON/OFF) y next track secuencial
- Las tracks se almacenan en IndexedDB y se cargan como array
- El agente puede enviar "next" pero siempre avanza secuencialmente

## Implementacion propuesta
- Agregar toggle "Shuffle" al player (junto al toggle de Loop)
- Cuando shuffle esta activo y termina un track, elegir uno aleatorio diferente al actual
- El comando "next" del agente tambien respeta el modo shuffle
- Cuando loop esta OFF y shuffle esta ON, al terminar un track pasa a uno random

## Criterio de aceptacion
- Toggle shuffle visible en el player
- Con shuffle ON, next track es aleatorio
- Con shuffle OFF, comportamiento secuencial actual se mantiene
- El agente respeta el modo shuffle cuando dice "next"

## Notas
- Shuffle y Loop pueden coexistir: loop repite el mismo track, shuffle cambia al terminar
- Si solo hay 1 track, shuffle no tiene efecto
