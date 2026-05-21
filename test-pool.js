
require('dotenv').config();
const pg = require('pg');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL.replace('&sslmode=require', ''),
  ssl: { rejectUnauthorized: false }
});
pool.query('SELECT 1').then(() => {
  console.log('SUCCESS');
  pool.end();
}).catch(e => {
  console.log('ERROR:', e.message);
  pool.end();
});

