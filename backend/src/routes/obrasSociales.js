const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * @swagger
 * /api/ObrasSociales:
 *   get:
 *     tags: [ObrasSociales]
 *     summary: Lista las obras sociales / prepagas
 *     responses:
 *       200: { description: OK }
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT IdObraSocial, NombreObraSocial, Cuit, Domicilio, CondicionIva ' +
      'FROM obras_sociales ORDER BY NombreObraSocial'
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @swagger
 * /api/ObrasSociales:
 *   post:
 *     tags: [ObrasSociales]
 *     summary: Crea una obra social (con datos de facturación - corrección C5a)
 *     responses:
 *       201: { description: Creada }
 */
router.post('/', async (req, res) => {
  const { NombreObraSocial, Cuit, Domicilio, CondicionIva } = req.body;
  if (!NombreObraSocial || !Cuit) {
    return res.status(400).json({ error: 'NombreObraSocial y Cuit son obligatorios' });
  }
  try {
    const [r] = await pool.query(
      'INSERT INTO obras_sociales (NombreObraSocial, Cuit, Domicilio, CondicionIva) VALUES (?,?,?,?)',
      [NombreObraSocial, Cuit, Domicilio || null, CondicionIva || 'Responsable Inscripto']
    );
    res.status(201).json({ IdObraSocial: r.insertId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
