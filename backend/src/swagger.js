const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hospital Argentino - API Gestión de Turnos y Recepción',
      version: '1.0.0',
      description:
        'API REST del sistema de gestión de turnos y recepción. ' +
        'Reconstrucción en Node/Express con las correcciones del profesor aplicadas.',
    },
    tags: [
      { name: 'ObrasSociales' },
      { name: 'Pacientes' },
      { name: 'Recordatorios' },
      { name: 'Turnos' },
      { name: 'Facturas' },
      { name: 'Practicas' },
    ],
  },
  // glob requiere barras normales, incluso en Windows
  apis: [path.join(__dirname, 'routes', '*.js').replace(/\\/g, '/')],
};

module.exports = swaggerJsdoc(options);
