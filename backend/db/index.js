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
      // PostgreSQL allows reusing $1 multiple times; SQLite needs ? for each occurrence
      let convertedSql = sql;
      let convertedParamsList = [];
      let paramIndex = 1;

      // First, find the max param index used
      let maxParamIndex = 0;
      for (let i = 1; i <= 50; i++) {
        if (sql.includes(`$${i}`)) maxParamIndex = i;
      }

      // Replace each $N with ? and track which param goes where
      // We need to replace from highest to lowest to avoid $1 matching in $10, $11, etc.
      for (let i = maxParamIndex; i >= 1; i--) {
        const regex = new RegExp(`\\$${i}`, 'g');
        const matches = (convertedSql.match(regex) || []).length;
        // We'll do the actual replacement after building the param list
      }

      // Now do sequential replacement and build expanded params array
      // Parse the SQL left to right, finding $N patterns and building the expanded params
      let resultSql = '';
      let lastIndex = 0;
      const paramRegex = /\$(\d+)/g;
      let match;

      while ((match = paramRegex.exec(sql)) !== null) {
        resultSql += sql.slice(lastIndex, match.index) + '?';
        const paramNum = parseInt(match[1], 10);
        convertedParamsList.push(params[paramNum - 1]); // $1 is params[0]
        lastIndex = match.index + match[0].length;
      }
      resultSql += sql.slice(lastIndex);
      convertedSql = resultSql;

      // Replace PostgreSQL ILIKE with SQLite LIKE (case-insensitive by default for ASCII)
      convertedSql = convertedSql.replace(/\bILIKE\b/gi, 'LIKE');

      // Convert params to SQLite-compatible types (booleans to integers, undefined to null)
      // Use convertedParamsList if we did parameter expansion, otherwise use original params
      const paramsToConvert = convertedParamsList.length > 0 ? convertedParamsList : params;
      const convertedParams = paramsToConvert.map(p => {
        if (p === undefined) return null;
        if (typeof p === 'boolean') return p ? 1 : 0;
        return p;
      });

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
            const info = stmt.run(...convertedParams);

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
        const rows = stmt.all(...convertedParams);
        resolve({ rows, rowCount: rows.length });
      } else {
        const stmt = db.prepare(convertedSql);
        const info = stmt.run(...convertedParams);
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
