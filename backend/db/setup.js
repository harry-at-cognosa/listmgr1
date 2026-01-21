const { db, query } = require('./index');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
  console.log('Setting up database...');

  try {
    // Create tables (SQLite compatible)
    db.exec(`
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user')),
        last_update_datetime VARCHAR(15),
        last_update_user VARCHAR(50)
      );

      -- Currency table
      CREATE TABLE IF NOT EXISTS currency (
        currency_id INTEGER PRIMARY KEY AUTOINCREMENT,
        currency_symbol VARCHAR(3) NOT NULL,
        currency_name VARCHAR(20),
        last_update_datetime VARCHAR(15),
        last_update_user VARCHAR(50)
      );

      -- Country table
      CREATE TABLE IF NOT EXISTS country (
        country_id INTEGER PRIMARY KEY AUTOINCREMENT,
        country_abbr CHAR(3) NOT NULL,
        country_name VARCHAR(50) NOT NULL,
        currency_id INTEGER REFERENCES currency(currency_id),
        last_update_datetime VARCHAR(15),
        last_update_user VARCHAR(50)
      );

      -- Product Category table
      CREATE TABLE IF NOT EXISTS product_cat (
        product_cat_id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_cat_abbr CHAR(3),
        product_cat_name VARCHAR(50),
        last_update_datetime VARCHAR(15),
        last_update_user VARCHAR(50)
      );

      -- Product Line table
      CREATE TABLE IF NOT EXISTS product_line (
        product_line_id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_cat_id INTEGER NOT NULL REFERENCES product_cat(product_cat_id),
        product_line_abbr CHAR(3),
        product_line_name VARCHAR(20),
        last_update_datetime VARCHAR(15),
        last_update_user VARCHAR(50)
      );

      -- Section Type table (plsqts_type)
      CREATE TABLE IF NOT EXISTS plsqts_type (
        plsqtst_id INTEGER PRIMARY KEY AUTOINCREMENT,
        plsqtst_name VARCHAR(50),
        plsqtst_has_total_price BOOLEAN,
        plsqtst_has_lineitem_prices BOOLEAN,
        plsqtst_comment VARCHAR(100),
        extrn_file_ref VARCHAR(500),
        plsqtst_active BOOLEAN,
        plsqtst_version VARCHAR(25),
        last_update_datetime VARCHAR(15),
        last_update_user VARCHAR(50)
      );

      -- Templates table (plsq_templates)
      CREATE TABLE IF NOT EXISTS plsq_templates (
        plsqt_id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        plsqt_active BOOLEAN DEFAULT 1,
        plsqt_version VARCHAR(25),
        content VARCHAR(500),
        plsqt_status VARCHAR(20) DEFAULT 'not started' CHECK (plsqt_status IN ('not started', 'in process', 'in review', 'approved', 'cloned')),
        status_datetime VARCHAR(15),
        last_update_datetime VARCHAR(15),
        last_update_user VARCHAR(50)
      );

      -- Sections table (plsqt_sections)
      CREATE TABLE IF NOT EXISTS plsqt_sections (
        plsqts_id INTEGER PRIMARY KEY AUTOINCREMENT,
        plsqt_id INTEGER NOT NULL REFERENCES plsq_templates(plsqt_id) ON DELETE CASCADE,
        section_type_id INTEGER NOT NULL REFERENCES plsqts_type(plsqtst_id),
        plsqt_seqn INTEGER NOT NULL,
        plsqt_alt_name VARCHAR(50),
        plsqt_comment VARCHAR(100),
        plsqt_use_alt_name BOOLEAN DEFAULT 0,
        plsqts_subsection_count INTEGER NOT NULL DEFAULT 0,
        plsqts_active BOOLEAN DEFAULT 1,
        plsqts_version VARCHAR(25),
        extrn_file_ref VARCHAR(500),
        content VARCHAR(500),
        plsqts_status VARCHAR(20) DEFAULT 'not started' CHECK (plsqts_status IN ('not started', 'in process', 'in review', 'approved', 'cloned')),
        status_datetime VARCHAR(15),
        last_update_datetime VARCHAR(15),
        last_update_user VARCHAR(50)
      );
    `);

    console.log('Tables created successfully');

    // Seed users
    const adminPassword = await bcrypt.hash('admin', 10);
    const harryPassword = await bcrypt.hash('harry', 10);
    const clintPassword = await bcrypt.hash('clint', 10);
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

    // Insert seed users (ignore if already exist)
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (username, password, role, last_update_datetime, last_update_user)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertUser.run('admin', adminPassword, 'admin', now, 'system');
    insertUser.run('harry', harryPassword, 'user', now, 'system');
    insertUser.run('clint', clintPassword, 'user', now, 'system');

    console.log('Seed users created');

    // Seed reference data
    const insertCurrency = db.prepare(`
      INSERT OR IGNORE INTO currency (currency_symbol, currency_name, last_update_datetime, last_update_user)
      VALUES (?, ?, ?, ?)
    `);

    // Check if currencies exist
    const currencyCount = db.prepare('SELECT COUNT(*) as count FROM currency').get();
    if (currencyCount.count === 0) {
      insertCurrency.run('USD', 'US Dollar', now, 'system');
      insertCurrency.run('EUR', 'Euro', now, 'system');
      insertCurrency.run('GBP', 'British Pound', now, 'system');
      console.log('Currencies seeded');
    }

    // Seed countries
    const countryCount = db.prepare('SELECT COUNT(*) as count FROM country').get();
    if (countryCount.count === 0) {
      const insertCountry = db.prepare(`
        INSERT INTO country (country_abbr, country_name, currency_id, last_update_datetime, last_update_user)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertCountry.run('USA', 'United States', 1, now, 'system');
      insertCountry.run('GBR', 'United Kingdom', 3, now, 'system');
      insertCountry.run('DEU', 'Germany', 2, now, 'system');
      console.log('Countries seeded');
    }

    // Seed product categories
    const catCount = db.prepare('SELECT COUNT(*) as count FROM product_cat').get();
    if (catCount.count === 0) {
      const insertCat = db.prepare(`
        INSERT INTO product_cat (product_cat_abbr, product_cat_name, last_update_datetime, last_update_user)
        VALUES (?, ?, ?, ?)
      `);
      insertCat.run('HW', 'Hardware', now, 'system');
      insertCat.run('SW', 'Software', now, 'system');
      insertCat.run('SVC', 'Services', now, 'system');
      console.log('Product categories seeded');
    }

    // Seed product lines
    const lineCount = db.prepare('SELECT COUNT(*) as count FROM product_line').get();
    if (lineCount.count === 0) {
      const insertLine = db.prepare(`
        INSERT INTO product_line (product_cat_id, product_line_abbr, product_line_name, last_update_datetime, last_update_user)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertLine.run(1, 'SRV', 'Servers', now, 'system');
      insertLine.run(1, 'STR', 'Storage', now, 'system');
      insertLine.run(2, 'OS', 'Operating Systems', now, 'system');
      console.log('Product lines seeded');
    }

    // Seed section types
    const typeCount = db.prepare('SELECT COUNT(*) as count FROM plsqts_type').get();
    if (typeCount.count === 0) {
      const insertType = db.prepare(`
        INSERT INTO plsqts_type (plsqtst_name, plsqtst_has_total_price, plsqtst_has_lineitem_prices, plsqtst_active, last_update_datetime, last_update_user)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertType.run('Standard', 1, 1, 1, now, 'system');
      insertType.run('Summary', 1, 0, 1, now, 'system');
      insertType.run('Detail', 0, 1, 1, now, 'system');
      console.log('Section types seeded');
    }

    // Seed sample templates
    const templateCount = db.prepare('SELECT COUNT(*) as count FROM plsq_templates').get();
    if (templateCount.count === 0) {
      const insertTemplate = db.prepare(`
        INSERT INTO plsq_templates (country_id, currency_id, product_cat_id, product_line_id, plsqt_name, plsqt_desc, plsqt_section_count, plsqt_active, plsqt_status, status_datetime, last_update_datetime, last_update_user)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertTemplate.run(1, 1, 1, 1, 'Server Quote - US Standard', 'Standard quote template for US server sales', 2, 1, 'approved', now, now, 'system');
      insertTemplate.run(2, 3, 1, 2, 'Storage Quote - UK', 'Quote template for UK storage products', 1, 1, 'in process', now, now, 'system');
      insertTemplate.run(3, 2, 2, 3, 'OS License Quote - Germany', 'Quote template for German OS licensing', 0, 0, 'not started', now, now, 'system');
      console.log('Sample templates seeded');
    }

    console.log('Database setup complete!');

  } catch (err) {
    console.error('Error setting up database:', err);
    throw err;
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { setupDatabase };
