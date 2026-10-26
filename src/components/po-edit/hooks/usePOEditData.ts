"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getMe, getMeSync } from "@/lib/me";
import { parseVal as parseRupiah } from "@/lib/format";
import { EditItem, POStatus, ReturnMode } from "../types";

export function usePOEditData(
  open: boolean,
  noPo: string | null,
  returnMode: ReturnMode = "full",
  onSaved?: (updated: any) => void,
  onClose?: () => void,
) {
  const norm = (s: any) =>
    String(s ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const isSiteArea = getMeSync()?.role === "sitearea";
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const [po, setPo] = useState<any | null>(null);
  const [productData, setProductData] = useState<any[]>([]);
  const [ritelData, setRitelData] = useState<any[]>([]);
  const [unitData, setUnitData] = useState<any[]>([]);

  const [inisial, setInisial] = useState("");
  const [company, setCompany] = useState("");
  const [regional, setRegional] = useState("");
  const [siteArea, setSiteArea] = useState("");

  const [noPoValue, setNoPoValue] = useState("");
  const [tglPo, setTglPo] = useState("");
  const [expiredTgl, setExpiredTgl] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [noInvoice, setNoInvoice] = useState("");
  const [linkPo, setLinkPo] = useState("");
  const [tglKirim, setTglKirim] = useState("");
  const [remarks, setRemarks] = useState("");
  const [buktiTagih, setBuktiTagih] = useState("");
  const [buktiBayar, setBuktiBayar] = useState("");
  const [namaSupir, setNamaSupir] = useState("");
  const [platNomor, setPlatNomor] = useState("");
  const [buktiKirim, setBuktiKirim] = useState("");
  const [buktiFp, setBuktiFp] = useState("");
  const [status, setStatus] = useState<POStatus>({
    kirim: false,
    sdif: false,
    po: false,
    fp: false,
    kwi: false,
    inv: false,
    tagih: false,
    bayar: false,
  });

  const [items, setItems] = useState<EditItem[]>([]);
  const [currentItem, setCurrentItem] = useState<{
    namaProduk: string;
    pcs: number | string;
    pcsKirim: number | string;
    hargaPcs: number | string;
    discount: number | string;
  }>({
    namaProduk: "",
    pcs: "",
    pcsKirim: "0",
    hargaPcs: "",
    discount: "",
  });

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  };

  const toYMD = (d: any) => {
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    const m = `${dt.getMonth() + 1}`.padStart(2, "0");
    const day = `${dt.getDate()}`.padStart(2, "0");
    return `${dt.getFullYear()}-${m}-${day}`;
  };

  const getSatuanKg = useCallback(
    (namaProduk: string) => {
      const pick = (Array.isArray(productData) ? productData : []).find(
        (p: any) =>
          String(p?.name || "")
            .trim()
            .toLowerCase() ===
          String(namaProduk || "")
            .trim()
            .toLowerCase(),
      );
      const s = Number(pick?.satuanKg ?? 1);
      return Number.isFinite(s) && s > 0 ? s : 1;
    },
    [productData],
  );

  const computeDerived = useCallback(
    (it: EditItem) => {
      const pcs = Number(it.pcs) || 0;
      const pcsKirim = Number(it.pcsKirim) || 0;
      const hargaPcs = Number(it.hargaPcs) || 0;
      const discount = parseRupiah(it.discount);
      const satuan = getSatuanKg(it.namaProduk);
      const hargaKg = satuan > 0 ? hargaPcs / satuan : 0;
      const kg = pcs * satuan;
      const kgKirim = pcsKirim * satuan;
      const divider = pcs || 1;
      const nominalOriginal = Math.max(0, hargaPcs * pcs - discount);
      const nominalAktualGross = hargaPcs * pcsKirim;
      const actualDiscount = (discount / divider) * pcsKirim;
      const rpTagih = Math.max(0, nominalAktualGross - actualDiscount);

      return {
        pcs,
        pcsKirim,
        hargaPcs,
        discount,
        hargaKg,
        kg,
        kgKirim,
        nominal: nominalOriginal,
        rpTagih,
        actualDiscount,
      };
    },
    [getSatuanKg],
  );

  const productOptions = useMemo(() => {
    const pinnedProducts = ["punokawan 5 kg", "befood setra ramos 5 kg"].map(
      (s) => norm(s),
    );
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

  const companyOptions = useMemo(() => {
    return Array.from(
      new Set(
        (Array.isArray(ritelData) ? ritelData : []).map((r: any) =>
          String(r?.namaPt || "").trim(),
        ),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [ritelData]);

  const companyRitelRows = useMemo(() => {
    if (!company) return [];
    return (Array.isArray(ritelData) ? ritelData : []).filter(
      (r: any) => norm(r?.namaPt) === norm(company),
    );
  }, [ritelData, company]);

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
    !!inisial && inisialOptions.some((o) => norm(o) === norm(inisial));

  const tujuanOptions = useMemo(() => {
    const base = isKnownInisial
      ? companyRitelRows.filter((r: any) => norm(r?.inisial) === norm(inisial))
      : companyRitelRows;
    return Array.from(
      new Set(
        base.map((r: any) => String(r?.tujuan || "").trim()).filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [companyRitelRows, isKnownInisial, inisial]);

  const keyify = (s: any) =>
    String(s ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\bregional\b/g, "reg")
      .replace(/([a-z])([0-9])/g, "$1 $2")
      .replace(/([0-9])([a-z])/g, "$1 $2")
      .replace(/\s+/g, " ");

  const siteAreaOptions = useMemo(() => {
    if (!regional || !unitData || unitData.length === 0) return [];

    const map: Record<string, string[]> = {};
    for (const u of unitData) {
      const k = keyify(u.namaRegional || "");
      if (!k) continue;
      if (!map[k]) map[k] = [];
      if (u.siteArea && u.siteArea !== "UNKNOWN") {
        map[k].push(String(u.siteArea).trim());
      }
    }

    const siteRegionalKeys = Object.keys(map);
    const regKey = keyify(regional);

    const resolvedKey =
      regKey && map[regKey]
        ? regKey
        : siteRegionalKeys.find(
            (k) => (regKey && k.includes(regKey)) || regKey.includes(k),
          ) || regKey;

    const options = resolvedKey ? map[resolvedKey] || [] : [];
    return Array.from(new Set(options)).sort((a, b) => a.localeCompare(b));
  }, [unitData, regional]);

  const regionalOptions = useMemo(() => {
    return Array.from(
      new Set(
        (Array.isArray(unitData) ? unitData : [])
          .map((u: any) => String(u?.namaRegional || "").trim())
          .filter(Boolean),
      ),
    )
      .sort((a, b) => a.localeCompare(b))
      .map((r) => ({ label: r, value: r }));
  }, [unitData]);

  useEffect(() => {
    if (!open || !noPo) return;
    let active = true;
    const run = async () => {
      setLoading(true);
      try {
        const resPo = await fetch(
          `/api/po?includeUnknown=true&noPo=${encodeURIComponent(noPo)}`,
          {
            cache: "no-store",
          },
        );
        const poJson = await resPo.json();
        const poRow = Array.isArray(poJson) ? poJson[0] : poJson?.[0] || poJson;
        const cName = String(
          poRow?.RitelModern?.namaPt || poRow?.company || "",
        ).trim();

        const [prodJson, unitJson, ritelJson] = await Promise.all([
          fetch(`/api/product?limit=500&offset=0`, { cache: "no-store" }).then(
            (r) => r.json(),
          ),
          fetch(`/api/unit-produksi`, { cache: "no-store" }).then((r) =>
            r.json(),
          ),
          fetch(`/api/ritel?limit=1000`, { cache: "no-store" }).then((r) =>
            r.json(),
          ),
        ]);

        const prods = Array.isArray(prodJson)
          ? prodJson
          : Array.isArray((prodJson as any)?.data)
            ? (prodJson as any).data
            : [];
        const units = Array.isArray(unitJson)
          ? unitJson
          : Array.isArray((unitJson as any)?.data)
            ? (unitJson as any).data
            : [];
        const ritels = Array.isArray(ritelJson)
          ? ritelJson
          : Array.isArray((ritelJson as any)?.data)
            ? (ritelJson as any).data
            : [];

        if (!active) return;
        setPo(poRow || null);
        setProductData(prods);
        setUnitData(units);
        setRitelData(ritels);
        setCompany(cName);
        setInisial(String(poRow?.RitelModern?.inisial || ""));

        const rawReg = String(
          poRow?.regional || poRow?.UnitProduksi?.namaRegional || "",
        ).trim();
        let resolvedReg = rawReg;

        if (rawReg && rawReg !== "UNKNOWN") {
          const rKey = keyify(rawReg);
          const match = units.find((u: any) => keyify(u.namaRegional) === rKey);
          if (match && match.namaRegional) {
            resolvedReg = match.namaRegional;
          }
        }

        const session = await getMe();
        if (session && session.role === "rm" && session.regional) {
          setRegional(session.regional);
        } else {
          if (resolvedReg === "UNKNOWN" || resolvedReg.includes("BELUM ADA")) {
            setRegional("");
          } else {
            setRegional(resolvedReg);
          }
        }

        const rawSite = String(
          poRow?.siteArea || poRow?.UnitProduksi?.siteArea || "",
        ).trim();
        if (
          rawSite === "UNKNOWN" ||
          rawSite.includes("BELUM ADA") ||
          rawSite === "-"
        ) {
          setSiteArea("");
        } else {
          setSiteArea(rawSite);
        }

        setNoPoValue(String(poRow?.noPo || noPo || ""));
        setTglPo(toYMD(poRow?.tglPo));
        setExpiredTgl(toYMD(poRow?.expiredTgl));
        setTujuan(String(poRow?.tujuanDetail || ""));
        setNoInvoice(String(poRow?.noInvoice || ""));
        setLinkPo(String(poRow?.linkPo || ""));
        setTglKirim(toYMD(poRow?.tglkirim || null));
        setRemarks(String(poRow?.remarks || ""));
        setBuktiTagih(String(poRow?.buktiTagih || ""));
        setBuktiBayar(String(poRow?.buktiBayar || ""));
        setBuktiKirim(String(poRow?.buktiKirim || ""));
        setBuktiFp(String(poRow?.buktiFp || ""));
        setNamaSupir(String(poRow?.namaSupir || ""));
        setPlatNomor(String(poRow?.platNomor || ""));
        setStatus({
          kirim: !!poRow?.statusKirim,
          sdif: !!poRow?.statusSdif,
          po: !!poRow?.statusPo,
          fp: !!poRow?.statusFp,
          kwi: !!poRow?.statusKwi,
          inv: !!poRow?.statusInv,
          tagih: !!poRow?.statusTagih,
          bayar: !!poRow?.statusBayar,
        });

        const mapped: EditItem[] = (
          Array.isArray(poRow?.Items) ? poRow.Items : []
        ).map((x: any, idx: number) => ({
          id: String(x?.id || `${idx}-${crypto.randomUUID()}`),
          namaProduk: String(x?.Product?.name || x?.namaProduk || "").trim(),
          pcs: Number(x?.pcs) || 0,
          pcsKirim: Number(x?.pcsKirim) || 0,
          hargaPcs: Number(x?.hargaPcs) || 0,
          discount: Number(x?.discount) || 0,
        }));
        setItems(mapped);
        setCurrentItem({
          namaProduk: "",
          pcs: "",
          pcsKirim: "0",
          hargaPcs: "",
          discount: "",
        });
      } catch {
        if (!active) return;
        setPo(null);
        setItems([]);
        showToast("error", "Gagal memuat detail PO");
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [open, noPo]);

  useEffect(() => {
    if (!items || items.length === 0) return;
    const isShipped = items.some((item) => (Number(item.pcsKirim) || 0) > 0);
    if (status.kirim !== isShipped) {
      setStatus((prevStatus) => ({ ...prevStatus, kirim: isShipped }));
    }
  }, [items, status.kirim]);

  useEffect(() => {
    if (!open) return;
    setToast(null);
  }, [open]);

  const handleChecklist = (field: string) => {
    setStatus((prev) => ({
      ...prev,
      [field]: !prev[field as keyof typeof prev],
    }));
  };

  const allChecklistChecked = useMemo(
    () => Object.values(status).every(Boolean),
    [status],
  );

  const toggleAllChecklist = useCallback(() => {
    setStatus((prev) => {
      const allOn = Object.values(prev).every(Boolean);
      const next: any = {};
      Object.keys(prev).forEach((k) => {
        next[k] = !allOn;
      });
      return next;
    });
  }, []);

  const invalidCurrentProduct =
    !!currentItem.namaProduk &&
    productOptions.length > 0 &&
    !productOptions.some((o) => norm(o) === norm(currentItem.namaProduk));

  const handleAddItem = () => {
    const nama = String(currentItem.namaProduk || "").trim();
    if (!nama || !currentItem.pcs || !currentItem.hargaPcs) {
      showToast("error", "Lengkapi Nama Produk, PCS, dan Harga/Pcs");
      return;
    }
    if (
      productOptions.length > 0 &&
      !productOptions.some((o) => norm(o) === norm(nama))
    ) {
      showToast("error", "Nama produk tidak ada di daftar");
      return;
    }
    const newItem: EditItem = {
      id: crypto.randomUUID(),
      namaProduk: nama,
      pcs: currentItem.pcs,
      pcsKirim: currentItem.pcsKirim === "" ? 0 : currentItem.pcsKirim,
      hargaPcs: currentItem.hargaPcs,
      discount: parseRupiah(currentItem.discount),
    };
    setItems((prev) => [...prev, newItem]);
    setCurrentItem({
      namaProduk: "",
      pcs: "",
      pcsKirim: "0",
      hargaPcs: "",
      discount: "",
    });
  };

  const canSubmit =
    !!company.trim() &&
    !!noPoValue.trim() &&
    !!tglPo &&
    !!expiredTgl &&
    !!tujuan.trim() &&
    items.length > 0;

  const handleSave = async () => {
    if (!po) return;
    if (!canSubmit) {
      showToast(
        "error",
        "Lengkapi Tgl PO, Expired, Tujuan, dan minimal 1 item",
      );
      return;
    }
    setSaving(true);
    try {
      const originalNoPo = String(po?.noPo || noPo || "").trim();
      const payload = {
        company: company.trim(),
        inisial: String(inisial || "").trim(),
        regional: String(regional || "").trim(),
        siteArea: String(siteArea || "").trim(),
        originalNoPo,
        noPo: noPoValue.trim(),
        tglPo,
        expiredTgl,
        linkPo: linkPo || null,
        noInvoice: noInvoice || null,
        tujuan: tujuan.trim(),
        remarks: remarks || null,
        buktiTagih: buktiTagih || null,
        buktiBayar: buktiBayar || null,
        buktiKirim: buktiKirim || null,
        buktiFp: buktiFp || null,
        namaSupir: namaSupir || null,
        platNomor: platNomor || null,
        tglKirim: tglKirim || undefined,
        status,
        updatedAt: po?.updatedAt ? new Date(po.updatedAt).toISOString() : undefined,
        items: items.map((it) => {
          const pcsBase = Number(it.pcs) || 1;
          const hargaPcs = Number(it.hargaPcs) || 0;
          const pcsKirim = Number(it.pcsKirim) || 0;
          const discountBase =
            Number(
              typeof it.discount === "number"
                ? it.discount
                : parseRupiah(it.discount),
            ) || 0;

          const actualDiscount = (discountBase / pcsBase) * pcsKirim;
          const rpTagih = Math.max(0, pcsKirim * hargaPcs - actualDiscount);

          return {
            id: it.id || undefined,
            namaProduk: String(it.namaProduk || "").trim(),
            pcs: Math.round(pcsBase),
            pcsKirim: Math.round(pcsKirim),
            hargaPcs: hargaPcs,
            discount: discountBase,
            rpTagih: rpTagih,
          };
        }),
      };

      const res = await fetch("/api/po", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = "Gagal menyimpan PO";
        try {
          const err = await res.json();
          msg = err?.error || msg;
        } catch {}
        throw new Error(msg);
      }

      const finalNoPo = noPoValue.trim() || String(noPo || "").trim();
      const url =
        returnMode === "summary"
          ? `/api/po?includeUnknown=true&summary=true&includeItems=false&noPo=${encodeURIComponent(finalNoPo)}`
          : `/api/po?includeUnknown=true&noPo=${encodeURIComponent(finalNoPo)}`;
      const ref = await fetch(url, { cache: "no-store" }).then((r) => r.json());
      const updated = Array.isArray(ref)
        ? ref[0]
        : ref?.data?.[0] || ref?.[0] || ref;
      if (updated && onSaved)
        onSaved({ ...updated, __originalNoPo: originalNoPo });
      showToast("success", "PO berhasil diupdate");
      if (onClose) onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal menyimpan PO";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => {
    let nominal = 0;
    let tagih = 0;
    for (const it of items) {
      const d = computeDerived(it);
      nominal += d.nominal;
      tagih += d.rpTagih;
    }
    return { nominal, tagih };
  }, [items, computeDerived]);

  return {
    isSiteArea,
    loading,
    saving,
    toast,
    po,
    inisial,
    setInisial,
    company,
    setCompany,
    regional,
    setRegional,
    siteArea,
    setSiteArea,
    noPoValue,
    setNoPoValue,
    tglPo,
    setTglPo,
    expiredTgl,
    setExpiredTgl,
    tujuan,
    setTujuan,
    noInvoice,
    setNoInvoice,
    linkPo,
    setLinkPo,
    tglKirim,
    setTglKirim,
    remarks,
    setRemarks,
    buktiTagih,
    setBuktiTagih,
    buktiBayar,
    setBuktiBayar,
    namaSupir,
    setNamaSupir,
    platNomor,
    setPlatNomor,
    buktiKirim,
    setBuktiKirim,
    buktiFp,
    setBuktiFp,
    status,
    setStatus,
    items,
    setItems,
    currentItem,
    setCurrentItem,
    computeDerived,
    productOptions,
    companyOptions,
    inisialOptions,
    tujuanOptions,
    siteAreaOptions,
    regionalOptions,
    handleChecklist,
    allChecklistChecked,
    toggleAllChecklist,
    invalidCurrentProduct,
    handleAddItem,
    canSubmit,
    handleSave,
    totals,
  };
}
