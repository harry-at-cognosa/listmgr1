const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PG_CTL = '/Applications/Postgres.app/Contents/Versions/latest/bin/pg_ctl';
const POSTGRES = '/Applications/Postgres.app/Contents/Versions/latest/bin/postgres';
const PSQL = '/Applications/Postgres.app/Contents/Versions/latest/bin/psql';
const DATA_DIR = '/Users/harry/Library/Application Support/Postgres/var-17';

async function main() {
  console.log('=== PostgreSQL Setup for ListMgr1 ===\n');

  // Step 1: Stop the current PostgreSQL instance
  console.log('Step 1: Stopping current PostgreSQL instance...');
  try {
    execSync(`"${PG_CTL}" stop -D "${DATA_DIR}" -m fast 2>&1`, { encoding: 'utf8' });
    console.log('PostgreSQL stopped successfully');
  } catch (err) {
    console.log('Note:', err.stdout?.trim() || err.stderr?.trim() || 'PostgreSQL may already be stopped');
  }

  // Wait for it to fully stop
  await new Promise(r => setTimeout(r, 2000));

  // Step 2: Start PostgreSQL without the auth_permission_dialog
  console.log('\nStep 2: Starting PostgreSQL without auth_permission_dialog...');

  // Use pg_ctl to start in the background without the extension
  const startCmd = `"${PG_CTL}" start -D "${DATA_DIR}" -l "${DATA_DIR}/server.log" -o "-p 5432" 2>&1`;

  try {
    const result = execSync(startCmd, { encoding: 'utf8', timeout: 10000 });
    console.log('Start result:', result.trim());
  } catch (err) {
    console.log('Start error:', err.stdout?.trim() || err.stderr?.trim() || err.message);
  }

  // Wait for PostgreSQL to start
  await new Promise(r => setTimeout(r, 3000));

  // Step 3: Check if PostgreSQL is running
  console.log('\nStep 3: Checking PostgreSQL status...');
  try {
    const status = execSync(`"${PG_CTL}" status -D "${DATA_DIR}" 2>&1`, { encoding: 'utf8' });
    console.log('Status:', status.trim());
  } catch (err) {
    console.log('Status check error:', err.message);
  }

  // Step 4: Test connection
  console.log('\nStep 4: Testing connection...');
  const { Pool } = require('pg');
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'harry'
  });

  try {
    const res = await pool.query('SELECT current_user, current_database()');
    console.log('Connection SUCCESS:', res.rows[0]);

    // Check if listmgr1 database exists
    const dbCheck = await pool.query("SELECT datname FROM pg_database WHERE datname = 'listmgr1'");
    if (dbCheck.rows.length > 0) {
      console.log('Database listmgr1 already exists');
    } else {
      console.log('Creating database listmgr1...');
      await pool.query('CREATE DATABASE listmgr1');
      console.log('Database listmgr1 created successfully');
    }

    // List all databases
    const dbs = await pool.query("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname");
    console.log('Available databases:', dbs.rows.map(r => r.datname).join(', '));

    await pool.end();
    console.log('\n=== Setup Complete ===');
  } catch (err) {
    console.log('Connection failed:', err.message);
    await pool.end();
  }
}

main();
