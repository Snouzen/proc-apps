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
  // Capture element using html2canvas with high-DPI scaling
  const canvas = await html2canvas(element, {
    scale: 2, // Crisp 2x retina scale
    useCORS: true, // Allow cross-origin images (e.g. Supabase logo URLs)
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: 1600,
  });

  const imgData = canvas.toDataURL("image/png");

  // A4 Landscape format: 297mm x 210mm
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth(); // 297mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 210mm

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Center vertically on A4 page if height is less than pageHeight
  const yOffset = imgHeight < pageHeight ? (pageHeight - imgHeight) / 2 : 0;

  pdf.addImage(imgData, "PNG", 0, yOffset, imgWidth, Math.min(imgHeight, pageHeight), undefined, "FAST");
  pdf.save(fileName);
}
