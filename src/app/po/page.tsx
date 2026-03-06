"use client";

import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  LinkIcon,
  MapPin,
  MessageSquare,
  Package,
  Plus,
  Save,
  Tag,
  Trash2,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import Combobox from "@/components/combobox";
import Select from "@/components/select";
import { useRouter, useSearchParams } from "next/navigation";

type ItemPO = {
  id: string;
  namaProduk: string;
  pcs: number | string;
  pcsKirim: number | string;
  hargaPcs: number | string;
  // Computed for display
  kg?: number;
  kgKirim?: number;
  hargaKg: number;
  nominal: number;
  rpTagih: number;
};

function InputPODetailPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [poDrafts, setPoDrafts] = useState<
    Array<{
      noPo: string;
      tglPo: string;
      expiredTgl: string;
      linkPo: string;
      noInvoice: string;
      tujuan: string;
      status: typeof formData.status;
      remarks: string;
      items: ItemPO[];
    }>
  >([]);
  const [formData, setFormData] = useState({
    //Data Utama
    company: "",
    regional: "",
    noPo: "",
    tglPo: "",
    linkPo: "",
    expiredTgl: "",
    siteArea: "",
    noInvoice: "",
    tujuan: "",
    //Checklist status dokumen
    status: {
      kirim: false,
      sdif: false,
      po: false,
      fp: false,
      kwi: false,
      inv: false,
      tagih: false,
      bayar: false,
    },
    remarks: "",
  });

  // State for Items
  const [items, setItems] = useState<ItemPO[]>([]);
  const [currentItem, setCurrentItem] = useState({
    namaProduk: "",
    pcs: "" as number | string,
    pcsKirim: "" as number | string,
    hargaPcs: "" as number | string,
  });
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

  // Persist to localStorage to avoid data loss (AFK/crash)
  useEffect(() => {
    try {
      const savedForm = localStorage.getItem("po.current.form");
      const savedItems = localStorage.getItem("po.current.items");
      const savedDrafts = localStorage.getItem("po.drafts");
      if (savedForm) {
        const f = JSON.parse(savedForm);
        setFormData((prev) => ({ ...prev, ...f }));
      }
      if (savedItems) {
        const it = JSON.parse(savedItems);
        if (Array.isArray(it)) setItems(it);
      }
      if (savedDrafts) {
        const d = JSON.parse(savedDrafts);
        if (Array.isArray(d)) setPoDrafts(d);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        "po.current.form",
        JSON.stringify({
          company: formData.company,
          regional: formData.regional,
          noPo: formData.noPo,
          tglPo: formData.tglPo,
          linkPo: formData.linkPo,
          expiredTgl: formData.expiredTgl,
          siteArea: formData.siteArea,
          noInvoice: formData.noInvoice,
          tujuan: formData.tujuan,
          status: formData.status,
          remarks: formData.remarks,
        }),
      );
    } catch {}
  }, [formData]);
  useEffect(() => {
    try {
      localStorage.setItem("po.current.items", JSON.stringify(items));
    } catch {}
  }, [items]);
  useEffect(() => {
    try {
      localStorage.setItem("po.drafts", JSON.stringify(poDrafts));
    } catch {}
  }, [poDrafts]);

  // Computed values for current item form (after productData is declared)
  const currentPcsNum = parseFloat(currentItem.pcs.toString()) || 0;
  const currentHargaPcsNum = parseFloat(currentItem.hargaPcs.toString()) || 0;
  const currentPcsKirimNum = parseFloat(currentItem.pcsKirim.toString()) || 0;
  const satuanKgSelected =
    (Array.isArray(productData)
      ? productData.find((p: any) => p?.name === currentItem.namaProduk)
          ?.satuanKg
      : undefined) || 0;
  const currentHargaKg =
    satuanKgSelected > 0 ? currentHargaPcsNum / satuanKgSelected : 0;
  const currentNominal = currentHargaPcsNum * currentPcsNum;
  const currentRpTagih = currentHargaPcsNum * currentPcsKirimNum;
  const currentKg = currentPcsNum * (satuanKgSelected || 0);
  const currentKgKirim = currentPcsKirimNum * (satuanKgSelected || 0);

  const totalRpTagihAll = items.reduce((acc, item) => acc + item.rpTagih, 0);

  useEffect(() => {
    const load = async () => {
      try {
        const [r1, r2, r3] = await Promise.all([
          fetch("/api/ritel"),
          fetch("/api/unit-produksi"),
          fetch("/api/product"),
        ]);
        const [d1, d2, d3] = await Promise.all([
          r1.json(),
          r2.json(),
          r3.json(),
        ]);
        setRitelData(Array.isArray(d1) ? d1 : d1?.data || []);
        setUnitData(Array.isArray(d2) ? d2 : d2?.data || []);
        setProductData(Array.isArray(d3) ? d3 : d3?.data || []);
      } catch {
        setRitelData([]);
        setUnitData([]);
        setProductData([]);
      }
    };
    load();
  }, []);

  // Prefill when editing existing PO via query noPo
  useEffect(() => {
    const noPo = searchParams?.get("noPo");
    if (!noPo) return;
    const loadPo = async () => {
      try {
        const res = await fetch(`/api/po?noPo=${encodeURIComponent(noPo)}`, {
          cache: "no-store",
        });
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
        setFormData((prev) => ({
          ...prev,
          company: po.RitelModern?.namaPt || "",
          regional: po.regional || "",
          noPo: po.noPo || "",
          tglPo: toYMD(po.tglPo || null),
          linkPo: po.linkPo || "",
          expiredTgl: toYMD(po.expiredTgl || null),
          siteArea: po.UnitProduksi?.siteArea || "",
          noInvoice: po.noInvoice || "",
          tujuan: po.tujuanDetail || "",
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
        }));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const companyOptions = Array.from(
    new Set(
      (Array.isArray(ritelData) ? ritelData : [])
        .map((r: any) => r?.namaPt)
        .filter(Boolean),
    ),
  ).sort();
  const allTujuan = Array.from(
    new Set(
      (Array.isArray(ritelData) ? ritelData : [])
        .map((r: any) => r?.tujuan)
        .filter(Boolean),
    ),
  ).sort();
  const tujuanOptions = formData.company
    ? Array.from(
        new Set(
          (Array.isArray(ritelData) ? ritelData : [])
            .filter((r: any) => r?.namaPt === formData.company)
            .map((r: any) => r?.tujuan)
            .filter(Boolean),
        ),
      ).sort()
    : allTujuan;
  const siteAreaOptions = Array.from(
    new Set(
      (Array.isArray(unitData) ? unitData : [])
        .map((u: any) => u?.siteArea)
        .filter(Boolean),
    ),
  ).sort();
  const regionalOptions = Array.from(
    new Set(
      (Array.isArray(unitData) ? unitData : [])
        .map((u: any) => u?.namaRegional)
        .filter(Boolean),
    ),
  )
    .sort()
    .map((r) => ({ label: r, value: r }));
  const productOptions = Array.from(
    new Set(
      (Array.isArray(productData) ? productData : [])
        .map((p: any) => p?.name)
        .filter(Boolean),
    ),
  ).sort();

  const invalidCompany =
    !!formData.company && !companyOptions.includes(formData.company);
  const invalidTujuan =
    !!formData.tujuan && !tujuanOptions.includes(formData.tujuan);
  const invalidProduct =
    !!currentItem.namaProduk &&
    !productOptions.includes(currentItem.namaProduk);

  const handleChecklist = (field: string) => {
    setFormData((prev) => ({
      ...prev,
      status: {
        ...prev.status,
        [field]: !prev.status[field as keyof typeof prev.status],
      },
    }));
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
      kg: currentKg,
      kgKirim: currentKgKirim,
      hargaKg: currentHargaKg,
      nominal: currentNominal,
      rpTagih: currentRpTagih,
    };

    setItems((prev) => [...prev, newItem]);
    // Reset current item form
    setCurrentItem({
      namaProduk: "",
      pcs: "",
      pcsKirim: "",
      hargaPcs: "",
    });
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveCurrentPODraft = () => {
    if (!formData.noPo || !formData.noPo.trim()) {
      showToast("error", "Nomor PO wajib diisi");
      return;
    }
    if (!formData.tglPo || !formData.tglPo.trim()) {
      showToast("error", "Tanggal PO wajib diisi");
      return;
    }
    if (items.length === 0) {
      showToast("error", "Minimal harus ada 1 produk");
      return;
    }
    setPoDrafts((prev) => [
      ...prev,
      {
        noPo: formData.noPo,
        tglPo: formData.tglPo,
        expiredTgl: formData.expiredTgl,
        linkPo: formData.linkPo,
        noInvoice: formData.noInvoice,
        tujuan: formData.tujuan,
        status: formData.status,
        remarks: formData.remarks,
        items,
      },
    ]);
    setItems([]);
    setFormData((f) => ({
      ...f,
      noPo: "",
      tglPo: "",
      expiredTgl: "",
      linkPo: "",
      noInvoice: "",
      tujuan: "",
      status: { ...f.status },
      remarks: "",
    }));
    setCurrentItem({
      namaProduk: "",
      pcs: "",
      pcsKirim: "",
      hargaPcs: "",
    });
    showToast("success", `PO ${formData.noPo} ditambahkan ke daftar`);
  };

  const removeDraft = (noPo: string) => {
    setPoDrafts((prev) => prev.filter((d) => d.noPo !== noPo));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (invalidCompany || invalidTujuan) {
      const msgs = [
        invalidCompany ? "Nama company tidak ada di daftar" : null,
        invalidTujuan ? "Tujuan tidak ada di daftar" : null,
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
    if (!formData.siteArea || !formData.siteArea.trim()) {
      showToast("error", "Site Area wajib diisi");
      return;
    }
    // Kirim hanya draft yang ada di daftar
    const queue = [...poDrafts];
    if (queue.length === 0) {
      showToast("error", "Minimal tambahkan 1 PO ke daftar");
      return;
    }
    // Validasi draft satu per satu
    const invalids: string[] = [];
    for (const d of queue) {
      if (!d.noPo || !d.noPo.trim()) invalids.push("No PO kosong");
      if (!d.tglPo || !d.tglPo.trim())
        invalids.push(`Tgl PO kosong (${d.noPo})`);
      if (!Array.isArray(d.items) || d.items.length === 0)
        invalids.push(`Items kosong (${d.noPo})`);
    }
    if (invalids.length > 0) {
      showToast("error", `Periksa draft: ${invalids.join(" | ")}`);
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    Promise.resolve()
      .then(async () => {
        const { savePurchaseOrder } = await import("@/lib/api");
        for (const draft of queue) {
          const payload = {
            company: formData.company,
            regional: formData.regional,
            noPo: draft.noPo,
            tglPo: draft.tglPo,
            linkPo: draft.linkPo,
            expiredTgl: draft.expiredTgl,
            siteArea: formData.siteArea,
            noInvoice: draft.noInvoice,
            tujuan: draft.tujuan,
            items: draft.items.map(
              ({ namaProduk, pcs, pcsKirim, hargaPcs }) => ({
                namaProduk,
                pcs,
                pcsKirim,
                hargaPcs,
              }),
            ),
            remarks: draft.remarks,
            status: draft.status,
          };
          await savePurchaseOrder(payload);
        }
      })
      .then(() => {
        showToast(
          "success",
          `Berhasil menyimpan ${poDrafts.length} PO untuk ${formData.company}`,
        );
        router.push(`/company`);
      })
      .catch((err) => {
        const msg =
          err instanceof Error ? err.message : "Gagal menyimpan data PO";
        showToast("error", `${msg}. Draft dipertahankan.`);
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
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-5 lg:col-span-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <FileText size={20} />
              </div>
              <h2 className="font-bold text-slate-800 text-lg">
                Data Referensi PO
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  Nama Company
                </label>
                <Combobox
                  options={companyOptions}
                  value={formData.company}
                  onChange={(v) =>
                    setFormData({
                      ...formData,
                      company: v,
                      tujuan: "",
                    })
                  }
                  placeholder="Ketik/cari company..."
                  inputClassName={
                    invalidCompany
                      ? "border border-rose-300 bg-rose-50 focus:ring-rose-200"
                      : undefined
                  }
                />
                {invalidCompany && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    Nama company tidak ada di daftar
                  </p>
                )}
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  Regional
                </label>
                <Select
                  options={regionalOptions}
                  value={formData.regional}
                  onChange={(v) => setFormData({ ...formData, regional: v })}
                  placeholder="Pilih Regional"
                  leftIcon={<MapPin size={16} />}
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  Tujuan (Toko/DC)
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
                {invalidTujuan && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    Tujuan tidak ada di daftar
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  Tanggal PO
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-semibold"
                  onChange={(e) =>
                    setFormData({ ...formData, tglPo: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppecase ml-">
                  Tanggal Expired
                </label>
                <div className="relative">
                  <CalendarDays
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400"
                    size={16}
                  />
                  <input
                    type="date"
                    className="w-full pl-11 pr-4 py-3 bg-red-50/30 rounded-2xl text-sm font-semibold border border-red-100"
                    onChange={(e) =>
                      setFormData({ ...formData, expiredTgl: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  Link PO (GDrive)
                </label>
                <div className="relative">
                  <LinkIcon
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    type="url"
                    placeholder="https://..."
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-2xl text-sm font-semibold"
                    onChange={(e) =>
                      setFormData({ ...formData, linkPo: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  Site Area
                </label>
                <Combobox
                  options={siteAreaOptions}
                  value={formData.siteArea}
                  onChange={(v) => setFormData({ ...formData, siteArea: v })}
                  placeholder="Ketik/cari site area..."
                  leftIcon={<MapPin size={16} />}
                  inputClassName="pl-11 pr-4"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  No Invoice
                </label>
                <input
                  type="text"
                  placeholder="INV-202X"
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-semibold"
                  onChange={(e) =>
                    setFormData({ ...formData, noInvoice: e.target.value })
                  }
                />
              </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-5 lg:col-span-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Package size={20} />
              </div>
              <h2 className="font-bold text-slate-800 text-lg">PO Detail</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="md:col-span-3 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  Nomor PO
                </label>
                <input
                  type="text"
                  placeholder="Masukkan Nomor PO..."
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-semibold"
                  value={formData.noPo}
                  onChange={(e) =>
                    setFormData({ ...formData, noPo: e.target.value })
                  }
                />
              </div>
              <div className="md:col-span-3 space-y-1">
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
                  value={currentItem.pcs}
                  placeholder="Input Pcs"
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold"
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
                  Pcs Kirim
                </label>
                <input
                  type="number"
                  value={currentItem.pcsKirim}
                  placeholder="Input Pcs Kirim"
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold"
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
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  Harga /Pcs
                </label>
                <input
                  type="number"
                  value={currentItem.hargaPcs}
                  placeholder="Input Harga"
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold"
                  onChange={(e) =>
                    setCurrentItem((prev) => ({
                      ...prev,
                      hargaPcs: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label
                  className="text-[10px] font-black text-slate-400 uppercase ml-1"
                  title="Rumus: Nominal = Harga/Pcs × PCS"
                >
                  Nominal
                </label>
                <div
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold text-slate-500"
                  title="Nominal = Harga/Pcs × PCS"
                >
                  {formatCurrency(currentNominal)}
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

            {/* Table Preview */}
            {items.length > 0 && (
              <div className="mt-6 border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Produk</th>
                      <th className="px-4 py-3 text-right" title="Input PCS">
                        Pcs
                      </th>
                      <th className="px-4 py-3 text-right" title="PCS × kg/pcs">
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
                        title="Rp Tagih = PCS Kirim × Harga/Pcs"
                      >
                        Rp Tagih
                      </th>
                      <th className="px-4 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.id} className="group hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {item.namaProduk}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {item.pcs}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {formatNumber(Number(item.kg || 0))}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {formatNumber(Number(item.hargaPcs))}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                          {formatNumber(item.rpTagih)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-3 text-right font-black text-slate-500 uppercase tracking-wider text-xs"
                      >
                        Total Tagihan
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-800 text-base">
                        {formatCurrency(totalRpTagihAll)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
                <div className="flex items-center justify-end p-4 border-t border-slate-100 bg-white">
                  <button
                    type="button"
                    onClick={handleSaveCurrentPODraft}
                    className="px-10 py-3 bg-[#004a87] text-white rounded-[16px] font-black flex items-center gap-2 shadow-2xl shadow-blue-900/30 hover:bg-[#003d6e] active:scale-95 transition-all"
                  >
                    <Save size={18} />
                    Simpan PO ke Daftar
                  </button>
                </div>
              </div>
            )}
          </section>
          <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm lg:col-span-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <ClipboardCheck size={20} />
              </div>
              <h2 className="font-bold text-slate-800 text-lg">
                Checklist Document
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4">
              {Object.keys(formData.status).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleChecklist(key)}
                  className={`flex flex-col items-center justify-center p-5 rounded-[24px] border-2 transition-all duration-300 gap-2 ${
                    formData.status[key as keyof typeof formData.status]
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-100 -translate-y-1"
                      : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-full ${
                      formData.status[key as keyof typeof formData.status]
                        ? "bg-white/20 text-white"
                        : "bg-slate-200"
                    }`}
                  >
                    <CheckCircle2 size={14} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {key === "sdif" ? "SDI/F" : key}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm lg:col-span-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
                <MessageSquare size={20} />
              </div>
              <h2 className="font-bold text-slate-800 text-lg">Remarks</h2>
            </div>
            <textarea
              rows={3}
              placeholder="Tambahkan Jika Ada Keterangan..."
              className="w-full px-6 py-4 bg-slate-50 rounded-[24px] focus:ring-2 focus:ring-slate-200 outline-none text-sm font-medium transition-all"
              onChange={(e) =>
                setFormData({ ...formData, remarks: e.target.value })
              }
            ></textarea>
          </section>
        </div>

        {/* Draft List & Submit All */}
        {poDrafts.length > 0 && (
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 lg:col-span-2">
            <h3 className="font-bold text-slate-800 mb-3">
              Daftar PO untuk Company Ini
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Nomor PO</th>
                    <th className="px-4 py-3 text-right">Jumlah Produk</th>
                    <th className="px-4 py-3 text-right">Total Tagihan</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {poDrafts.map((d) => {
                    const total = d.items.reduce(
                      (acc, it) => acc + it.rpTagih,
                      0,
                    );
                    return (
                      <tr key={d.noPo} className="group hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {d.noPo}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {d.items.length}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          {new Intl.NumberFormat("id-ID").format(total)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeDraft(d.noPo)}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 font-bold hover:bg-rose-100"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-end pt-4">
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
        )}
      </form>
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
