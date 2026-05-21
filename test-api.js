
const { GET } = require('./src/app/api/rekon/route.ts');
async function run() {
  const req = new Request('http://localhost:3000/api/rekon?page=1&limit=10');
  const res = await GET(req);
  console.log('Status:', res.status);
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}
run().catch(console.error);

