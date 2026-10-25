import { supabaseAdmin } from "@/lib/supabase";
import { ValidationError } from "./rekonSaveService";

/**
 * Extracts the uploader ID from a file path or URL formatted as:
 * u_<uploaderId>_<timestamp>_<randomSuffix>.<ext>
 * Anchors from the end to avoid greedy matching when uploaderId contains underscores.
 */
export function extractFileOwnerFromPath(filePath: string): string | null {
  if (!filePath || typeof filePath !== "string") return null;
  const fileName = filePath.split("?")[0].split("#")[0].replace(/^.*[\/\\]/, "");
  const match = fileName.match(/^u_(.+)_\d+_[a-zA-Z0-9]+\.[a-zA-Z0-9]+$/);
  return match ? match[1] : null;
}

/**
 * Official Supabase origins configured in environment.
 */
function getOfficialSupabaseOrigins(): Set<string> {
  const origins = new Set<string>();
  const envUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (envUrl) {
    try {
      origins.add(new URL(envUrl).origin.toLowerCase());
    } catch {}
  }
  return origins;
}

/**
 * Extracts normalized storage path (temp/... or bukti-bayar/<rekonId>/...) from URL or relative path.
 * Rejects external or untrusted domains by validating origin using new URL() and matching official bucket prefix.
 */
export function extractStoragePathFromUrl(urlOrPath: string): string | null {
  if (!urlOrPath || typeof urlOrPath !== "string") return null;
  const trimmed = urlOrPath.trim();
  if (!trimmed) return null;

  let internalPath = "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    // 1. Absolute URL validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      return null;
    }

    const officialOrigins = getOfficialSupabaseOrigins();
    if (officialOrigins.size === 0 || !officialOrigins.has(parsedUrl.origin.toLowerCase())) {
      // Rejects foreign domain / origin (e.g. foreign.invalid) or when official origin is not configured
      return null;
    }

    const pathname = decodeURIComponent(parsedUrl.pathname);
    const STORAGE_PREFIXES = [
      "/storage/v1/object/public/bukti_bayar_rekon/",
      "/storage/v1/object/sign/bukti_bayar_rekon/",
      "/storage/v1/object/authenticated/bukti_bayar_rekon/",
      "/storage/v1/object/bukti_bayar_rekon/"
    ];

    const matchedPrefix = STORAGE_PREFIXES.find((prefix) => pathname.startsWith(prefix));
    if (!matchedPrefix) {
      return null;
    }

    internalPath = pathname.slice(matchedPrefix.length);
  } else {
    // 2. Relative internal path validation
    internalPath = trimmed.split("?")[0].split("#")[0].replace(/^\/+/, "");
  }

  // Reject path traversal and illegal characters
  if (!internalPath || internalPath.includes("..") || internalPath.includes("\\") || internalPath.includes("//")) {
    return null;
  }

  // Must match either temp/<filename> or bukti-bayar/<rekonId>/<filename>
  const match = internalPath.match(/^(temp\/[^/]+|bukti-bayar\/[^/]+\/[^/]+)$/);
  return match ? match[1] : null;
}

/**
 * Validates bucket, path, uploader ownership, and binding to other reconciles.
 */
export async function validateProofFile(
  urlOrPath: string,
  targetRekonId: string,
  currentUserId: string,
  userRole: string,
  tx: any
): Promise<{ storagePath: string; fileName: string; isTemp: boolean } | null> {
  if (!urlOrPath || typeof urlOrPath !== "string" || !urlOrPath.trim()) {
    return null;
  }

  const storagePath = extractStoragePathFromUrl(urlOrPath);
  if (!storagePath) {
    throw new ValidationError(`URL berkas bukti bayar tidak valid atau bukan berasal dari penyimpanan resmi: ${urlOrPath}`);
  }

  if (storagePath.includes("..") || storagePath.includes("//")) {
    throw new ValidationError("Path berkas bukti bayar tidak aman.");
  }

  const fileName = storagePath.split("/").pop() || "";
  const isTemp = storagePath.startsWith("temp/");

  // 1. Verify ownership for non-pusat users
  if (userRole !== "pusat") {
    const fileOwnerId = extractFileOwnerFromPath(fileName);
    if (!fileOwnerId) {
      throw new ValidationError(`Berkas "${fileName}" tidak memiliki identitas pengunggah yang valid.`);
    }
    if (fileOwnerId !== currentUserId) {
      throw new ValidationError(`Anda tidak memiliki wewenang untuk menggunakan berkas unggahan milik pengguna lain (${fileName}).`);
    }
  }

  // 2. Verify attachment status in database
  const boundRekon = await tx.reconcile.findFirst({
    where: {
      id: { not: targetRekonId },
      OR: [
        { buktiBayarUrl: { contains: fileName } },
        { rincianBayarUrl: { contains: fileName } }
      ]
    },
    select: { id: true, noRekonsiliasi: true }
  });

  if (boundRekon) {
    throw new ValidationError(`Berkas "${fileName}" sudah terikat pada rekonsiliasi ${boundRekon.noRekonsiliasi || boundRekon.id}.`);
  }

  return { storagePath, fileName, isTemp };
}

