# A4: Protocolo de Diagnostico con Request Real

## Problematica

Cuando un endpoint falla, el agente busca directamente en el codigo sin probar primero el endpoint. Esto lleva a diagnosticos incorrectos porque el error real (status code, mensaje de la DB, stack trace del servidor) no se ve.

## Contexto

El flujo actual de diagnostico es: error reportado → leer codigo → teorizar sobre la causa. Esto es ineficiente y propenso a errores. El error real del servidor (que contiene la causa exacta) se ignora. Hacer un `curl` o request HTTP primero tarda segundos y da informacion precisa.

## Implementacion propuesta

- Agregar una regla en el skill de diagnostico y en `CLAUDE.md`:
  "Ante cualquier error de endpoint: primero hacer un request real al endpoint, ver el error exacto, luego diagnosticar."
- El protocolo de diagnostico es:
  1. Hacer `curl -X METHOD url -H headers -d body` al endpoint que falla.
  2. Capturar el status code y el body de respuesta.
  3. Si el error es 4xx: problema de request (params, auth, validation).
  4. Si el error es 5xx: ver los logs del servidor para el stack trace real.
  5. Recien entonces ir al codigo con el contexto del error real.
- Documentar el protocolo como un paso obligatorio en el skill de debugging.

## Criterio de aceptacion

- El diagnostico de cualquier error de endpoint comienza con un request real (curl o fetch).
- El agente reporta el status code y el mensaje de error exacto antes de analizar el codigo.
- Se elimina el patron de "leer el codigo sin haber visto el error real".

## Notas

- Tener un archivo de snippets de curl comunes para los endpoints del proyecto (facilita testear rapidamente).
- Si el endpoint requiere autenticacion, el agente debe conocer como obtener un token de prueba.
- Este protocolo aplica tanto para debugging del agente como para debugging manual del desarrollador.
