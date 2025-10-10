const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query(`
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'users' 
  AND column_name IN ('email_signature', 'email_signature_enabled')
`)
  .then((result) => {
    console.log('Columns found:', result.rows);
    if (result.rows.length === 0) {
      console.log('❌ Signature columns DO NOT exist in users table');
      console.log('Migration may have failed. Re-run: node run-migration.cjs');
    } else {
      console.log('✅ Signature columns exist:', result.rows.map(r => r.column_name).join(', '));
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Error checking columns:', err);
    process.exit(1);
  });
