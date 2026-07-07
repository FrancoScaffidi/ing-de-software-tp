require('dotenv').config();
const express = require('express');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const app = express();
app.use(express.json());

// -------- Rutas de la API (mismos nombres que el Swagger original) ----------
app.use('/api/ObrasSociales', require('./routes/obrasSociales'));
app.use('/api/Pacientes', require('./routes/pacientes'));
app.use('/api/Recordatorios', require('./routes/recordatorios'));
app.use('/api/Turnos', require('./routes/turnos'));
app.use('/api/Facturas', require('./routes/facturas'));
app.use('/api/Practicas', require('./routes/practicas'));

// -------- Documentación Swagger --------
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// -------- Frontend (módulo de recepción) --------
app.use('/', express.static(path.join(__dirname, '..', '..', 'frontend')));

const PORT = process.env.PORT || 5079;
app.listen(PORT, () => {
  console.log(`\n  Hospital Argentino - servidor iniciado`);
  console.log(`  App:     http://localhost:${PORT}/`);
  console.log(`  Swagger: http://localhost:${PORT}/swagger\n`);
});
