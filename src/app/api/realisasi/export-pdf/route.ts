import { NextRequest, NextResponse } from "next/server";
import puppeteer, { Browser } from "puppeteer";
import jsPDF from "jspdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Reusable browser singleton for blazing fast PDF generation (< 500ms)
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
          "--disable-web-security",
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

export async function POST(req: NextRequest) {
  let page = null;

  try {
    const body = await req.json();
    const { html, styles, fileName = "Realisasi_Pemenuhan.pdf" } = body;

    if (!html) {
      return NextResponse.json(
        { error: "Parameter html wajib dikirim" },
        { status: 400 }
      );
    }

    const origin = req.nextUrl.origin || "http://localhost:3000";

    const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <base href="${origin}/" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&display=swap" rel="stylesheet">
  ${styles || ""}
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
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
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
      padding-bottom: 2.5px !important;
    }
    .font-slide .truncate,
    .font-slide [class*="line-clamp-1"] {
      display: block !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      line-height: 1.35 !important;
      padding-bottom: 2.5px !important;
      -webkit-line-clamp: unset !important;
    }
    .font-slide [class*="line-clamp-2"] {
      display: -webkit-box !important;
      -webkit-box-orient: vertical !important;
      -webkit-line-clamp: 2 !important;
      overflow: hidden !important;
      line-height: 1.3 !important;
      padding-bottom: 2px !important;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;

    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setViewport({
      width: 1280,
      height: 900,
      deviceScaleFactor: 2.5, // Crisp 2.5x retina rendering
    });

    await page.setContent(fullHtml, {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    });

    // Ensure all images and fonts are loaded with safety timeouts
    await page.evaluate(async () => {
      try {
        if (document.fonts) {
          await Promise.race([
            document.fonts.ready,
            new Promise((r) => setTimeout(r, 2000)),
          ]);
        }
      } catch {}
      const images = Array.from(document.images);
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 1500);
          });
        })
      );
    });

    // Capture element screenshot at ultra-high DPI
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

    // Embed into exact-fit presentation Landscape jsPDF matching slide aspect ratio perfectly
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
    const pdfOutput = pdf.output("arraybuffer");

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
