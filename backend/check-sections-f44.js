const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'listmgr',
  password: 'postgres',
  port: 5432,
});

pool.query('SELECT plsqts_id, plsqts_sequence FROM plsqt_sections WHERE plsqt_id = 29')
  .then(r => {
    console.log('Sections for template 29:', JSON.stringify(r.rows));
    pool.end();
  });
