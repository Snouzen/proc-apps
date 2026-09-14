import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface ExportPdfOptions {
  element: HTMLElement;
  fileName?: string;
  title?: string;
}

export async function generateRealisasiPdf({
  element,
  fileName = "Realisasi_Pemenuhan.pdf",
}: ExportPdfOptions): Promise<void> {
  // 1. Gather all CSS rules and stylesheets from the client document quickly (instant)
  let styles = "";
  if (typeof document !== "undefined") {
    for (const styleEl of Array.from(
      document.querySelectorAll("style, link[rel='stylesheet']")
    )) {
      styles += styleEl.outerHTML + "\n";
    }
  }

  // 2. Primary Method: High-fidelity Chromium Puppeteer Engine (Plek ketiplek dengan Web, <1 detik)
  try {
    const res = await fetch("/api/realisasi/export-pdf", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        html: element.outerHTML,
        styles,
        fileName,
      }),
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return;
    } else {
      console.warn("Puppeteer export status not OK, falling back to html2canvas");
    }
  } catch (err) {
    console.warn("Puppeteer export failed, using html2canvas fallback:", err);
  }

  // 3. Fallback Method: Client-side html2canvas + jsPDF
  if (typeof document !== "undefined" && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore font ready error if unsupported
    }
  }

  const canvas = await html2canvas(element, {
    scale: 2.5,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: 1280,
    onclone: (clonedDoc: Document) => {
      const clonedSlide = clonedDoc.querySelector(
        "[class*='font-slide']"
      ) as HTMLElement;
      if (clonedSlide) {
        clonedSlide.style.width = "1280px";
        clonedSlide.style.minWidth = "1280px";
        clonedSlide.style.maxWidth = "1280px";
      }

      const style = clonedDoc.createElement("style");
      style.innerHTML = `
        .font-slide p,
        .font-slide span,
        .font-slide h1,
        .font-slide h2,
        .font-slide h3 {
          line-height: 1.35 !important;
          padding-bottom: 2px !important;
        }
        .font-slide .truncate,
        .font-slide [class*="line-clamp"],
        .font-slide [class*="leading-tight"],
        .font-slide [class*="leading-none"] {
          overflow: visible !important;
          -webkit-line-clamp: unset !important;
          line-height: 1.35 !important;
          padding-bottom: 2px !important;
        }
      `;
      clonedDoc.head.appendChild(style);
    },
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const marginX = 6;
  const marginY = 6;
  const maxW = pageWidth - marginX * 2;
  const maxH = pageHeight - marginY * 2;

  let imgWidth = maxW;
  let imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (imgHeight > maxH) {
    imgHeight = maxH;
    imgWidth = (canvas.width * imgHeight) / canvas.height;
  }

  const xOffset = (pageWidth - imgWidth) / 2;
  const yOffset = (pageHeight - imgHeight) / 2;

  pdf.addImage(imgData, "PNG", xOffset, yOffset, imgWidth, imgHeight, undefined, "FAST");
  pdf.save(fileName);
}
