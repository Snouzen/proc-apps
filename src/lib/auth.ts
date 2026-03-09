import { createHmac, randomBytes } from "crypto";

export type Role = "pusat" | "rm";

export interface SessionPayload {
  email: string;
  role: Role;
  regional?: string | null;
  exp: number;
  jti: string;
}

function getAuthSecret(): string {
  return process.env.AUTH_SECRET || "dev-secret-change-me";
}

function getExpectedCredentials(): { email: string; password: string } {
  const email = process.env.AUTH_EMAIL || "gmi_27001@bulog.co.id";
  const password = process.env.AUTH_PASSWORD || "password";
  return { email, password };
}

export function authenticate(
  email: string,
  password: string,
): { ok: true; payload: SessionPayload } | { ok: false } {
  // Normalize email
  let lower = email.toLowerCase().trim();
  if (!lower.includes("@")) {
    lower = `${lower}@bulog.co.id`;
  }
  // STRICT mapping as requested
  const PASS = "password";
  const map: Record<
    string,
    { role: Role; regional: string | null }
  > = {
    "gmi_27001@bulog.co.id": { role: "pusat", regional: null },
    "rmi_27001@bulog.co.id": { role: "rm", regional: "Regional 1 Bandung" },
    "rmii_27001@bulog.co.id": { role: "rm", regional: "Regional 2 Surabaya" },
    "rmiii_27001@bulog.co.id": { role: "rm", regional: "Regional 3 Makassar" },
  };
  const entry = map[lower];
  if (entry && password === PASS) {
    const payload: SessionPayload = {
      email: lower,
      role: entry.role,
      regional: entry.regional,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      jti: randomBytes(8).toString("hex"),
    };
    return { ok: true, payload };
  }
  // Fallback to env credentials for pusat (optional)
  const expected = getExpectedCredentials();
  if (lower === expected.email.toLowerCase() && password === expected.password) {
    const payload: SessionPayload = {
      email: lower,
      role: "pusat",
      regional: null,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      jti: randomBytes(8).toString("hex"),
    };
    return { ok: true, payload };
  }
  return { ok: false };
}

export function signSession(payload: SessionPayload): string {
  const secret = getAuthSecret();
  const base = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(base).digest("base64url");
  return `${base}.${sig}`;
}

export function verifySession(
  token: string | undefined,
): SessionPayload | null {
  if (!token) return null;
  const [base, sig] = token.split(".");
  if (!base || !sig) return null;
  const secret = getAuthSecret();
  const expectedSig = createHmac("sha256", secret)
    .update(base)
    .digest("base64url");
  if (sig !== expectedSig) return null;
  try {
    const payload: SessionPayload = JSON.parse(
      Buffer.from(base, "base64url").toString("utf8"),
    );
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Edge-runtime compatible helpers using Web Crypto API
function toBase64UrlFromBytes(bytes: ArrayBuffer): string {
  let binary = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.byteLength; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+/g, "");
}

async function hmacSHA256Edge(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return toBase64UrlFromBytes(signature);
}

export async function verifySessionEdge(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [base, sig] = token.split(".");
  if (!base || !sig) return null;
  try {
    const expected = await hmacSHA256Edge(getAuthSecret(), base);
    if (sig !== expected) return null;
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(base.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
        c.charCodeAt(0),
      ),
    );
    const payload: SessionPayload = JSON.parse(json);
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
