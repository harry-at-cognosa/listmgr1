const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'listmgr.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('Connected to SQLite database at', dbPath);

// Create a query function that mimics pg's interface for compatibility
// Returns a promise for async/await compatibility
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      // Convert PostgreSQL-style parameters ($1, $2) to SQLite-style (?, ?)
      let convertedSql = sql;
      let paramIndex = 1;
      while (convertedSql.includes(`$${paramIndex}`)) {
        convertedSql = convertedSql.replace(`$${paramIndex}`, '?');
        paramIndex++;
      }

      // Replace PostgreSQL ILIKE with SQLite LIKE (case-insensitive by default for ASCII)
      convertedSql = convertedSql.replace(/\bILIKE\b/gi, 'LIKE');

      // Handle different query types
      const trimmedSql = convertedSql.trim().toLowerCase();

      if (trimmedSql.startsWith('select') || trimmedSql.includes('returning')) {
        // For SELECT queries or queries with RETURNING
        if (trimmedSql.includes('returning')) {
          // Handle INSERT/UPDATE/DELETE with RETURNING clause
          const returningMatch = convertedSql.match(/RETURNING\s+(.+?)$/i);
          if (returningMatch) {
            const mainSql = convertedSql.replace(/RETURNING\s+.+$/i, '').trim();
            const stmt = db.prepare(mainSql);
            const info = stmt.run(...params);

            // If it was an INSERT, get the last inserted row
            if (trimmedSql.startsWith('insert')) {
              const tableName = mainSql.match(/INSERT INTO\s+(\w+)/i)?.[1];
              if (tableName) {
                // Find the primary key column
                const pkInfo = db.prepare(`SELECT name FROM pragma_table_info('${tableName}') WHERE pk = 1`).get();
                const pkColumn = pkInfo?.name || 'rowid';
                const row = db.prepare(`SELECT * FROM ${tableName} WHERE ${pkColumn} = ?`).get(info.lastInsertRowid);
                resolve({ rows: row ? [row] : [], rowCount: 1 });
                return;
              }
            }
            // For UPDATE/DELETE with RETURNING
            if (trimmedSql.startsWith('update')) {
              // Try to get the updated row - need to know what was updated
              // Since SQLite doesn't return rows on UPDATE, we need to do a separate SELECT
              // For simplicity, return empty rows but with rowCount
              resolve({ rows: [], rowCount: info.changes });
              return;
            }
            if (trimmedSql.startsWith('delete')) {
              resolve({ rows: [], rowCount: info.changes });
              return;
            }
            resolve({ rows: [], rowCount: info.changes });
            return;
          }
        }
        const stmt = db.prepare(convertedSql);
        const rows = stmt.all(...params);
        resolve({ rows, rowCount: rows.length });
      } else {
        const stmt = db.prepare(convertedSql);
        const info = stmt.run(...params);
        resolve({ rows: [], rowCount: info.changes, lastInsertRowid: info.lastInsertRowid });
      }
    } catch (error) {
      console.error('SQL Error:', error.message);
      console.error('Query:', sql);
      console.error('Params:', params);
      reject(error);
    }
  });
}

module.exports = {
  query,
  db,
  pool: { query } // Alias for compatibility
};
