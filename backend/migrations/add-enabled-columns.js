/**
 * Migration: Add enabled columns to product_cat and product_line tables
 * Feature #108: Add enable/disable switch for product_cat and product_line entities
 */

const db = require('../db');

async function migrate() {
  console.log('Starting migration: Add enabled columns...');

  try {
    // Add product_cat_enabled column to product_cat table
    console.log('Adding product_cat_enabled column to product_cat table...');
    await db.query(`
      ALTER TABLE product_cat
      ADD COLUMN IF NOT EXISTS product_cat_enabled INTEGER DEFAULT 1 NOT NULL
    `);
    console.log('✓ product_cat_enabled column added');

    // Add product_line_enabled column to product_line table
    console.log('Adding product_line_enabled column to product_line table...');
    await db.query(`
      ALTER TABLE product_line
      ADD COLUMN IF NOT EXISTS product_line_enabled INTEGER DEFAULT 1 NOT NULL
    `);
    console.log('✓ product_line_enabled column added');

    // Update all existing records to be enabled (1) - this should already be done by DEFAULT
    // but let's be explicit
    console.log('Setting all existing product categories to enabled...');
    const catResult = await db.query(`
      UPDATE product_cat SET product_cat_enabled = 1 WHERE product_cat_enabled IS NULL
    `);
    console.log(`✓ Updated ${catResult.rowCount || 0} product categories`);

    console.log('Setting all existing product lines to enabled...');
    const lineResult = await db.query(`
      UPDATE product_line SET product_line_enabled = 1 WHERE product_line_enabled IS NULL
    `);
    console.log(`✓ Updated ${lineResult.rowCount || 0} product lines`);

    // Verify the columns were added
    console.log('\nVerifying migration...');
    const catColumns = await db.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'product_cat' AND column_name = 'product_cat_enabled'
    `);
    console.log('product_cat.product_cat_enabled:', catColumns.rows[0] || 'NOT FOUND');

    const lineColumns = await db.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'product_line' AND column_name = 'product_line_enabled'
    `);
    console.log('product_line.product_line_enabled:', lineColumns.rows[0] || 'NOT FOUND');

    // Show current data
    console.log('\nCurrent product categories:');
    const cats = await db.query('SELECT product_cat_id, product_cat_name, product_cat_enabled FROM product_cat');
    cats.rows.forEach(row => console.log(`  - ${row.product_cat_id}: ${row.product_cat_name} (enabled: ${row.product_cat_enabled})`));

    console.log('\nCurrent product lines:');
    const lines = await db.query('SELECT product_line_id, product_line_name, product_line_enabled FROM product_line');
    lines.rows.forEach(row => console.log(`  - ${row.product_line_id}: ${row.product_line_name} (enabled: ${row.product_line_enabled})`));

    console.log('\n✓ Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

migrate();
