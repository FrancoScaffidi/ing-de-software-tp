# Relevamiento — Hospital Argentino
### Sistema de Gestión de Turnos y Recepción · Equipo O.L.A.

---

## Descripción del proyecto

El **Hospital Argentino** desea desarrollar e implementar un sistema de **gestión de turnos y recepción** con el fin de optimizar el flujo de atención al paciente, agilizar la recepción y reducir la pérdida de turnos.

El circuito contempla que el paciente **solicite un turno** —a través de la **web** (autogestión) o de forma presencial en **recepción**, donde el recepcionista lo carga en el sistema—. El día del turno, al presentarse en mesa de entrada, el sistema permite **registrar sus datos**, **validar su cobertura médica** (particular o con obra social/prepaga) y **calcular y cobrar los aranceles** correspondientes. En ese mismo flujo se realiza la **reserva del turno** y la **derivación al médico especialista** adecuado según el cuadro clínico presentado.

Adicionalmente, para maximizar la efectividad en la atención y reducir el ausentismo, el sistema **automatiza el envío de recordatorios** de turno vía **WhatsApp** con **24 horas de anticipación**.

**Actores:** Paciente · Recepcionista · Especialista (médico).

---

## Objetivo

Lograr que los pacientes que ingresan a mesa de entrada completen su **registro, validación de cobertura y asignación de turno en un tiempo menor a 5 minutos**, y **reducir el ausentismo** a los turnos programados en un **20 % en los primeros 3 meses** posteriores al despliegue del sistema, mediante el uso de recordatorios automatizados.

*Objetivos alcanzables y medibles.*

---

## Límite  *(corregido — C1)*

> **Corrección del profesor:** el límite original arrancaba en "el ingreso del paciente a mesa de entrada". Como el sistema ya contempla la gestión de turnos, cuando el paciente llega a mesa de entrada **ya tiene el turno**; por lo tanto el límite debe correrse hacia atrás, al **pedido del turno**.

- **Desde:** el **pedido del turno**, ya sea:
  - **Turno web** — el paciente lo solicita online, antes de asistir, o
  - **Turno en recepción** — el recepcionista lo gestiona para el paciente que no usa la web.
- **Hasta:** la atención del paciente con el médico, marcada por un **estado del turno** de **Atendido** o **Ausente** (al finalizar el horario del turno).

---

## Alcance

### Incluye (ABM = Alta, Baja, Modificación)

- ABM de Paciente
- ABM de Recepcionista
- ABM de Especialista médico
- ABM de Asignación de turnos
- ABM de Disponibilidad horaria
- ABM de Aranceles
- ABM de Especialidades clínicas
- ABM de Obras Sociales / Prepagas
- ABM de **Facturación normalizada** (cabecera + detalle) — *corrección C3*
- ABM de **Prácticas** (consulta, radiografía, yeso, etc.) — *agregado C4*

### No incluye

- Tratamientos
- Internaciones
- Costos por estudios complejos
- Historia clínica

---

## Correcciones aplicadas (devolución del profesor)

| # | Observación | Resolución |
|---|-------------|-----------|
| **C1** | El *Límite* arrancaba en mesa de entrada. | Se corre al **pedido del turno**; se distingue turno **web** vs. **recepción**. |
| **C2** | El *diagrama de actividad* no tenía condicional en la validación de cobertura, faltaban nodos de finalización y el orden final estaba invertido. | Se agrega el **condicional (Sí/No)** en "Valida cobertura médica", los **círculos de fin** y se corrige el orden: **marca Atendido → atiende al paciente → fin**. |
| **C3** | La *Factura* no estaba normalizada. | Se separa en **Factura Cabecera + Factura Detalle**. |
| **C4** | Faltaba contemplar las **prácticas** (no se factura solo la consulta). | Se agrega la entidad **Práctica**, vinculada al detalle de factura. |
| **C5** | La tabla *Obra Social* estaba incompleta y los nombres de tablas en singular. | Se agregan **CUIT, Domicilio y Condición IVA**; nombres de tablas en **plural**. |
