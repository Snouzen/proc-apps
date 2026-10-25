import { useState } from "react";
import { ItemPO, INITIAL_FORM } from "./types";

interface UsePOSubmissionParams {
  router: any;
  searchParams: any;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  items: ItemPO[];
  setItems: React.Dispatch<React.SetStateAction<ItemPO[]>>;
  setPoDrafts: React.Dispatch<React.SetStateAction<any[]>>;
  showToast: (type: "success" | "error" | "info", message: string) => void;
  companyLooksLikeInisial: boolean;
  invalidCompany: boolean;
  invalidInisial: boolean;
  invalidTujuan: boolean;
}

export function usePOSubmission({
  router,
  searchParams,
  formData,
  setFormData,
  items,
  setItems,
  setPoDrafts,
  showToast,
  companyLooksLikeInisial,
  invalidCompany,
  invalidInisial,
  invalidTujuan,
}: UsePOSubmissionParams) {
  const [submitting, setSubmitting] = useState(false);

  const handleChecklist = (field: string) => {
    setFormData((prev: any) => ({
      ...prev,
      status: {
        ...prev.status,
        [field]: !prev.status[field as keyof typeof prev.status],
      },
    }));
  };

  const toggleAllChecklist = () => {
    setFormData((prev: any) => {
      const allOn = Object.values(prev.status).every(Boolean);
      const next: any = {};
      Object.keys(prev.status).forEach((k) => {
        next[k] = !allOn;
      });
      return { ...prev, status: next };
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

  return {
    submitting,
    handleChecklist,
    toggleAllChecklist,
    handleSubmit,
  };
}
