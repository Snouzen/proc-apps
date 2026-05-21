const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.mytkqzkpywdrpnrgafss:Bulog13579%21%40%23@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require' });
async function test() {
  try {
    const res2 = await pool.query('SELECT id, invoices, rtvs, notes FROM "reconciliations" ORDER BY "createdAt" DESC LIMIT 5');
    console.log("Reconciles:", JSON.stringify(res2.rows, null, 2));
  } catch(e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
test();
