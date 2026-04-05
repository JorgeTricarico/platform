# M1: Ficha Clinica Enriquecida

## Problematica

La ficha clinica actual solo registra campos basicos: reason, symptoms, areas, treatment y observations. Para un masajista terapeutico esto es insuficiente — datos como peso, altura, presion arterial, alergias, medicamentos activos y antecedentes clinicos son criticos para evaluar contraindicaciones y planificar el tratamiento correctamente.

## Contexto

El modelo `PatientRecord` existe y se usa en el modulo de Damian. Los datos faltantes son de naturaleza distinta a los de cada sesion: son datos del perfil del paciente que cambian poco (peso, altura, alergias) o que requieren seguimiento longitudinal (presion arterial, medicamentos). Mezclarlos en `PatientRecord` por sesion genera redundancia; un modelo `PatientProfile` asociado al `Client` es mas apropiado.

## Implementacion propuesta

- Crear modelo `PatientProfile` con campos opcionales: `weight`, `height`, `bloodPressure`, `allergies` (texto libre o array), `medications` (texto libre o array), `medicalHistory` (texto).
- Asociar `PatientProfile` a `Client` con relacion 1:1.
- Alternativamente, si el scope es menor, agregar esos campos directamente a `PatientRecord` como opcionales.
- Agregar endpoint `GET/PUT /api/damian/clients/:id/profile`.
- Actualizar el formulario de nueva ficha o crear una seccion "Perfil del paciente" en la vista del cliente.

## Criterio de aceptacion

- El formulario de ficha (o el perfil del paciente) expone los campos: peso, altura, presion arterial, alergias, medicamentos, antecedentes.
- Los datos se persisten en la base de datos y se muestran en la vista del historial del paciente.
- Los campos son opcionales — no bloquean la creacion de una ficha si estan vacios.

## Notas

- Considerar si presion arterial va en el perfil o en cada sesion (puede variar sesion a sesion).
- Si se crea `PatientProfile`, migracion debe ser no destructiva (los clientes existentes quedan sin perfil, no falla).
- Interfaz: podria ser un tab "Datos clinicos" separado del historial de sesiones.
