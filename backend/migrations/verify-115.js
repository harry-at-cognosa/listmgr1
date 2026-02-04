/**
 * Verification script for Migration 115: Price Conversion Tables
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
  console.log('=== Verifying Migration 115: Price Conversion Tables ===\n');

  try {
    // 1. Verify price_conv_factors table and data
    console.log('--- price_conv_factors ---');
    const pcf = await pool.query('SELECT * FROM price_conv_factors ORDER BY pcf_id');
    console.log('Rows:', pcf.rows.length);
    console.table(pcf.rows);

    // 2. Verify country_conversion_pairs table and data
    console.log('\n--- country_conversion_pairs ---');
    const ccp = await pool.query(`
      SELECT
        ccp.ccp_id,
        ccp.ccp_from_country_id,
        c1.country_abbr as from_country,
        ccp.ccp_to_country_id,
        c2.country_abbr as to_country
      FROM country_conversion_pairs ccp
      JOIN country c1 ON ccp.ccp_from_country_id = c1.country_id
      JOIN country c2 ON ccp.ccp_to_country_id = c2.country_id
      ORDER BY ccp.ccp_id
    `);
    console.log('Rows:', ccp.rows.length);
    console.table(ccp.rows);

    // 3. Verify pconv_factor_values table and data
    console.log('\n--- pconv_factor_values ---');
    const pfv = await pool.query(`
      SELECT
        pfv.pfv_id,
        pcf.pc_factor_code,
        pcf.pc_factor_description,
        c1.country_abbr as from_country,
        c2.country_abbr as to_country,
        pfv.pfc_from_date,
        pfv.pfc_to_date,
        pfv.pfc_multiplier_1,
        pfv.pfc_multiplier_2
      FROM pconv_factor_values pfv
      JOIN price_conv_factors pcf ON pfv.pcf_id = pcf.pcf_id
      JOIN country_conversion_pairs ccp ON pfv.ccp_id = ccp.ccp_id
      JOIN country c1 ON ccp.ccp_from_country_id = c1.country_id
      JOIN country c2 ON ccp.ccp_to_country_id = c2.country_id
      ORDER BY pfv.pfv_id
    `);
    console.log('Rows:', pfv.rows.length);
    console.table(pfv.rows);

    // 4. Verify btree_gist extension
    console.log('\n--- Extensions ---');
    const ext = await pool.query(`
      SELECT extname, extversion FROM pg_extension WHERE extname = 'btree_gist'
    `);
    console.log('btree_gist:', ext.rows.length > 0 ? `v${ext.rows[0].extversion}` : 'NOT INSTALLED');

    // 5. Verify constraints
    console.log('\n--- Constraints ---');
    const constraints = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'pconv_factor_values'::regclass
    `);
    console.table(constraints.rows);

    // 6. Verify indexes
    console.log('\n--- Indexes ---');
    const indexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename IN ('price_conv_factors', 'country_conversion_pairs', 'pconv_factor_values')
      ORDER BY tablename, indexname
    `);
    indexes.rows.forEach(idx => {
      console.log(`${idx.indexname}:`);
      console.log(`  ${idx.indexdef}\n`);
    });

    // 7. Test overlap prevention constraint
    console.log('--- Testing overlap prevention constraint ---');
    try {
      // Try to insert an overlapping date range (should fail)
      await pool.query(`
        INSERT INTO pconv_factor_values (pcf_id, ccp_id, pfc_from_date, pfc_to_date, pfc_multiplier_1, pfc_multiplier_2)
        VALUES (1, 1, '2026-06-01', '2026-08-31', 1.0, 1.0)
      `);
      console.log('✗ ERROR: Overlap prevention constraint did NOT work!');
    } catch (err) {
      if (err.code === '23P01') { // exclusion violation
        console.log('✓ Overlap prevention constraint is working correctly');
        console.log('  (Attempted to insert overlapping date range, correctly rejected)');
      } else {
        console.log('✗ Unexpected error:', err.message);
      }
    }

    console.log('\n=== Verification Complete ===');

  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    await pool.end();
  }
}

verify();
