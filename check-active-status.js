const db = require('./backend/db');

(async () => {
  const result = await db.query('SELECT plsqt_id, plsqt_name, plsqt_active FROM plsq_templates ORDER BY plsqt_name');
  console.log('ID | Active | Name');
  console.log('---|--------|-----');
  result.rows.forEach(r => console.log(r.plsqt_id + ' | ' + r.plsqt_active + ' | ' + r.plsqt_name));
  console.log('\nTotal templates:', result.rows.length);
  console.log('Active (1):', result.rows.filter(r => r.plsqt_active === 1).length);
  console.log('Inactive (0):', result.rows.filter(r => r.plsqt_active === 0).length);
  process.exit(0);
})();
