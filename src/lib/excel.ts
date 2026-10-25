/**
 * Safely parse numeric value from Excel cell (supports numeric types, US format, and Indonesian format).
 * Examples:
 * - 1234.5 -> 1234.5
 * - "1.234,50" -> 1234.5 (ID format with thousands dot and decimal comma)
 * - "1,234.50" -> 1234.5 (US format with thousands comma and decimal dot)
 * - "12,5" -> 12.5 (ID format decimal comma)
 * - "12.5" -> 12.5 (US format decimal dot)
 * - "1.234" -> 1234 (ID format thousands dot)
 * - "1,234" -> 1234 (US format thousands comma)
 * Returns null if string is non-numeric or completely ambiguous.
 */
export function parseExcelNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  if (typeof val !== "string") return null;

  let s = val.trim();
  if (!s) return null;

  // Remove currency prefixes/suffixes and whitespace (e.g. "Rp", "IDR", "pcs", "kg")
  s = s.replace(/^(rp|idr)\.?\s*/i, "").replace(/\s*(rp|idr|pcs|kg|gr)$/i, "").trim();

  // Check if negative
  const isNegative = s.startsWith("-") || (s.startsWith("(") && s.endsWith(")"));
  s = s.replace(/^[-\(]+/, "").replace(/\)+$/, "").trim();
  if (!s) return null;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  let normalized: string;

  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      // Indonesian format: 1.234,50 or 1.000.000,50
      const intPart = s.slice(0, lastComma);
      const decPart = s.slice(lastComma + 1);
      if (!/^\d+$/.test(decPart)) return null;

      const dotGroups = intPart.split(".");
      if (dotGroups.length > 1) {
        if (!/^\d{1,3}$/.test(dotGroups[0])) return null;
        for (let i = 1; i < dotGroups.length; i++) {
          if (!/^\d{3}$/.test(dotGroups[i])) return null;
        }
      } else if (!/^\d+$/.test(intPart)) {
        return null;
      }
      normalized = dotGroups.join("") + "." + decPart;
    } else {
      // US format: 1,234.50 or 1,000,000.50
      const intPart = s.slice(0, lastDot);
      const decPart = s.slice(lastDot + 1);
      if (!/^\d+$/.test(decPart)) return null;

      const commaGroups = intPart.split(",");
      if (commaGroups.length > 1) {
        if (!/^\d{1,3}$/.test(commaGroups[0])) return null;
        for (let i = 1; i < commaGroups.length; i++) {
          if (!/^\d{3}$/.test(commaGroups[i])) return null;
        }
      } else if (!/^\d+$/.test(intPart)) {
        return null;
      }
      normalized = commaGroups.join("") + "." + decPart;
    }
  } else if (hasComma) {
    const commaParts = s.split(",");
    if (commaParts.length > 2) {
      // Multiple commas: Must be valid thousands separator (e.g. 1,000,000)
      if (!/^\d{1,3}$/.test(commaParts[0])) return null;
      for (let i = 1; i < commaParts.length; i++) {
        if (!/^\d{3}$/.test(commaParts[i])) return null;
      }
      normalized = commaParts.join("");
    } else if (commaParts.length === 2) {
      const [p0, p1] = commaParts;
      if (!/^\d+$/.test(p0) || !/^\d+$/.test(p1)) return null;
      if (p1.length !== 3) {
        // Decimal comma (e.g. 12,5 or 1234,50)
        normalized = p0 + "." + p1;
      } else if (p0.length >= 1 && p0.length <= 3) {
        // E.g. 1,234 -> Thousands
        normalized = p0 + p1;
      } else {
        // e.g. 12345,678 -> Decimal
        normalized = p0 + "." + p1;
      }
    } else {
      return null;
    }
  } else if (hasDot) {
    const dotParts = s.split(".");
    if (dotParts.length > 2) {
      // Multiple dots: Must be valid thousands separator (e.g. 1.000.000)
      if (!/^\d{1,3}$/.test(dotParts[0])) return null;
      for (let i = 1; i < dotParts.length; i++) {
        if (!/^\d{3}$/.test(dotParts[i])) return null;
      }
      normalized = dotParts.join("");
    } else if (dotParts.length === 2) {
      const [p0, p1] = dotParts;
      if (!/^\d+$/.test(p0) || !/^\d+$/.test(p1)) return null;
      if (p1.length !== 3) {
        // Decimal dot (e.g. 12.5 or 1234.50)
        normalized = p0 + "." + p1;
      } else if (p0.length >= 1 && p0.length <= 3) {
        // E.g. 1.234 -> Thousands
        normalized = p0 + p1;
      } else {
        // e.g. 12345.678 -> Decimal
        normalized = p0 + "." + p1;
      }
    } else {
      return null;
    }
  } else {
    if (!/^\d+$/.test(s)) return null;
    normalized = s;
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  // Disallow absurd string lengths (e.g. 400 digits)
  if (normalized.split(".")[0].length > 25) return null;

  const num = parseFloat(normalized);
  if (!Number.isFinite(num)) return null;

  return isNegative ? -num : num;
}

