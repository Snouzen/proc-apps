import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionWithRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { extractFileOwnerFromPath } from "../services/rekonFileUtils";
import { hasPermission } from "@/lib/accessControl";
import { checkReconcileAccess } from "../services/rekonAccessHelper";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp"
];

const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "webp"];

const EXACT_MIME_MAP: Record<string, string[]> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  webp: ["image/webp"],
};

function detectAndValidateFormat(buffer: Buffer): { ext: string; mime: string } | null {
  if (buffer.length < 32) return null;

  // 1. PDF: %PDF- header, valid startxref byte offset pointing to xref table / XRef stream, and object structure
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    const tail = buffer.subarray(Math.max(0, buffer.length - 2048)).toString("latin1");
    // Standard PDF requires startxref preceding %%EOF
    const startXrefMatch = tail.match(/startxref[\r\n\s]+(\d+)[\r\n\s]+%%EOF/i);
    if (!startXrefMatch) {
      return null;
    }

    const xrefOffset = parseInt(startXrefMatch[1], 10);
    if (isNaN(xrefOffset) || xrefOffset <= 0 || xrefOffset >= buffer.length) {
      return null;
    }

    // Inspect the byte target at xrefOffset: must contain classic "xref" table or "/XRef" object stream
    const xrefTargetChunk = buffer.subarray(xrefOffset, Math.min(buffer.length, xrefOffset + 256)).toString("latin1").trimStart();
    const isClassicXref = /^xref[\r\n\s]/.test(xrefTargetChunk);
    const isStreamXref = /^\d+\s+\d+\s+obj/.test(xrefTargetChunk) && xrefTargetChunk.includes("/XRef");
    if (!isClassicXref && !isStreamXref) {
      return null;
    }

    // Check for valid object definitions: must contain at least one valid "\d+ \d+ obj ... endobj"
    const bodyChunk = buffer.subarray(0, Math.min(buffer.length, 32768)).toString("latin1");
    if (!/\d+\s+\d+\s+obj[\s\S]*?endobj/.test(bodyChunk)) {
      return null;
    }

    return { ext: "pdf", mime: "application/pdf" };
  }

  // 2. PNG: 8-byte signature + IHDR header + IEND footer
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    const hasIhdr = buffer.subarray(12, 16).toString("ascii") === "IHDR";
    const hasIend = buffer.subarray(Math.max(0, buffer.length - 16)).toString("ascii").includes("IEND");
    if (!hasIhdr || !hasIend) {
      return null;
    }
    return { ext: "png", mime: "image/png" };
  }

  // 3. JPEG: SOI marker (0xFF, 0xD8, 0xFF) and EOI marker (0xFF, 0xD9)
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    const len = buffer.length;
    if (buffer[len - 2] !== 0xFF || buffer[len - 1] !== 0xD9) {
      return null;
    }
    return { ext: "jpg", mime: "image/jpeg" };
  }

  // 4. WEBP: RIFF + WEBP + VP8 chunk
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    const vp8Header = buffer.subarray(12, 16).toString("ascii");
    if (vp8Header !== "VP8 " && vp8Header !== "VP8L" && vp8Header !== "VP8X") {
      return null;
    }
    return { ext: "webp", mime: "image/webp" };
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { role: safeRole } = auth;

    const canUpload =
      (await hasPermission(safeRole, "rekon_upload")) ||
      (await hasPermission(safeRole, "rekon_calc_save"));
    if (!canUpload) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki izin mengunggah berkas bukti pembayaran rekonsiliasi (rekon_upload)" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const rawRekonId = formData.get("rekonId") as string;

    if (!file) {
      return NextResponse.json({ error: "File bukti pembayaran wajib disertakan." }, { status: 400 });
    }

    // 1. Validasi Ukuran File (Strict 2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran file terlalu besar. Maksimum 2MB." }, { status: 400 });
    }

    // Convert File to Buffer for binary format inspection
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Structural Binary Format Verification
    const detected = detectAndValidateFormat(buffer);
    if (!detected) {
      return NextResponse.json({
        error: "File korup atau struktur biner tidak valid. Hanya file asli PDF, PNG, JPG, dan WEBP yang utuh yang diizinkan."
      }, { status: 400 });
    }

    // 3. Validasi Tipe MIME Tepat (Exact Whitelist) dan Ekstensi File
    const originalExt = (file.name.split(".").pop() || "").toLowerCase().trim();
    const mimeType = (file.type || "").toLowerCase().trim();

    const allowedMimes = EXACT_MIME_MAP[detected.ext] || [];
    const mimeMatches = allowedMimes.includes(mimeType);

    const extMatches =
      (detected.ext === "pdf" && originalExt === "pdf") ||
      (detected.ext === "png" && originalExt === "png") ||
      (detected.ext === "jpg" && (originalExt === "jpg" || originalExt === "jpeg")) ||
      (detected.ext === "webp" && originalExt === "webp");

    if (!mimeMatches || !extMatches) {
      return NextResponse.json({
        error: "Ekstensi file, tipe MIME, dan tanda tangan biner berkas tidak cocok. Format tidak valid."
      }, { status: 400 });
    }

    // 4. Validasi dan sanitasi rekonId serta verifikasi data
    const cleanRekonId = (rawRekonId || "new").replace(/[^a-zA-Z0-9_-]/g, "");
    if (cleanRekonId !== "new") {
      const existingRekon = await prisma.reconcile.findUnique({
        where: { id: cleanRekonId },
        select: {
          id: true,
          noRekonsiliasi: true,
          ritelId: true,
          invoices: true,
          rtvs: true,
          rtvDetails: true,
        },
      });
      if (!existingRekon) {
        return NextResponse.json({ error: "Data rekonsiliasi tidak ditemukan." }, { status: 404 });
      }

      const accessCheck = await checkReconcileAccess(existingRekon, auth);
      if (!accessCheck.allowed) {
        return NextResponse.json(
          { error: accessCheck.reason || "Forbidden: Anda tidak memiliki wewenang atas data rekonsiliasi ini" },
          { status: 403 }
        );
      }
    }

    // 5. Otomatis konversi berkas gambar (PNG / JPG / WEBP) menjadi format WebP yang lebih ringan
    let uploadBuffer: Buffer = buffer;
    let finalExt = detected.ext;
    let finalMime = detected.mime;

    if (detected.ext !== "pdf") {
      try {
        const sharpModule = await import("sharp");
        const sharp = sharpModule.default || (sharpModule as any);
        uploadBuffer = await sharp(buffer)
          .rotate()
          .resize({
            width: 1920,
            height: 1920,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 82, alphaQuality: 90, effort: 4 })
          .toBuffer();
        finalExt = "webp";
        finalMime = "image/webp";
      } catch (convErr) {
        console.warn("Gagal mengonversi gambar ke WebP, menggunakan format asli:", convErr);
      }
    }

    // 6. Generate secure, unique filename with uploader ID and temp / permanent prefix separation
    const uploaderId = String(auth.dbUser?.id || auth.email || "unknown").replace(/[^a-zA-Z0-9_-]/g, "");
    const randomSuffix = crypto.randomBytes(6).toString("hex");
    const timestamp = Date.now();
    const prefix = cleanRekonId === "new" ? "temp" : `bukti-bayar/${cleanRekonId}`;
    const fileName = `${prefix}/u_${uploaderId}_${timestamp}_${randomSuffix}.${finalExt}`;

    let uploadedStoragePath: string | null = null;
    try {
      // Upload to Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from("bukti_bayar_rekon")
        .upload(fileName, uploadBuffer, {
          contentType: finalMime,
          upsert: true,
          metadata: {
            ownerId: uploaderId,
            uploadedAt: String(timestamp)
          }
        });

      if (error) {
        console.error("Supabase Upload Error:", error);
        return NextResponse.json({ error: `Upload gagal: ${error.message}` }, { status: 500 });
      }
      uploadedStoragePath = data.path;

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from("bukti_bayar_rekon")
        .getPublicUrl(data.path);

      // Auto-link to existing rekon record if modifying an existing rekon
      if (cleanRekonId !== "new") {
        await prisma.reconcile.update({
          where: { id: cleanRekonId },
          data: { buktiBayarUrl: urlData.publicUrl }
        });
      }

      return NextResponse.json({ 
        success: true, 
        url: urlData.publicUrl 
      });
    } catch (innerErr: any) {
      if (uploadedStoragePath) {
        try {
          await supabaseAdmin.storage.from("bukti_bayar_rekon").remove([uploadedStoragePath]);
        } catch (cleanupErr) {
          console.error("Failed to clean up orphaned storage file:", cleanupErr);
        }
      }
      throw innerErr;
    } finally {
      // Non-blocking background lifecycle cleanup of stale files in 'temp/'
      cleanupStaleTempUploads().catch((err) =>
        console.error("Failed to run background cleanup for temp files:", err)
      );
    }
  } catch (error: any) {
    console.error("Upload API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Storage lifecycle cleanup helper: purges abandoned files in 'temp/' older than 24 hours,
 * strictly skipping files that are already bound/referenced by existing reconcile records.
 */
async function cleanupStaleTempUploads(maxAgeMs = 24 * 60 * 60 * 1000): Promise<{ removed: number }> {
  try {
    const { data: files, error } = await supabaseAdmin.storage
      .from("bukti_bayar_rekon")
      .list("temp", { limit: 100 });

    if (error || !files || files.length === 0) return { removed: 0 };

    const now = Date.now();
    const filesToDelete: string[] = [];

    // Query DB to find all currently saved reconcile proof files to prevent deleting legitimate receipts
    const activeRekons = await prisma.reconcile.findMany({
      where: {
        OR: [
          { buktiBayarUrl: { contains: "temp/" } },
          { rincianBayarUrl: { contains: "temp/" } }
        ]
      },
      select: { buktiBayarUrl: true, rincianBayarUrl: true }
    });

    const activeTempNames = new Set<string>();
    for (const r of activeRekons) {
      if (r.buktiBayarUrl) {
        const name = r.buktiBayarUrl.split("/").pop();
        if (name) activeTempNames.add(name);
      }
      if (r.rincianBayarUrl) {
        const name = r.rincianBayarUrl.split("/").pop();
        if (name) activeTempNames.add(name);
      }
    }

    for (const file of files) {
      // NEVER delete files that are referenced in saved reconciles!
      if (activeTempNames.has(file.name)) {
        continue;
      }

      // Check age: filename format u_<userId>_<timestamp>_<random>.<ext> or legacy <timestamp>_<random>.<ext>
      const match = file.name.match(/_(\d{10,15})_[a-zA-Z0-9]+\.[a-zA-Z0-9]+$/);
      const timestampMatch = match ? match[1] : (file.name.match(/^(\d{10,15})_/)?.[1] || null);

      if (timestampMatch) {
        const fileTime = parseInt(timestampMatch, 10);
        if (now - fileTime > maxAgeMs) {
          filesToDelete.push(`temp/${file.name}`);
        }
      } else if (file.created_at) {
        const fileTime = new Date(file.created_at).getTime();
        if (now - fileTime > maxAgeMs) {
          filesToDelete.push(`temp/${file.name}`);
        }
      }
    }

    if (filesToDelete.length > 0) {
      await supabaseAdmin.storage
        .from("bukti_bayar_rekon")
        .remove(filesToDelete);
      console.log(`[LifecycleCleanup] Removed ${filesToDelete.length} stale temporary upload(s) from 'temp/'`);
    }

    return { removed: filesToDelete.length };
  } catch (err) {
    console.error("[LifecycleCleanup] Error purging stale temp uploads:", err);
    return { removed: 0 };
  }
}

/**
 * DELETE route: allows cancelling client-side forms to purge their own unlinked temp files.
 * Validates session, role, file ownership, and verifies that the file is not already linked to a reconcile.
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getSessionWithRole(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("filePath");

    if (filePath) {
      if (!filePath.startsWith("temp/")) {
        return NextResponse.json(
          { error: "Hanya berkas di direktori 'temp/' yang dapat dihapus melalui jalur ini." },
          { status: 400 }
        );
      }

      const fileName = filePath.replace(/^temp\//, "");

      // 1. Verify that the file is not bound to an existing saved reconcile
      const linkedRekon = await prisma.reconcile.findFirst({
        where: {
          OR: [
            { buktiBayarUrl: { contains: fileName } },
            { rincianBayarUrl: { contains: fileName } }
          ]
        },
        select: { id: true, noRekonsiliasi: true }
      });

      if (linkedRekon) {
        return NextResponse.json(
          { error: `Berkas sudah terikat dengan rekonsiliasi ${linkedRekon.noRekonsiliasi || linkedRekon.id} dan tidak dapat dihapus.` },
          { status: 400 }
        );
      }

      // 2. Enforce Ownership and Role authorization
      const safeRole = auth.role;
      const currentUserId = String(auth.dbUser?.id || auth.email || "").replace(/[^a-zA-Z0-9_-]/g, "");

      // Allow pusat to delete any temp file
      if (safeRole !== "pusat") {
        // Non-pusat users (e.g. magang) must own the file
        const fileOwnerId = extractFileOwnerFromPath(fileName);
        if (fileOwnerId) {
          if (fileOwnerId !== currentUserId) {
            return NextResponse.json(
              { error: "Anda tidak memiliki wewenang untuk menghapus berkas milik pengguna lain." },
              { status: 403 }
            );
          }
        } else {
          return NextResponse.json(
            { error: "Hanya peran Pusat atau pemilik berkas yang berhak menghapus berkas ini." },
            { status: 403 }
          );
        }
      }

      await supabaseAdmin.storage.from("bukti_bayar_rekon").remove([filePath]);
      return NextResponse.json({ success: true, message: `Removed temp file ${filePath}` });
    }

    // Only pusat can trigger arbitrary batch cleanup of temp files
    const safeRole = auth.role;
    if (safeRole !== "pusat") {
      return NextResponse.json(
        { error: "Hanya peran Pusat yang berwenang menjalankan pembersihan batch berkas sementara." },
        { status: 403 }
      );
    }

    const result = await cleanupStaleTempUploads();
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
