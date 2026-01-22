const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'listmgr1',
  user: process.env.DB_USER || 'harry',
  password: process.env.DB_PASSWORD || ''
});

async function setupDatabase() {
  console.log('Setting up PostgreSQL database...');

  try {
    // Create tables
    console.log('\nCreating tables...');

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        last_update_datetime VARCHAR(15),
        last_update_user VARCHAR(50)
      )
    `);
    console.log('  - users table created');

    // Currency table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS currency (
        currency_id SERIAL PRIMARY KEY,
        currency_symbol VARCHAR(3) NOT NULL,
        currency_name VARCHAR(20),
        last_update_datetime VARCHAR(15),
        last_update_user VARCHAR(50)
      )
    `);
    console.log('  - currency table created');

    // Country table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS country (
        country_id SERIAL PRIMARY KEY,
        country_abbr CHAR(3) NOT NULL,
        country_name VARCHAR(50) NOT NULL,
        currency_id INTEGER REFERENCES currency(currency_id),
        last_update_datetime VARCHAR(15),
        last_update_user VARCHAR(50)
      )
    `);
    console.log('  - country table created');

    // Product Category table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_cat (
        product_cat_id SERIAL PRIMARY KEY,
        product_cat_abbr CHAR(3),
        product_cat_name VARCHAR(50),
        last_update_datetime VARCHAR(15),
        last_update_user VARCHAR(50)
      )
    `);
    console.log('  - product_cat table created');

    // Product Line table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_line (
        product_line_id SERIAL PRIMARY KEY,
        product_cat_id INTEGER NOT NULL REFERENCES product_cat(product_cat_id),
        product_line_abbr CHAR(3),
        product_line_name VARCHAR(20),
        last_update_datetime VARCHAR(15),
        last_update_user VARCHAR(50)
      )
    `);
    console.log('  - product_line table created');

    // Section Type table (plsqts_type)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plsqts_type (
        plsqtst_id SERIAL PRIMARY KEY,
        plsqtst_name VARCHAR(50),
        plsqtst_has_total_price BOOLEAN DEFAULT false,
        plsqtst_has_lineitem_prices BOOLEAN DEFAULT false,
        plsqtst_comment VARCHAR(100),
        extrn_file_ref VARCHAR(500),
        plsqtst_active BOOLEAN DEFAULT true,
        plsqtst_version VARCHAR(25),
        last_update_datetime VARCHAR(15),
        last_update_user VARCHAR(50)
      )
    `);
    console.log('  - plsqts_type table created');

    // Templates table (plsq_templates)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plsq_templates (
        plsqt_id SERIAL PRIMARY KEY,
        country_id INTEGER REFERENCES country(country_id),
        currency_id INTEGER REFERENCES currency(currency_id),
        product_cat_id INTEGER REFERENCES product_cat(product_cat_id),
        product_line_id INTEGER REFERENCES product_line(product_line_id),
        plsqt_name VARCHAR(100),
        plsqt_order_codes VARCHAR(200),
        plsqt_desc VARCHAR(800),
        plsqt_comment VARCHAR(100),
        plsqt_section_count INTEGER NOT NULL DEFAULT 0,
        plsqt_fbo_location VARCHAR(50),
        plsqs_as_of_date DATE,
        extrn_file_ref VARCHAR(500),
        plsqt_active BOOLEAN DEFAULT true,
        plsqt_version VARCHAR(25),
        content VARCHAR(500),
        plsqt_status VARCHAR(20) DEFAULT 'not started' CHECK (plsqt_status IN ('not started', 'in process', 'in review', 'approved', 'cloned')),
        status_datetime VARCHAR(15),
        last_update_datetime VARCHAR(15),
        last_update_user VARCHAR(50)
      )
    `);
    console.log('  - plsq_templates table created');

    // Sections table (plsqt_sections)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plsqt_sections (
        plsqts_id SERIAL PRIMARY KEY,
        plsqt_id INTEGER NOT NULL REFERENCES plsq_templates(plsqt_id) ON DELETE CASCADE,
        section_type_id INTEGER NOT NULL REFERENCES plsqts_type(plsqtst_id),
        plsqt_seqn INTEGER NOT NULL,
        plsqt_alt_name VARCHAR(50),
        plsqt_comment VARCHAR(100),
        plsqt_use_alt_name BOOLEAN DEFAULT false,
        plsqts_subsection_count INTEGER NOT NULL DEFAULT 0,
        plsqts_active BOOLEAN DEFAULT true,
        plsqts_version VARCHAR(25),
        extrn_file_ref VARCHAR(500),
        content VARCHAR(500),
        plsqts_status VARCHAR(20) DEFAULT 'not started' CHECK (plsqts_status IN ('not started', 'in process', 'in review', 'approved', 'cloned')),
        status_datetime VARCHAR(15),
        last_update_datetime VARCHAR(15),
        last_update_user VARCHAR(50)
      )
    `);
    console.log('  - plsqt_sections table created');

    // Create indexes
    console.log('\nCreating indexes...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_country_currency ON country(currency_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_product_line_cat ON product_line(product_cat_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_templates_country ON plsq_templates(country_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_templates_product_cat ON plsq_templates(product_cat_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_templates_product_line ON plsq_templates(product_line_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_sections_template ON plsqt_sections(plsqt_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_sections_type ON plsqt_sections(section_type_id)');
    console.log('  - indexes created');

    console.log('\nTables created successfully!');

    // Seed data
    console.log('\n--- Seeding data ---');
    // Format: YYYY-MM-DD HH:MM (15 characters max)
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

    // Seed users
    const users = [
      { username: 'admin', password: 'admin', role: 'admin' },
      { username: 'harry', password: 'harry', role: 'user' },
      { username: 'clint', password: 'clint', role: 'user' }
    ];

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await pool.query(`
        INSERT INTO users (username, password, role, last_update_datetime, last_update_user)
        VALUES ($1, $2, $3, $4, 'system')
        ON CONFLICT (username) DO NOTHING
      `, [user.username, hashedPassword, user.role, now]);
    }
    console.log('  - users seeded');

    // Seed currencies
    const currencies = [
      { symbol: 'USD', name: 'US Dollar' },
      { symbol: 'EUR', name: 'Euro' },
      { symbol: 'GBP', name: 'British Pound' },
      { symbol: 'JPY', name: 'Japanese Yen' },
      { symbol: 'CAD', name: 'Canadian Dollar' }
    ];

    for (const curr of currencies) {
      const exists = await pool.query('SELECT 1 FROM currency WHERE currency_symbol = $1', [curr.symbol]);
      if (exists.rows.length === 0) {
        await pool.query(`
          INSERT INTO currency (currency_symbol, currency_name, last_update_datetime, last_update_user)
          VALUES ($1, $2, $3, 'system')
        `, [curr.symbol, curr.name, now]);
      }
    }
    console.log('  - currencies seeded');

    // Seed countries
    const countries = [
      { abbr: 'USA', name: 'United States', currency: 'USD' },
      { abbr: 'GBR', name: 'United Kingdom', currency: 'GBP' },
      { abbr: 'DEU', name: 'Germany', currency: 'EUR' },
      { abbr: 'FRA', name: 'France', currency: 'EUR' },
      { abbr: 'JPN', name: 'Japan', currency: 'JPY' }
    ];

    for (const country of countries) {
      const currResult = await pool.query('SELECT currency_id FROM currency WHERE currency_symbol = $1', [country.currency]);
      if (currResult.rows.length > 0) {
        const exists = await pool.query('SELECT 1 FROM country WHERE country_abbr = $1', [country.abbr]);
        if (exists.rows.length === 0) {
          await pool.query(`
            INSERT INTO country (country_abbr, country_name, currency_id, last_update_datetime, last_update_user)
            VALUES ($1, $2, $3, $4, 'system')
          `, [country.abbr, country.name, currResult.rows[0].currency_id, now]);
        }
      }
    }
    console.log('  - countries seeded');

    // Seed product categories
    const categories = [
      { abbr: 'HW', name: 'Hardware' },
      { abbr: 'SW', name: 'Software' },
      { abbr: 'SVC', name: 'Services' }
    ];

    for (const cat of categories) {
      const exists = await pool.query('SELECT 1 FROM product_cat WHERE product_cat_abbr = $1', [cat.abbr]);
      if (exists.rows.length === 0) {
        await pool.query(`
          INSERT INTO product_cat (product_cat_abbr, product_cat_name, last_update_datetime, last_update_user)
          VALUES ($1, $2, $3, 'system')
        `, [cat.abbr, cat.name, now]);
      }
    }
    console.log('  - product categories seeded');

    // Seed product lines
    const productLines = [
      { abbr: 'SRV', name: 'Servers', cat: 'HW' },
      { abbr: 'STG', name: 'Storage', cat: 'HW' },
      { abbr: 'OS', name: 'Operating Systems', cat: 'SW' }
    ];

    for (const line of productLines) {
      const catResult = await pool.query('SELECT product_cat_id FROM product_cat WHERE product_cat_abbr = $1', [line.cat]);
      if (catResult.rows.length > 0) {
        const exists = await pool.query('SELECT 1 FROM product_line WHERE product_line_abbr = $1', [line.abbr]);
        if (exists.rows.length === 0) {
          await pool.query(`
            INSERT INTO product_line (product_cat_id, product_line_abbr, product_line_name, last_update_datetime, last_update_user)
            VALUES ($1, $2, $3, $4, 'system')
          `, [catResult.rows[0].product_cat_id, line.abbr, line.name, now]);
        }
      }
    }
    console.log('  - product lines seeded');

    // Seed section types
    const sectionTypes = [
      { name: 'Standard', has_total: true, has_lineitem: true, comment: 'Standard section with all features' },
      { name: 'Header', has_total: false, has_lineitem: false, comment: 'Quote header information' },
      { name: 'Product List', has_total: true, has_lineitem: true, comment: 'Product items with prices' },
      { name: 'Summary', has_total: true, has_lineitem: false, comment: 'Quote summary section' },
      { name: 'Terms', has_total: false, has_lineitem: false, comment: 'Terms and conditions' },
      { name: 'Detail', has_total: false, has_lineitem: true, comment: 'Detailed line items' }
    ];

    for (const type of sectionTypes) {
      const exists = await pool.query('SELECT 1 FROM plsqts_type WHERE plsqtst_name = $1', [type.name]);
      if (exists.rows.length === 0) {
        await pool.query(`
          INSERT INTO plsqts_type (plsqtst_name, plsqtst_has_total_price, plsqtst_has_lineitem_prices, plsqtst_comment, plsqtst_active, last_update_datetime, last_update_user)
          VALUES ($1, $2, $3, $4, true, $5, 'system')
        `, [type.name, type.has_total, type.has_lineitem, type.comment, now]);
      }
    }
    console.log('  - section types seeded');

    // Seed sample templates
    const templates = [
      { country: 'USA', currency: 'USD', cat: 'HW', line: 'SRV', name: 'Server Quote - US Standard', desc: 'Standard quote template for US server sales', sections: 2, status: 'approved' },
      { country: 'GBR', currency: 'GBP', cat: 'HW', line: 'STG', name: 'Storage Quote - UK', desc: 'Quote template for UK storage products', sections: 1, status: 'in process' },
      { country: 'DEU', currency: 'EUR', cat: 'SW', line: 'OS', name: 'OS License Quote - Germany', desc: 'Quote template for German OS licensing', sections: 0, status: 'not started' }
    ];

    for (const tpl of templates) {
      const exists = await pool.query('SELECT 1 FROM plsq_templates WHERE plsqt_name = $1', [tpl.name]);
      if (exists.rows.length === 0) {
        const countryResult = await pool.query('SELECT country_id FROM country WHERE country_abbr = $1', [tpl.country]);
        const currResult = await pool.query('SELECT currency_id FROM currency WHERE currency_symbol = $1', [tpl.currency]);
        const catResult = await pool.query('SELECT product_cat_id FROM product_cat WHERE product_cat_abbr = $1', [tpl.cat]);
        const lineResult = await pool.query('SELECT product_line_id FROM product_line WHERE product_line_abbr = $1', [tpl.line]);

        if (countryResult.rows.length > 0 && currResult.rows.length > 0 && catResult.rows.length > 0 && lineResult.rows.length > 0) {
          await pool.query(`
            INSERT INTO plsq_templates (country_id, currency_id, product_cat_id, product_line_id, plsqt_name, plsqt_desc, plsqt_section_count, plsqt_active, plsqt_status, status_datetime, last_update_datetime, last_update_user)
            VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $9, 'system')
          `, [countryResult.rows[0].country_id, currResult.rows[0].currency_id, catResult.rows[0].product_cat_id, lineResult.rows[0].product_line_id, tpl.name, tpl.desc, tpl.sections, tpl.status, now]);
        }
      }
    }
    console.log('  - sample templates seeded');

    // Seed sample sections for templates
    const serverTemplateResult = await pool.query("SELECT plsqt_id FROM plsq_templates WHERE plsqt_name = 'Server Quote - US Standard'");
    const standardTypeResult = await pool.query("SELECT plsqtst_id FROM plsqts_type WHERE plsqtst_name = 'Standard'");
    const headerTypeResult = await pool.query("SELECT plsqtst_id FROM plsqts_type WHERE plsqtst_name = 'Header'");

    if (serverTemplateResult.rows.length > 0 && standardTypeResult.rows.length > 0 && headerTypeResult.rows.length > 0) {
      const templateId = serverTemplateResult.rows[0].plsqt_id;
      const standardTypeId = standardTypeResult.rows[0].plsqtst_id;
      const headerTypeId = headerTypeResult.rows[0].plsqtst_id;

      const existingSections = await pool.query('SELECT 1 FROM plsqt_sections WHERE plsqt_id = $1', [templateId]);
      if (existingSections.rows.length === 0) {
        await pool.query(`
          INSERT INTO plsqt_sections (plsqt_id, section_type_id, plsqt_seqn, plsqt_alt_name, plsqts_status, plsqts_active, last_update_datetime, last_update_user)
          VALUES ($1, $2, 1, 'Server Configuration', 'approved', true, $3, 'system')
        `, [templateId, standardTypeId, now]);

        await pool.query(`
          INSERT INTO plsqt_sections (plsqt_id, section_type_id, plsqt_seqn, plsqt_alt_name, plsqts_status, plsqts_active, last_update_datetime, last_update_user)
          VALUES ($1, $2, 2, 'Quote Header', 'approved', true, $3, 'system')
        `, [templateId, headerTypeId, now]);
        console.log('  - sample sections seeded');
      }
    }

    console.log('\n=== PostgreSQL Database Setup Complete ===');

    // Show summary
    const tables = ['users', 'currency', 'country', 'product_cat', 'product_line', 'plsqts_type', 'plsq_templates', 'plsqt_sections'];
    console.log('\nTable counts:');
    for (const table of tables) {
      const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`  - ${table}: ${result.rows[0].count} records`);
    }

    await pool.end();
    process.exit(0);

  } catch (err) {
    console.error('Error setting up database:', err);
    await pool.end();
    process.exit(1);
  }
}

setupDatabase();
