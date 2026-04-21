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
        router.push(`/company`);
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

  const [editDraft, setEditDraft] = useState<{
    noPo: string;
    tglPo: string;
    expiredTgl: string;
    linkPo: string;
    noInvoice: string;
    tujuan: string;
    status: StatusDoc;
    remarks: string;
    items: ItemPO[];
  } | null>(null);
  const openEditDraft = (d: any) => {
    setEditDraft(JSON.parse(JSON.stringify(d)));
  };
  const closeEditDraft = () => {
    setEditDraft(null);
  };
  const saveEditDraft = () => {
    if (!editDraft) return;
    setPoDrafts((prev) =>
      prev.map((x) => (x.noPo === editDraft.noPo ? editDraft : x)),
    );
    closeEditDraft();
  };
  const [editPickerOpen, setEditPickerOpen] = useState(false);
  const [editPickerSelected, setEditPickerSelected] = useState<string>("");
  const [deletePickerOpen, setDeletePickerOpen] = useState(false);
  const [deleteSelection, setDeleteSelection] = useState<
    Record<string, boolean>
  >({});

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
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800">
          Input Detail Purchase Order
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Administrasi PO, Monitoring PO & Verifikasi Dokumen
        </p>
      </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-6">
              <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-sm">
                    1
                  </div>
                  <h2 className="font-bold text-slate-800 text-lg">
                    Data Referensi PO
                  </h2>
                </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                    {PO_FORM_LABELS.company}
                  </label>
                  <Combobox
                    options={companyOptions}
                    value={formData.company}
                    onChange={(v) =>
                      setFormData({
                        ...formData,
                        company: v,
                        inisial: "",
                        tujuan: "",
                      })
                    }
                    placeholder="Ketik/cari company..."
                    inputClassName={
                      invalidCompany || companyLooksLikeInisial
                        ? "border border-rose-300 bg-rose-50 focus:ring-rose-200"
                        : undefined
                    }
                  />
                  {invalidCompany && (
                    <p className="text-[11px] text-rose-600 mt-1">
                      Nama company tidak ada di daftar
                    </p>
                  )}
                  {companyLooksLikeInisial && (
                    <p className="text-[11px] text-rose-600 mt-1">
                      Nama company tidak valid (terdeteksi nilai inisial)
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                    {PO_FORM_LABELS.inisial}
                  </label>
                  <Combobox
                    options={inisialOptions}
                    value={formData.inisial}
                    onChange={(v) =>
                      setFormData({ ...formData, inisial: v, tujuan: "" })
                    }
                    placeholder="Ketik/cari inisial..."
                    inputClassName={
                      invalidInisial
                        ? "border border-rose-300 bg-rose-50 focus:ring-rose-200"
                        : undefined
                    }
                  />
                  {isKnownCompany && inisialOptions.length === 0 && (
                    <p className="text-[11px] text-rose-600 mt-1">
                      Inisial belum tersedia untuk company ini
                    </p>
                  )}
                  {invalidInisial && (
                    <p className="text-[11px] text-rose-600 mt-1">
                      Inisial tidak ada di daftar
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                    {PO_FORM_LABELS.tujuan}
                  </label>
                  <Combobox
                    options={tujuanOptions}
                    value={formData.tujuan}
                    onChange={(v) => setFormData({ ...formData, tujuan: v })}
                    placeholder="Ketik/cari tujuan..."
                    inputClassName={
                      invalidTujuan
                        ? "border border-rose-300 bg-rose-50 focus:ring-rose-200"
                        : undefined
                    }
                  />
                  {isKnownCompany && !isKnownInisial && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Pilih inisial dulu untuk melihat tujuan
                    </p>
                  )}
                  {invalidTujuan && (
                    <p className="text-[11px] text-rose-600 mt-1">
                      Tujuan tidak ada di daftar
                    </p>
                  )}
                </div>

                {/* Row 2: Dates */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                    {PO_FORM_LABELS.tglPo}
                  </label>
                  <DateInputHybrid
                    value={formData.tglPo}
                    onChange={(v) => {
                      setFormData((prev) => {
                        const next = { ...prev, tglPo: v };
                        if (v && next.expiredTgl && next.expiredTgl < v) {
                          next.expiredTgl = v;
                        }
                        return next;
                      });
                    }}
                    className="w-full bg-white rounded-2xl"
                    placeholder="YYYY-MM-DD"
                    maxDate={formData.expiredTgl}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                    {PO_FORM_LABELS.expiredTgl}
                  </label>
                  <div className="relative">
                    <DateInputHybrid
                      value={formData.expiredTgl}
                      onChange={(v) =>
                        setFormData({ ...formData, expiredTgl: v })
                      }
                      className="w-full bg-white rounded-2xl"
                      placeholder="YYYY-MM-DD"
                      minDate={formData.tglPo}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                    {PO_FORM_LABELS.tglKirim}
                  </label>
                  <DateInputHybrid
                    value={formData.tglKirim}
                    onChange={(v) => setFormData({ ...formData, tglKirim: v })}
                    className="w-full bg-white rounded-2xl"
                    placeholder="YYYY-MM-DD (opsional)"
                  />
                </div>

                {/* Row 3: Regional, Site Area, No Invoice */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                    {PO_FORM_LABELS.regional}
                  </label>
                  {me?.role === "rm" ? (
                    <div className="relative">
                      <MapPin
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        size={16}
                      />
                      <input
                        type="text"
                        disabled
                        value={formData.regional}
                        className="w-full pl-11 pr-4 py-3 bg-slate-100 rounded-2xl text-sm font-semibold cursor-not-allowed text-slate-500 border border-slate-200"
                        placeholder="Loading..."
                      />
                    </div>
                  ) : (
                    <Select
                      options={regionalOptions}
                      value={formData.regional}
                      onChange={(v) =>
                        setFormData({ ...formData, regional: v })
                      }
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
                    value={formData.siteArea}
                    onChange={(v) => setFormData({ ...formData, siteArea: v })}
                    placeholder={
                      !formData.regional
                        ? "Pilih Regional dulu..."
                        : "Ketik/cari site area..."
                    }
                    leftIcon={<MapPin size={16} />}
                    inputClassName="pl-11 pr-4"
                    disabled={!formData.regional}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                    {PO_FORM_LABELS.noInvoice}
                  </label>
                  <input
                    type="text"
                    placeholder="Nomor Invoice..."
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    value={formData.noInvoice}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        noInvoice: v,
                        status: { ...prev.status, inv: !!v.trim() },
                      }));
                    }}
                  />
                </div>

                {/* Row 4: Link PO */}
                <div className="md:col-span-3 space-y-1">
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
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      onChange={(e) =>
                        setFormData({ ...formData, linkPo: e.target.value })
                      }
                      value={formData.linkPo}
                    />
                  </div>
                </div>
              </div>
            </section>
            <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-sm">
                  2
                </div>
                <h2 className="font-bold text-slate-800 text-lg">PO Detail</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="md:col-span-4 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                    Nomor PO
                  </label>
                  <input
                    type="text"
                    placeholder="Masukkan Nomor PO..."
                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-semibold"
                    value={formData.noPo}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        noPo: v,
                        status: { ...prev.status, po: !!v.trim() },
                      }));
                    }}
                  />
                </div>
                <div className="md:col-span-4 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                    Nama Produk
                  </label>
                  <Combobox
                    options={productOptions}
                    value={currentItem.namaProduk}
                    onChange={(v) =>
                      setCurrentItem(() => ({
                        namaProduk: v,
                        pcs: "",
                        pcsKirim: "",
                        hargaPcs: "",
                        discount: "",
                      }))
                    }
                    placeholder="Ketik/cari produk..."
                    leftIcon={<Tag size={16} />}
                    inputClassName={`pl-11 pr-4 ${invalidProduct ? "border border-rose-300 bg-rose-50 focus:ring-rose-200" : ""}`}
                  />
                  {invalidProduct && (
                    <p className="text-[11px] text-rose-600 mt-1">
                      Nama produk tidak ada di daftar
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                    PCS
                  </label>
                  <input
                    type="number"
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    value={currentItem.pcs}
                    placeholder="Input Pcs"
                    className={`w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold ${numberNoSpinner}`}
                    onChange={
                      (e) =>
                        setCurrentItem((prev) => ({
                          ...prev,
                          pcs: e.target.value,
                        })) // Harus ke 'pcs'
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                    Harga /Pcs
                  </label>
                  <input
                    type="number"
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    value={currentItem.hargaPcs}
                    placeholder="Input Harga"
                    className={`w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold ${numberNoSpinner}`}
                    onChange={(e) =>
                      setCurrentItem((prev) => ({
                        ...prev,
                        hargaPcs: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                    PCS Kirim
                  </label>
                  <input
                    type="number"
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    value={currentItem.pcsKirim}
                    placeholder="Input Pcs Kirim"
                    className={`w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold ${numberNoSpinner}`}
                    onChange={
                      (e) =>
                        setCurrentItem((prev) => ({
                          ...prev,
                          pcsKirim: e.target.value,
                        })) // Harus ke 'pcsKirim'
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                    Discount
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={currentItem.discount}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold"
                    onChange={(e) =>
                      setCurrentItem((prev) => ({
                        ...prev,
                        discount: e.target.value,
                      }))
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
                  />
                </div>
                <div className="space-y-1">
                  <label
                    className="text-[10px] font-black text-slate-400 uppercase ml-1"
                    title="Rumus: Harga/Kg = Harga/Pcs ÷ (kg/pcs produk)"
                  >
                    Harga /Kg
                  </label>
                  <div
                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold text-slate-500"
                    title="Harga/Kg = Harga/Pcs ÷ kg/pcs"
                  >
                    {formatCurrency(currentHargaKg)}
                  </div>
                </div>
                <div className="space-y-1">
                  <label
                    className="text-[10px] font-black text-slate-400 uppercase ml-1"
                    title="Rumus: KG = PCS × (kg/pcs produk)"
                  >
                    KG (pcs × satuan)
                  </label>
                  <div
                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold text-slate-500"
                    title="KG = PCS × kg/pcs"
                  >
                    {formatNumber(currentKg)}
                  </div>
                </div>
                <div className="space-y-1">
                  <label
                    className="text-[10px] font-black text-slate-400 uppercase ml-1"
                    title="Rumus: KG Kirim = PCS Kirim × (kg/pcs produk)"
                  >
                    KG Kirim (pcs × satuan)
                  </label>
                  <div
                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold text-slate-500"
                    title="KG Kirim = PCS Kirim × kg/pcs"
                  >
                    {formatNumber(currentKgKirim)}
                  </div>
                </div>
                <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label
                      className="text-[10px] font-black text-slate-400 uppercase ml-1"
                      title="Rumus: Nominal = (Harga/Pcs × PCS) - Discount"
                    >
                      Nominal Original
                    </label>
                    <div
                      className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold text-slate-500"
                      title="Nominal = (Harga/Pcs × PCS) - Discount"
                    >
                      {formatCurrency(currentNominal)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label
                      className="text-[10px] font-black text-indigo-400 uppercase ml-1"
                      title="Rumus: Rp Tagih = (Harga/Pcs × PCS Kirim) - Discount"
                    >
                      Rp Tagih (Preview)
                    </label>
                    <div
                      className="w-full px-4 py-3 bg-indigo-50/50 rounded-2xl text-sm font-bold text-indigo-600 border border-indigo-100"
                      title="Rp Tagih = (Harga/Pcs × PCS Kirim) - Discount"
                    >
                      {formatCurrency(currentRpTagih)}
                    </div>
                  </div>
                </div>
                <div className="col-span-full pt-2">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 active:scale-95 transition-all"
                  >
                    <Plus size={18} />
                    Tambah Produk
                  </button>
                </div>
              </div>
            </section>
            <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-sm">
                  5
                </div>
                <h2 className="font-bold text-slate-800 text-lg">Preview</h2>
              </div>

              {items.length > 0 ? (
                <div className="border border-slate-100 rounded-2xl overflow-x-auto">
                  <table className="w-full text-sm text-left min-w-[900px]">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Produk</th>
                        <th className="px-4 py-3 text-right" title="Input PCS">
                          Pcs
                        </th>
                        <th
                          className="px-4 py-3 text-right text-amber-600"
                          title="PCS yang dikirim"
                        >
                          Pcs Kirim
                        </th>
                        <th
                          className="px-4 py-3 text-right"
                          title="PCS × kg/pcs"
                        >
                          Kg
                        </th>
                        <th
                          className="px-4 py-3 text-right"
                          title="Harga Per Pcs"
                        >
                          Harga/Pcs
                        </th>
                        <th
                          className="px-4 py-3 text-right"
                          title="Discount rupiah"
                        >
                          Discount
                        </th>
                        <th className="px-4 py-3 text-right">
                          Nominal Original
                        </th>
                        <th
                          className="px-4 py-3 text-right text-indigo-700"
                          title="Rp Tagih = (PCS Kirim × Harga/Pcs) - Discount"
                        >
                          Rp Tagih
                        </th>
                        <th className="px-4 py-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item) => {
                        const isEditing = editingItemId === item.id;
                        const isPreview =
                          previewItemId === item.id || isEditing;
                        const derived = isEditing
                          ? computeDerived(
                              item.namaProduk,
                              editItem.pcs,
                              editItem.pcsKirim,
                              editItem.hargaPcs,
                              editItem.discount,
                            )
                          : computeDerived(
                              item.namaProduk,
                              item.pcs,
                              item.pcsKirim,
                              item.hargaPcs,
                              item.discount,
                            );
                        return (
                          <Fragment key={item.id}>
                            <tr className="group hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-medium text-slate-700">
                                <div
                                  className="max-w-[250px] overflow-x-auto whitespace-nowrap scrollbar-hide"
                                  title={String(item.namaProduk || "-")}
                                >
                                  {String(item.namaProduk || "-")}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600">
                                {isEditing ? (
                                  <input
                                    type="number"
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                    value={editItem.pcs}
                                    onChange={(e) =>
                                      setEditItem((p) => ({
                                        ...p,
                                        pcs: e.target.value,
                                      }))
                                    }
                                    className={`w-24 px-2 py-1 rounded-lg border border-slate-200 bg-white text-right font-bold ${numberNoSpinner}`}
                                  />
                                ) : (
                                  formatNumber(Number(item.pcs || 0))
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-amber-600 font-bold">
                                {isEditing ? (
                                  <input
                                    type="number"
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                    value={editItem.pcsKirim}
                                    onChange={(e) =>
                                      setEditItem((p) => ({
                                        ...p,
                                        pcsKirim: e.target.value,
                                      }))
                                    }
                                    className={`w-24 px-2 py-1 rounded-lg border border-slate-200 bg-white text-right font-bold ${numberNoSpinner}`}
                                  />
                                ) : (
                                  formatNumber(Number(item.pcsKirim || 0))
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600">
                                {formatNumber(Number(derived.kg || 0))}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600">
                                {isEditing ? (
                                  <input
                                    type="number"
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                    value={editItem.hargaPcs}
                                    onChange={(e) =>
                                      setEditItem((p) => ({
                                        ...p,
                                        hargaPcs: e.target.value,
                                      }))
                                    }
                                    className={`w-32 px-2 py-1 rounded-lg border border-slate-200 bg-white text-right font-bold ${numberNoSpinner}`}
                                  />
                                ) : (
                                  formatNumber(Number(item.hargaPcs || 0))
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={editItem.discount}
                                    onChange={(e) =>
                                      setEditItem((p) => ({
                                        ...p,
                                        discount: e.target.value,
                                      }))
                                    }
                                    onBlur={() =>
                                      setEditItem((p) => {
                                        const n = parseRupiah(p.discount);
                                        return {
                                          ...p,
                                          discount: n
                                            ? n.toLocaleString("id-ID")
                                            : "",
                                        };
                                      })
                                    }
                                    className="w-32 px-2 py-1 rounded-lg border border-slate-200 bg-white text-right font-bold"
                                  />
                                ) : (
                                  formatCurrency(Number(item.discount || 0))
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-slate-500 tabular-nums">
                                {formatCurrency(Number(derived.nominal || 0))}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-indigo-700 tabular-nums">
                                {formatCurrency(Number(derived.rpTagih || 0))}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {isEditing ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditItem(item)}
                                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                      title="Simpan"
                                    >
                                      <Check size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditItem}
                                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                      title="Batal"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleTogglePreviewItem(item.id)
                                      }
                                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                      title="Preview"
                                    >
                                      <Eye size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditItem(item)}
                                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Edit"
                                    >
                                      <Pencil size={16} />
                                    </button>
                                    {me?.role === "pusat" && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteItem(item.id)
                                        }
                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="Hapus"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                            {isPreview && (
                              <tr className="bg-slate-50/50">
                                <td colSpan={7} className="px-4 py-3">
                                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
                                    <div>
                                      <div className="text-slate-400 font-black uppercase text-[10px]">
                                        PCS Kirim
                                      </div>
                                      {isEditing ? (
                                        <input
                                          type="number"
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                          value={editItem.pcsKirim}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setEditItem((p) => ({
                                              ...p,
                                              pcsKirim: val,
                                            }));
                                          }}
                                          className={`mt-1 w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-right font-bold ${numberNoSpinner}`}
                                        />
                                      ) : (
                                        <div className="mt-1 font-bold text-slate-700 text-right">
                                          {formatNumber(
                                            Number(item.pcsKirim || 0),
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <div className="text-slate-400 font-black uppercase text-[10px]">
                                        KG Kirim
                                      </div>
                                      <div className="mt-1 font-bold text-slate-700 text-right">
                                        {formatNumber(
                                          Number(derived.kgKirim || 0),
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-slate-400 font-black uppercase text-[10px]">
                                        Harga/KG
                                      </div>
                                      <div className="mt-1 font-bold text-slate-700 text-right">
                                        {formatCurrency(
                                          Number(derived.hargaKg || 0),
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-slate-400 font-black uppercase text-[10px]">
                                        Nominal Original
                                      </div>
                                      <div className="mt-1 font-bold text-slate-700 text-right">
                                        {formatCurrency(
                                          Number(derived.nominal || 0),
                                        )}
                                      </div>
                                    </div>
                                    <div className="bg-indigo-50/30 p-2 rounded-xl border border-indigo-100/50">
                                      <div className="text-indigo-400 font-black uppercase text-[10px]">
                                        Rp Tagih
                                      </div>
                                      <div className="mt-1 font-bold text-indigo-700 text-right">
                                        {formatCurrency(
                                          Number(derived.rpTagih || 0),
                                        )}
                                      </div>
                                    </div>
                                    {!isEditing && (
                                      <div className="flex items-end justify-end">
                                        <button
                                          type="button"
                                          onClick={() => setPreviewItemId(null)}
                                          className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                                        >
                                          Tutup
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-3 text-right font-black text-slate-500 uppercase tracking-wider text-xs"
                        >
                          Total (Original / Tagihan)
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <div className="font-medium text-slate-400 line-through decoration-slate-300">
                            {formatCurrency(totalsAll.nominal)}
                          </div>
                          <div className="font-black text-indigo-700 text-base">
                            {formatCurrency(totalsAll.tagihan)}
                          </div>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                  <div className="flex items-center justify-end p-4 border-t border-slate-100 bg-white">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-10 py-3 bg-[#004a87] text-white rounded-[16px] font-black flex items-center gap-2 shadow-2xl shadow-blue-900/30 hover:bg-[#003d6e] active:scale-95 transition-all"
                    >
                      <Save size={18} />
                      Simpan PO ke Daftar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 text-slate-500 text-sm font-semibold">
                  Belum ada produk. Tambahkan produk dari Section 2.
                </div>
              )}
            </section>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-sm">
                  3
                </div>
                <h2 className="font-bold text-slate-800 text-lg">
                  Checklist Dokumen
                </h2>
                <button
                  type="button"
                  onClick={toggleAllChecklist}
                  className="px-3 py-1.5 rounded-xl text-xs font-black border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                >
                  {Object.values(formData.status).every(Boolean)
                    ? "Uncheck All"
                    : "Check All"}
                </button>
              </div>

              <div className="space-y-3">
                {Object.keys(formData.status).map((key) => {
                  const checked =
                    formData.status[key as keyof typeof formData.status];
                  const label = key === "sdif" ? "SDI/F" : key.toUpperCase();

                  // Khusus untuk KIRIM, FP, TAGIH dan BAYAR, render secara inline dengan input teks
                  if (key === "kirim") {
                    return (
                      <div
                        key={key}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 rounded-lg gap-4 bg-white hover:bg-slate-50 transition-colors"
                      >
                        <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleChecklist(key)}
                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-bold text-slate-700">
                            {label}
                          </span>
                        </label>
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Masukkan Ref Kirim (opsional)..."
                            value={formData.buktiKirim}
                            onChange={(e) => {
                              const v = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                buktiKirim: v,
                              }));
                            }}
                            className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white placeholder:text-slate-400 font-semibold transition-all"
                          />
                        </div>
                      </div>
                    );
                  }

                  if (key === "fp") {
                    return (
                      <div
                        key={key}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 rounded-lg gap-4 bg-white hover:bg-slate-50 transition-colors"
                      >
                        <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleChecklist(key)}
                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-bold text-slate-700">
                            {label}
                          </span>
                        </label>
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Masukkan Ref FP..."
                            value={formData.buktiFp}
                            onChange={(e) => {
                              const v = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                buktiFp: v,
                                status: { ...prev.status, fp: !!v.trim() },
                              }));
                            }}
                            className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white placeholder:text-slate-400 font-semibold transition-all"
                          />
                        </div>
                      </div>
                    );
                  }

                  if (key === "tagih") {
                    return (
                      <div
                        key={key}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 rounded-lg gap-4 bg-white hover:bg-slate-50 transition-colors"
                      >
                        <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleChecklist(key)}
                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-bold text-slate-700">
                            {label}
                          </span>
                        </label>
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Masukkan Ref Tagihan..."
                            value={formData.buktiTagih}
                            onChange={(e) => {
                              const v = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                buktiTagih: v,
                                status: { ...prev.status, tagih: !!v.trim() },
                              }));
                            }}
                            className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white placeholder:text-slate-400 font-semibold transition-all"
                          />
                        </div>
                      </div>
                    );
                  }

                  if (key === "bayar") {
                    return (
                      <div
                        key={key}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 rounded-lg gap-4 bg-white hover:bg-slate-50 transition-colors"
                      >
                        <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleChecklist(key)}
                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-bold text-slate-700">
                            {label}
                          </span>
                        </label>
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Masukkan Ref Bayar..."
                            value={formData.buktiBayar}
                            onChange={(e) => {
                              const v = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                buktiBayar: v,
                                status: { ...prev.status, bayar: !!v.trim() },
                              }));
                            }}
                            className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white placeholder:text-slate-400 font-semibold transition-all"
                          />
                        </div>
                      </div>
                    );
                  }

                  // Default render untuk checkbox lainnya
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleChecklist(key)}
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-bold text-slate-700">
                        {label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-sm">
                  4
                </div>
                <h2 className="font-bold text-slate-800 text-lg">Remarks</h2>
              </div>
              <textarea
                rows={4}
                placeholder="Tambahkan Jika Ada Keterangan..."
                className="w-full px-6 py-4 bg-slate-50 rounded-[24px] focus:ring-2 focus:ring-slate-200 outline-none text-sm font-medium transition-all"
                onChange={(e) =>
                  setFormData({ ...formData, remarks: e.target.value })
                }
              ></textarea>
            </section>
          </div>
        </div>

        {/* Draft List & Submit All */}
        {false && poDrafts.length > 0 && (
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 lg:col-span-2">
            <h3 className="font-bold text-slate-800 mb-3">
              Daftar PO untuk Company Ini
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Nomor PO</th>
                    <th className="px-4 py-3">Nama Produk</th>
                    <th className="px-4 py-3 text-right">PCS PO</th>
                    <th className="px-4 py-3 text-right">Harga/PCS</th>
                    <th className="px-4 py-3 text-right">Nominal</th>
                    <th className="px-4 py-3 text-right">Jumlah Produk</th>
                    <th className="px-4 py-3 text-right">Total Tagihan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {poDrafts.map((d) => {
                    const totalTagih = d.items.reduce(
                      (acc, it) => acc + (Number(it.rpTagih) || 0),
                      0,
                    );
                    return (
                      <>
                        {d.items.map((it, idx) => {
                          const hargaPcs = Number(it.hargaPcs) || 0;
                          const pcs = Number(it.pcs) || 0;
                          const nominal =
                            Number(it.nominal) || hargaPcs * pcs || 0;
                          return (
                            <tr
                              key={`${d.noPo}-${it.id || idx}`}
                              className="group hover:bg-slate-50/50"
                            >
                              {idx === 0 && (
                                <td
                                  rowSpan={d.items.length}
                                  className="px-4 py-3 font-medium text-slate-700 align-top"
                                >
                                  {d.noPo}
                                </td>
                              )}
                              <td className="px-4 py-3 text-slate-700">
                                {String(it.namaProduk || "-")}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {formatNumber(pcs)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {formatCurrency(hargaPcs)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {formatCurrency(nominal)}
                              </td>
                              {idx === 0 && (
                                <td
                                  rowSpan={d.items.length}
                                  className="px-4 py-3 text-right align-top"
                                >
                                  {d.items.length}
                                </td>
                              )}
                              {idx === 0 && (
                                <td
                                  rowSpan={d.items.length}
                                  className="px-4 py-3 text-right font-bold align-top"
                                >
                                  {new Intl.NumberFormat("id-ID").format(
                                    totalTagih,
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  title="Edit draft"
                  onClick={() => {
                    if (poDrafts.length === 0) return;
                    setEditPickerSelected(poDrafts[0].noPo);
                    setEditPickerOpen(true);
                  }}
                  className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                >
                  <Pencil size={16} />
                </button>
                {me?.role === "pusat" && (
                  <button
                    type="button"
                    title="Hapus draft"
                    onClick={() => {
                      if (poDrafts.length === 0) return;
                      const init: Record<string, boolean> = {};
                      for (const d of poDrafts) {
                        const items = Array.isArray(d.items) ? d.items : [];
                        for (let i = 0; i < items.length; i++) {
                          const it = items[i];
                          const k = `${d.noPo}::${it?.id || i}`;
                          init[k] = false;
                        }
                      }
                      setDeleteSelection(init);
                      setDeletePickerOpen(true);
                    }}
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-14 py-4 bg-emerald-600 text-white rounded-[16px] font-black flex items-center gap-2 shadow-2xl shadow-emerald-900/20 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={18} />
                  {submitting ? "Menyimpan..." : "Simpan Data (Semua PO)"}
                </button>
              </div>
            </div>
            {editPickerOpen && (
              <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-800">
                    Pilih PO untuk di-Edit
                  </div>
                  <div className="p-4 space-y-2 max-h-[60vh] overflow-auto">
                    {poDrafts.map((d) => (
                      <label
                        key={d.noPo}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="edit-po"
                          checked={editPickerSelected === d.noPo}
                          onChange={() => setEditPickerSelected(d.noPo)}
                        />
                        <span className="font-mono font-semibold">
                          {d.noPo}
                        </span>
                        <span className="text-slate-500 text-xs">
                          • {d.items.length} produk
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditPickerOpen(false)}
                      className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-bold"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = poDrafts.find(
                          (x) => x.noPo === editPickerSelected,
                        );
                        if (d) openEditDraft(d);
                        setEditPickerOpen(false);
                      }}
                      className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50"
                      disabled={!editPickerSelected}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            )}
            {deletePickerOpen && (
              <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-800">
                    Pilih PO yang akan dihapus
                  </div>
                  <div className="p-4">
                    {(() => {
                      const total = poDrafts.length;
                      const selectedItemCount =
                        Object.values(deleteSelection).filter(Boolean).length;
                      const selectedPoCount = (() => {
                        const set = new Set<string>();
                        for (const k of Object.keys(deleteSelection)) {
                          if (!deleteSelection[k]) continue;
                          const noPo = k.split("::")[0] || "";
                          if (noPo) set.add(noPo);
                        }
                        return set.size;
                      })();
                      const totalItemCount =
                        Object.keys(deleteSelection).length;
                      const allChecked =
                        totalItemCount > 0 &&
                        selectedItemCount === totalItemCount;
                      return (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                          <div className="text-sm text-slate-600">
                            Terpilih:{" "}
                            <span className="font-black text-slate-800">
                              {selectedItemCount}
                            </span>{" "}
                            item •{" "}
                            <span className="font-black text-slate-800">
                              {selectedPoCount}
                            </span>{" "}
                            / {total} PO
                          </div>
                          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={allChecked}
                              onChange={(e) => {
                                setDeleteSelection((prev) => {
                                  const next: Record<string, boolean> = {};
                                  for (const k of Object.keys(prev)) {
                                    next[k] = e.target.checked;
                                  }
                                  return next;
                                });
                              }}
                            />
                            Select all
                          </label>
                        </div>
                      );
                    })()}
                    <div className="rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="max-h-[60vh] overflow-auto">
                        <table className="w-full min-w-[1200px] text-left text-sm">
                          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                            <tr>
                              <th className="px-4 py-3 sticky top-0 bg-slate-50">
                                Delete
                              </th>
                              <th className="px-4 py-3 sticky top-0 bg-slate-50">
                                No PO
                              </th>
                              <th className="px-4 py-3 sticky top-0 bg-slate-50">
                                Tgl PO
                              </th>
                              <th className="px-4 py-3 sticky top-0 bg-slate-50">
                                Expired
                              </th>
                              <th className="px-4 py-3 sticky top-0 bg-slate-50">
                                Tujuan
                              </th>
                              <th className="px-4 py-3 sticky top-0 bg-slate-50">
                                Produk
                              </th>
                              <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                                PCS PO
                              </th>
                              <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                                PCS Kirim
                              </th>
                              <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                                Harga/PCS
                              </th>
                              <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                                Nominal
                              </th>
                              <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">
                                Rp Tagih
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {poDrafts.map((d) => {
                              const rows = Array.isArray(d.items)
                                ? d.items
                                : [];
                              const span = Math.max(rows.length, 1);
                              const tgl = d.tglPo || "-";
                              const exp = d.expiredTgl || "-";
                              const tuj = d.tujuan || "-";
                              return rows.length > 0 ? (
                                rows.map((it: any, idx: number) => {
                                  const itemKey = `${d.noPo}::${it?.id || idx}`;
                                  const pcs = Number(it?.pcs) || 0;
                                  const pcsKirim = Number(it?.pcsKirim) || 0;
                                  const hargaPcs = Number(it?.hargaPcs) || 0;
                                  const nominal =
                                    Number(it?.nominal) || hargaPcs * pcs || 0;
                                  const rpTagih =
                                    Number(it?.rpTagih) ||
                                    hargaPcs * pcsKirim ||
                                    0;
                                  return (
                                    <tr key={`${d.noPo}-${it?.id || idx}`}>
                                      <td className="px-4 py-3 align-top">
                                        <input
                                          type="checkbox"
                                          checked={!!deleteSelection[itemKey]}
                                          onChange={(e) =>
                                            setDeleteSelection((prev) => ({
                                              ...prev,
                                              [itemKey]: e.target.checked,
                                            }))
                                          }
                                        />
                                      </td>
                                      {idx === 0 && (
                                        <td
                                          rowSpan={span}
                                          className="px-4 py-3 font-mono font-bold text-slate-800 align-top whitespace-nowrap"
                                        >
                                          {d.noPo}
                                        </td>
                                      )}
                                      {idx === 0 && (
                                        <td
                                          rowSpan={span}
                                          className="px-4 py-3 text-slate-700 align-top whitespace-nowrap"
                                        >
                                          {tgl}
                                        </td>
                                      )}
                                      {idx === 0 && (
                                        <td
                                          rowSpan={span}
                                          className="px-4 py-3 text-slate-700 align-top whitespace-nowrap"
                                        >
                                          {exp}
                                        </td>
                                      )}
                                      {idx === 0 && (
                                        <td
                                          rowSpan={span}
                                          className="px-4 py-3 text-slate-700 align-top max-w-[240px] truncate"
                                          title={tuj}
                                        >
                                          {tuj}
                                        </td>
                                      )}
                                      <td
                                        className="px-4 py-3 text-slate-700 max-w-[320px] truncate"
                                        title={String(it?.namaProduk || "")}
                                      >
                                        {String(it?.namaProduk || "-")}
                                      </td>
                                      <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                                        {formatNumber(pcs)}
                                      </td>
                                      <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                                        {formatNumber(pcsKirim)}
                                      </td>
                                      <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                                        {formatCurrency(hargaPcs)}
                                      </td>
                                      <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                                        {formatCurrency(nominal)}
                                      </td>
                                      <td className="px-4 py-3 text-right font-black text-slate-800">
                                        {formatCurrency(rpTagih)}
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr key={`${d.noPo}-empty`}>
                                  <td className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={false}
                                      readOnly
                                      disabled
                                    />
                                  </td>
                                  <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                                    {d.noPo}
                                  </td>
                                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                    {tgl}
                                  </td>
                                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                    {exp}
                                  </td>
                                  <td className="px-4 py-3 text-slate-700">
                                    {tuj}
                                  </td>
                                  <td
                                    className="px-4 py-3 text-slate-500"
                                    colSpan={6}
                                  >
                                    Tidak ada item
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setDeletePickerOpen(false)}
                      className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-bold"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const selectedItemKeys = Object.keys(
                          deleteSelection,
                        ).filter((k) => deleteSelection[k]);
                        if (selectedItemKeys.length === 0) return;
                        const setByPo = new Map<string, Set<string>>();
                        for (const k of selectedItemKeys) {
                          const [noPo, rawId] = k.split("::");
                          if (!noPo || !rawId) continue;
                          if (!setByPo.has(noPo)) setByPo.set(noPo, new Set());
                          setByPo.get(noPo)?.add(rawId);
                        }
                        setPoDrafts((prev) =>
                          prev
                            .map((d) => {
                              const toRemove = setByPo.get(d.noPo);
                              if (!toRemove) return d;
                              const items = Array.isArray(d.items)
                                ? d.items
                                : [];
                              const kept = items.filter(
                                (it: any, idx: number) => {
                                  const id = String(it?.id || idx);
                                  return !toRemove.has(id);
                                },
                              );
                              return { ...d, items: kept };
                            })
                            .filter(
                              (d) =>
                                Array.isArray(d.items) && d.items.length > 0,
                            ),
                        );
                        setDeletePickerOpen(false);
                        setDeleteSelection({});
                      }}
                      className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold disabled:opacity-50"
                      disabled={
                        Object.values(deleteSelection).filter(Boolean)
                          .length === 0
                      }
                    >
                      Hapus Terpilih
                    </button>
                  </div>
                </div>
              </div>
            )}
            {(() => {
              if (!editDraft) return null;
              const d = editDraft!;
              return (
                <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="font-bold text-slate-800">
                        Edit Draft PO • {d.noPo}
                      </div>
                      <button
                        type="button"
                        onClick={closeEditDraft}
                        className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 hover:bg-slate-200"
                      >
                        Tutup
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                            Tanggal PO
                          </label>
                          <DateInputHybrid
                            value={d.tglPo}
                            onChange={(v) => {
                              setEditDraft((prev: any) => {
                                if (!prev) return prev;
                                const next = { ...prev, tglPo: v };
                                if (
                                  v &&
                                  next.expiredTgl &&
                                  next.expiredTgl < v
                                ) {
                                  next.expiredTgl = v;
                                }
                                return next;
                              });
                            }}
                            className="w-full bg-white rounded-xl"
                            placeholder="YYYY-MM-DD"
                            maxDate={d.expiredTgl}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                            Expired PO
                          </label>
                          <DateInputHybrid
                            value={d.expiredTgl}
                            onChange={(v) =>
                              setEditDraft({
                                ...d,
                                expiredTgl: v,
                              })
                            }
                            className="w-full bg-white rounded-xl"
                            placeholder="YYYY-MM-DD"
                            minDate={d.tglPo}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                            Tujuan
                          </label>
                          <input
                            type="text"
                            value={d.tujuan}
                            onChange={(e) =>
                              setEditDraft({
                                ...d,
                                tujuan: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                          />
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="max-h-[360px] overflow-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-500 tracking-widest">
                              <tr>
                                <th className="px-4 py-3">Produk</th>
                                <th className="px-4 py-3 text-right">PCS PO</th>
                                <th className="px-4 py-3 text-right">
                                  PCS Kirim
                                </th>
                                <th className="px-4 py-3 text-right">
                                  Harga/PCS
                                </th>
                                <th className="px-4 py-3 text-right">
                                  Discount
                                </th>
                                <th className="px-4 py-3 text-right">
                                  Nominal
                                </th>
                                <th className="px-4 py-3 text-right">Tagih</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {d.items.map((it, idx) => {
                                const pcs = Number(it.pcs) || 0;
                                const pcsKirim = Number(it.pcsKirim) || 0;
                                const hargaPcs = Number(it.hargaPcs) || 0;
                                const disc = parseRupiah((it as any)?.discount);
                                const nominal = Math.max(
                                  0,
                                  hargaPcs * pcs - disc,
                                );
                                const rpTagih = Math.max(
                                  0,
                                  hargaPcs * pcsKirim - disc,
                                );
                                return (
                                  <tr key={it.id || idx}>
                                    <td className="px-4 py-2">
                                      <input
                                        type="text"
                                        value={it.namaProduk}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          const arr = [...d.items];
                                          arr[idx] = {
                                            ...arr[idx],
                                            namaProduk: v,
                                          };
                                          setEditDraft({
                                            ...d,
                                            items: arr,
                                          });
                                        }}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                                      />
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      <input
                                        type="number"
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                        value={pcs}
                                        onChange={(e) => {
                                          const v = Number(e.target.value) || 0;
                                          const arr = [...d.items];
                                          const discNow = parseRupiah(
                                            (arr[idx] as any)?.discount,
                                          );
                                          arr[idx] = {
                                            ...arr[idx],
                                            pcs: v,
                                            nominal: Math.max(
                                              0,
                                              v * (Number(it.hargaPcs) || 0) -
                                                discNow,
                                            ),
                                          };
                                          setEditDraft({
                                            ...d,
                                            items: arr,
                                          });
                                        }}
                                        className={`w-28 px-3 py-2 rounded-lg border border-slate-200 bg-white text-right ${numberNoSpinner}`}
                                      />
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      <input
                                        type="number"
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                        value={pcsKirim}
                                        onChange={(e) => {
                                          const v = Number(e.target.value) || 0;
                                          const arr = [...d.items];
                                          const discNow = parseRupiah(
                                            (arr[idx] as any)?.discount,
                                          );
                                          arr[idx] = {
                                            ...arr[idx],
                                            pcsKirim: v,
                                            rpTagih: Math.max(
                                              0,
                                              v * (Number(it.hargaPcs) || 0) -
                                                discNow,
                                            ),
                                          };
                                          setEditDraft({
                                            ...d,
                                            items: arr,
                                          });
                                        }}
                                        className={`w-28 px-3 py-2 rounded-lg border border-slate-200 bg-white text-right ${numberNoSpinner}`}
                                      />
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      <input
                                        type="number"
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                        value={hargaPcs}
                                        onChange={(e) => {
                                          const v = Number(e.target.value) || 0;
                                          const arr = [...d.items];
                                          const discNow = parseRupiah(
                                            (arr[idx] as any)?.discount,
                                          );
                                          arr[idx] = {
                                            ...arr[idx],
                                            hargaPcs: v,
                                            nominal: Math.max(
                                              0,
                                              v * (Number(it.pcs) || 0) -
                                                discNow,
                                            ),
                                            rpTagih: Math.max(
                                              0,
                                              v * (Number(it.pcsKirim) || 0) -
                                                discNow,
                                            ),
                                          };
                                          setEditDraft({
                                            ...d,
                                            items: arr,
                                          });
                                        }}
                                        className={`w-28 px-3 py-2 rounded-lg border border-slate-200 bg-white text-right ${numberNoSpinner}`}
                                      />
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={
                                          Number((it as any)?.discount || 0)
                                            ? Number(
                                                (it as any)?.discount || 0,
                                              ).toLocaleString("id-ID")
                                            : ""
                                        }
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          const discNow = parseRupiah(v);
                                          const arr = [...d.items];
                                          const hargaNow =
                                            Number(
                                              (arr[idx] as any)?.hargaPcs,
                                            ) || 0;
                                          const pcsNow =
                                            Number((arr[idx] as any)?.pcs) || 0;
                                          const pcsKirimNow =
                                            Number(
                                              (arr[idx] as any)?.pcsKirim,
                                            ) || 0;
                                          arr[idx] = {
                                            ...arr[idx],
                                            discount: discNow,
                                            nominal: Math.max(
                                              0,
                                              hargaNow * pcsNow - discNow,
                                            ),
                                            rpTagih: Math.max(
                                              0,
                                              hargaNow * pcsKirimNow - discNow,
                                            ),
                                          };
                                          setEditDraft({
                                            ...d,
                                            items: arr,
                                          });
                                        }}
                                        className="w-28 px-3 py-2 rounded-lg border border-slate-200 bg-white text-right"
                                      />
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      {formatCurrency(nominal)}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      {formatCurrency(rpTagih)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={closeEditDraft}
                        className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-bold"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={saveEditDraft}
                        className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
                      >
                        Simpan Perubahan
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
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
