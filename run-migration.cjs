const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = fs.readFileSync('db/migrations/0024_email_signatures.sql', 'utf8');

pool.query(sql)
  .then(() => {
    console.log('✅ Migration 0024_email_signatures.sql completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
