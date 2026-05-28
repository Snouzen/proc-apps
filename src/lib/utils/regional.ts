export function getRegionalSynonyms(input: string): string[] {
  if (!input) return [];
  const rp = input.trim().toLowerCase();
  
  if (
    rp.includes("bandung") ||
    rp.includes("reg 1") ||
    rp.includes("regional 1") ||
    rp.includes(" i")
  ) {
    return ["reg 1", "regional 1", "reg i", "regional i", "bandung"];
  }
  
  if (
    rp.includes("surabaya") ||
    rp.includes("reg 2") ||
    rp.includes("regional 2") ||
    rp.includes(" ii")
  ) {
    return ["reg 2", "regional 2", "reg ii", "regional ii", "surabaya"];
  }
  
  if (
    rp.includes("makassar") ||
    rp.includes("reg 3") ||
    rp.includes("regional 3") ||
    rp.includes(" iii")
  ) {
    return ["reg 3", "regional 3", "reg iii", "regional iii", "makassar"];
  }
  
  return [input.trim()];
}
