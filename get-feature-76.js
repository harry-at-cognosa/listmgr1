const Database = require('better-sqlite3');
const db = new Database('/Users/harry/1_listmgr/features.db');
const row = db.prepare('SELECT * FROM features WHERE id = 76').get();
console.log(JSON.stringify(row, null, 2));
