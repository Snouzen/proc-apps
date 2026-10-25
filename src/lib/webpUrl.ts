/**
 * Converts an image URL (.png, .jpg, .jpeg, etc.) into a same-origin WebP optimizer URL
 * (/api/image/webp/<name>.webp?src=...) so the browser always receives image/webp.
 * Leaves .svg, .pdf, data:, blob:, and already-converted URLs untouched.
 */
export function toWebpUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/api/image/webp/")
  ) {
    return trimmed;
  }

  const cleanPath = trimmed.split("?")[0].split("#")[0];

  // Leave vector graphics and PDFs untouched
  if (/\.(svg|pdf)$/i.test(cleanPath)) {
    return trimmed;
  }

  // Local static .webp files in public/ can be served directly
  if (trimmed.startsWith("/") && /\.webp$/i.test(cleanPath)) {
    return trimmed;
  }

  const lastSegment = cleanPath.split("/").pop() || "image";
  const baseName =
    lastSegment
      .replace(/\.(png|jpe?g|gif|bmp|webp)$/i, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_") || "image";

  return `/api/image/webp/${encodeURIComponent(baseName)}.webp?src=${encodeURIComponent(trimmed)}`;
}
