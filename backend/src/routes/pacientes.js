const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * @swagger
 * /api/Pacientes:
 *   get:
 *     tags: [Pacientes]
 *     summary: Lista los pacientes registrados
 *     responses:
 *       200: { description: OK }
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.IdPaciente, p.Nombre, p.Apellido, p.TipoDoc, p.NumeroDoc,
              p.Mail, p.Telefono, p.Domicilio, p.IdObraSocial,
              o.NombreObraSocial
         FROM pacientes p
         LEFT JOIN obras_sociales o ON o.IdObraSocial = p.IdObraSocial
        ORDER BY p.Apellido, p.Nombre`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @swagger
 * /api/Pacientes:
 *   post:
 *     tags: [Pacientes]
 *     summary: Registra un paciente (particular o con obra social)
 *     responses:
 *       201: { description: Creado }
 */
router.post('/', async (req, res) => {
  const { Nombre, Apellido, TipoDoc, NumeroDoc, Mail, Domicilio, Telefono, IdObraSocial } = req.body;
  if (!Nombre || !Apellido || !TipoDoc || !NumeroDoc) {
    return res.status(400).json({ error: 'Nombre, Apellido, TipoDoc y NumeroDoc son obligatorios' });
  }
  try {
    const [r] = await pool.query(
      `INSERT INTO pacientes
         (Apellido, Nombre, Domicilio, Mail, Telefono, TipoDoc, NumeroDoc, IdObraSocial)
       VALUES (?,?,?,?,?,?,?,?)`,
      [Apellido, Nombre, Domicilio || null, Mail || null, Telefono || null,
       TipoDoc, NumeroDoc, IdObraSocial || null]
    );
    res.status(201).json({ IdPaciente: r.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe un paciente con ese documento' });
    }
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
