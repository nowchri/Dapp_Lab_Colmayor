const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/Bd_laboratorio' });
pool.query('SELECT COUNT(*) FROM perfiles', (err, res) => {
  if (err) { console.error('ERROR:', err.message); process.exit(1); }
  console.log('PostgreSQL OK —', res.rows[0].count, 'perfiles');
  pool.end();
});
