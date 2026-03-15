export function upperClean(input: unknown): string {
  return String(input ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function upperCleanOrNull(input: unknown): string | null {
  const s = upperClean(input);
  return s ? s : null;
}

export function dedupeKey(input: unknown): string {
  return upperClean(input).replace(/[^A-Z0-9]/g, "");
}

export function canonicalProductName(input: unknown): string {
  let s = upperClean(input);
  s = s.replace(/(\d)\s*(KG)\b/g, "$1 KG");
  s = s.replace(/(\d)\s*(GR)\b/g, "$1 GR");
  s = s.replace(/(\d)\s*(G)\b/g, "$1 G");
  s = s.replace(/(\d)\s*(ML)\b/g, "$1 ML");
  s = s.replace(/(\d)\s*(L)\b/g, "$1 L");
  return s.replace(/\s+/g, " ").trim();
}
