const express = require('express');
const router = express.Router();
const pool = require('../db');

const DURACION = parseInt(process.env.DURACION_TURNO_MIN || '30', 10);

/**
 * @swagger
 * /api/Turnos:
 *   get:
 *     tags: [Turnos]
 *     summary: Lista los turnos con paciente, médico, especialidad y estado
 *     responses:
 *       200: { description: OK }
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.IdTurno, t.Fecha, t.Hora, t.Motivo,
              p.IdPaciente, CONCAT(p.Apellido, ', ', p.Nombre) AS Paciente,
              m.IdMedico, CONCAT(m.Apellido, ', ', m.Nombre) AS Medico,
              e.IdEspecialidad, e.NombreEspecialidad AS Especialidad,
              et.Descripcion AS Estado
         FROM turnos t
         JOIN pacientes p              ON p.IdPaciente = t.IdPaciente
         JOIN medicos_especialidades me ON me.IdMedicoEspecialidad = t.IdMedicoEspecialidad
         JOIN medicos m                ON m.IdMedico = me.IdMedico
         JOIN especialidades e         ON e.IdEspecialidad = me.IdEspecialidad
         JOIN estados_turnos et        ON et.IdEstadoTurno = t.IdEstadoTurno
        ORDER BY t.Fecha, t.Hora`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @swagger
 * /api/Turnos/Especialidades:
 *   get:
 *     tags: [Turnos]
 *     summary: Lista las especialidades clínicas
 *     responses:
 *       200: { description: OK }
 */
router.get('/Especialidades', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT IdEspecialidad, NombreEspecialidad FROM especialidades ORDER BY NombreEspecialidad'
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @swagger
 * /api/Turnos/MedicosPorEspecialidad/{idEspecialidad}:
 *   get:
 *     tags: [Turnos]
 *     summary: Médicos que atienden una especialidad
 *     parameters:
 *       - in: path
 *         name: idEspecialidad
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 */
router.get('/MedicosPorEspecialidad/:idEspecialidad', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT me.IdMedicoEspecialidad, m.IdMedico, m.Nombre, m.Apellido
         FROM medicos_especialidades me
         JOIN medicos m ON m.IdMedico = me.IdMedico
        WHERE me.IdEspecialidad = ?
        ORDER BY m.Apellido, m.Nombre`,
      [req.params.idEspecialidad]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @swagger
 * /api/Turnos/Disponibilidad/{idMedico}/{fecha}:
 *   get:
 *     tags: [Turnos]
 *     summary: Horarios disponibles de un médico en una fecha (franja - reservados)
 *     parameters:
 *       - in: path
 *         name: idMedico
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: fecha
 *         required: true
 *         schema: { type: string, example: '2026-07-08' }
 *     responses:
 *       200: { description: Lista de horarios 'HH:MM' disponibles }
 */
router.get('/Disponibilidad/:idMedico/:fecha', async (req, res) => {
  const { idMedico, fecha } = req.params;
  try {
    // Se guarda solo la FRANJA horaria (corrección/indicación del profesor);
    // los horarios se calculan restando los turnos ya reservados.
    const [franjas] = await pool.query(
      `SELECT HoraDesde, HoraHasta FROM disponibilidades_horarias
        WHERE IdMedico = ? AND Fecha = ? AND Disponible = 1`,
      [idMedico, fecha]
    );

    const [reservados] = await pool.query(
      `SELECT t.Hora
         FROM turnos t
         JOIN medicos_especialidades me ON me.IdMedicoEspecialidad = t.IdMedicoEspecialidad
         JOIN estados_turnos et ON et.IdEstadoTurno = t.IdEstadoTurno
        WHERE me.IdMedico = ? AND t.Fecha = ? AND et.Descripcion <> 'Cancelado'`,
      [idMedico, fecha]
    );
    const ocupados = new Set(reservados.map((r) => r.Hora.slice(0, 5)));

    const slots = [];
    for (const f of franjas) {
      const [hd, md] = f.HoraDesde.split(':').map(Number);
      const [hh, mh] = f.HoraHasta.split(':').map(Number);
      let cur = hd * 60 + md;
      const fin = hh * 60 + mh;
      while (cur + DURACION <= fin) {
        const label =
          String(Math.floor(cur / 60)).padStart(2, '0') + ':' +
          String(cur % 60).padStart(2, '0');
        if (!ocupados.has(label)) slots.push(label);
        cur += DURACION;
      }
    }
    res.json(slots);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @swagger
 * /api/Turnos:
 *   post:
 *     tags: [Turnos]
 *     summary: Reserva un turno y genera el recordatorio (24 hs antes)
 *     responses:
 *       201: { description: Turno confirmado }
 *       409: { description: Horario no disponible }
 */
router.post('/', async (req, res) => {
  const { IdPaciente, IdMedicoEspecialidad, Fecha, Hora, Motivo } = req.body;
  if (!IdPaciente || !IdMedicoEspecialidad || !Fecha || !Hora) {
    return res.status(400).json({ error: 'IdPaciente, IdMedicoEspecialidad, Fecha y Hora son obligatorios' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Evitar doble reserva del mismo médico en ese día/hora
    const [dup] = await conn.query(
      `SELECT t.IdTurno
         FROM turnos t
         JOIN medicos_especialidades me  ON me.IdMedicoEspecialidad = t.IdMedicoEspecialidad
         JOIN medicos_especialidades me2 ON me2.IdMedicoEspecialidad = ?
         JOIN estados_turnos et ON et.IdEstadoTurno = t.IdEstadoTurno
        WHERE me.IdMedico = me2.IdMedico AND t.Fecha = ? AND t.Hora = ?
          AND et.Descripcion <> 'Cancelado'`,
      [IdMedicoEspecialidad, Fecha, Hora]
    );
    if (dup.length) {
      await conn.rollback();
      return res.status(409).json({ error: 'Ese horario ya no está disponible' });
    }

    const [ins] = await conn.query(
      `INSERT INTO turnos (IdPaciente, IdMedicoEspecialidad, Fecha, Hora, IdEstadoTurno, Motivo)
       VALUES (?,?,?,?, (SELECT IdEstadoTurno FROM estados_turnos WHERE Descripcion='Confirmado' LIMIT 1), ?)`,
      [IdPaciente, IdMedicoEspecialidad, Fecha, Hora, Motivo || null]
    );
    const idTurno = ins.insertId;

    // Recordatorio: se programa 24 hs antes del turno
    const [pac] = await conn.query('SELECT Telefono FROM pacientes WHERE IdPaciente = ?', [IdPaciente]);
    await conn.query(
      `INSERT INTO recordatorios (IdTurno, FechaEnvio, Estado, Telefono)
       VALUES (?, DATE_SUB(CONCAT(?, ' ', ?), INTERVAL 24 HOUR), 'Pendiente', ?)`,
      [idTurno, Fecha, Hora, pac[0] ? pac[0].Telefono : null]
    );

    await conn.commit();
    res.status(201).json({ IdTurno: idTurno, mensaje: 'Turno confirmado' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
