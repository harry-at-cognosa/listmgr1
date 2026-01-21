const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'listmgr',
  password: 'postgres',
  port: 5432,
});

async function checkSections() {
  const client = await pool.connect();
  try {
    // Get sections for template 29
    const result = await client.query(
      'SELECT plsqts_id, plsqts_sequence, plsqts_status FROM plsqt_sections WHERE plsqt_id = $1 ORDER BY plsqts_sequence',
      [29]
    );
    console.log('Sections for template 29 BEFORE deletion:');
    console.log(JSON.stringify(result.rows, null, 2));
    console.log('Total sections:', result.rows.length);
  } finally {
    client.release();
    pool.end();
  }
}

checkSections();
