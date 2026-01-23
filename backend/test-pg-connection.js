const { Pool } = require('pg');
const { execSync } = require('child_process');

const PG_CTL = '/Applications/Postgres.app/Contents/Versions/latest/bin/pg_ctl';
const DATA_DIR = '/Users/harry/Library/Application Support/Postgres/var-17';

// Reload PostgreSQL
console.log('Reloading PostgreSQL configuration...');
try {
  const result = execSync(`"${PG_CTL}" reload -D "${DATA_DIR}" 2>&1`, { encoding: 'utf8' });
  console.log('Reload result:', result.trim());
} catch (err) {
  console.log('Reload error:', err.message);
}

// Wait a moment
setTimeout(async () => {
  console.log('\nTesting PostgreSQL connection...');

  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'harry',
    password: ''  // Empty password for trust auth
  });

  try {
    const res = await pool.query('SELECT current_user, current_database()');
    console.log('SUCCESS:', res.rows[0]);

    // List databases
    const dbs = await pool.query("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname");
    console.log('Available databases:', dbs.rows.map(r => r.datname).join(', '));

    await pool.end();
  } catch (err) {
    console.log('Connection failed:', err.message);

    // Check if it's still the auth_permission_dialog issue
    if (err.message.includes('trust') || err.message.includes('permission')) {
      console.log('\nThe auth_permission_dialog extension is blocking connections.');
      console.log('This is a security feature of Postgres.app that requires manual interaction.');
    }

    await pool.end();
  }
}, 1000);
