/**
 * Migration 115: Create price conversion tables
 * 1. Create price_conv_factors table
 * 2. Create country_conversion_pairs table
 * 3. Create pconv_factor_values table with overlap prevention
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

  // Check if price_conv_factors exists
  const pcfTable = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'price_conv_factors'
    );
  `);
  console.log('price_conv_factors table exists:', pcfTable.rows[0].exists);

  // Check if country_conversion_pairs exists
  const ccpTable = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'country_conversion_pairs'
    );
  `);
  console.log('country_conversion_pairs table exists:', ccpTable.rows[0].exists);

  // Check if pconv_factor_values exists
  const pfvTable = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'pconv_factor_values'
    );
  `);
  console.log('pconv_factor_values table exists:', pfvTable.rows[0].exists);

  // Check if btree_gist extension exists
  const btreeGist = await pool.query(`
    SELECT EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'btree_gist'
    );
  `);
  console.log('btree_gist extension exists:', btreeGist.rows[0].exists);

  return {
    priceConvFactorsExists: pcfTable.rows[0].exists,
    countryConvPairsExists: ccpTable.rows[0].exists,
    pconvFactorValuesExists: pfvTable.rows[0].exists,
    btreeGistExists: btreeGist.rows[0].exists
  };
}

async function runMigration() {
  console.log('=== Migration 115: Price Conversion Tables ===\n');

  const status = await checkSchema();

  // Prerequisite: Enable btree_gist extension
  console.log('\n--- Prerequisite: Enable btree_gist extension ---');

  if (!status.btreeGistExists) {
    try {
      await pool.query(`CREATE EXTENSION IF NOT EXISTS btree_gist;`);
      console.log('  ✓ btree_gist extension enabled');
    } catch (err) {
      console.error('  ✗ Error enabling btree_gist extension:', err.message);
      console.error('  Note: This extension requires superuser privileges. You may need to run:');
      console.error('        CREATE EXTENSION btree_gist;');
      console.error('        as a database superuser before running this migration.');
      return false;
    }
  } else {
    console.log('  btree_gist extension already enabled');
  }

  // Migration 1: Create price_conv_factors table
  console.log('\n--- Migration 1: Creating price_conv_factors table ---');

  if (!status.priceConvFactorsExists) {
    try {
      await pool.query(`
        CREATE TABLE price_conv_factors (
            pcf_id                SERIAL PRIMARY KEY,
            pc_factor_code        VARCHAR(3) NOT NULL,
            pc_factor_description VARCHAR(40)
        );
      `);
      console.log('  ✓ Created price_conv_factors table');

      // Seed data
      await pool.query(`
        INSERT INTO price_conv_factors (pcf_id, pc_factor_code, pc_factor_description)
        VALUES
            (1, 'FX', 'currency conversion etc'),
            (2, 'MU', 'markup, duties, other');
      `);
      console.log('  ✓ Inserted seed data into price_conv_factors');

      // Advance the sequence past the manually inserted IDs
      await pool.query(`SELECT setval('price_conv_factors_pcf_id_seq', 2);`);
      console.log('  ✓ Advanced sequence to 2');
    } catch (err) {
      console.error('  ✗ Error creating price_conv_factors table:', err.message);
    }
  } else {
    console.log('  price_conv_factors table already exists');
  }

  // Migration 2: Create country_conversion_pairs table
  console.log('\n--- Migration 2: Creating country_conversion_pairs table ---');

  if (!status.countryConvPairsExists) {
    try {
      await pool.query(`
        CREATE TABLE country_conversion_pairs (
            ccp_id                SERIAL PRIMARY KEY,
            ccp_from_country_id   INTEGER NOT NULL REFERENCES country(country_id),
            ccp_to_country_id     INTEGER NOT NULL REFERENCES country(country_id)
        );

        CREATE UNIQUE INDEX idx_ccp_pair_unique
            ON country_conversion_pairs (ccp_from_country_id, ccp_to_country_id);

        CREATE INDEX idx_ccp_from_country
            ON country_conversion_pairs (ccp_from_country_id);

        CREATE INDEX idx_ccp_to_country
            ON country_conversion_pairs (ccp_to_country_id);
      `);
      console.log('  ✓ Created country_conversion_pairs table with indexes');

      // Check which country IDs exist
      const countries = await pool.query(`
        SELECT country_id, country_abbr, country_name
        FROM country
        ORDER BY country_id;
      `);
      console.log('  Available countries:', countries.rows.map(c => `${c.country_id}:${c.country_abbr}`).join(', '));

      // Seed data - need to check what country IDs exist
      // The spec mentions country_id 6 and 1, but let's verify
      const country1 = countries.rows.find(c => c.country_id === 1);
      const country6 = countries.rows.find(c => c.country_id === 6);

      if (country1 && country6) {
        await pool.query(`
          INSERT INTO country_conversion_pairs (ccp_id, ccp_from_country_id, ccp_to_country_id)
          VALUES (1, 6, 1);
        `);
        console.log(`  ✓ Inserted seed data: ${country6.country_abbr} -> ${country1.country_abbr}`);
        await pool.query(`SELECT setval('country_conversion_pairs_ccp_id_seq', 1);`);
      } else {
        // Fall back to using first two countries if IDs 1 and 6 don't exist
        if (countries.rows.length >= 2) {
          const fromCountry = countries.rows[1];
          const toCountry = countries.rows[0];
          await pool.query(`
            INSERT INTO country_conversion_pairs (ccp_id, ccp_from_country_id, ccp_to_country_id)
            VALUES (1, $1, $2);
          `, [fromCountry.country_id, toCountry.country_id]);
          console.log(`  ✓ Inserted seed data: ${fromCountry.country_abbr} -> ${toCountry.country_abbr}`);
          await pool.query(`SELECT setval('country_conversion_pairs_ccp_id_seq', 1);`);
        } else {
          console.log('  ⚠ Not enough countries exist to create seed data');
        }
      }
    } catch (err) {
      console.error('  ✗ Error creating country_conversion_pairs table:', err.message);
    }
  } else {
    console.log('  country_conversion_pairs table already exists');
  }

  // Migration 3: Create pconv_factor_values table
  console.log('\n--- Migration 3: Creating pconv_factor_values table ---');

  if (!status.pconvFactorValuesExists) {
    try {
      await pool.query(`
        CREATE TABLE pconv_factor_values (
            pfv_id            SERIAL PRIMARY KEY,
            pcf_id            INTEGER NOT NULL REFERENCES price_conv_factors(pcf_id),
            ccp_id            INTEGER NOT NULL REFERENCES country_conversion_pairs(ccp_id),
            pfc_from_date     DATE NOT NULL DEFAULT CURRENT_DATE,
            pfc_to_date       DATE NOT NULL DEFAULT '2040-12-31',
            pfc_multiplier_1  NUMERIC(8,4) NOT NULL DEFAULT 1.0,
            pfc_multiplier_2  NUMERIC(8,4) NOT NULL DEFAULT 1.0,

            -- Prevent overlapping date periods for the same factor + country pair
            CONSTRAINT pconv_no_overlap
                EXCLUDE USING gist (
                    pcf_id WITH =,
                    ccp_id WITH =,
                    daterange(pfc_from_date, pfc_to_date, '[]') WITH &&
                ),

            -- Ensure from_date <= to_date
            CONSTRAINT pconv_date_order
                CHECK (pfc_from_date <= pfc_to_date)
        );

        CREATE INDEX idx_pfv_factor
            ON pconv_factor_values (pcf_id);

        CREATE INDEX idx_pfv_ccp
            ON pconv_factor_values (ccp_id);

        CREATE INDEX idx_pfv_dates
            ON pconv_factor_values (pfc_from_date, pfc_to_date);
      `);
      console.log('  ✓ Created pconv_factor_values table with indexes and constraints');

      // Seed data
      await pool.query(`
        INSERT INTO pconv_factor_values
            (pfv_id, pcf_id, ccp_id, pfc_from_date, pfc_to_date, pfc_multiplier_1, pfc_multiplier_2)
        VALUES
            (1, 1, 1, '2026-01-01', '2026-12-31', 1.10, 1.54),
            (2, 2, 1, '2026-01-01', '2026-12-31', 1.30, 2.18);
      `);
      console.log('  ✓ Inserted seed data into pconv_factor_values');

      await pool.query(`SELECT setval('pconv_factor_values_pfv_id_seq', 2);`);
      console.log('  ✓ Advanced sequence to 2');
    } catch (err) {
      console.error('  ✗ Error creating pconv_factor_values table:', err.message);
    }
  } else {
    console.log('  pconv_factor_values table already exists');
  }

  // Final verification
  console.log('\n=== Verifying Migration ===');
  const finalStatus = await checkSchema();

  console.log('\nMigration Summary:');
  console.log(`  - btree_gist extension: ${finalStatus.btreeGistExists ? '✓ enabled' : '✗ missing'}`);
  console.log(`  - price_conv_factors table: ${finalStatus.priceConvFactorsExists ? '✓ exists' : '✗ missing'}`);
  console.log(`  - country_conversion_pairs table: ${finalStatus.countryConvPairsExists ? '✓ exists' : '✗ missing'}`);
  console.log(`  - pconv_factor_values table: ${finalStatus.pconvFactorValuesExists ? '✓ exists' : '✗ missing'}`);

  // Verify data
  if (finalStatus.priceConvFactorsExists) {
    const pcfCount = await pool.query('SELECT COUNT(*) FROM price_conv_factors');
    console.log(`  - price_conv_factors rows: ${pcfCount.rows[0].count}`);
  }

  if (finalStatus.countryConvPairsExists) {
    const ccpCount = await pool.query('SELECT COUNT(*) FROM country_conversion_pairs');
    console.log(`  - country_conversion_pairs rows: ${ccpCount.rows[0].count}`);
  }

  if (finalStatus.pconvFactorValuesExists) {
    const pfvCount = await pool.query('SELECT COUNT(*) FROM pconv_factor_values');
    console.log(`  - pconv_factor_values rows: ${pfvCount.rows[0].count}`);
  }

  if (finalStatus.btreeGistExists &&
      finalStatus.priceConvFactorsExists &&
      finalStatus.countryConvPairsExists &&
      finalStatus.pconvFactorValuesExists) {
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
