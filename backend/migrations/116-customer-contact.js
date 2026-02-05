/**
 * Migration 116: Create customer_contact table and add cc_id FK to customer_quotes
 * 1. Create customer_contact table for storing customer contact information
 * 2. Add nullable cc_id foreign key column to customer_quotes referencing customer_contact(cc_id)
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'listmgr1',
  user: process.env.DB_USER || 'harry',
  password: process.env.DB_PASSWORD || ''
});

async function checkSchema() {
  console.log('Checking current database schema...\n');

  // Check if customer_contact table exists
  const ccTable = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'customer_contact'
    );
  `);
  console.log('customer_contact table exists:', ccTable.rows[0].exists);

  // Check if customer_quotes.cc_id column exists
  const ccIdColumn = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'customer_quotes'
      AND column_name = 'cc_id'
    );
  `);
  console.log('customer_quotes.cc_id column exists:', ccIdColumn.rows[0].exists);

  return {
    customerContactExists: ccTable.rows[0].exists,
    ccIdColumnExists: ccIdColumn.rows[0].exists
  };
}

async function runMigration() {
  console.log('=== Migration 116: Customer Contact Table ===\n');

  const status = await checkSchema();

  // Migration 1: Create customer_contact table
  console.log('\n--- Migration 1: Creating customer_contact table ---');

  if (!status.customerContactExists) {
    try {
      await pool.query(`
        CREATE TABLE customer_contact (
            cc_id                SERIAL PRIMARY KEY,
            cc_customer_name     TEXT NOT NULL,
            cc_company_name      TEXT,
            cc_phone_number      TEXT,
            cc_email_address     TEXT,
            cc_addr_line_1       VARCHAR(55),
            cc_addr_line_2       VARCHAR(55),
            cc_city              VARCHAR(40),
            cc_state             VARCHAR(20),
            cc_zip               VARCHAR(20),
            cc_comment           TEXT,
            last_update_datetime TIMESTAMPTZ,
            last_update_user     VARCHAR(50)
        );
      `);
      console.log('  ✓ Created customer_contact table');
    } catch (err) {
      console.error('  ✗ Error creating customer_contact table:', err.message);
    }
  } else {
    console.log('  customer_contact table already exists');
  }

  // Migration 2: Add cc_id foreign key column to customer_quotes
  console.log('\n--- Migration 2: Adding cc_id FK to customer_quotes ---');

  if (!status.ccIdColumnExists) {
    try {
      await pool.query(`
        ALTER TABLE customer_quotes
            ADD COLUMN cc_id INTEGER REFERENCES customer_contact(cc_id);
      `);
      console.log('  ✓ Added cc_id column to customer_quotes (nullable, FK to customer_contact)');
    } catch (err) {
      console.error('  ✗ Error adding cc_id column to customer_quotes:', err.message);
    }
  } else {
    console.log('  customer_quotes.cc_id column already exists');
  }

  // Final verification
  console.log('\n=== Verifying Migration ===');
  const finalStatus = await checkSchema();

  // Verify customer_contact columns
  if (finalStatus.customerContactExists) {
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'customer_contact'
      ORDER BY ordinal_position;
    `);
    console.log('\ncustomer_contact columns:');
    columns.rows.forEach(col => {
      const maxLen = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      console.log(`  - ${col.column_name}: ${col.data_type}${maxLen} [nullable: ${col.is_nullable}]`);
    });
  }

  // Verify cc_id FK constraint
  if (finalStatus.ccIdColumnExists) {
    const fkCheck = await pool.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'customer_quotes'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'cc_id';
    `);
    if (fkCheck.rows.length > 0) {
      console.log('\ncustomer_quotes.cc_id FK constraint:');
      fkCheck.rows.forEach(fk => {
        console.log(`  - ${fk.constraint_name}: ${fk.column_name} -> ${fk.foreign_table_name}(${fk.foreign_column_name})`);
      });
    }

    // Verify cc_id is nullable
    const nullableCheck = await pool.query(`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_name = 'customer_quotes'
        AND column_name = 'cc_id';
    `);
    if (nullableCheck.rows.length > 0) {
      console.log(`  - cc_id is nullable: ${nullableCheck.rows[0].is_nullable}`);
    }
  }

  console.log('\nMigration Summary:');
  console.log(`  - customer_contact table: ${finalStatus.customerContactExists ? '✓ exists' : '✗ missing'}`);
  console.log(`  - customer_quotes.cc_id column: ${finalStatus.ccIdColumnExists ? '✓ exists' : '✗ missing'}`);

  if (finalStatus.customerContactExists && finalStatus.ccIdColumnExists) {
    console.log('\n✓ All migrations completed successfully!');
    return true;
  } else {
    console.log('\n✗ Some migrations may have failed. Check errors above.');
    return false;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  try {
    if (args.includes('--check')) {
      await checkSchema();
    } else {
      await runMigration();
    }
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
  }
}

main();
