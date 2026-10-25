export function getRegionalSynonyms(input: string): string[] {
  if (!input) return [];
  const normalized = input.trim().toLowerCase().replace(/\s+/g, " ");

  // Match Region 1 (Bandung, Reg 1, Reg I, Regional 1, Regional I)
  // Word boundaries prevent matching 'reg 10', 'reg 11', 'reg 12', etc.
  if (
    /\b(reg(ional)?\s*(1|i)\b|bandung\b)/i.test(normalized) &&
    !/\b(reg(ional)?\s*(1\d+|i{2,}|iv|v|vi|vii|viii|ix|x)\b)/i.test(normalized)
  ) {
    return ["reg 1", "regional 1", "reg i", "regional i", "bandung"];
  }

  // Match Region 2 (Surabaya, Reg 2, Reg II, Regional 2, Regional II)
  // Word boundaries prevent matching 'reg 20', 'reg 21', 'reg iii', etc.
  if (
    /\b(reg(ional)?\s*(2|ii)\b|surabaya\b)/i.test(normalized) &&
    !/\b(reg(ional)?\s*(2\d+|iii\b))/i.test(normalized)
  ) {
    return ["reg 2", "regional 2", "reg ii", "regional ii", "surabaya"];
  }

  // Match Region 3 (Makassar, Reg 3, Reg III, Regional 3, Regional III)
  // Word boundaries prevent matching 'reg 30', 'reg 31', etc.
  if (
    /\b(reg(ional)?\s*(3|iii)\b|makassar\b)/i.test(normalized) &&
    !/\b(reg(ional)?\s*3\d+\b)/i.test(normalized)
  ) {
    return ["reg 3", "regional 3", "reg iii", "regional iii", "makassar"];
  }

  return [normalized];
}

