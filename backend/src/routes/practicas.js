const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * @swagger
 * /api/Practicas:
 *   get:
 *     tags: [Practicas]
 *     summary: Catálogo de prácticas (corrección C4). Filtrable por especialidad.
 *     parameters:
 *       - in: query
 *         name: idEspecialidad
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 */
router.get('/', async (req, res) => {
  try {
    const { idEspecialidad } = req.query;
    let sql =
      `SELECT pr.IdPractica, pr.NombrePractica, pr.Honorario,
              pr.IdEspecialidad, e.NombreEspecialidad
         FROM practicas pr
         JOIN especialidades e ON e.IdEspecialidad = pr.IdEspecialidad`;
    const params = [];
    if (idEspecialidad) {
      sql += ' WHERE pr.IdEspecialidad = ?';
      params.push(idEspecialidad);
    }
    sql += ' ORDER BY e.NombreEspecialidad, pr.NombrePractica';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
