const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * @swagger
 * /api/Recordatorios:
 *   get:
 *     tags: [Recordatorios]
 *     summary: Lista los recordatorios (envío 24 hs antes del turno)
 *     responses:
 *       200: { description: OK }
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.IdRecordatorio, r.IdTurno, r.FechaEnvio, r.Estado, r.Telefono,
              t.Fecha AS FechaTurno, t.Hora AS HoraTurno,
              CONCAT(p.Apellido, ', ', p.Nombre) AS Paciente
         FROM recordatorios r
         JOIN turnos t    ON t.IdTurno = r.IdTurno
         JOIN pacientes p ON p.IdPaciente = t.IdPaciente
        ORDER BY r.FechaEnvio`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
