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
      box-shadow: none !important;
      margin: 0 auto !important;
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

    // Ensure all images and fonts are loaded and decoded
    await page.evaluate(async () => {
      if (document.fonts) {
        await document.fonts.ready;
      }
      const images = Array.from(document.images);
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );
    });

    // Capture element screenshot at ultra-high DPI
    const slideEl = await page.$(".font-slide");
    const target = slideEl || page;
    const screenshotBuffer = await target.screenshot({
      type: "png",
      omitBackground: false,
    });

    // Close page immediately to free memory
    await page.close();
    page = null;

    // Embed into A4 Landscape jsPDF (297mm x 210mm)
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth(); // 297mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 210mm
    const marginX = 6;
    const marginY = 6;
    const maxW = pageWidth - marginX * 2;
    const maxH = pageHeight - marginY * 2;

    const boundingBox = await slideEl?.boundingBox();
    const origWidth = boundingBox?.width || 1280;
    const origHeight = boundingBox?.height || 720;

    let imgWidth = maxW;
    let imgHeight = (origHeight * imgWidth) / origWidth;

    if (imgHeight > maxH) {
      imgHeight = maxH;
      imgWidth = (origWidth * imgHeight) / origHeight;
    }

    const xOffset = (pageWidth - imgWidth) / 2;
    const yOffset = (pageHeight - imgHeight) / 2;

    const b64 = "data:image/png;base64," + Buffer.from(screenshotBuffer).toString("base64");
    pdf.addImage(b64, "PNG", xOffset, yOffset, imgWidth, imgHeight, undefined, "FAST");
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
