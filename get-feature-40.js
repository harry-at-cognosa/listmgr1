const sqlite3 = require('better-sqlite3');
const db = sqlite3('./features.db');
const feature = db.prepare('SELECT * FROM features WHERE id = 40').get();
console.log(JSON.stringify(feature, null, 2));
