import { useState, useCallback } from "react";
import { RoleType } from "./useAuthData";

interface UsePoDetailModalProps {
  role?: RoleType;
  regional?: string | null;
}

export function usePoDetailModal({ role, regional }: UsePoDetailModalProps = {}) {
  const [openDetail, setOpenDetail] = useState(false);
  const [detailData, setDetailData] = useState<any | null>(null);

  const openModal = useCallback(async (po: any) => {
    const nopo = String(po?.noPo || po?.nopo || po?.poNumber || "").trim();
    let fullPo: any = po;
    
    if (nopo) {
      try {
        const params = new URLSearchParams();
        params.set("includeUnknown", "true");
        params.set("noPo", nopo);
        params.set("includeItems", "true");
        params.set("limit", "1");
        params.set("offset", "0");
        if (role === "rm" && regional) params.set("regional", regional);
        
        const res = await fetch(`/api/po?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        
        const first = Array.isArray((json as any)?.data)
          ? (json as any).data[0]
          : Array.isArray(json)
            ? (json as any)[0]
            : null;
            
        if (first) fullPo = first;
      } catch {}
    }

    const items: any[] = Array.isArray(fullPo?.Items) ? fullPo.Items : [];
    const mappedItems = items.map((it: any, idx: number) => ({
      id: it?.id ?? `${it?.Product?.name || "item"}-${it?.pcs || 0}-${it?.hargaPcs || 0}-${idx}`,
      pcs: Number(it?.pcs || 0),
      pcsKirim: Number(it?.pcsKirim || 0),
      hargaPcs: Number(it?.hargaPcs || 0),
      nominal: Number(it?.nominal || 0),
      rpTagih: Number(it?.rpTagih || 0),
      Product: {
        name: String(it?.Product?.name || "-"),
        satuanKg: typeof it?.Product?.satuanKg === "number" ? it.Product.satuanKg : undefined,
      },
    }));

    const getCompanyName = (po: any) => {
      const candidates = ["company", "companyName", "vendor", "supplier", "namaPt", "retailer", "name"];
      for (const key of candidates) {
        const v = (po as any)[key];
        if (!v) continue;
        if (typeof v === "string" && v.trim().length > 0) return v;
        if (typeof v === "object") {
          if (v?.name) return v.name;
          if (v?.namaPt) return v.namaPt;
        }
      }
      if (po?.RitelModern?.namaPt) return po.RitelModern.namaPt;
      return "Unknown";
    };

    setDetailData({
      id: fullPo?.id || "",
      noPo: fullPo?.noPo || fullPo?.nopo || "-",
      company: getCompanyName(fullPo),
      createdAt: fullPo?.createdAt || null,
      updatedAt: fullPo?.updatedAt || null,
      tglPo: fullPo?.tglPo || null,
      expiredTgl: fullPo?.expiredTgl || null,
      linkPo: fullPo?.linkPo || null,
      noInvoice: fullPo?.noInvoice || null,
      siteArea:
        fullPo?.UnitProduksi?.siteArea && fullPo.UnitProduksi.siteArea !== "UNKNOWN"
          ? fullPo.UnitProduksi.siteArea
          : "-",
      tujuanDetail: fullPo?.tujuanDetail || null,
      regional: fullPo?.regional || fullPo?.UnitProduksi?.namaRegional || null,
      Items: mappedItems,
      
      tglKirim: fullPo?.tglkirim || fullPo?.tglKirim || null,
      buktiTagih: fullPo?.buktiTagih || null,
      buktiBayar: fullPo?.buktiBayar || null,
      buktiKirim: fullPo?.buktiKirim || null,
      buktiFp: fullPo?.buktiFp || null,
      namaSupir: fullPo?.namaSupir || null,
      platNomor: fullPo?.platNomor || null,

      status: {
        kirim: !!fullPo?.statusKirim,
        sdif: !!fullPo?.statusSdif,
        po: !!fullPo?.statusPo,
        fp: !!fullPo?.statusFp,
        kwi: !!fullPo?.statusKwi,
        inv: !!fullPo?.statusInv,
        tagih: !!fullPo?.statusTagih,
        bayar: !!fullPo?.statusBayar,
      },
      remarks: fullPo?.remarks || null,
    });
    setOpenDetail(true);
  }, [role, regional]);

  return { openDetail, setOpenDetail, detailData, openModal };
}
