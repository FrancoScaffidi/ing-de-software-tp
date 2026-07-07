# Guion de presentación oral — Base de datos
### Hospital Argentino · Sistema de Gestión de Turnos y Recepción

> Este guion cubre la parte de **base de datos**. La introducción se apoya en el
> documento de Relevamiento (objetivo, límite y alcance). Cada sección indica
> **[qué mostrar en pantalla]** y debajo el **texto para hablar**.
> Orden sugerido: modelo de datos → diccionario y tablas → API (Swagger).

---

## 0. Transición desde la introducción

*(Después de presentar objetivo, límite y alcance)*

"Habiendo visto el objetivo y el alcance del sistema, pasamos ahora a la parte
técnica: cómo modelamos y guardamos la información. Vamos a mostrar el modelo de
datos, el diccionario de datos con el detalle de cada tabla, y por último la API
con la que la aplicación se comunica con la base."

---

## 1. Modelo de datos — Diagrama de Reverse Engineer

**[Mostrar: la pestaña EER Diagram de MySQL Workbench con las 14 tablas]**

"Este es el modelo físico de la base, obtenido con la ingeniería inversa de
MySQL Workbench sobre la base real. La base se llama `gestion_turnos` y está
compuesta por **14 tablas**, todas con motor **InnoDB**, lo que nos garantiza
**integridad referencial** mediante claves foráneas y soporte de transacciones."

"Organizamos las tablas en tres grupos:"

- **Tablas maestras:** guardan datos estáticos y no dependen de otras. Por
  ejemplo `obras_sociales`, `especialidades`, `medicos`, `recepcionistas` y
  `estados_turnos`.
- **Tablas de asociación y dependencia:** cruzan datos de las maestras para
  crear la lógica de negocio. Por ejemplo `medicos_especialidades` (un médico
  puede tener varias especialidades), `disponibilidades_horarias`, `aranceles`
  y `practicas`.
- **Tablas transaccionales:** registran el movimiento diario. Son `turnos`,
  `recordatorios`, `facturas_cabecera` y `facturas_detalle`.

"Si seguimos las líneas de relación, se ve el circuito completo: un **paciente**
puede tener una **obra social**; saca un **turno** con un **médico** en una
**especialidad** determinada; ese turno tiene un **estado** (atendido, ausente,
etc.), genera un **recordatorio** y da lugar a una **factura**."

**Puntos para destacar mientras se recorre el diagrama:**
- La relación **médico–especialidad** es de muchos a muchos, por eso existe la
  tabla intermedia `medicos_especialidades`.
- `turnos` apunta a `medicos_especialidades`, así queda unívoco el médico y su
  especialidad en cada turno.
- La **factura está normalizada** en `facturas_cabecera` y `facturas_detalle`
  (relación uno a muchos): una factura tiene muchos renglones de detalle.

---

## 2. Diccionario de datos

**[Mostrar: sección "Diccionario de datos" del documento de Relevamiento]**

"El diccionario de datos es la lista que describe cada entidad y sus atributos,
junto con las reglas que deben cumplir. Usamos una notación donde el símbolo
**@** indica la **clave primaria** y **(fk)** una **clave foránea**."

"Por ejemplo, la entidad **Paciente** se define como su identificador, apellido,
nombre, domicilio, mail, teléfono, tipo y número de documento, y una referencia
a la obra social. Y **Turno** se compone del paciente, el médico-especialidad,
la fecha, la hora, el estado y el motivo de consulta."

"El diccionario nos sirvió como puente entre el análisis y la implementación:
de acá salieron directamente las tablas de la base."

---

## 3. Detalle de las tablas

**[Mostrar: sección "Detalle de tablas" del documento de Relevamiento]**

"Para cada tabla documentamos sus campos con el tipo de dato, si es clave
primaria o foránea, y una breve descripción. Algunos puntos destacados:"

- **Claves y unicidad:** cada tabla tiene su clave primaria autoincremental, y
  usamos restricciones **UNIQUE** donde corresponde, por ejemplo la matrícula
  del médico o el legajo del recepcionista.
