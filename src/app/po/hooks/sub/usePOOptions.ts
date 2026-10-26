import { useMemo } from "react";
import { getRegionalSynonyms } from "@/lib/utils/regional";

interface UsePOOptionsParams {
  ritelData: any[];
  unitData: any[];
  productData: any[];
  formData: any;
  currentItem: any;
}

export function usePOOptions({
  ritelData,
  unitData,
  productData,
  formData,
  currentItem,
}: UsePOOptionsParams) {
  const norm = (s: any) =>
    String(s ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const inisialUsedAsCompany = new Set(
    (Array.isArray(ritelData) ? ritelData : [])
      .filter(
        (r: any) =>
          r?.inisial && r?.namaPt && norm(r.inisial) !== norm(r.namaPt),
      )
      .map((r: any) => norm(r.inisial)),
  );

  const companyOptions = useMemo(() => {
    return Array.from(
      new Set(
        (Array.isArray(ritelData) ? ritelData : []).map((r: any) =>
          String(r?.namaPt || "").trim(),
        ),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [ritelData]);

  const isKnownCompany =
    !!formData.company &&
    companyOptions.some((o) => norm(o) === norm(formData.company));

  const companyRitelRows = useMemo(() => {
    if (!formData.company) return [];
    return (Array.isArray(ritelData) ? ritelData : []).filter(
      (r: any) => norm(r?.namaPt) === norm(formData.company),
    );
  }, [ritelData, formData.company]);

  const inisialOptions = useMemo(() => {
    return Array.from(
      new Set(
        companyRitelRows
          .map((r: any) => String(r?.inisial || "").trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [companyRitelRows]);

  const isKnownInisial =
    isKnownCompany &&
    !!formData.inisial &&
    inisialOptions.some((o) => norm(o) === norm(formData.inisial));

  const tujuanOptions = useMemo(() => {
    const base = isKnownInisial
      ? companyRitelRows.filter(
          (r: any) => norm(r?.inisial) === norm(formData.inisial),
        )
      : companyRitelRows;
    return Array.from(
      new Set(
        base.map((r: any) => String(r?.tujuan || "").trim()).filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [companyRitelRows, isKnownInisial, formData.inisial]);

  const siteAreaOptions = useMemo(() => {
    const terms = formData.regional ? getRegionalSynonyms(formData.regional) : [];

    return Array.from(
      new Set(
        (Array.isArray(unitData) ? unitData : [])
          .filter((u: any) => {
            if (!formData.regional) return false;

            const sRaw = String(formData.regional).toLowerCase().trim();
            const dRaw = String(u?.namaRegional || "")
              .toLowerCase()
              .trim();
            const kRaw = String(u?.kodeRegional || "")
              .toLowerCase()
              .trim();

            const sNorm = norm(sRaw);
            const dNorm = norm(dRaw);
            const kNorm = norm(kRaw);

            if (terms.includes(dNorm) || (kNorm && terms.includes(kNorm))) {
              return true;
            }

            if (
              sNorm === dNorm ||
              sNorm.includes(dNorm) ||
              dNorm.includes(sNorm)
            )
              return true;

            const noise = ["regional", "reg"];
            const sKeywords = sNorm
              .split(/\s+/)
              .filter(
                (w) => !noise.includes(w) && isNaN(Number(w)) && w.length > 2,
              );

            return sKeywords.some((sw) => dNorm.includes(sw));
          })
          .map((u: any) => String(u?.siteArea || "").trim())
          .filter((s) => s && s !== "UNKNOWN"),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [unitData, formData.regional]);

  const regionalOptions = useMemo(() => {
    return Array.from(
      new Set(
        (Array.isArray(unitData) ? unitData : [])
          .map((u: any) => String(u?.namaRegional || "").trim())
          .filter((r) => Boolean(r) && r.toUpperCase() !== "UNKNOWN"),
      ),
    )
      .sort((a, b) => a.localeCompare(b))
      .map((r) => ({ label: r, value: r }));
  }, [unitData]);

  const pinnedProducts = ["punokawan 5 kg", "befood setra ramos 5 kg"].map(
    (s) => norm(s),
  );
  
  const productOptions = useMemo(() => {
    const list = (Array.isArray(productData) ? productData : [])
      .map((p: any) => String(p?.name || "").trim())
      .filter(Boolean);
    return Array.from(new Set(list)).sort((a, b) => {
      const ai = pinnedProducts.indexOf(norm(a));
      const bi = pinnedProducts.indexOf(norm(b));
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
      return a.localeCompare(b);
    });
  }, [productData]);

  const companyLooksLikeInisial =
    !!formData.company && inisialUsedAsCompany.has(norm(formData.company));
  const invalidCompany = !!formData.company && !isKnownCompany;
  const invalidInisial =
    !!formData.inisial &&
    !inisialOptions.some((o) => norm(o) === norm(formData.inisial));
  const invalidTujuan =
    !!formData.tujuan &&
    isKnownInisial &&
    !tujuanOptions.some((o) => norm(o) === norm(formData.tujuan));
  const invalidProduct =
    !!currentItem.namaProduk &&
    !productOptions.some((o) => norm(o) === norm(currentItem.namaProduk));

  return {
    companyOptions,
    isKnownCompany,
    companyLooksLikeInisial,
    invalidCompany,
    inisialOptions,
    isKnownInisial,
    invalidInisial,
    tujuanOptions,
    invalidTujuan,
    siteAreaOptions,
    regionalOptions,
    productOptions,
    invalidProduct,
  };
}