export async function parseExcelFile(file: File, options?: any): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import("xlsx");
        const data = e.target?.result;
        const workbook = XLSX.read(data, {
          type: "array",
          cellDates: options?.cellDates ?? true,
        });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // If raw rows are requested
        if (options?.rawRows) {
          const allRows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            blankrows: true,
            defval: "",
          }) as any[][];
          resolve(allRows);
          return;
        }

        // Format cells according to expected column types
        if (sheet["!ref"]) {
          const range = XLSX.utils.decode_range(sheet["!ref"]);
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const hAddr = XLSX.utils.encode_cell({ r: range.s.r, c: C });
            const hCell = sheet[hAddr];
            const hText = String(hCell?.w || hCell?.v || "").trim().toLowerCase();
            const numKeywords = ["kg", "pcs", "harga", "discount", "diskon", "nominal", "tagih", "qty", "rupiah", "total", "rp", "subtotal", "jumlah", "berat"];
            const isNumeric = numKeywords.some(k => hText.includes(k));

            const words = hText.split(/[\s_\-\.\/]+/).filter(Boolean);
            const codeWords = new Set(["po", "no", "nomor", "kode", "code", "invoice", "inv", "site", "sitearea", "unit", "area", "cabang", "inisial", "company", "pt", "tujuan", "telepon", "nik", "id", "resi"]);
            const isCodeOrText = !isNumeric && (
              words.some(w => codeWords.has(w)) ||
              ["no po", "nomor po", "no inv", "site area", "unit produksi"].some(p => hText.includes(p))
            );

            for (let R = range.s.r + 1; R <= range.e.r; ++R) {
              const addr = XLSX.utils.encode_cell({ r: R, c: C });
              const cell = sheet[addr];
              if (!cell) continue;
              if (isNumeric) {
                if (typeof cell.v === "number") {
                  cell.t = "n";
                } else {
                  const valToParse = (cell.v !== undefined && cell.v !== null && cell.v !== "") ? cell.v : cell.w;
                  const parsedNum = parseExcelNumber(valToParse);
                  if (parsedNum !== null) {
                    cell.t = "n";
                    cell.v = parsedNum;
                  }
                }
              } else if (isCodeOrText && cell.w !== undefined && cell.w !== null) {
                // Preserve leading zero formatted text for identifiers and codes
                cell.t = "s";
                cell.v = String(cell.w).trim();
              }
            }
          }
        }

        const jsonData = XLSX.utils.sheet_to_json(sheet, {
          defval: options?.defval ?? "",
          raw: options?.raw ?? true, // Preserves raw numbers without turning 1,234.50 into NaN
        });
        resolve(jsonData as any[]);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
