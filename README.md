# Hospital Argentino — Sistema de Gestión de Turnos y Recepción

Proyecto de **Análisis de Sistemas / Ingeniería de Software**.
Equipo **O.L.A.** — reconstrucción con las correcciones del profesor aplicadas.

## Qué resuelve
Gestión de turnos y recepción de una clínica. Objetivo: registrar al paciente,
validar cobertura, asignar turno y cobrar aranceles en **menos de 5 minutos**, y
reducir el ausentismo **20% en 3 meses** mediante recordatorios (WhatsApp, 24 hs antes).

**Actores:** Paciente · Recepcionista · Especialista (médico).

## Alcance (ABM = CRUD)
Pacientes, Recepcionistas, Médicos, Asignación de turnos, Disponibilidad horaria,
Aranceles, Especialidades, Obras Sociales/Prepagas, Facturación básica.

**No incluye:** tratamientos, internaciones, estudios complejos, historia clínica.

## Correcciones del profesor aplicadas
| # | Corrección | Estado |
|---|-----------|--------|
| C1 | Redefinir el **límite**: incluir el pedido del turno (web vs. recepción) | ⏳ documentación |
| C2 | **Diagrama de actividad**: condicional en validación de cobertura (Sí/No), nodos de fin, invertir orden "marca atendido" → "atiende paciente" | ⏳ documentación |
| C3 | **Factura normalizada** → `facturas_cabecera` + `facturas_detalle` | ✅ en `db/schema.sql` |
| C4 | Nueva tabla **`practicas`** (consulta + radiografía + yeso, etc.) | ✅ en `db/schema.sql` |
| C5a | `obras_sociales` con **CUIT, Domicilio, Condición IVA** | ✅ en `db/schema.sql` |
| C5b | Nombres de tablas en **plural** (+ sin tildes/ñ) | ✅ en `db/schema.sql` |

## Stack
- **Base de datos:** MySQL (`db/schema.sql`, `db/seed.sql`)
- **Backend:** Node.js + Express + mysql2, documentado con Swagger
- **Frontend:** módulo de Recepción web (HTML/CSS/JS)

## Estructura
```
db/
  schema.sql            Esquema corregido
  seed.sql              Datos de ejemplo
backend/
  package.json
  .env.example
  src/
    server.js           Punto de entrada (API + Swagger + estáticos)
    db.js               Pool MySQL
    swagger.js          Config OpenAPI
    routes/             obrasSociales, pacientes, recordatorios,
                        turnos, practicas, facturas
frontend/
  index.html            Módulo de recepción
  style.css
  app.js
```

## Endpoints principales (Swagger en /swagger)
- `GET|POST /api/ObrasSociales`
- `GET|POST /api/Pacientes`
- `GET /api/Recordatorios`
- `GET|POST /api/Turnos`
- `GET /api/Turnos/Especialidades`
- `GET /api/Turnos/MedicosPorEspecialidad/{idEspecialidad}`
- `GET /api/Turnos/Disponibilidad/{idMedico}/{fecha}`
- `GET /api/Practicas` · `GET|POST /api/Facturas` *(facturación, agregado)*

## Puesta en marcha

### 1. Base de datos
> Importante: usar `--default-character-set=utf8mb4` para que las tildes se
> importen bien (el cliente mysql en Windows usa cp850 por defecto y corrompe
> los acentos).
```bash
mysql --default-character-set=utf8mb4 -u root -p < db/schema.sql
mysql --default-character-set=utf8mb4 -u root -p < db/seed.sql
```

### 2. Backend + Frontend
```bash
cd backend
copy .env.example .env      # (Windows) y completá tu password de MySQL
npm install
npm start
```
Luego abrí:
- App: http://localhost:5079/
- Swagger: http://localhost:5079/swagger

> La disponibilidad de horarios se calcula sobre la **franja** del médico
> restando los turnos ya reservados (según indicación del profesor).
> Al confirmar un turno se genera automáticamente el **recordatorio** (24 hs antes).
