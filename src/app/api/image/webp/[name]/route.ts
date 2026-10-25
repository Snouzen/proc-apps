import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

interface CachedWebpEntry {
  buffer: Buffer;
  etag: string;
  expiresAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_ENTRIES = 250;

const globalForWebpCache = globalThis as unknown as {
  webpImageCache?: Map<string, CachedWebpEntry>;
  webpImageInFlight?: Map<string, Promise<CachedWebpEntry>>;
};

const webpCache =
  globalForWebpCache.webpImageCache ||
  new Map<string, CachedWebpEntry>();
const webpInFlight =
  globalForWebpCache.webpImageInFlight ||
  new Map<string, Promise<CachedWebpEntry>>();

globalForWebpCache.webpImageCache = webpCache;
globalForWebpCache.webpImageInFlight = webpInFlight;

function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("169.254.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function fetchSourceBuffer(src: string): Promise<Buffer> {
  if (src.startsWith("/")) {
    const cleanRel = src.split("?")[0].split("#")[0].replace(/^\/+/, "");
    if (cleanRel.includes("..") || cleanRel.includes("\\")) {
      throw new Error("Invalid relative path");
    }
    const publicDir = path.resolve(process.cwd(), "public");
    const fullPath = path.resolve(publicDir, cleanRel);
    if (!fullPath.startsWith(publicDir)) {
      throw new Error("Path outside public directory");
    }
    return await fs.readFile(fullPath);
  }

  if (!isSafeExternalUrl(src)) {
    throw new Error("Blocked or invalid image URL");
  }

  const res = await fetch(src, {
    headers: { Accept: "image/webp,image/png,image/jpeg,image/*;q=0.8" },
  });

  if (!res.ok) {
    throw new Error(`Upstream image returned status ${res.status}`);
  }

  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

async function getOrConvertWebp(src: string): Promise<CachedWebpEntry> {
  const now = Date.now();
  const cached = webpCache.get(src);
  if (cached && cached.expiresAt > now) {
    return cached;
  }

  const existingInFlight = webpInFlight.get(src);
  if (existingInFlight) {
    return existingInFlight;
  }

  const task = (async (): Promise<CachedWebpEntry> => {
    try {
      const inputBuffer = await fetchSourceBuffer(src);
      const sharpModule = await import("sharp");
      const sharp = sharpModule.default || (sharpModule as any);

      const webpBuffer: Buffer = await sharp(inputBuffer)
        .rotate()
        .resize({
          width: 800,
          height: 800,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 88, alphaQuality: 95, effort: 4 })
        .toBuffer();

      const etag = `"${crypto.createHash("sha1").update(webpBuffer).digest("hex")}"`;
      const entry: CachedWebpEntry = {
        buffer: webpBuffer,
        etag,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };

      if (webpCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = webpCache.keys().next().value;
        if (oldestKey) webpCache.delete(oldestKey);
      }
      webpCache.set(src, entry);
      return entry;
    } finally {
      webpInFlight.delete(src);
    }
  })();

  webpInFlight.set(src, task);
  return task;
}

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src")?.trim() || "";
  if (!src) {
    return new NextResponse("Missing src parameter", { status: 400 });
  }

  try {
    const entry = await getOrConvertWebp(src);
    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === entry.etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: entry.etag,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    return new NextResponse(new Uint8Array(entry.buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(entry.buffer.length),
        ETag: entry.etag,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Image not found or could not be converted", {
      status: 404,
    });
  }
}
