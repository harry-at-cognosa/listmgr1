const bcrypt = require('bcryptjs');
const db = require('./index');
const fs = require('fs');
const path = require('path');

async function seed() {
  try {
    console.log('Starting database setup...');

    // Read and execute schema - split into individual statements
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split by semicolons, filter empty statements, and execute each
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      try {
        db.db.exec(stmt);
      } catch (e) {
        // Ignore "already exists" errors
        if (!e.message.includes('already exists')) {
          console.error('Error executing:', stmt.substring(0, 50));
          throw e;
        }
      }
    }
    console.log('Schema created successfully');

    // Get current datetime
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

    // Seed users
    const users = [
      { username: 'admin', password: 'admin', role: 'admin' },
      { username: 'harry', password: 'harry', role: 'user' },
      { username: 'clint', password: 'clint', role: 'user' }
    ];

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await db.query(
        `INSERT OR IGNORE INTO users (username, password, role, last_update_datetime, last_update_user)
         VALUES ($1, $2, $3, $4, 'system')`,
        [user.username, hashedPassword, user.role, now]
      );
    }
    console.log('Users seeded successfully');

    // Seed currencies
    const currencies = [
      { symbol: 'USD', name: 'US Dollar' },
      { symbol: 'EUR', name: 'Euro' },
      { symbol: 'GBP', name: 'British Pound' }
    ];

    for (const curr of currencies) {
      await db.query(
        `INSERT OR IGNORE INTO currency (currency_symbol, currency_name, last_update_datetime, last_update_user)
         VALUES ($1, $2, $3, 'system')`,
        [curr.symbol, curr.name, now]
      );
    }
    console.log('Currencies seeded successfully');

    // Seed countries
    const countries = [
      { abbr: 'USA', name: 'United States', currency: 'USD' },
      { abbr: 'GBR', name: 'United Kingdom', currency: 'GBP' },
      { abbr: 'DEU', name: 'Germany', currency: 'EUR' }
    ];

    for (const country of countries) {
      const currResult = await db.query(
        'SELECT currency_id FROM currency WHERE currency_symbol = $1',
        [country.currency]
      );
      if (currResult.rows.length > 0) {
        await db.query(
          `INSERT OR IGNORE INTO country (country_abbr, country_name, currency_id, last_update_datetime, last_update_user)
           VALUES ($1, $2, $3, $4, 'system')`,
          [country.abbr, country.name, currResult.rows[0].currency_id, now]
        );
      }
    }
    console.log('Countries seeded successfully');

    // Seed product categories
    const categories = [
      { abbr: 'HW', name: 'Hardware' },
      { abbr: 'SW', name: 'Software' },
      { abbr: 'SVC', name: 'Services' }
    ];

    for (const cat of categories) {
      await db.query(
        `INSERT OR IGNORE INTO product_cat (product_cat_abbr, product_cat_name, last_update_datetime, last_update_user)
         VALUES ($1, $2, $3, 'system')`,
        [cat.abbr, cat.name, now]
      );
    }
    console.log('Product categories seeded successfully');

    // Seed product lines
    const productLines = [
      { abbr: 'SRV', name: 'Servers', cat: 'HW' },
      { abbr: 'STG', name: 'Storage', cat: 'HW' },
      { abbr: 'OS', name: 'Operating Systems', cat: 'SW' }
    ];

    for (const line of productLines) {
      const catResult = await db.query(
        'SELECT product_cat_id FROM product_cat WHERE product_cat_abbr = $1',
        [line.cat]
      );
      if (catResult.rows.length > 0) {
        await db.query(
          `INSERT OR IGNORE INTO product_line (product_cat_id, product_line_abbr, product_line_name, last_update_datetime, last_update_user)
           VALUES ($1, $2, $3, $4, 'system')`,
          [catResult.rows[0].product_cat_id, line.abbr, line.name, now]
        );
      }
    }
    console.log('Product lines seeded successfully');

    // Seed section types
    const sectionTypes = [
      { name: 'Header', has_total: false, has_lineitem: false, comment: 'Quote header information' },
      { name: 'Product List', has_total: true, has_lineitem: true, comment: 'Product items with prices' },
      { name: 'Summary', has_total: true, has_lineitem: false, comment: 'Quote summary section' },
      { name: 'Terms', has_total: false, has_lineitem: false, comment: 'Terms and conditions' }
    ];

    for (const type of sectionTypes) {
      await db.query(
        `INSERT OR IGNORE INTO plsqts_type (plsqtst_name, plsqtst_has_total_price, plsqtst_has_lineitem_prices, plsqtst_comment, plsqtst_active, last_update_datetime, last_update_user)
         VALUES ($1, $2, $3, $4, 1, $5, 'system')`,
        [type.name, type.has_total ? 1 : 0, type.has_lineitem ? 1 : 0, type.comment, now]
      );
    }
    console.log('Section types seeded successfully');

    console.log('Database seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
