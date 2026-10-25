/**
 * Helper to sanitize redirect targets and prevent Open Redirect vulnerabilities.
 * Ensures the target URL strictly resolves to an internal relative path on the same origin.
 */
export function sanitizeInternalRedirect(target: string | null | undefined): string {
  if (!target || typeof target !== "string") return "/";
  const trimmed = target.trim();
  
  // Must start with single slash, and must not start with //, /\, or \
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("\\")
  ) {
    return "/";
  }

  // Reject dangerous schemes or control characters
  const lower = trimmed.toLowerCase();
  if (
    lower.includes("javascript:") ||
    lower.includes("data:") ||
    lower.includes("vbscript:")
  ) {
    return "/";
  }

  try {
    // Parse against a dummy base origin to test resolution
    const dummyBase = "http://localhost";
    const parsed = new URL(trimmed, dummyBase);
    
    // Ensure origin did not change (must remain localhost)
    if (parsed.origin !== dummyBase) {
      return "/";
    }

    // Must be a relative path
    const path = parsed.pathname + parsed.search + parsed.hash;
    if (!path.startsWith("/") || path.startsWith("//")) {
      return "/";
    }

    return path;
  } catch {
    return "/";
  }
}
