import { checkPOOwnership, getRegionalSynonyms } from "./regional";

export function poScopeFromUnits(role: string, regional: string | null | undefined, siteArea: string | null | undefined, units: Array<{ idRegional: string; namaRegional: string; kodeRegional?: string | null; siteArea: string }>) {
  if (role === "pusat" || role === "magang") return {};
  const allowedIds = units.filter(unit => unit.idRegional.trim().toLowerCase() !== "unknown" && checkPOOwnership({ unitProduksiId: unit.idRegional, UnitProduksi: unit }, role, regional, siteArea).allowed).map(unit => unit.idRegional);
  if (role === "rm" && regional?.trim()) return { OR: [
    { unitProduksiId: { in: allowedIds } },
    { unitProduksiId: { in: ["UNKNOWN", ""] }, OR: [...new Set([regional, regional.trim(), ...getRegionalSynonyms(regional), ...units.filter(u => allowedIds.includes(u.idRegional)).map(u => u.namaRegional)])].map(name => ({ regional: { equals: name, mode: "insensitive" } })) },
  ] };
  return { unitProduksiId: { in: allowedIds } };
}

/** Unit ownership is authoritative; PO regional is used while a unit is unassigned. */
export function poScopeFilter(role: string, regional?: string | null, siteArea?: string | null): any {
  if (role === "pusat" || role === "magang") return {};
  if (role === "rm") {
    if (!regional?.trim()) return { id: "__NO_CONFIGURED_SCOPE__" };
    const names = getRegionalSynonyms(regional);
    return { OR: [
      { UnitProduksi: { OR: [{ namaRegional: { in: names, mode: "insensitive" } }, { kodeRegional: { in: names, mode: "insensitive" } }] } },
      { unitProduksiId: { in: ["UNKNOWN", ""] }, regional: { in: names, mode: "insensitive" } },
    ] };
  }
  if (["sitearea", "picsite", "spbdki"].includes(role)) {
    const areas = (siteArea || "").split(",").map(s => s.trim()).filter(s => s && s.toLowerCase() !== "unknown");
    if (!areas.length) return { id: "__NO_CONFIGURED_SCOPE__" };
    return { OR: [{ unitProduksiId: { in: areas, mode: "insensitive" } }, { UnitProduksi: { siteArea: { in: areas, mode: "insensitive" } } }] };
  }
  return { id: "__NO_CONFIGURED_SCOPE__" };
}
