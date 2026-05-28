"use client";

import {
  Check,
  Eye,
  LinkIcon,
  MapPin,
  Pencil,
  Plus,
  Save,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import Combobox from "@/components/combobox";
import Select from "@/components/select";
import { useRouter, useSearchParams } from "next/navigation";
import { PO_FORM_LABELS } from "@/lib/po-form-labels";
import DateInputHybrid from "@/components/DateInputHybrid";
import { getMe, getMeSync } from "@/lib/me";
import POSummaryCards from "./components/POSummaryCards";
import POFormSection from "./components/POFormSection";
import POTableSection from "./components/POTableSection";

type ItemPO = {
  id: string;
  namaProduk: string;
  pcs: number | string;
  pcsKirim: number | string;
  hargaPcs: number | string;
  discount: number;
  // Computed for display
  kg?: number;
  kgKirim?: number;
  hargaKg: number;
  nominal: number;
  rpTagih: number;
};

type StatusDoc = {
  kirim: boolean;
  sdif: boolean;
  po: boolean;
  fp: boolean;
  kwi: boolean;
  inv: boolean;
  tagih: boolean;
  bayar: boolean;
};

const INITIAL_STATUS: StatusDoc = {
  kirim: false,
  sdif: false,
  po: false,
  fp: false,
  kwi: false,
  inv: false,
  tagih: false,
  bayar: false,
};

const INITIAL_FORM: {
  company: string;
  inisial: string;
  regional: string;
  noPo: string;
  tglPo: string;
  linkPo: string;
  expiredTgl: string;
  tglKirim: string;
  siteArea: string;
  noInvoice: string;
  tujuan: string;
  status: StatusDoc;
  remarks: string;
  buktiTagih: string;
  buktiBayar: string;
  buktiKirim: string;
  buktiFp: string;
} = {
  company: "",
  inisial: "",
  regional: "",
  noPo: "",
  tglPo: "",
  linkPo: "",
  expiredTgl: "",
  tglKirim: "",
  siteArea: "",
  noInvoice: "",
  tujuan: "",
  status: { ...INITIAL_STATUS },
  remarks: "",
  buktiTagih: "",
  buktiBayar: "",
  buktiKirim: "",
  buktiFp: "",
};

function InputPODetailPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const numberNoSpinner =
    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const [submitting, setSubmitting] = useState(false);
  const [poDrafts, setPoDrafts] = useState<
    Array<{
      noPo: string;
      tglPo: string;
      expiredTgl: string;
      linkPo: string;
      noInvoice: string;
      tujuan: string;
      status: StatusDoc;
      remarks: string;
      items: ItemPO[];
    }>
  >([]);
  const [formData, setFormData] = useState({
    ...INITIAL_FORM,
  });
  const [me, setMe] = useState<any>(null);

  // State for Items
  const [items, setItems] = useState<ItemPO[]>([]);
  const [currentItem, setCurrentItem] = useState({
    namaProduk: "",
    pcs: "" as number | string,
    pcsKirim: "" as number | string,
    hargaPcs: "" as number | string,
    discount: "" as number | string,
  });
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState({
    pcs: "",
    pcsKirim: "",
    hargaPcs: "",
    discount: "",
  });
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3200);
  };

  const [ritelData, setRitelData] = useState<any[]>([]);
  const [unitData, setUnitData] = useState<any[]>([]);
  const [productData, setProductData] = useState<any[]>([]);

  useEffect(() => {
    const noPo = searchParams?.get("noPo");
    if (noPo) return;
    setFormData({ ...INITIAL_FORM });
    setItems([]);
    setPoDrafts([]);
    setCurrentItem({
      namaProduk: "",
      pcs: "",
      pcsKirim: "",
      hargaPcs: "",
      discount: "",
    });
    setPreviewItemId(null);
    setEditingItemId(null);
    setEditItem({ pcs: "", pcsKirim: "", hargaPcs: "", discount: "" });
    try {
      localStorage.removeItem("po.current.form");
      localStorage.removeItem("po.current.items");
      localStorage.removeItem("po.drafts");
    } catch {}
  }, [searchParams]);

  // Computed values for current item form (after productData is declared)
  const currentPcsNum = parseFloat(currentItem.pcs.toString()) || 0;
  const currentHargaPcsNum = parseFloat(currentItem.hargaPcs.toString()) || 0;
  const currentPcsKirimNum = parseFloat(currentItem.pcsKirim.toString()) || 0;
  const parseRupiah = (v: any) =>
    Math.max(0, Number(String(v ?? "").replace(/[^0-9]/g, "")) || 0);
  const currentDiscountNum = parseRupiah(currentItem.discount);
  const satuanKgSelected =
    (Array.isArray(productData)
      ? productData.find((p: any) => p?.name === currentItem.namaProduk)
          ?.satuanKg
      : undefined) || 0;
  const currentHargaKg =
    satuanKgSelected > 0 ? currentHargaPcsNum / satuanKgSelected : 0;
  const currentNominal = Math.max(
    0,
    currentHargaPcsNum * currentPcsNum - currentDiscountNum,
  );
  const currentRpTagih = Math.max(
    0,
    currentHargaPcsNum * currentPcsKirimNum - currentDiscountNum,
  );
  const currentKg = currentPcsNum * (satuanKgSelected || 0);
  const currentKgKirim = currentPcsKirimNum * (satuanKgSelected || 0);

  const totalsAll = useMemo(() => {
    return items.reduce(
      (acc, it) => ({
        nominal: acc.nominal + it.nominal,
        tagihan: acc.tagihan + it.rpTagih,
      }),
      { nominal: 0, tagihan: 0 },
    );
  }, [items]);

  const getSatuanKg = (namaProduk: string) => {
    const satuan =
      (Array.isArray(productData)
        ? productData.find((p: any) => p?.name === namaProduk)?.satuanKg
        : undefined) || 0;
    const n = Number(satuan);
    return Number.isFinite(n) ? n : 0;
  };
  const computeDerived = (
    namaProduk: string,
    pcsRaw: any,
    pcsKirimRaw: any,
    hargaPcsRaw: any,
    discountRaw: any,
  ) => {
    const satuan = getSatuanKg(namaProduk);
    const pcs = Number(pcsRaw) || 0;
    const pcsKirim = Number(pcsKirimRaw) || 0;
    const hargaPcs = Number(hargaPcsRaw) || 0;
    const discount = parseRupiah(discountRaw);
    const hargaKg = satuan > 0 ? hargaPcs / satuan : 0;
    const nominal = Math.max(0, hargaPcs * pcs - discount);
    const rpTagih = Math.max(0, hargaPcs * pcsKirim - discount);
    const kg = pcs * satuan;
    const kgKirim = pcsKirim * satuan;
    return {
      pcs,
      pcsKirim,
      hargaPcs,
      discount,
      satuan,
      hargaKg,
      nominal,
      rpTagih,
      kg,
      kgKirim,
    };
  };

  const handleTogglePreviewItem = (id: string) => {
    setPreviewItemId((prev) => (prev === id ? null : id));
  };
  const handleStartEditItem = (item: ItemPO) => {
    setEditingItemId(item.id);
    setPreviewItemId(item.id);
    setEditItem({
      pcs: String(item.pcs ?? ""),
      pcsKirim: String(item.pcsKirim ?? ""),
      hargaPcs: String(item.hargaPcs ?? ""),
      discount: String(
        item.discount ? item.discount.toLocaleString("id-ID") : "",
      ),
    });
  };
  const handleCancelEditItem = () => {
    setEditingItemId(null);
    setEditItem({ pcs: "", pcsKirim: "", hargaPcs: "", discount: "" });
  };
  const handleSaveEditItem = (item: ItemPO) => {
    if (!editItem.pcs || !editItem.hargaPcs) {
      showToast("error", "Lengkapi PCS dan Harga/Pcs");
      return;
    }
    const d = computeDerived(
      item.namaProduk,
      editItem.pcs,
      editItem.pcsKirim,
      editItem.hargaPcs,
      editItem.discount,
    );
    if (d.pcs <= 0 || d.hargaPcs <= 0) {
      showToast("error", "PCS dan Harga/Pcs harus lebih dari 0");
      return;
    }

    // 👇 INI YANG DIBENARIN (Bungkus pakai setItems)
    setItems((prev) => {
      const newItems = prev.map((it) =>
        it.id === item.id
          ? {
              ...it,
              pcs: d.pcs,
              pcsKirim: d.pcsKirim,
              hargaPcs: d.hargaPcs,
              discount: d.discount,
              kg: d.kg,
              kgKirim: d.kgKirim,
              hargaKg: d.hargaKg,
              nominal: d.nominal,
              rpTagih: d.rpTagih,
            }
          : it,
      );

      // AUTO-CHECK KIRIM STATUS
      const isShipped = newItems.some((it) => (Number(it.pcsKirim) || 0) > 0);
      setFormData((f) => ({ ...f, status: { ...f.status, kirim: isShipped } }));

      return newItems;
    });

    setEditingItemId(null);
    setEditItem({ pcs: "", pcsKirim: "", hargaPcs: "", discount: "" });
    showToast("success", "Item berhasil diupdate");
  };

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const [ritelRes, unitRes, prodRes] = await Promise.all([
          // FEATURE: Role-based Form Logic - Fetch All Master Data (Not transaction history)
          fetch("/api/ritel", {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/unit-produksi", {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/product", {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);
        const [d1, d2, d3] = await Promise.all([
          ritelRes.json(),
          unitRes.json(),
          prodRes.json(),
        ]);
        const ritels = Array.isArray(d1) ? d1 : d1?.data || [];
        const units = Array.isArray(d2) ? d2 : d2?.data || [];
        const prods = Array.isArray(d3) ? d3 : d3?.data || [];

        setRitelData(ritels);
        setUnitData(units);
        setProductData(prods);

        // FEATURE: Role-based Form Logic - Set Default Regional from Session
        getMe().then((usr) => {
          setMe(usr);
          if (usr.role === "rm" && usr.regional) {
            setFormData((prev) => ({ ...prev, regional: usr.regional as string }));
          }
        });
      } catch {
        setRitelData([]);
        setUnitData([]);
        setProductData([]);
      }
    };
    load();
    return () => controller.abort();
  }, []);

  // Prefill when editing existing PO via query noPo
  useEffect(() => {
    const noPo = searchParams?.get("noPo");
    if (!noPo) return;
    const loadPo = async () => {
      try {
        setItems([]);
        setPoDrafts([]);
        setFormData({ ...INITIAL_FORM });
        setCurrentItem({
          namaProduk: "",
          pcs: "",
          pcsKirim: "",
          hargaPcs: "",
          discount: "",
        });
        setPreviewItemId(null);
        setEditingItemId(null);
        setEditItem({ pcs: "", pcsKirim: "", hargaPcs: "", discount: "" });
        try {
          localStorage.removeItem("po.current.form");
          localStorage.removeItem("po.current.items");
          localStorage.removeItem("po.drafts");
        } catch {}
        const res = await fetch(
          `/api/po?includeUnknown=true&noPo=${encodeURIComponent(noPo)}`,
          {
            cache: "no-store",
          },
        );
        const data = await res.json();
        const po = Array.isArray(data) ? data[0] : data?.[0] || data;
        if (!po) return;
        const toYMD = (d: string | null) => {
          if (!d) return "";
          const dt = new Date(d);
          if (isNaN(dt.getTime())) return "";
          const m = `${dt.getMonth() + 1}`.padStart(2, "0");
          const day = `${dt.getDate()}`.padStart(2, "0");
          return `${dt.getFullYear()}-${m}-${day}`;
        };
        setFormData({
          ...INITIAL_FORM,
          company: po.RitelModern?.namaPt || "",
          regional: po.regional || "",
          noPo: po.noPo || "",
          tglPo: toYMD(po.tglPo || null),
          linkPo: po.linkPo || "",
          expiredTgl: toYMD(po.expiredTgl || null),
          siteArea:
            po.UnitProduksi?.siteArea && po.UnitProduksi.siteArea !== "UNKNOWN"
              ? po.UnitProduksi.siteArea
              : "",
          noInvoice: po.noInvoice || "",
          tujuan: po.tujuanDetail || "",
          inisial: po.RitelModern?.inisial || "",
          status: {
            kirim: !!po.statusKirim,
            sdif: !!po.statusSdif,
            po: !!po.statusPo,
            fp: !!po.statusFp,
            kwi: !!po.statusKwi,
            inv: !!po.statusInv,
            tagih: !!po.statusTagih,
            bayar: !!po.statusBayar,
          },
          remarks: po.remarks || "",
          buktiTagih: po.buktiTagih || "",
          buktiBayar: po.buktiBayar || "",
          buktiKirim: po.buktiKirim || "",
          buktiFp: po.buktiFp || "",
          tglKirim: toYMD(po.tglkirim || null),
        });
        const mappedItems: ItemPO[] = (po.Items || []).map((it: any) => {
          const satuan = Number(it?.Product?.satuanKg || 0) || 0;
          const pcsNum = Number(it?.pcs || 0);
          const pcsKirimNum = Number(it?.pcsKirim || 0);
          const hargaPcsNum = Number(it?.hargaPcs || 0);
          const hargaKgNum =
            typeof it?.hargaKg === "number" && isFinite(it.hargaKg)
              ? it.hargaKg
              : satuan > 0
                ? hargaPcsNum / satuan
                : 0;
          return {
            id: it.id || crypto.randomUUID(),
            namaProduk: it.Product?.name || "",
            pcs: pcsNum,
            pcsKirim: pcsKirimNum,
            hargaPcs: hargaPcsNum,
            discount: Number(it?.discount || 0),
            kg: pcsNum * satuan,
            kgKirim: pcsKirimNum * satuan,
            hargaKg: hargaKgNum,
            nominal: Number(it?.nominal || hargaPcsNum * pcsNum),
            rpTagih: Number(it?.rpTagih || hargaPcsNum * pcsKirimNum),
          };
        });
        setItems(mappedItems);
        showToast("info", `Edit mode: PO ${po.noPo} dimuat`);
      } catch {
        // ignore
      }
    };
    loadPo();
  }, [searchParams]);

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
    // DEBUG: Role-based Form Logic - Super Forgiving Match Debug
    if (formData.regional && unitData.length > 0) {
      console.log("DEBUG REGIONAL MATCH:", {
        session: formData.regional,
        dbSample: unitData[0]?.namaRegional,
      });
    }

    return Array.from(
      new Set(
        (Array.isArray(unitData) ? unitData : [])
          .filter((u: any) => {
            // FEATURE: Role-based Form Logic - Cascading Filter Site Area (Super Forgiving)
            if (!formData.regional) return false;

            const sRaw = String(formData.regional).toLowerCase().trim();
            const dRaw = String(u?.namaRegional || "")
              .toLowerCase()
              .trim();

            const sNorm = norm(sRaw);
            const dNorm = norm(dRaw);

            // 1. Basic Equality or Double-includes (e.g. "Makassar" vs "Regional 3 Makassar")
            if (
              sNorm === dNorm ||
              sNorm.includes(dNorm) ||
              dNorm.includes(sNorm)
            )
              return true;

            // 2. Keyword Split (Super Forgiving Match)
            // Abaikan noise seperti 'regional', 'reg', atau angka, ambil kata kunci utamanya saja
            const noise = ["regional", "reg"];
            const sKeywords = sNorm
              .split(/\s+/)
              .filter(
                (w) => !noise.includes(w) && isNaN(Number(w)) && w.length > 2,
              );

            // Jika ada kata kunci session yang terkandung dalam data DB, anggap match
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
          .filter(Boolean),
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

  const handleChecklist = (field: string) => {
    setFormData((prev) => ({
      ...prev,
      status: {
        ...prev.status,
        [field]: !prev.status[field as keyof typeof prev.status],
      },
    }));
  };

  const toggleAllChecklist = () => {
    setFormData((prev) => {
      const allOn = Object.values(prev.status).every(Boolean);
      const next: any = {};
      Object.keys(prev.status).forEach((k) => {
        next[k] = !allOn;
      });
      return { ...prev, status: next };
    });
  };

  const handleAddItem = () => {
    if (!currentItem.namaProduk || !currentItem.pcs || !currentItem.hargaPcs) {
      showToast("error", "Lengkapi data: produk, PCS, dan Harga/Pcs");
      return;
    }
    if (invalidProduct) {
      showToast("error", "Nama produk tidak ada di daftar");
      return;
    }

    const newItem: ItemPO = {
      id: crypto.randomUUID(),
      namaProduk: currentItem.namaProduk,
      pcs: currentItem.pcs,
      pcsKirim: currentItem.pcsKirim,
      hargaPcs: currentItem.hargaPcs,
      discount: currentDiscountNum,
      kg: currentKg,
      kgKirim: currentKgKirim,
      hargaKg: currentHargaKg,
      nominal: currentNominal,
      rpTagih: currentRpTagih,
    };

    setItems((prev) => {
      const nextArr = [...prev, newItem];
      // AUTO-CHECK KIRIM STATUS
      const isShipped = nextArr.some((it) => (Number(it.pcsKirim) || 0) > 0);
      setFormData((f) => ({ ...f, status: { ...f.status, kirim: isShipped } }));
      return nextArr;
    });
    // Reset current item form
    setCurrentItem({
      namaProduk: "",
      pcs: "",
      pcsKirim: "",
      hargaPcs: "",
      discount: "",
    });
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => {
      const nextArr = prev.filter((item) => item.id !== id);
      // AUTO-CHECK KIRIM STATUS
      const isShipped = nextArr.some((it) => (Number(it.pcsKirim) || 0) > 0);
      setFormData((f) => ({ ...f, status: { ...f.status, kirim: isShipped } }));
      return nextArr;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (companyLooksLikeInisial) {
      const msgs = [
        companyLooksLikeInisial
          ? "Nama company tidak boleh berupa inisial"
          : null,
      ]
        .filter(Boolean)
        .join("\n");
      showToast("error", `Periksa isian: ${msgs.replace(/\n/g, " | ")}`);
      return;
    }
    if (!formData.company || !formData.company.trim()) {
      showToast("error", "Nama company wajib diisi");
      return;
    }
    if (invalidCompany) {
      showToast("error", "Nama company tidak ada di daftar");
      return;
    }
    if (!formData.inisial || !formData.inisial.trim()) {
      showToast("error", "Inisial wajib diisi");
      return;
    }
    if (invalidInisial) {
      showToast("error", "Inisial tidak ada di daftar");
      return;
    }
    if (!formData.noPo || !formData.noPo.trim()) {
      showToast("error", "Nomor PO wajib diisi");
      return;
    }
    if (!formData.tglPo || !formData.tglPo.trim()) {
      showToast("error", "Tanggal PO wajib diisi");
      return;
    }
    if (!formData.expiredTgl || !formData.expiredTgl.trim()) {
      showToast("error", "Expired PO wajib diisi");
      return;
    }
    if (!formData.tujuan || !formData.tujuan.trim()) {
      showToast("error", "Tujuan (Toko/DC) wajib diisi");
      return;
    }
    if (invalidTujuan) {
      showToast("error", "Tujuan tidak ada di daftar");
      return;
    }
    if (items.length === 0) {
      showToast("error", "Minimal harus ada 1 produk");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    Promise.resolve()
      .then(async () => {
        const isEditMode = !!searchParams.get("noPo");
        if (!isEditMode) {
          const res = await fetch("/api/po/check-dupes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ noPoList: [String(formData.noPo).trim()] }),
          });
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            const exists: string[] = Array.isArray(data?.exists)
              ? data.exists.map(String)
              : [];
            if (exists.length > 0) {
              throw new Error(
                `No PO sudah ada: ${exists.slice(0, 5).join(", ")}${exists.length > 5 ? " ..." : ""}`,
              );
            }
          }
        }
        const { savePurchaseOrder } = await import("@/lib/api");
        const payload = {
          company: formData.company,
          inisial: formData.inisial,
          regional: formData.regional,
          noPo: formData.noPo,
          originalNoPo: isEditMode
            ? searchParams.get("noPo") || undefined
            : undefined,
          tglPo: formData.tglPo,
          linkPo: formData.linkPo,
          expiredTgl: formData.expiredTgl,
          siteArea: formData.siteArea,
          noInvoice: formData.noInvoice,
          tujuan: formData.tujuan,
          items: items.map(
            ({ namaProduk, pcs, pcsKirim, hargaPcs, discount }) => ({
              namaProduk,
              pcs,
              pcsKirim,
              hargaPcs,
              discount,
            }),
          ),
          remarks: formData.remarks,
          buktiTagih: formData.buktiTagih || null,
          buktiBayar: formData.buktiBayar || null,
          buktiKirim: formData.buktiKirim || null,
          buktiFp: formData.buktiFp || null,
          status: formData.status,
          tglKirim: formData.tglKirim || undefined,
        };
        await savePurchaseOrder(payload);
      })
      .then(() => {
        showToast(
          "success",
          `Berhasil menyimpan PO ${formData.noPo} untuk ${formData.company}`,
        );
        setPoDrafts([]);
        setItems([]);
        setFormData({ ...INITIAL_FORM });
        try {
          localStorage.removeItem("po.current.form");
          localStorage.removeItem("po.current.items");
          localStorage.removeItem("po.drafts");
        } catch {}
        router.push(`/purchase-order`);
      })
      .catch((err) => {
        const msg =
          err instanceof Error ? err.message : "Gagal menyimpan data PO";
        showToast("error", `${msg}. Data dipertahankan.`);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  // Helper format currency
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);

  // Helper format number
  const formatNumber = (val: number) =>
    new Intl.NumberFormat("id-ID").format(val);

  return (
    <div className="w-full pb-20 animate-in fade-in duration-500" suppressHydrationWarning>
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-bold ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : toast.type === "error"
                ? "bg-rose-600 text-white"
                : "bg-blue-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
      <POSummaryCards />
      {!hasMounted ? (
        <div className="py-20 flex flex-col items-center justify-center bg-white rounded-[32px] border border-slate-100 italic text-slate-400">
          Initializing form...
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
          suppressHydrationWarning
        >
          <POFormSection
            formData={formData} setFormData={setFormData}
            companyOptions={companyOptions} invalidCompany={invalidCompany} companyLooksLikeInisial={companyLooksLikeInisial}
            inisialOptions={inisialOptions} invalidInisial={invalidInisial} isKnownCompany={isKnownCompany}
            tujuanOptions={tujuanOptions} invalidTujuan={invalidTujuan} isKnownInisial={isKnownInisial}
            regionalOptions={regionalOptions} siteAreaOptions={siteAreaOptions}
            me={me}
            productOptions={productOptions} currentItem={currentItem} setCurrentItem={setCurrentItem} invalidProduct={invalidProduct}
            numberNoSpinner={numberNoSpinner} formatNumber={formatNumber} formatCurrency={formatCurrency} parseRupiah={parseRupiah}
            currentHargaKg={currentHargaKg} currentKg={currentKg} currentKgKirim={currentKgKirim} currentNominal={currentNominal} currentRpTagih={currentRpTagih}
            handleAddItem={handleAddItem}
            items={items} editingItemId={editingItemId} previewItemId={previewItemId} setPreviewItemId={setPreviewItemId} editItem={editItem} setEditItem={setEditItem} computeDerived={computeDerived}
            handleSaveEditItem={handleSaveEditItem} handleCancelEditItem={handleCancelEditItem} handleTogglePreviewItem={handleTogglePreviewItem} handleStartEditItem={handleStartEditItem} handleDeleteItem={handleDeleteItem} totalsAll={totalsAll}
            submitting={submitting}
            handleChecklist={handleChecklist} toggleAllChecklist={toggleAllChecklist}
          />
          {false && poDrafts.length > 0 && (
            <POTableSection
              poDrafts={poDrafts} setPoDrafts={setPoDrafts}
              me={me} submitting={submitting}
              formatNumber={formatNumber} formatCurrency={formatCurrency} parseRupiah={parseRupiah} numberNoSpinner={numberNoSpinner}
            />
          )}
        </form>
      )}
    </div>
  );
}

export default function InputPODetailPage() {
  return (
    <Suspense fallback={<div />}>
      <InputPODetailPageInner />
    </Suspense>
  );
}
