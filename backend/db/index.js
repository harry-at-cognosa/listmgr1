const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'listmgr1',
  user: process.env.DB_USER || 'harry',
  password: process.env.DB_PASSWORD || ''
});

// Log connection info
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database:', process.env.DB_NAME || 'listmgr1');
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

// Export the query function (compatible with existing code)
// The pg module's pool.query already returns a Promise with { rows, rowCount }
async function query(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount,
      lastInsertRowid: result.rows[0]?.id || result.rows[0]?.user_id ||
                       result.rows[0]?.currency_id || result.rows[0]?.country_id ||
                       result.rows[0]?.product_cat_id || result.rows[0]?.product_line_id ||
                       result.rows[0]?.plsqtst_id || result.rows[0]?.plsqt_id || result.rows[0]?.plsqts_id
    };
  } catch (error) {
    console.error('SQL Error:', error.message);
    console.error('Query:', sql);
    console.error('Params:', params);
    throw error;
  }
}

module.exports = {
  query,
  pool,
  db: pool  // Alias for compatibility with any code using db directly
};
