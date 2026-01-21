const Database = require('better-sqlite3');
const db = new Database('/Users/harry/1_listmgr/features.db');
const feature = db.prepare('SELECT * FROM features WHERE id = 64').get();
console.log(JSON.stringify(feature, null, 2));
db.close();