- **Tipos apropiados:** fechas con `DATE`, horas con `TIME`, importes con
  `DECIMAL(10,2)`, y **ENUM** para valores acotados como el tipo de documento
  (DNI, LE, Pasaporte) o el estado del recordatorio.
- **Paciente particular:** el campo `IdObraSocial` admite valor nulo, lo que
  representa a un paciente **particular**, sin cobertura.
- **Disponibilidad horaria:** guardamos solo la **franja** (hora desde / hora
  hasta) de cada médico, no cada turno posible; los horarios libres se calculan
  restando los turnos ya reservados.

---

## 4. La API — Swagger

**[Mostrar: la interfaz de Swagger en el navegador — localhost:5079/swagger]**

"Para que la aplicación acceda a la base construimos una **API REST**,
documentada automáticamente con **Swagger**. Cada grupo de endpoints corresponde
a una entidad del sistema."

"Los que más usamos en el módulo de recepción son:"

- `GET /api/Turnos/Especialidades` — lista las especialidades.
- `GET /api/Turnos/MedicosPorEspecialidad/{id}` — los médicos de una
  especialidad.
- `GET /api/Turnos/Disponibilidad/{idMedico}/{fecha}` — **calcula los horarios
  disponibles** de un médico en una fecha, en intervalos de 30 minutos,
  descontando los turnos ya reservados.
- `POST /api/Turnos` — reserva el turno y, en la misma operación, genera el
  recordatorio programado 24 horas antes.

"Podemos hacer un *Try it out* en vivo para mostrar cómo la API devuelve, por
ejemplo, los horarios disponibles, y cómo al reservar uno ese horario deja de
aparecer."

---

## 5. Puntos adicionales para mencionar (correcciones y decisiones de diseño)

*(Estos refuerzan que el trabajo fue corregido y llevado a la realidad, que es
lo que valoró el profesor.)*

- **Factura normalizada (corrección C3):** originalmente la factura era una sola
  tabla. La separamos en **cabecera** (datos del comprobante: número, tipo,
  fecha, total, medio de pago) y **detalle** (cada práctica facturada con
  cantidad y precio). Esto evita repetir datos y permite desglosar el
  comprobante.
- **Tabla de prácticas (corrección C4):** agregamos la tabla `practicas` porque
  en la realidad no se factura solo la consulta: un traumatólogo, por ejemplo,
  puede facturar consulta, radiografía y colocación de yeso. Cada renglón del
  detalle de factura referencia una práctica.
- **Obra social completa (C5a):** sumamos **CUIT, domicilio y condición frente
  al IVA**, que son los datos necesarios para poder facturar.
- **Convención de nombres (C5b):** todas las tablas están en **plural** y sin
  tildes ni caracteres especiales, por buenas prácticas y portabilidad.
- **Codificación:** la base usa **utf8mb4**, para soportar correctamente acentos
  y caracteres especiales.
- **Recordatorios:** cada turno genera automáticamente un recordatorio
  programado 24 horas antes, pensado para el envío por WhatsApp.
- **Escalabilidad:** el modelo permite crecer fácilmente. Por ejemplo, sumar una
  especialización a un médico es agregar una fila en `medicos_especialidades`;
  incorporar nuevas prácticas es cargar filas en `practicas`, sin tocar la
  estructura.

---

## 6. Cierre de la parte de base de datos

"En resumen, la base de datos está **normalizada**, respeta la **integridad
referencial**, contempla las **correcciones** que nos marcaron y modela el
circuito real de la clínica: desde el pedido del turno hasta la facturación de
la atención. Sobre esta base se apoya toda la aplicación."

---

### Orden sugerido de pantallas
1. Workbench — diagrama EER (modelo completo).
2. Documento de Relevamiento — diccionario de datos y detalle de tablas.
3. Navegador — Swagger (API) y, si se quiere, la app funcionando.
