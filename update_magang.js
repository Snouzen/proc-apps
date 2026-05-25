require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    const res = await pool.query(
      "UPDATE \"User\" SET email = $1 WHERE email = $2 RETURNING email",
      ['adminsales1@bulog.co.id', 'magang@bulog.co.id']
    );
    console.log("Updated users:", res.rows);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

main();
