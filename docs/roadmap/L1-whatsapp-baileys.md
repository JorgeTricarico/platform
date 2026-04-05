# L1: WhatsApp con Baileys

## Problematica

Los chatbots solo funcionan en la web demo. Para ser utiles en produccion necesitan conectarse al WhatsApp real de cada negocio, donde ocurren las interacciones reales con los clientes.

## Contexto

Actualmente los chatbots (Zenko, Damian) solo pueden recibir mensajes a traves de la interfaz web de demo. Los clientes de cada negocio usan WhatsApp como canal principal de comunicacion. Sin esta integracion, el valor del chatbot es limitado y no escala a uso real.

## Implementacion propuesta

- Usar Baileys como libreria de WhatsApp (no requiere API oficial de Meta, funciona por escaneo de QR).
- Crear un servicio Node.js dedicado que:
  - Inicie sesion en WhatsApp via QR
  - Escuche mensajes entrantes
  - Rutee cada mensaje al chatbot correspondiente (segun el negocio)
  - Devuelva la respuesta del chatbot al remitente via WhatsApp
- El servicio se conecta al chatbot existente via llamada interna a la API.
- La sesion de WhatsApp se persiste localmente para no requerir re-escaneo en cada reinicio.

**Riesgos:**
- Baileys puede romperse si WhatsApp actualiza su protocolo interno.
- Requiere una sesion activa y un numero de telefono dedicado por negocio.
- No es una solucion oficialmente soportada por Meta.

## Criterio de aceptacion

- Un mensaje enviado al numero de WhatsApp del negocio llega al chatbot.
- El chatbot responde correctamente al cliente via WhatsApp.
- Si el flujo incluye agendar un turno, el turno queda registrado en la base de datos.

## Notas

- Considerar un numero de telefono de prueba antes de usar el numero real del negocio.
- Evaluar Whapi o servicios similares como alternativa con mayor estabilidad si Baileys resulta poco confiable.
- La sesion de Baileys debe sobrevivir reinicios del servidor (guardar credenciales en disco o DB).
