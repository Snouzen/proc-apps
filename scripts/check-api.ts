async function main() {
  try {
    const res = await fetch("http://localhost:3000/api/po");
    const json = await res.json();
    console.log("API Response Sample:", JSON.stringify(json.slice(0, 1), null, 2));
  } catch (e) {
    console.error("Fetch error:", e);
  }
}
main();
