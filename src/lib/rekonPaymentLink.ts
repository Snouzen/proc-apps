/** A link is stored/opened as a link; it is never downloaded or moved by Storage. */
export function normalizeRincianBayarLink(value: unknown): string | null {
  const invalid = () => Object.assign(new Error("Link rincian bayar tidak valid. Gunakan URL HTTPS lengkap, misalnya link Google Drive atau Google Sheets."), { name: "ValidationError" });
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw invalid();
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/[\u0000-\u0020\u007f\\]/.test(trimmed) || !/^https:\/\//i.test(trimmed)) throw invalid();
  let url: URL;
  try { url = new URL(trimmed); } catch { throw invalid(); }
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password) throw invalid();
  return url.href;
}
