import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";

export interface Company {
  id: string;
  namaPt: string;
  inisial?: string | null;
}

export interface Invoice {
  id: string;
  noInvoice: string;
  noPo: string;
  companyId: string;
  total: number;
  unitProduksi?: string;
  siteArea?: string;
  produk?: string;
}

export interface Rtv {
  id: string;
  noRtv: string;
  companyId: string;
  total: number;
  qty: number;
  refInvoice?: string;
  unitProduksi?: string;
  pembebananRetur?: string;
  lokasiBarang?: string;
  produk?: string;
  tujuan?: string;
  rpKg?: number;
}

export interface Promo {
  id: string;
  nomor: string;
  kegiatan: string;
  periode: string;
  tanggal: string;
  total: number;
}

export const highlightMatch = (text: string, search: string) => {
  if (!text) return text;
  if (!search) return text;
  const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
  const parts = String(text).split(regex);
  return React.createElement(
    'span',
    null,
    parts.map((p, i) =>
      p.toLowerCase() === search.toLowerCase()
        ? React.createElement('span', { key: i, className: 'bg-amber-200 text-amber-900 px-0.5 rounded-sm' }, p)
        : React.createElement('span', { key: i }, p)
    )
  );
};

export const formatRp = (val: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
};

export function useRekonCalc() {
  const [masterCompanies, setMasterCompanies] = useState<Company[]>([]);
  const [masterInvoices, setMasterInvoices] = useState<any[]>([]);
  const [masterRtvs, setMasterRtvs] = useState<any[]>([]);
  const [masterInvoicesList, setMasterInvoicesList] = useState<any[]>([]);
  const [masterRtvsList, setMasterRtvsList] = useState<any[]>([]);
  const [masterPromos, setMasterPromos] = useState<Promo[]>([]);

  const [bankStatementsList, setBankStatementsList] = useState<Array<{desc: string, nominal: number}>>([]);
  const bankStatement = useMemo(() => bankStatementsList.reduce((acc, curr) => acc + (curr.nominal || 0), 0), [bankStatementsList]);
  const [tglBayar, setTglBayar] = useState<string>("");
  const [buktiBayarFile, setBuktiBayarFile] = useState<File | null>(null);
  const [buktiBayarUrl, setBuktiBayarUrl] = useState<string | null>(null);
  const [rincianBayarUrl, setRincianBayarUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedInisial, setSelectedInisial] = useState<string>("");
  const [selectedInvoices, setSelectedInvoices] = useState<Invoice[]>([]);
  const [selectedRtvs, setSelectedRtvs] = useState<Rtv[]>([]);
  const [selectedPromos, setSelectedPromos] = useState<Promo[]>([]);
  const [adminFee, setAdminFee] = useState<number>(0);
  const [notesList, setNotesList] = useState<Array<{type?: 'invoice' | 'rtv', desc: string, nominal: number}>>([]);
  const [remarks, setRemarks] = useState<string>("");

  const [companySearch, setCompanySearch] = useState("");
  const [inisialSearch, setInisialSearch] = useState("");
  const [invSearch, setInvSearch] = useState("");
  const [rtvSearch, setRtvSearch] = useState("");
  const [promoSearch, setPromoSearch] = useState("");
  const [refInvoiceSearch, setRefInvoiceSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [rekonNo, setRekonNo] = useState<string | null>(null);

  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [isInisialOpen, setIsInisialOpen] = useState(false);
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [isInvOpen, setIsInvOpen] = useState(false);
  const [isRtvOpen, setIsRtvOpen] = useState(false);
  const [openRefInvoicePopoverId, setOpenRefInvoicePopoverId] = useState<string | null>(null);
  const [openNoteTypeIdx, setOpenNoteTypeIdx] = useState<number | null>(null);
  const [openExcelModal, setOpenExcelModal] = useState(false);
  
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const router = useRouter();

  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizeInisialLabel = (val?: string | null) => {
    const raw = String(val || "").trim();
    if (!raw || raw === "—" || raw === "-") return "-";
    return raw;
  };

  const availableInisials = useMemo(() => {
    if (!selectedCompany?.namaPt) return [];
    const targetPt = selectedCompany.namaPt.trim().toLowerCase();
    const matchingRows = masterCompanies.filter(
      (c: any) => String(c.namaPt || "").trim().toLowerCase() === targetPt
    );
    const map = new Map<string, { inisial: string; ritelId: string; namaPt: string }>();
    for (const row of matchingRows) {
      const displayInisial = normalizeInisialLabel(row.inisial);
      const key = displayInisial.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          inisial: displayInisial,
          ritelId: row.id,
          namaPt: row.namaPt,
        });
      }
    }
    return Array.from(map.values());
  }, [masterCompanies, selectedCompany?.namaPt]);

  useEffect(() => {
    if (editId) {
      const loadDraft = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/rekon?id=${editId}`);
          const json = await res.json();
          if (res.ok && json.data) {
            const d = json.data;
            if (d.RitelModern) {
              const initInisial = normalizeInisialLabel(d.RitelModern.inisial);
              setSelectedCompany(d.RitelModern);
              setSelectedInisial(initInisial);
              fetchCompanyData(d.RitelModern.namaPt, d.RitelModern.id, initInisial);
            }
            if (Array.isArray(d.bankStatements) && d.bankStatements.length > 0) {
              setBankStatementsList(d.bankStatements);
            } else if (d.bankStatement > 0) {
              setBankStatementsList([{ desc: "Import dari data lama", nominal: d.bankStatement }]);
            } else {
              setBankStatementsList([]);
            }
            setAdminFee(d.biayaAdmin || 0);
            setSelectedInvoices(d.detailedInvoices || []);
            setSelectedRtvs(d.detailedRtvs || []);
            setSelectedPromos(d.detailedPromos || []);
            setRekonNo(d.noRekonsiliasi || null);
            setNotesList(Array.isArray(d.notes) ? d.notes.map((n: any) => ({ ...n, type: n.type || 'invoice' })) : []);
            setRemarks(d.remarks || "");
            setBuktiBayarUrl(d.buktiBayarUrl || null);
            setRincianBayarUrl(d.rincianBayarUrl || "");
            if (d.tglBayar) setTglBayar(d.tglBayar.split("T")[0]);
          }
        } catch (err) {
          console.error("Load Draft Error:", err);
        } finally {
          setIsLoading(false);
        }
      };
      loadDraft();
    }
  }, [editId]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch("/api/ritel");
        const json = await res.json();
        setMasterCompanies(Array.isArray(json) ? json : (json.data || []));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  const fetchCompanyData = async (companyName: string, ritelId?: string, inisial?: string) => {
    try {
      setIsDataLoading(true);
      setMasterInvoicesList([]);
      setMasterRtvsList([]);
      
      const lookupUrl = new URL(`/api/rekon/lookup`, window.location.origin);
      lookupUrl.searchParams.set("companyName", companyName);
      if (ritelId) lookupUrl.searchParams.set("ritelId", ritelId);
      if (inisial) lookupUrl.searchParams.set("inisial", inisial);
      if (editId) lookupUrl.searchParams.set("editId", editId);
      
      const res = await fetch(lookupUrl.toString());
      const json = await res.json();
      
      setMasterInvoicesList(json.invoices || []);
      setMasterRtvsList(json.rtvs || []);

      const promoUrl = ritelId ? `/api/promo?ritelId=${ritelId}&mode=list` : "/api/promo?mode=list";
      const promoRes = await fetch(promoUrl);
      const promoJson = await promoRes.json();
      setMasterPromos(Array.isArray(promoJson) ? promoJson : (promoJson.data || []));
    } catch (err) {
      console.error("Fetch Suggestions Error:", err);
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleSelectCompany = (c: any) => {
    setCompanySearch("");
    setInisialSearch("");
    setIsCompanyOpen(false);
    setSelectedInvoices([]);
    setSelectedRtvs([]);
    setSelectedPromos([]);
    setMasterInvoicesList([]);
    setMasterRtvsList([]);
    setMasterPromos([]);

    const targetPt = String(c.namaPt || "").trim().toLowerCase();
    const matchingRows = masterCompanies.filter(
      (row: any) => String(row.namaPt || "").trim().toLowerCase() === targetPt
    );
    const inisialMap = new Map<string, { inisial: string; ritelId: string; namaPt: string }>();
    for (const row of matchingRows) {
      const displayInisial = normalizeInisialLabel(row.inisial);
      const key = displayInisial.toLowerCase();
      if (!inisialMap.has(key)) {
        inisialMap.set(key, {
          inisial: displayInisial,
          ritelId: row.id,
          namaPt: row.namaPt,
        });
      }
    }
    const uniqueInisials = Array.from(inisialMap.values());

    if (uniqueInisials.length === 1) {
      const only = uniqueInisials[0];
      setSelectedCompany({ id: only.ritelId, namaPt: only.namaPt, inisial: only.inisial });
      setSelectedInisial(only.inisial);
      fetchCompanyData(only.namaPt, only.ritelId, only.inisial);
    } else {
      setSelectedCompany({ id: c.id, namaPt: c.namaPt, inisial: "" });
      setSelectedInisial("");
    }
  };

  const handleSelectInisial = (opt: { inisial: string; ritelId: string; namaPt: string }) => {
    setInisialSearch("");
    setIsInisialOpen(false);
    setSelectedInisial(opt.inisial);
    setSelectedCompany({ id: opt.ritelId, namaPt: opt.namaPt, inisial: opt.inisial });
    setSelectedInvoices([]);
    setSelectedRtvs([]);
    setSelectedPromos([]);
    fetchCompanyData(opt.namaPt, opt.ritelId, opt.inisial);
  };

  const handleSelectInvoice = async (invoiceNo: string) => {
    try {
      const url = new URL(`/api/rekon/lookup`, window.location.origin);
      url.searchParams.set("invoiceNo", invoiceNo);
      url.searchParams.set("companyName", selectedCompany?.namaPt || "");
      url.searchParams.set("ritelId", selectedCompany?.id || "");
      if (selectedInisial) url.searchParams.set("inisial", selectedInisial);

      const res = await fetch(url.toString());
      const json = await res.json();
      const pos = json.data || [];
      if (pos.length > 0) {
        const po = pos[0];
        const produkNames = (po.Items || [])
          .map((item: any) => item.Product?.name)
          .filter(Boolean)
          .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
          .join(", ");
        const newInv: Invoice = {
          id: po.id,
          noInvoice: po.noInvoice,
          noPo: po.noPo,
          companyId: po.ritelId || selectedCompany?.id || "",
          total: po.totalTagihan || po.totalNominal || po.Items?.reduce((s: number, i: any) => s + (i.rpTagih || (i.hargaPcs * i.pcsKirim) || 0), 0) || 0,
          unitProduksi: po.UnitProduksi?.siteArea || "-",
          siteArea: po.UnitProduksi?.siteArea || "-",
          produk: produkNames || "-",
        };
        if (!selectedInvoices.find(x => x.id === newInv.id)) {
           setSelectedInvoices([...selectedInvoices, newInv]);
        }
      }
      setInvSearch("");
      setIsInvOpen(false);
    } catch (err) {
      console.error("Select Invoice Error:", err);
    }
  };

  const handleSelectRtv = async (rtvItem: any) => {
    try {
      const rtvNo = typeof rtvItem === 'string' ? rtvItem : (rtvItem.noRtv || rtvItem.rtvCn);
      const rtvId = typeof rtvItem === 'object' ? rtvItem.id : null;
      const url = new URL(`/api/rekon/lookup`, window.location.origin);
      if (rtvNo) url.searchParams.set("rtvNo", rtvNo);
      if (rtvId) url.searchParams.set("rtvId", rtvId);
      url.searchParams.set("companyName", selectedCompany?.namaPt || "");
      url.searchParams.set("ritelId", selectedCompany?.id || "");
      if (selectedInisial) url.searchParams.set("inisial", selectedInisial);

      const res = await fetch(url.toString());
      const json = await res.json();
      const returs = json.data || [];
      
      if (returs.length > 0) {
        const mappedRtvs: Rtv[] = returs.map((r: any) => ({
          id: r.id,
          noRtv: r.rtvCn || r.noRtv || rtvNo,
          companyId: r.ritelId || selectedCompany?.id || "",
          qty: r.qtyReturn || r.qty || r.pcs || r.jumlah || 1,
          total: Number(r.nominal || r.rpTagih || r.total || r.rpNett || r.amount || 0),
          refInvoice: "",
          pembebananRetur: r.PembebananReturn?.siteArea || "-",
          lokasiBarang: r.LokasiBarang?.siteArea || "-",
          produk: r.Product?.name || r.produk || "-",
          unitProduksi: "-",
          tujuan: r.namaCompany || "-",
          rpKg: Number(r.rpKg || 0),
        }));

        setSelectedRtvs(prev => {
           const existingIds = new Set(prev.map(x => x.id));
           const newItems = mappedRtvs.filter((m: any) => !existingIds.has(m.id));
           return [...prev, ...newItems];
        });
      }
      
      setRtvSearch("");
      setIsRtvOpen(false);
    } catch (err) {
      console.error("Select RTV Error:", err);
    }
  };

  const availableInvoices = useMemo(() => {
    return (masterInvoicesList || []).filter(item => {
       if (!item) return false;
       const noInv = typeof item === 'string' ? item : item.noInvoice;
       const noPo = typeof item === 'string' ? "" : (item.noPo || "");
       if (!noInv) return false;
       
       const searchLower = (invSearch || "").trim().toLowerCase();
       const matchInv = noInv.toLowerCase().includes(searchLower);
       const matchPo = noPo.toLowerCase().includes(searchLower);
       
       return (matchInv || matchPo) && !selectedInvoices.find(s => s.noInvoice === noInv);
    });
  }, [masterInvoicesList, invSearch, selectedInvoices]);

  const availableRtvs = useMemo(() => {
    return (masterRtvsList || []).filter(rtv => {
       if (!rtv) return false;
       const no = typeof rtv === 'string' ? rtv : rtv.noRtv;
       if (!no) return false;
       
       const matchSearch = no.toLowerCase().includes((rtvSearch || "").trim().toLowerCase());
       
       let isAlreadySelected = false;
       if (rtv.id) {
         isAlreadySelected = !!selectedRtvs.find(s => s.id === rtv.id);
       } else {
         isAlreadySelected = !!selectedRtvs.find(s => s.noRtv === no && !s.id);
       }
       
       return matchSearch && !isAlreadySelected;
    });
  }, [masterRtvsList, rtvSearch, selectedRtvs]);

  const totalInvoices = useMemo(() => {
    return selectedInvoices.reduce((acc, inv) => acc + Number(inv.total || 0), 0);
  }, [selectedInvoices]);

  const totalRtv = useMemo(() => {
    return selectedRtvs.reduce((acc, rtv) => acc + Number(rtv.total || 0), 0);
  }, [selectedRtvs]);

  const totalPromo = useMemo(() => {
    return selectedPromos.reduce((sum, promo) => sum + Number(promo.total || 0), 0);
  }, [selectedPromos]);

  const totalNotesInvoice = useMemo(() => {
    return notesList.filter(n => n.type === 'invoice' || !n.type).reduce((sum, n) => sum + (Number(n.nominal) || 0), 0);
  }, [notesList]);

  const totalNotesRtv = useMemo(() => {
    return notesList.filter(n => n.type === 'rtv').reduce((sum, n) => sum + (Number(n.nominal) || 0), 0);
  }, [notesList]);

  const totalNotes = totalNotesInvoice + totalNotesRtv;

  const balanceNetDue = Number(bankStatement || 0) - (totalInvoices + totalNotesInvoice) + (totalRtv + totalNotesRtv) + totalPromo + Number(adminFee || 0);

  const handleSaveRekon = async (status: string = "final") => {
    if (!selectedCompany) {
      Swal.fire({ icon: "warning", title: "Oops!", text: "Pilih company terlebih dahulu!", customClass: { popup: "rounded-[32px] font-sans" } });
      return;
    }

    if (availableInisials.length > 0 && !selectedInisial) {
      Swal.fire({ icon: "warning", title: "Oops!", text: "Pilih inisial ritel terlebih dahulu!", customClass: { popup: "rounded-[32px] font-sans" } });
      return;
    }

    if (status === "final" && selectedRtvs.length > 0) {
      const missingLokasiRtvs = selectedRtvs.filter(
        (rtv) => !rtv.lokasiBarang || rtv.lokasiBarang.trim() === "" || rtv.lokasiBarang.trim() === "-"
      );
      if (missingLokasiRtvs.length > 0) {
        const rtvListStr = Array.from(new Set(missingLokasiRtvs.map((r) => r.noRtv || r.id))).join(", ");
        const { isConfirmed: saveAsDraftInstead } = await Swal.fire({
          icon: "warning",
          title: "Lokasi Barang RTV Belum Lengkap",
          html: `Terdapat RTV yang belum memiliki data <b>Lokasi Barang</b>:<br/><br/><b style="color:#e11d48">${rtvListStr}</b><br/><br/>Rekonsiliasi belum dapat di-<b>Submit Final</b>. Silakan simpan sebagai <b>Draft</b> terlebih dahulu hingga lokasi barang dilengkapi.`,
          showCancelButton: true,
          confirmButtonText: "Simpan sebagai Draft",
          cancelButtonText: "Tutup",
          confirmButtonColor: "#10b981",
          customClass: { popup: "rounded-[32px] font-sans", confirmButton: "rounded-xl px-6 py-3", cancelButton: "rounded-xl px-6 py-3" }
        });
        if (saveAsDraftInstead) {
          return handleSaveRekon("draft");
        }
        return;
      }
    }

    const { isConfirmed } = await Swal.fire({
      title: status === "draft" ? "Simpan Draft?" : "Simpan Rekonsiliasi?",
      text: status === "draft" 
        ? "Data ini akan disimpan sebagai draft dan bisa diedit kembali." 
        : "Data ini akan disimpan ke dalam arsip rekonsiliasi.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: status === "draft" ? "Ya, Simpan Draft!" : "Ya, Simpan!",
      cancelButtonText: "Batal",
      confirmButtonColor: status === "draft" ? "#10b981" : "#5c56f6",
      customClass: { popup: "rounded-[32px] font-sans", confirmButton: "rounded-xl px-6 py-3", cancelButton: "rounded-xl px-6 py-3" }
    });

    if (!isConfirmed) return;

    setIsSubmitting(true);
    try {
      let uploadedBuktiBayarUrl = buktiBayarUrl;
      if (buktiBayarFile) {
        setIsUploading(true);
        const uploadForm = new FormData();
        uploadForm.append("file", buktiBayarFile);
        uploadForm.append("rekonId", editId || "new");

        const uploadRes = await fetch("/api/rekon/upload", {
          method: "POST",
          body: uploadForm,
        });

        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json();
          throw new Error(uploadErr.error || "Gagal upload bukti bayar");
        }

        const uploadJson = await uploadRes.json();
        uploadedBuktiBayarUrl = uploadJson.url;
        setIsUploading(false);
      }

      const payload = {
        ritelId: selectedCompany.id,
        companyName: selectedCompany.namaPt,
        inisial: selectedInisial || undefined,
        bankStatement: bankStatement,
        bankStatements: bankStatementsList.filter(b => b.desc || b.nominal).map(b => ({ desc: b.desc, nominal: b.nominal })),
        biayaAdmin: adminFee,
        totalInvoices: totalInvoices,
        totalRtvs: totalRtv,
        totalPromo: totalPromo,
        nominal: balanceNetDue,
        invoices: selectedInvoices.map(inv => inv.noInvoice),
        rtvs: selectedRtvs.map(rtv => ({ 
          id: rtv.id,
          noRtv: rtv.noRtv, 
          refInvoice: rtv.refInvoice || "" 
        })),
        noPromo: selectedPromos.length > 0 ? selectedPromos.map(p => p.nomor).join(', ') : null,
        notes: notesList.filter(n => n.desc || n.nominal).map(n => ({ type: n.type || 'invoice', desc: n.desc, nominal: n.nominal })),
        remarks: remarks || null,
        buktiBayarUrl: uploadedBuktiBayarUrl || null,
        rincianBayarUrl: rincianBayarUrl || null,
        tglBayar: tglBayar || null,
        status: status,
        id: editId || undefined
      };

      const res = await fetch("/api/rekon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal menyimpan data");
      }

      await Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: status === "draft" ? "Data rekonsiliasi disimpan sebagai draft." : "Data rekonsiliasi telah disimpan ke arsip.",
        timer: 2000,
        showConfirmButton: false,
        customClass: { popup: "rounded-[32px] font-sans" }
      });

      router.push("/rekon/data");
    } catch (error: any) {
      Swal.fire({ icon: "error", title: "Error", text: error.message, customClass: { popup: "rounded-[32px] font-sans" } });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    masterCompanies,
    bankStatementsList, setBankStatementsList, bankStatement,
    tglBayar, setTglBayar,
    buktiBayarFile, setBuktiBayarFile,
    rincianBayarUrl, setRincianBayarUrl,
    selectedCompany, setSelectedCompany,
    selectedInisial, setSelectedInisial,
    availableInisials,
    handleSelectCompany, handleSelectInisial,
    selectedInvoices, setSelectedInvoices,
    selectedRtvs, setSelectedRtvs,
    selectedPromos, setSelectedPromos,
    adminFee, setAdminFee,
    notesList, setNotesList,
    companySearch, setCompanySearch,
    inisialSearch, setInisialSearch,
    invSearch, setInvSearch,
    rtvSearch, setRtvSearch,
    promoSearch, setPromoSearch,
    refInvoiceSearch, setRefInvoiceSearch,
    isLoading, rekonNo,
    isCompanyOpen, setIsCompanyOpen,
    isInisialOpen, setIsInisialOpen,
    isPromoOpen, setIsPromoOpen,
    isInvOpen, setIsInvOpen,
    isRtvOpen, setIsRtvOpen,
    openRefInvoicePopoverId, setOpenRefInvoicePopoverId,
    openNoteTypeIdx, setOpenNoteTypeIdx,
    openExcelModal, setOpenExcelModal,
    isDataLoading, isSubmitting, isUploading,
    availableInvoices, availableRtvs,
    totalInvoices, totalRtv, totalPromo, totalNotesInvoice, totalNotesRtv, totalNotes, balanceNetDue,
    handleSelectInvoice, handleSelectRtv, handleSaveRekon, fetchCompanyData, masterPromos,
    remarks, setRemarks
  };
}
