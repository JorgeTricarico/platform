# D8: Integracion Musica + Chat en Frontend

## Problematica
El agente IA de Damian ya puede recibir comandos de musica (play, pause, next) y devuelve `actions` en la response. Pero el frontend del chat no procesa estas actions para controlar el reproductor de musica ambiente.

## Contexto
- El agente tiene function `play_music` que devuelve `{ type: 'music_command', action, query }`
- El response del endpoint incluye `actions` array cuando hay comandos de musica
- El modulo Ambient usa IndexedDB para guardar tracks subidos por el usuario
- No hay comunicacion entre el chat y el player de musica

## Implementacion propuesta
- En el componente del chat de Damian, detectar `actions` en la response del agente
- Si hay un `music_command`, disparar un evento o usar un context/store compartido
- El Ambient player escucha estos eventos y ejecuta: play, pause, next, o busca por query en tracks de IndexedDB
- Si no hay tracks guardadas y se pide musica, mostrar mensaje "No hay musica cargada — subi tracks en Musica Ambiente"

## Criterio de aceptacion
- Damian dice "pone musica" en el chat y el player arranca
- Damian dice "para la musica" y el player se pausa
- Si pide una cancion especifica, busca por nombre en las tracks guardadas
- Si no hay tracks, responde que no hay musica cargada

## Notas
- Necesita un state/context compartido entre Chat y Ambient
- Considerar usar un EventBus o React Context
- La busqueda por query es fuzzy (contiene, case insensitive)
