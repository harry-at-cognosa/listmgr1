const sqlite3 = require('better-sqlite3');
const db = new sqlite3('/Users/harry/1_listmgr/features.db');
const row = db.prepare('SELECT * FROM features WHERE id = 84').get();
console.log(JSON.stringify(row, null, 2));
