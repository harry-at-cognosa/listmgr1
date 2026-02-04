/**
 * Verification script for Migration 114
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

async function verify() {
  console.log('=== Migration 114 Verification ===\n');

  // 1. Check datetime column types
  console.log('1. Checking datetime column types...');
  const datetimeColumns = await pool.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name LIKE '%datetime%'
    ORDER BY table_name, column_name;
  `);

  let allTimestamptz = true;
  for (const col of datetimeColumns.rows) {
    const isCorrect = col.data_type === 'timestamp with time zone';
    console.log(`   ${col.table_name}.${col.column_name}: ${col.data_type} ${isCorrect ? '✓' : '✗'}`);
    if (!isCorrect) allTimestamptz = false;
  }
  console.log(`   All TIMESTAMPTZ: ${allTimestamptz ? '✓ YES' : '✗ NO'}\n`);

  // 2. Check document_blob table
  console.log('2. Checking document_blob table...');
  const blobColumns = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'document_blob'
    ORDER BY ordinal_position;
  `);
  console.log('   Columns:', blobColumns.rows.map(c => c.column_name).join(', '));
  console.log(`   ✓ document_blob table exists with ${blobColumns.rows.length} columns\n`);

  // 3. Check document_blob_history table
  console.log('3. Checking document_blob_history table...');
  const historyColumns = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'document_blob_history'
    ORDER BY ordinal_position;
  `);
  console.log('   Columns:', historyColumns.rows.map(c => c.column_name).join(', '));
  console.log(`   ✓ document_blob_history table exists with ${historyColumns.rows.length} columns\n`);

  // 4. Check current_blob_id on plsq_templates
  console.log('4. Checking current_blob_id on plsq_templates...');
  const blobIdColumn = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'plsq_templates'
      AND column_name = 'current_blob_id';
  `);
  if (blobIdColumn.rows.length > 0) {
    console.log(`   ✓ current_blob_id column exists (type: ${blobIdColumn.rows[0].data_type})\n`);
  } else {
    console.log('   ✗ current_blob_id column NOT FOUND\n');
  }

  // 5. Check customer_quotes table
  console.log('5. Checking customer_quotes table...');
  const quotesColumns = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customer_quotes'
    ORDER BY ordinal_position;
  `);
  console.log('   Columns:', quotesColumns.rows.map(c => c.column_name).join(', '));
  console.log(`   ✓ customer_quotes table exists with ${quotesColumns.rows.length} columns\n`);

  // 6. Check indexes
  console.log('6. Checking indexes...');
  const indexes = await pool.query(`
    SELECT tablename, indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND (indexname LIKE 'idx_blob%' OR indexname LIKE 'idx_cquotes%' OR indexname LIKE 'idx_templates_blob%')
    ORDER BY tablename, indexname;
  `);
  for (const idx of indexes.rows) {
    console.log(`   ✓ ${idx.tablename}: ${idx.indexname}`);
  }
  console.log('');

  // 7. Verify pgcrypto extension
  console.log('7. Checking pgcrypto extension...');
  const extensions = await pool.query(`
    SELECT extname FROM pg_extension WHERE extname = 'pgcrypto';
  `);
  if (extensions.rows.length > 0) {
    console.log('   ✓ pgcrypto extension is installed\n');
  } else {
    console.log('   ✗ pgcrypto extension NOT FOUND\n');
  }

  // 8. Test a sample query with timestamps
  console.log('8. Testing timestamp queries...');
  const sampleData = await pool.query(`
    SELECT currency_symbol, last_update_datetime
    FROM currency
    WHERE last_update_datetime IS NOT NULL
    LIMIT 2;
  `);
  for (const row of sampleData.rows) {
    console.log(`   ${row.currency_symbol}: ${row.last_update_datetime}`);
  }

  console.log('\n=== Verification Complete ===');
  await pool.end();
}

verify().catch(err => {
  console.error('Verification error:', err);
  pool.end();
});
