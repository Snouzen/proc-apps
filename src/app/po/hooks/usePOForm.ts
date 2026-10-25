import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getMe } from "@/lib/me";

import { ItemPO, StatusDoc, INITIAL_STATUS, INITIAL_FORM } from "./sub/types";
import { usePOItems } from "./sub/usePOItems";
import { usePOOptions } from "./sub/usePOOptions";
import { usePOSubmission } from "./sub/usePOSubmission";

export type { ItemPO, StatusDoc };
export { INITIAL_STATUS, INITIAL_FORM };

export function usePOForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const numberNoSpinner =
    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  
  const [poDrafts, setPoDrafts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    ...INITIAL_FORM,
  });
  const [me, setMe] = useState<any>(null);
  const [hasMounted, setHasMounted] = useState(false);

  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3200);
  };

  const [ritelData, setRitelData] = useState<any[]>([]);
  const [unitData, setUnitData] = useState<any[]>([]);
  const [productData, setProductData] = useState<any[]>([]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Master data loader
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const [ritelRes, unitRes, prodRes] = await Promise.all([
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

  // Sub-hook for options & cascade validation
  // Declared before usePOItems so invalidProduct is available
  const poOptions = usePOOptions({
    ritelData,
    unitData,
    productData,
    formData,
    currentItem: { namaProduk: "" }, // updated dynamically or passed down
  });

  // Sub-hook for items
  const poItems = usePOItems({
    productData,
    setFormData,
    showToast,
    invalidProduct: poOptions.invalidProduct,
  });

  // Re-run poOptions with actual currentItem
  const activeOptions = usePOOptions({
    ritelData,
    unitData,
    productData,
    formData,
    currentItem: poItems.currentItem,
  });

  // Sub-hook for submission
  const poSubmission = usePOSubmission({
    router,
    searchParams,
    formData,
    setFormData,
    items: poItems.items,
    setItems: poItems.setItems,
    setPoDrafts,
    showToast,
    companyLooksLikeInisial: activeOptions.companyLooksLikeInisial,
    invalidCompany: activeOptions.invalidCompany,
    invalidInisial: activeOptions.invalidInisial,
    invalidTujuan: activeOptions.invalidTujuan,
  });

  // Edit mode loader / form reset
  useEffect(() => {
    const noPo = searchParams?.get("noPo");
    if (!noPo) {
      setFormData({ ...INITIAL_FORM });
      poItems.setItems([]);
      setPoDrafts([]);
      poItems.setCurrentItem({
        namaProduk: "",
        pcs: "",
        pcsKirim: "",
        hargaPcs: "",
        discount: "",
      });
      poItems.setPreviewItemId(null);
      poItems.setEditingItemId(null);
      poItems.setEditItem({ pcs: "", pcsKirim: "", hargaPcs: "", discount: "" });
      try {
        localStorage.removeItem("po.current.form");
        localStorage.removeItem("po.current.items");
        localStorage.removeItem("po.drafts");
      } catch {}
      return;
    }

    const loadPo = async () => {
      try {
        poItems.setItems([]);
        setPoDrafts([]);
        setFormData({ ...INITIAL_FORM });
        poItems.setCurrentItem({
          namaProduk: "",
          pcs: "",
          pcsKirim: "",
          hargaPcs: "",
          discount: "",
        });
        poItems.setPreviewItemId(null);
        poItems.setEditingItemId(null);
        poItems.setEditItem({ pcs: "", pcsKirim: "", hargaPcs: "", discount: "" });
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
        poItems.setItems(mappedItems);
        showToast("info", `Edit mode: PO ${po.noPo} dimuat`);
      } catch {
        // ignore
      }
    };
    loadPo();
  }, [searchParams]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(val);

  const formatNumber = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(val);

  return {
    hasMounted,
    toast,
    submitting: poSubmission.submitting,
    poDrafts,
    setPoDrafts,
    formData,
    setFormData,
    me,
    items: poItems.items,
    currentItem: poItems.currentItem,
    setCurrentItem: poItems.setCurrentItem,
    previewItemId: poItems.previewItemId,
    setPreviewItemId: poItems.setPreviewItemId,
    editingItemId: poItems.editingItemId,
    editItem: poItems.editItem,
    setEditItem: poItems.setEditItem,
    companyOptions: activeOptions.companyOptions,
    invalidCompany: activeOptions.invalidCompany,
    companyLooksLikeInisial: activeOptions.companyLooksLikeInisial,
    inisialOptions: activeOptions.inisialOptions,
    invalidInisial: activeOptions.invalidInisial,
    isKnownCompany: activeOptions.isKnownCompany,
    tujuanOptions: activeOptions.tujuanOptions,
    invalidTujuan: activeOptions.invalidTujuan,
    isKnownInisial: activeOptions.isKnownInisial,
    regionalOptions: activeOptions.regionalOptions,
    siteAreaOptions: activeOptions.siteAreaOptions,
    productOptions: activeOptions.productOptions,
    invalidProduct: activeOptions.invalidProduct,
    numberNoSpinner,
    formatNumber,
    formatCurrency,
    parseRupiah: poItems.parseRupiah,
    currentHargaKg: poItems.currentHargaKg,
    currentKg: poItems.currentKg,
    currentKgKirim: poItems.currentKgKirim,
    currentNominal: poItems.currentNominal,
    currentRpTagih: poItems.currentRpTagih,
    handleAddItem: poItems.handleAddItem,
    computeDerived: poItems.computeDerived,
    handleSaveEditItem: poItems.handleSaveEditItem,
    handleCancelEditItem: poItems.handleCancelEditItem,
    handleTogglePreviewItem: poItems.handleTogglePreviewItem,
    handleStartEditItem: poItems.handleStartEditItem,
    handleDeleteItem: poItems.handleDeleteItem,
    totalsAll: poItems.totalsAll,
    handleChecklist: poSubmission.handleChecklist,
    toggleAllChecklist: poSubmission.toggleAllChecklist,
    handleSubmit: poSubmission.handleSubmit,
  };
}
