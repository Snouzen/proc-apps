import { NextRequest, NextResponse } from "next/server";
import puppeteer, { Browser } from "puppeteer";
import jsPDF from "jspdf";
import { getSessionWithRole } from "@/lib/auth";
import { hasPermission } from "@/lib/accessControl";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Reusable browser singleton for fast PDF generation
let cachedBrowser: Browser | null = null;
let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (cachedBrowser && cachedBrowser.connected) {
    return cachedBrowser;
  }
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--font-render-hinting=none",
        ],
      })
      .then((browser) => {
        cachedBrowser = browser;
        browser.on("disconnected", () => {
          cachedBrowser = null;
          browserPromise = null;
        });
        return browser;
      })
      .catch((err) => {
        cachedBrowser = null;
        browserPromise = null;
        throw err;
      });
  }
  return browserPromise;
}

function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== "string") return "";
  return rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    .replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, "")
    .replace(/<link\b[^>]*rel=["']?(?:import|prerender)["']?[^>]*>/gi, "")
    // Strip all event handlers (onload, onerror, onclick, etc.)
    .replace(/\son[a-zA-Z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "")
    .replace(/href\s*=\s*["']?\s*javascript:[^"'>]*/gi, 'href="#"')
    .replace(/src\s*=\s*["']?\s*javascript:[^"'>]*/gi, 'src=""')
    .replace(/(?:file|gopher|dict|ldap|ftp):\/\//gi, "")
    .replace(/http-equiv=["']?refresh["']?/gi, "")
    .replace(/(?:169\.254\.\d+\.\d+|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+|localhost|\[::1\])/gi, "");
}

function sanitizeStyles(rawStyles: string): string {
  if (!rawStyles || typeof rawStyles !== "string") return "";
  return rawStyles
    .replace(/@import\s+[^;]+;?/gi, "")
    .replace(/@font-face\s*\{[^}]*\}/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/behavior\s*:[^;]+;?/gi, "")
    .replace(/-moz-binding\s*:[^;]+;?/gi, "")
    .replace(/url\s*\(\s*(?!['"]?data:image\/(?:png|jpeg|webp|gif|svg\+xml))[^)]*\)/gi, "none")
    .replace(/(?:169\.254\.\d+\.\d+|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+|localhost|\[::1\])/gi, "");
}

export async function POST(req: NextRequest) {
  let page: any = null;

  try {
    // 1. Enforce Authentication & Role Authorization
    const auth = await getSessionWithRole(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const safeRole = auth.safeRole || auth.role;
    const canExport = safeRole === "pusat" || (await hasPermission(safeRole, "real_export_pdf"));
    if (!canExport) {
      return NextResponse.json(
        { error: "Akses ditolak: Anda tidak memiliki wewenang untuk mengekspor dokumen Realisasi Pemenuhan (real_export_pdf)." },
        { status: 403 }
      );
    }

    // 2. Enforce Raw Stream Payload Size Limit (Max 2MB chunk-by-chunk stream limiter)
    const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: "Ukuran payload melebihi batas maksimum 2MB" },
        { status: 413 }
      );
    }

    if (!req.body) {
      return NextResponse.json({ error: "Payload kosong" }, { status: 400 });
    }

    const reader = req.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          receivedBytes += value.length;
          if (receivedBytes > MAX_PAYLOAD_BYTES) {
            await reader.cancel("Payload exceeded 2MB limit");
            return NextResponse.json(
              { error: "Ukuran payload melebihi batas maksimum 2MB" },
              { status: 413 }
            );
          }
          chunks.push(value);
        }
      }
    } catch (readErr: any) {
      return NextResponse.json({ error: "Gagal membaca stream request" }, { status: 400 });
    }

    const totalBuffer = Buffer.concat(chunks);
    const rawText = totalBuffer.toString("utf-8");

    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: "Format payload JSON tidak valid" }, { status: 400 });
    }

    const { html, styles, fileName: rawFileName = "Realisasi_Pemenuhan.pdf" } = body;

    if (!html || typeof html !== "string") {
      return NextResponse.json(
        { error: "Parameter html wajib dikirim" },
        { status: 400 }
      );
    }

    if (html.length > 1.5 * 1024 * 1024 || (typeof styles === "string" && styles.length > 500 * 1024)) {
      return NextResponse.json(
        { error: "Panjang komponen HTML/Styles melebihi batas wajar" },
        { status: 413 }
      );
    }

    // 3. Sanitize HTML & Styles
    const sanitizedContent = sanitizeHtml(html);
    const sanitizedStyles = typeof styles === "string" ? sanitizeStyles(styles) : "";

    // 4. Sanitize FileName for Header Security
    const fileName = String(rawFileName)
      .replace(/[^a-zA-Z0-9_\-\.]/g, "_")
      .replace(/_{2,}/g, "_");

    const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  ${sanitizedStyles}
  <style>
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    }
    /* Lock slide element dimensions to standard desktop presentation ratio */
    .font-slide {
      width: 1280px !important;
      min-width: 1280px !important;
      max-width: 1280px !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      margin: 0 !important;
    }
    .font-slide p,
    .font-slide span,
    .font-slide h1,
    .font-slide h2,
    .font-slide h3 {
      line-height: 1.35 !important;
    }
    .font-slide .truncate,
    .font-slide [class*="line-clamp-1"] {
      display: block !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      line-height: 1.35 !important;
      -webkit-line-clamp: unset !important;
    }
    .font-slide [class*="line-clamp-2"] {
      display: -webkit-box !important;
      -webkit-box-orient: vertical !important;
      -webkit-line-clamp: 2 !important;
      overflow: hidden !important;
      line-height: 1.35 !important;
    }
    .font-slide [class*="line-clamp-3"] {
      display: -webkit-box !important;
      -webkit-box-orient: vertical !important;
      -webkit-line-clamp: 3 !important;
      overflow: hidden !important;
      line-height: 1.3 !important;
    }
  </style>
</head>
<body>
  ${sanitizedContent}
</body>
</html>`;

    // 5. Wrap PDF generation in a strict 20s global timeout
    const generatePdfPromise = async () => {
      const browser = await getBrowser();
      page = await browser.newPage();

      // Disable JS in the page to prevent active code execution
      await page.setJavaScriptEnabled(false);

      // Total network air-gap during rendering:
      // Parse URL strictly; only allow 'data:' and 'about:' protocols (embedded base64 images/svgs).
      // All HTTP, HTTPS, WebSocket, file, and local network requests are unconditionally aborted.
      await page.setRequestInterception(true);
      page.on("request", (interceptedReq: any) => {
        try {
          const reqUrl = interceptedReq.url();
          const parsed = new URL(reqUrl);
          if (parsed.protocol === "data:" || parsed.protocol === "about:") {
            interceptedReq.continue();
          } else {
            interceptedReq.abort();
          }
        } catch {
          interceptedReq.abort();
        }
      });

      await page.setViewport({
        width: 1280,
        height: 900,
        deviceScaleFactor: 2.5,
      });

      await page.setContent(fullHtml, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });

      // Ensure fonts and images are ready safely
      await page.evaluate(async () => {
        try {
          if (document.fonts) {
            await Promise.race([
              document.fonts.ready,
              new Promise((r) => setTimeout(r, 1500)),
            ]);
          }
        } catch {}
      });

      // Capture element screenshot at high DPI
      const slideEl = await page.$(".font-slide");
      const boundingBox = slideEl ? await slideEl.boundingBox() : null;
      const target = slideEl || page;
      const origWidth = boundingBox?.width || 1280;
      const origHeight = boundingBox?.height || 720;

      const screenshotBuffer = await target.screenshot({
        type: "png",
        omitBackground: false,
      });

      // Close page immediately to free memory
      await page.close();
      page = null;

      // Embed into exact-fit presentation Landscape jsPDF matching slide aspect ratio
      const pdfWidth = 297; // mm
      const pdfHeight = (origHeight * pdfWidth) / origWidth;

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [pdfWidth, pdfHeight],
        compress: true,
      });

      const b64 = "data:image/png;base64," + Buffer.from(screenshotBuffer).toString("base64");
      pdf.addImage(b64, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
      return pdf.output("arraybuffer");
    };

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Batas waktu ekspor PDF tercapai (20 detik)")), 20000)
    );

    const pdfOutput: any = await Promise.race([generatePdfPromise(), timeoutPromise]);

    return new NextResponse(pdfOutput, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Puppeteer PDF generation error:", error);
    if (page) {
      try {
        await (page as any).close();
      } catch {}
    }
    return NextResponse.json(
      { error: error?.message || "Gagal generate PDF dengan Puppeteer" },
      { status: 500 }
    );
  }
}
