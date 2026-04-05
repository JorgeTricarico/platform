# D9: Notificacion Visual en Sidebar cuando Agente Controla Musica

## Problematica
Cuando Damian le dice al agente "pone musica" desde el chat, el player arranca pero no hay indicacion visual en la UI principal (sidebar) de que la musica esta sonando. Si Damian esta en otra pestaña, no sabe que el comando se ejecuto.

## Contexto
- D8 implemento MusicContext que comunica Agent con Ambient
- El sidebar en App.tsx tiene el tab "Musica Ambiente" sin indicadores dinamicos
- El Ambient.tsx tiene un banner de feedback pero solo se ve si estas en esa pestaña

## Implementacion propuesta
- Agregar un indicador visual (dot verde pulsante o badge) al tab "Musica Ambiente" en el sidebar cuando hay musica reproduciendose
- Usar MusicContext para exponer el estado `isPlaying` globalmente
- El indicador se muestra sin importar en que pestaña este Damian

## Criterio de aceptacion
- Cuando la musica esta sonando, el tab "Musica Ambiente" muestra un indicador visual
- Cuando se pausa, el indicador desaparece
- Funciona tanto si se controla desde Ambient como desde el agente

## Notas
- Requiere exponer estado de reproduccion en MusicContext (actualmente solo tiene comandos)
- Considerar usar un dot animado similar al que ya existe en el player activo
