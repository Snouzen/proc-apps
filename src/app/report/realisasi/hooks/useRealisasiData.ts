import { useState, useEffect, useRef, useMemo } from "react";
import Swal from "sweetalert2";
import { generateRealisasiPdf } from "@/lib/generateRealisasiPdf";
import { getMe } from "@/lib/me";
import {
  FormRowItem,
  OptionRitel,
  formatDateToYYYYMMDD,
  fallbackSampleData,
} from "../types";

export function useRealisasiData() {
  const [role, setRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [records, setRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string>("");

  // Split View state
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states (synced live with preview)
  const [tanggal, setTanggal] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [tanggalAkhir, setTanggalAkhir] = useState<string | null>(null);
  const [daftarTanggal, setDaftarTanggal] = useState<string[]>([]);
  const [judul, setJudul] = useState("PROGRES PEMENUHAN RITEL MODERN");
  const [subjudul, setSubjudul] = useState("");
  const [sumberCatatan, setSumberCatatan] = useState("");
  const [daftarRegional, setDaftarRegional] = useState("");
  const [items, setItems] = useState<FormRowItem[]>([]);

  // Retailer options for dropdown
  const [ritelOptions, setRitelOptions] = useState<OptionRitel[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const slideRef = useRef<HTMLDivElement>(null);

  // 1. Check Auth Role
  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        if (me?.authenticated) {
          setRole(me.role || null);
        } else {
          setRole(null);
        }
      } catch {
        setRole(null);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  // 2. Fetch Retailer Options
  useEffect(() => {
    if (role !== "pusat") return;
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const res = await fetch("/api/realisasi/ritel-options");
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setRitelOptions(json.data);
        }
      } catch (err) {
        console.error("Failed to load ritel options:", err);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, [role]);

  // 3. Earliest report date ever created by user
  const minDateStr = useMemo(() => {
    if (!records || records.length === 0) return undefined;
    const dateStrings = records
      .map((r) => formatDateToYYYYMMDD(r.tanggal))
      .filter((d): d is string => Boolean(d))
      .sort();
    return dateStrings[0];
  }, [records]);

  // Helper to check if a record covers a specific date
  const isRecordCoveringDate = (rec: any, dateStr: string): boolean => {
    if (!dateStr || !rec) return false;
    if (Array.isArray(rec.daftarTanggal) && rec.daftarTanggal.length > 0) {
      return rec.daftarTanggal.some((d: string) => d.split("T")[0] === dateStr);
    }
    return formatDateToYYYYMMDD(rec.tanggal) === dateStr;
  };

  // Matching records for the selected date
  const matchingDateRecords = useMemo(() => {
    if (!selectedDateStr || !records || records.length === 0) return [];
    return records.filter((r) => isRecordCoveringDate(r, selectedDateStr));
  }, [records, selectedDateStr]);

  // Dates that already have a report (excluding currently edited record)
  const existingReportDates = useMemo(() => {
    const datesSet = new Set<string>();
    records
      .filter((r) => r.id !== editingId)
      .forEach((r) => {
        if (Array.isArray(r.daftarTanggal) && r.daftarTanggal.length > 0) {
          r.daftarTanggal.forEach((d: string) => {
            const clean = typeof d === "string" ? d.split("T")[0] : "";
            if (clean) datesSet.add(clean);
          });
        } else {
          const single = formatDateToYYYYMMDD(r.tanggal);
          if (single) datesSet.add(single);
        }
      });
    return Array.from(datesSet);
  }, [records, editingId]);

  // Handle user changing date via input date
  const handleDateChange = (newDate: string) => {
    if (minDateStr && newDate && newDate < minDateStr) {
      newDate = minDateStr;
    }
    setSelectedDateStr(newDate);
    const matches = records.filter((r) => isRecordCoveringDate(r, newDate));
    if (matches.length > 0) {
      setSelectedRecord(matches[0]);
    } else {
      setSelectedRecord(null);
    }
  };

  // 4. Fetch Records List
  const fetchRecords = async (keepSelectedId?: string) => {
    setLoadingRecords(true);
    try {
      const res = await fetch("/api/realisasi");
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setRecords(json.data);
        if (keepSelectedId) {
          const found = json.data.find((r: any) => r.id === keepSelectedId);
          if (found) {
            setSelectedRecord(found);
            setSelectedDateStr(formatDateToYYYYMMDD(found.tanggal));
          }
        } else if (selectedDateStr) {
          const matching = json.data.filter((r: any) =>
            isRecordCoveringDate(r, selectedDateStr)
          );
          if (matching.length > 0) {
            const stillSelected = matching.find(
              (r: any) => r.id === selectedRecord?.id
            );
            setSelectedRecord(stillSelected || matching[0]);
          } else {
            setSelectedRecord(null);
          }
        } else if (json.data.length > 0) {
          setSelectedRecord(json.data[0]);
          setSelectedDateStr(formatDateToYYYYMMDD(json.data[0].tanggal));
        } else {
          setSelectedDateStr(new Date().toISOString().split("T")[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load realisasi records:", err);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    if (role === "pusat") {
      fetchRecords();
    }
  }, [role]);

  // 5. Open Create Split Form
  const handleOpenCreate = (dateToUse?: string) => {
    setEditingId(null);
    const initialDate =
      typeof dateToUse === "string" && dateToUse
        ? dateToUse
        : selectedDateStr || new Date().toISOString().split("T")[0];
    setTanggal(initialDate);
    setTanggalAkhir(null);
    setDaftarTanggal([initialDate]);
    setJudul("PROGRES PEMENUHAN RITEL MODERN");
    setSubjudul("");
    setSumberCatatan("");
    setDaftarRegional("");
    setItems([
      {
        ritelId: null,
        companyName: "",
        provinsi: "Jabodetabek",
        namaRitel: "",
        logoUrl: null,
        volumeKg: 0,
        urutan: 0,
      },
    ]);
    setIsSplitOpen(true);
  };

  // 6. Open Edit Split Form
  const handleOpenEdit = (rec: any) => {
    setEditingId(rec.id);
    const dt = new Date(rec.tanggal);
    const startStr = !isNaN(dt.getTime())
      ? dt.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    setTanggal(startStr);

    if (rec.tanggalAkhir) {
      const dtEnd = new Date(rec.tanggalAkhir);
      setTanggalAkhir(
        !isNaN(dtEnd.getTime()) ? dtEnd.toISOString().split("T")[0] : null
      );
    } else {
      setTanggalAkhir(null);
    }

    if (Array.isArray(rec.daftarTanggal) && rec.daftarTanggal.length > 0) {
      setDaftarTanggal(rec.daftarTanggal.map((d: string) => d.split("T")[0]));
    } else {
      setDaftarTanggal([startStr]);
    }

    setJudul(rec.judul || "PROGRES PEMENUHAN RITEL MODERN");
    setSubjudul(rec.subjudul || "");
    setSumberCatatan(rec.sumberCatatan || "");
    setDaftarRegional(rec.daftarRegional || "");

    if (Array.isArray(rec.items) && rec.items.length > 0) {
      setItems(
        rec.items.map((it: any, idx: number) => ({
          ritelId: it.ritelId || null,
          companyName: it.companyName || "",
          provinsi: it.provinsi || "Jabodetabek",
          namaRitel: it.namaRitel || "",
          logoUrl: it.logoUrl || null,
          volumeKg: Number(it.volumeKg || 0),
          urutan: typeof it.urutan === "number" ? it.urutan : idx,
        }))
      );
    } else {
      setItems([]);
    }
    setIsSplitOpen(true);
  };

  // 7. Save Split Form
  const handleSaveForm = async () => {
    if (!tanggal) {
      Swal.fire("Perhatian", "Tanggal realisasi wajib diisi!", "warning");
      return;
    }

    const activeDates =
      daftarTanggal && daftarTanggal.length > 0 ? daftarTanggal : [tanggal];

    const conflictingDate = activeDates.find((d) =>
      existingReportDates.includes(d)
    );
    if (conflictingDate) {
      const tglFormatted = new Date(
        conflictingDate + "T00:00:00"
      ).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      Swal.fire({
        title: "Tanggal Sudah Ada Laporan",
        text: `Tanggal ${tglFormatted} sudah termasuk dalam rekapan laporan lain. Silakan gunakan fitur 'Edit Data' jika ingin mengubah rekapan ini.`,
        icon: "warning",
      });
      return;
    }

    const validItems = items.filter((it) => it.namaRitel && it.namaRitel.trim());
    if (validItems.length === 0) {
      Swal.fire("Perhatian", "Minimal 1 data ritel wajib diisi!", "warning");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingId || undefined,
        tanggal,
        tanggalAkhir: tanggalAkhir || undefined,
        daftarTanggal: activeDates,
        judul,
        subjudul: subjudul || undefined,
        sumberCatatan: sumberCatatan || undefined,
        daftarRegional: daftarRegional ? daftarRegional.trim() : undefined,
        items: validItems,
      };

      const res = await fetch("/api/realisasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan rekapan");

      Swal.fire({
        title: "Berhasil!",
        text: "Rekapan Realisasi Pemenuhan berhasil disimpan.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      setIsSplitOpen(false);
      await fetchRecords(json.data?.id);
    } catch (err: any) {
      Swal.fire("Gagal Menyimpan", err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // 8. Delete Record
  const handleDeleteRecord = async (id: string) => {
    const confirm = await Swal.fire({
      title: "Hapus Rekapan?",
      text: "Data rekapan laporan ini akan dihapus permanen.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/realisasi?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menghapus");

      Swal.fire("Terhapus!", "Rekapan berhasil dihapus.", "success");
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
      fetchRecords();
    } catch (err: any) {
      Swal.fire("Error", err.message, "error");
    }
  };

  // 9. Export PDF
  const handleExportPdf = async () => {
    if (!slideRef.current) {
      Swal.fire("Perhatian", "Tidak ada slide yang aktif untuk di-export.", "warning");
      return;
    }

    setExportingPdf(true);
    try {
      const activeData = isSplitOpen
        ? {
            tanggal,
            tanggalAkhir,
            daftarTanggal:
              daftarTanggal && daftarTanggal.length > 0
                ? daftarTanggal
                : [tanggal],
            judul,
            subjudul,
            sumberCatatan,
            daftarRegional,
            items,
          }
        : selectedRecord || fallbackSampleData;

      const dateStr = activeData.tanggalAkhir
        ? `${new Date(activeData.tanggal).toISOString().split("T")[0]}_sd_${
            new Date(activeData.tanggalAkhir).toISOString().split("T")[0]
          }`
        : activeData.tanggal
        ? new Date(activeData.tanggal).toISOString().split("T")[0]
        : "laporan";
      const fileName = `Realisasi_Pemenuhan_${dateStr}.pdf`;

      await generateRealisasiPdf({
        element: slideRef.current,
        fileName,
      });

      Swal.fire({
        title: "Export Berhasil!",
        text: `File ${fileName} berhasil diunduh.`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error("Export PDF error:", err);
      Swal.fire("Gagal Export PDF", err.message || "Terjadi kesalahan saat generate PDF.", "error");
    } finally {
      setExportingPdf(false);
    }
  };

  // Active data for slide rendering
  const activeSlideData = isSplitOpen
    ? {
        tanggal: tanggal ? new Date(tanggal) : new Date(),
        tanggalAkhir: tanggalAkhir ? new Date(tanggalAkhir) : null,
        daftarTanggal:
          daftarTanggal && daftarTanggal.length > 0
            ? daftarTanggal
            : [tanggal],
        judul,
        subjudul,
        sumberCatatan,
        daftarRegional,
        items,
      }
    : selectedRecord || fallbackSampleData;

  return {
    role,
    authLoading,
    records,
    loadingRecords,
    selectedRecord,
    setSelectedRecord,
    selectedDateStr,
    minDateStr,
    matchingDateRecords,
    existingReportDates,
    handleDateChange,
    fetchRecords,
    isSplitOpen,
    setIsSplitOpen,
    editingId,
    tanggal,
    setTanggal,
    tanggalAkhir,
    setTanggalAkhir,
    daftarTanggal,
    setDaftarTanggal,
    judul,
    setJudul,
    subjudul,
    setSubjudul,
    sumberCatatan,
    setSumberCatatan,
    daftarRegional,
    setDaftarRegional,
    items,
    setItems,
    ritelOptions,
    loadingOptions,
    saving,
    exportingPdf,
    slideRef,
    handleOpenCreate,
    handleOpenEdit,
    handleSaveForm,
    handleDeleteRecord,
    handleExportPdf,
    activeSlideData,
  };
}
