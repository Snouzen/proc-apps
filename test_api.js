require('dotenv').config();
const http = require('http');

async function main() {
  const url = 'http://localhost:3000/api/rekon/lookup?companyName=PT%20RAMAYANA%20LESTARI%20SENTOSA&ritelId=8eeac062-04e8-417e-b069-c72c7ffd46da';
  http.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('Total invoices returned:', json.invoices ? json.invoices.length : 0);
        console.log('Invoices containing INV/1741/04/2026/27100:');
        const target = (json.invoices || []).filter(i => i.noInvoice === 'INV/1741/04/2026/27100');
        console.log(target);
      } catch(e) {
         console.log('Error parsing JSON:', data);
      }
    });
  }).on('error', (err) => {
    console.log('Error: ', err.message);
  });
}
main();
