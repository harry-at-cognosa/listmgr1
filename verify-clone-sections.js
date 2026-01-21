const Database = require('better-sqlite3');
const db = new Database('./backend/data/listmgr.db');

// Get sections for original template (ID 2)
const originalSections = db.prepare('SELECT plsqts_id, plsqt_id, plsqt_seqn, plsqts_status FROM plsqt_sections WHERE plsqt_id = 2 ORDER BY plsqt_seqn').all();
console.log('Original Template (ID 2) Sections:');
console.log(JSON.stringify(originalSections, null, 2));

// Get sections for cloned template (ID 31)
const clonedSections = db.prepare('SELECT plsqts_id, plsqt_id, plsqt_seqn, plsqts_status FROM plsqt_sections WHERE plsqt_id = 31 ORDER BY plsqt_seqn').all();
console.log('\nCloned Template (ID 31) Sections:');
console.log(JSON.stringify(clonedSections, null, 2));

// Verify original template status unchanged
const originalTemplate = db.prepare('SELECT plsqt_id, plsqt_name, plsqt_status FROM plsq_templates WHERE plsqt_id = 2').get();
console.log('\nOriginal Template:');
console.log(JSON.stringify(originalTemplate, null, 2));

// Verify cloned template status
const clonedTemplate = db.prepare('SELECT plsqt_id, plsqt_name, plsqt_status FROM plsq_templates WHERE plsqt_id = 31').get();
console.log('\nCloned Template:');
console.log(JSON.stringify(clonedTemplate, null, 2));

db.close();
