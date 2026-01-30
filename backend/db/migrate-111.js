const db = require('./index');

async function migrate() {
  try {
    console.log('Starting migration 111: Add enabled columns to currency, country, and users tables...');

    // Add currency_enabled column to currency table
    try {
      await db.query(`ALTER TABLE currency ADD COLUMN currency_enabled INTEGER DEFAULT 1 NOT NULL`);
      console.log('Added currency_enabled column to currency table');
    } catch (e) {
      if (e.code === '42701' || e.message.includes('already exists')) {
        console.log('currency_enabled column already exists');
      } else {
        throw e;
      }
    }

    // Add country_enabled column to country table
    try {
      await db.query(`ALTER TABLE country ADD COLUMN country_enabled INTEGER DEFAULT 1 NOT NULL`);
      console.log('Added country_enabled column to country table');
    } catch (e) {
      if (e.code === '42701' || e.message.includes('already exists')) {
        console.log('country_enabled column already exists');
      } else {
        throw e;
      }
    }

    // Add user_enabled column to users table
    try {
      await db.query(`ALTER TABLE users ADD COLUMN user_enabled INTEGER DEFAULT 1 NOT NULL`);
      console.log('Added user_enabled column to users table');
    } catch (e) {
      if (e.code === '42701' || e.message.includes('already exists')) {
        console.log('user_enabled column already exists');
      } else {
        throw e;
      }
    }

    console.log('Migration 111 completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration 111 failed:', error);
    process.exit(1);
  }
}

migrate();
