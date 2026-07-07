const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * @swagger
 * /api/Facturas:
 *   get:
 *     tags: [Facturas]
 *     summary: Lista las facturas (cabecera)
 *     responses:
 *       200: { description: OK }
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.IdFactura, f.IdTurno, f.TipoFactura, f.Fecha, f.MontoTotal, f.MedioPago,
              CONCAT(p.Apellido, ', ', p.Nombre) AS Paciente,
              o.NombreObraSocial
         FROM facturas_cabecera f
         JOIN turnos t    ON t.IdTurno = f.IdTurno
         JOIN pacientes p ON p.IdPaciente = t.IdPaciente
         LEFT JOIN obras_sociales o ON o.IdObraSocial = f.IdObraSocial
        ORDER BY f.Fecha DESC`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @swagger
 * /api/Facturas/{id}:
 *   get:
 *     tags: [Facturas]
 *     summary: Devuelve una factura con su detalle
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 *       404: { description: No encontrada }
 */
router.get('/:id', async (req, res) => {
  try {
    const [[cab]] = await pool.query(
      'SELECT * FROM facturas_cabecera WHERE IdFactura = ?', [req.params.id]
    );
    if (!cab) return res.status(404).json({ error: 'Factura no encontrada' });
    const [detalle] = await pool.query(
      `SELECT d.IdFacturaDetalle, d.IdPractica, pr.NombrePractica,
              d.Cantidad, d.PrecioUnitario, d.PrecioTotal
         FROM facturas_detalle d
         JOIN practicas pr ON pr.IdPractica = d.IdPractica
        WHERE d.IdFactura = ?`,
      [req.params.id]
    );
    res.json({ ...cab, detalle });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @swagger
 * /api/Facturas:
 *   post:
 *     tags: [Facturas]
 *     summary: Genera una factura normalizada (cabecera + detalle de prácticas)
 *     description: >
 *       Corrección C3+C4. El cuerpo incluye el turno, la recepcionista, medio de
 *       pago y un arreglo 'detalle' con { IdPractica, Cantidad }. Los precios se
 *       toman del honorario de cada práctica y el total se calcula en el servidor.
 *     responses:
 *       201: { description: Factura generada }
 *       400: { description: Datos inválidos }
 */
router.post('/', async (req, res) => {
  const { IdTurno, IdRecepcionista, IdObraSocial, TipoFactura, MedioPago, detalle } = req.body;
  if (!IdTurno || !IdRecepcionista || !Array.isArray(detalle) || detalle.length === 0) {
    return res.status(400).json({ error: 'IdTurno, IdRecepcionista y al menos un ítem en detalle son obligatorios' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Cabecera (monto se recalcula luego)
    const [cab] = await conn.query(
      `INSERT INTO facturas_cabecera
         (IdTurno, IdRecepcionista, IdObraSocial, TipoFactura, Fecha, MontoTotal, MedioPago)
       VALUES (?,?,?,?, NOW(), 0, ?)`,
      [IdTurno, IdRecepcionista, IdObraSocial || null, TipoFactura || 'B', MedioPago || null]
    );
    const idFactura = cab.insertId;

    let total = 0;
    for (const item of detalle) {
      const cantidad = parseInt(item.Cantidad || 1, 10);
      const [[pr]] = await conn.query(
        'SELECT Honorario FROM practicas WHERE IdPractica = ?', [item.IdPractica]
      );
      if (!pr) throw new Error('Práctica inexistente: ' + item.IdPractica);
      const precioTotal = Number(pr.Honorario) * cantidad;
      total += precioTotal;
      await conn.query(
        `INSERT INTO facturas_detalle
           (IdFactura, IdPractica, Cantidad, PrecioUnitario, PrecioTotal)
         VALUES (?,?,?,?,?)`,
        [idFactura, item.IdPractica, cantidad, pr.Honorario, precioTotal]
      );
    }

    await conn.query(
      'UPDATE facturas_cabecera SET MontoTotal = ? WHERE IdFactura = ?',
      [total, idFactura]
    );

    await conn.commit();
    res.status(201).json({ IdFactura: idFactura, MontoTotal: total });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