/**
 * Safely finalizes a temp upload by moving it to permanent storage with idempotency and tracking.
 */
export async function safelyFinalizeProofFile(
  storagePath: string,
  fileName: string,
  targetRekonId: string,
  movedTracker: Array<{ fromPath: string; toPath: string }>
): Promise<string> {
  const bucket = "bukti_bayar_rekon";
  const toPath = `bukti-bayar/${targetRekonId}/${fileName}`;
  const toFolder = `bukti-bayar/${targetRekonId}`;

  // If already at a permanent destination, return its public URL directly
  if (!storagePath.startsWith("temp/")) {
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath);
    return data?.publicUrl || storagePath;
  }

  // Idempotency check: if destination already has the file (e.g. from prior save or retry), use it directly.
  // Note: DO NOT add pre-existing file to movedTracker.
  // If it was moved earlier in this same operation (during a prior retry attempt),
  // it was already recorded in movedTracker when the move succeeded.
  const { data: destFiles } = await supabaseAdmin.storage
    .from(bucket)
    .list(toFolder, { search: fileName, limit: 10 });

  if (destFiles?.some((f: any) => f.name === fileName)) {
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(toPath);
    return data.publicUrl;
  }

  // Execute atomic move
  const { error: moveErr } = await supabaseAdmin.storage
    .from(bucket)
    .move(storagePath, toPath);

  if (!moveErr) {
    if (!movedTracker.some((m) => m.toPath === toPath)) {
      movedTracker.push({ fromPath: storagePath, toPath });
    }
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(toPath);
    return data.publicUrl;
  }

  // If move failed, recheck if file ended up at destination
  const { data: retryCheck } = await supabaseAdmin.storage
    .from(bucket)
    .list(toFolder, { search: fileName, limit: 10 });
  if (retryCheck?.some((f: any) => f.name === fileName)) {
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(toPath);
    return data.publicUrl;
  }

  throw new Error(`Gagal memindahkan berkas bukti bayar ke lokasi permanen: ${moveErr.message}`);
}

export interface RollbackResult {
  success: boolean;
  restored: Array<{ fromPath: string; toPath: string }>;
  failed: Array<{ fromPath: string; toPath: string; error: string }>;
}

/**
 * Reverts any files moved during a failed transaction back to their original temporary location.
 * Checks { error } on .move() result, splices only successfully rolled back items,
 * and maintains failed items in movedTracker for caller recovery.
 */
export async function rollbackFinalizedFiles(
  movedTracker: Array<{ fromPath: string; toPath: string }>
): Promise<RollbackResult> {
  const result: RollbackResult = {
    success: true,
    restored: [],
    failed: []
  };

  if (!movedTracker || movedTracker.length === 0) return result;

  const bucket = "bukti_bayar_rekon";
  for (let i = movedTracker.length - 1; i >= 0; i--) {
    const item = movedTracker[i];
    try {
      const { error } = await supabaseAdmin.storage
        .from(bucket)
        .move(item.toPath, item.fromPath);

      if (error) {
        console.error(`[RekonSave] Gagal rollback berkas storage dari ${item.toPath} ke ${item.fromPath}:`, error.message);
        result.failed.push({ ...item, error: error.message });
        result.success = false;
        // Keep in movedTracker so caller retains knowledge of unrecovered file!
      } else {
        console.warn(`[RekonSave] Berhasil rollback berkas storage: dipindahkan kembali dari ${item.toPath} ke ${item.fromPath}`);
        result.restored.push(item);
        movedTracker.splice(i, 1);
      }
    } catch (rbErr: any) {
      const msg = rbErr?.message || String(rbErr);
      console.error(`[RekonSave] Gagal rollback berkas storage dari ${item.toPath} ke ${item.fromPath}:`, msg);
      result.failed.push({ ...item, error: msg });
      result.success = false;
      // Keep in movedTracker!
    }
  }

  return result;
}
