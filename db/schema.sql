-- ============================================================================
--  HOSPITAL ARGENTINO — Sistema de Gestión de Turnos y Recepción
--  Esquema de base de datos (versión CORREGIDA según devolución del profesor)
--
--  Correcciones aplicadas respecto de la versión presentada:
--   C3) Factura NORMALIZADA -> facturas_cabecera + facturas_detalle.
--   C4) Nueva tabla practicas (además de la consulta) para poder desglosar
--       lo que realmente se factura (ej: traumatólogo = consulta + radiografía
--       + yeso). El detalle de factura referencia prácticas.
--   C5a) obras_sociales completa: Cuit, Domicilio y CondicionIva
--        (a quién y cómo se factura).
--   C5b) Nombres de tablas en PLURAL (convención).
--   Extra) Identificadores sin tildes/ñ (Medico, Telefono, Matricula...).
--   Unificación) turnos referencia IdMedicoEspecialidad (más normalizado),
--        resolviendo la discrepancia diccionario vs. DER.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS gestion_turnos
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gestion_turnos;

-- ============================================================================
-- 1. TABLAS MAESTRAS (sin dependencias / claves foráneas)
-- ============================================================================

CREATE TABLE obras_sociales (
    IdObraSocial     INT AUTO_INCREMENT,
    NombreObraSocial VARCHAR(100) NOT NULL,
    Cuit             VARCHAR(13)  NOT NULL,                 -- C5a
    Domicilio        VARCHAR(150),                          -- C5a
    CondicionIva     ENUM('Responsable Inscripto',
                          'Monotributo',
                          'Consumidor Final',
                          'Exento') NOT NULL
                          DEFAULT 'Responsable Inscripto',  -- C5a
    PRIMARY KEY (IdObraSocial),
    UNIQUE KEY uq_obrasocial_cuit (Cuit)
) ENGINE=InnoDB;

CREATE TABLE recepcionistas (
    IdRecepcionista INT AUTO_INCREMENT,
    Nombre          VARCHAR(50) NOT NULL,
    Apellido        VARCHAR(50) NOT NULL,
    Legajo          VARCHAR(20) NOT NULL UNIQUE,
    PRIMARY KEY (IdRecepcionista)
) ENGINE=InnoDB;

CREATE TABLE medicos (
    IdMedico   INT AUTO_INCREMENT,
    Apellido   VARCHAR(50) NOT NULL,
    Nombre     VARCHAR(50) NOT NULL,
    Matricula  VARCHAR(30) NOT NULL UNIQUE,
    Telefono   VARCHAR(20),
    Mail       VARCHAR(100),
    PRIMARY KEY (IdMedico)
) ENGINE=InnoDB;

CREATE TABLE especialidades (
    IdEspecialidad     INT AUTO_INCREMENT,
    NombreEspecialidad VARCHAR(100) NOT NULL,
    PRIMARY KEY (IdEspecialidad)
) ENGINE=InnoDB;

CREATE TABLE estados_turnos (
    IdEstadoTurno INT AUTO_INCREMENT,
    Descripcion   VARCHAR(50) NOT NULL,   -- Pendiente / Confirmado / Atendido / Ausente / Cancelado
    PRIMARY KEY (IdEstadoTurno)
) ENGINE=InnoDB;

-- ============================================================================
-- 2. TABLAS CON DEPENDENCIAS SIMPLES Y DE ASOCIACIÓN
-- ============================================================================

CREATE TABLE pacientes (
    IdPaciente   INT AUTO_INCREMENT,
    Apellido     VARCHAR(50) NOT NULL,
    Nombre       VARCHAR(50) NOT NULL,
    Domicilio    VARCHAR(100),
    Mail         VARCHAR(100),
    Telefono     VARCHAR(20),
    TipoDoc      ENUM('DNI','LE','PASAPORTE') NOT NULL,
    NumeroDoc    VARCHAR(20) NOT NULL,
    IdObraSocial INT NULL,   -- NULL = paciente particular (sin obra social)
    PRIMARY KEY (IdPaciente),
    UNIQUE KEY uq_paciente_doc (TipoDoc, NumeroDoc),
    CONSTRAINT fk_paciente_obrasocial
        FOREIGN KEY (IdObraSocial) REFERENCES obras_sociales (IdObraSocial)
) ENGINE=InnoDB;

CREATE TABLE medicos_especialidades (
    IdMedicoEspecialidad INT AUTO_INCREMENT,
    IdMedico             INT NOT NULL,
    IdEspecialidad       INT NOT NULL,
    PRIMARY KEY (IdMedicoEspecialidad),
    UNIQUE KEY uq_medico_especialidad (IdMedico, IdEspecialidad),
    CONSTRAINT fk_me_medico
        FOREIGN KEY (IdMedico) REFERENCES medicos (IdMedico),
    CONSTRAINT fk_me_especialidad
        FOREIGN KEY (IdEspecialidad) REFERENCES especialidades (IdEspecialidad)
) ENGINE=InnoDB;

