// ── 38 Provinsi Resmi Indonesia ─────────────────────────────────────────────

export const DAFTAR_PROVINSI_INDONESIA: string[] = [
  "Aceh",
  "Sumatera Utara",
  "Sumatera Barat",
  "Riau",
  "Kepulauan Riau",
  "Jambi",
  "Sumatera Selatan",
  "Kepulauan Bangka Belitung",
  "Bengkulu",
  "Lampung",
  "Jabodetabek",
  "Jawa Barat",
  "Banten",
  "Jawa Tengah",
  "Daerah Istimewa Yogyakarta",
  "Jawa Timur",
  "Bali",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Kalimantan Barat",
  "Kalimantan Tengah",
  "Kalimantan Selatan",
  "Kalimantan Timur",
  "Kalimantan Utara",
  "Sulawesi Utara",
  "Gorontalo",
  "Sulawesi Tengah",
  "Sulawesi Barat",
  "Sulawesi Selatan",
  "Sulawesi Tenggara",
  "Maluku",
  "Maluku Utara",
  "Papua",
  "Papua Barat",
  "Papua Selatan",
  "Papua Tengah",
  "Papua Pegunungan",
  "Papua Barat Daya",
];

export function getPulauOrRegion(prov: string): string {
  const clean = (prov || "").trim();
  if (!clean) return "";
  const upper = clean.toUpperCase();

  // Jawa & Jabodetabek
  if (
    upper.includes("JAWA") ||
    upper.includes("JAKARTA") ||
    upper.includes("DKI") ||
    upper.includes("BANTEN") ||
    upper.includes("YOGYAKARTA") ||
    upper.includes("JABODETABEK")
  ) {
    return "JAWA";
  }

  // Sumatera
  if (
    upper.includes("SUMATERA") ||
    upper.includes("ACEH") ||
    upper.includes("RIAU") ||
    upper.includes("JAMBI") ||
    upper.includes("BANGKA") ||
    upper.includes("BELITUNG") ||
    upper.includes("BENGKULU") ||
    upper.includes("LAMPUNG")
  ) {
    return "SUMATERA";
  }

  // Kalimantan
  if (upper.includes("KALIMANTAN")) {
    return "KALIMANTAN";
  }

  // Sulawesi
  if (upper.includes("SULAWESI") || upper.includes("GORONTALO")) {
    return "SULAWESI";
  }

  // Bali
  if (upper.includes("BALI")) {
    return "BALI";
  }

  // Nusa Tenggara
  if (upper.includes("NUSA TENGGARA") || upper.includes("NTB") || upper.includes("NTT")) {
    return "NUSA TENGGARA";
  }

  // Maluku
  if (upper.includes("MALUKU")) {
    return "MALUKU";
  }

  // Papua
  if (upper.includes("PAPUA")) {
    return "PAPUA";
  }

  // Fallback: take first word
  return clean.split(/[\s-]+/)[0].toUpperCase();
}
