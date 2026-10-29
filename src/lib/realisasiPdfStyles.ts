/** Fixed landscape paper; the content is fitted uniformly, never stretched. */
export const REALISASI_REPORT_WIDTH = 1440;
export function fitRealisasiToLandscape(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error("Ukuran laporan PDF tidak valid");
  const paperWidth = 297, paperHeight = 210, margin = 0;
  const ratio = Math.min((paperWidth - margin * 2) / width, (paperHeight - margin * 2) / height);
  const fittedWidth = width * ratio, fittedHeight = height * ratio;
  return { paperWidth, paperHeight, width: fittedWidth, height: fittedHeight, x: (paperWidth - fittedWidth) / 2, y: (paperHeight - fittedHeight) / 2 };
}

/** Reflow export content to the paper ratio before uniformly scaling it.
 * Self-contained so the same function runs in Chromium and html2canvas's clone.
 */
export function layoutRealisasiForLandscape(slide: HTMLElement) {
  const document = slide.ownerDocument;
  const view = document.defaultView!;
  const textContext = document.createElement("canvas").getContext("2d");
  const measure = (width: number) => {
    for (const property of ["width", "min-width", "max-width"]) slide.style.setProperty(property, width + "px", "important");
    const grid = slide.querySelector<HTMLElement>("[data-pdf-summary-grid]");
    if (grid) {
      const gap = parseFloat(view.getComputedStyle(grid).columnGap) || 0;
      grid.style.setProperty("--pdf-banner-overlap", gap + "px");
      // Start every candidate from the same state, independent of the previous report/width.
      grid.style.setProperty("--pdf-banner-column", "170px");
      let previousHeight = 0, previousBanner = 0;
      for (let pass = 0; pass < 8; pass++) {
        for (const card of Array.from(grid.querySelectorAll<HTMLElement>("[data-pdf-metric-card], [data-pdf-map-card]"))) {
          const cardWidth = card.getBoundingClientRect().width;
          card.style.setProperty("--pdf-summary-label-size", Math.min(17, Math.max(14, cardWidth * 0.06)) + "px");
          card.style.setProperty("--pdf-summary-caption-size", Math.min(15, Math.max(13.5, cardWidth * 0.052)) + "px");
          const value = card.querySelector<HTMLElement>("[data-pdf-metric-value]");
          if (value) {
            const number = value.querySelector<HTMLElement>("[data-pdf-metric-number]");
            const unit = value.querySelector<HTMLElement>("[data-pdf-metric-unit]");
            const icon = card.querySelector<HTMLElement>("[data-pdf-summary-icon]");
            if (card.dataset.pdfSummaryKind === "total" && icon && icon.parentElement !== value) value.prepend(icon);
            if (!number) continue;
            const maximum = card.dataset.pdfSummaryKind === "total" ? 48 : 42;
            card.style.setProperty("--pdf-summary-number-size", maximum + "px");
            const numberStyle = view.getComputedStyle(number);
            const unitWidth = unit?.getBoundingClientRect().width || 0;
            const iconWidth = icon?.parentElement === value ? icon.getBoundingClientRect().width : 0;
            const gaps = (parseFloat(view.getComputedStyle(value).columnGap) || 0) * Math.max(0, value.children.length - 1);
            const available = Math.max(1, value.getBoundingClientRect().width - unitWidth - iconWidth - gaps - 8);
            const text = (number.textContent || "").trim();
            let textWidth = Math.max(1, text.length * maximum * 0.64);
            if (textContext) {
              textContext.font = numberStyle.fontStyle + " " + numberStyle.fontWeight + " " + maximum + "px " + numberStyle.fontFamily;
              textWidth = textContext.measureText(text).width + (parseFloat(numberStyle.letterSpacing) || 0) * Math.max(0, text.length - 1);
            }
            const fitted = Math.min(maximum, Math.max(16, Math.floor(maximum * available / Math.max(1, textWidth) * 2) / 2));
            card.style.setProperty("--pdf-summary-number-size", fitted + "px");
          }
        }
        const gridBounds = grid.getBoundingClientRect();
        const bannerWidth = Math.min(320, gridBounds.width * 0.25, Math.max(120, gridBounds.height * 353 / 280));
        grid.style.setProperty("--pdf-banner-column", Math.max(0, bannerWidth - gap) + "px");
        if (Math.abs(gridBounds.height - previousHeight) < 0.25 && Math.abs(bannerWidth - previousBanner) < 0.25) break;
        previousHeight = gridBounds.height;
        previousBanner = bannerWidth;
      }
    }
    const bounds = slide.getBoundingClientRect();
    return { width: bounds.width, height: Math.ceil(bounds.height) };
  };
  const target = 297 / 210;
  let low = 1280, high = 2304;
  let bestWidth = low, bestError = Infinity;
  for (let attempt = 0; attempt < 13; attempt++) {
    const candidate = Math.round((low + high) / 2);
    const size = measure(candidate);
    const ratio = size.width / Math.max(1, size.height);
    const error = Math.abs(ratio - target);
    if (error < bestError) { bestError = error; bestWidth = candidate; }
    if (ratio < target) low = candidate; else high = candidate;
  }
  return measure(bestWidth);
}

