const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'listmgr1',
  user: 'harry'
});

async function fixColumns() {
  console.log('Fixing datetime column lengths...');

  const tables = ['users', 'currency', 'country', 'product_cat', 'product_line', 'plsqts_type', 'plsq_templates', 'plsqt_sections'];

  for (const table of tables) {
    try {
      await pool.query(`ALTER TABLE ${table} ALTER COLUMN last_update_datetime TYPE VARCHAR(20)`);
      console.log(`  - ${table}.last_update_datetime updated`);
    } catch (err) {
      console.log(`  - ${table}.last_update_datetime: ${err.message}`);
    }
  }

  // Also fix status_datetime for templates and sections
  try {
    await pool.query('ALTER TABLE plsq_templates ALTER COLUMN status_datetime TYPE VARCHAR(20)');
    console.log('  - plsq_templates.status_datetime updated');
  } catch (err) {
    console.log(`  - plsq_templates.status_datetime: ${err.message}`);
  }

  try {
    await pool.query('ALTER TABLE plsqt_sections ALTER COLUMN status_datetime TYPE VARCHAR(20)');
    console.log('  - plsqt_sections.status_datetime updated');
  } catch (err) {
    console.log(`  - plsqt_sections.status_datetime: ${err.message}`);
  }

  console.log('\nDone!');
  await pool.end();
}

fixColumns();
