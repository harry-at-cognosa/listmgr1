const db = require('./backend/db');

async function checkSections() {
  try {
    const result = await db.query('SELECT * FROM plsqt_sections');
    console.log('Sections in database:');
    console.log(JSON.stringify(result.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkSections();