/** Export-only typography shared by Chromium and the browser fallback. */
export const REALISASI_PDF_CSS = `
.font-slide { width:1280px!important; min-width:1280px!important; max-width:1280px!important; height:auto!important; transform:none!important; border:0!important; border-radius:0!important; box-shadow:none!important; margin:0!important; }
.font-slide[data-realisasi-report="daily"] { width:${REALISASI_REPORT_WIDTH}px!important; min-width:${REALISASI_REPORT_WIDTH}px!important; max-width:${REALISASI_REPORT_WIDTH}px!important; }
.font-slide p, .font-slide span, .font-slide h1, .font-slide h2, .font-slide h3 { line-height:1.4!important; }
.font-slide[data-realisasi-report] :is([class*="text-[7"], [class*="text-[8"], [class*="text-[9"], [class*="text-[10"], [class*="text-[11"], [class*="text-[12"], .text-xs) { font-size:13px!important; }
.font-slide[data-realisasi-report] [data-pdf-region-grid] { font-size:13px!important; }
.font-slide[data-realisasi-report] [class*="line-clamp-"], .font-slide[data-realisasi-report] .truncate {
 display:block!important; -webkit-line-clamp:unset!important; max-height:none!important; height:auto!important; overflow:visible!important; white-space:normal!important; text-overflow:clip!important; overflow-wrap:anywhere; flex-shrink:0; padding-top:2px; padding-bottom:2px;
}
.font-slide[data-realisasi-report] [data-pdf-region-grid] { grid-template-columns:repeat(var(--pdf-region-columns,4),minmax(0,1fr))!important; gap:12px!important; overflow:visible!important; }
.font-slide[data-realisasi-report] [data-pdf-region-grid] > div { border:0!important; }
.font-slide[data-realisasi-report] [data-pdf-top-three] { align-self:start!important; }
.font-slide[data-realisasi-report] [data-pdf-ranking-grid] { flex:none!important; }
.font-slide[data-realisasi-report] [data-pdf-ranking-grid] > div { height:auto!important; min-height:168px; }
.font-slide[data-realisasi-report] [data-pdf-ranking-name] { margin-top:12px!important; margin-bottom:12px!important; }
.font-slide[data-realisasi-report] [data-pdf-summary-grid] { margin-left:-32px!important; grid-template-columns:var(--pdf-banner-column,170px) minmax(0,1.5fr) minmax(0,1.1fr) minmax(0,1.15fr) minmax(0,1.3fr)!important; align-items:stretch!important; }
.font-slide[data-realisasi-report] [data-pdf-summary-grid] > div:first-child { margin-left:0!important; margin-right:calc(-1 * var(--pdf-banner-overlap,10px))!important; height:auto!important; align-self:stretch!important; min-height:0!important; margin-top:0!important; margin-bottom:0!important; }
.font-slide[data-realisasi-report] [data-pdf-summary-grid] > div:first-child > img { position:absolute!important; inset:0; width:100%!important; height:100%!important; object-fit:cover!important; mask-image:none!important; -webkit-mask-image:none!important; }
.font-slide[data-realisasi-report] [data-pdf-metric-card] { display:flex!important; height:auto!important; min-height:140px!important; padding:12px!important; gap:10px!important; align-items:center!important; }
.font-slide[data-realisasi-report] [data-pdf-metric-content] { display:flex!important; flex-direction:column!important; justify-content:center!important; align-items:stretch!important; gap:8px!important; align-self:center!important; flex:1; min-width:0; height:auto!important; text-align:left!important; transform:none!important; }
.font-slide[data-realisasi-report] [data-pdf-metric-label] { font-size:var(--pdf-summary-label-size,15px)!important; line-height:1.25!important; margin:0!important; white-space:normal!important; flex:none; }
.font-slide[data-realisasi-report] [data-pdf-metric-value] { display:flex!important; height:auto!important; min-height:0!important; margin:0!important; padding:0 0 6px!important; align-items:center!important; justify-content:flex-start!important; flex-wrap:wrap; gap:6px!important; }
.font-slide[data-realisasi-report] [data-pdf-metric-number] { display:block; font-size:var(--pdf-summary-number-size,34px)!important; line-height:1.25!important; max-width:100%; overflow-wrap:anywhere; }
.font-slide[data-realisasi-report] [data-pdf-metric-unit] { flex-shrink:0; font-size:17px!important; line-height:1.3!important; margin:0!important; }
.font-slide[data-realisasi-report] [data-pdf-metric-subtitle] { font-size:var(--pdf-summary-caption-size,14px)!important; line-height:1.35!important; padding:0!important; margin:0!important; flex:none; }
.font-slide[data-realisasi-report] [data-pdf-summary-icon] { width:44px!important; height:44px!important; flex-shrink:0; }
.font-slide[data-realisasi-report] [data-pdf-summary-icon] img { width:28px!important; height:28px!important; }
.font-slide[data-realisasi-report] [data-pdf-summary-kind="total"] { flex-direction:column!important; justify-content:center!important; }
.font-slide[data-realisasi-report] [data-pdf-summary-kind="total"] [data-pdf-metric-content] { width:100%; flex:0 1 auto; text-align:center!important; }
.font-slide[data-realisasi-report] [data-pdf-summary-kind="total"] [data-pdf-metric-value] { justify-content:center!important; }
.font-slide[data-realisasi-report] [data-pdf-map-card] { display:flex!important; flex-direction:column!important; justify-content:center!important; align-items:center!important; height:auto!important; min-height:140px!important; padding:12px!important; gap:10px!important; text-align:center!important; }
.font-slide[data-realisasi-report] [data-pdf-map-card] > * { width:100%; flex:none!important; margin:0!important; padding:0!important; text-align:center!important; }
.font-slide[data-realisasi-report] [data-pdf-map-card] > p { font-size:var(--pdf-summary-label-size,15px)!important; line-height:1.25!important; }
.font-slide[data-realisasi-report] [data-pdf-map-card] img { display:block; height:40px!important; max-height:40px!important; max-width:220px!important; width:100%!important; object-fit:contain!important; margin-left:auto; margin-right:auto; }
.font-slide[data-realisasi-report] [data-pdf-map-card] > div:last-child p { font-size:var(--pdf-summary-caption-size,14px)!important; line-height:1.35!important; padding:0!important; margin:0!important; }
.font-slide[data-realisasi-report] [data-pdf-summary-grid] > div:first-child > div:last-child { width:12%!important; }
`;
