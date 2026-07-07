-- ============================================================================
--  Datos de ejemplo para pruebas — Hospital Argentino
--  Ejecutar DESPUÉS de schema.sql
-- ============================================================================
USE gestion_turnos;

-- Obras sociales (con datos de facturación completos - C5a)
INSERT INTO obras_sociales (NombreObraSocial, Cuit, Domicilio, CondicionIva) VALUES
  ('OSDE',           '30-54741769-4', 'Av. Corrientes 1234, CABA', 'Responsable Inscripto'),
  ('Swiss Medical',  '30-58358520-3', 'Av. del Libertador 5678, CABA', 'Responsable Inscripto'),
  ('IOMA',           '30-99900000-1', 'Calle 46 esq. 12, La Plata', 'Exento');

-- Especialidades
INSERT INTO especialidades (NombreEspecialidad) VALUES
  ('Clínica Médica'),       -- 1
  ('Traumatología'),        -- 2
  ('Cardiología'),          -- 3
  ('Pediatría');            -- 4

-- Estados de turno
INSERT INTO estados_turnos (Descripcion) VALUES
  ('Pendiente'),   -- 1
  ('Confirmado'),  -- 2
  ('Atendido'),    -- 3
  ('Ausente'),     -- 4
  ('Cancelado');   -- 5

-- Recepcionistas
INSERT INTO recepcionistas (Nombre, Apellido, Legajo) VALUES
  ('Laura', 'Gómez', 'REC-001'),
  ('Diego', 'Pérez', 'REC-002');

-- Médicos
INSERT INTO medicos (Apellido, Nombre, Matricula, Telefono, Mail) VALUES
  ('Maidana',  'Maximiliano', 'MP-10234', '1150001111', 'mmaidana@clinica.com'), -- 1
  ('Suárez',   'Carla',       'MP-20567', '1150002222', 'csuarez@clinica.com'),  -- 2
  ('Rossi',    'Andrés',      'MP-30890', '1150003333', 'arossi@clinica.com');   -- 3

-- Médico - Especialidad
INSERT INTO medicos_especialidades (IdMedico, IdEspecialidad) VALUES
  (1, 1),  -- Maidana - Clínica Médica     => IdMedicoEspecialidad 1
  (2, 2),  -- Suárez  - Traumatología      => 2
  (3, 3),  -- Rossi   - Cardiología        => 3
  (1, 4);  -- Maidana - Pediatría          => 4

-- Aranceles (consulta) por especialidad, con y sin cobertura
INSERT INTO aranceles (IdEspecialidad, ConCobertura, Monto) VALUES
  (1, 1, 3000.00), (1, 0, 8000.00),   -- Clínica Médica
  (2, 1, 4500.00), (2, 0, 12000.00),  -- Traumatología
  (3, 1, 5000.00), (3, 0, 13000.00),  -- Cardiología
  (4, 1, 3500.00), (4, 0, 9000.00);   -- Pediatría

-- Prácticas (C4) - lo facturable además de la consulta
INSERT INTO practicas (IdEspecialidad, NombrePractica, Honorario) VALUES
  (1, 'Consulta Clínica Médica', 3000.00),
  (2, 'Consulta Traumatología',  4500.00),
  (2, 'Radiografía',             6000.00),
  (2, 'Colocación de yeso',      8000.00),
  (2, 'Vendaje funcional',       3500.00),
  (3, 'Consulta Cardiología',    5000.00),
  (3, 'Electrocardiograma',      7000.00);

-- Disponibilidad horaria (franjas) - se guarda solo la franja.
-- Se genera para los próximos 15 días (relativo a la fecha actual) para que
-- siempre haya turnos disponibles al probar el sistema.
INSERT INTO disponibilidades_horarias (IdMedico, Fecha, HoraDesde, HoraHasta, Disponible)
SELECT x.IdMedico, CURDATE() + INTERVAL n.num DAY, x.hd, x.hh, 1
FROM (SELECT 0 num UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
      UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
      UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14) n
CROSS JOIN (SELECT 1 IdMedico, '09:00:00' hd, '13:00:00' hh
            UNION ALL SELECT 2, '14:00:00', '18:00:00'
            UNION ALL SELECT 3, '10:00:00', '14:00:00') x;

-- Pacientes (uno con obra social, uno particular)
INSERT INTO pacientes (Apellido, Nombre, Domicilio, Mail, Telefono, TipoDoc, NumeroDoc, IdObraSocial) VALUES
  ('Fernández', 'Martín', 'San Martín 100', 'mfernandez@mail.com', '1160006666', 'DNI', '30111222', 1),
  ('González',  'Juan',   'Belgrano 250',   'jgonzalez@mail.com',  '1160007777', 'DNI', '28999888', NULL);
