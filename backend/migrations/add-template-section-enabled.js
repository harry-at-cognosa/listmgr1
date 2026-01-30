/**
 * Migration: Add enabled columns to plsq_templates and plsqt_sections tables
 * Feature #109: Add enable/disable switch for templates and sections
 */

const db = require('../db');

async function migrate() {
  console.log('Starting migration: Add enabled columns to templates and sections...');

  try {
    // Add plsqt_enabled column to plsq_templates table
    console.log('Adding plsqt_enabled column to plsq_templates table...');
    await db.query(`
      ALTER TABLE plsq_templates
      ADD COLUMN IF NOT EXISTS plsqt_enabled INTEGER DEFAULT 1 NOT NULL
    `);
    console.log('✓ plsqt_enabled column added');

    // Add plsqts_enabled column to plsqt_sections table
    console.log('Adding plsqts_enabled column to plsqt_sections table...');
    await db.query(`
      ALTER TABLE plsqt_sections
      ADD COLUMN IF NOT EXISTS plsqts_enabled INTEGER DEFAULT 1 NOT NULL
    `);
    console.log('✓ plsqts_enabled column added');

    // Update all existing records to be enabled (1) - this should already be done by DEFAULT
    // but let's be explicit
    console.log('Setting all existing templates to enabled...');
    const templateResult = await db.query(`
      UPDATE plsq_templates SET plsqt_enabled = 1 WHERE plsqt_enabled IS NULL
    `);
    console.log(`✓ Updated ${templateResult.rowCount || 0} templates`);

    console.log('Setting all existing sections to enabled...');
    const sectionResult = await db.query(`
      UPDATE plsqt_sections SET plsqts_enabled = 1 WHERE plsqts_enabled IS NULL
    `);
    console.log(`✓ Updated ${sectionResult.rowCount || 0} sections`);

    // Verify the columns were added
    console.log('\nVerifying migration...');
    const templateColumns = await db.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'plsq_templates' AND column_name = 'plsqt_enabled'
    `);
    console.log('plsq_templates.plsqt_enabled:', templateColumns.rows[0] || 'NOT FOUND');

    const sectionColumns = await db.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'plsqt_sections' AND column_name = 'plsqts_enabled'
    `);
    console.log('plsqt_sections.plsqts_enabled:', sectionColumns.rows[0] || 'NOT FOUND');

    // Show current data
    console.log('\nCurrent templates:');
    const templates = await db.query('SELECT plsqt_id, plsqt_name, plsqt_enabled FROM plsq_templates');
    templates.rows.forEach(row => console.log(`  - ${row.plsqt_id}: ${row.plsqt_name} (enabled: ${row.plsqt_enabled})`));

    console.log('\nCurrent sections:');
    const sections = await db.query('SELECT plsqts_id, plsqt_id, plsqts_enabled FROM plsqt_sections LIMIT 10');
    sections.rows.forEach(row => console.log(`  - Section ${row.plsqts_id} (template ${row.plsqt_id}): (enabled: ${row.plsqts_enabled})`));

    console.log('\n✓ Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

migrate();
