require('dotenv').config();
const mysql = require('mysql2/promise');

// Pool de conexiones a MySQL.
// dateStrings: true -> DATE/TIME/DATETIME se devuelven como texto ('2026-07-08',
// '09:30:00'), lo que simplifica el cálculo de disponibilidad y el render.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gestion_turnos',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  charset: 'utf8mb4',
});

module.exports = pool;
