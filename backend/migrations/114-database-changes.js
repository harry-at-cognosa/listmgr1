/**
 * Migration 114: Database changes including:
 * 1. Convert VARCHAR datetime columns to TIMESTAMPTZ
 * 2. Create document_blob table
 * 3. Create document_blob_history table
 * 4. Add current_blob_id to plsq_templates
 * 5. Create customer_quotes table
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

  // Check datetime column types
  const datetimeColumns = await pool.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name LIKE '%datetime%'
    ORDER BY table_name, column_name;
  `);

  console.log('Current datetime columns:');
  console.log(datetimeColumns.rows);

  // Check if document_blob exists
  const blobTable = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'document_blob'
    );
  `);
  console.log('\ndocument_blob table exists:', blobTable.rows[0].exists);

  // Check if customer_quotes exists
  const quotesTable = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'customer_quotes'
    );
  `);
  console.log('customer_quotes table exists:', quotesTable.rows[0].exists);

  // Check if current_blob_id column exists on plsq_templates
  const blobIdColumn = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'plsq_templates'
      AND column_name = 'current_blob_id'
    );
  `);
  console.log('current_blob_id column exists on plsq_templates:', blobIdColumn.rows[0].exists);

  return {
    datetimeColumns: datetimeColumns.rows,
    documentBlobExists: blobTable.rows[0].exists,
    customerQuotesExists: quotesTable.rows[0].exists,
    currentBlobIdExists: blobIdColumn.rows[0].exists
  };
}

async function runMigration() {
  console.log('=== Migration 114: Database Changes ===\n');

  const status = await checkSchema();

  // Migration 1: Convert VARCHAR datetime columns to TIMESTAMPTZ
  console.log('\n--- Migration 1: Converting datetime columns to TIMESTAMPTZ ---');

  const varcharDatetimes = status.datetimeColumns.filter(col =>
    col.data_type === 'character varying' || col.data_type === 'varchar'
  );

  if (varcharDatetimes.length > 0) {
    console.log(`Found ${varcharDatetimes.length} VARCHAR datetime columns to convert:`);

    for (const col of varcharDatetimes) {
      console.log(`  Converting ${col.table_name}.${col.column_name}...`);
      try {
        // First, handle empty strings by converting them to NULL
        await pool.query(`
          UPDATE ${col.table_name}
          SET ${col.column_name} = NULL
          WHERE ${col.column_name} = '' OR ${col.column_name} IS NULL;
        `);

        // Then convert the column type
        await pool.query(`
          ALTER TABLE ${col.table_name}
            ALTER COLUMN ${col.column_name} TYPE TIMESTAMPTZ
              USING ${col.column_name}::TIMESTAMPTZ;
        `);
        console.log(`    ✓ Converted ${col.table_name}.${col.column_name} to TIMESTAMPTZ`);
      } catch (err) {
        console.error(`    ✗ Error converting ${col.table_name}.${col.column_name}:`, err.message);
      }
    }
  } else {
    console.log('All datetime columns are already TIMESTAMPTZ');
  }

  // Migration 2: Create document_blob table
  console.log('\n--- Migration 2: Creating document_blob table ---');

  if (!status.documentBlobExists) {
    try {
      // First, ensure pgcrypto extension is available
      await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
      console.log('  ✓ pgcrypto extension enabled');

      await pool.query(`
        CREATE TABLE document_blob (
            blob_id           BIGSERIAL PRIMARY KEY,
            bytes             BYTEA NOT NULL,
            sha256            BYTEA NOT NULL,
            size_bytes        INTEGER NOT NULL,
            content_type      TEXT NOT NULL,
            original_filename TEXT,
            created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

            CONSTRAINT document_blob_sha256_unique UNIQUE (sha256),
            CONSTRAINT document_blob_sha256_len    CHECK (octet_length(sha256) = 32),
            CONSTRAINT document_blob_size_chk      CHECK (size_bytes = octet_length(bytes))
        );
      `);
      console.log('  ✓ Created document_blob table');
    } catch (err) {
      console.error('  ✗ Error creating document_blob table:', err.message);
    }
  } else {
    console.log('  document_blob table already exists');
  }

  // Migration 3: Create document_blob_history table
  console.log('\n--- Migration 3: Creating document_blob_history table ---');

  const historyTable = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'document_blob_history'
    );
  `);

  if (!historyTable.rows[0].exists) {
    try {
      await pool.query(`
        CREATE TABLE document_blob_history (
            history_id    BIGSERIAL PRIMARY KEY,
            entity_type   TEXT NOT NULL,
            entity_id     INTEGER NOT NULL,
            blob_id       BIGINT NOT NULL REFERENCES document_blob(blob_id),
            replaced_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
            replaced_by   VARCHAR(50),

            CONSTRAINT blob_history_entity_type_chk
              CHECK (entity_type IN ('template', 'quote'))
        );

        CREATE INDEX idx_blob_history_entity
            ON document_blob_history (entity_type, entity_id);

        CREATE INDEX idx_blob_history_blob
            ON document_blob_history (blob_id);
      `);
      console.log('  ✓ Created document_blob_history table with indexes');
    } catch (err) {
      console.error('  ✗ Error creating document_blob_history table:', err.message);
    }
  } else {
    console.log('  document_blob_history table already exists');
  }

  // Migration 4: Add current_blob_id to plsq_templates
  console.log('\n--- Migration 4: Adding current_blob_id to plsq_templates ---');

  if (!status.currentBlobIdExists) {
    try {
      await pool.query(`
        ALTER TABLE plsq_templates
            ADD COLUMN current_blob_id BIGINT REFERENCES document_blob(blob_id);

        CREATE INDEX idx_templates_blob
            ON plsq_templates (current_blob_id);
      `);
      console.log('  ✓ Added current_blob_id column and index to plsq_templates');
    } catch (err) {
      console.error('  ✗ Error adding current_blob_id:', err.message);
    }
  } else {
    console.log('  current_blob_id column already exists on plsq_templates');
  }

  // Migration 5: Create customer_quotes table
  console.log('\n--- Migration 5: Creating customer_quotes table ---');

  if (!status.customerQuotesExists) {
    try {
      await pool.query(`
        CREATE TABLE customer_quotes (
            quote_id              SERIAL PRIMARY KEY,
            country_id            INTEGER REFERENCES country(country_id),
            currency_id           INTEGER REFERENCES currency(currency_id),
            product_cat_id        INTEGER REFERENCES product_cat(product_cat_id),
            product_line_id       INTEGER REFERENCES product_line(product_line_id),
            current_blob_id       BIGINT REFERENCES document_blob(blob_id),
            source_template_id    INTEGER REFERENCES plsq_templates(plsqt_id),
            cquote_name           TEXT,
            cquote_order_codes    TEXT,
            cquote_desc           TEXT,
            cquote_comment        TEXT,
            cquote_section_count  INTEGER NOT NULL DEFAULT 0,
            cquote_fbo_location   TEXT,
            cquote_as_of_date     DATE,
            cquote_extrn_file_ref TEXT,
            cquote_active         BOOLEAN DEFAULT TRUE,
            cquote_version        TEXT,
            cquote_content        TEXT,
            cquote_status         VARCHAR(20) DEFAULT 'not started',
            status_datetime       TIMESTAMPTZ,
            last_update_datetime  TIMESTAMPTZ,
            last_update_user      VARCHAR(50),
            cquote_enabled        INTEGER NOT NULL DEFAULT 1,

            CONSTRAINT customer_quotes_status_chk
              CHECK (cquote_status IN (
                'not started', 'in process', 'in review',
                'approved', 'sent', 'accepted', 'declined', 'expired'
              ))
        );

        CREATE INDEX idx_cquotes_country       ON customer_quotes (country_id);
        CREATE INDEX idx_cquotes_product_cat   ON customer_quotes (product_cat_id);
        CREATE INDEX idx_cquotes_product_line  ON customer_quotes (product_line_id);
        CREATE INDEX idx_cquotes_blob          ON customer_quotes (current_blob_id);
        CREATE INDEX idx_cquotes_source_tmpl   ON customer_quotes (source_template_id);
      `);
      console.log('  ✓ Created customer_quotes table with indexes');
    } catch (err) {
      console.error('  ✗ Error creating customer_quotes table:', err.message);
    }
  } else {
    console.log('  customer_quotes table already exists');
  }

  // Final verification
  console.log('\n=== Verifying Migration ===');
  const finalStatus = await checkSchema();

  // Verify all datetime columns are now TIMESTAMPTZ
  const remainingVarchar = finalStatus.datetimeColumns.filter(col =>
    col.data_type === 'character varying' || col.data_type === 'varchar'
  );

  console.log('\nMigration Summary:');
  console.log(`  - VARCHAR datetime columns remaining: ${remainingVarchar.length}`);
  console.log(`  - document_blob table: ${finalStatus.documentBlobExists ? '✓ exists' : '✗ missing'}`);
  console.log(`  - customer_quotes table: ${finalStatus.customerQuotesExists ? '✓ exists' : '✗ missing'}`);
  console.log(`  - current_blob_id on templates: ${finalStatus.currentBlobIdExists ? '✓ exists' : '✗ missing'}`);

  if (remainingVarchar.length === 0 &&
      finalStatus.documentBlobExists &&
      finalStatus.customerQuotesExists &&
      finalStatus.currentBlobIdExists) {
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
