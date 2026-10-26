import { useState, useEffect } from "react";
import Swal from "sweetalert2";

interface UseReturMutationsParams {
  data: any[];
  setData: React.Dispatch<React.SetStateAction<any[]>>;
  setIsFetchingPage: (v: boolean) => void;
  fetchRetur: () => Promise<void>;
}

export function useReturMutations({
  data,
  setData,
  setIsFetchingPage,
  fetchRetur,
}: UseReturMutationsParams) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isMassEditing, setIsMassEditing] = useState(false);
  const [massEditForms, setMassEditForms] = useState<Record<string, any>>({});
  const [isSavingMass, setIsSavingMass] = useState(false);

  const [searchToko, setSearchToko] = useState("");
  const [searchProduk, setSearchProduk] = useState("");
  const [isTokoOpen, setIsTokoOpen] = useState(false);
  const [isProdukOpen, setIsProdukOpen] = useState(false);
  const [isLokasiOpen, setIsLokasiOpen] = useState(false);
  const [searchLokasi, setSearchLokasi] = useState("");
  const [isPembebananOpen, setIsPembebananOpen] = useState(false);
  const [isInisialOpen, setIsInisialOpen] = useState(false);
  const [searchInisial, setSearchInisial] = useState("");
  const [searchPembebanan, setSearchPembebanan] = useState("");

  useEffect(() => {
    if (editingId) {
      const nominal = Number(editForm.nominal) || 0;
      const qty = Number(editForm.qtyReturn) || 0;
      const result = qty > 0 ? Math.round(nominal / qty) : 0;
      if (editForm.rpKg !== result) {
        setEditForm((p: any) => ({ ...p, rpKg: result }));
      }
    }
  }, [editForm.nominal, editForm.qtyReturn, editingId]);

  const handleStartEdit = (item: any) => {
    setEditingId(item.id);
    setEditForm({ ...item });
    setSearchToko(item.namaCompany || "");
    setSearchProduk(item.produk || "");
    setSearchLokasi(item.LokasiBarang?.siteArea || ""); 
    setSearchPembebanan(item.PembebananReturn?.siteArea || ""); 
    setSearchInisial(item.inisial || "");
    setIsInisialOpen(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setSearchToko("");
    setSearchProduk("");
    setSearchLokasi(""); 
    setSearchPembebanan(""); 
    setIsTokoOpen(false);
    setIsProdukOpen(false);
    setIsLokasiOpen(false); 
    setIsPembebananOpen(false); 
    setIsInisialOpen(false);
    setSearchInisial("");
  };

  const handleStartMassEdit = () => {
    setIsMassEditing(true);
    setEditingId(null);
    setEditForm({});
    const initial: Record<string, any> = {};
    data.forEach(item => {
      initial[item.id] = { ...item };
    });
    setMassEditForms(initial);
  };

  const handleCancelMassEdit = () => {
    setIsMassEditing(false);
    setMassEditForms({});
  };

  const handleFieldChange = (item: any, field: string, value: any) => {
    if (isMassEditing) {
      setMassEditForms(prev => {
        const current = { ...(prev[item.id] || item), [field]: value };
        if (field === 'nominal' || field === 'qtyReturn') {
          const nominal = Number(current.nominal) || 0;
          const qty = Number(current.qtyReturn) || 0;
          current.rpKg = qty > 0 ? Math.round(nominal / qty) : 0;
        }
        return { ...prev, [item.id]: current };
      });
    } else {
      setEditForm((prev: any) => {
        const current = { ...prev, [field]: value };
        if (field === 'nominal' || field === 'qtyReturn') {
          const nominal = Number(current.nominal) || 0;
          const qty = Number(current.qtyReturn) || 0;
          current.rpKg = qty > 0 ? Math.round(nominal / qty) : 0;
        }
        return current;
      });
    }
  };

  const safeIsoDate = (val: any): string | null => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const buildCleanedPayload = (id: string, itemData: any) => {
    const { RitelModern, LokasiBarang, Product, PembebananReturn, createdAt, updatedAt, _count, ...pureData } = itemData;
    const kodeTokoStr = pureData.kodeToko !== null && pureData.kodeToko !== undefined
      ? String(pureData.kodeToko).replace(/[^0-9]/g, "")
      : "";
    return {
      ...pureData,
      id,
      rtvCn: pureData.rtvCn ? String(pureData.rtvCn).trim() : null,
      kodeToko: kodeTokoStr ? Number(kodeTokoStr) : null,
      qtyReturn: Number(pureData.qtyReturn) || 0,
      nominal: Number(pureData.nominal) || 0,
      rpKg: Number(pureData.rpKg) || 0,
      tanggalRtv: safeIsoDate(pureData.tanggalRtv),
      maxPickup: safeIsoDate(pureData.maxPickup),
      tanggalPembayaran: safeIsoDate(pureData.tanggalPembayaran),
      invoiceRekon: pureData.invoiceRekon || "",
      inisial: pureData.inisial || "",
    };
  };

  const handleSaveMassEdit = async () => {
    try {
      setIsSavingMass(true);
      const ids = Object.keys(massEditForms);
      const originalById = new Map(data.map((item: any) => [item.id, item]));

      const changedIds = ids.filter((id) => {
        const orig = originalById.get(id);
        if (!orig) return true;
        const nextPayload = buildCleanedPayload(id, massEditForms[id]);
        const origPayload = buildCleanedPayload(id, orig);
        return JSON.stringify(nextPayload) !== JSON.stringify(origPayload);
      });

      const targetIds = changedIds.length > 0 ? changedIds : ids;

      for (const id of targetIds) {
        const cleanedPayload = buildCleanedPayload(id, massEditForms[id]);

        const res = await fetch(`/api/retur`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanedPayload),
        });

        if (!res.ok) {
          let errMsg = "Gagal menyimpan beberapa data";
          try {
            const errJson = await res.json();
            if (errJson?.error) errMsg = errJson.error;
          } catch {}
          throw new Error(errMsg);
        }
      }

      Swal.fire({ icon: 'success', title: 'Semua data diperbarui', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false });
      
      setIsMassEditing(false);
      setMassEditForms({});
      
      const scrollY = window.scrollY;
      await fetchRetur();
      requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior }));
    } catch (error: any) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: error.message || "Gagal menyimpan perubahan!" });
    } finally {
      setIsSavingMass(false);
    }
  };

  const handleSaveInline = async (id: string) => {
    try {
      setIsFetchingPage(true);

      const cleanedPayload = buildCleanedPayload(id, editForm);

      const res = await fetch(`/api/retur`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedPayload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menyimpan data");
      }

      setEditingId(null);
      
      Swal.fire({ 
        icon: 'success', 
        title: 'Data diperbarui', 
        toast: true, 
        position: 'top-end', 
        timer: 1500, 
        showConfirmButton: false,
        background: '#f8fafc',
        color: '#0f172a'
      });

      const scrollY = window.scrollY;
      await fetchRetur();
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
      });
    } catch (error: any) {
      console.error(error);
      Swal.fire({ 
        icon: 'error', 
        title: 'Gagal Menyimpan', 
        text: error.message || "Gagal menyimpan perubahan!", 
        confirmButtonColor: '#4f46e5',
        background: '#fff',
        customClass: {
          popup: 'rounded-[32px]',
          confirmButton: 'rounded-xl px-10'
        }
      });
    } finally {
      setIsFetchingPage(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Data Retur?',
      text: 'Data ini akan hilang permanen!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      background: '#fff',
      customClass: {
        popup: 'rounded-[32px]',
        confirmButton: 'rounded-xl px-6 py-3 font-black uppercase text-[11px] tracking-widest cursor-pointer',
        cancelButton: 'rounded-xl px-6 py-3 font-black uppercase text-[11px] tracking-widest cursor-pointer'
      }
    });

    if (result.isConfirmed) {
      try {
        setIsFetchingPage(true);
        const res = await fetch(`/api/retur?id=${id}`, { 
          method: 'DELETE' 
        });
        
        if (!res.ok) {
          let errorMessage = "Gagal menghapus data";
          try {
            const errData = await res.json();
            errorMessage = errData.error || errorMessage;
          } catch (e) {
          }
          throw new Error(errorMessage);
        }

        Swal.fire({
          icon: 'success',
          title: 'Data dihapus!',
          toast: true,
          position: 'top-end',
          timer: 1500,
          showConfirmButton: false
        });

        setData(prevData => prevData.filter(item => item.id !== id));
        fetchRetur();

      } catch (error: any) {
        console.error(error);
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: error.message || 'Gagal menghapus data',
          confirmButtonColor: '#ef4444'
        });
      } finally {
        setIsFetchingPage(false);
      }
    }
  };

  const handleDeleteGroup = async (ritelId: string, ritelName: string) => {
    const result = await Swal.fire({
      title: 'Hapus Seluruh Data?',
      html: `Semua data retur untuk <b>${ritelName}</b> akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus Semua!',
      cancelButtonText: 'Batal',
      background: '#fff',
      customClass: {
        popup: 'rounded-[32px]',
        confirmButton: 'rounded-xl px-6 py-3 font-black uppercase text-[11px] tracking-widest cursor-pointer',
        cancelButton: 'rounded-xl px-6 py-3 font-black uppercase text-[11px] tracking-widest cursor-pointer'
      }
    });

    if (result.isConfirmed) {
      try {
        setIsFetchingPage(true);
        const res = await fetch(`/api/retur?ritelId=${ritelId}`, { 
          method: 'DELETE' 
        });
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Gagal menghapus data grup");
        }

        Swal.fire({
          icon: 'success',
          title: 'Grup Dihapus!',
          text: `Seluruh data ${ritelName} telah dibersihkan.`,
          toast: true,
          position: 'top-end',
          timer: 2000,
          showConfirmButton: false
        });

        setData(prev => prev.filter(r => r.id !== ritelId));
        fetchRetur();
      } catch (error: any) {
        console.error(error);
        Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
      } finally {
        setIsFetchingPage(false);
      }
    }
  };

  return {
    editingId,
    setEditingId,
    editForm,
    setEditForm,
    isMassEditing,
    setIsMassEditing,
    massEditForms,
    setMassEditForms,
    isSavingMass,
    setIsSavingMass,
    searchToko,
    setSearchToko,
    searchProduk,
    setSearchProduk,
    isTokoOpen,
    setIsTokoOpen,
    isProdukOpen,
    setIsProdukOpen,
    isLokasiOpen,
    setIsLokasiOpen,
    searchLokasi,
    setSearchLokasi,
    isPembebananOpen,
    setIsPembebananOpen,
    isInisialOpen,
    setIsInisialOpen,
    searchInisial,
    setSearchInisial,
    searchPembebanan,
    setSearchPembebanan,
    handleStartEdit,
    handleCancelEdit,
    handleStartMassEdit,
    handleCancelMassEdit,
    handleSaveMassEdit,
    handleFieldChange,
    handleSaveInline,
    handleDelete,
    handleDeleteGroup,
  };
}
