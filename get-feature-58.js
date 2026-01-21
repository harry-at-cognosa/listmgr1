const db = require('better-sqlite3')('/Users/harry/1_listmgr/features.db');
const row = db.prepare('SELECT * FROM features WHERE id = 58').get();
console.log(JSON.stringify(row, null, 2));