CREATE TABLE disponibilidades_horarias (
    IdDisponibilidad INT AUTO_INCREMENT,
    IdMedico         INT NOT NULL,
    Fecha            DATE NOT NULL,
    HoraDesde        TIME NOT NULL,
    HoraHasta        TIME NOT NULL,
    Disponible       TINYINT(1) NOT NULL DEFAULT 1,  -- se guarda solo la franja
    PRIMARY KEY (IdDisponibilidad),
    CONSTRAINT fk_disp_medico
        FOREIGN KEY (IdMedico) REFERENCES medicos (IdMedico),
    CONSTRAINT chk_disp_horas CHECK (HoraHasta > HoraDesde)
) ENGINE=InnoDB;

-- Arancel = precio de la CONSULTA por especialidad, con o sin cobertura
CREATE TABLE aranceles (
    IdArancel      INT AUTO_INCREMENT,
    IdEspecialidad INT NOT NULL,
    ConCobertura   TINYINT(1) NOT NULL DEFAULT 0,  -- 1 = con obra social / 0 = particular
    Monto          DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (IdArancel),
    UNIQUE KEY uq_arancel (IdEspecialidad, ConCobertura),
    CONSTRAINT fk_arancel_especialidad
        FOREIGN KEY (IdEspecialidad) REFERENCES especialidades (IdEspecialidad)
) ENGINE=InnoDB;

-- C4) Prácticas: catálogo de lo que puede facturarse además/dentro de la
--     atención (consulta, radiografía, yeso, vendaje, etc.). Se vincula a una
--     especialidad; en el detalle de factura se registra la práctica realizada.
CREATE TABLE practicas (
    IdPractica     INT AUTO_INCREMENT,
    IdEspecialidad INT NOT NULL,
    NombrePractica VARCHAR(100) NOT NULL,
    Honorario      DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (IdPractica),
    CONSTRAINT fk_practica_especialidad
        FOREIGN KEY (IdEspecialidad) REFERENCES especialidades (IdEspecialidad)
) ENGINE=InnoDB;

-- ============================================================================
-- 3. TABLAS TRANSACCIONALES
-- ============================================================================

CREATE TABLE turnos (
    IdTurno              INT AUTO_INCREMENT,
    IdPaciente           INT NOT NULL,
    IdMedicoEspecialidad INT NOT NULL,   -- unificado (médico + especialidad)
    Fecha                DATE NOT NULL,
    Hora                 TIME NOT NULL,
    IdEstadoTurno        INT NOT NULL,
    Motivo               VARCHAR(255),
    PRIMARY KEY (IdTurno),
    CONSTRAINT fk_turno_paciente
        FOREIGN KEY (IdPaciente) REFERENCES pacientes (IdPaciente),
    CONSTRAINT fk_turno_medesp
        FOREIGN KEY (IdMedicoEspecialidad)
        REFERENCES medicos_especialidades (IdMedicoEspecialidad),
    CONSTRAINT fk_turno_estado
        FOREIGN KEY (IdEstadoTurno) REFERENCES estados_turnos (IdEstadoTurno)
) ENGINE=InnoDB;

CREATE TABLE recordatorios (
    IdRecordatorio INT AUTO_INCREMENT,
    IdTurno        INT NOT NULL,
    FechaEnvio     DATETIME NOT NULL,
    Estado         ENUM('Pendiente','Enviado') NOT NULL DEFAULT 'Pendiente',
    Telefono       VARCHAR(20),
    PRIMARY KEY (IdRecordatorio),
    CONSTRAINT fk_recordatorio_turno
        FOREIGN KEY (IdTurno) REFERENCES turnos (IdTurno)
) ENGINE=InnoDB;

-- C3) Factura normalizada: CABECERA + DETALLE
CREATE TABLE facturas_cabecera (
    IdFactura       INT AUTO_INCREMENT,
    IdTurno         INT NOT NULL,
    IdRecepcionista INT NOT NULL,
    IdObraSocial    INT NULL,          -- a quién se factura (NULL = particular)
    TipoFactura     ENUM('A','B','C') NOT NULL DEFAULT 'B',
    Fecha           DATETIME NOT NULL,
    MontoTotal      DECIMAL(10,2) NOT NULL DEFAULT 0,
    MedioPago       VARCHAR(50),
    PRIMARY KEY (IdFactura),
    CONSTRAINT fk_factura_turno
        FOREIGN KEY (IdTurno) REFERENCES turnos (IdTurno),
    CONSTRAINT fk_factura_recepcionista
        FOREIGN KEY (IdRecepcionista) REFERENCES recepcionistas (IdRecepcionista),
    CONSTRAINT fk_factura_obrasocial
        FOREIGN KEY (IdObraSocial) REFERENCES obras_sociales (IdObraSocial)
) ENGINE=InnoDB;

CREATE TABLE facturas_detalle (
    IdFacturaDetalle INT AUTO_INCREMENT,
    IdFactura        INT NOT NULL,
    IdPractica       INT NOT NULL,          -- qué práctica/consulta se factura
    Cantidad         INT NOT NULL DEFAULT 1,
    PrecioUnitario   DECIMAL(10,2) NOT NULL,
    PrecioTotal      DECIMAL(10,2) NOT NULL,  -- Cantidad * PrecioUnitario
    PRIMARY KEY (IdFacturaDetalle),
    CONSTRAINT fk_detalle_factura
        FOREIGN KEY (IdFactura) REFERENCES facturas_cabecera (IdFactura),
    CONSTRAINT fk_detalle_practica
        FOREIGN KEY (IdPractica) REFERENCES practicas (IdPractica)
) ENGINE=InnoDB;
