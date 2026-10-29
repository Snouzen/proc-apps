import { REALISASI_PDF_CSS, REALISASI_REPORT_WIDTH, fitRealisasiToLandscape, layoutRealisasiForLandscape } from "@/lib/realisasiPdfStyles";
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
  // Inline CSS because the server renderer intentionally blocks network requests.
  let styles = "";
  for (const sheet of Array.from(document.styleSheets)) {
    try { styles += "<style>" + Array.from(sheet.cssRules).map(rule => rule.cssText).join("\n") + "</style>"; }
    catch { /* Cross-origin stylesheets cannot be read by the browser. */ }
  }
  const exportElement = element.cloneNode(true) as HTMLElement;
  // Embed images before sending HTML to the air-gapped server renderer.
  let imageEmbeddingFailed = false;
  const embeddedImages = new Map<string, Promise<string>>();
  await Promise.all(Array.from(exportElement.querySelectorAll("img")).map(async img => {
    if (!img.src || img.src.startsWith("data:")) return;
    try {
      let pending = embeddedImages.get(img.src);
      if (!pending) {
        pending = (async () => {
          const response = await fetch(img.src, { signal: AbortSignal.timeout(8000) });
          if (!response.ok) throw new Error("Image unavailable");
          const blob = await response.blob();
          if (!blob.type.startsWith("image/")) throw new Error("Invalid image");
          const bitmap = await createImageBitmap(blob);
          try {
            const ratio = Math.min(1, 900 / bitmap.width, 600 / bitmap.height);
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
            canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Canvas unavailable");
            context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL("image/webp", 0.9);
          } finally { bitmap.close(); }
        })();
        embeddedImages.set(img.src, pending);
      }
      img.src = await pending;
      img.removeAttribute("srcset");
    } catch { imageEmbeddingFailed = true; }
  }));

  // 2. Primary Method: High-fidelity Chromium Puppeteer Engine (Plek ketiplek dengan Web, <1 detik)
  try {
    if (imageEmbeddingFailed) throw new Error("Using local renderer for images unavailable to PDF server");
    const res = await fetch("/api/realisasi/export-pdf", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        html: exportElement.outerHTML,
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
      setTimeout(() => {
        a.remove();
        window.URL.revokeObjectURL(url);
      }, 2000);
      return;
    } else {
      console.warn("Puppeteer export status not OK, falling back to html2canvas");
    }
  } catch (err) {
    console.warn("Puppeteer export failed, using html2canvas fallback:", err);
  }

  const isDailyReport = element.dataset.realisasiReport === "daily";
  const renderWidth = isDailyReport ? REALISASI_REPORT_WIDTH : 1280;

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
    windowWidth: renderWidth,
    onclone: async (clonedDoc: Document, clonedSlide: HTMLElement) => {
      if (clonedSlide) {
        clonedSlide.style.width = renderWidth + "px";
        clonedSlide.style.minWidth = renderWidth + "px";
        clonedSlide.style.maxWidth = renderWidth + "px";
        clonedSlide.style.border = "none";
        clonedSlide.style.borderRadius = "0";
        clonedSlide.style.boxShadow = "none";
      }

      const style = clonedDoc.createElement("style");
      style.innerHTML = REALISASI_PDF_CSS;
      clonedDoc.head.appendChild(style);
      if (isDailyReport && clonedSlide) {
        if (clonedDoc.fonts) await Promise.race([clonedDoc.fonts.ready, new Promise(resolve => setTimeout(resolve, 2000))]);
        await Promise.all(Array.from(clonedSlide.querySelectorAll("img")).map(img => img.decode().catch(() => {})));
        layoutRealisasiForLandscape(clonedSlide);
      }
    },
  });

  const imgData = canvas.toDataURL("image/png");

  // Borderless exact-fit PDF matching presentation slide aspect ratio
  const fit = isDailyReport ? fitRealisasiToLandscape(canvas.width, canvas.height) : null;
  const pdfWidth = fit?.paperWidth || 297;
  const pdfHeight = fit?.paperHeight || (canvas.height * pdfWidth) / canvas.width;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: fit ? "a4" : [pdfWidth, pdfHeight],
    compress: true,
  });

  pdf.addImage(imgData, "PNG", fit?.x || 0, fit?.y || 0, fit?.width || pdfWidth, fit?.height || pdfHeight, undefined, "FAST");
  pdf.save(fileName);
}
