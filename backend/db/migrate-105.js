/**
 * Migration script for Feature #105
 * Updates plsq_templates and plsqt_sections tables:
 * - Renames columns for consistent naming conventions
 * - Changes VARCHAR columns to TEXT for larger content capacity
 *
 * The new TEXT fields will have character limits enforced in the UI,
 * but the database will accept TEXT to allow for flexibility.
 *
 * Run with: node backend/db/migrate-105.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'listmgr1',
  user: process.env.DB_USER || 'harry',
  password: process.env.DB_PASSWORD || ''
});

async function migrate() {
  console.log('Starting Feature #105 migration...\n');
  console.log('='.repeat(60));

  try {
    // Check current schema
    console.log('\n1. Checking current schema...');
    const columnsQuery = `
      SELECT table_name, column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name IN ('plsq_templates', 'plsqt_sections')
      ORDER BY table_name, ordinal_position
    `;
    const currentSchema = await pool.query(columnsQuery);
    console.log(`   Found ${currentSchema.rows.length} columns across both tables`);

    // ======================================
    // PLSQ_TEMPLATES TABLE MIGRATIONS
    // ======================================
    console.log('\n2. Migrating plsq_templates table...');

    // 2.1 plsqt_name: VARCHAR(100) -> TEXT
    console.log('   - plsqt_name: VARCHAR(100) -> TEXT');
    await pool.query('ALTER TABLE plsq_templates ALTER COLUMN plsqt_name TYPE TEXT');

    // 2.2 plsqt_order_codes: VARCHAR(200) -> TEXT
    console.log('   - plsqt_order_codes: VARCHAR(200) -> TEXT');
    await pool.query('ALTER TABLE plsq_templates ALTER COLUMN plsqt_order_codes TYPE TEXT');

    // 2.3 plsqt_desc: VARCHAR(800) -> TEXT
    console.log('   - plsqt_desc: VARCHAR(800) -> TEXT');
    await pool.query('ALTER TABLE plsq_templates ALTER COLUMN plsqt_desc TYPE TEXT');

    // 2.4 plsqt_comment: VARCHAR(100) -> TEXT
    console.log('   - plsqt_comment: VARCHAR(100) -> TEXT');
    await pool.query('ALTER TABLE plsq_templates ALTER COLUMN plsqt_comment TYPE TEXT');

    // 2.5 plsqt_fbo_location: VARCHAR(50) -> TEXT (also increasing limit from 50)
    console.log('   - plsqt_fbo_location: VARCHAR(50) -> TEXT');
    await pool.query('ALTER TABLE plsq_templates ALTER COLUMN plsqt_fbo_location TYPE TEXT');

    // 2.6 extrn_file_ref -> plsqt_extrn_file_ref (rename + type change)
    console.log('   - extrn_file_ref -> plsqt_extrn_file_ref (rename + VARCHAR -> TEXT)');
    try {
      // First check if the column already has the new name (idempotent)
      const checkOldName = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'plsq_templates' AND column_name = 'extrn_file_ref'
      `);
      if (checkOldName.rows.length > 0) {
        await pool.query('ALTER TABLE plsq_templates RENAME COLUMN extrn_file_ref TO plsqt_extrn_file_ref');
      } else {
        console.log('     (column already renamed)');
      }
    } catch (e) {
      if (!e.message.includes('does not exist')) throw e;
      console.log('     (column already renamed)');
    }
    await pool.query('ALTER TABLE plsq_templates ALTER COLUMN plsqt_extrn_file_ref TYPE TEXT');

    // 2.7 plsqt_version: VARCHAR(25) -> TEXT
    console.log('   - plsqt_version: VARCHAR(25) -> TEXT');
    await pool.query('ALTER TABLE plsq_templates ALTER COLUMN plsqt_version TYPE TEXT');

    // 2.8 content -> plsqt_content (rename + type change)
    console.log('   - content -> plsqt_content (rename + VARCHAR -> TEXT)');
    try {
      const checkOldName = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'plsq_templates' AND column_name = 'content'
      `);
      if (checkOldName.rows.length > 0) {
        await pool.query('ALTER TABLE plsq_templates RENAME COLUMN content TO plsqt_content');
      } else {
        console.log('     (column already renamed)');
      }
    } catch (e) {
      if (!e.message.includes('does not exist')) throw e;
      console.log('     (column already renamed)');
    }
    await pool.query('ALTER TABLE plsq_templates ALTER COLUMN plsqt_content TYPE TEXT');

    // 2.9 plsqs_as_of_date -> plsqt_as_of_date (rename only)
    console.log('   - plsqs_as_of_date -> plsqt_as_of_date (rename only)');
    try {
      const checkOldName = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'plsq_templates' AND column_name = 'plsqs_as_of_date'
      `);
      if (checkOldName.rows.length > 0) {
        await pool.query('ALTER TABLE plsq_templates RENAME COLUMN plsqs_as_of_date TO plsqt_as_of_date');
      } else {
        console.log('     (column already renamed)');
      }
    } catch (e) {
      if (!e.message.includes('does not exist')) throw e;
      console.log('     (column already renamed)');
    }

    console.log('   plsq_templates migration complete!');

    // ======================================
    // PLSQT_SECTIONS TABLE MIGRATIONS
    // ======================================
    console.log('\n3. Migrating plsqt_sections table...');

    // 3.1 plsqt_seqn -> plsqts_seqn (rename only)
    console.log('   - plsqt_seqn -> plsqts_seqn (rename only)');
    try {
      const checkOldName = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'plsqt_sections' AND column_name = 'plsqt_seqn'
      `);
      if (checkOldName.rows.length > 0) {
        await pool.query('ALTER TABLE plsqt_sections RENAME COLUMN plsqt_seqn TO plsqts_seqn');
      } else {
        console.log('     (column already renamed)');
      }
    } catch (e) {
      if (!e.message.includes('does not exist')) throw e;
      console.log('     (column already renamed)');
    }

    // 3.2 plsqt_alt_name -> plsqts_alt_name (rename + type change)
    console.log('   - plsqt_alt_name -> plsqts_alt_name (rename + VARCHAR -> TEXT)');
    try {
      const checkOldName = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'plsqt_sections' AND column_name = 'plsqt_alt_name'
      `);
      if (checkOldName.rows.length > 0) {
        await pool.query('ALTER TABLE plsqt_sections RENAME COLUMN plsqt_alt_name TO plsqts_alt_name');
      } else {
        console.log('     (column already renamed)');
      }
    } catch (e) {
      if (!e.message.includes('does not exist')) throw e;
      console.log('     (column already renamed)');
    }
    await pool.query('ALTER TABLE plsqt_sections ALTER COLUMN plsqts_alt_name TYPE TEXT');

    // 3.3 plsqt_comment -> plsqts_comment (rename + type change)
    console.log('   - plsqt_comment -> plsqts_comment (rename + VARCHAR -> TEXT)');
    try {
      const checkOldName = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'plsqt_sections' AND column_name = 'plsqt_comment'
      `);
      if (checkOldName.rows.length > 0) {
        await pool.query('ALTER TABLE plsqt_sections RENAME COLUMN plsqt_comment TO plsqts_comment');
      } else {
        console.log('     (column already renamed)');
      }
    } catch (e) {
      if (!e.message.includes('does not exist')) throw e;
      console.log('     (column already renamed)');
    }
    await pool.query('ALTER TABLE plsqt_sections ALTER COLUMN plsqts_comment TYPE TEXT');

    // 3.4 plsqts_version: VARCHAR -> TEXT
    console.log('   - plsqts_version: VARCHAR -> TEXT');
    await pool.query('ALTER TABLE plsqt_sections ALTER COLUMN plsqts_version TYPE TEXT');

    // 3.5 plsqt_use_alt_name -> plsqts_use_alt_name (rename only)
    console.log('   - plsqt_use_alt_name -> plsqts_use_alt_name (rename only)');
    try {
      const checkOldName = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'plsqt_sections' AND column_name = 'plsqt_use_alt_name'
      `);
      if (checkOldName.rows.length > 0) {
        await pool.query('ALTER TABLE plsqt_sections RENAME COLUMN plsqt_use_alt_name TO plsqts_use_alt_name');
      } else {
        console.log('     (column already renamed)');
      }
    } catch (e) {
      if (!e.message.includes('does not exist')) throw e;
      console.log('     (column already renamed)');
    }

    // 3.6 extrn_file_ref -> plsqts_extrn_file_ref (rename + type change)
    console.log('   - extrn_file_ref -> plsqts_extrn_file_ref (rename + VARCHAR -> TEXT)');
    try {
      const checkOldName = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'plsqt_sections' AND column_name = 'extrn_file_ref'
      `);
      if (checkOldName.rows.length > 0) {
        await pool.query('ALTER TABLE plsqt_sections RENAME COLUMN extrn_file_ref TO plsqts_extrn_file_ref');
      } else {
        console.log('     (column already renamed)');
      }
    } catch (e) {
      if (!e.message.includes('does not exist')) throw e;
      console.log('     (column already renamed)');
    }
    await pool.query('ALTER TABLE plsqt_sections ALTER COLUMN plsqts_extrn_file_ref TYPE TEXT');

    // 3.7 content -> plsqts_content (rename + type change)
    console.log('   - content -> plsqts_content (rename + VARCHAR -> TEXT)');
    try {
      const checkOldName = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'plsqt_sections' AND column_name = 'content'
      `);
      if (checkOldName.rows.length > 0) {
        await pool.query('ALTER TABLE plsqt_sections RENAME COLUMN content TO plsqts_content');
      } else {
        console.log('     (column already renamed)');
      }
    } catch (e) {
      if (!e.message.includes('does not exist')) throw e;
      console.log('     (column already renamed)');
    }
    await pool.query('ALTER TABLE plsqt_sections ALTER COLUMN plsqts_content TYPE TEXT');

    console.log('   plsqt_sections migration complete!');

    // ======================================
    // VERIFY FINAL SCHEMA
    // ======================================
    console.log('\n4. Verifying final schema...');
    const finalSchema = await pool.query(columnsQuery);

    console.log('\n   plsq_templates columns:');
    finalSchema.rows
      .filter(r => r.table_name === 'plsq_templates')
      .forEach(r => {
        const typeInfo = r.data_type === 'text' ? 'TEXT' : `${r.data_type}(${r.character_maximum_length || 'N/A'})`;
        console.log(`     - ${r.column_name}: ${typeInfo}`);
      });

    console.log('\n   plsqt_sections columns:');
    finalSchema.rows
      .filter(r => r.table_name === 'plsqt_sections')
      .forEach(r => {
        const typeInfo = r.data_type === 'text' ? 'TEXT' : `${r.data_type}(${r.character_maximum_length || 'N/A'})`;
        console.log(`     - ${r.column_name}: ${typeInfo}`);
      });

    console.log('\n' + '='.repeat(60));
    console.log('Migration completed successfully!');
    console.log('='.repeat(60) + '\n');

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('\nMigration failed:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

migrate();