export function checkPOOwnership(
  po: {
    regional?: string | null;
    unitProduksiId?: string | null;
    UnitProduksi?: {
      idRegional?: string | null;
      namaRegional?: string | null;
      siteArea?: string | null;
      kodeRegional?: string | null;
    } | null;
  } | null | undefined,
  role: string,
  userRegional?: string | null,
  userSiteArea?: string | null
): { allowed: boolean; reason?: string } {
  if (!po) {
    return { allowed: false, reason: "Data PO tidak ditemukan." };
  }

  const safeRole = String(role || "").toLowerCase().trim();
  if (safeRole === "pusat") {
    return { allowed: true };
  }

  // 1. Regional Manager (RM)
  if (safeRole === "rm") {
    if (!userRegional || !userRegional.trim()) {
      return { allowed: false, reason: "Akun Regional Manager tidak memiliki konfigurasi wilayah regional." };
    }

    const unset = (v?: string | null) => !v || ["unknown", "-", ""].includes(v.trim().toLowerCase());
    const unitReg = unset(po.UnitProduksi?.namaRegional) ? undefined : po.UnitProduksi?.namaRegional?.trim().toLowerCase();
    const unitKode = unset(po.UnitProduksi?.kodeRegional) ? undefined : po.UnitProduksi?.kodeRegional?.trim().toLowerCase();
    const poReg = po.regional?.trim().toLowerCase();

    // PO must have unit or regional information
    if (!unitReg && !unitKode && !poReg) {
      return { allowed: false, reason: "PO tidak memiliki informasi unit produksi atau regional yang valid." };
    }

    const userSynonyms = getRegionalSynonyms(userRegional).map((s) => s.toLowerCase().trim());
    
    // Canonical rule: If UnitProduksi is assigned and has regional info, it is the authoritative source.
    // Do NOT allow po.regional to override or bypass a mismatch in UnitProduksi.
    const poCandidates: string[] = [];
    if (unitReg || unitKode) {
      if (unitReg) poCandidates.push(...getRegionalSynonyms(unitReg));
      if (unitKode) poCandidates.push(...getRegionalSynonyms(unitKode));
    } else if (poReg) {
      poCandidates.push(...getRegionalSynonyms(poReg));
    }

    const poSynonyms = poCandidates.map((s) => s.toLowerCase().trim());

    // Canonical exact matching between synonyms - NO substring .includes()
    const match = userSynonyms.some((us) => poSynonyms.includes(us));
    if (!match) {
      return { allowed: false, reason: `PO ini berada di luar wewenang regional Anda (${userRegional}).` };
    }
    return { allowed: true };
  }

  // 2. Site Area / Cabang
  if (safeRole === "sitearea" || safeRole === "picsite" || safeRole === "spbdki") {
    if (!userSiteArea || !userSiteArea.trim()) {
      return { allowed: false, reason: "Akun Cabang / Site Area tidak memiliki konfigurasi siteArea." };
    }

    const poUnitId = (po.unitProduksiId || po.UnitProduksi?.idRegional || "").trim().toLowerCase();
    const poSiteArea = (po.UnitProduksi?.siteArea || "").trim().toLowerCase();

    // PO without unit information must be rejected
    if (!poUnitId && !poSiteArea) {
      return { allowed: false, reason: "PO tidak memiliki informasi unit produksi yang valid." };
    }
    if (poUnitId === "unknown" || poSiteArea === "unknown") {
      return { allowed: false, reason: "PO belum ditetapkan ke unit produksi yang valid." };
    }

    // Split userSiteArea by comma in case user has multiple assigned areas or IDs
    const allowedAreas = userSiteArea
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    // Exact matching on siteArea or unitProduksiId - NO substring matching
    const match = allowedAreas.includes(poSiteArea) || (Boolean(poUnitId) && allowedAreas.includes(poUnitId));
    if (!match) {
      return { allowed: false, reason: `PO ini berada di luar wewenang unit cabang/site area Anda (${userSiteArea}).` };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: "Akun Anda tidak memiliki hak akses mutasi pada data PO ini." };
}

export function checkReturOwnership(
  retur: {
    lokasiBarangId?: string | null;
    pembebananReturnId?: string | null;
    LokasiBarang?: {
      idRegional?: string | null;
      namaRegional?: string | null;
      siteArea?: string | null;
      kodeRegional?: string | null;
    } | null;
    PembebananReturn?: {
      idRegional?: string | null;
      namaRegional?: string | null;
      siteArea?: string | null;
      kodeRegional?: string | null;
    } | null;
  } | null | undefined,
  role: string,
  userRegional?: string | null,
  userSiteArea?: string | null
): { allowed: boolean; reason?: string } {
  if (!retur) {
    return { allowed: false, reason: "Data retur tidak ditemukan." };
  }

  const safeRole = String(role || "").toLowerCase().trim();
  if (safeRole === "pusat") {
    return { allowed: true };
  }

  // 1. Regional Manager (RM)
  if (safeRole === "rm") {
    if (!userRegional || !userRegional.trim()) {
      return { allowed: false, reason: "Akun Regional Manager tidak memiliki konfigurasi wilayah regional." };
    }

    const units = [retur.LokasiBarang, retur.PembebananReturn].filter(Boolean);
    if (units.length === 0) {
      return { allowed: false, reason: "Data retur belum memiliki informasi unit produksi atau regional yang valid." };
    }

    const userSynonyms = getRegionalSynonyms(userRegional).map((s) => s.toLowerCase().trim());
    
    const hasMatch = units.some((unit) => {
      const unitReg = unit?.namaRegional?.trim().toLowerCase();
      const unitKode = unit?.kodeRegional?.trim().toLowerCase();
      const candidates: string[] = [];
      if (unitReg) candidates.push(...getRegionalSynonyms(unitReg));
      if (unitKode) candidates.push(...getRegionalSynonyms(unitKode));
      const unitSynonyms = candidates.map((s) => s.toLowerCase().trim());
      return userSynonyms.some((us) => unitSynonyms.includes(us));
    });

    if (!hasMatch) {
      return { allowed: false, reason: `Data retur ini berada di luar wewenang regional Anda (${userRegional}).` };
    }
    return { allowed: true };
  }

  // 2. Site Area / Cabang
  if (safeRole === "sitearea" || safeRole === "picsite" || safeRole === "spbdki") {
    if (!userSiteArea || !userSiteArea.trim()) {
      return { allowed: false, reason: "Akun Cabang / Site Area tidak memiliki konfigurasi siteArea." };
    }

    const allowedAreas = userSiteArea
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const units = [retur.LokasiBarang, retur.PembebananReturn].filter(Boolean);
    const unitIds = [retur.lokasiBarangId, retur.pembebananReturnId].filter(Boolean) as string[];

    if (units.length === 0 && unitIds.length === 0) {
      return { allowed: false, reason: "Data retur belum memiliki informasi unit cabang yang valid." };
    }

    const hasMatch = units.some((u) => {
      const site = (u?.siteArea || "").trim().toLowerCase();
      const id = (u?.idRegional || "").trim().toLowerCase();
      return (site && allowedAreas.includes(site)) || (id && allowedAreas.includes(id));
    }) || unitIds.some((id) => allowedAreas.includes(id.toLowerCase()));

    if (!hasMatch) {
      return { allowed: false, reason: `Data retur ini berada di luar wewenang unit cabang Anda (${userSiteArea}).` };
    }
    return { allowed: true };
  }

  // 3. Magang / Operasional
  if (safeRole === "magang") {
    return { allowed: true };
  }

  return { allowed: false, reason: "Akun Anda tidak memiliki hak akses mutasi pada data retur ini." };
}

