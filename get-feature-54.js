const db = require('better-sqlite3')('/Users/harry/1_listmgr/features.db');
const f = db.prepare('SELECT * FROM features WHERE id = 54').get();
console.log(JSON.stringify(f, null, 2));
