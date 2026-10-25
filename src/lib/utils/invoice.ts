/**
 * Shared invoice canonicalization and evaluation utilities.
 * Safe for use in both server-side and client-side environments (no Node/DB dependencies).
 */

/**
 * Canonical empty values for matching against query builders or sets.
 */
export const CANONICAL_EMPTY_INVOICE_STRINGS = ["", "-", "unknown", "none"] as const;

/**
 * Returns a canonical invoice number string, or null if the invoice represents an empty/unset invoice.
 * Canonical empty values: null, undefined, empty string "", "-", whitespace-only (spaces/tabs), "unknown", "none" (case-insensitive).
 */
export function canonicalInvoiceNumber(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (str === "" || str === "-") return null;
  const lower = str.toLowerCase();
  if (lower === "unknown" || lower === "none") return null;
  return str;
}

/**
 * Evaluates whether an invoice number is considered empty/unset.
 * Returns true for null, undefined, whitespace, "-", "unknown", "none" (case-insensitive).
 */
export function isInvoiceEmpty(noInvoice: unknown): boolean {
  return canonicalInvoiceNumber(noInvoice) === null;
}
