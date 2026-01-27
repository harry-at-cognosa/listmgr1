// Check and seed app_settings table
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'listmgr1',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

async function main() {
  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'app_settings'
      );
    `);

    console.log('Table exists:', tableCheck.rows[0].exists);

    if (!tableCheck.rows[0].exists) {
      console.log('Creating app_settings table...');
      await pool.query(`
        CREATE TABLE public.app_settings (
          name VARCHAR(100) PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
      console.log('Table created.');
    }

    // Check current data
    const current = await pool.query('SELECT * FROM app_settings ORDER BY name');
    console.log('Current settings:', current.rows);

    // Seed data if empty
    if (current.rows.length === 0) {
      console.log('Inserting seed data...');
      await pool.query(`
        INSERT INTO public.app_settings (name, value) VALUES
          ('app_version', '1.0'),
          ('db_version', '1.0'),
          ('webapp_main_color', 'blue'),
          ('index_page', '<h1>Welcome to SalesQuoteMgr</h1>'),
          ('client_name', 'WAB Group USA')
        ON CONFLICT (name) DO NOTHING;
      `);

      const after = await pool.query('SELECT * FROM app_settings ORDER BY name');
      console.log('Settings after seed:', after.rows);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
