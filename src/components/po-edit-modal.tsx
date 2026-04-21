"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getMe, getMeSync } from "@/lib/me";

import Modal from "@/components/modal";
import Combobox from "@/components/combobox";
import Select from "@/components/select";
import { LinkIcon, MapPin, Minus, Plus, Copy, Truck, Eye } from "lucide-react";
import { PO_FORM_LABELS } from "@/lib/po-form-labels";
import DateInputHybrid from "@/components/DateInputHybrid";
import Swal from "sweetalert2";

type ReturnMode = "full" | "summary";

type Props = {
  open: boolean;
  onClose: () => void;
  noPo: string | null;
  returnMode?: ReturnMode;
  onSaved?: (updated: any) => void;
};

type EditItem = {
  id: string;
  namaProduk: string;
  pcs: number | string;
  pcsKirim: number | string;
  hargaPcs: number | string;
  discount: number | string;
};

export default function POEditModal({
  open,
  onClose,
  noPo,
  returnMode = "full",
  onSaved,
}: Props) {
  const numberNoSpinner =
    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const norm = (s: any) =>
    String(s ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
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
  const [status, setStatus] = useState({
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
    pcsKirim: "",
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

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);

  const parseRupiah = (v: any) =>
    Math.max(0, Number(String(v ?? "").replace(/[^0-9]/g, "")) || 0);

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
        nominal: nominalOriginal, // Original Net (Contract)
        rpTagih, // Net Aktual (Billable)
        actualDiscount
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

  // FEATURE: Role-based Form Logic - Master Data Combinations
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


  // UX FIX: Robust Regional Matching using keyify
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

    // 1. Group master data by keyified regional
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

    // 2. Resolve matching key with fallback (same as need-assign)
    const resolvedKey =
      regKey && map[regKey]
        ? regKey
        : siteRegionalKeys.find(
            (k) => (regKey && k.includes(regKey)) || regKey.includes(k),
          ) || regKey;

    const options = resolvedKey ? map[resolvedKey] || [] : [];

    // 3. Return unique and sorted options
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
          // FEATURE: Role-based Form Logic - Fetch All Master Data (Not transaction history)
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

        // FIX: Auto-mapping & Sanitizer untuk Regional dan Site Area
        const rawReg = String(
          poRow?.regional || poRow?.UnitProduksi?.namaRegional || "",
        ).trim();
        let resolvedReg = rawReg;

        // Auto-map alias DB (misal "REG 1") ke Master Data persis ("Regional 1")
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

        // Bersihkan string invalid agar Combobox tidak mem-filter dengan kata salah
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
          pcsKirim: "",
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

  // Smart Auto-Check KIRIM (Logika Longgar)
  useEffect(() => {
    // 1. Pastikan array items ada isinya
    if (!items || items.length === 0) return;

    // 2. Logika Baru: True asalkan ada minimal 1 produk yang Pcs Kirim > 0
    const isShipped = items.some((item) => (Number(item.pcsKirim) || 0) > 0);

    // 3. Sinkronisasi ke state status (Cegah infinite loop)
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
      pcsKirim: currentItem.pcsKirim,
      hargaPcs: currentItem.hargaPcs,
      discount: parseRupiah(currentItem.discount),
    };
    setItems((prev) => [...prev, newItem]);
    setCurrentItem({
      namaProduk: "",
      pcs: "",
      pcsKirim: "",
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
        items: items.map((it) => {
          const pcsBase = Number(it.pcs) || 1;
          const hargaPcs = Number(it.hargaPcs) || 0;
          const pcsKirim = Number(it.pcsKirim) || 0;
          const discountBase = Number(typeof it.discount === "number" ? it.discount : parseRupiah(it.discount)) || 0;
          
          // Re-calculate rpTagih during save for maximum safety
          const actualDiscount = (discountBase / pcsBase) * pcsKirim;
          const rpTagih = Math.max(0, Math.round((pcsKirim * hargaPcs) - actualDiscount));

          return {
            namaProduk: String(it.namaProduk || "").trim(),
            pcs: Math.round(pcsBase),
            pcsKirim: Math.round(pcsKirim),
            hargaPcs: hargaPcs,
            discount: discountBase,
            rpTagih: rpTagih
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
      onClose();
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={noPo ? `Edit PO - ${noPo}` : "Edit PO"}
      className="max-w-6xl"
    >
      {toast && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
              : toast.type === "error"
                ? "bg-rose-50 text-rose-700 border border-rose-100"
                : "bg-blue-50 text-blue-700 border border-blue-100"
          }`}
        >
          {toast.message}
        </div>
      )}

      {loading ? (
        <div className="py-14 text-center text-sm text-slate-500">
          Loading...
        </div>
      ) : !po ? (
        <div className="py-10 text-sm text-slate-600">
          Data PO tidak ditemukan.
        </div>
      ) : (
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  {PO_FORM_LABELS.company}
                </label>
                {/* FEATURE: Role-based Form Logic - Company Master Data Mapping */}
                <Combobox
                  options={companyOptions}
                  value={company}
                  onChange={(v) => {
                    setCompany(v);
                    setInisial("");
                  }}
                  placeholder="Pilih/Ketik Perusahaan..."
                />
              </div>


              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  {PO_FORM_LABELS.inisial}
                </label>
                <Combobox
                  options={inisialOptions}
                  value={inisial}
                  onChange={(v) => setInisial(v)}
                  placeholder="Ketik/cari inisial..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  {PO_FORM_LABELS.tujuan}
                </label>
                <Combobox
                  options={tujuanOptions}
                  value={tujuan}
                  onChange={(v) => setTujuan(v)}
                  placeholder="Ketik/cari tujuan..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  {PO_FORM_LABELS.tglPo}
                </label>
                <DateInputHybrid
                  value={tglPo}
                  onChange={(v) => {
                    setTglPo(v);
                    if (expiredTgl && v && expiredTgl < v) setExpiredTgl(v);
                  }}
                  className="w-full bg-slate-50 rounded-2xl"
                  placeholder="YYYY-MM-DD"
                  maxDate={expiredTgl}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  {PO_FORM_LABELS.expiredTgl}
                </label>
                <DateInputHybrid
                  value={expiredTgl}
                  onChange={setExpiredTgl}
                  className="w-full bg-slate-50 rounded-2xl"
                  placeholder="YYYY-MM-DD"
                  minDate={tglPo}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  {PO_FORM_LABELS.tglKirim}
                </label>
                <DateInputHybrid
                  value={tglKirim}
                  onChange={setTglKirim}
                  className="w-full bg-blue-50/30 rounded-2xl border border-blue-100"
                  placeholder="YYYY-MM-DD (opsional)"
                />
              </div>

              {/* Nama Supir & Plat Nomor dipindah ke bawah Remarks */}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  {PO_FORM_LABELS.regional}
                </label>
                {getMeSync()?.role === "rm" ? (
                  <div className="relative">
                    <MapPin
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      type="text"
                      disabled
                      value={regional}
                      className="w-full pl-11 pr-4 py-3 bg-slate-100 rounded-2xl text-sm font-semibold cursor-not-allowed text-slate-500 border border-slate-200"
                      placeholder="Loading..."
                    />
                  </div>
                ) : (
                  <Select
                    options={regionalOptions}
                    value={regional}
                    onChange={(v) => {
                      setRegional(v);
                      setSiteArea(""); // Reset site area agar tidak nyangkut dari regional sebelumnya
                    }}
                    placeholder="Pilih Regional"
                    leftIcon={<MapPin size={16} />}
                  />
                )}
              </div>


              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  {PO_FORM_LABELS.siteArea}
                </label>
                <Combobox
                  options={siteAreaOptions}
                  value={siteArea}
                  onChange={(v) => setSiteArea(v)}
                  placeholder="Ketik/cari site area..."
                  leftIcon={<MapPin size={16} />}
                  inputClassName="pl-11 pr-4"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  {PO_FORM_LABELS.linkPo}
                </label>
                <div className="relative">
                  <LinkIcon
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    type="url"
                    placeholder="https://..."
                    value={linkPo}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    onChange={(e) => setLinkPo(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  {PO_FORM_LABELS.noPo}
                </label>
                <input
                  value={noPoValue}
                  onChange={(e) => setNoPoValue(e.target.value)}
                  placeholder="Masukkan Nomor PO..."
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  {PO_FORM_LABELS.noInvoice}
                </label>
                <input
                  type="text"
                  placeholder="Nomor Invoice..."
                  value={noInvoice}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  onChange={(e) => {
                    const v = e.target.value;
                    setNoInvoice(v);
                    if (v.trim()) setStatus((p) => ({ ...p, inv: true }));
                  }}
                />
              </div>

              {/* Input Bukti Tagih & Bayar dipindahkan inline ke Checklist Dokumen */}
            </div>
          </section>

          <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h4 className="font-bold text-slate-800">
                {PO_FORM_LABELS.tambahItem}
              </h4>
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="md:col-span-4">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  {PO_FORM_LABELS.namaProduk}
                </label>
                <Combobox
                  options={productOptions}
                  value={String(currentItem.namaProduk || "")}
                  onChange={(v) =>
                    setCurrentItem((prev) => ({ ...prev, namaProduk: v }))
                  }
                  placeholder="Ketik/cari produk..."
                  inputClassName={
                    invalidCurrentProduct
                      ? "border border-rose-300 bg-rose-50 focus:ring-rose-200"
                      : ""
                  }
                />
                {invalidCurrentProduct && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    Nama produk tidak ada di daftar
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  {PO_FORM_LABELS.pcs}
                </label>
                <input
                  type="number"
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  value={currentItem.pcs}
                  onChange={(e) =>
                    setCurrentItem((p) => ({ ...p, pcs: e.target.value }))
                  }
                  className={`w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold ${numberNoSpinner}`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  {PO_FORM_LABELS.hargaPcs}
                </label>
                <input
                  type="number"
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  value={currentItem.hargaPcs}
                  onChange={(e) =>
                    setCurrentItem((p) => ({ ...p, hargaPcs: e.target.value }))
                  }
                  className={`w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold ${numberNoSpinner}`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  {PO_FORM_LABELS.pcsKirim}
                </label>
                <input
                  type="number"
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  value={currentItem.pcsKirim}
                  onChange={(e) =>
                    setCurrentItem((p) => ({ ...p, pcsKirim: e.target.value }))
                  }
                  className={`w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold ${numberNoSpinner}`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  {PO_FORM_LABELS.discount}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={currentItem.discount}
                  onChange={(e) =>
                    setCurrentItem((p) => ({ ...p, discount: e.target.value }))
                  }
                  onBlur={() =>
                    setCurrentItem((prev) => {
                      const n = parseRupiah(prev.discount);
                      return {
                        ...prev,
                        discount: n ? n.toLocaleString("id-ID") : "",
                      };
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold"
                />
              </div>
              <div className="col-span-full">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 active:scale-95 transition-all"
                >
                  <Plus size={18} />
                  Tambah Item
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-bold text-slate-800">
                {PO_FORM_LABELS.preview}
              </h4>
              <div className="text-sm font-bold text-indigo-700">
                Total Tagihan: {formatCurrency(totals.tagih)}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[1000px]">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">{PO_FORM_LABELS.namaProduk}</th>
                    <th className="px-4 py-3 text-right">
                      {PO_FORM_LABELS.pcs}
                    </th>
                    <th className="px-4 py-3 text-right">
                      {PO_FORM_LABELS.hargaPcs}
                    </th>
                    <th className="px-4 py-3 text-right">
                      {PO_FORM_LABELS.pcsKirim}
                    </th>
                    <th className="px-4 py-3 text-right">
                      {PO_FORM_LABELS.discount}
                    </th>
                    <th className="px-4 py-3 text-right">
                      {PO_FORM_LABELS.nominal}
                    </th>
                    <th className="px-4 py-3 text-center">
                      {PO_FORM_LABELS.aksi}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it) => {
                    const d = computeDerived(it);
                    return (
                      <tr key={it.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-700 uppercase">
                          {it.namaProduk || "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            value={it.pcs}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((x) =>
                                  x.id === it.id
                                    ? { ...x, pcs: e.target.value }
                                    : x,
                                ),
                              )
                            }
                            className={`w-24 px-2 py-1 rounded-lg border border-slate-200 bg-white text-right font-bold ${numberNoSpinner}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            value={it.hargaPcs}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((x) =>
                                  x.id === it.id
                                    ? { ...x, hargaPcs: e.target.value }
                                    : x,
                                ),
                              )
                            }
                            className={`w-32 px-2 py-1 rounded-lg border border-slate-200 bg-white text-right font-bold ${numberNoSpinner}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 group/pckirim">
                            <input
                              type="number"
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                              value={it.pcsKirim}
                              onChange={(e) =>
                                setItems((prev) =>
                                  prev.map((x) =>
                                    x.id === it.id
                                      ? { ...x, pcsKirim: e.target.value }
                                      : x,
                                  ),
                                )
                              }
                              className={`w-24 px-2 py-1 rounded-lg border border-slate-200 bg-white text-right font-bold ${numberNoSpinner}`}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setItems((prev) =>
                                  prev.map((x) =>
                                    x.id === it.id
                                      ? { ...x, pcsKirim: x.pcs }
                                      : x,
                                  ),
                                )
                              }
                              className="p-1.5 text-slate-400 opacity-50 group-hover/pckirim:opacity-100 hover:text-blue-600 hover:bg-blue-50 focus:opacity-100 focus:text-blue-600 focus:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-100"
                              title="Salin nilai dari PCS"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={
                                d.actualDiscount > 0
                                  ? Math.round(d.actualDiscount).toLocaleString("id-ID")
                                  : ""
                              }
                              onChange={(e) => {
                                const val = parseRupiah(e.target.value);
                                const orderPcs = Number(it.pcs) || 1;
                                const shipped = Number(it.pcsKirim) || 1;
                                // Reverse calculate base discount for the whole PO
                                const baseDiscount = (val / shipped) * orderPcs;

                                setItems((prev) =>
                                  prev.map((x) =>
                                    x.id === it.id
                                      ? { ...x, discount: Math.round(baseDiscount) }
                                      : x,
                                  ),
                                );
                              }}
                              className="w-32 px-2 py-1 rounded-lg border border-slate-200 bg-white text-right font-bold"
                            />
                            {parseRupiah(it.discount) > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const base = parseRupiah(it.discount);
                                  Swal.fire({
                                    title: "<strong>INFO DISKON AWAL</strong>",
                                    icon: "info",
                                    html: `
                                      <div style="text-align: left; font-size: 14px; line-height: 1.6;">
                                        <div style="margin-bottom: 8px;"><b>Produk:</b> <br/><span style="color: #64748b">${it.namaProduk}</span></div>
                                        <div style="margin-bottom: 8px;"><b>Diskon Master (100%):</b> <br/><span style="color: #e11d48; font-weight: 800; font-size: 16px;">Rp ${base.toLocaleString("id-ID")}</span></div>
                                        <div><b>Untuk Qty Total:</b> <br/><span style="color: #64748b">${it.pcs} PCS</span></div>
                                      </div>
                                    `,
                                    confirmButtonText: "Tutup",
                                    confirmButtonColor: "#004a87",
                                    customClass: {
                                      container: "z-[999999]",
                                      popup: "rounded-[24px]"
                                    }
                                  });
                                }}
                                className="p-1 hover:bg-slate-100 rounded-md transition-all group/eye"
                                title="Lihat diskon awal"
                                style={{ pointerEvents: 'auto' }}
                              >
                                <Eye 
                                  size={14} 
                                  className="text-slate-300 group-hover/eye:text-slate-600 transition-colors"
                                />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800 tabular-nums">
                          {formatCurrency(d.nominal)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setItems((prev) =>
                                prev.filter((x) => x.id !== it.id),
                              )
                            }
                            className="inline-flex items-center justify-center p-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                            title="Hapus"
                          >
                            <Minus size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td
                        className="px-4 py-6 text-sm text-slate-500"
                        colSpan={8}
                      >
                        Belum ada item.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="font-bold text-slate-800 text-lg">
                  {PO_FORM_LABELS.checklistDokumen}
                </h2>
                <button
                  type="button"
                  onClick={toggleAllChecklist}
                  className="px-3 py-1.5 rounded-xl text-xs font-black border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                >
                  {allChecklistChecked ? "Uncheck All" : "Check All"}
                </button>
              </div>

              <div className="space-y-3">
                {Object.keys(status).map((key) => {
                  const checked = status[key as keyof typeof status];
                  const label = key === "sdif" ? "SDI/F" : key.toUpperCase();
                  
                  if (key === 'kirim') {
                    return (
                      <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 rounded-lg gap-4 bg-white">
                        <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                          <input 
                            type="checkbox" 
                            checked={checked} 
                            onChange={() => handleChecklist(key)}
                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-bold text-slate-700">KIRIM</span>
                        </label>
                        <div className="flex-1">
                          <input 
                            type="text"
                            placeholder="Masukkan Ref Kirim..."
                            value={buktiKirim || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setBuktiKirim(v);
                              if (v.trim() && !checked) setStatus(prev => ({ ...prev, kirim: true }));
                            }}
                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    );
                  }

                  if (key === 'fp') {
                    return (
                      <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 rounded-lg gap-4 bg-white">
                        <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                          <input 
                            type="checkbox" 
                            checked={checked} 
                            onChange={() => handleChecklist(key)}
                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-bold text-slate-700">FP</span>
                        </label>
                        <div className="flex-1">
                          <input 
                            type="text"
                            placeholder="Masukkan Ref FP..."
                            value={buktiFp || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setBuktiFp(v);
                              if (v.trim() && !checked) setStatus(prev => ({ ...prev, fp: true }));
                            }}
                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    );
                  }
                  
                  if (key === 'tagih') {
                    return (
                      <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 rounded-lg gap-4 bg-white">
                        <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                          <input 
                            type="checkbox" 
                            checked={checked} 
                            onChange={() => handleChecklist(key)}
                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-bold text-slate-700">TAGIH</span>
                        </label>
                        <div className="flex-1">
                          <input 
                            type="text"
                            placeholder="Masukkan Ref Tagihan..."
                            value={buktiTagih || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setBuktiTagih(v);
                              if (v.trim() && !checked) setStatus(prev => ({ ...prev, tagih: true }));
                            }}
                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    );
                  }

                  if (key === 'bayar') {
                    return (
                      <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 rounded-lg gap-4 bg-white">
                        <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                          <input 
                            type="checkbox" 
                            checked={checked} 
                            onChange={() => handleChecklist(key)}
                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-bold text-slate-700">BAYAR</span>
                        </label>
                        <div className="flex-1">
                          <input 
                            type="text"
                            placeholder="Masukkan Ref Bayar..."
                            value={buktiBayar || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setBuktiBayar(v);
                              if (v.trim() && !checked) setStatus(prev => ({ ...prev, bayar: true }));
                            }}
                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <label
                      key={key}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleChecklist(key)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-bold text-slate-700">
                        {label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-bold text-slate-800 text-lg">
                  {PO_FORM_LABELS.remarks}
                </h2>
              </div>
              <textarea
                rows={4}
                value={remarks}
                placeholder="Tambahkan Jika Ada Keterangan..."
                className="w-full px-6 py-4 bg-slate-50 rounded-[24px] focus:ring-2 focus:ring-slate-200 outline-none text-sm font-medium transition-all"
                onChange={(e) => setRemarks(e.target.value)}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="col-span-1 md:col-span-2 flex items-center gap-2 mb-2">
                  <Truck size={16} className="text-sky-600" />
                  <h3 className="font-bold text-slate-700 text-sm">Logistik & Ekspedisi</h3>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nama Supir</label>
                  <input 
                    type="text" 
                    placeholder="Identitas Supir..." 
                    value={namaSupir || ""} 
                    onChange={(e) => setNamaSupir(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Plat Nomor</label>
                  <input 
                    type="text" 
                    placeholder="Plat Kendaraan..." 
                    value={platNomor || ""} 
                    onChange={(e) => setPlatNomor(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 uppercase" 
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-bold"
              disabled={saving}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSubmit || saving}
              className={`px-6 py-3 rounded-xl text-sm font-bold text-white ${
                !canSubmit || saving
                  ? "bg-slate-300"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
