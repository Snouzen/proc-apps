
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const query = `
    SELECT "noPo", "buktiKirim", "buktiFp", "buktiTagih", "buktiBayar", "statusKirim", "statusFp"
    FROM "PurchaseOrder"
    WHERE "noPo" = 'adada';
  `;
  try {
    const res = await pool.query(query);
    console.log("RESULT FOR PO 'adada':");
    console.log(JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await pool.end();
  }
}

main();
